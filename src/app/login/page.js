'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();

        // 1. Check for Teacher
        if (userData.role === 'Teacher') {
          router.push('/teacher-dashboard');
          return;
        }

        // 2. Check for Student Subscription
        if (userData.role === 'Student') {
          if (userData.hasSelectedPlan === true) {
            router.push('/student-dashboard');
          } else {
            // Agar hasSelectedPlan false hai ya nahi hai
            router.push('/subscribe');
          }
        } else {
          router.push('/student-dashboard');
        }
      } else {
        // Fallback agar doc nahi hai
        router.push('/subscribe');
      }
    } catch (err) {
      console.error('Auth login error:', err);
      setError(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  };

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
                type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••"
                className="w-full px-5 py-4 bg-[#F5F5F7] rounded-2xl text-[#1D1D1F] outline-none focus:ring-2 focus:ring-black/5 transition-all"
              />
            </div>

            <button 
              type="submit" disabled={loading}
              className="w-full py-4 bg-[#1D1D1F] text-white font-semibold rounded-full mt-4 disabled:opacity-50 transition-all hover:opacity-90 shadow-lg shadow-black/10"
            >
              {loading ? 'Processing...' : 'Sign In'}
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