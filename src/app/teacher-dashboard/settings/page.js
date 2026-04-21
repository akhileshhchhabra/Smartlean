'use client';

import { useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, updateEmail } from 'firebase/auth';
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Bell, Monitor, Award, Edit2, Save, LogOut, GraduationCap, Briefcase, Users, Eye, EyeOff } from 'lucide-react';
import { auth, db } from '@/lib/firebase';

export default function TeacherSettingsPage() {
  // Authentication & State Logic
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('profile');
  const [editMode, setEditMode] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    email: '',
    department: '',
    expertise: []
  });

  // Notification & Settings states
  const [notifications, setNotifications] = useState({
    email: true,
    desktop: false,
    students: true,
    publicProfile: false
  });

  const [notification, setNotification] = useState(null);

  // Show notification helper
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch user data and pre-fill states
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserProfile(userData);
            
            // Pre-fill form with user data
            setFormData({
              name: userData.name || user.displayName || '',
              bio: userData.bio || '',
              email: user.email || '',
              department: userData.department || '',
              expertise: userData.expertise || []
            });
            
            // Pre-fill notification settings
            setNotifications(userData.settings || {
              email: true,
              desktop: false,
              students: true,
              publicProfile: false
            });
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Save profile changes
  const handleSaveProfile = useCallback(async () => {
    if (!currentUser || !formData.name.trim()) return;
    
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        department: formData.department.trim(),
        expertise: formData.expertise,
        updatedAt: new Date()
      });
      
      setUserProfile(prev => ({
        ...prev,
        name: formData.name.trim(),
        bio: formData.bio.trim(),
        department: formData.department.trim(),
        expertise: formData.expertise
      }));
      
      setEditMode(false);
      showNotification('Settings updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  }, [currentUser, formData]);

  // Email update logic
  const handleUpdateEmail = useCallback(async () => {
    if (!currentUser || !formData.email.trim()) return;
    
    setSaving(true);
    try {
      await updateEmail(currentUser, formData.email.trim());
      showNotification('Email updated successfully!');
      setFormData(prev => ({ ...prev, email: currentUser.email }));
    } catch (error) {
      console.error('Error updating email:', error);
      showNotification('Failed to update email', 'error');
    } finally {
      setSaving(false);
    }
  }, [currentUser, formData.email]);

  // Notification & Account Switches
  const toggleNotification = useCallback((type) => {
    setNotifications(prev => ({ ...prev, [type]: !prev[type] }));
    // Save to Firestore
    if (currentUser) {
      updateDoc(doc(db, 'users', currentUser.uid), {
        settings: {
          ...notifications,
          [type]: !notifications[type]
        }
      }).catch(console.error);
    }
  }, [currentUser, notifications]);

  // Logout logic
  const handleLogout = async () => {
    try {
      await auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Expertise tags
  const availableExpertise = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology',
    'Computer Science', 'Engineering', 'Business',
    'Literature', 'History', 'Psychology',
    'Art & Design', 'Music', 'Languages'
  ];

  // Toggle expertise tag
  const toggleExpertise = (tag) => {
    setFormData(prev => ({
      ...prev,
      expertise: prev.expertise.includes(tag)
        ? prev.expertise.filter(t => t !== tag)
        : [...prev.expertise, tag]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Floating Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={"fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg border " + 
              (notification.type === 'success' 
                ? 'bg-green-500 text-white border-green-600' 
                : 'bg-red-500 text-white border-red-600')
            }
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' ? (
                <Save className="h-5 w-5" />
              ) : (
                <div className="h-5 w-5 flex items-center justify-center">
                  <span className="text-lg">!</span>
                </div>
              )}
              <p className="font-medium">{notification.message}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto py-20 px-6">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-4xl font-black text-black mb-4">Settings</h1>
          <p className="text-zinc-600 text-lg">Manage your profile and teaching preferences</p>
        </div>

        {/* Settings Navigation */}
        <div className="flex space-x-2 mb-8 border-b border-zinc-100">
          {['profile', 'security', 'notifications', 'points'].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={"px-6 py-3 font-medium transition-all duration-200 " + 
                (activeSection === section
                  ? 'text-black border-b-2 border-black'
                  : 'text-zinc-600 hover:text-black border-b-2 border-transparent')
              }
            >
              {section === 'profile' && <User className="h-4 w-4 mr-2" />}
              {section === 'security' && <Lock className="h-4 w-4 mr-2" />}
              {section === 'notifications' && <Bell className="h-4 w-4 mr-2" />}
              {section === 'points' && <Award className="h-4 w-4 mr-2" />}
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-16">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-black flex items-center gap-3">
                  <User className="h-6 w-6" />
                  Profile
                </h2>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="px-4 py-2 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-all duration-200 flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  {editMode ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Avatar */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full bg-zinc-200 flex items-center justify-center border-4 border-zinc-300 overflow-hidden">
                      <User className="h-12 w-12 text-zinc-400" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button className="w-full h-full bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors duration-200 flex items-center justify-center">
                        <Edit2 className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-600 mt-3">Click to change avatar</p>
                </div>

                {/* Profile Fields */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-black mb-3">Full Name</label>
                    <input
                      type="text"
                      value={editMode ? formData.name : userProfile?.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 disabled:bg-zinc-50 disabled:text-zinc-400 transition-all duration-200"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-3">Email</label>
                    <input
                      type="email"
                      value={currentUser?.email || ''}
                      disabled
                      className="w-full px-4 py-3 border border-zinc-200 rounded-lg bg-zinc-50 text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all duration-200"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-3">Department</label>
                    <input
                      type="text"
                      value={editMode ? formData.department : userProfile?.department || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      disabled={!editMode}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 disabled:bg-zinc-50 disabled:text-zinc-400 transition-all duration-200"
                      placeholder="e.g., Computer Science"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black mb-3">Bio</label>
                    <textarea
                      value={editMode ? formData.bio : userProfile?.bio || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      disabled={!editMode}
                      rows={4}
                      className="w-full px-4 py-3 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 disabled:bg-zinc-50 disabled:text-zinc-400 transition-all duration-200 resize-none"
                      placeholder="Tell us about your teaching experience..."
                    />
                  </div>
                </div>
              </div>

              {/* Expertise Tags */}
              <div className="space-y-4 mt-8">
                <label className="block text-sm font-medium text-black mb-3">Areas of Expertise</label>
                <div className="flex flex-wrap gap-2">
                  {availableExpertise.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => editMode && toggleExpertise(tag)}
                      disabled={!editMode}
                      className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                        formData.expertise.includes(tag)
                          ? 'bg-black text-white border-black'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-300 hover:bg-zinc-200'
                      } ${!editMode ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {editMode && (
                <div className="flex justify-end mt-8">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="px-8 py-3 bg-black hover:bg-zinc-800 text-white rounded-lg font-semibold transition-all duration-200 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-5 w-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12">
              <h2 className="text-2xl font-black text-black mb-8 flex items-center gap-3">
                <Lock className="h-6 w-6" />
                Account & Security
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-zinc-100">
                  <div>
                    <p className="font-medium text-black">Change Password</p>
                    <p className="text-sm text-zinc-600">Last changed 3 months ago</p>
                  </div>
                  <button className="px-4 py-2 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-all duration-200">
                    Reset Password
                  </button>
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-black">Two-Factor Authentication</p>
                    <p className="text-sm text-zinc-600">Add an extra layer of security</p>
                  </div>
                  <button className="px-4 py-2 border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-all duration-200">
                    Enable 2FA
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12">
              <h2 className="text-2xl font-black text-black mb-8 flex items-center gap-3">
                <Bell className="h-6 w-6" />
                Notification Preferences
              </h2>

              <div className="space-y-6">
                <div className="flex items-center justify-between py-4 border-b border-zinc-100">
                  <div>
                    <p className="font-medium text-black">Email Notifications</p>
                    <p className="text-sm text-zinc-600">Receive updates about new doubts and student queries</p>
                  </div>
                  <button
                    onClick={() => toggleNotification('email')}
                    className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 " +
                      (notifications.email ? "bg-black" : "bg-zinc-200")}
                  >
                    <div className={"absolute transition-transform duration-200 " +
                      (notifications.email ? "translate-x-5" : "translate-x-1")}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between py-4 border-b border-zinc-100">
                  <div>
                    <p className="font-medium text-black">Desktop Notifications</p>
                    <p className="text-sm text-zinc-600">In-app alerts for new doubts</p>
                  </div>
                  <button
                    onClick={() => toggleNotification('desktop')}
                    className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 " +
                      (notifications.desktop ? "bg-black" : "bg-zinc-200")}
                  >
                    <div className={"absolute transition-transform duration-200 " +
                      (notifications.desktop ? "translate-x-5" : "translate-x-1")}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </button>
                </div>

                <div className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium text-black">Student Doubt Alerts</p>
                    <p className="text-sm text-zinc-600">Instant notifications for new student questions</p>
                  </div>
                  <button
                    onClick={() => toggleNotification('students')}
                    className={"relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 " +
                      (notifications.students ? "bg-black" : "bg-zinc-200")}
                  >
                    <div className={"absolute transition-transform duration-200 " +
                      (notifications.students ? "translate-x-5" : "translate-x-1")}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Points Section */}
          {activeSection === 'points' && (
            <div className="bg-white border border-zinc-200 rounded-2xl p-12">
              <h2 className="text-2xl font-black text-black mb-8 flex items-center gap-3">
                <Award className="h-6 w-6" />
                Teaching Points & Credits
              </h2>

              <div className="text-center py-8">
                <div className="inline-flex items-center gap-4 px-8 py-6 bg-black text-white rounded-2xl">
                  <Award className="h-8 w-8 text-yellow-400" />
                  <div className="text-left">
                    <p className="text-3xl font-black">{userProfile?.points || 0}</p>
                    <p className="text-sm font-medium text-zinc-300">Current Points</p>
                    <p className="text-xs text-zinc-500 mt-2">Earned by solving student doubts</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Logout Button */}
          <div className="bg-white border border-red-200 rounded-2xl p-12">
            <button
              onClick={handleLogout}
              className="w-full px-6 py-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-3"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-red-100">Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}