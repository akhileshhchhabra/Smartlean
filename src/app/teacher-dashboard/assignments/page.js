'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Plus, X, Trash2, Clock, BookOpen, ChevronDown, FileText, Edit, Check, TrendingUp, Send, PlusCircle, Inbox, Eye } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, deleteDoc, getDoc, updateDoc } from 'firebase/firestore';

export default function TeacherAssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionGrades, setSubmissionGrades] = useState({});
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'submissions'
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [grading, setGrading] = useState(false);
  const [questions, setQuestions] = useState([{ q: '', type: 'text' }]);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    dueDate: '',
    courseId: ''
  });

  // View submissions for an assignment
  const viewSubmissions = async (assignment) => {
    try {
      // Fetch submissions only from submissions collection where assignmentId matches
      const submissionsQuery = query(
        collection(db, 'submissions'),
        where('assignmentId', '==', assignment.id)
      );
      const submissionsSnapshot = await getDocs(submissionsQuery);
      const assignmentSubmissions = submissionsSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // Filter only successfully submitted assignments
      const validSubmissions = assignmentSubmissions.filter(sub => sub.status !== 'not-submitted');
      
      // Include assignment questions in the selectedAssignment
      setSelectedAssignment({
        ...assignment,
        questions: assignment.questions || [],
        submissions: validSubmissions
      });
      setShowSubmissionsModal(true);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      alert("Failed to fetch submissions. Please try again.");
    }
  };

  // Update submission with marks and feedback
  const updateSubmission = async (submissionId) => {
    setGrading(true);
    try {
      const grade = submissionGrades[submissionId] || {};
      let submissionRef;
      
      // Primary attempt: Use submissionId directly
      if (submissionId) {
        submissionRef = doc(db, 'submissions', submissionId);
      } else {
        // Fallback: Find submission by assignmentId and studentId
        const user = auth.currentUser;
        if (!user || !selectedAssignment?.currentSubmission) {
          throw new Error('Missing required data for submission update');
        }
        
        const fallbackQuery = query(
          collection(db, 'submissions'),
          where('assignmentId', '==', selectedAssignment.id),
          where('studentId', '==', selectedAssignment.currentSubmission.studentId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        
        if (fallbackSnapshot.empty) {
          throw new Error('Submission document not found');
        }
        
        submissionRef = doc(db, 'submissions', fallbackSnapshot.docs[0].id);
      }
      
      const updateData = {
        marks: Number(grade.marks) || 0,
        maxMarks: Number(grade.maxMarks) || 10,
        improvementFeedback: grade.improvementFeedback || '',
        teacherStatus: 'reviewed',
        reviewedAt: serverTimestamp()
      };
      
      console.log('Updating submission with data:', updateData);
      await updateDoc(submissionRef, updateData);
      
      // Update local state with null check
      setSubmissions(prev => {
        if (!Array.isArray(prev)) return prev;
        return prev.map(sub => 
          sub.id === submissionId || (selectedAssignment?.currentSubmission && sub.studentId === selectedAssignment.currentSubmission.studentId)
            ? { ...sub, ...updateData }
            : sub
        );
      });
      
      // Success animation
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-xl shadow-lg z-[200] flex items-center gap-2';
      successMessage.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Grade saved successfully!
      `;
      document.body.appendChild(successMessage);
      
      setTimeout(() => {
        successMessage.remove();
      }, 3000);
      
      // Close modal after successful submission
      setTimeout(() => {
        setShowSubmissionsModal(false);
        setSelectedAssignment(null);
      }, 1500);
      
    } catch (err) {
      console.error("Error updating submission:", err);
      alert(`Failed to save grade: ${err.message}`);
    } finally {
      setGrading(false);
    }
  };

  // Handle grade input changes
  const handleGradeChange = (submissionId, field, value) => {
    setSubmissionGrades(prev => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value
      }
    }));
  };

  // Fetch assignments, courses, and submissions for this teacher
  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Fetch assignments
      const assignmentsQuery = query(
        collection(db, 'assignments'),
        where('teacherId', '==', user.uid)
      );
      const assignmentsSnap = await getDocs(assignmentsQuery);
      const assignmentList = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAssignments(assignmentList);

      // Fetch courses for dropdown
      const coursesQuery = query(
        collection(db, 'courses'),
        where('teacherId', '==', user.uid)
      );
      const coursesSnap = await getDocs(coursesQuery);
      const coursesList = coursesSnap.docs.map(doc => ({ id: doc.id, title: doc.data().title }));
      setCourses(coursesList);

      // Fetch all submissions for this teacher's assignments
      const submissionsQuery = query(
        collection(db, 'submissions')
      );
      const submissionsSnap = await getDocs(submissionsQuery);
      const submissionsList = submissionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter submissions for this teacher's assignments
      const teacherSubmissions = submissionsList.filter(submission =>
        assignmentList.some(assignment => assignment.id === submission.assignmentId)
      );
      
      setSubmissions(teacherSubmissions);
      console.log("Submissions fetched:", teacherSubmissions.length);

    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  // Add new question
  const addQuestion = () => {
    setQuestions([...questions, { q: '', type: 'text' }]);
  };

  // Delete question
  const deleteQuestion = (index) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
  };

  // Update question
  const updateQuestion = (index, value) => {
    const newQuestions = [...questions];
    newQuestions[index].q = value;
    setQuestions(newQuestions);
  };

  // Create assignment with questions
  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
      alert("आप लॉग इन करने के लिए होना चाहिए");
      return;
    }

    // Validate questions
    const validQuestions = questions.filter(q => q.q.trim() !== '');
    if (validQuestions.length === 0) {
      alert("कृपया कम से एक सवाल जोड़ें");
      return;
    }

    setUploading(true);
    console.log("असाइनमेंट बना रहे हैं...");

    try {
      // Create assignment document with questions array
      console.log("Firestore में सेव कर रहे हैं...");
      const assignmentDoc = await addDoc(collection(db, 'assignments'), {
        title: newAssignment.title,
        dueDate: newAssignment.dueDate,
        courseId: newAssignment.courseId,
        questions: validQuestions,
        teacherId: user.uid,
        teacherName: user.displayName || 'Instructor',
        teacherEmail: user.email,
        createdAt: serverTimestamp(),
        status: 'active'
      });
      console.log("असाइनमेंट सफलतः से बनाया गया:", assignmentDoc.id);

      // Success - close modal and refresh
      setShowModal(false);
      console.log("Modal closed, refreshing assignment list...");

      // Refresh assignment list
      await fetchAssignments();
      console.log("Assignment list refreshed");

      // Reset states after successful save
      setNewAssignment({ title: '', dueDate: '', courseId: '' });
      setQuestions([{ q: '', type: 'text' }]);
      console.log("All states cleared");

    } catch (err) {
      console.error("Error creating assignment:", err);
      alert(`Error creating assignment: ${err.message || 'Please try again.'}`);
    } finally {
      setUploading(false);
      console.log("Save process completed, loading state reset");
    }
  };

  // Delete assignment
  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'assignments', assignmentId));
      console.log("असाइनमेंट सफलतः से हटाया गया");
      await fetchAssignments();
    } catch (err) {
      console.error("असाइनमेंट हटाने में त्रुटि:", err);
      alert("असाइनमेंट हटाने में असफलता। कृपया फिर से कोशिश करें।");
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'No due date';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Format date in English
  const formatDateEnglish = (timestamp) => {
    if (!timestamp) return 'No due date';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      timeZone: 'UTC'
    };
    return date.toLocaleDateString('en-US', options);
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
    <div className="bg-[#FAFAFA] p-16 lg:p-24">
      <div className="max-w-6xl mx-auto space-y-8">
  {/* Header Section */}
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
    <div>
      <h1 className="text-3xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-tight">
        Assignment Management
      </h1>
      <p className="text-zinc-500 mt-1">Create assignments and review student submissions.</p>
    </div>
  </div>

  {/* Tab Navigation */}
  <div className="bg-white rounded-[3rem] p-2 border border-zinc-100 shadow-sm">
    <div className="flex gap-2">
      <button
        onClick={() => setActiveTab('create')}
        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-[2rem] font-semibold transition-all ${
          activeTab === 'create' 
            ? 'bg-black text-white' 
            : 'text-zinc-500 hover:bg-zinc-50'
        }`}
      >
        <PlusCircle className="w-5 h-5" />
        Create & Manage
      </button>
      <button
        onClick={() => setActiveTab('submissions')}
        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-[2rem] font-semibold transition-all ${
          activeTab === 'submissions' 
            ? 'bg-black text-white' 
            : 'text-zinc-500 hover:bg-zinc-50'
        }`}
      >
        <Inbox className="w-5 h-5" />
        Student Submissions
      </button>
    </div>
  </div>

  {/* Tab Content */}
  {activeTab === 'create' ? (
    /* Create & Manage Tab */
    <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 space-y-8">
      {/* Create Assignment Button */}
      <div className="flex justify-end">
        <button 
          onClick={() => setShowModal(true)}
          className="bg-black text-white px-6 py-3 rounded-[2rem] font-semibold hover:bg-zinc-800 transition-colors flex items-center gap-2"
        >
          <PlusCircle className="w-4 h-4" /> Create Assignment
        </button>
      </div>

      {/* Published Assignments Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Send className="w-5 h-5 text-zinc-500" />
          <h2 className="text-2xl font-semibold text-zinc-900 font-['Syne']">Published Assignments</h2>
        </div>
        
        {assignments.length > 0 ? (
          <div className="space-y-2">
            {assignments.map((assignment, index) => {
              const assignmentSubmissions = submissions.filter(sub => sub.assignmentId === assignment.id);
              const submissionCount = assignmentSubmissions.length;
              
              return (
                <div key={assignment.id}>
                  <div 
                    className="group bg-white rounded-[2.5rem] border border-zinc-100 p-8 shadow-sm hover:shadow-md transition-colors"
                  >
                    <div className="flex items-start justify-between gap-8">
                      {/* Left Side: Title and Questions */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-zinc-900 leading-snug group-hover:text-black transition-colors mb-3 font-['Syne']">
                              {assignment.title}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Send className="w-5 h-5 text-zinc-400" />
                              <span className="text-sm text-zinc-500 font-medium">Published</span>
                            </div>
                          </div>
                        </div>

                        {/* Questions List */}
                        {assignment.questions && assignment.questions.length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">Questions</h4>
                            <div className="space-y-2">
                              {assignment.questions.map((question, qIndex) => (
                                <div key={`${assignment.id}-question-${qIndex}`} className="flex items-start gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                                    {qIndex + 1}
                                  </span>
                                  <p className="text-sm text-zinc-700 leading-relaxed">
                                    {question.q || 'Question not available'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Side: Due Date and Actions */}
                      <div className="flex flex-col items-end gap-4 min-w-[200px]">
                        {/* Course and Due Date */}
                        <div className="text-right space-y-2">
                          {assignment.courseName && assignment.courseName !== 'N/A' && (
                            <div className="flex items-center gap-2 text-sm">
                              <BookOpen className="w-4 h-4 text-zinc-400" />
                              <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
                                {assignment.courseName}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="w-4 h-4 text-zinc-400" />
                            <span className="text-zinc-700">{formatDateEnglish(assignment.dueDate)}</span>
                          </div>
                        </div>

                        {/* Submissions Badge */}
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-sm font-medium">
                            {submissionCount} Students Responded
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => viewSubmissions(assignment)}
                            className="flex items-center justify-center gap-2 text-sm font-semibold text-white bg-black px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors"
                          >
                            <Eye className="w-4 h-4" /> View Submissions
                          </button>
                          <button 
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            className="flex items-center justify-center w-10 h-10 text-zinc-500 bg-zinc-50 border border-zinc-200 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Subtle Divider */}
                  {index < assignments.length - 1 && (
                    <div className="border-b border-zinc-100 mt-2"></div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-16 text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Send className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-[#1D1D1F] mb-4">No published assignments yet</h3>
            <p className="text-zinc-500 mb-6">Create your first assignment to start collecting student responses.</p>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-black text-white px-6 py-3 rounded-[2rem] font-semibold hover:bg-zinc-800 transition-all duration-300 flex items-center gap-2 mx-auto"
            >
              <PlusCircle className="w-4 h-4" /> Create Assignment
            </button>
          </div>
        )}
      </div>
    </div>
  ) : (
    /* Student Submissions Tab */
    <div className="bg-white rounded-[2.5rem] border border-zinc-100 p-8 space-y-8">
      {/* Submissions Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 font-medium">Total Submissions</p>
              <p className="text-2xl font-bold text-zinc-900 font-['Syne']">{submissions.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Inbox className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 font-medium">Pending Reviews</p>
              <p className="text-2xl font-bold text-zinc-900 font-['Syne']">
                {submissions.filter(sub => sub.teacherStatus === 'pending').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500 font-medium">Completed Reviews</p>
              <p className="text-2xl font-bold text-zinc-900 font-['Syne']">
                {submissions.filter(sub => sub.teacherStatus === 'reviewed').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Submissions Cards */}
      <div className="space-y-4">
        {submissions.map((submission) => {
          const assignment = assignments.find(a => a.id === submission.assignmentId);
          const isReviewed = submission.teacherStatus === 'reviewed';
          
          return (
            <div 
              key={submission.id} 
              className="bg-white border border-zinc-100 rounded-2xl shadow-sm p-6 hover:shadow-md transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-zinc-900 font-['Syne']">{submission.studentName}</h3>
                  <p className="text-sm text-zinc-500">{submission.studentEmail}</p>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {assignment?.title || 'Unknown Assignment'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {submission.submittedAt?.toDate ? submission.submittedAt.toDate().toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {isReviewed ? (
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 rounded-lg">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-emerald-700">Reviewed</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-lg">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-700">Pending</span>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      setShowSubmissionsModal(true);
                    }}
                    className="flex items-center gap-1 text-sm font-semibold text-white bg-black px-4 py-2 rounded-xl hover:bg-zinc-800 transition-colors"
                  >
                    <Eye className="w-4 h-4" /> Review
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {submissions.length === 0 && (
        <div className="bg-white border border-zinc-100 rounded-[3.5rem] p-16 text-center">
          <div className="w-24 h-24 bg-zinc-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Inbox className="w-12 h-12 text-zinc-400" />
          </div>
          <h3 className="text-2xl font-bold text-zinc-900 mb-4">No submissions yet</h3>
          <p className="text-zinc-500">Students haven't submitted any assignments yet.</p>
        </div>
      )}
    </div>
  )}

  {/* Assignment Creation Modal */}
  {showModal && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowModal(false)} />
      
      <div className="bg-white w-full max-w-4xl p-16 rounded-[3rem] shadow-2xl relative z-[101] overflow-y-auto max-h-[90vh]">
        <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 p-2 hover:bg-zinc-50 rounded-full transition-colors">
          <X className="w-5 h-5 text-zinc-400" />
        </button>
        
        <h2 className="text-3xl font-bold text-zinc-900 font-['Syne'] mb-2">Create New Assignment</h2>
        <p className="text-zinc-500 mb-8">Add a new assignment to your teaching portfolio.</p>
        
        <form onSubmit={handleCreateAssignment} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Assignment Title</label>
            <input
              type="text"
              value={newAssignment.title}
              onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
              className="w-full p-4 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              placeholder="Enter assignment title..."
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Due Date</label>
            <input
              type="datetime-local"
              value={newAssignment.dueDate}
              onChange={(e) => setNewAssignment(prev => ({ ...prev, dueDate: e.target.value }))}
              className="w-full p-4 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Course</label>
            <select
              value={newAssignment.courseId}
              onChange={(e) => setNewAssignment(prev => ({ ...prev, courseId: e.target.value }))}
              className="w-full p-4 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
              required
            >
              <option value="">Select course...</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Questions</label>
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={question.q}
                    onChange={(e) => {
                      const updatedQuestions = [...questions];
                      updatedQuestions[index].q = e.target.value;
                      setQuestions(updatedQuestions);
                    }}
                    className="flex-1 p-4 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                    placeholder={`Question ${index + 1}`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (questions.length > 1) {
                        setQuestions(questions.filter((_, i) => i !== index));
                      }
                    }}
                    className="p-3 bg-zinc-50 text-zinc-500 border border-zinc-200 rounded-xl hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setQuestions([...questions, { q: '', type: 'text' }])}
                className="w-full py-3 bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-100 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 py-3 bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-xl font-semibold hover:bg-zinc-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-3 bg-black text-white rounded-xl font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              {uploading ? 'Publishing...' : 'Publish Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )}

        {/* Student Review Modal */}
        {showSubmissionsModal && selectedAssignment && selectedAssignment.currentSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSubmissionsModal(false)} />
            
            <div className="bg-white w-full max-w-2xl p-10 rounded-[2.5rem] shadow-2xl relative z-[101] overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowSubmissionsModal(false)} className="absolute top-6 right-6 p-2 hover:bg-zinc-50 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
              
              {/* Modal Header */}
              <div className="bg-zinc-900 rounded-2xl p-6 mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white font-['Syne']">
                      {selectedAssignment.currentSubmission.studentName}
                    </h2>
                    <p className="text-zinc-300 text-sm mt-1">{selectedAssignment.currentSubmission.studentEmail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedAssignment.currentSubmission.teacherStatus === 'reviewed' ? (
                      <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg">
                        <Check className="w-4 h-4" />
                        <span className="text-sm font-medium">Reviewed</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-600 rounded-lg">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">Pending</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Section - Student Answers */}
              <div className="space-y-6 mb-8">
                <h3 className="text-lg font-semibold text-zinc-900 font-['Syne']">Student Answers</h3>
                <div className="space-y-4">
                  {selectedAssignment.currentSubmission.answers && Array.isArray(selectedAssignment.currentSubmission.answers) ? (
                    selectedAssignment.currentSubmission.answers.map((answer, index) => (
                      <div key={index} className="space-y-2">
                        <h4 className="text-sm font-bold text-zinc-700">
                          Q{index + 1}: {selectedAssignment.questions[index]?.q || 'Question not available'}
                        </h4>
                        <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                          <p className="text-zinc-700 leading-relaxed">
                            {answer || 'No answer provided'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                      <p className="text-zinc-500">No answers available for this submission.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Evaluation Section */}
              <div className="border-t border-zinc-100 pt-6">
                <h3 className="text-lg font-semibold text-zinc-900 font-['Syne'] mb-6">Evaluation</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Score / 10</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="1"
                      value={submissionGrades[selectedAssignment.currentSubmission.id]?.marks || selectedAssignment.currentSubmission.marks || 0}
                      onChange={(e) => {
                        const value = Math.max(0, Math.min(10, parseInt(e.target.value) || 0));
                        handleGradeChange(selectedAssignment.currentSubmission.id, 'marks', value);
                      }}
                      className="w-full p-3 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black"
                      placeholder="Enter score out of 10"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Teacher's Feedback</label>
                    <textarea
                      value={submissionGrades[selectedAssignment.currentSubmission.id]?.improvementFeedback || selectedAssignment.currentSubmission.improvementFeedback || ''}
                      onChange={(e) => handleGradeChange(selectedAssignment.currentSubmission.id, 'improvementFeedback', e.target.value)}
                      className="w-full p-4 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black resize-none h-24"
                      placeholder="Provide feedback for the student..."
                    />
                  </div>

                  <button 
                    onClick={() => updateSubmission(selectedAssignment.currentSubmission.id)}
                    disabled={grading}
                    className="w-full py-3 bg-black text-white rounded-xl font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {grading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Submit Grade
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submissions List Modal */}
        {showSubmissionsModal && selectedAssignment && !selectedAssignment.currentSubmission && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSubmissionsModal(false)} />
            
            <div className="bg-white w-full max-w-md p-8 rounded-[2.5rem] shadow-2xl relative z-[101] overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowSubmissionsModal(false)} className="absolute top-6 right-6 p-2 hover:bg-zinc-50 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
              
              <h2 className="text-2xl font-bold text-zinc-900 font-['Syne'] mb-6">Student Submissions</h2>
              <p className="text-zinc-500 mb-6">{selectedAssignment.title}</p>
              
              <div className="space-y-4">
                {selectedAssignment.submissions && selectedAssignment.submissions.length > 0 ? (
                  selectedAssignment.submissions.map((submission, index) => (
                    <div 
                      key={`submission-${submission.id || `index-${index}`}-${submission.studentName || 'unknown'}`} 
                      className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 hover:bg-zinc-100 transition-colors cursor-pointer"
                      onClick={() => {
                        setSelectedAssignment({
                          ...selectedAssignment,
                          currentSubmission: submission
                        });
                      }}
                    >
                      <h3 className="text-lg font-semibold text-zinc-900 font-['Syne']">
                        {submission.studentName}
                      </h3>
                      <p className="text-sm text-zinc-500 mt-1">Click to review submission</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-zinc-900 mb-2">No submissions yet</h3>
                    <p className="text-zinc-500">Students haven't submitted this assignment.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
