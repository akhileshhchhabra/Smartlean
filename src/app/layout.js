import { Syne, Inter } from "next/font/google";
import "./globals.css";
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';

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