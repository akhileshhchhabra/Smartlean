'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, FileText, User, Mail, Calendar, AlertCircle, Shield } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export default function AdminVerification() {
  const router = useRouter();
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAndFetch = async () => {
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      // Check if user is admin (you can customize this logic)
      const adminEmails = ['your-admin-email@example.com']; // Replace with your admin email
      if (!adminEmails.includes(user.email)) {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      await fetchPendingTeachers();
    };

    checkAdminAndFetch();
  }, [router]);

  const fetchPendingTeachers = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('verificationStatus', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      
      const teachers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setPendingTeachers(teachers);
    } catch (error) {
      console.error('Error fetching pending teachers:', error);
      setError('Failed to load pending verifications.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (teacherId) => {
    setProcessing(prev => ({ ...prev, [teacherId]: 'approving' }));
    setError('');

    try {
      const teacherRef = doc(db, 'users', teacherId);
      await updateDoc(teacherRef, {
        isVerified: true,
        verificationStatus: 'approved',
        verifiedAt: new Date().toISOString()
      });

      // Remove from pending list
      setPendingTeachers(prev => prev.filter(teacher => teacher.id !== teacherId));
    } catch (error) {
      console.error('Error approving teacher:', error);
      setError('Failed to approve teacher. Please try again.');
    } finally {
      setProcessing(prev => ({ ...prev, [teacherId]: null }));
    }
  };

  const handleReject = async (teacherId) => {
    setProcessing(prev => ({ ...prev, [teacherId]: 'rejecting' }));
    setError('');

    try {
      const teacherRef = doc(db, 'users', teacherId);
      await updateDoc(teacherRef, {
        isVerified: false,
        verificationStatus: 'rejected',
        rejectedAt: new Date().toISOString()
      });

      // Remove from pending list
      setPendingTeachers(prev => prev.filter(teacher => teacher.id !== teacherId));
    } catch (error) {
      console.error('Error rejecting teacher:', error);
      setError('Failed to reject teacher. Please try again.');
    } finally {
      setProcessing(prev => ({ ...prev, [teacherId]: null }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl border border-zinc-100 p-12 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] mb-4">Access Denied</h2>
          <p className="text-zinc-600">{error || 'You need admin privileges to access this page.'}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-zinc-500">Loading pending verifications...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD] py-8 px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1D1D1F]">Teacher Verification</h1>
              <p className="text-zinc-600">Review and approve teacher verification requests</p>
            </div>
          </div>
          
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1D1D1F]">{pendingTeachers.length}</div>
                <div className="text-sm text-zinc-500">Pending Verifications</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1D1D1F]">--</div>
                <div className="text-sm text-zinc-500">Approved Today</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-[#1D1D1F]">--</div>
                <div className="text-sm text-zinc-500">Rejected Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Teachers List */}
        {pendingTeachers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-zinc-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-bold text-[#1D1D1F] mb-4">No Pending Verifications</h3>
            <p className="text-zinc-600">
              All teacher verification requests have been processed.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingTeachers.map((teacher) => (
              <div key={teacher.id} className="bg-white rounded-3xl border border-zinc-100 p-8 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Teacher Info */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-zinc-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-[#1D1D1F] mb-2">
                          {teacher.fullName || 'No name provided'}
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <Mail className="w-4 h-4" />
                            {teacher.email || 'No email'}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-zinc-600">
                            <Calendar className="w-4 h-4" />
                            Submitted: {formatDate(teacher.submittedAt)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Expertise</h4>
                        <p className="text-zinc-600">{teacher.expertise || 'Not specified'}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Professional Bio</h4>
                        <p className="text-zinc-600 leading-relaxed">
                          {teacher.bio || 'No bio provided'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Document & Actions */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Verification Document</h4>
                      {teacher.documentUrl ? (
                        <a
                          href={teacher.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 bg-zinc-50 rounded-xl hover:bg-zinc-100 transition-colors"
                        >
                          <FileText className="w-5 h-5 text-zinc-600" />
                          <span className="text-sm text-zinc-700">View Document</span>
                        </a>
                      ) : (
                        <p className="text-sm text-zinc-500">No document uploaded</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={() => handleApprove(teacher.id)}
                        disabled={processing[teacher.id] === 'approving'}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing[teacher.id] === 'approving' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Approving...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleReject(teacher.id)}
                        disabled={processing[teacher.id] === 'rejecting'}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing[teacher.id] === 'rejecting' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Rejecting...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Reject
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
