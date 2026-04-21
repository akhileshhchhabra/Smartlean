'use client';

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  increment,
  arrayUnion,
  Timestamp,
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, MessageCircle, HelpCircle, Clock, Send, RefreshCw, Check, X, Users, Award, AlertCircle, Eye, CheckCircle
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';

export default function DoubtPage() {
  const [activeTab, setActiveTab] = useState('post');
  const [currentUser, setCurrentUser] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [myDoubts, setMyDoubts] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [doubtCreating, setDoubtCreating] = useState(false);
  const [doubtError, setDoubtError] = useState('');
  const [doubtQuestion, setDoubtQuestion] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Fetch user data and enrolled courses
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // User is authenticated, proceed with data fetching
        try {
          // Fetch enrolled courses
          const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
          const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
          const enrollmentsList = enrollmentsSnapshot.docs.map(doc => doc.data());
          
          if (enrollmentsList.length === 0) {
            setEnrolledCourses([]);
            setLoading(false);
            return;
          }

          // Get course details
          const courseIds = enrollmentsList.map(enrollment => enrollment.courseId);
          const coursesPromises = courseIds.map(courseId => getDoc(doc(db, 'courses', courseId)));
          const courseDocs = await Promise.all(coursesPromises);
          const coursesData = courseDocs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() }));
          setEnrolledCourses(coursesData);
          
          // Fetch user points
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserPoints(userData.points || 0);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        } finally {
          setLoading(false);
        }
      }
    });
    return unsubscribe;
  }, []);

  // Real-time listener for student's doubts only
  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // My Doubts: Only doubts I asked
    const myDoubtsQuery = query(
      collection(db, 'doubts'),
      where('askerEmail', '==', currentUser.email)
    );
    
    const unsubscribeMyDoubts = onSnapshot(myDoubtsQuery, (snapshot) => {
      const doubtsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMyDoubts(doubtsList.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.timestamp?.toDate?.() || new Date(0);
        return timeB - timeA;
      }));
    });
    
    return () => {
      unsubscribeMyDoubts();
    };
  }, [currentUser?.uid]);

  // Notification system
  const addNotification = useCallback((type, message, points) => {
    const id = Date.now();
    const notification = {
      id,
      type,
      message,
      points,
      timestamp: new Date()
    };
    
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  // Award points for different actions
  const awardPoints = useCallback(async (amount, reason = 'general') => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { points: increment(amount) });
      setUserPoints(prev => prev + amount);
      
      if (reason === 'ask_doubt') {
        addNotification('success', 'Doubt posted successfully!', 0);
      } else if (reason === 'solve_doubt') {
        addNotification('success', '+10 Points! You helped solve a doubt', 10);
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  }, [currentUser, addNotification]);

  // Create new doubt
  const handleCreateDoubt = useCallback(async () => {
    if (!currentUser || !selectedCourse) {
      setDoubtError('Please select a course');
      return;
    }

    const trimmedQuestion = doubtQuestion.trim();
    
    if (!trimmedQuestion) {
      setDoubtError('Please fill in all fields');
      return;
    }
    
    setDoubtCreating(true);
    setDoubtError('');

    try {
      const askerName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Student';
      
      const doubtData = {
        askerEmail: currentUser.email,
        askerName,
        courseId: selectedCourse.id,
        courseName: selectedCourse.title || selectedCourse.courseName || 'Course',
        question: trimmedQuestion,
        status: 'pending',
        replies: [],
        timestamp: serverTimestamp()
      };
      
      await addDoc(collection(db, 'doubts'), doubtData);
      // No points deduction for posting doubt
      addNotification('success', 'Doubt posted successfully!', 0);
      
      resetDoubtForm();
    } catch (error) {
      setDoubtError(error?.message || 'Failed to create doubt');
    } finally {
      setDoubtCreating(false);
    }
  }, [currentUser, selectedCourse, doubtQuestion, awardPoints]);

  
  
  // Reset form
  const resetDoubtForm = useCallback(() => {
    setDoubtQuestion('');
    setSelectedCourse(null);
    setDoubtError('');
  }, []);

  // Status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'solved':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'under_discussion':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'solved':
        return 'Solved';
      case 'under_discussion':
        return 'Under Discussion';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-black">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Animated Notification System */}
      <div className="fixed top-24 right-6 z-[100] space-y-3">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border-2 transform transition-all duration-300 ease-out animate-in slide-in-from-right fade-in-0 ${
              notification.type === 'success'
                ? 'bg-green-50 border-green-500 text-green-800'
                : notification.type === 'error'
                ? 'bg-red-50 border-red-500 text-red-800'
                : 'bg-blue-50 border-blue-500 text-blue-800'
            }`}
          >
            {notification.type === 'success' && <Check className="h-5 w-5" />}
            {notification.type === 'error' && <X className="h-5 w-5" />}
            {notification.type === 'info' && <AlertCircle className="h-5 w-5" />}
            <div className="flex flex-col">
              <p className="font-semibold text-sm">{notification.message}</p>
              <p className="text-xs opacity-75">
                {notification.points > 0 ? '+' : ''}{notification.points} points
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Points Wallet */}
      <div className="fixed top-24 right-6 z-[90] translate-x-0">
        <div className="bg-white border-2 border-black rounded-2xl p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="text-2xl">??</div>
            <div className="flex flex-col">
              <p className="text-xs font-semibold text-black uppercase tracking-wider">PTS Balance</p>
              <p className="text-2xl font-black text-black">{userPoints}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-20">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-black text-black mb-4">Doubt Section</h1>
          <p className="text-black text-xl">Ask questions, offer help, and collaborate with peers in your courses.</p>
        </div>

        {/* 4-Tab Navigation */}
        <div className="mb-16">
          <div className="p-2 border border-zinc-200 rounded-full bg-zinc-50 inline-flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('post')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'post'
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-black border border-transparent hover:bg-zinc-100'
              }`}
            >
              <HelpCircle className="h-4 w-4" />
              Post a Doubt
            </button>
            <button
              onClick={() => setActiveTab('my-doubts')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'my-doubts'
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-black border border-transparent hover:bg-zinc-100'
              }`}
            >
              <Users className="h-4 w-4" />
              My Doubts
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-10">
          
          {/* Tab 1: Post a Doubt */}
          {activeTab === 'post' && (
            <div className="space-y-12">
              <div className="flex items-center gap-4 mb-8">
                <HelpCircle className="h-6 w-6 text-black" />
                <h2 className="text-3xl font-bold text-black">Post a Doubt</h2>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-black mb-4">Select Course</label>
                <select
                  value={selectedCourse?.id || ''}
                  onChange={(e) => {
                    const course = enrolledCourses.find(c => c.id === e.target.value);
                    setSelectedCourse(course);
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-6 py-4 text-black focus:border-black focus:outline-none"
                  autoFocus
                >
                  <option value="">Select a course...</option>
                  {enrolledCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title || course.courseName || course.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-black mb-4">Your Question</label>
                <textarea
                  value={doubtQuestion}
                  onChange={(e) => setDoubtQuestion(e.target.value)}
                  placeholder="What's your doubt? Be as detailed as possible..."
                  className="w-full rounded-xl border border-zinc-200 bg-white px-6 py-4 text-black placeholder-zinc-400 focus:border-black focus:outline-none resize-none"
                  rows={6}
                />
              </div>

              {doubtError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600 mb-8">
                  {doubtError}
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-500">
                  Post your doubt for free and get expert answers.
                </p>
                <button
                  onClick={handleCreateDoubt}
                  disabled={doubtCreating || !selectedCourse || !doubtQuestion.trim()}
                  className="px-8 py-4 bg-black hover:bg-zinc-800 text-white rounded-full font-semibold transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {doubtCreating ? (
                    <>
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Post Doubt
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: My Doubts */}
          {activeTab === 'my-doubts' && (
            <div className="space-y-12">
              <div className="flex items-center gap-4 mb-8">
                <Users className="h-6 w-6 text-black" />
                <h2 className="text-3xl font-bold text-black">My Doubts</h2>
              </div>

              {myDoubts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-6">
                    <HelpCircle className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-4">No Doubts Yet</h3>
                  <p className="text-zinc-600 text-lg">Start asking questions to see your doubts here!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {myDoubts.map((doubt) => (
                    <motion.div
                      key={doubt.id}
                      className="border border-zinc-200 rounded-xl bg-white hover:bg-zinc-50 transition-all duration-200 cursor-pointer"
                      onMouseEnter={() => setHoveredCard(doubt.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                      layout
                    >
                      <div className="p-6">
                        {/* Default view: Course Name + Question Title */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-black mb-2">
                              {doubt.question?.length > 60 ? doubt.question.substring(0, 60) + '...' : doubt.question}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-zinc-600">
                              <span>Course: {doubt.courseName}</span>
                              <span>{doubt.timestamp?.toDate()?.toLocaleDateString()}</span>
                            </div>
                            
                            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(doubt.status)}`}>
                              {getStatusText(doubt.status)}
                            </div>
                          </div>
                        </div>

                        {/* Expanded view on hover */}
                        <AnimatePresence>
                          {hoveredCard === doubt.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="pt-4 border-t border-zinc-100">
                                <div className="mb-4">
                                  <p className="text-black leading-relaxed">{doubt.question}</p>
                                </div>

                                {/* Show Teacher's Answer if available */}
                                {doubt.replies && doubt.replies.length > 0 && (
                                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Award className="h-4 w-4 text-green-600" />
                                      <span className="font-semibold text-green-800">Expert Solution</span>
                                    </div>
                                    {doubt.replies.map((reply, index) => (
                                      reply.role === 'teacher' && (
                                        <div key={index} className="text-black">
                                          <p className="text-sm font-medium text-zinc-600 mb-2">
                                            {reply.replierName || reply.user} - {reply.timestamp?.toDate()?.toLocaleDateString()}
                                          </p>
                                          <p className="text-black leading-relaxed">
                                            {reply.content || reply.text}
                                          </p>
                                        </div>
                                      )
                                    ))}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Solved */}
          {activeTab === 'solved' && (
            <div className="space-y-12">
              <div className="flex items-center gap-4 mb-8">
                <CheckCircle className="h-6 w-6 text-black" />
                <h2 className="text-3xl font-bold text-black">Solved</h2>
              </div>

              {solvedDoubts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-4">No Solutions Yet</h3>
                  <p className="text-zinc-600 text-lg">Start helping peers to see your solutions here!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {solvedDoubts.map((doubt) => (
                    <div key={doubt.id} className="border border-zinc-200 rounded-xl p-10 bg-white hover:bg-zinc-50 transition-all duration-200">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-black mb-2">{doubt.question}</h3>
                          <div className="flex items-center gap-4 text-sm text-zinc-600 mb-4">
                            <span>Asked by: {doubt.askerName}</span>
                            <span>Course: {doubt.courseName}</span>
                            <span>{doubt.timestamp?.toDate()?.toLocaleDateString()}</span>
                          </div>
                          
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(doubt.status)}`}>
                            {getStatusText(doubt.status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <p className="text-black leading-relaxed">{doubt.question}</p>
                      </div>

                      <div className="flex items-center gap-2 text-green-600">
                        <Award className="h-5 w-5" />
                        <span className="font-semibold">+10 Points earned for helping!</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
