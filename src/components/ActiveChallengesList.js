'use client';

import { useState, useEffect } from 'react';
import { onSnapshot, query, collection, where, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import ChallengeCard from './ChallengeCard';
import ChallengeQuizModal from './ChallengeQuizModal';

export default function ActiveChallengesList() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playingChallenge, setPlayingChallenge] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);

  // Real-time fetch of active challenges for current user
  useEffect(() => {
    if (!auth.currentUser?.email) return;

    setLoading(true);
    setError('');

    // Listen for challenges where current user is the receiver
    const q = query(
      collection(db, 'challenges'),
      where('receiverEmail', '==', auth.currentUser.email),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const challengeList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('DEBUG: Active challenges found:', challengeList.length);
        setChallenges(challengeList);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching challenges:', err);
        setError('Failed to load challenges. Please try again.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handlePlayChallenge = (challenge) => {
    console.log('DEBUG: Playing challenge:', challenge.id);
    setPlayingChallenge(challenge);
    setShowQuizModal(true);
  };

  const handleChallengeCompleted = async (challengeId, isCorrect) => {
    try {
      // Update challenge status to completed
      await updateDoc(doc(db, 'challenges', challengeId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        isCorrect: isCorrect
      });

      console.log('DEBUG: Challenge marked as completed:', challengeId);
      
      // Close modal
      setShowQuizModal(false);
      setPlayingChallenge(null);
    } catch (error) {
      console.error('Error updating challenge status:', error);
    }
  };

  const handleCloseModal = () => {
    setShowQuizModal(false);
    setPlayingChallenge(null);
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
          <span className="ml-3 text-zinc-400">Loading challenges...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
        <div className="text-center">
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto">
              <span className="text-2xl"> Inbox</span>
            </div>
          </div>
          <h3 className="font-['Syne'] text-lg font-semibold text-zinc-100 mb-2">
            No Active Challenges
          </h3>
          <p className="text-sm text-zinc-400">
            You don't have any pending challenges. Check back later or challenge your peers!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-['Syne'] text-2xl font-semibold tracking-tight text-zinc-100">
            Active Challenges
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {challenges.length} pending challenge{challenges.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-xs text-zinc-500">Real-time updates</div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            onPlay={handlePlayChallenge}
          />
        ))}
      </div>

      {/* Quiz Modal */}
      {showQuizModal && playingChallenge && (
        <ChallengeQuizModal
          challenge={playingChallenge}
          onClose={handleCloseModal}
          onCompleted={handleChallengeCompleted}
        />
      )}
    </div>
  );
}
