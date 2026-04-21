'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, initializing } = useAuth();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '' });

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
      
      // Auth Context will handle the redirect automatically based on user data
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

  // Show already logged in message
  if (user) {
    return (
      <div className="bg-[#FBFBFD] text-zinc-500 font-['Inter'] min-h-screen flex items-center justify-center px-6 py-20">
        <div className="text-center">
          <div className="w-full max-w-md">
            <div className="soft-card p-12 rounded-[2.5rem] bg-white border border-zinc-100 shadow-sm">
              <div className="text-center mb-12">
                <span className="inline-block px-6 py-3 soft-card rounded-full text-xs font-medium text-zinc-500 uppercase tracking-widest mb-8 border border-zinc-50 bg-[#F5F5F7]">
                  Already Logged In
                </span>
                <h2 className="text-4xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em]">
                  Welcome Back!
                </h2>
                <p className="text-zinc-600">You are already logged in as {user.email}</p>
              </div>

              <div className="mt-6">
                <button
                  onClick={() => router.push('/')}
                  className="w-full py-4 bg-[#1D1D1F] text-white font-semibold rounded-full mt-4 hover:opacity-90 shadow-lg shadow-black/10"
                >
                  Go to Homepage
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
    <div className="bg-[#FBFBFD] text-zinc-500 font-['Inter'] min-h-screen flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        <div className="soft-card p-12 rounded-[2.5rem] bg-white border border-zinc-100 shadow-sm">
          <div className="text-center mb-12">
            <span className="inline-block px-6 py-3 soft-card rounded-full text-xs font-medium text-zinc-500 uppercase tracking-widest mb-8 border border-zinc-50 bg-[#F5F5F7]">
              Secure Login
            </span>
            <h2 className="text-4xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em]">
              Welcome Back.
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
              <input 
                type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@example.com"
                className="w-full px-5 py-4 bg-[#F5F5F7] rounded-2xl text-[#1D1D1F] outline-none focus:ring-2 focus:ring-black/5 transition-all"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest ml-1">Password</label>
                <Link href="#" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">Forgot?</Link>
              </div>
              <input 
                type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••"
                className="w-full px-5 py-4 bg-[#F5F5F7] rounded-2xl text-[#1D1D1F] outline-none focus:ring-2 focus:ring-black/5 transition-all"
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-4 bg-[#1D1D1F] text-white font-semibold rounded-full mt-4 hover:opacity-90 shadow-lg shadow-black/10"
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
