interface ReactionCountsProps {
  laugh: number;
  smile: number;
  surprise: number;
}

export function ReactionCounts({ laugh, smile, surprise }: ReactionCountsProps) {
  const total = laugh + smile + surprise;
  if (total === 0) return <span className="text-xs text-gray-400">No reactions</span>;

  return (
    <div className="flex items-center gap-3 text-sm">
      {laugh > 0 && <span>{'\u{1F602}'} {laugh}</span>}
      {smile > 0 && <span>{'\u{1F604}'} {smile}</span>}
      {surprise > 0 && <span>{'\u{1F62E}'} {surprise}</span>}
    </div>
  );
}
