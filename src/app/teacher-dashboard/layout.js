'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import DashboardLayout from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function TeacherLayout({ children }) {
  const router = useRouter();
  const { user, loading, initializing } = useAuth();

  // Show loading screen while initializing auth
  if (initializing) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em]">
            SmartLearn
          </h2>
          <p className="text-zinc-600 mt-2">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em]">
            SmartLearn
          </h2>
          <p className="text-zinc-600 mt-2">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Check if user is logged in and is a teacher
  if (!user) {
    console.log('No user found, redirecting to login');
    router.push('/login');
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em]">
            SmartLearn
          </h2>
          <p className="text-zinc-600 mt-2">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check if user is a teacher
  if (user.role !== 'Teacher') {
    console.log('User is not a teacher, redirecting to login');
    router.push('/login');
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em]">
            SmartLearn
          </h2>
          <p className="text-zinc-600 mt-2">Access denied. Redirecting...</p>
        </div>
      </div>
    );
  }

  // Render dashboard layout for authenticated teacher
  return <DashboardLayout userType="teacher">{children}</DashboardLayout>;
}
