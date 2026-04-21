'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import DashboardLayout from '@/components/Sidebar';

export default function TeacherLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('none');

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.push('/login');
          return;
        }

        // Check user document and verification status
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          router.push('/login');
          return;
        }

        const userData = userDoc.data();
        
        // Check if user is a teacher
        if (userData.role !== 'Teacher') {
          router.push('/login');
          return;
        }

        const verified = userData.isVerified || false;
        const status = userData.verificationStatus || 'none';

        setIsVerified(verified);
        setVerificationStatus(status);

        // Redirect based on verification status
        if (!verified) {
          if (status === 'none') {
            router.push('/teacher-onboarding');
            return;
          } else if (status === 'pending') {
            router.push('/teacher-verification-pending');
            return;
          } else if (status === 'denied') {
            router.push('/teacher-denied');
            return;
          }
        }

      } catch (error) {
        console.error('Error checking verification:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkVerification();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  // Only render dashboard layout if verified
  if (isVerified && verificationStatus === 'approved') {
    return <DashboardLayout userType="teacher">{children}</DashboardLayout>;
  }

  // This should not be reached due to redirects above, but as a fallback
  return (
    <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
      <div className="text-zinc-500">Redirecting...</div>
    </div>
  );
}