import "../styles/globals.css";

export const metadata = { title: "CoachDeck", description: "Minimal 1:1 coaching workspace" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>
        <footer className="border-t text-center text-xs text-gray-500 py-4">
          <span className="font-medium">CoachDeck</span> • {year}
        </footer>
      </body>
    </html>
  );
}
