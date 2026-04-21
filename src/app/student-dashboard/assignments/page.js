'use client';

import { useState, useEffect } from 'react';
import { Calendar, FileText, Clock, AlertCircle, Send, Plus, X, Check, ChevronDown, ChevronUp, Star, MessageSquare } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, serverTimestamp, addDoc } from 'firebase/firestore';

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [hasEnrollments, setHasEnrollments] = useState(false);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitModal, setSubmitModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [answers, setAnswers] = useState({});
  const [expandedFeedback, setExpandedFeedback] = useState({});

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('studentId', '==', user.uid)
        );
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        const enrolledCourseIds = enrollmentsSnapshot.docs.map(doc => doc.data().courseId);

        if (enrolledCourseIds.length === 0) {
          setHasEnrollments(false);
          setLoading(false);
          return;
        }

        setHasEnrollments(true);

        const assignmentsQuery = query(
          collection(db, 'assignments'),
          where('courseId', 'in', enrolledCourseIds)
        );
        const querySnapshot = await getDocs(assignmentsQuery);
        const assignmentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAssignments(assignmentsData);

        const submissionsQuery = query(
          collection(db, 'submissions'),
          where('studentId', '==', user.uid)
        );
        const submissionsSnapshot = await getDocs(submissionsQuery);
        const submissionsData = submissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudentSubmissions(submissionsData);

      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: value }));
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment?.questions) return;
    const user = auth.currentUser;
    if (!user) return;

    const unanswered = selectedAssignment.questions.filter((_, i) => !answers[i]);
    if (unanswered.length > 0) {
      alert("Please answer all questions before submitting.");
      return;
    }

    try {
      await addDoc(collection(db, 'submissions'), {
        assignmentId: selectedAssignment.id,
        courseId: selectedAssignment.courseId,
        studentId: user.uid,
        studentEmail: user.email,
        studentName: user.displayName || 'Student',
        answers: Object.values(answers),
        submittedAt: serverTimestamp(),
        status: 'submitted',
        teacherFeedback: '',
        teacherStatus: 'pending'
      });

      await updateDoc(doc(db, 'assignments', selectedAssignment.id), {
        submissions: arrayUnion({ studentId: user.uid, submittedAt: new Date().toISOString() })
      });

      alert("Assignment submitted successfully!");
      setSubmitModal(false);
      setSelectedAssignment(null);
      setAnswers({});
      window.location.reload();
    } catch (error) {
      console.error("Error submitting assignment:", error);
      alert("Failed to submit assignment. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getSubmissionStatus = (assignmentId) => {
    const submission = studentSubmissions.find(sub => sub.assignmentId === assignmentId);
    if (!submission) return null;
    return {
      status: submission.teacherStatus || 'pending',
      feedback: submission.teacherFeedback || '',
      improvementFeedback: submission.improvementFeedback || '',
      marks: submission.marks || 0,
      maxMarks: submission.maxMarks || 10,
    };
  };

  const toggleFeedback = (assignmentId) => {
    setExpandedFeedback(prev => ({ ...prev, [assignmentId]: !prev[assignmentId] }));
  };

  // ─── Determine card state: 'pending' | 'submitted' | 'reviewed' ───────────
  const getCardState = (submissionStatus) => {
    if (!submissionStatus) return 'pending';
    if (submissionStatus.status === 'reviewed') return 'reviewed';
    return 'submitted'; // catches 'submitted', 'pending' teacherStatus, etc.
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin" />
        <p className="text-zinc-500 font-medium">Loading assignments...</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-8 py-12">

        {/* Clean Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-zinc-900 tracking-tight mb-2">My Assignments</h1>
          <p className="text-zinc-500 text-lg">Track your progress and submit coursework</p>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {assignments.map((assignment) => {
            const submissionStatus = getSubmissionStatus(assignment.id);
            const cardState = getCardState(submissionStatus);
            const isFeedbackOpen = !!expandedFeedback[assignment.id];

            const scorePercent = submissionStatus
              ? (submissionStatus.marks / submissionStatus.maxMarks) * 100
              : 0;
            const isHighScore = scorePercent >= 80;

            return (
              <div
                key={assignment.id}
                className="
                  relative bg-white border border-zinc-100 rounded-[2rem] overflow-hidden
                  transition-all duration-300 hover:shadow-2xl hover:-translate-y-1
                "
              >
                <div className="p-8 space-y-6">

                  {/* Header Section - Course Name & Icon */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-blue-600 capitalize">{assignment.courseName || 'Course'}</h3>
                          <p className="text-zinc-900 font-semibold text-lg mt-1">{assignment.title}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Due Date Badge */}
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-2xl">
                    <Calendar className="w-4 h-4 text-zinc-600" />
                    <span className="text-zinc-600 font-medium">{formatDate(assignment.dueDate)}</span>
                  </div>

                  {/* Status & Scoring Section */}
                  <div className="space-y-4">
                    {/* Single Elegant Status Badge */}
                    <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-2xl font-medium ${
                      cardState === 'reviewed'
                        ? isHighScore ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        : cardState === 'submitted' ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        cardState === 'reviewed'
                          ? isHighScore ? 'bg-green-500' : 'bg-amber-500'
                          : cardState === 'submitted' ? 'bg-blue-500' : 'bg-zinc-400'
                      }`} />
                      {cardState === 'reviewed'
                        ? isHighScore ? 'Excellent' : 'Reviewed'
                        : cardState === 'submitted' ? 'Submitted' : 'Pending'
                      }
                    </div>

                    {/* Grade Circle - Prominent Score Display */}
                    {cardState === 'reviewed' && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 ${
                            isHighScore ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                          }`}>
                            <span className={`text-2xl font-bold ${isHighScore ? 'text-green-700' : 'text-amber-700'}`}>
                              {submissionStatus.marks}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-zinc-500">Score</p>
                            <p className="text-lg font-semibold text-zinc-900">
                              {submissionStatus.marks}/{submissionStatus.maxMarks}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            isHighScore ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {isHighScore ? <Star className="w-4 h-4 fill-current" /> : <Check className="w-4 h-4" />}
                            {Math.round(scorePercent)}%
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Teacher's Feedback Section - Glassmorphism Panel */}
                  {cardState === 'reviewed' && (submissionStatus.feedback || submissionStatus.improvementFeedback) && (
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/50 to-purple-50/50 backdrop-blur-xl rounded-2xl border border-white/20"></div>
                      <div className="relative p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-zinc-600" />
                            <span className="font-semibold text-zinc-800">Teacher Feedback</span>
                          </div>
                          <button
                            onClick={() => toggleFeedback(assignment.id)}
                            className="p-2 hover:bg-white/50 rounded-xl transition-all"
                          >
                            {isFeedbackOpen
                              ? <ChevronUp className="w-4 h-4 text-zinc-600" />
                              : <ChevronDown className="w-4 h-4 text-zinc-600" />
                            }
                          </button>
                        </div>

                        {isFeedbackOpen && (
                          <div className="space-y-4">
                            {submissionStatus.feedback && (
                              <div className="relative">
                                <div className="absolute -left-2 top-0 text-3xl text-zinc-300">"</div>
                                <p className="text-zinc-700 leading-relaxed pl-4 italic">
                                  {submissionStatus.feedback}
                                </p>
                                <div className="absolute -right-2 bottom-0 text-3xl text-zinc-300 rotate-180">"</div>
                              </div>
                            )}
                            
                            {submissionStatus.improvementFeedback && (
                              <div className="pt-4 border-t border-zinc-200/50">
                                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Areas to Improve</p>
                                <p className="text-zinc-600 text-sm leading-relaxed">
                                  {submissionStatus.improvementFeedback}
                                </p>
                              </div>
                            )}

                            <button className="w-full py-2 text-zinc-600 font-medium hover:text-zinc-900 transition-colors text-sm">
                              View Full Feedback →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-6 border-t border-zinc-100">
                    <span className="flex items-center gap-2 text-sm text-zinc-500">
                      <Clock className="w-4 h-4" />
                      {assignment.status || 'active'}
                    </span>

                    {cardState === 'pending' && (
                      <button
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          const init = {};
                          assignment.questions?.forEach((_, i) => { init[i] = ''; });
                          setAnswers(init);
                          setSubmitModal(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-900 text-white font-medium rounded-2xl hover:bg-zinc-800 transition-all hover:scale-105"
                      >
                        <Plus className="w-4 h-4" /> Submit
                      </button>
                    )}

                    {cardState === 'submitted' && (
                      <span className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-2xl">
                        <Send className="w-4 h-4" /> Submitted
                      </span>
                    )}

                    {cardState === 'reviewed' && (
                      <span className={`flex items-center gap-2 px-4 py-2 font-medium rounded-2xl ${
                        isHighScore ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        <Check className="w-4 h-4" /> Reviewed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {assignments.length === 0 && (
          <div className="bg-white border border-zinc-100 rounded-[2rem] p-20 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-lg">
              <FileText className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-3xl font-bold text-zinc-900 mb-4">
              {!hasEnrollments ? "No courses enrolled yet" : "No assignments found"}
            </h3>
            <p className="text-zinc-500 text-lg max-w-md mx-auto">
              {!hasEnrollments
                ? "Enroll in a course to see your assignments here."
                : "No assignments found for your enrolled courses."}
            </p>
          </div>
        )}

        {/* Submit Modal */}
        {submitModal && selectedAssignment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSubmitModal(false)} />
            <div className="relative z-[101] bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-12 pt-12 pb-8">
                <div>
                  <h2 className="text-3xl font-bold text-zinc-900 mb-2">Submit Assignment</h2>
                  <p className="text-zinc-500 text-lg capitalize">{selectedAssignment.title}</p>
                </div>
                <button onClick={() => setSubmitModal(false)} className="p-3 hover:bg-zinc-100 rounded-2xl transition-all">
                  <X className="w-6 h-6 text-zinc-400" />
                </button>
              </div>

              {/* Questions */}
              <div className="px-12 pb-8 space-y-8 max-h-[60vh] overflow-y-auto">
                {selectedAssignment.questions?.map((question, index) => (
                  <div key={index} className="space-y-4">
                    <div className="flex items-start gap-4">
                      <span className="shrink-0 w-8 h-8 bg-zinc-900 text-white text-sm font-bold rounded-2xl flex items-center justify-center">
                        {index + 1}
                      </span>
                      <p className="text-base font-medium text-zinc-800 leading-relaxed flex-1">{question.q}</p>
                    </div>
                    <textarea
                      value={answers[index] || ''}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      className="w-full ml-12 p-4 bg-zinc-50 border border-zinc-200 rounded-2xl text-base focus:outline-none focus:ring-2 focus:ring-zinc-900/10 resize-none h-32 transition-all placeholder-zinc-400"
                      placeholder={`Your answer for Question ${index + 1}…`}
                    />
                  </div>
                ))}
              </div>

              {/* Modal Footer */}
              <div className="flex gap-4 px-12 py-8 border-t border-zinc-100 bg-zinc-50/50">
                <button
                  onClick={() => setSubmitModal(false)}
                  className="flex-1 py-4 bg-white border border-zinc-200 text-zinc-700 rounded-2xl font-medium hover:bg-zinc-50 transition-all hover:scale-105"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  className="flex-1 py-4 bg-zinc-900 text-white rounded-2xl font-semibold hover:bg-zinc-800 transition-all hover:scale-105 flex items-center justify-center gap-3"
                >
                  <Send className="w-5 h-5" /> Submit Assignment
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}