export default function MainLoading() {
  return (
    <div className="space-y-4 py-4">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-lg" />
      ))}
    </div>
  );
}
