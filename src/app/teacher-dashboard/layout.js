import DashboardLayout from '@/components/Sidebar';

export default function TeacherLayout({ children }) {
  return <DashboardLayout userType="teacher">{children}</DashboardLayout>;
}