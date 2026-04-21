'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Play, Plus } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import ChallengeInbox from '@/components/ChallengeInbox';

// Sample upcoming tasks data
const upcomingTasks = [
  { title: 'Math Assignment Ch.5', due: 'Tomorrow', urgent: true },
  { title: 'Physics Lab Report', due: 'Apr 22', urgent: false },
  { title: 'English Essay', due: 'Apr 25', urgent: false },
  { title: 'Chemistry Quiz', due: 'Apr 28', urgent: false },
];

export default function StudentDashboardHome() {
  const router = useRouter();
  const [doubtQuestion, setDoubtQuestion] = useState('');
  const [userSubscription, setUserSubscription] = useState({
    subscriptionPlan: null,
    enrolledCourses: [],
    startedCourses: [],
    purchasedCourses: []
  });
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch user's enrollments
        const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        const enrollmentsList = enrollmentsSnapshot.docs.map(doc => doc.data());
        
        if (enrollmentsList.length === 0) {
          setFilteredCourses([]);
          setLoading(false);
          return;
        }

        // Get course IDs from enrollments
        const courseIds = enrollmentsList.map(enrollment => enrollment.courseId);
        
        // Fetch full course details for enrolled courses
        const coursesPromises = courseIds.map(courseId => 
          getDoc(doc(db, 'courses', courseId))
        );
        
        const courseDocs = await Promise.all(coursesPromises);
        const coursesData = courseDocs
          .filter(doc => doc.exists())
          .map(doc => ({ id: doc.id, ...doc.data() }));

        setFilteredCourses(coursesData);
        
        // Also fetch user subscription data for stats
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserSubscription({
            subscriptionPlan: userData.subscriptionPlan || null,
            enrolledCourses: courseIds,
            startedCourses: userData.startedCourses || [],
            purchasedCourses: userData.purchasedCourses || []
          });
        }
      } catch (error) {
        console.error('Error fetching enrolled courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, []);

  const handleStartCourse = async (courseId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        startedCourses: arrayUnion(courseId)
      });

      setUserSubscription(prev => ({
        ...prev,
        startedCourses: [...prev.startedCourses, courseId]
      }));
      // Refetch enrolled courses to update the display
      const fetchEnrolledCourses = async () => {
        try {
          const user = auth.currentUser;
          if (!user) return;

          // Fetch user's enrollments
          const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
          const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
          const enrollmentsList = enrollmentsSnapshot.docs.map(doc => doc.data());
          
          if (enrollmentsList.length === 0) {
            setFilteredCourses([]);
            return;
          }

          // Get course IDs from enrollments
          const courseIds = enrollmentsList.map(enrollment => enrollment.courseId);
          
          // Fetch full course details for enrolled courses
          const coursesPromises = courseIds.map(courseId => 
            getDoc(doc(db, 'courses', courseId))
          );
          
          const courseDocs = await Promise.all(coursesPromises);
          const coursesData = courseDocs
            .filter(doc => doc.exists())
            .map(doc => ({ id: doc.id, ...doc.data() }));

          setFilteredCourses(coursesData);
        } catch (error) {
          console.error('Error refetching enrolled courses:', error);
        }
      };
      
      fetchEnrolledCourses();
    } catch (error) {
      console.error('Error starting course:', error);
    }
  };

  const handleDoubtSubmit = () => {
    if (doubtQuestion.trim()) {
      alert('Doubt submitted successfully!');
      setDoubtQuestion('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em] mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-zinc-500">Here&apos;s your learning overview</p>
      </div>

      {/* Stats Row - 4 Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] font-['Syne']">{filteredCourses.length}</div>
          <div className="text-zinc-400 text-sm mt-1">
            {userSubscription.subscriptionPlan === 'basic' ? 'Enrolled Courses' : 'Active Courses'}
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] font-['Syne']">5</div>
          <div className="text-zinc-400 text-sm mt-1">Pending Tasks</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] font-['Syne']">92%</div>
          <div className="text-zinc-400 text-sm mt-1">Attendance</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] font-['Syne']">3.8</div>
          <div className="text-zinc-400 text-sm mt-1">Current GPA</div>
        </div>
      </div>

      {/* Personalized Courses Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-[#1D1D1F] font-['Syne']">
            {userSubscription.subscriptionPlan === 'basic' ? 'My Enrolled Courses' : 'Continue Learning'}
          </h2>
          {filteredCourses.length === 0 && (
            <button
              onClick={() => router.push('/student-dashboard/courses')}
              className="flex items-center gap-2 px-4 py-2 bg-[#1D1D1F] text-white rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-all"
            >
              <Plus className="w-4 h-4" /> Browse Courses
            </button>
          )}
        </div>
        
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-3xl border border-zinc-100 p-5 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300">
                {/* Course Thumbnail */}
                <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-5 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                  <BookOpen className="w-12 h-12 text-white/80" />
                </div>

                {/* Course Content */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-[#1D1D1F] leading-snug group-hover:text-blue-600 transition-colors">
                      {course.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-zinc-400 font-bold">
                    <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center">
                      <Play className="w-3 h-3" />
                    </div>
                    Instructor: {course.teacherName || 'Unknown'}
                  </div>

                  {/* Progress Section */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-400">Progress</span>
                      <span className="text-[#1D1D1F]">{course.progress || 0}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#1D1D1F] rounded-full transition-all duration-1000" 
                        style={{ width: `${course.progress || 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={() => handleStartCourse(course.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#1D1D1F] text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all"
                  >
                    <Play className="w-4 h-4" /> Continue Learning
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 p-12 text-center">
            <div className="w-16 h-16 bg-[#F5F5F7] rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
              You haven't enrolled in any courses yet!
            </h3>
            <p className="text-zinc-500 mb-6">
              Explore the catalog and start your learning journey today.
            </p>
            <button
              onClick={() => router.push('/student-dashboard/courses')}
              className="flex items-center gap-2 px-6 py-3 bg-[#1D1D1F] text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all mx-auto"
            >
              <Plus className="w-5 h-5" /> Explore Courses
            </button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* My Challenges Section */}
          <ChallengeInbox />

          {/* Upcoming Tasks Widget */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100">
            <h2 className="text-xl font-semibold text-[#1D1D1F] font-['Syne'] mb-6">Upcoming Tasks</h2>
            <div className="space-y-4">
              {upcomingTasks.map((task, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-[#F5F5F7] rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${task.urgent ? 'bg-red-500' : 'bg-zinc-300'}`}></div>
                    <span className="text-[#1D1D1F] font-medium">{task.title}</span>
                  </div>
                  <span className="text-zinc-400 text-sm">{task.due}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Graph Placeholder */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100">
            <h2 className="text-xl font-semibold text-[#1D1D1F] font-['Syne'] mb-6">Semester Performance</h2>
            <div className="h-48 bg-[#F5F5F7] rounded-xl flex items-center justify-center">
              <div className="text-center">
                <p className="text-zinc-400 text-sm">Performance Chart Placeholder</p>
                <p className="text-zinc-300 text-xs mt-1">Connect a chart library for visualization</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Quick Ask - Doubt Section */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100">
            <h2 className="text-xl font-semibold text-[#1D1D1F] font-['Syne'] mb-4">Quick Ask</h2>
            <p className="text-zinc-400 text-sm mb-4">Have a doubt? Ask your teacher!</p>
            <textarea
              value={doubtQuestion}
              onChange={(e) => setDoubtQuestion(e.target.value)}
              placeholder="Type your question here..."
              className="w-full p-4 bg-[#F5F5F7] rounded-xl text-sm text-[#1D1D1F] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/5 resize-none h-24"
            />
            <button
              onClick={handleDoubtSubmit}
              className="w-full mt-4 py-3 bg-[#1D1D1F] text-white font-semibold rounded-xl text-sm transition-all hover:bg-zinc-800"
            >
              Submit Question
            </button>
          </div>

          {/* Recent Grades */}
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-zinc-100">
            <h2 className="text-xl font-semibold text-[#1D1D1F] font-['Syne'] mb-4">Recent Grades</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">Mathematics</span>
                <span className="text-[#1D1D1F] font-semibold">92%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">Physics</span>
                <span className="text-[#1D1D1F] font-semibold">88%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500 text-sm">Chemistry</span>
                <span className="text-[#1D1D1F] font-semibold">95%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}