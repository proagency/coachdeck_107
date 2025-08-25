// patch.mjs
// Tidy homepage & auth pages: center content, remove sidebar there, add subtle footer.
// Creates route-group layouts so only dashboard keeps the left sidebar.
// Run: node patch.mjs

import fs from "fs";
import path from "path";

const cwd = process.cwd();
const join = (...p) => path.join(cwd, ...p);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function readFile(rel) {
  const full = join(rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}
function writeFile(rel, content) {
  const full = join(rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content, "utf8");
  console.log("✓ wrote", rel);
}
function moveFile(fromRel, toRel) {
  const from = join(fromRel);
  if (!fs.existsSync(from)) return false;
  const src = fs.readFileSync(from, "utf8");
  writeFile(toRel, src);
  fs.unlinkSync(from);
  console.log("→ moved", fromRel, "→", toRel);
  return true;
}

/* 1) Minimal root layout (no header/sidebar here), add subtle footer */
writeFile(
  "app/layout.tsx",
  `import "../styles/globals.css";

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
`
);

/* 2) Public layout (homepage, etc.): centered, wider, brand top, no sidebar */
writeFile(
  "app/(public)/layout.tsx",
  `export default function PublicLayout({ children }: { children: React.ReactNode }) {
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
`
);

/* 3) Move homepage into (public) so it uses the centered layout */
const movedHome = moveFile("app/page.tsx", "app/(public)/page.tsx");
if (!movedHome) {
  // If a public page already exists, ensure it’s there at least
  const existingPublic = readFile("app/(public)/page.tsx");
  if (!existingPublic) {
    writeFile(
      "app/(public)/page.tsx",
      `import Link from "next/link";
export default function Landing() {
  return (
    <div className="prose max-w-none text-center">
      <h1>CoachDeck</h1>
      <p className="muted">A minimalist workspace for coaches and students.</p>
      <div className="mt-6 flex justify-center">
        <Link className="btn btn-primary" href="/decks">Get Started</Link>
      </div>
    </div>
  );
}
`
    );
  }
}

/* 4) Dashboard layout (ONLY here the left sidebar lives) */
writeFile(
  "app/(dashboard)/layout.tsx",
  `import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <div>
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl p-4 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg">CoachDeck</Link>
          <div />
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6 grid grid-cols-12 gap-4">
        <aside className="col-span-12 md:col-span-4 lg:col-span-3">
          <div className="card space-y-2">
            <nav className="space-y-1">
              <a className="btn w-full justify-start" href="/decks">Dashboard</a>
              <a className="btn w-full justify-start" href="/tickets">Tickets</a>
              <a className="btn w-full justify-start" href="/payments">Payments</a>
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
    </div>
  );
}
`
);

/* 5) Auth layout (centered, brand on top, no top nav) */
writeFile(
  "app/(auth)/layout.tsx",
  `export default function AuthLayout({ children }: { children: React.ReactNode }) {
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
`
);

/* 6) Optional: ensure auth pages exist and are simple */
function ensureAuthPage(rel, title, inner) {
  const src = readFile(rel);
  if (src) return;
  writeFile(
    rel,
    `"use client";
import React from "react";
export const metadata = { title: "${title} — CoachDeck" };
export default function Page() {
  return (
    <div className="space-y-4">
      ${inner}
    </div>
  );
}
`
  );
}
ensureAuthPage(
  "app/(auth)/signin/page.tsx",
  "Sign In",
  `<h1 className="text-xl font-semibold text-center">Sign in</h1>
<form action="/api/auth/signin" method="post" className="space-y-3">
  <label className="label">Email
    <input className="input" type="email" name="email" required placeholder="you@example.com" />
  </label>
  <label className="label">Password
    <input className="input" type="password" name="password" required />
  </label>
  <button className="btn btn-primary w-full" type="submit">Sign in</button>
  <div className="text-center text-sm">
    <a className="underline" href="/forgot">Forgot password?</a>
  </div>
  <div className="text-center text-sm">
    <a className="underline" href="/signup">Create account</a>
  </div>
</form>`
);

ensureAuthPage(
  "app/(auth)/signup/page.tsx",
  "Create Account",
  `<h1 className="text-xl font-semibold text-center">Create account</h1>
<form action="/api/auth/signup" method="post" className="space-y-3">
  <label className="label">Email
    <input className="input" type="email" name="email" required placeholder="you@example.com" />
  </label>
  <label className="label">Password
    <input className="input" type="password" name="password" required />
  </label>
  <button className="btn btn-primary w-full" type="submit">Create account</button>
  <div className="text-center text-sm">
    <a className="underline" href="/signin">Have an account? Sign in</a>
  </div>
</form>`
);

ensureAuthPage(
  "app/(auth)/forgot/page.tsx",
  "Forgot Password",
  `<h1 className="text-xl font-semibold text-center">Reset password</h1>
<form action="/api/auth/forgot" method="post" className="space-y-3">
  <label className="label">Email
    <input className="input" type="email" name="email" required placeholder="you@example.com" />
  </label>
  <button className="btn btn-primary w-full" type="submit">Send reset link</button>
  <div className="text-center text-sm">
    <a className="underline" href="/signin">Back to Sign in</a>
  </div>
</form>`
);

console.log("All done. Restart dev server with `pnpm dev`.");
