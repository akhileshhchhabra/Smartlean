'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, BookOpen, FileText, HelpCircle, Settings, 
  Bell, User, LogOut, Menu, X, ChevronRight, Search, Swords 
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const studentMenuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/student-dashboard' },
  { icon: BookOpen, label: 'My Courses', href: '/student-dashboard/courses' },
  { icon: FileText, label: 'Assignments', href: '/student-dashboard/assignments' },
  { icon: Swords, label: 'Challenges', href: '/student-dashboard/challenges', badge: 'New' },
  { icon: HelpCircle, label: 'Doubt Section', href: '/student-dashboard/doubt' },
  { icon: Settings, label: 'Settings', href: '/student-dashboard/settings' },
];

const teacherMenuItems = [
  { icon: LayoutDashboard, label: 'Overview', href: '/teacher-dashboard' },
  { icon: BookOpen, label: 'My Courses', href: '/teacher-dashboard/courses-1' },
  { icon: FileText, label: 'Assignments', href: '/teacher-dashboard/assignments' },
  { icon: HelpCircle, label: 'Doubts', href: '/teacher-dashboard/doubt-1' },
  { icon: Settings, label: 'Settings', href: '/teacher-dashboard/settings' },
];

export default function DashboardLayout({ children, userType = 'student' }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  
  const menuItems = userType === 'teacher' ? teacherMenuItems : studentMenuItems;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        // Check user role if teacher dashboard
        if (userType === 'teacher') {
          try {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData.role !== 'Teacher') {
                router.push('/student-dashboard');
                return;
              }
            }
          } catch (error) {
            console.error('Error checking user role:', error);
          }
        }
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router, userType]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const getCurrentPage = () => {
    const item = menuItems.find(m => m.href === pathname);
    return item ? item.label : "Portal";
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#FBFBFD] font-['Syne'] text-xl">
      Loading SmartLearn...
    </div>
  );

  return (
    <div className="bg-[#FBFBFD] min-h-screen font-['Inter']">
      
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b border-zinc-100 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <Menu className="w-5 h-5 text-zinc-600"/>
          </button>
          <span className="text-xl font-bold font-['Syne'] tracking-tight">SmartLearn</span>
        </div>

        <div className="hidden md:flex flex-1 max-w-md mx-10 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input className="w-full pl-10 pr-4 py-2 bg-[#F5F5F7] rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5" placeholder="Search resources..." />
        </div>

        <div className="flex items-center gap-4">
          <Bell className="w-5 h-5 text-zinc-400 cursor-pointer hover:text-black transition-colors"/>
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)} className="w-9 h-9 bg-black rounded-full flex items-center justify-center text-white ring-4 ring-zinc-50">
              <User className="w-5 h-5"/>
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white shadow-2xl border border-zinc-100 p-2 rounded-2xl animate-in fade-in zoom-in-95">
                <button onClick={handleLogout} className="w-full text-left p-3 text-red-500 text-sm font-semibold flex items-center gap-3 hover:bg-red-50 rounded-xl transition-colors">
                  <LogOut className="w-4 h-4"/> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar Desktop */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-zinc-100 hidden lg:flex flex-col p-4">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${active ? 'bg-black text-white shadow-lg shadow-black/10' : 'text-zinc-500 hover:bg-zinc-50 hover:text-black'}`}>
                <item.icon className={`w-5 h-5 ${active ? 'text-white' : 'text-zinc-400'}`}/>
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                    active ? 'bg-white text-black' : 'bg-red-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="lg:ml-64 pt-24 min-h-screen">
        <div className="max-w-6xl mx-auto px-6 md:px-10 pb-20">
          <div className="flex items-center gap-2 text-[13px] text-zinc-400 mb-8 font-medium">
            <span>Portal</span> 
            <ChevronRight className="w-3.5 h-3.5 opacity-40"/> 
            <span className="text-black">{getCurrentPage()}</span>
          </div>
          
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <aside className="w-72 h-full bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <span className="text-xl font-bold font-['Syne'] tracking-tight">SmartLearn</span>
              <X className="w-6 h-6 text-zinc-400" onClick={() => setSidebarOpen(false)}/>
            </div>
            <nav className="space-y-2">
              {menuItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-4 py-4 rounded-2xl text-base font-medium ${pathname === item.href ? 'bg-black text-white' : 'text-zinc-500'}`}>
                  <item.icon className="w-5 h-5"/> 
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                      pathname === item.href ? 'bg-white text-black' : 'bg-red-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}
    </div>
  );
}
