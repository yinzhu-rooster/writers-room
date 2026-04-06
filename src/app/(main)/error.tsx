'use client';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-500 mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
