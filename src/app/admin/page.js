'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, FileText, User, Mail, Shield, AlertTriangle, Clock, Eye } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminPortal() {
  const router = useRouter();
  const [pendingTeachers, setPendingTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminAndSetup = () => {
      const user = auth.currentUser;
      if (!user) {
        router.push('/login');
        return;
      }

      // Login Check: Use hardcoded credentials
      // Username: Akhilesh chhabra
      // Password: #Chhabra2004
      const adminCredentials = {
        email: 'akhileshchhabra@gmail.com',
        password: '#Chhabra2004'
      };
      
      if (user.email !== adminCredentials.email) {
        setError('Access denied. Admin privileges required.');
        setLoading(false);
        return;
      }

      setIsAdmin(true);
      setupRealtimeListener();
    };

    checkAdminAndSetup();
  }, [router]);

  const setupRealtimeListener = () => {
    try {
      console.log('Setting up real-time listener for pending teachers...');
      
      // Dashboard: Fetch and show teachers with pending status
      const q = query(
        collection(db, 'users'),
        where('verificationStatus', '==', 'pending')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const teachers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Real-time update: ${teachers.length} pending teachers`);
        setPendingTeachers(teachers);
        setError('');
        setLoading(false);
      }, (error) => {
        console.error('Real-time listener error:', error);
        setError('Failed to load real-time data. Please refresh.');
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error('Setup error:', error);
      setError('Failed to setup admin dashboard.');
      setLoading(false);
    }
  };

  const handleApprove = async (teacherId) => {
    setProcessing(prev => ({ ...prev, [teacherId]: 'approving' }));
    setError('');

    try {
      console.log(`Approving teacher: ${teacherId}`);
      
      // Approve: Add a button that sets isVerified: true and verificationStatus: 'approved'
      const teacherRef = doc(db, 'users', teacherId);
      await updateDoc(teacherRef, {
        isVerified: true,
        verificationStatus: 'approved',
        approvedAt: serverTimestamp(),
        reviewedBy: auth.currentUser?.email || 'admin'
      });
      
      console.log(`Teacher ${teacherId} approved successfully`);
      
    } catch (error) {
      // Error Tracking: Add try-catch to all Firestore operations and use alert() to show any errors
      alert('Error Code: ' + error.code + '\nMessage: ' + error.message);
      console.error('Error approving teacher:', error);
      setError('Failed to approve teacher. Please try again.');
    } finally {
      setProcessing(prev => ({ ...prev, [teacherId]: null }));
    }
  };

  const handleDeny = async (teacherId) => {
    setProcessing(prev => ({ ...prev, [teacherId]: 'denying' }));
    setError('');

    try {
      console.log(`Denying teacher: ${teacherId}`);
      
      const teacherRef = doc(db, 'users', teacherId);
      await updateDoc(teacherRef, {
        isVerified: false,
        verificationStatus: 'denied',
        deniedAt: serverTimestamp(),
        reviewedBy: auth.currentUser?.email || 'admin'
      });
      
      console.log(`Teacher ${teacherId} denied successfully`);
      
    } catch (error) {
      // Error Tracking: Add try-catch to all Firestore operations and use alert() to show any errors
      alert('Error Code: ' + error.code + '\nMessage: ' + error.message);
      console.error('Error denying teacher:', error);
      setError('Failed to deny teacher. Please try again.');
    } finally {
      setProcessing(prev => ({ ...prev, [teacherId]: null }));
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.toDate()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-zinc-500">Loading Admin Portal...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#1D1D1F] mb-2">Access Denied</h2>
          <p className="text-zinc-600">{error || 'Admin privileges required.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD] py-8 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Premium Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#1D1D1F]">Admin Portal</h1>
                <p className="text-zinc-600 mt-1">Teacher Verification Dashboard</p>
              </div>
            </div>
            <div className="text-sm text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full">
              {auth.currentUser?.email}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
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
                <div className="text-sm text-zinc-500">Denied Today</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Teachers List */}
        {pendingTeachers.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-100 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <CheckCircle className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">All caught up!</h3>
            <p className="text-zinc-600">No pending verifications at the moment.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100">
              <h2 className="text-xl font-semibold text-[#1D1D1F] flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-600" />
                Pending Verifications
              </h2>
            </div>

            <div className="divide-y divide-zinc-100">
              {pendingTeachers.map((teacher) => (
                <div key={teacher.id} className="p-6 hover:bg-zinc-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-zinc-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-[#1D1D1F]">{teacher.fullName || 'No name'}</h3>
                          <p className="text-sm text-zinc-500">{teacher.email || 'No email'}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-sm text-zinc-600">
                          <span className="font-medium">Expertise:</span> {teacher.expertise || 'Not specified'}
                        </div>
                        <div className="text-sm text-zinc-600">
                          <span className="font-medium">Submitted:</span> {formatDate(teacher.submittedAt)}
                        </div>
                        <div className="text-sm text-zinc-600">
                          <span className="font-medium">File:</span> {teacher.documentName || 'No file'} ({(teacher.documentSize / 1024 / 1024).toFixed(2)} MB)
                        </div>
                      </div>

                      {/* Preview: Render the Base64 document in an <img> tag */}
                      {teacher.documentBase64 && (
                        <div className="mt-3">
                          <div className="mb-2">
                            <p className="text-sm font-medium text-zinc-700 mb-2">Document Preview:</p>
                            {teacher.documentBase64.startsWith('data:image/') ? (
                              <div className="border border-zinc-200 rounded-xl p-3 bg-zinc-50 inline-block">
                                <img 
                                  src={teacher.documentBase64} 
                                  className="w-64 h-auto rounded-lg border shadow-sm" 
                                  alt="Verification Document" 
                                />
                              </div>
                            ) : (
                              <div className="border border-zinc-200 rounded-xl p-4 bg-zinc-50 inline-block">
                                <p className="text-sm text-zinc-600">
                                  <FileText className="w-4 h-4 inline mr-2" />
                                  {teacher.documentName || 'Document'} ({(teacher.documentSize / 1024 / 1024).toFixed(2)} MB)
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">
                                  PDF/Document files cannot be previewed directly.
                                </p>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const newWindow = window.open('', '_blank');
                              if (teacher.documentBase64.startsWith('data:image/')) {
                                newWindow.document.write(`
                                  <html>
                                    <head><title>${teacher.documentName}</title></head>
                                    <body style="margin:0;padding:20px;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f5f5f5;">
                                      <img src="${teacher.documentBase64}" style="max-width:100%;max-height:90vh;box-shadow:0 4px 6px rgba(0,0,0,0.1);" />
                                    </body>
                                  </html>
                                `);
                              } else {
                                newWindow.document.write(`
                                  <html>
                                    <head><title>${teacher.documentName}</title></head>
                                    <body style="margin:0;padding:20px;display:flex;flex-direction:column;align-items:center;min-height:100vh;background:#f5f5f5;">
                                      <p style="margin-bottom:20px;color:#666;">Document: ${teacher.documentName}</p>
                                      <iframe src="${teacher.documentBase64}" style="width:100%;height:80vh;border:none;box-shadow:0 4px 6px rgba(0,0,0,0.1);"></iframe>
                                    </body>
                                  </html>
                                `);
                              }
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View Full Document
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-6">
                      <button
                        onClick={() => handleApprove(teacher.id)}
                        disabled={processing[teacher.id] === 'approving'}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing[teacher.id] === 'approving' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Approving...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <span>Approve</span>
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={() => handleDeny(teacher.id)}
                        disabled={processing[teacher.id] === 'denying'}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processing[teacher.id] === 'denying' ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Denying...</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            <span>Deny</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
