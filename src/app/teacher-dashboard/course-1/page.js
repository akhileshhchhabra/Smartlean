'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Users, BookOpen, Play, MoreVertical, Clock, TrendingUp } from 'lucide-react';

export default function CourseStudio() {
  const [courses, setCourses] = useState([
    {
      id: 1,
      title: 'Advanced Mathematics',
      category: 'Mathematics',
      status: 'active',
      studentsEnrolled: 45,
      thumbnail: 'gradient-to-br from-blue-500 to-purple-600',
      description: 'Master advanced mathematical concepts',
      lastUpdated: '2 hours ago'
    },
    {
      id: 2,
      title: 'Physics Fundamentals',
      category: 'Science',
      status: 'draft',
      studentsEnrolled: 0,
      thumbnail: 'gradient-to-br from-emerald-500 to-teal-600',
      description: 'Introduction to core physics principles',
      lastUpdated: '1 day ago'
    },
    {
      id: 3,
      title: 'Web Development Bootcamp',
      category: 'Technology',
      status: 'active',
      studentsEnrolled: 128,
      thumbnail: 'gradient-to-br from-orange-500 to-red-600',
      description: 'Full-stack web development from scratch',
      lastUpdated: '5 hours ago'
    },
    {
      id: 4,
      title: 'Data Science Essentials',
      category: 'Data Science',
      status: 'active',
      studentsEnrolled: 89,
      thumbnail: 'gradient-to-br from-indigo-500 to-purple-600',
      description: 'Learn data analysis and machine learning',
      lastUpdated: '3 days ago'
    }
  ]);

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      draft: 'bg-amber-50 text-amber-700 border-amber-200',
      archived: 'bg-zinc-50 text-zinc-700 border-zinc-200'
    };

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-['Inter']">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 font-['Inter'] mb-2">
              Course Studio
            </h1>
            <p className="text-zinc-500 text-lg">
              Create and manage your educational content
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-950 text-white rounded-xl font-medium hover:bg-zinc-800 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create New Course
          </motion.button>
        </div>
      </motion.div>

      {/* Course Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {courses.map((course) => (
          <motion.div
            key={course.id}
            variants={cardVariants}
            whileHover={{ scale: 1.02 }}
            className="group bg-white backdrop-blur-md rounded-[2rem] shadow-sm border border-zinc-200/50 overflow-hidden transition-all duration-300"
          >
            {/* Thumbnail Section */}
            <div className={`h-32 bg-gradient-to-br ${course.thumbnail} relative overflow-hidden`}>
              <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
              <div className="absolute top-4 right-4">
                {getStatusBadge(course.status)}
              </div>
              <div className="absolute bottom-4 left-4">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6">
              <div className="mb-3">
                <h3 className="text-lg font-semibold text-zinc-900 mb-1 line-clamp-1">
                  {course.title}
                </h3>
                <p className="text-sm text-zinc-500 line-clamp-2">
                  {course.description}
                </p>
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-zinc-500">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {course.studentsEnrolled} students
                  </span>
                </div>
                <div className="flex items-center gap-1 text-zinc-400">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{course.lastUpdated}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-950 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all"
                >
                  <Play className="w-4 h-4" />
                  Manage
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-zinc-200 text-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-50 transition-all"
                >
                  <Users className="w-4 h-4" />
                  Students
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Empty State (if no courses) */}
      {courses.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center mb-6">
            <BookOpen className="w-10 h-10 text-zinc-400" />
          </div>
          <h3 className="text-xl font-semibold text-zinc-900 mb-2">
            No courses yet
          </h3>
          <p className="text-zinc-500 mb-6 text-center max-w-md">
            Start by creating your first course and begin sharing your knowledge with students.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-6 py-3 bg-zinc-950 text-white rounded-xl font-medium hover:bg-zinc-800 transition-all"
          >
            <Plus className="w-5 h-5" />
            Create Your First Course
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
