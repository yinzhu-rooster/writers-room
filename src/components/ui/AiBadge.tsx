interface AiBadgeProps {
  size?: 'sm' | 'md';
}

export function AiBadge({ size = 'sm' }: AiBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'px-1 py-0.5 text-[10px]'
    : 'px-2 py-0.5 text-xs';

  return (
    <span className={`inline-flex items-center rounded bg-violet-100 ${sizeClasses} font-semibold text-violet-700 uppercase tracking-wide`}>
      AI
    </span>
  );
}
