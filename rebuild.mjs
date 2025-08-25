// patch.mjs
// Global header with Brand (link "/") left and Settings (gear SVG) right.
// Removes page-specific headers from public/dashboard layouts and coach payments page.
// Keeps dashboard sidebar as-is (only the global header at the very top).
import fs from "fs";
import path from "path";
const cwd = process.cwd();
const join = (...p) => path.join(cwd, ...p);
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function writeFile(rel, content){ const full=join(rel); ensureDir(path.dirname(full)); fs.writeFileSync(full, content, "utf8"); console.log("✓ wrote", rel); }

// 1) Global Root Layout with header + footer
writeFile("app/layout.tsx", `import "../styles/globals.css";
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
`);

// 2) Public layout (no header here; global header already in Root)
writeFile("app/(public)/layout.tsx", `export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-5xl w-full px-4 py-8">
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </main>
  );
}
`);

// 3) Dashboard layout (remove its own header; keep sidebar + content)
writeFile("app/(dashboard)/layout.tsx", `import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <main className="mx-auto max-w-7xl p-6 grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-4 lg:col-span-3">
        <div className="card space-y-2">
          <nav className="space-y-1">
            <a className="btn w-full justify-start" href="/decks">Dashboard</a>
            <a className="btn w-full justify-start" href="/tickets">Tickets</a>
            <a className="btn w-full justify-start" href="/coach/payments">Payments</a>
            <a className="btn w-full justify-start" href="/plans">Plans</a>
            <a className="btn w-full justify-start" href="/profile">Profile</a>
            {(session?.user as any)?.isSuperAdmin ? (
              <a className="btn w-full justify-start" href="/admin/plans">Plan Config</a>
            ) : null}
            {(session?.user as any)?.isSuperAdmin ? (
              <a className="btn w-full justify-start" href="/approvals">Approvals</a>
            ) : null}
          </nav>
        </div>
        <div className="card mt-4">
          {session?.user ? (
            <div className="space-y-2">
              <div className="text-sm">Signed in as <span className="font-medium">{session.user.email}</span></div>
              <form action="/api/auth/signout" method="post">
                <button className="btn w-full">Sign out</button>
              </form>
            </div>
          ) : (
            <form action="/api/auth/signin" method="get" className="space-y-3">
              <div className="label">Login / Create account</div>
              <button className="btn w-full" type="submit">Go to Sign in</button>
            </form>
          )}
        </div>
      </aside>

      <section className="col-span-12 md:col-span-8 lg:col-span-9">
        {children}
      </section>
    </main>
  );
}
`);

// 4) Remove page-local header from /coach/payments (rewrite page with no local header)
const coachPaymentsPath = "app/coach/payments/page.tsx";
if (fs.existsSync(join(coachPaymentsPath))) {
  const src = fs.readFileSync(join(coachPaymentsPath), "utf8");
  const cleaned = src
    // remove any block that looks like a local header area we previously added
    .replace(/\/\* Local header[\s\S]*?\*\/[\s\S]*?<div className="font-semibold text-lg">CoachDeck<\/div>[\s\S]*?<\/div>\s*<\/div>/m, "")
    // ensure top container remains as relative container we used
    .replace(/return\s*\(\s*<div className="relative">/, 'return (\n    <div className="relative">');
  writeFile(coachPaymentsPath, cleaned);
}

console.log("All done. Restart dev with `pnpm dev`.");
