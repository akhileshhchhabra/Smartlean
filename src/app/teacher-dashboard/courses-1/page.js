'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, User, ArrowRight, Clock, X, Edit } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

export default function TeacherCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [newCourse, setNewCourse] = useState({ title: '', category: 'Math', description: '', thumbnailUrl: '' });

  // Fetch only this teacher's courses
  const fetchMyCourses = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const q = query(
        collection(db, 'courses'), 
        where('teacherId', '==', user.uid)
      );
      
      const snap = await getDocs(q);
      const courseList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(courseList);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCourses();
  }, []);

  // File upload handler
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB.');
        return;
      }
      
      setSelectedFile(file);
      const preview = URL.createObjectURL(file);
      setImagePreview(preview);
    }
  };

  // Add New Course Logic with Base64 conversion
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to create a course.");
      return;
    }

    // Verification: Check if file object exists before starting conversion
    console.log("File object verification:", selectedFile);
    if (!selectedFile) {
      alert("Please select a photo first");
      return;
    }

    setUploading(true);
    console.log("Saving started...");
    
    try {
      let thumbnailBase64 = '';
      
      // Convert file to Base64 using FileReader
      console.log("Converting image to Base64:", selectedFile.name);
      
      // Check file size for Firestore limit (1MB)
      const fileSizeInMB = selectedFile.size / (1024 * 1024);
      if (fileSizeInMB > 1) {
        throw new Error(`Image is too large for Firestore (${fileSizeInMB.toFixed(2)}MB). Please use an image smaller than 1MB.`);
      }
      
      // Convert to Base64
      const reader = new FileReader();
      thumbnailBase64 = await new Promise((resolve, reject) => {
        reader.onload = (e) => {
          const result = e.target.result;
          console.log("Base64 string generated successfully");
          resolve(result);
        };
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          reject(new Error("Failed to convert image to Base64"));
        };
        reader.readAsDataURL(selectedFile);
      });
      
      // Fetch user profile to get fullName
      console.log("Fetching user profile...");
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      console.log("User profile fetched:", userData.fullName || user.displayName);
      
      // Create course document with Base64 string
      console.log("Creating course document...");
      const courseDoc = await addDoc(collection(db, 'courses'), {
        title: newCourse.title,
        category: newCourse.category,
        description: newCourse.description,
        thumbnailUrl: thumbnailBase64, // Save Base64 string directly
        teacherId: user.uid,
        teacherName: userData.fullName || user.displayName || 'Instructor',
        teacherEmail: user.email,
        createdAt: serverTimestamp(),
        studentCount: 0,
        status: 'active'
      });
      console.log("Course created successfully with ID:", courseDoc.id);
      
      // Success - close modal and refresh
      setShowModal(false);
      console.log("Modal closed, refreshing course list...");
      
      // Refresh course list
      await fetchMyCourses();
      console.log("Course list refreshed");
      
      // Reset states after successful save
      setNewCourse({ title: '', category: 'Math', description: '' });
      setSelectedFile(null);
      setImagePreview(null);
      console.log("All states cleared");
      
    } catch (err) {
      console.error("Error creating course:", err);
      alert(`Error creating course: ${err.message || 'Please try again.'}`);
    } finally {
      // Loading State Fix: Ensure setUploading(false) is always called
      setUploading(false);
      console.log("Save process completed, loading state reset");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
        <div className="text-zinc-500 font-medium">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBFBFD] p-16 lg:p-24">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-tight">
              Course Studio
            </h1>
            <p className="text-zinc-500 mt-1">Manage your teaching curriculum.</p>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="bg-black text-white px-6 py-3 rounded-[2rem] font-semibold hover:bg-zinc-800 transition-all duration-300 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create New Course
          </button>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div 
              key={course.id} 
              className="group bg-white rounded-[4rem] border border-zinc-100 p-5 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300"
            >
              {/* Course Thumbnail */}
              {course.thumbnailUrl ? (
                <img 
                  src={course.thumbnailUrl} 
                  alt={course.title}
                  className="w-full h-40 object-cover rounded-2xl mb-5"
                />
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-5 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                  <BookOpen className="w-12 h-12 text-white/80" />
                </div>
              )}

              {/* Course Content */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#1D1D1F] leading-snug group-hover:text-blue-600 transition-colors">
                    {course.title}
                  </h3>
                  <div className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                    {course.category}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-400 font-bold">
                  <User className="w-4 h-4" />
                  {course.studentCount || 0} Students
                </div>

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                  <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Active
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => router.push(`/teacher-dashboard/courses-1`)}
                      className="flex items-center gap-1 text-sm font-semibold text-white bg-[#1D1D1F] hover:bg-zinc-800 px-3 py-2 rounded-xl transition-all"
                    >
                      <Edit className="w-4 h-4" /> Manage
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {courses.length === 0 && (
          <div className="bg-white rounded-[4rem] border border-zinc-100 p-16 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[3rem] flex items-center justify-center mx-auto mb-6">
              <BookOpen className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#1D1D1F] mb-4">No courses yet</h3>
            <p className="text-zinc-500 mb-6">Create your first course to start teaching.</p>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-black text-white px-6 py-3 rounded-[2rem] font-semibold hover:bg-zinc-800 transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <Plus className="w-4 h-4" /> Create Course
            </button>
          </div>
        )}

        {/* Create Course Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowModal(false)} />
            
            <div className="bg-white w-full max-w-2xl p-16 rounded-[3rem] shadow-xl relative z-[101] overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-all">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
              
              <h2 className="text-3xl font-bold text-[#1D1D1F] font-['Syne'] mb-2">Create New Course</h2>
              <p className="text-zinc-500 mb-8">Add a new course to your teaching portfolio.</p>
              
              <form onSubmit={handleCreateCourse} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Course Title</label>
                  <input 
                    required 
                    className="w-full p-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all"
                    placeholder="Enter course title"
                    value={newCourse.title}
                    onChange={e => setNewCourse({...newCourse, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Category</label>
                    <select 
                      className="w-full p-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all appearance-none"
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
                            <Plus className="w-8 h-8 mb-2" />
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
                    className="w-full p-4 bg-white border border-zinc-200 rounded-xl outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all h-32 resize-none"
                    placeholder="Describe your course..."
                    value={newCourse.description}
                    onChange={e => setNewCourse({...newCourse, description: e.target.value})}
                  ></textarea>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200 transition-all"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 py-3 bg-black text-white rounded-xl font-medium hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploading}
                  >
                    {uploading ? 'Saving...' : 'Create Course'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}