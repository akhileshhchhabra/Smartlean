'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, AlertCircle, User, Send } from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function TeacherOnboarding() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState('form');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    expertise: '',
    bio: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Validation: Check if a file is actually selected
      if (!selectedFile) {
        alert('Please upload a document first.');
        return;
      }

      if (!formData.fullName || !formData.expertise || !formData.bio) {
        alert('Please fill in all required fields.');
        return;
      }

      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert('Please log in first.');
        return;
      }

      // Storage Upload: Use uploadBytes to save file to verification_docs/${user.uid}
      console.log('Starting file upload...');
      const fileName = `${currentUser.uid}_${Date.now()}_${selectedFile.name}`;
      const storageRef = ref(storage, `verification_docs/${currentUser.uid}/${fileName}`);
      
      const uploadSnapshot = await uploadBytes(storageRef, selectedFile);
      console.log('File uploaded successfully');

      // Get URL: Wait for upload to finish, then fetch downloadURL
      const downloadURL = await getDownloadURL(uploadSnapshot.ref);
      console.log('Download URL obtained:', downloadURL);

      // Firestore Update: Use updateDoc to save required fields
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        verificationStatus: 'pending',
        documentUrl: downloadURL,
        isVerified: false,
        fullName: formData.fullName.trim(),
        expertise: formData.expertise.trim(),
        bio: formData.bio.trim(),
        submittedAt: serverTimestamp()
      });
      console.log('Firestore updated successfully');

      // Success Step: After submission, immediately switch to success UI
      setStep('success');

    } catch (error) {
      // Error Tracking: Use try-catch with alert(error.message) for debugging
      console.error("FIREBASE_ERROR:", error.code, error.message);
      alert(error.message || 'Registration failed');
      setError(error.message || 'Registration failed');
    } finally {
      // Safety: Ensure setSubmitting(false) is always called
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-zinc-500">Please log in to continue.</div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl border border-zinc-100 p-12 max-w-md w-full text-center shadow-sm">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-[#1D1D1F] mb-4">Submission Received!</h2>
          <p className="text-zinc-600 text-lg mb-6">
            Admin will review your profile in 2-3 hours. You will get access once approved.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
            >
              <User className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD] py-8 px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">Teacher Verification</h1>
          <p className="text-zinc-600">Submit your documents for admin verification</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-zinc-100 p-8 shadow-sm">
          <div className="space-y-6">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Expertise */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Area of Expertise
              </label>
              <input
                type="text"
                name="expertise"
                value={formData.expertise}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent"
                placeholder="e.g., Mathematics, Physics, Chemistry"
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Professional Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent resize-none"
                placeholder="Tell us about your teaching experience and qualifications..."
                required
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Verification Document
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  className="w-full px-4 py-3 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-zinc-50 file:text-zinc-700 hover:file:bg-zinc-100"
                  required
                />
                {selectedFile && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-zinc-600">
                    <FileText className="w-4 h-4" />
                    <span>{selectedFile.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit for Verification</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
