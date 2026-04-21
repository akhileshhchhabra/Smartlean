'use client';

import Link from 'next/link';

export default function Footer() {
  const cols = {
    Platform: [
      { label: 'Courses', href: '/courses' },
      { label: 'Live Classes', href: '/live' },
      { label: 'Assignments', href: '/assignments' },
    ],
    Company: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
    ],
    Support: [
      { label: 'Help Center', href: '/help' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'FAQs', href: '/faqs' },
    ],
    Legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  };

  return (
    <footer className="bg-[#FBFBFD] text-zinc-400 pt-24 pb-8 border-t border-zinc-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-12 mb-20">
          {Object.entries(cols).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-medium text-[#1D1D1F] mb-6 text-sm tracking-[-0.01em] font-['Syne']">{title}</h3>
              <ul className="space-y-4">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-zinc-400 hover:text-zinc-600 transition-colors text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-zinc-100 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-zinc-300 text-sm">© 2026 SmartLearn. All rights reserved.</p>
          <div className="flex gap-10">
            <Link href="/privacy" className="text-zinc-300 hover:text-zinc-500 transition-colors text-sm">Privacy</Link>
            <Link href="/terms" className="text-zinc-300 hover:text-zinc-500 transition-colors text-sm">Terms</Link>
            <Link href="/cookies" className="text-zinc-300 hover:text-zinc-500 transition-colors text-sm">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}