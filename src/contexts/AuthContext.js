'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      
      if (user) {
        // User is logged in, fetch user data
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({ ...user, ...userData });
            
            // Redirect based on role
            if (userData.role === 'Teacher') {
              console.log('Redirecting teacher to dashboard');
              router.push('/teacher-dashboard');
            } else if (userData.role === 'Student') {
              if (userData.hasSelectedPlan === true) {
                console.log('Redirecting student to dashboard');
                router.push('/student-dashboard');
              } else {
                console.log('Redirecting student to subscribe');
                router.push('/subscribe');
              }
            } else {
              console.log('Redirecting other to subscribe');
              router.push('/subscribe');
            }
          } else {
            console.log('User document not found, redirecting to subscribe');
            setUser(user);
            router.push('/subscribe');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setUser(user);
          setLoading(false);
        }
      } else {
        // User is logged out
        setUser(null);
        setLoading(false);
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
