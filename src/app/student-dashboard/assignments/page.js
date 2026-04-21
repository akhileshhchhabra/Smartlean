'use client';

import { useState, useEffect } from 'react';
import { Calendar, FileText, Clock, AlertCircle, Send, Plus, X, Trophy, Check } from 'lucide-react'; // ✅ Fix 1: Added X and Trophy imports
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, arrayUnion, serverTimestamp, addDoc } from 'firebase/firestore';

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [hasEnrollments, setHasEnrollments] = useState(false);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [answers, setAnswers] = useState({});

  // Fetch user data and enrolled courses
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch enrollments from enrollments collection
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('studentId', '==', user.uid)
        );
        
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        const enrolledCourseIds = enrollmentsSnapshot.docs.map(doc => doc.data().courseId);
        
        console.log("Enrolled IDs:", enrolledCourseIds);
        
        if (enrolledCourseIds.length === 0) {
          console.log("Student is not enrolled in any courses");
          setHasEnrollments(false);
          setLoading(false);
          return;
        }

        setHasEnrollments(true);

        // Fetch assignments for enrolled courses
        console.log("Fetching assignments for enrolled courses:", enrolledCourseIds);
        const assignmentsQuery = query(
          collection(db, 'assignments'),
          where('courseId', 'in', enrolledCourseIds)
        );
        
        const querySnapshot = await getDocs(assignmentsQuery);
        const assignmentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log("Fetched Assignments:", assignmentsData);
        setAssignments(assignmentsData);
        console.log("Assignments fetched successfully:", assignmentsData.length);
        
        // Fetch student submissions
        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('studentId', '==', user.uid)
        );
        
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const submissionsData = submissionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setStudentSubmissions(submissionsData);
        console.log("Student submissions fetched:", submissionsData.length);
        
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handle answer input changes
  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionIndex]: value
    }));
  };

  // Submit assignment answers
  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !selectedAssignment.questions) return;

    const user = auth.currentUser;
    if (!user) return;

    // Check if all questions are answered
    const unansweredQuestions = selectedAssignment.questions.filter((_, index) => !answers[index]);
    if (unansweredQuestions.length > 0) {
      alert("Please answer All Questions before submitting.");
      return;
    }

    try {
      // Create submission document with submitted status
      const submissionData = {
        assignmentId: selectedAssignment.id,
        courseId: selectedAssignment.courseId,
        studentId: user.uid,
        studentEmail: user.email,
        studentName: user.displayName || 'Student',
        answers: Object.values(answers), // Convert to array
        submittedAt: serverTimestamp(),
        status: 'submitted',
        teacherFeedback: '',
        teacherStatus: 'pending'
      };

      await addDoc(collection(db, 'submissions'), submissionData);
      console.log("Assignment submitted successfully:", submissionData);

      // Update assignment status
      const assignmentRef = doc(db, 'assignments', selectedAssignment.id);
      await updateDoc(assignmentRef, {
        submissions: arrayUnion({
          studentId: user.uid,
          submittedAt: new Date().toISOString()
        })
      });

      alert("Assignment submitted successfully!");
      setSubmitModal(false);
      setSelectedAssignment(null);
      setAnswers({});
      
      // Refresh assignments to update status
      window.location.reload();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      alert("Failed to submit assignment. Please try again.");
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Get submission status for assignment
  const getSubmissionStatus = (assignmentId) => {
    const submission = studentSubmissions.find(sub => sub.assignmentId === assignmentId);
    if (!submission) return null;
    
    return {
      status: submission.teacherStatus || 'pending',
      feedback: submission.teacherFeedback || '',
      improvementFeedback: submission.improvementFeedback || '',
      marks: submission.marks || 0,
      maxMarks: submission.maxMarks || 10,
      submittedAt: submission.submittedAt
    };
  };

  // Get status badge styling
  const getStatusBadge = (submission) => {
    const status = submission.teacherStatus || 'pending';
    const marks = submission.marks || 0;
    const maxMarks = submission.maxMarks || 10;
    const isHighScore = marks >= (maxMarks * 0.8);
    
    switch (status) {
      case 'reviewed':
        return (
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${isHighScore ? 'bg-green-50' : 'bg-amber-50'}`}>
            <Check className={`w-4 h-4 ${isHighScore ? 'text-green-600' : 'text-amber-600'}`} />
            <span className={`text-sm font-medium ${isHighScore ? 'text-green-700' : 'text-amber-700'}`}>
              Reviewed: {marks}/{maxMarks}
            </span>
          </div>
        );
      case 'submitted':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg">
            <Send className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Submitted</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-lg">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Pending</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
        <div className="text-zinc-500 font-medium">Loading assignments...</div>
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
              My Assignments
            </h1>
            <p className="text-zinc-500 mt-1">Complete and submit your course assignments.</p>
          </div>
        </div>

        {/* Assignments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {assignments.map((assignment) => {
            const submissionStatus = getSubmissionStatus(assignment.id);
            const isSubmitted = !!submissionStatus;
            const isReviewed = submissionStatus?.status === 'reviewed';
            
            return (
              <div 
                key={assignment.id} 
                className={`group bg-white rounded-[2.5rem] border ${isReviewed ? 'border-green-200' : isSubmitted ? 'border-blue-200' : 'border-zinc-100'} p-6 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 transition-all duration-300`}
              >
                {/* Assignment Content */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[#1D1D1F] leading-snug group-hover:text-blue-600 transition-colors">
                      {assignment.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      {assignment.questions && assignment.questions.length > 0 ? (
                        <FileText className="w-6 h-6 text-blue-500" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-zinc-500" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-zinc-400 font-bold">
                    <Calendar className="w-4 h-4" />
                    Due: {formatDate(assignment.dueDate)}
                  </div>

                  {/* Status Indicators */}
                  {submissionStatus && (
                    <div className="space-y-3">
                      {getStatusBadge(submissionStatus)}
                      
                      {/* Success Mode - Submitted but not reviewed */}
                      {isSubmitted && !isReviewed && (
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                          <p className="text-sm font-medium text-blue-700 mb-2">Waiting for Teacher's Review</p>
                          <p className="text-xs text-blue-600">Your assignment has been submitted and is currently being reviewed by your teacher.</p>
                        </div>
                      )}

                      {/* Answer Preview */}
                      {isSubmitted && !isReviewed && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-zinc-700">Your Answers:</p>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {assignment.questions.map((_, index) => (
                              <div key={index} className="bg-zinc-50 p-2 rounded-lg">
                                <p className="text-xs font-medium text-zinc-600">Question {index + 1}:</p>
                                <p className="text-xs text-zinc-500 truncate">
                                  {answers[index] || 'Not answered'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reviewed Status */}
                  {isReviewed && (
                    <div className="space-y-3">
                      {getStatusBadge(submissionStatus)}
                      
                      {/* Marks Display */}
                      {submissionStatus.marks > 0 && (
                        <div className={`p-3 rounded-xl ${submissionStatus.marks >= (submissionStatus.maxMarks * 0.8) ? 'bg-green-50' : 'bg-amber-50'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-zinc-700">Your Score:</span>
                            <span className={`text-lg font-bold ${submissionStatus.marks >= (submissionStatus.maxMarks * 0.8) ? 'text-green-600' : 'text-amber-600'}`}>
                              {submissionStatus.marks}/{submissionStatus.maxMarks}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Premium Feedback Note */}
                      <div id={`feedback-${assignment.id}`} className="hidden space-y-3">
                        <div className="bg-gradient-to-r from-green-50 to-amber-50 rounded-xl p-4 border border-green-100">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                            <h4 className="text-lg font-semibold text-[#1D1D1F] font-['Syne']">Teacher's Feedback</h4>
                          </div>
                          
                          {/* Marks Display */}
                          {submissionStatus.marks > 0 && (
                            <div className="bg-white rounded-lg p-3 mb-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-zinc-700">Your Score:</span>
                                <span className={`text-lg font-bold ${submissionStatus.marks >= (submissionStatus.maxMarks * 0.8) ? 'text-green-600' : 'text-amber-600'}`}>
                                  {submissionStatus.marks}/{submissionStatus.maxMarks}
                                </span>
                              </div>
                            </div>
                          )}
                          
                          {/* Improvement Notes */}
                          {submissionStatus.improvementFeedback && (
                            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                              <p className="text-sm font-medium text-amber-700 mb-1">Areas for Improvement:</p>
                              <p className="text-sm text-zinc-600">{submissionStatus.improvementFeedback}</p>
                            </div>
                          )}
                          
                          {/* General Feedback */}
                          {submissionStatus.feedback && (
                            <div className="bg-white rounded-lg p-3">
                              <p className="text-sm font-medium text-zinc-700 mb-1">Teacher Comments:</p>
                              <p className="text-sm text-zinc-600">{submissionStatus.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Info */}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                    <div className="flex items-center gap-4 text-xs text-zinc-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {assignment.status || 'active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isReviewed && (
                        <button 
                          onClick={() => {
                            // Show feedback modal or expand feedback section
                            const feedbackSection = document.getElementById(`feedback-${assignment.id}`);
                            if (feedbackSection) {
                              feedbackSection.classList.toggle('hidden');
                            }
                          }}
                          className="flex items-center gap-1 text-sm font-semibold text-green-600 bg-green-50 hover:bg-green-100 px-3 py-2 rounded-xl transition-all"
                        >
                          <FileText className="w-4 h-4" /> View Teacher Feedback
                        </button>
                      )}
                      {!isSubmitted && (
                        <button 
                          onClick={() => {
                            setSelectedAssignment(assignment);
                            // Initialize answers state with empty values
                            const initialAnswers = {};
                            assignment.questions.forEach((_, index) => {
                              initialAnswers[index] = '';
                            });
                            setAnswers(initialAnswers);
                            setSubmitModal(true);
                          }}
                          className="flex items-center gap-1 text-sm font-semibold text-white bg-[#1D1D1F] hover:bg-zinc-800 px-3 py-2 rounded-xl transition-all"
                        >
                          <Plus className="w-4 h-4" /> Submit Assignment
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {assignments.length === 0 && (
          <div className="bg-white rounded-3xl border border-zinc-100 p-16 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#1D1D1F] mb-4">
              {!hasEnrollments ? "No courses enrolled yet" : "No assignments found"}
            </h3>
            <p className="text-zinc-500 mb-6">
              {!hasEnrollments 
                ? "You are not enrolled in any courses yet. Enroll in a course to see assignments."
                : "No assignments found for your courses."
              }
            </p>
          </div>
        )}

        {/* Assignment Submission Modal */}
        {submitModal && selectedAssignment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setSubmitModal(false)} />
            
            <div className="bg-white w-full max-w-4xl p-16 rounded-3xl shadow-xl relative z-[101] overflow-y-auto max-h-[90vh]">
              <button onClick={() => setSubmitModal(false)} className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-all">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
              
              <h2 className="text-3xl font-bold text-[#1D1D1F] font-['Syne'] mb-2">Submit Assignment</h2>
              <p className="text-zinc-500 mb-8">Answer all questions and submit your assignment.</p>
              
              {/* ✅ Fix 3: Correct JSX structure inside .map() — everything wrapped in one parent div */}
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {selectedAssignment.questions.map((question, index) => (
                  <div key={index} className="space-y-4">
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-zinc-700 min-w-[80px]">
                        Question {index + 1}:
                      </span>
                      <span className="text-sm text-zinc-600 flex-1">
                        {question.q}
                      </span>
                    </div>
                  
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Your Answer</label>
                      <textarea
                        value={answers[index] || ''}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 resize-none h-24"
                        placeholder={`Type your answer for Question ${index + 1}...`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 pt-6">
                <button 
                  onClick={() => setSubmitModal(false)}
                  className="flex-1 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitAssignment}
                  className="flex-1 py-3 bg-black text-white rounded-xl font-medium hover:bg-zinc-800 transition-all"
                >
                  <Send className="w-4 h-4 inline mr-2" /> Submit Assignment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}