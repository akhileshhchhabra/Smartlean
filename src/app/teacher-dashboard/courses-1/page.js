'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, User, ArrowRight, Clock, X, Edit, Users, Settings, Upload } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import ActiveStudents from '@/components/ActiveStudents';

export default function TeacherCoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [newCourse, setNewCourse] = useState({ title: '', category: 'Math', description: '', thumbnailUrl: '' });
  const [showStudents, setShowStudents] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const fetchStudentCountForCourse = async (courseId) => {
    try {
      const enrollmentsQuery = query(
        collection(db, 'enrollments'),
        where('courseId', '==', courseId)
      );
      const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
      return enrollmentsSnapshot.size;
    } catch (error) {
      console.error('Error fetching student count:', error);
      return 0;
    }
  };

  const fetchMyCourses = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const q = query(collection(db, 'courses'), where('teacherId', '==', user.uid));
      const snap = await getDocs(q);
      const courseList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const coursesWithCounts = await Promise.all(
        courseList.map(async (course) => {
          const studentCount = await fetchStudentCountForCourse(course.id);
          return { ...course, studentCount };
        })
      );
      setCourses(coursesWithCounts);
    } catch (err) {
      console.error("Error fetching courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMyCourses(); }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
      if (file.size > 5 * 1024 * 1024) { alert('File size must be less than 5MB.'); return; }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const refreshStudentCounts = async () => {
    try {
      const coursesWithCounts = await Promise.all(
        courses.map(async (course) => {
          const studentCount = await fetchStudentCountForCourse(course.id);
          return { ...course, studentCount };
        })
      );
      setCourses(coursesWithCounts);
    } catch (error) {
      console.error('Error refreshing student counts:', error);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) { alert("You must be logged in to create a course."); return; }
    if (!selectedFile) { alert("Please select a photo first"); return; }
    setUploading(true);
    try {
      let thumbnailBase64 = '';
      const fileSizeInMB = selectedFile.size / (1024 * 1024);
      if (fileSizeInMB > 1) throw new Error(`Image is too large for Firestore (${fileSizeInMB.toFixed(2)}MB). Please use an image smaller than 1MB.`);
      const reader = new FileReader();
      thumbnailBase64 = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (error) => reject(new Error("Failed to convert image to Base64"));
        reader.readAsDataURL(selectedFile);
      });
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      const userData = userDoc.exists() ? userDoc.data() : {};
      await addDoc(collection(db, 'courses'), {
        title: newCourse.title,
        category: newCourse.category,
        description: newCourse.description,
        thumbnailUrl: thumbnailBase64,
        teacherId: user.uid,
        teacherName: userData.fullName || user.displayName || 'Instructor',
        teacherEmail: user.email,
        createdAt: serverTimestamp(),
        studentCount: 0,
        status: 'active'
      });
      setShowModal(false);
      await fetchMyCourses();
      setNewCourse({ title: '', category: 'Math', description: '' });
      setSelectedFile(null);
      setImagePreview(null);
    } catch (err) {
      console.error("Error creating course:", err);
      alert(`Error creating course: ${err.message || 'Please try again.'}`);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingWrapper}>
        <div style={styles.spinner}></div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={styles.loadingText}>Loading courses...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Course Studio</h1>
          <p style={styles.subheading}>Manage your teaching curriculum.</p>
        </div>
        <button style={styles.btnCreate} onClick={() => setShowModal(true)}
          onMouseEnter={e => e.currentTarget.style.background = '#222'}
          onMouseLeave={e => e.currentTarget.style.background = '#111'}>
          <Plus size={15} strokeWidth={2.5} />
          Create New Course
        </button>
      </div>

      {/* Grid */}
      {courses.length > 0 ? (
        <div style={styles.grid}>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onViewStudents={() => { setSelectedCourse(course); setShowStudents(true); }}
              onManage={() => router.push(`/teacher-dashboard/courses-1`)}
            />
          ))}
          {/* Add new card */}
          <div
            style={styles.addCard}
            onClick={() => setShowModal(true)}
            onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f7'; e.currentTarget.style.borderColor = '#aaa'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = '#d1d1d6'; }}
          >
            <div style={styles.addIcon}><Plus size={20} color="#888" strokeWidth={2} /></div>
            <span style={{ fontSize: 13, color: '#888' }}>New course</span>
          </div>
        </div>
      ) : (
        <EmptyState onCreateClick={() => setShowModal(true)} />
      )}

      {/* Create Course Modal */}
      {showModal && (
        <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={styles.modal}>
            <button style={styles.modalClose} onClick={() => setShowModal(false)}
              onMouseEnter={e => e.currentTarget.style.background = '#e8e8ed'}
              onMouseLeave={e => e.currentTarget.style.background = '#f2f2f7'}>
              <X size={16} color="#666" />
            </button>
            <h2 style={styles.modalTitle}>Create New Course</h2>
            <p style={styles.modalSub}>Add a new course to your teaching portfolio.</p>

            <form onSubmit={handleCreateCourse}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Course Title</label>
                <input
                  required
                  style={styles.input}
                  placeholder="Enter course title"
                  value={newCourse.title}
                  onChange={e => setNewCourse({ ...newCourse, title: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = '#111'}
                  onBlur={e => e.currentTarget.style.borderColor = '#d1d1d6'}
                />
              </div>

              <div style={styles.twoCol}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Category</label>
                  <select
                    style={styles.input}
                    value={newCourse.category}
                    onChange={e => setNewCourse({ ...newCourse, category: e.target.value })}
                    onFocus={e => e.currentTarget.style.borderColor = '#111'}
                    onBlur={e => e.currentTarget.style.borderColor = '#d1d1d6'}
                  >
                    <option value="Math">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="Programming">Programming</option>
                    <option value="Design">UI/UX Design</option>
                    <option value="Business">Business</option>
                  </select>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Thumbnail</label>
                  <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} id="thumb-upload" />
                  <label htmlFor="thumb-upload" style={styles.uploadArea}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 12 }} />
                    ) : (
                      <>
                        <Upload size={18} color="#aaa" strokeWidth={1.8} />
                        <span style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>Upload image</span>
                        <span style={{ fontSize: 11, color: '#bbb' }}>PNG, JPG up to 5MB</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Description</label>
                <textarea
                  required
                  style={{ ...styles.input, height: 100, resize: 'none' }}
                  placeholder="Describe your course..."
                  value={newCourse.description}
                  onChange={e => setNewCourse({ ...newCourse, description: e.target.value })}
                  onFocus={e => e.currentTarget.style.borderColor = '#111'}
                  onBlur={e => e.currentTarget.style.borderColor = '#d1d1d6'}
                />
              </div>

              <div style={styles.modalActions}>
                <button type="button" style={styles.btnCancel} disabled={uploading}
                  onClick={() => setShowModal(false)}
                  onMouseEnter={e => e.currentTarget.style.background = '#e8e8ed'}
                  onMouseLeave={e => e.currentTarget.style.background = '#f2f2f7'}>
                  Cancel
                </button>
                <button type="submit" style={{ ...styles.btnSubmit, opacity: uploading ? 0.6 : 1 }} disabled={uploading}
                  onMouseEnter={e => { if (!uploading) e.currentTarget.style.background = '#222'; }}
                  onMouseLeave={e => e.currentTarget.style.background = '#111'}>
                  {uploading ? 'Saving...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Active Students Overlay */}
      {showStudents && selectedCourse && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: '#fff' }}>
          <ActiveStudents
            courseId={selectedCourse.id}
            courseTitle={selectedCourse.title}
            onBack={async () => {
              setShowStudents(false);
              setSelectedCourse(null);
              await refreshStudentCounts();
            }}
          />
        </div>
      )}
    </div>
  );
}

function CourseCard({ course, onViewStudents, onManage }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ ...styles.card, ...(hovered ? styles.cardHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      {course.thumbnailUrl ? (
        <img src={course.thumbnailUrl} alt={course.title} style={styles.thumb} />
      ) : (
        <div style={styles.thumbPlaceholder}>
          <BookOpen size={32} color="rgba(255,255,255,0.75)" strokeWidth={1.5} />
        </div>
      )}

      <div style={styles.cardBody}>
        <div style={styles.cardTop}>
          <h3 style={{ ...styles.cardTitle, color: hovered ? '#2563eb' : '#111' }}>{course.title}</h3>
          <span style={styles.badge}>{course.category}</span>
        </div>

        <div style={styles.metaRow}>
          <User size={13} color="#999" strokeWidth={1.8} />
          <span style={styles.metaText}>{course.studentCount || 0} Students</span>
        </div>

        <div style={styles.cardDivider} />

        <div style={styles.cardFooter}>
          <div style={styles.statusBadge}>
            <span style={styles.statusDot} />
            <span style={{ fontSize: 12, color: '#888' }}>Active</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              style={styles.btnOutline}
              onClick={onViewStudents}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f7'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
              <Users size={13} strokeWidth={1.8} />
              Students
            </button>
            <button
              style={styles.btnDark}
              onClick={onManage}
              onMouseEnter={e => e.currentTarget.style.background = '#333'}
              onMouseLeave={e => e.currentTarget.style.background = '#111'}>
              <Settings size={13} strokeWidth={1.8} />
              Manage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCreateClick }) {
  return (
    <div style={styles.emptyWrapper}>
      <div style={styles.emptyIcon}>
        <BookOpen size={32} color="rgba(255,255,255,0.85)" strokeWidth={1.5} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 500, color: '#111', marginBottom: 8 }}>No courses yet</h3>
      <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>Create your first course to start teaching.</p>
      <button style={styles.btnCreate} onClick={onCreateClick}
        onMouseEnter={e => e.currentTarget.style.background = '#222'}
        onMouseLeave={e => e.currentTarget.style.background = '#111'}>
        <Plus size={15} strokeWidth={2.5} />
        Create Course
      </button>
    </div>
  );
}

const styles = {
  page: {
    background: '#FBFBFD',
    minHeight: '100vh',
    padding: '56px 64px',
  },
  loadingWrapper: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: 256, gap: 16,
  },
  spinner: {
    width: 40, height: 40,
    border: '3px solid #e5e5ea',
    borderTopColor: '#111',
    borderRadius: '50%',
    animation: 'spin 0.75s linear infinite',
  },
  loadingText: { fontSize: 14, color: '#888', fontWeight: 500 },
  header: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', marginBottom: 40,
    flexWrap: 'wrap', gap: 16,
  },
  heading: {
    fontSize: 28, fontWeight: 600, color: '#111',
    letterSpacing: '-0.5px', margin: 0,
  },
  subheading: { fontSize: 14, color: '#888', marginTop: 4 },
  btnCreate: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#111', color: '#fff',
    border: 'none', padding: '10px 20px',
    borderRadius: 999, fontSize: 14, fontWeight: 500,
    cursor: 'pointer', transition: 'background 0.2s',
    whiteSpace: 'nowrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 20,
  },
  card: {
    background: '#fff',
    border: '0.5px solid #e5e5ea',
    borderRadius: 20, overflow: 'hidden',
    transition: 'box-shadow 0.25s, transform 0.25s',
    cursor: 'default',
  },
  cardHover: {
    boxShadow: '0 8px 28px rgba(0,0,0,0.09)',
    transform: 'translateY(-2px)',
  },
  thumb: {
    width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block',
  },
  thumbPlaceholder: {
    width: '100%', aspectRatio: '16/9',
    background: 'linear-gradient(135deg, #3b7dd8 0%, #7c4fe0 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { padding: '14px 16px 16px' },
  cardTop: {
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 8, marginBottom: 10,
  },
  cardTitle: {
    fontSize: 15, fontWeight: 500, lineHeight: 1.35,
    transition: 'color 0.2s', margin: 0, flex: 1,
  },
  badge: {
    fontSize: 10, fontWeight: 600,
    padding: '3px 8px', borderRadius: 999,
    background: '#EEF3FF', color: '#2d5be3',
    letterSpacing: '0.4px', textTransform: 'uppercase',
    whiteSpace: 'nowrap', flexShrink: 0,
  },
  metaRow: { display: 'flex', alignItems: 'center', gap: 5, marginBottom: 14 },
  metaText: { fontSize: 13, color: '#999' },
  cardDivider: { height: '0.5px', background: '#f0f0f5', marginBottom: 12 },
  cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { display: 'flex', alignItems: 'center', gap: 5 },
  statusDot: { width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 },
  btnOutline: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 12, fontWeight: 500,
    padding: '6px 10px', borderRadius: 10,
    border: '0.5px solid #d1d1d6',
    background: '#fff', color: '#333',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  btnDark: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontSize: 12, fontWeight: 500,
    padding: '6px 10px', borderRadius: 10,
    border: 'none', background: '#111', color: '#fff',
    cursor: 'pointer', transition: 'background 0.15s',
  },
  addCard: {
    border: '1.5px dashed #d1d1d6',
    borderRadius: 20, minHeight: 220,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
    gap: 4,
  },
  addIcon: {
    width: 40, height: 40, borderRadius: '50%',
    background: '#f5f5f7', border: '0.5px solid #e5e5ea',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 6,
  },
  emptyWrapper: {
    background: '#fff', border: '0.5px solid #e5e5ea',
    borderRadius: 28, padding: '64px 32px',
    textAlign: 'center', display: 'flex',
    flexDirection: 'column', alignItems: 'center',
  },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 20,
    background: 'linear-gradient(135deg, #3b7dd8, #7c4fe0)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  overlay: {
    position: 'fixed', inset: 0, zIndex: 200,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(10px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  modal: {
    background: '#fff', borderRadius: 24,
    padding: '40px 40px 36px', width: '100%', maxWidth: 540,
    maxHeight: '90vh', overflowY: 'auto', position: 'relative',
  },
  modalClose: {
    position: 'absolute', top: 16, right: 16,
    background: '#f2f2f7', border: 'none',
    width: 32, height: 32, borderRadius: '50%',
    cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.15s',
  },
  modalTitle: { fontSize: 22, fontWeight: 600, color: '#111', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#888', marginBottom: 28 },
  formGroup: { marginBottom: 18 },
  label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 6 },
  input: {
    width: '100%', padding: '11px 14px',
    border: '0.5px solid #d1d1d6', borderRadius: 12,
    fontSize: 14, background: '#fff', color: '#111',
    outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
  },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  uploadArea: {
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    width: '100%', height: 110,
    border: '1.5px dashed #d1d1d6', borderRadius: 12,
    cursor: 'pointer', overflow: 'hidden',
    gap: 2,
  },
  modalActions: { display: 'flex', gap: 10, marginTop: 24 },
  btnCancel: {
    flex: 1, padding: '12px', borderRadius: 12,
    border: '0.5px solid #d1d1d6', background: '#f2f2f7',
    color: '#333', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', transition: 'background 0.15s',
  },
  btnSubmit: {
    flex: 1, padding: '12px', borderRadius: 12,
    border: 'none', background: '#111',
    color: '#fff', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', transition: 'background 0.15s',
  },
};