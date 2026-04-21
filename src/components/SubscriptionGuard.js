'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SubscriptionGuard({ children }) {
  const router = useRouter();
  const { user, loading, isSubscribed } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      const currentPath = window.location.pathname;
      
      // Check if user is trying to access subscription pages
      if (currentPath === '/subscribe' || currentPath === '/plans') {
        // If user is subscribed, redirect to dashboard
        if (isSubscribed) {
          console.log('Subscribed user accessing subscription page, redirecting to dashboard');
          router.push('/student-dashboard');
          return;
        }
      }
      
      // Check if user should be on dashboard but is accessing other pages
      if (isSubscribed && (currentPath === '/login' || currentPath === '/')) {
        console.log('Subscribed user should land on dashboard');
        router.push('/student-dashboard');
        return;
      }
    }
  }, [user, loading, isSubscribed, router]);

  // If still loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  // If not logged in, allow access to login/subscribe pages
  if (!user) {
    return children;
  }

  // If user is subscribed and accessing protected routes, show children
  if (isSubscribed) {
    return children;
  }

  // Default: allow access
  return children;
}
