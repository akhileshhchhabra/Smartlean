'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, User, ArrowRight, Clock, X, Edit, Users, Settings, Upload, BarChart3, TrendingUp, Award, Calendar, Video, FileText, Star } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import ActiveStudents from '@/components/ActiveStudents';

export default function CourseManagementDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [newCourse, setNewCourse] = useState({ title: '', category: 'Math', description: '', thumbnailUrl: '' });
  const [showStudents, setShowStudents] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchStudentCountForCourse = async (courseId) => {
    try {
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('courseId', '==', courseId)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      return enrollmentsSnapshot.size;
    } catch (error) {
      console.error('Error fetching student count:', error);
      return 0;
    }
  };

  const fetchMyCourses = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'courses'), where('teacherId', '==', user.uid));
      const snap = await getDocs(q);
      const courseList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const coursesWithCounts = await Promise.all(
        courseList.map(async (course) => {
          const studentCount = await fetchStudentCountForCourse(course.id);
          return { ...course, studentCount };
        })
      );
      setCourses(coursesWithCounts);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyCourses(); }, []);

  // Calculate stats for dashboard
  const totalStudents = courses.reduce((sum, course) => sum + (course.studentCount || 0), 0);
  const activeCourses = courses.filter(course => course.status === 'active').length;
  const totalCourses = courses.length;

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
      if (file.size > 5 * 1024 * 1024) { alert('File size must be less than 5MB.'); return; }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const refreshStudentCounts = async () => {
    try {
      const coursesWithCounts = await Promise.all(
        courses.map(async (course) => {
          const studentCount = await fetchStudentCountForCourse(course.id);
          return { ...course, studentCount };
        })
      );
      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Error refreshing student counts:', error);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) { alert("You must be logged in to create a course."); return; }
    if (!selectedFile) { alert("Please select a photo first"); return; }
    setUploading(true);
    try {
      let thumbnailBase64 = '';
      const fileSizeInMB = selectedFile.size / (1024 * 1024);
      if (fileSizeInMB > 1) throw new Error(`Image is too large for Firestore (${fileSizeInMB.toFixed(2)}MB). Please use an image smaller than 1MB.`);
      const reader = new FileReader();
      thumbnailBase64 = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(new Error("Failed to convert image to Base64"));
        reader.readAsDataURL(selectedFile);
      });
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      await addDoc(collection(db, 'courses'), {
        title: newCourse.title,
        category: newCourse.category,
        description: newCourse.description,
        thumbnailUrl: thumbnailBase64,
        teacherId: user.uid,
        teacherName: userData.fullName || user.displayName || 'Instructor',
        teacherEmail: user.email,
        createdAt: serverTimestamp(),
        studentCount: 0,
        status: 'active'
      });
      setShowModal(false);
      await fetchMyCourses();
      setNewCourse({ title: '', category: 'Math', description: '' });
      setSelectedFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error("Error creating course:", err);
      alert(`Error creating course: ${err.message || 'Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
          <div className="text-zinc-500 font-medium">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 text-white px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold mb-4 tracking-tight">Course Management Dashboard</h1>
              <p className="text-zinc-300 text-lg">Manage your courses, track student progress, and grow your teaching impact</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-white text-zinc-900 px-8 py-4 rounded-[2rem] font-semibold hover:bg-zinc-100 transition-all hover:scale-[1.02] flex items-center gap-3 shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create New Course
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-8 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100 hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-zinc-900">{totalCourses}</p>
              <p className="text-zinc-500 font-medium">Total Courses</p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100 hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <Award className="w-5 h-5 text-amber-500" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-zinc-900">{totalStudents}</p>
              <p className="text-zinc-500 font-medium">Total Students</p>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-zinc-100 hover:shadow-xl transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-zinc-900">{activeCourses}</p>
              <p className="text-zinc-500 font-medium">Active Courses</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 pb-16">
        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-zinc-100 p-1 rounded-2xl w-fit">
          {['overview', 'courses', 'students', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-zinc-100 p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-6">Recent Activity</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-zinc-50 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-semibold text-zinc-900">Upcoming Classes</span>
                    </div>
                    <p className="text-zinc-600">3 classes scheduled for this week</p>
                  </div>
                  <div className="p-6 bg-zinc-50 rounded-2xl">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="font-semibold text-zinc-900">Pending Reviews</span>
                    </div>
                    <p className="text-zinc-600">12 assignments awaiting review</p>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-zinc-900 mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <button
                    onClick={() => setShowModal(true)}
                    className="p-6 border-2 border-dashed border-zinc-200 rounded-2xl hover:border-zinc-400 hover:bg-zinc-50 transition-all group"
                  >
                    <Plus className="w-8 h-8 text-zinc-400 group-hover:text-zinc-600 mb-3" />
                    <p className="font-medium text-zinc-700">Create Course</p>
                  </button>
                  <button
                    onClick={() => router.push('/teacher-dashboard/assignments')}
                    className="p-6 border-2 border-dashed border-zinc-200 rounded-2xl hover:border-zinc-400 hover:bg-zinc-50 transition-all group"
                  >
                    <FileText className="w-8 h-8 text-zinc-400 group-hover:text-zinc-600 mb-3" />
                    <p className="font-medium text-zinc-700">Manage Assignments</p>
                  </button>
                  <button
                    onClick={() => router.push('/teacher-dashboard/settings')}
                    className="p-6 border-2 border-dashed border-zinc-200 rounded-2xl hover:border-zinc-400 hover:bg-zinc-50 transition-all group"
                  >
                    <Settings className="w-8 h-8 text-zinc-400 group-hover:text-zinc-600 mb-3" />
                    <p className="font-medium text-zinc-700">Settings</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'courses' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-zinc-900">Your Courses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="group bg-white border border-zinc-200 rounded-[2.5rem] overflow-hidden hover:shadow-xl transition-all hover:scale-[1.02]"
                  >
                    {course.thumbnailUrl ? (
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-white/80" />
                      </div>
                    )}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-zinc-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-2 text-zinc-500 text-sm mb-4">
                        <Users className="w-4 h-4" />
                        <span>{course.studentCount || 0} students</span>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setSelectedCourse(course); setShowStudents(true); }}
                          className="flex-1 py-2 px-4 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200 transition-all"
                        >
                          View Students
                        </button>
                        <button
                          onClick={() => router.push(`/teacher-dashboard/courses-1`)}
                          className="flex-1 py-2 px-4 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-all"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && (
                  <div className="col-span-full text-center py-16">
                    <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                      <BookOpen className="w-10 h-10 text-zinc-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-zinc-900 mb-2">No courses yet</h3>
                    <p className="text-zinc-500 mb-6">Create your first course to start teaching</p>
                    <button
                      onClick={() => setShowModal(true)}
                      className="bg-zinc-900 text-white px-6 py-3 rounded-[2rem] font-semibold hover:bg-zinc-800 transition-all hover:scale-[1.02] flex items-center gap-2 mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Create Course
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-zinc-900">Student Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {courses.slice(0, 4).map((course) => (
                  <div key={course.id} className="p-6 bg-zinc-50 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-zinc-900">{course.title}</h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {course.studentCount || 0} students
                      </span>
                    </div>
                    <button
                      onClick={() => { setSelectedCourse(course); setShowStudents(true); }}
                      className="w-full py-2 bg-white border border-zinc-200 rounded-xl font-medium hover:bg-zinc-50 transition-all"
                    >
                      View All Students
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-zinc-900">Performance Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                    <span className="font-semibold text-zinc-900">Course Engagement</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-600 mb-2">87%</p>
                  <p className="text-zinc-600">Average completion rate</p>
                </div>
                <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl">
                  <div className="flex items-center gap-3 mb-4">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                    <span className="font-semibold text-zinc-900">Student Growth</span>
                  </div>
                  <p className="text-3xl font-bold text-green-600 mb-2">+23%</p>
                  <p className="text-zinc-600">Month over month increase</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Course Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowModal(false)} />
          <div className="bg-white w-full max-w-2xl p-12 rounded-[3rem] shadow-xl relative z-[101] overflow-y-auto max-h-[90vh]">
            <button onClick={() => setShowModal(false)} className="absolute top-8 right-8 p-2 hover:bg-zinc-100 rounded-full transition-all">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
            
            <h2 className="text-3xl font-bold text-zinc-900 mb-2">Create New Course</h2>
            <p className="text-zinc-500 mb-8">Add a new course to your teaching portfolio</p>
            
            <form onSubmit={handleCreateCourse} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Course Title</label>
                <input 
                  required 
                  className="w-full p-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 transition-all"
                  placeholder="Enter course title"
                  value={newCourse.title}
                  onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Category</label>
                  <select 
                    className="w-full p-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 transition-all appearance-none"
                    value={newCourse.category}
                    onChange={e => setNewCourse({...newCourse, category: e.target.value})}
                  >
                    <option value="Math">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Programming">Programming</option>
                    <option value="Design">UI/UX Design</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Course Thumbnail</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="thumbnail-upload"
                    />
                    <label
                      htmlFor="thumbnail-upload"
                      className="block w-full h-32 border-2 border-dashed border-zinc-300 rounded-3xl cursor-pointer hover:border-zinc-400 transition-colors relative overflow-hidden"
                    >
                      {imagePreview ? (
                        <img 
                          src={imagePreview} 
                          alt="Thumbnail preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-400">
                          <Upload className="w-8 h-8 mb-2" />
                          <span className="text-sm">Click to upload thumbnail</span>
                          <span className="text-xs mt-1">PNG, JPG up to 5MB</span>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Description</label>
                <textarea 
                  required 
                  className="w-full p-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 transition-all h-32 resize-none"
                  placeholder="Describe your course..."
                  value={newCourse.description}
                  onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200 transition-all"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-4 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Students Modal/Overlay */}
      {showStudents && selectedCourse && (
        <div className="fixed inset-0 z-[100] bg-white">
          <ActiveStudents
            courseId={selectedCourse.id}
            courseTitle={selectedCourse.title}
            onBack={async () => {
              setShowStudents(false);
              setSelectedCourse(null);
              await refreshStudentCounts();
            }}
          />
        </div>
      )}
    </div>
  );
}