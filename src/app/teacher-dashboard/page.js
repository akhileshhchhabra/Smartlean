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
      {/* Page Header with Serif Greeting */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-black font-serif tracking-tight mb-3">
          Welcome back! Instructor
        </h1>
        <p className="text-zinc-400 text-lg">{getCurrentDate()}</p>
      </div>

      {/* Stats Row - 3 Refined Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-[24px] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-3xl font-bold text-black mb-1">{stats.totalStudents}</div>
              <div className="text-zinc-400 text-sm">Total Students</div>
            </div>
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[24px] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-3xl font-bold text-black mb-1">{stats.activeCourses}</div>
              <div className="text-zinc-400 text-sm">Active Courses</div>
            </div>
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[24px] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-3xl font-bold text-black mb-1">{stats.newDoubts}</div>
              <div className="text-zinc-400 text-sm">New Doubts</div>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-black mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => router.push('/teacher-dashboard/courses-1')}
            className="bg-white p-6 rounded-[24px] shadow-sm text-left group hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 group-hover:bg-zinc-900 transition-colors duration-200">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-2">Create Course</h3>
                <p className="text-zinc-400 text-sm">Add a new course to your curriculum</p>
              </div>
              <div className="w-8 h-8 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-zinc-200 transition-colors duration-200">
                <ArrowUpRight className="w-4 h-4 text-zinc-600" />
              </div>
            </div>
          </button>

          <button 
            onClick={() => router.push('/teacher-dashboard/assignments')}
            className="bg-white p-6 rounded-[24px] shadow-sm text-left group hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4 group-hover:bg-zinc-900 transition-colors duration-200">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-black mb-2">Post Assignment</h3>
                <p className="text-zinc-400 text-sm">Create and assign new tasks to students</p>
              </div>
              <div className="w-8 h-8 bg-zinc-100 rounded-xl flex items-center justify-center group-hover:bg-zinc-200 transition-colors duration-200">
                <ArrowUpRight className="w-4 h-4 text-zinc-600" />
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-[24px] shadow-sm">
        <h2 className="text-2xl font-bold text-black mb-6">Recent Activity</h2>
        <div className="space-y-4">
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Clock className="w-6 h-6 text-zinc-400" />
            </div>
            <p className="text-zinc-400 text-lg mb-2">No recent activity to display</p>
            <p className="text-zinc-500 text-sm">Your recent actions will appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}