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
  Plus, MessageCircle, HelpCircle, Clock, Send, RefreshCw, Check, X, Users, Award, AlertCircle, Eye, CheckCircle, TrendingUp, Star, BarChart3, Target, Zap
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';

export default function TeacherDoubtPage() {
  const [activeTab, setActiveTab] = useState('global');
  const [currentUser, setCurrentUser] = useState(null);
  const [taughtCourses, setTaughtCourses] = useState([]);
  const [globalDoubts, setGlobalDoubts] = useState([]);
  const [answeredByMe, setAnsweredByMe] = useState([]);
  const [statistics, setStatistics] = useState({ 
    totalSolved: 0, 
    pointsEarned: 0, 
    weeklyHelped: 0,
    totalDoubts: 0
  });
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Fetch teacher data and taught courses
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // User is authenticated, proceed with data fetching
        try {
          // Fetch courses taught by this teacher
          const coursesQuery = query(collection(db, 'courses'), where('teacherId', '==', user.uid));
          const coursesSnapshot = await getDocs(coursesQuery);
          const coursesList = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTaughtCourses(coursesList);
          
          // Fetch user points
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserPoints(userData.points || 0);
          }
        } catch (error) {
          console.error('Error fetching teacher data:', error);
        } finally {
          setLoading(false);
        }
      }
    });
    return unsubscribe;
  }, []);

  // Real-time listeners for doubts
  useEffect(() => {
    if (!currentUser?.uid || !taughtCourses.length) return;
    
    const courseIds = taughtCourses.map(course => course.id);
    
    // Global Feed: All doubts from courses I teach that have no teacher reply yet
    const globalQuery = query(
      collection(db, 'doubts'),
      where('courseId', 'in', courseIds),
      where('status', '==', 'pending')
    );
    
    // Fetch all doubts for manual filtering (more reliable than array-contains)
    const allDoubtsQuery = query(collection(db, 'doubts'));
    
    const unsubscribeGlobal = onSnapshot(globalQuery, (snapshot) => {
      const doubtsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGlobalDoubts(doubtsList.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.timestamp?.toDate?.() || new Date(0);
        return timeB - timeA;
      }));
      
      // Update statistics
      setStatistics(prev => ({
        ...prev,
        totalDoubts: doubtsList.length
      }));
    });
    
    const unsubscribeAll = onSnapshot(allDoubtsQuery, (snapshot) => {
      const allDoubtsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Manual filter: Find doubts where teacher has replied
      const mySolvedDoubts = allDoubtsList.filter(doubt => 
        doubt.replies?.some(reply => reply.user === currentUser.email)
      );
      
      setAnsweredByMe(mySolvedDoubts.sort((a, b) => {
        const timeA = a.timestamp?.toDate?.() || new Date(0);
        const timeB = b.timestamp?.toDate?.() || new Date(0);
        return timeB - timeA;
      }));
      
      // Update statistics based on filtered results
      const solvedCount = mySolvedDoubts.length;
      const totalPoints = solvedCount * 20;
      
      // Calculate weekly helped (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const weeklyHelped = mySolvedDoubts.filter(d => {
        // Find teacher's replies in the last 7 days
        const teacherReplies = d.replies?.filter(reply => 
          reply.user === currentUser.email && 
          reply.timestamp?.toDate?.() > oneWeekAgo
        );
        return teacherReplies && teacherReplies.length > 0;
      }).length;
      
      setStatistics(prev => ({
        ...prev,
        totalSolved: solvedCount,
        pointsEarned: totalPoints,
        weeklyHelped: weeklyHelped
      }));
    });
    
    return () => {
      unsubscribeGlobal();
      unsubscribeAll();
    };
  }, [currentUser?.uid, taughtCourses]);

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

  // Points management
  const awardPoints = useCallback(async (amount, reason = 'general') => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { points: increment(amount) });
      setUserPoints(prev => prev + amount);
      
      if (reason === 'solve_doubt') {
        addNotification('success', '+20 Credits Added to your Profile!', 20);
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  }, [currentUser, addNotification]);

  // Reply to doubt
  const handleReply = useCallback(async (doubtId) => {
    if (!currentUser || !replyText.trim()) return;
    
    try {
      const teacherName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Teacher';
      
      const replyData = {
        text: replyText.trim(),
        user: currentUser.email,
        role: 'teacher',
        timestamp: Timestamp.now(),
        replierId: currentUser.uid,
        replierName: teacherName,
        replierEmail: currentUser.email,
        content: replyText.trim(),
        isExpert: true
      };
      
      await updateDoc(doc(db, 'doubts', doubtId), {
        replies: arrayUnion(replyData),
        status: 'solved',
        updatedAt: serverTimestamp()
      });
      
      await awardPoints(20, 'solve_doubt');
      
      setReplyText('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error replying to doubt:', error);
    }
  }, [currentUser, replyText, globalDoubts, awardPoints]);

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

      <div className="max-w-6xl mx-auto px-8 py-20">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-black text-black mb-4">Doubt Resolution</h1>
          <p className="text-black text-xl">Help students resolve their doubts and earn expert rewards.</p>
        </div>

        {/* 3-Tab Navigation */}
        <div className="mb-16">
          <div className="p-2 border border-zinc-200 rounded-full bg-zinc-50 inline-flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('global')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'global'
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-black border border-transparent hover:bg-zinc-100'
              }`}
            >
              <Eye className="h-4 w-4" />
              Global Feed
            </button>
            <button
              onClick={() => setActiveTab('answered')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'answered'
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-black border border-transparent hover:bg-zinc-100'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              Answered by Me
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'statistics'
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-black border border-transparent hover:bg-zinc-100'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Statistics
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-12">
          
          {/* Tab 1: Global Feed */}
          {activeTab === 'global' && (
            <div className="space-y-16">
              <div className="flex items-center gap-4 mb-8">
                <Eye className="h-6 w-6 text-black" />
                <h2 className="text-3xl font-bold text-black">Global Feed</h2>
              </div>

              {globalDoubts.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-4">No Open Doubts</h3>
                  <p className="text-zinc-600 text-lg">No doubts from your courses yet. Check back later!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {globalDoubts.map((doubt) => (
                    <div key={doubt.id} className="border border-zinc-200 rounded-xl p-10 bg-white hover:bg-zinc-50 transition-all duration-200">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-black mb-2">{doubt.question}</h3>
                          <div className="flex items-center gap-4 text-sm text-zinc-600 mb-4">
                            <span>From: {doubt.askerName}</span>
                            <span>Course: {doubt.courseName}</span>
                            <span>{doubt.timestamp?.toDate()?.toLocaleDateString()}</span>
                          </div>
                          
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadge(doubt.status)}`}>
                            <Clock className="h-3 w-3" />
                            {getStatusText(doubt.status)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mb-6">
                        <p className="text-black leading-relaxed">{doubt.question}</p>
                      </div>

                      {/* Reply Section */}
                      {replyingTo === doubt.id ? (
                        <div className="space-y-4">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Provide your expert solution..."
                            className="w-full rounded-xl border border-zinc-200 bg-white px-6 py-4 text-black placeholder-zinc-400 focus:border-black focus:outline-none resize-none"
                            rows={4}
                          />
                          <div className="flex gap-4">
                            <button
                              onClick={() => handleReply(doubt.id)}
                              className="px-6 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                            >
                              <Send className="h-4 w-4" />
                              Submit Expert Solution (+20)
                            </button>
                            <button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText('');
                              }}
                              className="px-6 py-2 border border-zinc-300 bg-white hover:bg-zinc-50 text-black rounded-lg font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyingTo(doubt.id)}
                          className="px-6 py-2 bg-black hover:bg-zinc-800 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Provide Expert Solution
                        </button>
                      )}

                      {/* Existing Replies */}
                      {doubt.replies && doubt.replies.length > 0 && (
                        <div className="mt-6 space-y-3">
                          <h4 className="font-semibold text-black">Replies</h4>
                          {doubt.replies.map((reply, index) => (
                            <div key={index} className="border border-zinc-200 rounded-lg p-4 bg-zinc-50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-black">{reply.replierName}</span>
                                {reply.isExpert && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <Star className="h-4 w-4" />
                                    <span className="text-xs font-semibold">Expert Solution</span>
                                  </div>
                                )}
                              </div>
                              <p className="text-sm text-black">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Answered by Me */}
          {activeTab === 'answered' && (
            <div className="space-y-16">
              <div className="flex items-center gap-4 mb-8">
                <CheckCircle className="h-6 w-6 text-black" />
                <h2 className="text-3xl font-bold text-black">Answered by Me</h2>
              </div>

              {answeredByMe.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-4">No Solutions Yet</h3>
                  <p className="text-zinc-600 text-lg">Start helping students to see your solutions here!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {answeredByMe.map((doubt) => (
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
                              <span>Asked by: {doubt.askerName}</span>
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
                                <div className="mb-6">
                                  <p className="text-black leading-relaxed mb-6">{doubt.question}</p>
                                  
                                  {/* Find and display teacher's specific reply */}
                                  {doubt.replies && doubt.replies.length > 0 && (
                                    <div className="border border-green-200 rounded-lg p-6 bg-green-50">
                                      <div className="flex items-center gap-2 mb-3">
                                        <Award className="h-5 w-5 text-green-600" />
                                        <span className="font-semibold text-green-800">Your Expert Solution:</span>
                                      </div>
                                      {doubt.replies.map((reply, index) => (
                                        reply.user === currentUser.email && (
                                          <div key={index} className="text-black">
                                            <p className="text-sm font-medium text-zinc-600 mb-2">
                                              {reply.replierName} - {reply.timestamp?.toDate()?.toLocaleDateString()}
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

                                <div className="flex items-center gap-2 text-green-600">
                                  <Award className="h-5 w-5" />
                                  <span className="font-semibold">+20 Points earned for expert solution!</span>
                                </div>
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

          {/* Tab 3: Statistics */}
          {activeTab === 'statistics' && (
            <div className="space-y-16">
              <div className="flex items-center gap-4 mb-8">
                <TrendingUp className="h-6 w-6 text-black" />
                <h2 className="text-3xl font-bold text-black">Statistics</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="border border-black rounded-2xl p-10 bg-white hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-4xl font-black text-black">{statistics.totalSolved}</p>
                      <p className="text-lg font-semibold text-zinc-600">Total Solved</p>
                    </div>
                  </div>
                </div>

                <div className="border border-black rounded-2xl p-10 bg-white hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                      <Award className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-4xl font-black text-black">{statistics.pointsEarned}</p>
                      <p className="text-lg font-semibold text-zinc-600">Points Earned</p>
                    </div>
                  </div>
                </div>

                <div className="border border-black rounded-2xl p-10 bg-white hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                      <Target className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-4xl font-black text-black">{statistics.weeklyHelped}</p>
                      <p className="text-lg font-semibold text-zinc-600">Weekly Impact</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border border-black rounded-2xl p-10 bg-white">
                <div className="flex items-center gap-4 mb-8">
                  <BarChart3 className="h-8 w-8 text-black" />
                  <h3 className="text-2xl font-bold text-black">Performance Analytics</h3>
                </div>
                
                <div className="space-y-8">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-medium text-black">Expert Resolution Rate</span>
                    <span className="text-2xl font-black text-black">
                      {statistics.totalDoubts > 0 
                        ? Math.round((statistics.totalSolved / statistics.totalDoubts) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-200 rounded-full h-4">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-4 rounded-full transition-all duration-500 shadow-lg"
                      style={{ 
                        width: `${statistics.totalDoubts > 0 
                          ? Math.round((statistics.totalSolved / statistics.totalDoubts) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="border border-black rounded-2xl p-10 bg-white">
                <div className="flex items-center gap-4 mb-6">
                  <Zap className="h-8 w-8 text-black" />
                  <h3 className="text-2xl font-bold text-black">Impact Statement</h3>
                </div>
                <div className="text-center py-8">
                  <p className="text-3xl font-black text-black mb-4">
                    You helped <span className="text-green-600">{statistics.weeklyHelped}</span> students this week!
                  </p>
                  <p className="text-xl text-zinc-600">
                    Keep making a difference in your students' learning journey.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
