export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="font-semibold text-2xl">CoachDeck</div>
        </div>
        <div className="card">{children}</div>
      </div>
    </main>
  );
}
