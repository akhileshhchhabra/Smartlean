'use client';

import { Check, Zap, Crown } from 'lucide-react';
import { db, auth } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function SubscribePage() {
  const router = useRouter();

  const handlePlanSelect = async (planType) => {
    const user = auth.currentUser;
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        
        // Calculate expiry date (current date + 30 days)
        const currentDate = new Date();
        const expiryDate = new Date(currentDate);
        expiryDate.setDate(expiryDate.getDate() + 30);
        
        await setDoc(userRef, {
          subscriptionPlan: planType,
          subscriptionStatus: 'active',
          subscriptionExpiry: expiryDate.toISOString(),
          hasSelectedPlan: true,
          planSelectedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log('Subscription activated, redirecting to dashboard');
        router.push('/student-dashboard');
      } catch (err) {
        console.error("Error updating plan:", err);
        alert("Something went wrong. Please try again.");
      }
    } else {
      router.push('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col items-center justify-center p-6 font-['Inter']">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-[#1D1D1F] font-['Syne'] mb-4 tracking-tight">Choose your learning path</h1>
        <p className="text-zinc-500 text-lg">Every great journey starts with a single step.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Basic Plan */}
        <div className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 flex flex-col shadow-sm hover:shadow-xl transition-all duration-500">
          <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center mb-6">
            <Zap className="w-7 h-7 text-zinc-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1D1D1F]">Basic Learner</h2>
          <div className="my-6 flex items-baseline gap-1">
            <span className="text-5xl font-bold text-[#1D1D1F]">Basic: </span>
            <span className="text-5xl font-bold text-[#1D1D1F]">500</span>
            <span className="text-zinc-400 font-medium">/month</span>
          </div>
          <ul className="space-y-4 mb-10 flex-1 text-zinc-600">
            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/> HD Video Lectures</li>
            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-green-500"/> Community Forum Access</li>
            <li className="flex items-center gap-3 text-zinc-300">× All Courses Included</li>
          </ul>
          <button 
            onClick={() => handlePlanSelect('basic')} 
            className="w-full py-4 bg-[#F5F5F7] text-[#1D1D1F] rounded-2xl font-bold hover:bg-zinc-200 transition-all"
          >
            Start with Basic
          </button>
        </div>

        {/* Premium Plan */}
        <div className="bg-[#1D1D1F] p-10 rounded-[2.5rem] text-white flex flex-col shadow-2xl relative transform md:scale-105 overflow-hidden">
          <div className="absolute top-6 right-8 bg-white/10 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-white/10">Recommended</div>
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
            <Crown className="w-7 h-7 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold">All-Access Pro</h2>
          <div className="my-6 flex items-baseline gap-1">
            <span className="text-5xl font-bold">Premium: </span>
            <span className="text-5xl font-bold">1000</span>
            <span className="text-white/40 font-medium">/month</span>
          </div>
          <ul className="space-y-4 mb-10 flex-1 text-white/80">
            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-yellow-400"/> All Courses <span className="text-[10px] bg-yellow-400 text-black px-2 py-0.5 rounded-full font-black">FREE</span></li>
            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-yellow-400"/> 1-on-1 Personal Mentor</li>
            <li className="flex items-center gap-3"><Check className="w-5 h-5 text-yellow-400"/> Offline Study Resources</li>
          </ul>
          <button 
            onClick={() => handlePlanSelect('premium')} 
            className="w-full py-4 bg-white text-black rounded-2xl font-bold hover:bg-zinc-200 transition-all"
          >
            Unlock All Access
          </button>
        </div>
      </div>
    </div>
  );
}
