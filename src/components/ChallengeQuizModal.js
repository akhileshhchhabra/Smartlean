'use client';

import { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';

export default function ChallengeQuizModal({ challenge, onClose, onCompleted }) {
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleAnswerSelect = (answerIndex) => {
    if (showResult) return; // Prevent changing answer after submission

    setSelectedAnswer(answerIndex);
    const correct = answerIndex === challenge.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);

    // Update challenge status immediately
    onCompleted(challenge.id, correct);
  };

  const handleClose = () => {
    if (showResult) {
      onClose();
    }
  };

  const getOptionStyle = (index) => {
    if (!showResult) {
      return selectedAnswer === index
        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
        : 'border-zinc-800 bg-zinc-950 text-zinc-100 hover:bg-zinc-900 cursor-pointer';
    }

    if (index === challenge.correctAnswer) {
      return 'border-green-500/50 bg-green-500/10 text-green-100';
    }

    if (selectedAnswer === index && !isCorrect) {
      return 'border-red-500/50 bg-red-500/10 text-red-100';
    }

    return 'border-zinc-800 bg-zinc-950 text-zinc-400 opacity-50';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/20 p-3">
              <span className="text-lg font-bold text-emerald-300">?</span>
            </div>
            <div>
              <h3 className="font-['Syne'] text-lg font-semibold tracking-tight text-zinc-100">
                Peer Challenge
              </h3>
              <p className="text-sm text-emerald-100/90">
                From {challenge.senderName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={!showResult}
            className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition-colors ${
              showResult
                ? 'border-zinc-800 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                : 'border-zinc-800 bg-zinc-950 text-zinc-500 cursor-not-allowed'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {/* Course Info */}
          <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Course</p>
                <p className="mt-1 font-semibold text-zinc-100">
                  {challenge.courseTitle || 'Course'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Challenge</p>
                <p className="mt-1 font-semibold text-zinc-100">
                  Quick Quiz
                </p>
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Question</div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <p className="text-lg font-medium text-zinc-100 leading-relaxed">
                {challenge.question}
              </p>
            </div>
          </div>

          {/* Answer Options */}
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">Choose Your Answer</div>
            <div className="space-y-3">
              {challenge.options?.map((option, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showResult}
                  className={`w-full rounded-2xl border px-5 py-4 text-left text-sm font-semibold transition-all duration-300 ${getOptionStyle(index)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                        showResult
                          ? index === challenge.correctAnswer
                            ? 'border-green-500 bg-green-500'
                            : selectedAnswer === index && !isCorrect
                            ? 'border-red-500 bg-red-500'
                            : 'border-zinc-600 bg-zinc-800'
                          : selectedAnswer === index
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-zinc-600'
                      }`}>
                        {showResult && index === challenge.correctAnswer && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                        {showResult && selectedAnswer === index && !isCorrect && (
                          <X className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span>Option {String.fromCharCode(65 + index)}</span>
                    </div>
                    <span className="flex-1 text-right">{option}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Result Message */}
          {showResult && (
            <div className={`rounded-2xl border p-4 ${
              isCorrect
                ? 'border-green-500/30 bg-green-500/10'
                : 'border-red-500/30 bg-red-500/10'
            }`}>
              <div className="flex items-center gap-3">
                {isCorrect ? (
                  <Check className="h-5 w-5 text-green-300" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-300" />
                )}
                <div>
                  <p className={`font-semibold ${
                    isCorrect ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {isCorrect ? 'Correct! Well done!' : 'Not quite right'}
                  </p>
                  {!isCorrect && (
                    <p className="text-sm text-red-200/80 mt-1">
                      The correct answer was: {challenge.options[challenge.correctAnswer]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!showResult && (
            <div className="text-center text-xs text-zinc-500">
              Click an option to submit your answer instantly
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
