'use client';

import { useState, useEffect } from 'react';
import { Users, Mail, Calendar, ArrowLeft, Search, Filter } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function ActiveStudents({ courseId, courseTitle, onBack }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('enrollmentDate');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);

        const user = auth.currentUser;
        if (!user) {
          setError('No user logged in');
          return;
        }

        if (!courseId) {
          setError('No course selected');
          return;
        }

        // Fetch enrollments for this specific course
        const enrollmentsQuery = query(
          collection(db, 'enrollments'),
          where('courseId', '==', courseId)
        );
        
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        
        if (enrollmentsSnapshot.empty) {
          setStudents([]);
          setLoading(false);
          return;
        }

        // Get student details for each enrollment
        const studentsWithDetails = await Promise.all(
          enrollmentsSnapshot.docs.map(async (enrollmentDoc) => {
            const enrollmentData = enrollmentDoc.data();
            const studentId = enrollmentData.studentId;
            
            try {
              // Fetch student details from users collection
              const studentDoc = await getDoc(doc(db, 'users', studentId));
              const studentData = studentDoc.exists() ? studentDoc.data() : {};
              
              return {
                id: enrollmentDoc.id,
                studentId: studentId,
                name: studentData.name || studentData.fullName || 'Unknown Student',
                email: enrollmentData.studentEmail || studentData.email || 'No email',
                enrollmentDate: enrollmentData.enrolledAt?.toDate?.() || new Date(),
                courseTitle: enrollmentData.courseTitle || courseTitle,
                profileImage: studentData.profileImage || null
              };
            } catch (studentError) {
              console.error('Error fetching student details:', studentError);
              return {
                id: enrollmentDoc.id,
                studentId: studentId,
                name: 'Unknown Student',
                email: enrollmentData.studentEmail || 'No email',
                enrollmentDate: enrollmentData.enrolledAt?.toDate?.() || new Date(),
                courseTitle: enrollmentData.courseTitle || courseTitle,
                profileImage: null
              };
            }
          })
        );

        setStudents(studentsWithDetails);
      } catch (error) {
        console.error('Error fetching students:', error);
        setError('Failed to load students. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [courseId, courseTitle]);

  // Filter and sort students
  const filteredStudents = students
    .filter(student => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        student.name.toLowerCase().includes(searchLower) ||
        student.email.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'email':
          return a.email.localeCompare(b.email);
        case 'enrollmentDate':
        default:
          return b.enrollmentDate - a.enrollmentDate; // Most recent first
      }
    });

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const clearError = () => {
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-zinc-200 border-t-black rounded-full animate-spin"></div>
        <div className="text-zinc-500 font-medium">Loading students...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-zinc-600" />
          </button>
          <div>
            <h1 className="text-3xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-tight">
              Active Students
            </h1>
            <p className="text-zinc-500 mt-1">
              {courseTitle || 'Course'} • {students.length} student{students.length !== 1 ? 's' : ''} enrolled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black w-64"
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
          >
            <option value="enrollmentDate">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="email">Sort by Email</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">!</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-800">Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="ml-auto px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Students Table */}
      {filteredStudents.length > 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">
                    Enrollment Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredStudents.map((student, index) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-zinc-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {student.profileImage ? (
                          <img
                            src={student.profileImage}
                            alt={student.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-zinc-200 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-zinc-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-[#1D1D1F]">
                            {student.name}
                          </div>
                          <div className="text-sm text-zinc-500">
                            Student ID: {student.studentId.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-600">{student.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-400" />
                        <span className="text-zinc-600">{formatDate(student.enrollmentDate)}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        !loading && !error && (
          <div className="bg-white rounded-2xl border border-zinc-200 p-16 text-center">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-zinc-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
              No students enrolled yet
            </h3>
            <p className="text-zinc-500">
              {searchTerm 
                ? 'No students found matching your search criteria.' 
                : `No students have enrolled in ${courseTitle || 'this course'} yet.`
              }
            </p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-4 text-blue-500 hover:text-blue-600 transition-colors"
              >
                Clear search
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}
