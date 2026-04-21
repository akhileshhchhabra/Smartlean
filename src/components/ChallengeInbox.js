'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, query, collection, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Play, Clock, BookOpen, User, Check, X, AlertCircle } from 'lucide-react';

export default function ChallengeInbox() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Real-time fetch of pending challenges for current user
  useEffect(() => {
    if (!auth.currentUser?.email) return;

    setLoading(true);
    setError('');

    // Listen for challenges where current user is the receiver
    const q = query(
      collection(db, 'challenges'),
      where('receiverEmail', '==', auth.currentUser.email),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const challengeList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('DEBUG: Pending challenges found:', challengeList.length);
        setChallenges(challengeList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching challenges:', err);
        setError('Failed to load challenges. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAcceptChallenge = (challenge) => {
    console.log('DEBUG: Accepting challenge:', challenge.id);
    setSelectedChallenge(challenge);
    setShowQuizModal(true);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);
  };

  const handleAnswerSelect = async (answerIndex) => {
    if (showResult) return; // Prevent changing answer after submission

    setSelectedAnswer(answerIndex);
    const correct = answerIndex === selectedChallenge.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);

    try {
      // Update challenge status to completed
      await updateDoc(doc(db, 'challenges', selectedChallenge.id), {
        status: 'completed',
        completedAt: serverTimestamp(),
        isCorrect: correct,
        receiverAnswer: answerIndex
      });

      console.log('DEBUG: Challenge marked as completed:', selectedChallenge.id);
    } catch (error) {
      console.error('Error updating challenge status:', error);
    }
  };

  const handleCloseModal = () => {
    if (showResult) {
      setShowQuizModal(false);
      setSelectedChallenge(null);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
    }
  };

  const getOptionStyle = (index) => {
    if (!showResult) {
      return selectedAnswer === index
        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
        : 'border-zinc-800 bg-zinc-950 text-zinc-100 hover:bg-zinc-900 cursor-pointer';
    }

    if (index === selectedChallenge.correctAnswer) {
      return 'border-green-500/50 bg-green-500/10 text-green-100';
    }

    if (selectedAnswer === index && !isCorrect) {
      return 'border-red-500/50 bg-red-500/10 text-red-100';
    }

    return 'border-zinc-800 bg-zinc-950 text-zinc-400 opacity-50';
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          <span className="ml-3 text-zinc-400">Loading challenges...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
        <div className="text-center">
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
              <span className="text-2xl"> Inbox</span>
            </div>
          </div>
          <h3 className="font-['Syne'] text-lg font-semibold text-zinc-100 mb-2">
            No Pending Challenges
          </h3>
          <p className="text-sm text-zinc-400">
            You don't have any pending challenges. Check back later or challenge your peers!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-['Syne'] text-2xl font-semibold tracking-tight text-zinc-100">
            My Challenges
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {challenges.length} pending challenge{challenges.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-xs text-zinc-500">Real-time updates</div>
      </div>

      {/* Challenge Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {challenges.map((challenge) => (
          <div key={challenge.id} className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 hover:border-emerald-500/50 transition-all duration-200">
            {/* Challenge Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                    PEER CHALLENGE
                  </span>
                  <div className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="h-3 w-3" />
                    <span>Quick Challenge</span>
                  </div>
                </div>
                
                <h3 className="font-['Syne'] text-lg font-semibold text-zinc-100 mb-1">
                  {challenge.question?.substring(0, 50)}...
                </h3>
                
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>{challenge.senderName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{challenge.courseTitle || 'Course'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Challenge Preview */}
            <div className="mb-4 p-3 rounded-2xl border border-zinc-800 bg-zinc-900/50">
              <p className="text-sm text-zinc-300 line-clamp-2">
                {challenge.question}
              </p>
            </div>

            {/* Accept Button */}
            <button
              onClick={() => handleAcceptChallenge(challenge)}
              className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-3 transition-colors flex items-center justify-center gap-2"
            >
              <Play className="h-4 w-4" />
              Accept Challenge
            </button>
          </div>
        ))}
      </div>

      {/* Quiz Modal */}
      {showQuizModal && selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/20 p-3">
                  <span className="text-lg font-bold text-emerald-300">?</span>
                </div>
                <div>
                  <h3 className="font-['Syne'] text-lg font-semibold tracking-tight text-zinc-100">
                    Peer Challenge
                  </h3>
                  <p className="text-sm text-emerald-100/90">
                    From {selectedChallenge.senderName}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={!showResult}
                className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  showResult
                    ? 'border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              {/* Course Info */}
              <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Course</p>
                    <p className="mt-1 font-semibold text-zinc-100">
                      {selectedChallenge.courseTitle || 'Course'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Challenge</p>
                    <p className="mt-1 font-semibold text-zinc-100">
                      Quick Quiz
                    </p>
                  </div>
                </div>
              </div>

              {/* Question */}
              <div className="mb-8">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Question</div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
                  <p className="text-lg font-medium text-zinc-100 leading-relaxed">
                    {selectedChallenge.question}
                  </p>
                </div>
              </div>

              {/* Answer Options */}
              <div className="mb-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Choose Your Answer</div>
                <div className="space-y-3">
                  {selectedChallenge.options?.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      disabled={showResult}
                      className={`w-full rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition-all duration-300 ${getOptionStyle(index)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                            showResult
                              ? index === selectedChallenge.correctAnswer
                                ? 'border-green-500 bg-green-500'
                                : selectedAnswer === index && !isCorrect
                                ? 'border-red-500 bg-red-500'
                                : 'border-zinc-600 bg-zinc-800'
                              : selectedAnswer === index
                              ? 'border-emerald-500 bg-emerald-500'
                              : 'border-zinc-600'
                          }`}>
                            {showResult && index === selectedChallenge.correctAnswer && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                            {showResult && selectedAnswer === index && !isCorrect && (
                              <X className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span>Option {String.fromCharCode(65 + index)}</span>
                        </div>
                        <span className="flex-1 text-right">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Result Message */}
              {showResult && (
                <div className={`rounded-2xl border p-4 ${
                  isCorrect
                    ? 'border-green-500/30 bg-green-500/10'
                    : 'border-red-500/30 bg-red-500/10'
                }`}>
                  <div className="flex items-center gap-3">
                    {isCorrect ? (
                      <Check className="h-5 w-5 text-green-300" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-300" />
                    )}
                    <div>
                      <p className={`font-semibold ${
                        isCorrect ? 'text-green-300' : 'text-red-300'
                      }`}>
                        {isCorrect ? 'Correct! Well done!' : 'Not quite right'}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm text-red-200/80 mt-1">
                          The correct answer was: {selectedChallenge.options[selectedChallenge.correctAnswer]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              {!showResult && (
                <div className="text-center text-xs text-zinc-500">
                  Click an option to submit your answer instantly
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
