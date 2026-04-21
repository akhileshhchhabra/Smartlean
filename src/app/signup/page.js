'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Student',
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Save user details to Firestore 'users' collection
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        subscriptionPlan: formData.role === 'Student' ? 'free' : null,
        hasSelectedPlan: formData.role === 'Student' ? false : null,
        createdAt: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => {
        router.push(formData.role === 'Student' ? '/subscribe' : '/login');
      }, 2000);
    } catch (err) {
      setError(err.message.includes('auth/') ? err.message.split('auth/')[1] : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#FBFBFD] text-zinc-500 font-['Inter'] min-h-screen flex items-center justify-center px-6 py-20">
      
      <div className="w-full max-w-lg">
        <div className="soft-card p-12 md:p-14 rounded-[2.5rem]">
          
          <div className="text-center mb-12">
            <span className="inline-block px-6 py-3 soft-card rounded-full text-xs font-medium text-zinc-500 uppercase tracking-widest mb-8">
              Start Your Journey
            </span>
            <h2 className="text-4xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em]">
              Create Account.
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {success && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-2xl text-green-700 text-sm text-center">
                Account created successfully! Redirecting to {formData.role === 'Student' ? 'subscription page...' : 'login...'}
              </div>
            )}
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            {!success && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      type="text" 
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="John Doe" 
                      className="w-full px-5 py-4 bg-[#F5F5F7] rounded-2xl text-[#1D1D1F] placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all" 
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest ml-1">Role</label>
                    <select 
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full px-5 py-4 bg-[#F5F5F7] rounded-2xl text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-black/5 transition-all appearance-none"
                    >
                      <option value="Student">Student</option>
                      <option value="Teacher">Teacher</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest ml-1">Email Address</label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@example.com" 
                    className="w-full px-5 py-4 bg-[#F5F5F7] rounded-2xl text-[#1D1D1F] placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all" 
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest ml-1">Create Password</label>
                  <input 
                    type="password" 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••" 
                    className="w-full px-5 py-4 bg-[#F5F5F7] rounded-2xl text-[#1D1D1F] placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all" 
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full py-4 matte-btn font-semibold rounded-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Processing...' : 'Create Account'}
                </button>
              </>
            )}
          </form>

          <p className="mt-12 text-center text-sm text-zinc-400">
            Already have an account? {' '}
            <Link href="/login" className="text-[#1D1D1F] font-medium hover:text-black transition-colors">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}