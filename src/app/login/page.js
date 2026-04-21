'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, initializing } = useAuth();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [redirectPath, setRedirectPath] = useState('/');

  // Dynamic button logic - detect where user was and offer to take them back
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      
      // If user is on a teacher-related path, redirect to teacher dashboard
      if (currentPath.includes('/teacher') || currentPath.includes('/courses')) {
        setRedirectPath('/teacher-dashboard');
      } 
      // If user is on a student-related path, redirect to student dashboard
      else if (currentPath.includes('/student')) {
        setRedirectPath('/student-dashboard');
      }
      // Default to homepage
      else {
        setRedirectPath('/');
      }
    }
  }, []);

  // Auth-aware redirection - if user exists, redirect to appropriate dashboard
  useEffect(() => {
    if (user && !loading && !initializing) {
      // If auth.currentUser exists, ensure the button primary action is to return to the specific dashboard
      if (user.role === 'Teacher') {
        setRedirectPath('/teacher-dashboard');
      } else if (user.role === 'Student') {
        setRedirectPath('/student-dashboard');
      }
    }
  }, [user, loading, initializing]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = (formData.email || '').trim();
    const password = formData.password || '';

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful for user:', userCredential.user.email);
      
      // Get user data and create document if it doesn't exist
      try {
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
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
          // Auto-create user document for new users
          console.log('User document not found, creating new document');
          await setDoc(userDocRef, {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            role: 'student',
            subscriptionPlan: 'free',
            hasSelectedPlan: false,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString()
          });
          
          console.log('User document created, redirecting to subscribe');
          router.push('/subscribe');
        }
      } catch (error) {
        console.error('Error fetching/creating user data:', error);
        router.push('/subscribe');
      }
      
      setError('');
    } catch (err) {
      console.error('Auth login error:', err);
      setError(friendlyAuthError(err));
    }
  };

  // Show loading screen while initializing auth
  if (initializing) {
    return (
      <div className="bg-[#FBFBFD] text-zinc-500 font-['Inter'] min-h-screen flex items-center justify-center px-6 py-20">
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
      <div className="bg-[#FBFBFD] text-zinc-500 font-['Inter'] min-h-screen flex items-center justify-center px-6 py-20">
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

  // Show already logged in message with dynamic button logic
  if (user) {
    // Dynamic button text based on redirect path
    const getButtonText = () => {
      if (redirectPath === '/teacher-dashboard') return 'Back to Dashboard';
      if (redirectPath === '/student-dashboard') return 'Back to Dashboard';
      if (redirectPath.includes('/courses')) return 'Back to Courses';
      return 'Go to Homepage';
    };

    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-20">
        <div className="text-center">
          <div className="w-full max-w-md">
            <div className="bg-white p-8 rounded-[24px] shadow-sm">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="inline-block px-4 py-2 bg-zinc-50 rounded-full text-xs font-medium text-zinc-400 uppercase tracking-tight mb-6">
                  Already Logged In
                </span>
                <h2 className="text-4xl font-bold text-black font-serif tracking-tight mb-4">
                  Welcome Back!
                </h2>
                <p className="text-zinc-400 text-lg">You are already logged in as {user.email}</p>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => router.push(redirectPath)}
                  className="w-full py-4 bg-black text-white font-semibold rounded-xl hover:bg-zinc-900 transition-all duration-200"
                >
                  {getButtonText()}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show login form for non-logged in users
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 rounded-[24px] shadow-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <span className="inline-block px-4 py-2 bg-zinc-50 rounded-full text-xs font-medium text-zinc-400 uppercase tracking-tight mb-6">
              Secure Login
            </span>
            <h2 className="text-4xl font-bold text-black font-serif tracking-tight mb-4">
              Welcome Back.
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center font-medium">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-tight ml-1">Email Address</label>
              <input 
                type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com"
                className="w-full px-5 py-4 bg-zinc-100/50 rounded-xl text-black outline-none focus:bg-white focus:ring-2 focus:ring-black/5 border border-transparent focus:border-zinc-200 transition-all duration-200"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-tight ml-1">Password</label>
                <Link href="#" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors duration-200">Forgot?</Link>
              </div>
              <input 
                type="password" name="password" value={formData.password} onChange={handleChange} placeholder="..."
                className="w-full px-5 py-4 bg-zinc-100/50 rounded-xl text-black outline-none focus:bg-white focus:ring-2 focus:ring-black/5 border border-transparent focus:border-zinc-200 transition-all duration-200"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-4 bg-black text-white font-semibold rounded-xl hover:bg-zinc-900 transition-all duration-200"
            >
              Sign In
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-sm text-zinc-400">
              New to SmartLearn? {' '}
              <Link href="/signup" className="text-[#1D1D1F] font-medium hover:text-black transition-colors underline decoration-zinc-200 underline-offset-4">Create Account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function friendlyAuthError(err) {
  const code = err?.code || '';
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (code === 'auth/user-not-found') return 'No account found for this email address.';
  if (code === 'auth/invalid-email') return 'Please enter a valid email address.';
  if (code === 'auth/user-disabled') return 'This account has been disabled. Please contact support.';
  if (code === 'auth/too-many-requests') {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  return 'Login failed. Please try again.';
}
