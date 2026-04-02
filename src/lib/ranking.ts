interface PitchForRanking {
  id: string;
  laugh_count: number;
  created_at: string;
}

export interface RankedPitch {
  id: string;
  rank: number;
}

export function rankPitches(pitches: PitchForRanking[]): RankedPitch[] {
  if (pitches.length === 0) return [];

  // Sort by laugh_count DESC, then created_at ASC (earlier = higher)
  const sorted = [...pitches].sort((a, b) => {
    if (b.laugh_count !== a.laugh_count) return b.laugh_count - a.laugh_count;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const result: RankedPitch[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    // Ties share rank (same laugh_count = same rank)
    if (i > 0 && sorted[i].laugh_count < sorted[i - 1].laugh_count) {
      currentRank = i + 1;
    }
    result.push({ id: sorted[i].id, rank: currentRank });
  }

  return result;
}
