import { Syne, Inter } from "next/font/google";
import "./globals.css";
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { auth } from '@/lib/firebase';
import { useState, useEffect } from 'react';

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata = {
  title: "SmartLearn — Premium Education Platform",
  description: "SmartLearn is a modern education platform with AI tutoring, live classes, and smart dashboards.",
};

export default function RootLayout({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <html lang="en" className={`${syne.variable} ${inter.variable} h-full antialiased`} suppressHydrationWarning={true}>
        <body className="min-h-full flex flex-col bg-[#FBFBFD] font-['Inter']">
          <div className="grain-overlay" />
          <Navbar />
          <main className="flex-grow">
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-zinc-500">Loading...</div>
            </div>
          </main>
          <Footer />
        </body>
      </html>
    );
  }

  // Dashboard Protection: Check user role and verification status
  if (user && user.role === 'teacher' && !user.isVerified) {
    return (
      <html lang="en" className={`${syne.variable} ${inter.variable} h-full antialiased`} suppressHydrationWarning={true}>
        <body className="min-h-full flex flex-col bg-[#FBFBFD] font-['Inter']">
          <div className="grain-overlay" />
          <Navbar />
          <main className="flex-grow">
            <div className="min-h-screen flex items-center justify-center p-8">
              <div className="bg-white rounded-3xl border border-zinc-100 p-12 max-w-md w-full text-center shadow-sm">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
                  <div className="w-10 h-10 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h2 className="text-3xl font-bold text-[#1D1D1F] mb-4">Verification Pending</h2>
                <p className="text-zinc-600 text-lg mb-6">
                  Your application is under review. Admin will verify your profile within 2-3 hours.
                </p>
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-amber-800 text-sm">
                      <strong>Status:</strong> {user.verificationStatus === 'pending' ? 'Pending Review' : 'Processing'}
                    </p>
                  </div>
                  <div className="text-sm text-zinc-500">
                    Submitted: {user.submittedAt ? new Date(user.submittedAt.toDate()).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </body>
      </html>
    );
  }

  return (
    <html lang="en" className={`${syne.variable} ${inter.variable} h-full antialiased`} suppressHydrationWarning={true}>
      <body className="min-h-full flex flex-col bg-[#FBFBFD] font-['Inter']">
        <div className="grain-overlay" />
        <Navbar />
        
        {/* Main content flex-grow karega taaki footer humesha niche rahe */}
        <main className="flex-grow">
          {children}
        </main>

        {/* Footer yahan rahega taaki har page ke niche dikhe */}
        <Footer />
      </body>
    </html>
  );
}