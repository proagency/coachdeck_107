// patch.mjs
// Adds icons to the left sidebar via a dynamic Sidebar component.
// - components/ui/Icons.tsx: a tiny inline SVG icon pack (no deps)
// - components/nav/Sidebar.tsx: role-aware nav with icons
// - Patches app/layout.tsx to render <Sidebar /> inside <aside>
//
// Usage: node patch.mjs

import fs from "fs";
import path from "path";

const root = process.cwd();
const join = (...p) => path.join(root, ...p);
const ensureDir = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const write = (rel, s) => { const f = join(rel); ensureDir(path.dirname(f)); fs.writeFileSync(f, s, "utf8"); console.log("✓ wrote", rel); };
const exists = (rel) => fs.existsSync(join(rel));

// 1) Icons (dependency-free)
write(
  "components/ui/Icons.tsx",
  `import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const S = ({ children, size = 18, ...rest }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" {...rest}>{children}</svg>
);

export const HomeIcon = (p: IconProps) => (
  <S {...p}><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></S>
);

export const LayersIcon = (p: IconProps) => (
  <S {...p}><path d="m12 2 8.5 5L12 12 3.5 7 12 2Zm8.5 10L12 17l-8.5-5M20.5 17 12 22 3.5 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></S>
);

export const TicketIcon = (p: IconProps) => (
  <S {...p}><path d="M4 7h16v4a2 2 0 1 0 0 4v4H4v-4a2 2 0 1 0 0-4V7Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 7v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></S>
);

export const FileIcon = (p: IconProps) => (
  <S {...p}><path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12V9l-4-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></S>
);

export const CreditCardIcon = (p: IconProps) => (
  <S {...p}><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/><path d="M3 10h18" stroke="currentColor" strokeWidth="1.6"/><path d="M7 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></S>
);

export const BankIcon = (p: IconProps) => (
  <S {...p}><path d="M3 10 12 5l9 5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M5 10v7M9 10v7M15 10v7M19 10v7" stroke="currentColor" strokeWidth="1.6"/><path d="M3 17h18M2 20h20" stroke="currentColor" strokeWidth="1.6"/></S>
);

export const BadgeIcon = (p: IconProps) => (
  <S {...p}><path d="M12 3l2.5 4.8L20 9l-4 3.9L17 19l-5-2.7L7 19l1-6.1L4 9l5.5-1.2L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></S>
);

export const ShieldCheckIcon = (p: IconProps) => (
  <S {...p}><path d="M12 3 5 6v6c0 4.4 3.1 7.9 7 9 3.9-1.1 7-4.6 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.6"/><path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></S>
);

export const UserIcon = (p: IconProps) => (
  <S {...p}><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6"/><path d="M5 19a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></S>
);

export const LogInIcon = (p: IconProps) => (
  <S {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.6"/><path d="M10 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M15 12H3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></S>
);

export const LogOutIcon = (p: IconProps) => (
  <S {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.6"/><path d="M14 17l5-5-5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M19 12H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></S>
);
`
);

// 2) Sidebar (server component; role-aware with icons)
write(
  "components/nav/Sidebar.tsx",
  `import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  HomeIcon,
  LayersIcon,
  TicketIcon,
  FileIcon,
  CreditCardIcon,
  BankIcon,
  BadgeIcon,
  ShieldCheckIcon,
  UserIcon,
  LogInIcon,
  LogOutIcon,
} from "@/components/ui/Icons";

export default async function Sidebar() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  const me = email ? await prisma.user.findUnique({ where: { email } }) : null;
  const role = me?.role ?? null;
  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN" || role === "SUPER_ADMIN";

  // Compose nav items per role
  const items: Array<{ href?: string; label: string; icon: any; type?: "link"|"form"; method?: "post"; action?: string }> = [];

  // Always-visible primary links
  items.push({ href: "/decks", label: "Decks", icon: LayersIcon });
  items.push({ href: "/tickets", label: "Tickets", icon: TicketIcon });

  // Payments
  if (role === "COACH") items.push({ href: "/coach/payments", label: "Coach Payments", icon: BankIcon });
  if (role === "STUDENT") items.push({ href: "/payments", label: "Payments", icon: CreditCardIcon });

  // Plans (coach visible)
  if (role === "COACH") items.push({ href: "/plans", label: "Plans", icon: BadgeIcon });

  // Admin-only pages
  if (isAdmin) items.push({ href: "/approvals", label: "Approvals", icon: ShieldCheckIcon });

  // Profile always
  items.push({ href: "/profile", label: "Profile", icon: UserIcon });

  // Auth
  if (email) {
    items.push({ type: "form", label: "Sign out", icon: LogOutIcon, method: "post", action: "/api/auth/signout" });
  } else {
    items.push({ href: "/signin", label: "Sign in", icon: LogInIcon });
    items.push({ href: "/signup", label: "Create account", icon: UserIcon });
  }

  return (
    <aside className="col-span-12 md:col-span-4 lg:col-span-3">
      <div className="card space-y-1">
        <nav className="space-y-1">
          {items.map((it, idx) => (
            it.type === "form" ? (
              <form key={idx} action={it.action} method={it.method} className="w-full">
                <button className="btn w-full justify-start">
                  <it.icon className="mr-2" /> <span>{it.label}</span>
                </button>
              </form>
            ) : (
              <Link key={idx} href={it.href!} className="btn w-full justify-start">
                <it.icon className="mr-2" /> <span>{it.label}</span>
              </Link>
            )
          ))}
        </nav>
      </div>
    </aside>
  );
}
`
);

// 3) Patch app/layout.tsx to render <Sidebar /> inside <aside>
const layoutPath = "app/layout.tsx";
if (exists(layoutPath)) {
  let src = fs.readFileSync(join(layoutPath), "utf8");

  // Ensure import
  if (!src.includes(`from "@/components/nav/Sidebar"`)) {
    src = src.replace(
      /(^|\n)export default async function RootLayout/,
      `\nimport Sidebar from "@/components/nav/Sidebar";\n$1export default async function RootLayout`
    );
  }

  // Replace existing <aside ...>...</aside> block with <Sidebar />
  const asideRe = /<aside[^>]*>[\s\S]*?<\/aside>/m;
  if (asideRe.test(src)) {
    src = src.replace(asideRe, `<Sidebar />`);
    fs.writeFileSync(join(layoutPath), src, "utf8");
    console.log("✓ patched app/layout.tsx: replaced <aside> with <Sidebar />");
  } else {
    console.log("! Could not find <aside> block in app/layout.tsx. Please place <Sidebar /> manually where the sidebar should render.");
  }
} else {
  console.log("! app/layout.tsx not found — skipping auto-patch. Import and place <Sidebar /> manually.");
}

console.log("All done. Restart your dev server (pnpm dev).");
