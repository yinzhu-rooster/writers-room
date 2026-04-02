interface LoadingSkeletonProps {
  count?: number;
  height?: string;
}

export function LoadingSkeleton({ count = 3, height = 'h-20' }: LoadingSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`${height} rounded-lg bg-gray-100 animate-pulse`} />
      ))}
    </div>
  );
}
