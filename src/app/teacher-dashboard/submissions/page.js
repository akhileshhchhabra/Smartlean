'use client';

import { useState, useEffect } from 'react';
import { Calendar, FileText, Clock, AlertCircle, Send, Plus, X, Check, TrendingUp, Eye } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, getDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function SubmissionsInboxPage() {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch assignments and submissions for this teacher
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;

        // Fetch assignments
        const assignmentsQuery = query(
          collection(db, 'assignments'),
          where('teacherId', '==', user.uid)
        );
        const assignmentsSnap = await getDocs(assignmentsQuery);
        const assignmentList = assignmentsSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        setAssignments(assignmentList);

        // Fetch all submissions for this teacher's assignments
        const submissionsQuery = query(
          collection(db, 'submissions')
        );
        const submissionsSnap = await getDocs(submissionsQuery);
        const submissionsList = submissionsSnap.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        }));
        
        // Filter submissions for this teacher's assignments
        const teacherSubmissions = submissionsList.filter(submission =>
          assignmentList.some(assignment => assignment.id === submission.assignmentId)
        );
        
        setSubmissions(teacherSubmissions);
        console.log("Teacher submissions fetched:", teacherSubmissions.length);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get submission statistics
  const getStats = () => {
    const total = submissions.length;
    const pending = submissions.filter(sub => sub.teacherStatus === 'pending').length;
    const completed = submissions.filter(sub => sub.teacherStatus === 'reviewed').length;
    
    return { total, pending, completed };
  };

  // View all submissions for an assignment
  const viewAssignmentSubmissions = async (assignment) => {
    try {
      const assignmentSubmissions = submissions.filter(sub => sub.assignmentId === assignment.id);
      setSelectedAssignment({
        ...assignment,
        submissions: assignmentSubmissions
      });
      setShowSubmissionsModal(true);
    } catch (err) {
      console.error("Error fetching assignment submissions:", err);
      alert("Failed to fetch submissions. Please try again.");
    }
  };

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'reviewed':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-lg">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Reviewed</span>
          </div>
        );
      case 'pending':
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-yellow-50 rounded-lg">
            <Clock className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-700">Pending</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 rounded-lg">
            <AlertCircle className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Unknown</span>
          </div>
        );
    }
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
        <div className="text-zinc-500 font-medium">Loading submissions...</div>
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
              Submissions Inbox
            </h1>
            <p className="text-zinc-500 mt-1">Manage and review all student submissions.</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-[2.5rem] p-6 border border-zinc-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 font-medium">Total Submissions</p>
                <p className="text-2xl font-bold text-[#1D1D1F] font-['Syne']">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-6 border border-zinc-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 font-medium">Pending Reviews</p>
                <p className="text-2xl font-bold text-[#1D1D1F] font-['Syne']">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] p-6 border border-zinc-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 font-medium">Completed Reviews</p>
                <p className="text-2xl font-bold text-[#1D1D1F] font-['Syne']">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Assignments List */}
        <div className="bg-white rounded-[2.5rem] border border-zinc-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-zinc-100">
            <h2 className="text-xl font-semibold text-[#1D1D1F] font-['Syne']">All Assignments</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-700">Assignment Title</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-700">Course</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-700">Due Date</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-700">Submissions</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-zinc-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {assignments.map((assignment) => {
                  const assignmentSubmissions = submissions.filter(sub => sub.assignmentId === assignment.id);
                  const pendingCount = assignmentSubmissions.filter(sub => sub.teacherStatus === 'pending').length;
                  const reviewedCount = assignmentSubmissions.filter(sub => sub.teacherStatus === 'reviewed').length;
                  
                  return (
                    <tr key={assignment.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium text-zinc-900">{assignment.title}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">{assignment.courseName || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-zinc-600">
                        {assignment.dueDate ? formatDate(assignment.dueDate) : 'No due date'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-zinc-600">{assignmentSubmissions.length}</span>
                          {pendingCount > 0 && (
                            <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded-full">
                              {pendingCount} pending
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {reviewedCount > 0 && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Check className="w-3 h-3" />
                              <span className="text-xs">{reviewedCount}</span>
                            </div>
                          )}
                          {pendingCount > 0 && (
                            <div className="flex items-center gap-1 text-yellow-600">
                              <Clock className="w-3 h-3" />
                              <span className="text-xs">{pendingCount}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => viewAssignmentSubmissions(assignment)}
                          className="flex items-center gap-1 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-all"
                        >
                          <Eye className="w-4 h-4" /> View All Submissions
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {assignments.length === 0 && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-zinc-400" />
                </div>
                <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">No assignments found</h3>
                <p className="text-zinc-500">Create assignments to start receiving student submissions.</p>
              </div>
            )}
          </div>
        </div>

        {/* Submissions Modal */}
        {showSubmissionsModal && selectedAssignment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setShowSubmissionsModal(false)} />
            
            <div className="bg-white w-full max-w-4xl p-10 rounded-[2.5rem] shadow-xl relative z-[101] overflow-y-auto max-h-[90vh]">
              <button onClick={() => setShowSubmissionsModal(false)} className="absolute top-6 right-6 p-2 hover:bg-zinc-100 rounded-full transition-all">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
              
              <h2 className="text-3xl font-bold text-[#1D1D1F] font-['Syne'] mb-2">All Submissions</h2>
              <p className="text-zinc-500 mb-8">{selectedAssignment.title} - {selectedAssignment.submissions.length} submissions</p>
              
              <div className="space-y-4">
                {selectedAssignment.submissions.map((submission) => (
                  <div key={submission.id} className="bg-zinc-50 rounded-xl p-6 border border-zinc-100">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-[#1D1F]">{submission.studentName}</h3>
                        <p className="text-sm text-zinc-500">{submission.studentEmail}</p>
                        <p className="text-xs text-zinc-400">
                          Submitted: {formatDate(submission.submittedAt)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {getStatusBadge(submission.teacherStatus)}
                        {submission.marks && (
                          <div className="text-sm font-medium text-zinc-700">
                            Score: {submission.marks}/{submission.maxMarks || 10}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button 
                        onClick={() => {
                          // Navigate to review page or open review modal
                          window.location.href = `/teacher-dashboard/assignments?review=${submission.id}`;
                        }}
                        className="flex items-center gap-1 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-all"
                      >
                        <Eye className="w-4 h-4" /> Review Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
