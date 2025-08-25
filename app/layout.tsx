import "../styles/globals.css";
import Link from "next/link";

export const metadata = { title: "CoachDeck", description: "Minimal 1:1 coaching workspace" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen flex flex-col">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-7xl p-4 flex items-center justify-between">
            <Link href="/" className="font-semibold text-lg">CoachDeck</Link>
            <Link href="/profile" aria-label="Settings" title="Settings" className="inline-flex p-2 rounded-[3px] hover:bg-gray-100">
              {/* Gear icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 9a3 3 0 100 6 3 3 0 000-6zm8.94 3a6.97 6.97 0 00-.14-1.34l2.02-1.57-2-3.46-2.43 1a6.99 6.99 0 00-2.32-1.34L13.7 1h-3.4l-.37 2.29a6.99 6.99 0 00-2.32 1.34l-2.43-1-2 3.46 2.02 1.57c-.09.44-.14.9-.14 1.34 0 .45.05.9.14 1.34L1.76 15.9l2 3.46 2.43-1c.66.55 1.43.99 2.32 1.34l.37 2.29h3.4l.37-2.29a6.99 6.99 0 002.32-1.34l2.43 1 2-3.46-2.02-1.57c.09-.44.14-.89.14-1.34z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </header>

        <div className="flex-1">{children}</div>

        <footer className="border-t text-center text-xs text-gray-500 py-4">
          <span className="font-medium">CoachDeck</span> • {year}
        </footer>
      </body>
    </html>
  );
}
