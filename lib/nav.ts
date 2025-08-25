export type Role = "SUPER_ADMIN" | "COACH" | "STUDENT";

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
