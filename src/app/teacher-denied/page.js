'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle, Mail, LogOut, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase';

export default function TeacherDenied() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl border border-zinc-100 p-12 max-w-md w-full text-center shadow-sm">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-[#1D1D1F] mb-4">
          Application Denied
        </h1>

        {/* Message */}
        <div className="space-y-4 mb-8">
          <p className="text-zinc-600 text-lg">
            Your application was denied. Please contact support.
          </p>
          <p className="text-zinc-500">
            We encourage you to reach out to our support team for more information about the decision and next steps.
          </p>
        </div>

        {/* Contact Info */}
        <div className="bg-zinc-50 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-600 mb-2">
            <Mail className="w-4 h-4" />
            <span>Contact Support</span>
          </div>
          <p className="text-zinc-700 font-medium">support@smartlearn.com</p>
          <p className="text-zinc-500 text-sm mt-1">
            Please include your email and teacher ID in your message
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Check Status
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-zinc-200 text-zinc-600 rounded-xl font-medium hover:bg-zinc-50 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        {/* Info */}
        <div className="mt-8 pt-8 border-t border-zinc-100">
          <p className="text-xs text-zinc-400">
            If you believe this is an error, please contact our support team immediately.
          </p>
        </div>
      </div>
    </div>
  );
}
