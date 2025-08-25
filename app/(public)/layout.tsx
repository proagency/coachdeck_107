export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl p-4 text-center">
          <div className="font-semibold text-lg">CoachDeck</div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl w-full px-4 py-8">
        <div className="mx-auto w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
