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
    <div className="bg-[#F5F5F7] min-h-screen p-8 lg:p-16">
      <div className="max-w-6xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-[#1D1D1F] tracking-tight">My Assignments</h1>
          <p className="text-zinc-500 mt-1 text-base">Complete and submit your course assignments.</p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                className={`
                  relative bg-white rounded-3xl border overflow-hidden
                  transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5
                  ${cardState === 'reviewed'
                    ? isHighScore ? 'border-green-200 shadow-green-100/60 shadow-md' : 'border-amber-200 shadow-amber-100/60 shadow-md'
                    : cardState === 'submitted'
                    ? 'border-blue-200 shadow-blue-100/50 shadow-sm'
                    : 'border-zinc-100 shadow-sm'
                  }
                `}
              >
                {/* Top color accent strip */}
                <div className={`h-1 w-full ${
                  cardState === 'reviewed'
                    ? isHighScore ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'
                    : cardState === 'submitted'
                    ? 'bg-gradient-to-r from-blue-400 to-indigo-500'
                    : 'bg-gradient-to-r from-zinc-200 to-zinc-300'
                }`} />

                <div className="p-6 space-y-4">

                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#1D1D1F] leading-snug capitalize">{assignment.title}</h3>
                    <div className={`shrink-0 p-2 rounded-xl ${
                      cardState === 'reviewed'
                        ? isHighScore ? 'bg-green-50' : 'bg-amber-50'
                        : cardState === 'submitted' ? 'bg-blue-50' : 'bg-zinc-50'
                    }`}>
                      <FileText className={`w-5 h-5 ${
                        cardState === 'reviewed'
                          ? isHighScore ? 'text-green-500' : 'text-amber-500'
                          : cardState === 'submitted' ? 'text-blue-500' : 'text-zinc-400'
                      }`} />
                    </div>
                  </div>

                  {/* Due date */}
                  <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                    <Calendar className="w-4 h-4" />
                    Due: {formatDate(assignment.dueDate)}
                  </div>

                  {/* ── STATE: NOT SUBMITTED ── */}
                  {cardState === 'pending' && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 rounded-xl border border-zinc-100">
                      <div className="w-2 h-2 bg-zinc-400 rounded-full" />
                      <span className="text-sm font-medium text-zinc-500">Not submitted yet</span>
                    </div>
                  )}

                  {/* ── STATE: SUBMITTED (awaiting review) ── */}
                  {cardState === 'submitted' && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium text-blue-700">Submitted · Awaiting review</span>
                      </div>
                      <p className="text-xs text-zinc-400 pl-1">Your teacher will review your answers soon.</p>
                    </div>
                  )}

                  {/* ── STATE: REVIEWED ── */}
                  {cardState === 'reviewed' && (
                    <div className="space-y-3">
                      {/* Score pill */}
                      <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                        isHighScore ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                            isHighScore ? 'bg-green-500' : 'bg-amber-500'
                          }`}>
                            {isHighScore
                              ? <Star className="w-4 h-4 text-white fill-white" />
                              : <Check className="w-4 h-4 text-white" />
                            }
                          </div>
                          <span className={`text-sm font-semibold ${isHighScore ? 'text-green-700' : 'text-amber-700'}`}>
                            {isHighScore ? 'Great work!' : 'Reviewed'}
                          </span>
                        </div>
                        <span className={`text-xl font-bold tabular-nums ${isHighScore ? 'text-green-600' : 'text-amber-600'}`}>
                          {submissionStatus.marks}
                          <span className="text-sm font-medium opacity-60">/{submissionStatus.maxMarks}</span>
                        </span>
                      </div>

                      {/* Score bar */}
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isHighScore ? 'bg-green-400' : 'bg-amber-400'}`}
                          style={{ width: `${scorePercent}%` }}
                        />
                      </div>

                      {/* Expandable feedback */}
                      {(submissionStatus.feedback || submissionStatus.improvementFeedback) && (
                        <div className="rounded-xl border border-zinc-100 overflow-hidden">
                          <button
                            onClick={() => toggleFeedback(assignment.id)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-zinc-500" />
                              <span className="text-sm font-semibold text-zinc-700">Teacher Feedback</span>
                            </div>
                            {isFeedbackOpen
                              ? <ChevronUp className="w-4 h-4 text-zinc-400" />
                              : <ChevronDown className="w-4 h-4 text-zinc-400" />
                            }
                          </button>

                          {isFeedbackOpen && (
                            <div className="px-4 pb-4 pt-3 space-y-3 bg-white">
                              {submissionStatus.feedback && (
                                <div>
                                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-1">Comments</p>
                                  <p className="text-sm text-zinc-600 leading-relaxed">{submissionStatus.feedback}</p>
                                </div>
                              )}
                              {submissionStatus.improvementFeedback && (
                                <div className="pt-2 border-t border-zinc-50">
                                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Areas to Improve</p>
                                  <p className="text-sm text-zinc-600 leading-relaxed">{submissionStatus.improvementFeedback}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-50">
                    <span className="flex items-center gap-1 text-xs text-zinc-400 font-medium">
                      <Clock className="w-3 h-3" />
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
                        className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#1D1D1F] hover:bg-zinc-700 px-4 py-2 rounded-xl transition-all"
                      >
                        <Plus className="w-4 h-4" /> Submit
                      </button>
                    )}

                    {cardState === 'submitted' && (
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-xl">
                        <Send className="w-3 h-3" /> Submitted
                      </span>
                    )}

                    {cardState === 'reviewed' && (
                      <span className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl ${
                        isHighScore ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'
                      }`}>
                        <Check className="w-3 h-3" /> Reviewed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {assignments.length === 0 && (
          <div className="bg-white rounded-3xl border border-zinc-100 p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#1D1D1F] mb-3">
              {!hasEnrollments ? "No courses enrolled yet" : "No assignments found"}
            </h3>
            <p className="text-zinc-500">
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
            <div className="relative z-[101] bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
              {/* Modal header */}
              <div className="flex items-center justify-between px-8 pt-8 pb-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#1D1D1F]">Submit Assignment</h2>
                  <p className="text-sm text-zinc-400 mt-0.5 capitalize">{selectedAssignment.title}</p>
                </div>
                <button onClick={() => setSubmitModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-all">
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>

              {/* Questions */}
              <div className="px-8 pb-4 space-y-6 max-h-[50vh] overflow-y-auto">
                {selectedAssignment.questions?.map((question, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 w-6 h-6 bg-[#1D1D1F] text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                        {index + 1}
                      </span>
                      <p className="text-sm font-medium text-zinc-700 leading-relaxed">{question.q}</p>
                    </div>
                    <textarea
                      value={answers[index] || ''}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      className="w-full ml-9 p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/10 resize-none h-24 transition-all"
                      placeholder={`Your answer for Q${index + 1}…`}
                    />
                  </div>
                ))}
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 px-8 py-6 border-t border-zinc-100 bg-zinc-50/50">
                <button
                  onClick={() => setSubmitModal(false)}
                  className="flex-1 py-3 bg-white border border-zinc-200 text-zinc-700 rounded-xl font-medium hover:bg-zinc-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitAssignment}
                  className="flex-1 py-3 bg-[#1D1D1F] text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Submit Assignment
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}