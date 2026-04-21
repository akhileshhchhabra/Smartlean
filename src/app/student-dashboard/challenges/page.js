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
} from 'firebase/firestore';
import { 
  Plus, Inbox, Play, Clock, Send, RefreshCw, Lock, Check, X, Pencil, Users, History, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';

export default function ChallengesPage() {
  const [activeTab, setActiveTab] = useState('forge');
  const [currentUser, setCurrentUser] = useState(null);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [peers, setPeers] = useState([]);
  const [incomingChallenges, setIncomingChallenges] = useState([]);
  const [submissionsHistory, setSubmissionsHistory] = useState([]);
  const [creationsHistory, setCreationsHistory] = useState([]);
  const [groupedCreations, setGroupedCreations] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPeer, setSelectedPeer] = useState(null);
  const [challengeCreating, setChallengeCreating] = useState(false);
  const [challengeError, setChallengeError] = useState('');
  const [questions, setQuestions] = useState([
    { question: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);
  const [activeDuel, setActiveDuel] = useState(null);
  const [duelAnswer, setDuelAnswer] = useState(null);
  const [duelResult, setDuelResult] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [completedDuels, setCompletedDuels] = useState(new Set());
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const enrollmentsQuery = query(collection(db, 'enrollments'), where('studentId', '==', user.uid));
          const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
          const enrollmentsList = enrollmentsSnapshot.docs.map(doc => doc.data());
          
          if (enrollmentsList.length === 0) {
            setFilteredCourses([]);
            setLoading(false);
            return;
          }

          const courseIds = enrollmentsList.map(enrollment => enrollment.courseId);
          const coursesPromises = courseIds.map(courseId => getDoc(doc(db, 'courses', courseId)));
          const courseDocs = await Promise.all(coursesPromises);
          const coursesData = courseDocs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() }));
          setFilteredCourses(coursesData);
          
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

  useEffect(() => {
    if (!selectedCourse?.id || !currentUser?.uid) return;
    
    const q = query(collection(db, 'enrollments'), where('courseId', '==', selectedCourse.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const peersList = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.studentId !== currentUser.uid) {
          peersList.push({
            id: doc.id,
            email: data.studentEmail,
            uid: data.studentId,
            displayName: data.studentName || data.studentEmail?.split('@')[0],
            avatar: data.studentName?.charAt(0)?.toUpperCase() || 'U',
          });
        }
      });
      setPeers(peersList);
    });
    return () => unsubscribe();
  }, [selectedCourse?.id, currentUser?.uid]);

  useEffect(() => {
    if (!currentUser?.email) return;
    
    const q = query(
      collection(db, 'challenges'),
      where('receiverEmail', '==', currentUser.email),
      where('status', '==', 'pending')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const challengeList = [];
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate();
        if (createdAt && createdAt > twentyFourHoursAgo) {
          challengeList.push({
            id: doc.id,
            ...data,
            timeLeft: calculateTimeLeft(createdAt)
          });
        }
      });
      setIncomingChallenges(challengeList);
    });
    return () => unsubscribe();
  }, [currentUser?.email]);

  useEffect(() => {
    if (!currentUser?.uid) return;
    
    // Fetch submissions (challenges I answered)
    const receivedQuery = query(
      collection(db, 'challenges'),
      where('receiverId', '==', currentUser.uid),
      where('status', 'in', ['completed', 'pending'])
    );
    
    // Fetch creations (challenges I sent) - use senderId instead of senderEmail for better matching
    const sentQuery = query(
      collection(db, 'challenges'),
      where('senderId', '==', currentUser.uid),
      where('status', 'in', ['completed', 'pending'])
    );
    
    const unsubscribeReceived = onSnapshot(receivedQuery, (snapshot) => {
      const receivedChallenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSubmissionsHistory(receivedChallenges);
    });
    
    const unsubscribeSent = onSnapshot(sentQuery, (snapshot) => {
      const sentChallenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Creations fetched:', sentChallenges.length);
      setCreationsHistory(sentChallenges);
    });
    
    return () => {
      unsubscribeReceived();
      unsubscribeSent();
    };
  }, [currentUser?.uid]);

  // Smart grouping for My Creations
  useEffect(() => {
    if (!creationsHistory.length) {
      setGroupedCreations([]);
      return;
    }

    // Group by question text to show each question only once
    const questionMap = new Map();
    
    creationsHistory.forEach(challenge => {
      const questionText = challenge.question;
      if (!questionText || !questionMap.has(questionText)) {
        // Check if this was sent to multiple people (likely "Send to All")
        const relatedChallenges = creationsHistory.filter(c => c.question === questionText);
        const totalRecipients = relatedChallenges.length;
        const isGroupChallenge = totalRecipients > 1;
        
        // Get all options and correct answer from the first challenge
        const firstChallenge = relatedChallenges[0];
        
        questionMap.set(questionText, {
          id: challenge.id,
          question: questionText || 'Untitled Question',
          options: firstChallenge.options || [],
          correctAnswer: firstChallenge.correctAnswer || 0,
          createdAt: challenge.createdAt,
          isGroupChallenge,
          recipients: isGroupChallenge ? `Broadcasted (${totalRecipients} recipients)` : (challenge.receiverName || 'Unknown'),
          status: challenge.status || 'pending'
        });
      }
    });
    
    const grouped = Array.from(questionMap.values()).sort((a, b) => {
      const timeA = a.createdAt?.toDate?.() || new Date(0);
      const timeB = b.createdAt?.toDate?.() || new Date(0);
      return timeB - timeA;
    });
    
    setGroupedCreations(grouped);
  }, [creationsHistory]);

  const calculateTimeLeft = (createdAt) => {
    if (!createdAt) return null;
    const now = new Date();
    const created = createdAt instanceof Date ? createdAt : createdAt.toDate();
    const hoursDiff = (now - created) / (1000 * 60 * 60);
    return Math.max(0, 24 - hoursDiff);
  };

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
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  }, []);

  const awardPoints = useCallback(async (amount, reason = 'general') => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { points: increment(amount) });
      setUserPoints(prev => prev + amount);
      
      // Add notification based on reason and amount
      if (reason === 'correct_answer') {
        addNotification('success', 'Brilliant! +5 Points added', 5);
      } else if (reason === 'wrong_answer') {
        addNotification('error', 'Wrong Answer! -1 Point deducted', -1);
      } else if (reason === 'forge') {
        addNotification('info', `Challenge sent! +${amount} Points added`, amount);
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  }, [currentUser, addNotification]);

  const handleOptionChange = useCallback((questionIndex, optionIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].options[optionIndex] = value;
    setQuestions(newQuestions);
  }, [questions]);

  const handleQuestionChange = useCallback((index, value) => {
    const newQuestions = [...questions];
    newQuestions[index].question = value;
    setQuestions(newQuestions);
  }, [questions]);

  const handleCorrectAnswerChange = useCallback((questionIndex, answerIndex) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].correctAnswer = answerIndex;
    setQuestions(newQuestions);
  }, [questions]);

  const addQuestion = useCallback(() => {
    setQuestions(prev => [...prev, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  }, []);

  const removeQuestion = useCallback((index) => {
    if (questions.length > 1) {
      setQuestions(prev => prev.filter((_, i) => i !== index));
    }
  }, [questions]);

  const handleCreateChallenge = useCallback(async () => {
    if (!currentUser || !selectedCourse || !selectedPeer) {
      setChallengeError('Please select a course and peer');
      return;
    }

    // Validate all questions
    const validQuestions = questions.filter(q => {
      const trimmedQuestion = q.question.trim();
      const trimmedOptions = q.options.map(opt => opt.trim());
      return trimmedQuestion && trimmedOptions.every(opt => opt);
    });

    if (validQuestions.length === 0) {
      setChallengeError('Please add at least one complete question');
      return;
    }
    
    setChallengeCreating(true);
    setChallengeError('');

    try {
      const senderName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Student';
      const allChallengePromises = [];

      if (selectedPeer.id === 'all') {
        // Send to All - loop through every peer and every question
        peers.forEach(peer => {
          validQuestions.forEach(questionData => {
            const challengeDoc = {
              senderId: currentUser.uid,
              senderEmail: currentUser.email,
              senderName,
              courseId: selectedCourse.id,
              courseTitle: selectedCourse.title || selectedCourse.courseName || 'Course',
              question: questionData.question.trim(),
              options: questionData.options.map(opt => opt.trim()),
              correctAnswer: questionData.correctAnswer,
              status: 'pending',
              createdAt: serverTimestamp(),
              type: 'peer',
              receiverId: peer.uid,
              receiverEmail: peer.email,
              receiverName: peer.displayName
            };
            allChallengePromises.push(addDoc(collection(db, 'challenges'), challengeDoc));
          });
        });
      } else {
        // Send to individual peer - loop through every question
        validQuestions.forEach(questionData => {
          const challengeDoc = {
            senderId: currentUser.uid,
            senderEmail: currentUser.email,
            senderName,
            courseId: selectedCourse.id,
            courseTitle: selectedCourse.title || selectedCourse.courseName || 'Course',
            question: questionData.question.trim(),
            options: questionData.options.map(opt => opt.trim()),
            correctAnswer: questionData.correctAnswer,
            status: 'pending',
            createdAt: serverTimestamp(),
            type: 'peer',
            receiverId: selectedPeer.uid || selectedPeer.id,
            receiverEmail: selectedPeer.email,
            receiverName: selectedPeer.displayName
          };
          allChallengePromises.push(addDoc(collection(db, 'challenges'), challengeDoc));
        });
      }

      await Promise.all(allChallengePromises);
      await awardPoints(validQuestions.length, 'forge'); // Award points for each question created
      resetChallengeForm();
    } catch (error) {
      setChallengeError(error?.message || 'Failed to create challenges');
    } finally {
      setChallengeCreating(false);
    }
  }, [currentUser, selectedCourse, selectedPeer, peers, questions, awardPoints]);

  const handleDuelAnswer = useCallback(async (answerIndex) => {
    if (isRevealed) return;
    const isCorrect = answerIndex === activeDuel.correctAnswer;
    setDuelAnswer(answerIndex);
    setIsRevealed(true);
    setDuelResult({ isCorrect, correctAnswer: activeDuel.correctAnswer });
  }, [activeDuel]);

  const handleDoneChallenge = useCallback(async () => {
    if (!activeDuel || !duelResult) return;
    try {
      await updateDoc(doc(db, 'challenges', activeDuel.id), {
        status: 'completed',
        completedAt: serverTimestamp(),
        isCorrect: duelResult.isCorrect,
        receiverAnswer: duelAnswer
      });
      
      if (duelResult.isCorrect) {
        await awardPoints(5, 'correct_answer');
      } else {
        await awardPoints(-1, 'wrong_answer');
      }
      
      setCompletedDuels(prev => new Set([...prev, activeDuel.id]));
      setActiveDuel(null);
      setDuelAnswer(null);
      setDuelResult(null);
      setIsRevealed(false);
    } catch (error) {
      console.error('Error completing challenge:', error);
    }
  }, [activeDuel, duelResult, duelAnswer, awardPoints]);

  const resetChallengeForm = useCallback(() => {
    setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
    setSelectedPeer(null);
    setChallengeError('');
  }, []);

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
            {notification.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {notification.type === 'error' && <XCircle className="h-5 w-5" />}
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

      <div className="max-w-5xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-5xl font-black text-black mb-4">Challenge Center</h1>
          <p className="text-black text-xl">Create challenges, solve duels, and track your performance.</p>
        </div>

        {/* 4-Tab Navigation */}
        <div className="mb-16">
          <div className="p-2 border border-zinc-200 rounded-full bg-zinc-50 inline-flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('forge')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'forge'
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-black border border-transparent hover:bg-zinc-100'
              }`}
            >
              <Plus className="h-4 w-4" />
              Forge
            </button>
            <button
              onClick={() => setActiveTab('incoming')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'incoming'
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-black border border-transparent hover:bg-zinc-100'
              }`}
            >
              <Inbox className="h-4 w-4" />
              Incoming
            </button>
            <button
              onClick={() => setActiveTab('submissions')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'submissions'
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-black border border-transparent hover:bg-zinc-100'
              }`}
            >
              <History className="h-4 w-4" />
              My Submissions
            </button>
            <button
              onClick={() => setActiveTab('creations')}
              className={`px-8 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'creations'
                  ? 'bg-black text-white shadow-lg shadow-black/20'
                  : 'bg-white text-black border border-transparent hover:bg-zinc-100'
              }`}
            >
              <Pencil className="h-4 w-4" />
              My Creations
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-10">
          
          {/* Tab 1: Forge */}
          {activeTab === 'forge' && (
            <div className="space-y-12">
              <div className="flex items-center gap-4 mb-8">
                <Pencil className="h-6 w-6 text-black" />
                <h2 className="text-3xl font-bold text-black">Forge Challenges</h2>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-black mb-4">Select Course</label>
                <select
                  value={selectedCourse?.id || ''}
                  onChange={(e) => {
                    const course = filteredCourses.find(c => c.id === e.target.value);
                    setSelectedCourse(course);
                    setSelectedPeer(null);
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-6 py-4 text-black focus:border-black focus:outline-none"
                  autoFocus
                >
                  <option value="">Select a course...</option>
                  {filteredCourses.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.title || course.courseName || course.id}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCourse && (
                <div className="mb-8">
                  <label className="block text-sm font-semibold text-black mb-6">Select Peer</label>
                  {peers.length === 0 ? (
                    <div className="text-center py-12 text-zinc-600">
                      <p>No peers found in this course</p>
                    </div>
                  ) : (
                    <div className="flex gap-6 overflow-x-auto pb-4">
                      <div
                        onClick={() => setSelectedPeer({ id: 'all', displayName: 'All Peers' })}
                        className={`flex-shrink-0 cursor-pointer transition-all duration-200 ${
                          selectedPeer?.id === 'all' ? 'ring-4 ring-black ring-offset-4' : ''
                        }`}
                      >
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-black to-gray-700 flex items-center justify-center text-white font-bold mb-3 shadow-lg border-4 border-black">
                          <Users className="h-10 w-10" />
                        </div>
                        <p className="text-sm text-center text-black font-bold">Send to All</p>
                      </div>
                      
                      {peers.map(peer => (
                        <div
                          key={peer.id}
                          onClick={() => setSelectedPeer(peer)}
                          className={`flex-shrink-0 cursor-pointer transition-all duration-200 ${
                            selectedPeer?.id === peer.id ? 'ring-4 ring-black ring-offset-4' : ''
                          }`}
                        >
                          <div className="w-20 h-20 rounded-full bg-black flex items-center justify-center text-white font-bold mb-3 shadow-lg">
                            {peer.avatar}
                          </div>
                          <p className="text-sm text-center text-black font-medium">{peer.displayName}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Multiple Questions Section */}
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-black">Questions</label>
                  <button
                    onClick={addQuestion}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-semibold"
                  >
                    <Plus className="h-4 w-4" />
                    Add Another Question
                  </button>
                </div>

                {questions.map((questionData, questionIndex) => (
                  <div key={questionIndex} className="border border-zinc-200 rounded-xl p-8 bg-white">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-bold text-black">Question {questionIndex + 1}</h3>
                      {questions.length > 1 && (
                        <button
                          onClick={() => removeQuestion(questionIndex)}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-semibold"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-black mb-4">Question Text</label>
                      <textarea
                        value={questionData.question}
                        onChange={(e) => handleQuestionChange(questionIndex, e.target.value)}
                        placeholder="Enter your challenge question..."
                        className="w-full rounded-xl border border-zinc-200 bg-white px-6 py-4 text-black placeholder-zinc-400 focus:border-black focus:outline-none resize-none"
                        rows={4}
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-black mb-4">Answer Options</label>
                      <div className="grid grid-cols-2 gap-6">
                        {questionData.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="space-y-4">
                            <div className="flex items-center gap-4 mb-3">
                              <button
                                onClick={() => handleCorrectAnswerChange(questionIndex, optionIndex)}
                                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                                  questionData.correctAnswer === optionIndex ? 'border-black bg-black' : 'border-zinc-300 bg-zinc-300'
                                }`}
                              >
                                {questionData.correctAnswer === optionIndex && <div className="w-3 h-3 rounded-full bg-white" />}
                              </button>
                              <span className="text-lg font-black text-black">Option {String.fromCharCode(65 + optionIndex)}</span>
                            </div>
                            <textarea
                              value={option}
                              onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}...`}
                              className="w-full rounded-xl border border-zinc-200 bg-white px-6 py-4 text-black placeholder-zinc-400 focus:border-black focus:outline-none resize-none"
                              rows={3}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {challengeError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
                  {challengeError}
                </div>
              )}

              <div className="flex gap-6">
                <button
                  onClick={resetChallengeForm}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-8 py-4 text-black font-semibold hover:bg-zinc-50 transition-all duration-200"
                >
                  <RefreshCw className="h-5 w-5 inline mr-3" />
                  Reset
                </button>
                <button
                  onClick={handleCreateChallenge}
                  disabled={challengeCreating || !selectedCourse || !selectedPeer}
                  className="flex-1 rounded-xl bg-black hover:bg-zinc-800 text-white font-semibold px-8 py-4 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {challengeCreating ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Sending...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <Send className="h-5 w-5" />
                      {selectedPeer?.id === 'all' ? `Send All Questions to All (${peers.length})` : `Send All Questions`}
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Tab 2: Incoming */}
          {activeTab === 'incoming' && (
            <div className="space-y-12">
              <div className="flex items-center gap-4 mb-8">
                <Inbox className="h-6 w-6 text-black" />
                <h2 className="text-3xl font-bold text-black">Incoming Challenges</h2>
              </div>

              {incomingChallenges.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-6">
                    <Inbox className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-4">No Incoming Challenges</h3>
                  <p className="text-zinc-600 text-lg">Create challenges to start earning points!</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {incomingChallenges.map((challenge) => {
                    if (completedDuels.has(challenge.id)) return null;
                    
                    return (
                      <div
                        key={challenge.id}
                        className={`border rounded-xl p-10 transition-all duration-200 ${
                          activeDuel?.id === challenge.id ? 'border-black bg-zinc-50' : 'border-zinc-200 bg-white hover:border-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-8">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white font-bold text-lg">
                              {challenge.senderName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-black text-lg">{challenge.senderName}</p>
                              <p className="text-sm text-zinc-600">
                                {challenge.createdAt?.toDate()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || 'Recent'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-zinc-600">
                            <Clock className="h-5 w-5" />
                            <span className="text-sm">{challenge.timeLeft}h</span>
                          </div>
                        </div>

                        <div className="mb-8">
                          <p className="text-black font-medium text-lg">{challenge.question}</p>
                        </div>

                        {!activeDuel || activeDuel.id !== challenge.id ? (
                          <button
                            onClick={() => setActiveDuel(challenge)}
                            className="w-full rounded-xl bg-black hover:bg-zinc-800 text-white font-semibold px-8 py-4 transition-all duration-200 flex items-center justify-center gap-3"
                          >
                            <Play className="h-5 w-5" />
                            Play
                          </button>
                        ) : (
                          <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                              {challenge.options?.map((option, index) => {
                                const isSelected = duelAnswer === index;
                                const isCorrect = index === challenge.correctAnswer;
                                
                                return (
                                  <button
                                    key={index}
                                    onClick={() => handleDuelAnswer(index)}
                                    disabled={isRevealed}
                                    className={`p-8 rounded-xl border-2 transition-all duration-300 text-left mx-2 ${
                                      isRevealed
                                        ? isCorrect
                                          ? 'border-green-500 bg-green-50 text-green-800 animate-pulse'
                                          : isSelected
                                          ? 'border-red-500 bg-red-50 text-red-800 animate-pulse'
                                          : 'border-zinc-200 bg-zinc-50 text-zinc-600 opacity-50'
                                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-4 mb-4">
                                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                                        isRevealed && isCorrect
                                          ? 'border-green-500 bg-green-500'
                                          : isRevealed && isSelected && !isCorrect
                                          ? 'border-red-500 bg-red-500'
                                          : 'border-zinc-300 bg-zinc-300'
                                      }`}>
                                        {isRevealed && isCorrect && <Check className="h-3 w-3 text-white" />}
                                        {isRevealed && isSelected && !isCorrect && <X className="h-3 w-3 text-white" />}
                                      </div>
                                      <span className="font-semibold text-base">Option {String.fromCharCode(65 + index)}</span>
                                    </div>
                                    <p className="text-base">{option}</p>
                                    
                                    {isRevealed && isCorrect && (
                                      <div className="mt-4 text-green-600 font-bold text-lg">
                                        +5 ?? Points Earned!
                                      </div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {isRevealed && (
                              <div className="mt-8">
                                <button
                                  onClick={handleDoneChallenge}
                                  className="w-full rounded-xl bg-black hover:bg-zinc-800 text-white font-bold px-8 py-6 transition-all duration-200 flex items-center justify-center gap-3 text-lg"
                                >
                                  Done
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: My Submissions */}
          {activeTab === 'submissions' && (
            <div className="space-y-12">
              <div className="flex items-center gap-4 mb-8">
                <History className="h-6 w-6 text-black" />
                <h2 className="text-3xl font-bold text-black">My Submissions</h2>
              </div>

              {submissionsHistory.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-6">
                    <History className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-4">No Submissions Yet</h3>
                  <p className="text-zinc-600 text-lg">Solve incoming challenges to see your submissions here!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {submissionsHistory.map((challenge) => (
                    <div key={challenge.id} className="border border-zinc-200 rounded-xl p-10 bg-white hover:bg-zinc-50 transition-all duration-200">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex-1">
                          <p className="text-lg font-bold text-black mb-2">{challenge.question}</p>
                          <div className="flex items-center gap-4 text-sm text-zinc-600">
                            <span>From: {challenge.senderName}</span>
                            <span>{challenge.createdAt?.toDate()?.toLocaleDateString()}</span>
                          </div>
                        </div>
                        
                        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          challenge.status === 'completed' 
                            ? challenge.isCorrect 
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {challenge.status === 'completed' 
                            ? challenge.isCorrect 
                              ? 'Correct'
                              : 'Incorrect'
                            : 'Pending'
                          }
                        </div>
                      </div>
                      
                      {challenge.status === 'completed' && (
                        <div className="flex items-center gap-2 mb-6">
                          {challenge.isCorrect ? (
                            <>
                              <Check className="h-4 w-4 text-green-600" />
                              <span className="text-green-600 font-semibold">+5 Points Earned</span>
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 text-red-600" />
                              <span className="text-red-600">No Points</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Always Visible Answer Options */}
                      <div className="mt-6">
                        <h4 className="font-bold text-black mb-4">Answer Options:</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {challenge.options?.map((option, index) => {
                            const isCorrect = index === challenge.correctAnswer;
                            const userAnswer = challenge.receiverAnswer;
                            const isSelected = userAnswer === index;
                            
                            return (
                              <div
                                key={index}
                                className={`p-4 rounded-xl border-2 ${
                                  isCorrect
                                    ? 'border-green-500 bg-green-50'
                                    : isSelected && !isCorrect
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-zinc-200 bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-3 mb-2">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isCorrect
                                      ? 'border-green-500 bg-green-500'
                                      : isSelected && !isCorrect
                                      ? 'border-red-500 bg-red-500'
                                      : 'border-zinc-300 bg-zinc-300'
                                  }`}>
                                    {isCorrect && <Check className="h-3 w-3 text-white" />}
                                    {isSelected && !isCorrect && <X className="h-3 w-3 text-white" />}
                                  </div>
                                  <span className="font-semibold text-sm">Option {String.fromCharCode(65 + index)}</span>
                                  {isCorrect && <span className="text-green-600 text-xs font-semibold">(Correct)</span>}
                                  {isSelected && !isCorrect && <span className="text-red-600 text-xs font-semibold">(Your Answer)</span>}
                                </div>
                                <p className="text-sm">{option}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: My Creations */}
          {activeTab === 'creations' && (
            <div className="space-y-12">
              <div className="flex items-center gap-4 mb-8">
                <Pencil className="h-6 w-6 text-black" />
                <h2 className="text-3xl font-bold text-black">My Creations</h2>
              </div>

              {groupedCreations.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-6">
                    <Pencil className="h-10 w-10 text-zinc-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-black mb-4">No Creations Yet</h3>
                  <p className="text-zinc-600 text-lg">Create challenges to see your creations here!</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedCreations.map((creation) => (
                    <div key={creation.id} className="border border-zinc-200 rounded-xl p-10 bg-white hover:bg-zinc-50 transition-all duration-200">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex-1">
                          <p className="text-lg font-bold text-black mb-2">{creation.question}</p>
                          <div className="flex items-center gap-4 text-sm text-zinc-600 mb-3">
                            <span>{creation.createdAt?.toDate()?.toLocaleDateString()}</span>
                          </div>
                          
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                            creation.isGroupChallenge
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-purple-100 text-purple-800 border border-purple-200'
                          }`}>
                            {creation.isGroupChallenge ? (
                              <>
                                <Users className="h-3 w-3" />
                                {creation.recipients}
                              </>
                            ) : (
                              <>
                                <Send className="h-3 w-3" />
                                {creation.recipients}
                              </>
                            )}
                          </div>
                        </div>
                        
                        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                          creation.status === 'completed' 
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {creation.status === 'completed' ? 'Completed' : 'Pending'}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-4">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-semibold">+1 Point Earned</span>
                      </div>

                      {/* Always Visible Answer Options */}
                      <div className="mt-6">
                        <h4 className="font-bold text-black mb-4">Answer Options:</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {creation.options && creation.options.length > 0 ? (
                            creation.options.map((option, index) => {
                              const isCorrect = index === creation.correctAnswer;
                              
                              return (
                                <div
                                  key={index}
                                  className={`p-4 rounded-xl border-2 ${
                                    isCorrect
                                      ? 'border-green-500 bg-green-50'
                                      : 'border-zinc-200 bg-white'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                      isCorrect ? 'border-green-500 bg-green-500' : 'border-zinc-300 bg-zinc-300'
                                    }`}>
                                      {isCorrect && <Check className="h-3 w-3 text-white" />}
                                    </div>
                                    <span className="font-semibold text-sm">Option {String.fromCharCode(65 + index)}</span>
                                    {isCorrect && <span className="text-green-600 text-xs font-semibold">(Correct)</span>}
                                  </div>
                                  <p className="text-sm">{option}</p>
                                </div>
                              );
                            })
                          ) : (
                            <div className="col-span-2 text-center text-zinc-500 py-8">
                              No options available
                            </div>
                          )}
                        </div>
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