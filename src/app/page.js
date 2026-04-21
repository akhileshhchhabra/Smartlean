'use client';

import Link from 'next/link';

// ── DATA ──────────────────────────────────────────────
const stats = [
  { value: '50,000+', label: 'Active Students' },
  { value: '1,200+', label: 'Courses Available' },
  { value: '98%', label: 'Satisfaction Rate' },
  { value: '300+', label: 'Expert Educators' },
];

const features = [
  {
    title: 'Smart Dashboard',
    desc: 'Personalized overview of grades, attendance, assignments and upcoming deadlines — all in one place.',
    size: 'large',
  },
  {
    title: 'AI Tutor Bot',
    desc: 'Ask doubts anytime. Our AI assistant explains concepts, solves problems and adapts to your learning pace.',
  },
  {
    title: 'Live Classes',
    desc: 'Real-time video sessions with attendance tracking, polls, Q&A, chat and automatic recording.',
  },
  {
    title: 'Quiz & Assignment',
    desc: 'Auto-graded quizzes with instant feedback, deadline tracking and per-student analytics.',
  },
  {
    title: 'Progress Analytics',
    desc: 'Real-time reports for teachers and parents on student milestones and growth trends.',
  },
  {
    title: 'Parent Portal',
    desc: 'Parents stay connected — view fees, attendance, performance reports and announcements.',
  },
];

const steps = [
  { num: '01', title: 'Create Your Account', desc: 'Sign up in 30 seconds. No credit card required. Choose your role: Student, Teacher, or Admin.' },
  { num: '02', title: 'Pick Your Courses', desc: 'Browse 1,200+ courses across all subjects. Filter by category, level, or educator.' },
  { num: '03', title: 'Start Learning', desc: 'Access live classes, AI tutoring, assignments, and track your progress — all in one platform.' },
];

const modules = [
  'Student Dashboard', 'Teacher Portal', 'Admin Panel',
  'Attendance Tracker', 'Fee Management', 'Digital Library',
  'Discussion Forum', 'Timetable', 'Certificates',
  'Notifications', 'Result Generator', 'AI Chatbot',
  'Live Classes', 'Quiz Engine', 'Parent Portal',
];

const testimonials = [
  {
    name: 'Rahul Sharma',
    role: 'B.Tech Student, Landran',
    quote: 'SmartLearn completely changed how I study. The AI tutor explains concepts better than anyone else.',
  },
  {
    name: 'Priya Kumari',
    role: '12th Grade, Mumbai',
    quote: 'The live classes and quiz engine helped me score 95% in my boards. Absolutely love this platform!',
  },
  {
    name: 'Amit Verma',
    role: 'Teacher, Bangalore',
    quote: 'Managing 200+ students used to be chaos. SmartLearn made attendance, grades and communication effortless.',
  },
];

const globalAvatars = [
  { name: 'User', color: 'bg-zinc-300' },
  { name: 'User', color: 'bg-zinc-400' },
  { name: 'User', color: 'bg-zinc-500' },
  { name: 'User', color: 'bg-zinc-600' },
  { name: 'User', color: 'bg-zinc-700' },
];

// ── PAGE ──────────────────────────────────────────────
export default function HomePage() {
  return (
    <div className="bg-[#FBFBFD] text-zinc-500 font-['Inter'] min-h-screen">

      {/* ─── HERO SECTION ─── */}
      <section className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center px-6 pt-40 pb-24">

        {/* Trusted By Bar */}
        <div className="inline-flex items-center gap-4 mb-12 px-8 py-5 soft-card rounded-full">
          <div className="flex -space-x-4">
            {globalAvatars.map((avatar, i) => (
              <div key={i} className={`w-12 h-12 ${avatar.color} rounded-full border-4 border-[#FBFBFD]`} />
            ))}
          </div>
          <span className="text-sm text-zinc-600 font-['Inter']">Trusted by 50,000+ students across 120+ countries</span>
        </div>

        <h1 className="text-5xl md:text-8xl font-semibold text-[#1D1D1F] font-['Syne'] leading-[0.95] tracking-[-0.04em] max-w-5xl mb-8">
          Learn Smarter.<br />
          Grow Faster.<br />
          Achieve More.
        </h1>

        <p className="text-lg md:text-xl text-zinc-500 max-w-2xl leading-[1.8] mb-12">
          SmartLearn brings students, teachers, and parents onto one powerful platform — with AI tutoring, live classes, and real-time tracking.
        </p>

        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/signup" className="px-10 py-4 matte-btn font-semibold rounded-full">
            Start Learning Free
          </Link>
          <Link href="/courses" className="px-10 py-4 ghost-btn font-medium rounded-full">
            Explore Courses
          </Link>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <div className="border-y border-zinc-100 py-20 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="text-4xl md:text-5xl font-semibold text-[#1D1D1F] font-['Syne'] tracking-[-0.04em] mb-3">
                {s.value}
              </div>
              <div className="text-xs font-medium text-zinc-400 uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── FEATURES: Bento Grid ─── */}
      <section className="max-w-7xl mx-auto py-40 px-6">
        <div className="text-center mb-16">
          <span className="inline-block px-6 py-3 soft-card rounded-full text-xs font-medium text-zinc-500 uppercase tracking-widest">
            What We Offer
          </span>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Large card - spans 2 columns */}
          <div className="md:col-span-2 soft-card group p-12 rounded-[2.5rem]">
            <h3 className="text-2xl font-semibold text-[#1D1D1F] font-['Syne'] mb-5 tracking-[-0.02em]">{features[0].title}</h3>
            <p className="text-zinc-500 leading-[1.8] max-w-lg">{features[0].desc}</p>
          </div>
          {/* Regular cards */}
          {features.slice(1).map((f) => (
            <div key={f.title} className="soft-card group p-10 rounded-[2.5rem]">
              <h3 className="text-lg font-medium text-[#1D1D1F] font-['Syne'] mb-4 tracking-[-0.01em]">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-[1.8]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="max-w-7xl mx-auto py-32 px-6">
        <div className="text-center mb-20">
          <span className="inline-block px-6 py-3 soft-card rounded-full text-xs font-medium text-zinc-500 uppercase tracking-widest">
            The Process
          </span>
          <h2 className="text-4xl md:text-6xl font-semibold text-[#1D1D1F] font-['Syne'] mt-8 tracking-[-0.04em]">
            Get Started in 3 Steps
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Subtle Line */}
          <div className="hidden md:block absolute top-16 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
          
          {steps.map((s) => (
            <div key={s.num} className="relative z-10 text-center p-12 soft-card rounded-[2.5rem] group">
              <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-[1.5rem] flex items-center justify-center font-['Syne'] text-lg font-medium mb-8 group-hover:bg-zinc-200 transition-colors">
                {s.num}
              </div>
              <h3 className="text-lg font-medium text-[#1D1D1F] font-['Syne'] mb-4 tracking-[-0.01em]">{s.title}</h3>
              <p className="text-sm text-zinc-500 leading-[1.8]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── MODULES CLOUD ─── */}
      <section className="max-w-7xl mx-auto py-40 px-6">
        <h2 className="text-2xl font-semibold text-[#1D1D1F] font-['Syne'] mb-12 text-center tracking-[-0.02em]">
          15+ Powerful Modules
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {modules.map((m) => (
            <span key={m} className="px-8 py-4 soft-card rounded-full text-sm text-zinc-500 hover:text-zinc-800 cursor-default transition-all duration-300">
              {m}
            </span>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="max-w-7xl mx-auto py-40 px-6 border-t border-zinc-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div key={t.name} className="soft-card p-12 rounded-[2.5rem]">
              <div className="text-zinc-300 text-xs mb-8 tracking-[0.2em]">★★★★★</div>
              <p className="text-zinc-500 mb-10 leading-[1.9]">"{t.quote}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-500 font-['Syne'] text-sm">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="text-sm font-medium text-[#1D1D1F] font-['Syne'] tracking-[-0.01em]">{t.name}</div>
                  <div className="text-[10px] text-zinc-400 uppercase tracking-widest">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative py-40 px-6">
        <div className="max-w-3xl mx-auto p-20 soft-card rounded-[3rem] text-center">
          <h2 className="text-4xl md:text-5xl font-semibold text-[#1D1D1F] font-['Syne'] mb-8 tracking-[-0.04em]">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-zinc-500 mb-12 leading-[1.8] text-lg">
            Join 50,000+ students already using SmartLearn to make education smarter and more effective.
          </p>
          <div className="flex flex-wrap justify-center gap-5">
            <Link href="/signup" className="px-12 py-5 matte-btn font-semibold rounded-full">
              Get Started Free
            </Link>
            <Link href="/contact" className="px-12 py-5 ghost-btn font-medium rounded-full">
              Talk to Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}