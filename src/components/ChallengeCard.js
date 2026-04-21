'use client';

import { useState } from 'react';
import { Play, Clock, BookOpen, User } from 'lucide-react';

export default function ChallengeCard({ challenge, onPlay }) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlay = () => {
    setIsPlaying(true);
    onPlay(challenge);
  };

  return (
    <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6 hover:border-emerald-500/50 transition-all duration-200">
      {/* Challenge Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
              PEER CHALLENGE
            </span>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock className="h-3 w-3" />
              <span>Quick Challenge</span>
            </div>
          </div>
          
          <h3 className="font-['Syne'] text-lg font-semibold text-zinc-100 mb-1">
            {challenge.question?.substring(0, 50)}...
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              <span>{challenge.senderName}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>{challenge.courseTitle || 'Course'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Challenge Preview */}
      <div className="mb-4 p-3 rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <p className="text-sm text-zinc-300 line-clamp-2">
          {challenge.question}
        </p>
      </div>

      {/* Action Button */}
      <button
        onClick={handlePlay}
        disabled={isPlaying}
        className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold px-4 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPlaying ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-950 border-t-transparent"></div>
            Loading...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Play Now
          </>
        )}
      </button>
    </div>
  );
}
