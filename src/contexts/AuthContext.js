'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { setPersistence, browserLocalPersistence } from 'firebase/auth';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Set Firebase persistence to keep user logged in across sessions
    const setupAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);
        console.log('Firebase persistence set to browserLocal');
      } catch (error) {
        console.error('Error setting persistence:', error);
      }
    };

    setupAuth();

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      
      if (user) {
        // User is logged in, fetch user data
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isSubscribed = userData.subscriptionStatus === 'active' && 
                              userData.subscriptionExpiry && 
                              new Date() <= new Date(userData.subscriptionExpiry);
            
            // Store subscription status in localStorage for persistence
            if (typeof window !== 'undefined') {
              localStorage.setItem('isSubscribed', isSubscribed.toString());
              localStorage.setItem('subscriptionExpiry', userData.subscriptionExpiry || '');
            }
            
            setUser({ 
              ...user, 
              ...userData,
              isSubscribed,
              subscriptionStatus: userData.subscriptionStatus || 'inactive',
              subscriptionExpiry: userData.subscriptionExpiry || null
            });
          } else {
            console.log('User document not found');
            setUser(user);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(user);
        }
      } else {
        // User is logged out
        setUser(null);
      }
      
      setInitializing(false);
      setLoading(false);
    });

    return unsubscribe;
  }, [router]);

  const value = {
    user,
    loading,
    initializing
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
