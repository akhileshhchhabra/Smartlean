'use client';

import { useState, useEffect } from 'react';
import { BookOpen, User, ArrowRight, Star, Clock, ShoppingCart, Play } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, collection, query, where, getDocs, increment, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [userSubscription, setUserSubscription] = useState({
    subscriptionPlan: null,
    enrolledCourses: [],
    startedCourses: [],
    purchasedCourses: []
  });
  const [enrollments, setEnrollments] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch ALL courses from Firestore without any filters
        const coursesSnapshot = await getDocs(collection(db, 'courses'));
        const coursesList = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCourses(coursesList);

        // Fetch user's enrollments
        const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        const enrollmentsList = enrollmentsSnapshot.docs.map(doc => doc.data());
        setEnrollments(enrollmentsList);

        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const subscriptionData = {
            subscriptionPlan: userData.subscriptionPlan || null,
            enrolledCourses: userData.enrolledCourses || [],
            startedCourses: userData.startedCourses || [],
            purchasedCourses: userData.purchasedCourses || []
          };
          setUserSubscription(subscriptionData);
          filterCourses(coursesList, subscriptionData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filterCourses = (coursesList, subscriptionData) => {
    // Show ALL courses to students regardless of subscription
    setFilteredCourses(coursesList);
  };

  const handleEnroll = async (courseId, courseTitle) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Check if already enrolled
      const isAlreadyEnrolled = enrollments.some(enrollment => 
        enrollment.studentId === user.uid && enrollment.courseId === courseId
      );
      
      if (isAlreadyEnrolled) {
        alert('You are already enrolled in this course!');
        return;
      }

      // Create enrollment document
      await addDoc(collection(db, 'enrollments'), {
        studentId: user.uid,
        studentEmail: user.email,
        courseId: courseId,
        courseTitle: courseTitle,
        enrolledAt: serverTimestamp()
      });

      // Update studentCount in course document
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        studentCount: increment(1)
      });

      // Update local state
      const newEnrollment = {
        studentId: user.uid,
        studentEmail: user.email,
        courseId: courseId,
        courseTitle: courseTitle,
        enrolledAt: new Date()
      };
      setEnrollments(prev => [...prev, newEnrollment]);

    } catch (error) {
      console.error('Error enrolling in course:', error);
      alert('Failed to enroll. Please try again.');
    }
  };

  const isEnrolled = (courseId) => {
    return enrollments.some(enrollment => 
      enrollment.studentId === auth.currentUser?.uid && enrollment.courseId === courseId
    );
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
      filterCourses(courses, { ...userSubscription, startedCourses: [...userSubscription.startedCourses, courseId] });
    } catch (error) {
      console.error('Error starting course:', error);
    }
  };

  const handlePurchaseCourse = async (courseId) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        purchasedCourses: arrayUnion(courseId)
      });

      setUserSubscription(prev => ({
        ...prev,
        purchasedCourses: [...prev.purchasedCourses, courseId]
      }));
      filterCourses(courses, { ...userSubscription, purchasedCourses: [...userSubscription.purchasedCourses, courseId] });
    } catch (error) {
      console.error('Error purchasing course:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
        <div className="text-zinc-500 font-medium">Finding courses...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-tight">
            My Courses
          </h1>
          <p className="text-zinc-500 mt-1">Pick up right where you left off.</p>
        </div>
        
        {/* Simple Tabs for Filtering */}
        <div className="flex bg-zinc-100 p-1 rounded-xl w-fit">
          <button className="px-4 py-2 bg-white text-sm font-medium rounded-lg shadow-sm">Ongoing</button>
          <button className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-800">Completed</button>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCourses.map((course) => (
          <div 
            key={course.id} 
            className="group bg-white rounded-[3.5rem] border border-zinc-100 p-5 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300"
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
              <div>
                <h3 className="text-lg font-bold text-[#1D1D1F] leading-snug group-hover:text-blue-600 transition-colors">
                  {course.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 text-sm text-zinc-400 font-bold">
                <User className="w-4 h-4" />
                Instructor: {course.teacherName || 'Unknown'}
              </div>

              {/* Footer Info */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Active
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isEnrolled(course.id) ? (
                    <button 
                      className="flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-50 px-3 py-2 rounded-xl transition-all"
                    >
                      <Play className="w-4 h-4" /> Go to Course
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleEnroll(course.id, course.title)}
                      className="flex items-center gap-1 text-sm font-semibold text-white bg-[#1D1D1F] hover:bg-zinc-800 px-3 py-2 rounded-xl transition-all"
                    >
                      <ArrowRight className="w-4 h-4" /> Enroll Now
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}