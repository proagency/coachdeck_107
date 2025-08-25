// patch.mjs
// Adds role-aware sidebar navigation.
// - creates lib/nav.ts with getSidebarLinks()
// - overwrites app/(dashboard)/layout.tsx to use getSidebarLinks()
// Usage: node patch.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const join = (...p) => path.join(root, ...p);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function writeFile(relPath, contents) {
  const abs = join(relPath);
  ensureDir(path.dirname(abs));
  fs.writeFileSync(abs, contents, "utf8");
  console.log("✓ wrote", relPath);
}

/* 1) Role-aware nav helper */
writeFile(
  "lib/nav.ts",
  `export type Role = "SUPER_ADMIN" | "COACH" | "STUDENT";

export type NavLink = { href: string; label: string };

export function getSidebarLinks(user: { role?: Role; isSuperAdmin?: boolean } | null): NavLink[] {
  if (!user) return [];

  const links: NavLink[] = [
    { href: "/decks", label: "Dashboard" },
    { href: "/tickets", label: "Tickets" },
  ];

  // Coach tools
  if (user.role === "COACH" || user.isSuperAdmin) {
    links.push({ href: "/coach/payments", label: "Payments" });
    links.push({ href: "/plans", label: "Plans" });
  }

  // Student tools
  if (user.role === "STUDENT") {
    links.push({ href: "/payments", label: "Payments" });
  }

  // Admin-only tools
  if (user.isSuperAdmin) {
    links.push({ href: "/approvals", label: "Approvals" });
    links.push({ href: "/admin/plans", label: "Plan Config" }); // keep or remove depending on your routes
  }

  links.push({ href: "/profile", label: "Profile" });

  return links;
}
`
);

/* 2) Dashboard layout that renders links dynamically */
writeFile(
  "app/(dashboard)/layout.tsx",
  `import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSidebarLinks } from "@/lib/nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const user = session?.user
    ? {
        role: (session.user as any).role as any,
        isSuperAdmin: Boolean((session.user as any).isSuperAdmin),
      }
    : null;

  const links = getSidebarLinks(user);

  return (
    <main className="mx-auto max-w-7xl p-6 grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-4 lg:col-span-3">
        <div className="card space-y-2">
          <nav className="space-y-1">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="btn w-full justify-start">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="card mt-4">
          {session?.user ? (
            <div className="space-y-2">
              <div className="text-sm">
                Signed in as <span className="font-medium">{session.user.email}</span>
              </div>
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
`
);

console.log("Done. Restart your dev server (pnpm dev).")
