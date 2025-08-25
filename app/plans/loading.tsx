export default function LoadingPlans() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-7 w-48 bg-gray-200 rounded-[3px]" />
      <div className="card flex items-center justify-between">
        <div className="space-y-2 w-60">
          <div className="h-3 w-24 bg-gray-200 rounded-[3px]" />
          <div className="h-4 w-36 bg-gray-200 rounded-[3px]" />
        </div>
        <div className="h-3 w-40 bg-gray-100 rounded-[3px]" />
      </div>

      <div className="card flex items-center gap-3">
        <div className="h-9 w-28 bg-gray-200 rounded-[3px]" />
        <div className="h-9 w-24 bg-gray-200 rounded-[3px]" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="card space-y-3">
            <div className="h-5 w-24 bg-gray-200 rounded-[3px]" />
            <div className="h-3 w-40 bg-gray-100 rounded-[3px]" />
            <div className="h-7 w-36 bg-gray-200 rounded-[3px]" />
            <div className="h-9 w-32 bg-gray-200 rounded-[3px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
