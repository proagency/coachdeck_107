"use client";
import React from "react";
import Link from "next/link";

type Access = "ADMIN" | "USER" | undefined;
type Role = "SUPER_ADMIN" | "COACH" | "STUDENT" | undefined;

export default function UserMenu({
  email,
  role,
  accessLevel,
}: {
  email?: string | null;
  role?: Role;
  accessLevel?: Access;
}) {
  const [open, setOpen] = React.useState(false);

  const isSignedIn = !!email;
  const isAdmin = accessLevel === "ADMIN" || role === "SUPER_ADMIN";
  const isCoach = role === "COACH";
  const isStudent = role === "STUDENT";

  function Item(props: React.PropsWithChildren<{ href: string }>) {
    return (
      <Link
        href={props.href}
        className="flex w-full items-center justify-between rounded-[3px] border px-3 py-2 text-sm hover:bg-gray-50"
        onClick={() => setOpen(false)}
      >
        <span>{props.children}</span>
        <span aria-hidden>›</span>
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open user menu"
        className="btn"
        onClick={() => setOpen(true)}
      >
        {/* simple user icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden className="shrink-0">
          <circle cx="12" cy="8" r="4" fill="currentColor" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Menu</div>
              <button className="btn" onClick={() => setOpen(false)}>Close</button>
            </div>

            {!isSignedIn && (
              <div className="grid gap-2">
                <Item href="/signin">Sign in</Item>
                <Item href="/signup">Sign up</Item>
              </div>
            )}

            {isSignedIn && (
              <div className="grid gap-2">
                <div className="muted text-xs">Signed in as {email || ""}</div>
                <Item href="/profile">Profile</Item>
                <Item href="/decks">Decks</Item>
                <Item href="/tickets">Tickets</Item>

                {/* Coaches */}
                {isCoach && <Item href="/coach/payments">Payments</Item>}
                {isCoach && <Item href="/plans">Plans &amp; Billing</Item>}

                {/* Super Admin / Admin */}
                {isAdmin && <Item href="/approvals">Approvals</Item>}

                {/* Auth */}
                <form action="/api/auth/signout" method="post" className="mt-2">
                  <button className="btn w-full">Sign out</button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
