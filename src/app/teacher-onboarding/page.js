'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, CheckCircle, AlertCircle, User, BookOpen, Send, Clock, LogOut } from 'lucide-react';
import { auth, db, storage } from '@/lib/firebase';
import { collection, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from 'firebase/storage';

export default function TeacherOnboarding() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    expertise: '',
    bio: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        router.push('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Check if already verified
          if (userData.isVerified) {
            router.push('/teacher-dashboard');
            return;
          }
          
          // Check if already submitted for verification
          if (userData.verificationStatus === 'pending') {
            router.push('/teacher-verification-pending');
            return;
          }
          
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking user:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF, JPG, or PNG file.');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB.');
        return;
      }
      
      setSelectedFile(file);
      setError('');
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        setFilePreview(preview);
      } else {
        setFilePreview(null);
      }
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
    
    // Clear previous errors
    setError('');
    
    // ============================================
    // VALIDATION: Check if file is selected
    // ============================================
    if (!selectedFile) {
      alert('Please upload a document first.');
      return;
    }
    
    // Validate form fields
    if (!formData.fullName || !formData.expertise || !formData.bio) {
      setError('Please fill in all required fields.');
      return;
    }
    
    setSubmitting(true);
    
    try {
      console.log('🚀 Starting verification submission...');
      
      // Get authenticated user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.error("FIREBASE_ERROR:", 'NO_AUTH', 'No authenticated user found');
        alert('No authenticated user found. Please log in again.');
        return;
      }
      
      console.log('✅ User authenticated:', currentUser.uid);
      
      // ============================================
      // STEP 1: STORAGE UPLOAD
      // ============================================
      console.log('📤 Step 1: Uploading file to Firebase Storage...');
      
      // Create unique file name with user ID and timestamp
      const fileName = `${currentUser.uid}_${Date.now()}_${selectedFile.name}`;
      console.log('📁 File name:', fileName);
      console.log('📏 File size:', `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Create storage reference with proper path
      const storageRef = ref(storage, `verification_docs/${currentUser.uid}/${fileName}`);
      console.log('🗂️ Storage ref created:', `verification_docs/${currentUser.uid}/${fileName}`);
      
      // Upload file to Firebase Storage using uploadBytes
      console.log('⬆️ Starting upload...');
      const uploadSnapshot = await uploadBytes(storageRef, selectedFile);
      console.log('✅ Step 1 Complete: File uploaded to Storage');
      
      // ============================================
      // STEP 2: GET URL
      // ============================================
      console.log('🔗 Step 2: Getting download URL...');
      
      // Wait for upload to finish, then fetch downloadURL
      const downloadURL = await getDownloadURL(uploadSnapshot.ref);
      console.log('✅ Step 2 Complete: Download URL obtained:', downloadURL);
      
      // ============================================
      // STEP 3: FIRESTORE UPDATE
      // ============================================
      console.log('💾 Step 3: Updating Firestore user document...');
      
      // Update user document in Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      const updateData = {
        verificationStatus: 'pending',
        documentUrl: downloadURL,
        isVerified: false,
        fullName: formData.fullName.trim(),
        expertise: formData.expertise.trim(),
        bio: formData.bio.trim(),
        documentFileName: fileName,
        documentSize: selectedFile.size,
        documentType: selectedFile.type,
        submittedAt: serverTimestamp()
      };
      
      console.log('📝 Update data:', {
        verificationStatus: updateData.verificationStatus,
        documentUrl: downloadURL.substring(0, 50) + '...',
        isVerified: updateData.isVerified
      });
      
      await updateDoc(userRef, updateData);
      console.log('✅ Step 3 Complete: Firestore document updated successfully');
      
      // ============================================
      // STEP 4: SUCCESS FEEDBACK
      // ============================================
      console.log('🎉 All steps completed successfully!');
      
      // On success, set isSubmitted state to true
      setIsSubmitted(true);
      
    } catch (error) {
      // ============================================
      // ERROR TRACKING: Crucial logging and alert
      // ============================================
      console.error("FIREBASE_ERROR:", error.code, error.message);
      console.error("FULL_ERROR:", error);
      
      // User Alert: Show specific Firebase error message
      if (error.code && error.message) {
        alert(`Firebase Error (${error.code}): ${error.message}`);
      } else if (error.message) {
        alert(`Error: ${error.message}`);
      } else {
        alert('Registration failed. Please try again.');
      }
      
      // Also set error state for UI
      setError(`Error: ${error.message || 'Registration failed'}`);
      
    } finally {
      // ============================================
      // SAFETY: Always reset submitting state
      // ============================================
      setSubmitting(false);
      console.log('🔄 Submitting state reset - button unlocked');
      console.log('🏁 Submission process completed');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl border border-zinc-100 p-12 max-w-md w-full text-center shadow-sm">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1F] mb-4">Submitted!</h2>
          <p className="text-zinc-600 text-lg mb-6">
            Admin will review your application in 2-3 hours.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/teacher-dashboard')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-medium hover:bg-zinc-800 transition-colors"
            >
              <User className="w-4 h-4" />
              Go to Dashboard
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-100 text-zinc-700 rounded-xl font-medium hover:bg-zinc-200 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl border border-zinc-100 p-12 max-w-md w-full text-center shadow-sm">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-[#1D1D1F] mb-4">Application Submitted!</h2>
          <p className="text-zinc-600 text-lg mb-6">
            Your application has been submitted successfully! It will be reviewed (Approved or Denied) by the Admin. Please check back in 2-3 hours.
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
              <Clock className="w-4 h-4" />
              <span>Review time: 2-3 hours</span>
            </div>
            
            <button
              onClick={async () => {
                try {
                  await auth.signOut();
                  router.push('/login');
                } catch (error) {
                  console.error('Error signing out:', error);
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFD] py-16 px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-[#1D1D1F] mb-4">Teacher Verification</h1>
          <p className="text-zinc-600 text-lg">
            Complete your profile to start teaching on our platform
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-zinc-100 p-10 shadow-sm">
          <div className="space-y-8">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-3">
                Full Name
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 transition-all"
                placeholder="Enter your full name"
                required
              />
            </div>

            {/* Expertise */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-3">
                Area of Expertise
              </label>
              <input
                type="text"
                name="expertise"
                value={formData.expertise}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 transition-all"
                placeholder="e.g., Mathematics, Physics, Computer Science"
                required
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-3">
                Professional Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 bg-white border border-zinc-200 rounded-xl outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5 transition-all resize-none"
                placeholder="Tell us about your teaching experience and qualifications..."
                required
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-3">
                Verification Document
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="document-upload"
                />
                <label
                  htmlFor="document-upload"
                  className="block w-full border-2 border-dashed border-zinc-300 rounded-2xl cursor-pointer hover:border-zinc-400 transition-colors relative overflow-hidden"
                >
                  {filePreview ? (
                    <div className="p-8">
                      <img
                        src={filePreview}
                        alt="Document preview"
                        className="w-full h-48 object-cover rounded-xl mb-4"
                      />
                      <div className="text-center">
                        <FileText className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                        <p className="text-sm text-zinc-600">{selectedFile.name}</p>
                        <p className="text-xs text-zinc-500 mt-1">Click to change file</p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <Upload className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-zinc-700 mb-2">
                        Upload verification document
                      </p>
                      <p className="text-sm text-zinc-500 mb-4">
                        PDF, JPG, or PNG (max 5MB)
                      </p>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-lg">
                        <Upload className="w-4 h-4" />
                        Choose File
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-zinc-900 text-white py-4 rounded-xl font-semibold hover:bg-zinc-800 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit for Verification
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Section */}
        <div className="mt-8 text-center">
          <p className="text-sm text-zinc-500">
            Your documents will be reviewed by our admin team within 24-48 hours.
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            We'll notify you once your verification is complete.
          </p>
        </div>
      </div>
    </div>
  );
}
