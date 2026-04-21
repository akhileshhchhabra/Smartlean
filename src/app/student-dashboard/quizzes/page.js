'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, Send, Plus, CheckCircle, Clock, User, Trophy, Target } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [takeQuizModal, setTakeQuizModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(null);

  // New quiz form state
  const [newQuiz, setNewQuiz] = useState({
    title: '',
    receiverEmail: '',
    questions: [
      { question: '', options: ['', '', '', ''], correctAnswer: 0 }
    ]
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        setUserEmail(user.email);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchQuizzes = async () => {
      if (!userEmail) return;

      try {
        const quizzesQuery = query(
          collection(db, 'peer_quizzes'),
          where('receiverEmail', '==', userEmail)
        );
        
        const querySnapshot = await getDocs(quizzesQuery);
        const quizzesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setQuizzes(quizzesData);
      } catch (error) {
        console.error('Error fetching quizzes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, [userEmail]);

  const handleCreateQuiz = async () => {
    if (!newQuiz.title.trim() || !newQuiz.receiverEmail.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate questions
    const validQuestions = newQuiz.questions.filter(q => 
      q.question.trim() && q.options.every(opt => opt.trim()) && q.correctAnswer >= 0 && q.correctAnswer < 4
    );

    if (validQuestions.length === 0) {
      alert('Please add at least one complete question');
      return;
    }

    try {
      const user = auth.currentUser;
      await addDoc(collection(db, 'peer_quizzes'), {
        title: newQuiz.title,
        senderEmail: user.email,
        receiverEmail: newQuiz.receiverEmail,
        questions: validQuestions,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      setCreateModal(false);
      setNewQuiz({
        title: '',
        receiverEmail: '',
        questions: [
          { question: '', options: ['', '', '', ''], correctAnswer: 0 }
        ]
      });
      alert('Quiz sent successfully!');
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Failed to create quiz. Please try again.');
    }
  };

  const handleAddQuestion = () => {
    setNewQuiz(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { question: '', options: ['', '', '', ''], correctAnswer: 0 }
      ]
    }));
  };

  const handleUpdateQuestion = (index, field, value) => {
    setNewQuiz(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const handleTakeQuiz = (quiz) => {
    setSelectedQuiz(quiz);
    setCurrentQuestionIndex(0);
    setAnswers(new Array(quiz.questions.length).fill(null));
    setScore(null);
    setTakeQuizModal(true);
  };

  const handleAnswerSelect = (answerIndex) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < selectedQuiz.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Calculate score
      let correctCount = 0;
      selectedQuiz.questions.forEach((question, index) => {
        if (answers[index] === question.correctAnswer) {
          correctCount++;
        }
      });
      const finalScore = Math.round((correctCount / selectedQuiz.questions.length) * 100);
      setScore(finalScore);

      // Update quiz status
      try {
        const quizRef = doc(db, 'peer_quizzes', selectedQuiz.id);
        updateDoc(quizRef, {
          status: 'completed',
          score: finalScore,
          completedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error updating quiz status:', error);
      }
    }
  };

  const getStatusBadge = (status, score) => {
    if (status === 'completed') {
      return (
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-700">Score: {score}%</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-lg">
        <Clock className="w-4 h-4 text-yellow-600" />
        <span className="text-sm font-medium text-yellow-700">Pending</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-500">Loading quizzes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-tight">
            Peer Quizzes
          </h1>
          <p className="text-zinc-500 mt-1">Challenge your friends with custom quizzes</p>
        </div>
        
        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D1D1F] text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Quiz
        </button>
      </div>

      {/* Quizzes Grid */}
      {quizzes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-2xl border border-zinc-100 p-6 shadow-sm hover:shadow-lg transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-purple-600" />
                </div>
                {getStatusBadge(quiz.status, quiz.score)}
              </div>

              <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">{quiz.title}</h3>
              <p className="text-sm text-zinc-500 mb-4">From: {quiz.senderEmail}</p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Target className="w-4 h-4" />
                  <span>{quiz.questions?.length || 0} Questions</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Clock className="w-4 h-4" />
                  <span>Created: {quiz.createdAt?.toDate ? quiz.createdAt.toDate().toLocaleDateString() : 'Recent'}</span>
                </div>
              </div>

              {quiz.status === 'pending' ? (
                <button
                  onClick={() => handleTakeQuiz(quiz)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#1D1D1F] text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all"
                >
                  <Target className="w-4 h-4" /> Take Quiz
                </button>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-3 bg-green-50 text-green-700 rounded-xl font-semibold">
                  <Trophy className="w-4 h-4" /> Completed
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center">
          <div className="w-16 h-16 bg-[#F5F5F7] rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-8 h-8 text-zinc-400" />
          </div>
          <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">No Quizzes</h3>
          <p className="text-zinc-500 mb-6">No quizzes sent to you yet. Create one to challenge a friend!</p>
          <button
            onClick={() => setCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#1D1D1F] text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all mx-auto"
          >
            <Plus className="w-5 h-5" /> Create Quiz
          </button>
        </div>
      )}

      {/* Create Quiz Modal */}
      {createModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-[#1D1D1F] mb-4">Create Peer Quiz</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Quiz Title</label>
                <input
                  type="text"
                  value={newQuiz.title}
                  onChange={(e) => setNewQuiz(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter quiz title..."
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Send to (Email)</label>
                <input
                  type="email"
                  value={newQuiz.receiverEmail}
                  onChange={(e) => setNewQuiz(prev => ({ ...prev, receiverEmail: e.target.value }))}
                  placeholder="friend@example.com"
                  className="w-full p-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-medium text-zinc-700">Questions</label>
                  <button
                    onClick={handleAddQuestion}
                    className="flex items-center gap-1 px-3 py-1 bg-[#1D1D1F] text-white rounded-lg text-sm"
                  >
                    <Plus className="w-3 h-3" /> Add Question
                  </button>
                </div>

                {newQuiz.questions.map((question, qIndex) => (
                  <div key={qIndex} className="bg-[#F5F5F7] rounded-xl p-4 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-sm font-medium text-zinc-700">Question {qIndex + 1}</span>
                    </div>
                    
                    <input
                      type="text"
                      value={question.question}
                      onChange={(e) => handleUpdateQuestion(qIndex, 'question', e.target.value)}
                      placeholder="Enter question..."
                      className="w-full p-2 border border-zinc-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-black/5"
                    />
                    
                    <div className="space-y-2">
                      {question.options.map((option, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${qIndex}`}
                            checked={question.correctAnswer === oIndex}
                            onChange={() => handleUpdateQuestion(qIndex, 'correctAnswer', oIndex)}
                            className="w-4 h-4"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...question.options];
                              newOptions[oIndex] = e.target.value;
                              handleUpdateQuestion(qIndex, 'options', newOptions);
                            }}
                            placeholder={`Option ${oIndex + 1}`}
                            className="flex-1 p-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                          />
                          {question.correctAnswer === oIndex && (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setCreateModal(false)}
                  className="flex-1 py-3 bg-[#F5F5F7] text-[#1D1D1F] rounded-xl font-semibold hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateQuiz}
                  className="flex-1 py-3 bg-[#1D1D1F] text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all"
                >
                  <Send className="w-4 h-4 inline mr-2" /> Send Quiz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Take Quiz Modal */}
      {takeQuizModal && selectedQuiz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            {score !== null ? (
              // Results Screen
              <div className="text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-[#1D1D1F] mb-2">Quiz Completed!</h3>
                <p className="text-lg text-zinc-600 mb-6">Your Score: {score}%</p>
                <button
                  onClick={() => setTakeQuizModal(false)}
                  className="w-full py-3 bg-[#1D1D1F] text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all"
                >
                  Close
                </button>
              </div>
            ) : (
              // Quiz Questions
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-[#1D1D1F]">{selectedQuiz.title}</h3>
                  <span className="text-sm text-zinc-500">
                    {currentQuestionIndex + 1} / {selectedQuiz.questions.length}
                  </span>
                </div>
                
                <div className="mb-6">
                  <p className="text-base font-medium text-[#1D1D1F] mb-4">
                    {selectedQuiz.questions[currentQuestionIndex].question}
                  </p>
                  
                  <div className="space-y-3">
                    {selectedQuiz.questions[currentQuestionIndex].options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        className={`w-full p-3 text-left rounded-xl border transition-all ${
                          answers[currentQuestionIndex] === index
                            ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white'
                            : 'border-zinc-200 bg-white hover:border-zinc-300'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={handleNextQuestion}
                  disabled={answers[currentQuestionIndex] === null}
                  className="w-full py-3 bg-[#1D1D1F] text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all disabled:opacity-50"
                >
                  {currentQuestionIndex < selectedQuiz.questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
