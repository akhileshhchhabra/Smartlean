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
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em] mb-2">
          Welcome back! Instructor
        </h1>
        <p className="text-zinc-500">{getCurrentDate()}</p>
      </div>

      {/* Stats Row - 3 Large Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-zinc-100">
          <div className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] font-['Syne']">{stats.totalStudents}</div>
          <div className="text-zinc-400 text-sm mt-1">Total Students</div>
        </div>
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-zinc-100">
          <div className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] font-['Syne']">{stats.activeCourses}</div>
          <div className="text-zinc-400 text-sm mt-1">Active Courses</div>
        </div>
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-zinc-100">
          <div className="text-2xl md:text-3xl font-semibold text-[#1D1D1F] font-['Syne']">{stats.newDoubts}</div>
          <div className="text-zinc-400 text-sm mt-1">New Doubts</div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-[#1D1D1F] font-['Syne'] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => router.push('/teacher-dashboard/courses-1')}
            className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-zinc-100 hover:shadow-lg transition-all duration-300 text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">Create Course</h3>
                <p className="text-zinc-500 text-sm">Add a new course to your curriculum</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors" />
            </div>
          </button>

          <button 
            onClick={() => router.push('/teacher-dashboard/assignments')}
            className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-zinc-100 hover:shadow-lg transition-all duration-300 text-left group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#1D1D1F] mb-2">Post Assignment</h3>
                <p className="text-zinc-500 text-sm">Create and assign new tasks to students</p>
              </div>
              <ArrowUpRight className="w-5 h-5 text-zinc-400 group-hover:text-black transition-colors" />
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-zinc-100">
        <h2 className="text-xl font-semibold text-[#1D1D1F] font-['Syne'] mb-6">Recent Activity</h2>
        <div className="space-y-4">
          <p className="text-zinc-400 text-center py-10 border-2 border-dashed border-zinc-100 rounded-3xl">
            No recent activity to display
          </p>
        </div>
      </div>
    </div>
  );
}