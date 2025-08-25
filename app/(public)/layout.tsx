export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl w-full px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </main>
  );
}
