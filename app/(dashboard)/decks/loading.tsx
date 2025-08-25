export default function LoadingDecks() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-6 w-40 rounded-[3px] bg-gray-200" />
        <div className="h-9 w-28 rounded-[3px] bg-gray-200" />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card space-y-3">
            <div className="h-5 w-1/2 rounded-[3px] bg-gray-200" />
            <div className="h-4 w-2/3 rounded-[3px] bg-gray-100" />
            <div className="h-9 w-24 rounded-[3px] bg-gray-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
