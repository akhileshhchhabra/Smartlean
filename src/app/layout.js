import { Syne, Inter } from "next/font/google";
import "./globals.css";
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';
import { AuthProvider } from '@/contexts/AuthContext';

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
  return (
    <html lang="en" className={`${syne.variable} ${inter.variable} h-full antialiased`} suppressHydrationWarning={true}>
      <body className="min-h-full flex flex-col bg-[#fafafa] font-['Inter'] leading-relaxed tracking-wide">
        <AuthProvider>
          <div className="grain-overlay opacity-30" />
          <Navbar />
          
          {/* Main content with refined container and spacing */}
          <main className="flex-grow">
            <div className="max-w-7xl mx-auto px-8 py-6">
              {children}
            </div>
          </main>

          {/* Footer with glassmorphism effect */}
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
