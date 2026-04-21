'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import DashboardLayout from '@/components/Sidebar';

export default function TeacherLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.push('/login');
          return;
        }

        // Check user document
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

        // Any authenticated teacher should have full access to /teacher/* routes
        // No verification checks needed

      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  // Render dashboard layout for any authenticated teacher with Apple-style transitions
  return <DashboardLayout userType="teacher">{children}</DashboardLayout>;
}
