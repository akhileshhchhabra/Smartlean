'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Play, Plus } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, onSnapshot, orderBy, serverTimestamp } from 'firebase/firestore';
import ChallengeInbox from '@/components/ChallengeInbox';

export default function StudentDashboardHome() {
  const router = useRouter();
  const [doubtQuestion, setDoubtQuestion] = useState('');
  const [pendingTasks, setPendingTasks] = useState([]);
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

    // Setup real-time listener for pending assignments
    const setupAssignmentsListener = () => {
      const user = auth.currentUser;
      if (!user) return;

      const assignmentsQuery = query(
        collection(db, 'assignments'),
        where('status', '!=', 'completed'),
        orderBy('dueDate', 'asc')
      );

      const unsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
        const assignments = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || 'Untitled Assignment',
            dueDate: data.dueDate,
            due: formatDueDate(data.dueDate),
            urgent: isUrgent(data.dueDate),
            courseId: data.courseId,
            submittedBy: data.submittedBy || []
          };
        });

        // Filter assignments for student's enrolled courses
        const studentAssignments = assignments.filter(assignment => 
          filteredCourses.some(course => course.id === assignment.courseId) &&
          !assignment.submittedBy.includes(user.uid)
        );

        setPendingTasks(studentAssignments);
      }, (error) => {
        console.error('Error listening to assignments:', error);
      });

      return unsubscribe;
    };

    const assignmentsUnsubscribe = setupAssignmentsListener();

    return () => {
      if (assignmentsUnsubscribe) {
        assignmentsUnsubscribe();
      }
    };
  }, []);

  // Helper functions for date formatting and urgency
  const formatDueDate = (dueDate) => {
    if (!dueDate) return 'No due date';
    
    const due = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (due.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (due.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const isUrgent = (dueDate) => {
    if (!dueDate) return false;
    
    const due = new Date(dueDate);
    const today = new Date();
    const timeDiff = due.getTime() - today.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);
    
    return daysDiff <= 1; // Urgent if due within 1 day
  };

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

  const handleTaskSubmit = async (taskId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const assignmentRef = doc(db, 'assignments', taskId);
      await updateDoc(assignmentRef, {
        submittedBy: arrayUnion(user.uid),
        submittedAt: serverTimestamp()
      });

      // Update local state to remove the submitted task
      setPendingTasks(prev => prev.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('Failed to submit assignment. Please try again.');
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
          <div className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] font-['Syne']">{pendingTasks.length}</div>
          <div className="text-zinc-400 text-sm mt-1">Pending Tasks</div>
        </div>
        {/* <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] font-['Syne']">92%</div>
          <div className="text-zinc-400 text-sm mt-1">Attendance</div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
          <div className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] font-['Syne']">3.8</div>
          <div className="text-zinc-400 text-sm mt-1">Current GPA</div>
        </div> */}
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

      {/* Main Content - Full Width */}
      <div className="space-y-6">
        {/* My Challenges Section */}
        <ChallengeInbox />

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
    </div>
  );
}