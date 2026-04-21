'use client';

import { useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import DashboardLayout from '@/components/Sidebar';

export default function StudentLayout({ children }) {
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Set user as online when component mounts
    const setUserOnline = async () => {
      try {
        // Note: This assumes users collection exists with uid as document ID
        // You may need to adjust the path based on your actual Firestore structure
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          isOnline: true,
          lastSeen: serverTimestamp()
        });
        console.log('User set as online');
      } catch (error) {
        console.error('Error setting user online:', error);
      }
    };

    // Set user as offline when component unmounts or user leaves
    const setUserOffline = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        });
        console.log('User set as offline');
      } catch (error) {
        console.error('Error setting user offline:', error);
      }
    };

    setUserOnline();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setUserOffline();
      } else {
        setUserOnline();
      }
    };

    // Handle beforeunload (when user closes tab)
    const handleBeforeUnload = () => {
      setUserOffline();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      setUserOffline();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return <DashboardLayout userType="student">{children}</DashboardLayout>;
}