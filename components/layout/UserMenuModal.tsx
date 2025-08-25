"use client";
import Link from "next/link";
import React from "react";

export default function UserMenuModal({ session }: { session: any }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-user-menu", onOpen as any);
    return () => window.removeEventListener("open-user-menu", onOpen as any);
  }, []);
  const role = session?.user?.role;
  const isAdmin = session?.user?.accessLevel === "ADMIN" || role === "SUPER_ADMIN";
  const isCoach = role === "COACH";
  const isStudent = role === "STUDENT";

  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setOpen(false)}>
      <div className="card w-[320px]" onClick={(e) => e.stopPropagation()}>
        <div className="font-medium mb-2">Menu</div>
        <nav className="grid gap-2">
          <Link className="btn" href="/profile">Profile</Link>
          {!session?.user && <Link className="btn" href="/signin">Sign in</Link>}
          {session?.user && <a className="btn" href="/api/auth/signout">Sign out</a>}
          {session?.user && <Link className="btn" href="/decks">Decks</Link>}
          {session?.user && <Link className="btn" href="/tickets">Tickets</Link>}
          {isAdmin && <Link className="btn" href="/approvals">Approvals</Link>}
          {isCoach && <Link className="btn" href="/plans">Plans & Billing</Link>}
          {isCoach && <Link className="btn" href="/coach/payments">Payments</Link>}
          {isStudent && <Link className="btn" href="/payments">Payments</Link>}
        </nav>
      </div>
    </div>
  ) : null;
}
      