interface RankBadgeProps {
  rank: number;
}

export function RankBadge({ rank }: RankBadgeProps) {
  const colors: Record<number, string> = {
    1: 'bg-yellow-100 text-yellow-800',
    2: 'bg-gray-100 text-gray-700',
    3: 'bg-amber-100 text-amber-800',
  };

  const colorClass = colors[rank] ?? 'bg-gray-50 text-gray-500';

  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-1 ${colorClass}`}>
      #{rank}
    </span>
  );
}
