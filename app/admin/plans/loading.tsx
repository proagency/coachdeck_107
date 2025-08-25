export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-6 w-48 bg-gray-200 rounded-[3px]" />
      <div className="card space-y-3">
        <div className="h-5 w-40 bg-gray-200 rounded-[3px]" />
        <div className="grid md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-[3px]" />
          ))}
        </div>
        <div className="h-9 w-28 bg-gray-200 rounded-[3px]" />
      </div>
    </div>
  );
}
