import Link from "next/link";
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
