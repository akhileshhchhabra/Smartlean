'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, AlertCircle, User, Send, Sparkles } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
  const [documentBase64, setDocumentBase64] = useState('');
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
      // Constraint: If file > 800KB, alert 'File too large'
      if (file.size > 800000) {
        alert('File too large');
        return;
      }

      setSelectedFile(file);
      setError('');
      
      // Logic: Convert uploaded file to a Base64 string
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target.result;
        setDocumentBase64(base64);
      };
      reader.readAsDataURL(file);
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
      // Validation
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

      // Firestore: Save documentBase64, verificationStatus: 'pending', and isVerified: false to current user's document
      console.log('Saving Base64 document to Firestore...');
      
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        verificationStatus: 'pending',
        isVerified: false,
        documentBase64: documentBase64,
        documentName: selectedFile.name,
        documentSize: selectedFile.size,
        documentType: selectedFile.type,
        fullName: formData.fullName.trim(),
        expertise: formData.expertise.trim(),
        bio: formData.bio.trim(),
        submittedAt: serverTimestamp()
      });
      
      console.log('Firestore updated successfully with Base64 document');

      // Success UI: Show a clean 'Application Pending' screen after submit
      setStep('success');

    } catch (error) {
      // Error Tracking: Add try-catch to all Firestore operations and use alert() to show any errors
      alert('Error Code: ' + error.code + '\nMessage: ' + error.message);
      console.error('FIREBASE_ERROR:', error.code, error.message);
      setError(error.message || 'Registration failed');
    } finally {
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
          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <div className="w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-3xl font-bold text-[#1D1D1F] mb-4">Application Pending</h2>
          <p className="text-zinc-600 text-lg mb-6">
            Your application has been submitted and is currently under review.
          </p>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 text-sm">
                <strong>Status:</strong> Pending Review
              </p>
            </div>
            <div className="text-sm text-zinc-500">
              We'll notify you within 2-3 business days.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD] py-12 px-8">
      <div className="max-w-2xl mx-auto">
        {/* Premium Apple-style Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-zinc-900 to-zinc-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#1D1D1F] mb-3">Become a Teacher</h1>
          <p className="text-zinc-600 text-lg">Join our community of expert educators</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-8">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Premium Apple-style Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-zinc-100 p-10 shadow-xl">
          <div className="space-y-8">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-zinc-800 mb-3">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-5 py-4 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent text-base transition-all"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Expertise */}
            <div>
              <label className="block text-sm font-semibold text-zinc-800 mb-3">
                Area of Expertise
              </label>
              <input
                type="text"
                name="expertise"
                value={formData.expertise}
                onChange={handleInputChange}
                className="w-full px-5 py-4 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent text-base transition-all"
                placeholder="e.g., Mathematics, Physics, Chemistry"
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-semibold text-zinc-800 mb-3">
                Professional Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={5}
                className="w-full px-5 py-4 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent resize-none text-base transition-all"
                placeholder="Tell us about your teaching experience and qualifications..."
                required
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-zinc-800 mb-3">
                Verification Document
              </label>
              <div className="relative">
                <div className="w-full px-5 py-4 border-2 border-dashed border-zinc-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-transparent text-base transition-all bg-zinc-50 hover:bg-zinc-100 cursor-pointer">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  <div className="flex items-center justify-center gap-3">
                    <Upload className="w-5 h-5 text-zinc-400" />
                    <span className="text-zinc-600">
                      {selectedFile ? selectedFile.name : 'Choose file or drag and drop'}
                    </span>
                  </div>
                </div>
                {selectedFile && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-zinc-600 bg-zinc-50 rounded-xl p-3">
                    <FileText className="w-4 h-4" />
                    <span>{selectedFile.name}</span>
                    <span className="text-xs text-zinc-400 ml-auto">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Premium Submit Button */}
          <div className="mt-10">
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-2xl font-semibold text-base hover:from-zinc-800 hover:to-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Note */}
        <div className="text-center mt-8">
          <p className="text-zinc-500 text-sm">
            Maximum file size: 800KB • Supported formats: PDF, DOC, DOCX, JPG, PNG
          </p>
        </div>
      </div>
    </div>
  );
}
