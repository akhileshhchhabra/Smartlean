'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Mail, LogOut, RefreshCw } from 'lucide-react';
import { auth } from '@/lib/firebase';

export default function TeacherVerificationPending() {
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

      try {
        // Check if user is verified (in case they were verified while on this page)
        const response = await fetch('/api/check-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid: currentUser.uid }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.isVerified) {
            router.push('/teacher-dashboard');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking verification status:', error);
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
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <Clock className="w-10 h-10 text-amber-600" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-[#1D1D1F] mb-4">
          Verification in Progress
        </h1>

        {/* Message */}
        <div className="space-y-4 mb-8">
          <p className="text-zinc-600 text-lg">
            Your verification documents are under review
          </p>
          <p className="text-zinc-500">
            Our admin team is reviewing your submission. This typically takes 24-48 hours.
          </p>
          <p className="text-zinc-500 text-sm">
            You'll receive an email notification once the review is complete.
          </p>
        </div>

        {/* Status Timeline */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-zinc-600">Submitted</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-zinc-600">Under Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-zinc-300 rounded-full"></div>
              <span className="text-sm text-zinc-400">Approved</span>
            </div>
          </div>
          <div className="w-full bg-zinc-200 rounded-full h-2">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: '50%' }}></div>
          </div>
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

        {/* Contact Info */}
        <div className="mt-8 pt-8 border-t border-zinc-100">
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
            <Mail className="w-4 h-4" />
            <span>Need help? Contact support@smartlearn.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}
