  'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, BookOpen, MessageCircle, Plus, ArrowUpRight, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

export default function TeacherDashboardHome() {
  const router = useRouter();
  const { user, loading: authLoading, initializing } = useAuth();
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeCourses: 0,
    newDoubts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Crucial: Do not render until Firebase auth check has finished
        if (!user || authLoading || initializing) return;

        // Step 1: Fetch all courses taught by current teacher
        const coursesQuery = query(collection(db, 'courses'), where('teacherId', '==', user.uid));
        const coursesSnapshot = await getDocs(coursesQuery);
        
        if (coursesSnapshot.empty) {
          // Teacher has no courses yet
          setStats({
            totalStudents: 0,
            activeCourses: 0,
            newDoubts: 0
          });
          return;
        }

        // Step 2: Calculate total students from course documents (source of truth)
        // Sum up studentCount from all course documents
        let totalStudents = 0;
        coursesSnapshot.forEach(doc => {
          const courseData = doc.data();
          const studentCount = courseData.studentCount || 0;
          totalStudents += studentCount;
        });

        // Step 3: Fetch New Doubts (status == 'pending')
        const doubtsQuery = query(collection(db, 'doubts'), where('status', '==', 'pending'));
        const doubtsSnapshot = await getDocs(doubtsQuery);

        setStats({
          totalStudents: totalStudents, // Sum of studentCount from all courses
          activeCourses: coursesSnapshot.size,
          newDoubts: doubtsSnapshot.size
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, authLoading, initializing]);

  const getCurrentDate = () => {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return today.toLocaleDateString('en-US', options);
  };

  // Crucial: Do not render the 'Go to Homepage' error message until the Firebase auth check has finished
  if (loading || authLoading || initializing) {
    return (
      <div className="min-h-screen bg-[#FBFBFD] p-8">
        {/* Loading Skeleton - Apple-style minimalist design */}
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-10 w-64 bg-zinc-200 rounded-2xl animate-pulse mb-3"></div>
            <div className="h-5 w-48 bg-zinc-100 rounded-xl animate-pulse"></div>
          </div>

          {/* Stats Row Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-zinc-100">
                <div className="h-8 w-20 bg-zinc-200 rounded-2xl animate-pulse mb-2"></div>
                <div className="h-4 w-24 bg-zinc-100 rounded-xl animate-pulse"></div>
              </div>
            ))}
          </div>

          {/* Quick Actions Skeleton */}
          <div className="mb-8">
            <div className="h-6 w-32 bg-zinc-200 rounded-xl animate-pulse mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-zinc-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="w-12 h-12 bg-zinc-200 rounded-2xl animate-pulse mb-4"></div>
                      <div className="h-5 w-32 bg-zinc-200 rounded-xl animate-pulse mb-2"></div>
                      <div className="h-4 w-48 bg-zinc-100 rounded-xl animate-pulse"></div>
                    </div>
                    <div className="w-5 h-5 bg-zinc-100 rounded-lg animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Skeleton */}
          <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-zinc-100">
            <div className="h-6 w-40 bg-zinc-200 rounded-xl animate-pulse mb-6"></div>
            <div className="h-20 w-full bg-zinc-50 rounded-3xl animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em] mb-3">
          Welcome back! Instructor
        </h1>
        <p className="text-zinc-500 text-lg leading-relaxed">{getCurrentDate()}</p>
      </div>

      {/* Stats Row - 3 Premium Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-100/50 shadow-lg shadow-zinc-900/5 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              Active
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1D1D1F] font-['Syne'] mb-2">{stats.totalStudents}</div>
          <div className="text-zinc-500 text-sm font-medium">Total Students</div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-100/50 shadow-lg shadow-zinc-900/5 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
              Active
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1D1D1F] font-['Syne'] mb-2">{stats.activeCourses}</div>
          <div className="text-zinc-500 text-sm font-medium">Active Courses</div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-100/50 shadow-lg shadow-zinc-900/5 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-xs font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              Pending
            </div>
          </div>
          <div className="text-3xl font-bold text-[#1D1D1F] font-['Syne'] mb-2">{stats.newDoubts}</div>
          <div className="text-zinc-500 text-sm font-medium">New Doubts</div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-[#1D1D1F] font-['Syne'] mb-8">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button 
            onClick={() => router.push('/teacher-dashboard/courses-1')}
            className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-100/50 shadow-lg shadow-zinc-900/5 hover:shadow-xl transition-all duration-300 text-left group hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] font-['Syne'] mb-3">Create Course</h3>
                <p className="text-zinc-500 leading-relaxed">Add a new course to your curriculum</p>
              </div>
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-zinc-100 transition-colors duration-300">
                <ArrowUpRight className="w-6 h-6 text-zinc-400 group-hover:text-zinc-600 transition-colors duration-300" />
              </div>
            </div>
          </button>

          <button 
            onClick={() => router.push('/teacher-dashboard/assignments')}
            className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-100/50 shadow-lg shadow-zinc-900/5 hover:shadow-xl transition-all duration-300 text-left group hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Plus className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-[#1D1D1F] font-['Syne'] mb-3">Post Assignment</h3>
                <p className="text-zinc-500 leading-relaxed">Create and assign new tasks to students</p>
              </div>
              <div className="w-12 h-12 bg-zinc-50 rounded-2xl flex items-center justify-center group-hover:bg-zinc-100 transition-colors duration-300">
                <ArrowUpRight className="w-6 h-6 text-zinc-400 group-hover:text-zinc-600 transition-colors duration-300" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/80 backdrop-blur-md p-10 rounded-3xl border border-zinc-100/50 shadow-lg shadow-zinc-900/5">
        <h2 className="text-2xl font-bold text-[#1D1D1F] font-['Syne'] mb-8">Recent Activity</h2>
        <div className="space-y-6">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-zinc-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Clock className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-zinc-500 text-lg font-medium mb-2">No recent activity to display</p>
            <p className="text-zinc-400 text-sm">Your recent actions will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}