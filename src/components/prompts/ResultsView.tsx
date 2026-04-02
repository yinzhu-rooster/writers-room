'use client';

import { PitchCard, type PitchData } from '@/components/pitches/PitchCard';

interface ResultsViewProps {
  pitches: PitchData[];
  isProcessed: boolean;
}

export function ResultsView({ pitches, isProcessed }: ResultsViewProps) {
  if (pitches.length === 0) {
    return <p className="text-center text-gray-500 py-8">No pitches were submitted</p>;
  }

  // Sort by rank if processed, otherwise chronological
  const sorted = isProcessed
    ? [...pitches].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    : pitches;

  return (
    <div className="space-y-3">
      {!isProcessed && (
        <p className="text-sm text-gray-500 text-center py-2">
          Results are being computed...
        </p>
      )}
      {sorted.map((pitch) => (
        <PitchCard key={pitch.id} pitch={pitch} isOpen={false} />
      ))}
    </div>
  );
}
