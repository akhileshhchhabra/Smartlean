'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, User } from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Navbar() {
  const router = useRouter();
  const profileRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      const handleScroll = () => setScrolled(window.scrollY > 20);
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } else {
        setUser(null);
        setUserRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setProfileOpen(false);
    try {
      await signOut(auth);
      setUser(null);
      setUserRole(null);
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Search query:', searchQuery);
  };

  const getDashboardLink = () => {
    return userRole === 'Teacher' ? '/teacher-dashboard' : '/student-dashboard';
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-white/90 backdrop-blur-md border-b border-zinc-100 py-3">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between gap-6 h-14">
          
          {/* LEFT: Logo */}
          <Link href="/" className="flex-shrink-0 text-xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.02em]">
            SmartLearn
          </Link>

          {/* CENTER: Search Bar - Ab yeh sirf tab dikhega jab user login hoga */}
          {user && (
            <form onSubmit={handleSearch} className="flex-1 max-w-lg hidden md:block">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses, notes..."
                  className="w-full pl-11 pr-4 py-2 bg-[#F5F5F7] rounded-full text-sm text-[#1D1D1F] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                />
              </div>
            </form>
          )}

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {user ? (
              <>
                <Link 
                  href={getDashboardLink()} 
                  className="hidden sm:block text-sm font-medium text-zinc-500 hover:text-[#1D1D1F] transition-colors"
                >
                  Dashboard
                </Link>
                
                <button className="relative p-2 rounded-full hover:bg-[#F5F5F7] transition-colors">
                  <Bell className="w-5 h-5 text-zinc-500" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>
                
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-[#1D1D1F] hover:bg-zinc-800 transition-colors"
                  >
                    <User className="w-4 h-4 text-white" />
                  </button>
                  
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-3 w-56 bg-white rounded-2xl shadow-lg border border-zinc-100 py-2">
                      <div className="px-4 py-3 border-b border-zinc-100">
                        <p className="text-sm font-medium text-[#1D1D1F] truncate">{user.email}</p>
                        <p className="text-xs text-zinc-400 capitalize">{userRole || 'Student'}</p>
                      </div>
                      <Link 
                        href={getDashboardLink()} 
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-500 hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-all"
                      >
                        Go to Dashboard
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <Link href="/login" className="text-sm font-medium text-zinc-500 hover:text-[#1D1D1F] transition-colors">
                  Login
                </Link>
                <Link href="/signup" className="px-5 py-2 bg-[#1D1D1F] text-white rounded-full text-sm font-semibold hover:bg-zinc-800 transition-colors">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu (Search bar also protected here) */}
        {menuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-zinc-100">
            {user && (
              <form onSubmit={handleSearch} className="my-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search courses..."
                    className="w-full pl-11 pr-4 py-2 bg-[#F5F5F7] rounded-full text-sm"
                  />
                </div>
              </form>
            )}
            <div className="flex flex-col gap-4">
              <Link href="/" className="text-zinc-500 font-medium">Home</Link>
              {user ? (
                <>
                  <Link href={getDashboardLink()} className="text-[#1D1D1F] font-medium">Dashboard</Link>
                  <button onClick={handleLogout} className="text-left text-red-600 font-medium">Logout</button>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  <Link href="/login" className="text-zinc-500">Login</Link>
                  <Link href="/signup" className="text-[#1D1D1F]">Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}