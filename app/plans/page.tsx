import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import React from "react";

export const metadata = { title: "Plans & Billing — CoachDeck" };

export default async function PlansPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
  if (!me || me.role !== "COACH") return notFound();

  // Read current plan info if you store it on the User; fallback to FREE/NONE
  const planTier = (me as any).planTier || "FREE";
  const billingTerm = (me as any).billingTerm || "NONE";

  // Super Admin configured prices could be read from DB.
  // Fallback defaults if not present:
  const starter = { decks: 30, monthly: 499, yearly: 4990 };  // PHP
  const pro = { decks: "Unlimited", monthly: 999, yearly: 9990 };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Plans &amp; Billing</h1>

      <div className="card flex items-center justify-between">
        <div className="space-y-1">
          <div className="muted text-sm">Current plan</div>
          <div className="font-semibold">
            {String(planTier)} {billingTerm !== "NONE" ? "(" + String(billingTerm) + ")" : ""}
          </div>
        </div>
        <div className="muted text-xs">
          Prices in PHP. Change your plan anytime.
        </div>
      </div>

      <PlansClient
      coach={{ name: me.name || "", email: String(me.email || ""), phone: me.phone || "" }}
      starter={starter}
      pro={pro}
/>
    </div>
  );
}

/** Client component embedded: toggle + upgrade actions */
function PlansClient({
  coach,
  starter,
  pro,
}: {
  coach: { name: string; email: string; phone: string };
  starter: { decks: number; monthly: number; yearly: number };
  pro: { decks: string; monthly: number; yearly: number };
}) {
  "use client";
  const [term, setTerm] = React.useState<"MONTHLY" | "YEARLY">("MONTHLY");

  function price(p: number) {
    try {
      return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(p);
    } catch {
      return "₱" + p.toLocaleString();
    }
  }

  async function upgrade(planName: "Starter" | "Pro") {
    // Collect user info (modal optional). Keep it simple with prompt:
    const full = window.prompt("Confirm your full name", coach.name || "");
    if (full === null) return;
    const first = full.split(" ")[0] || full;
    const last = full.split(" ").slice(1).join(" ") || "-";
    const amount =
      term === "MONTHLY"
        ? planName === "Starter"
          ? starter.monthly
          : pro.monthly
        : planName === "Starter"
          ? starter.yearly
          : pro.yearly;

    // Send to your Make.com checkout helper via /api/checkout
    const body = {
      planName: planName,
      firstName: first,
      lastName: last,
      email: coach.email,
      mobile: coach.phone || "",
      amount: amount,
      term: term,
    };

    const r = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      (window as any).dispatchEvent(
        new CustomEvent("toast", { detail: { kind: "error", msg: "Checkout failed" } })
      );
      return;
    }

    const j = await r.json().catch(() => null as any);
    const url = j && j.payment_url ? String(j.payment_url) : "";
    if (url) {
      window.location.href = url; // redirect to hosted checkout
    } else {
      (window as any).dispatchEvent(
        new CustomEvent("toast", { detail: { kind: "error", msg: "Missing payment URL" } })
      );
    }
  }

  return (
    <div className="space-y-4">
      {/* Term toggle */}
      <div className="card flex items-center gap-3">
        <span className="font-medium">Billing Term:</span>
        <button
          className={"btn " + (term === "MONTHLY" ? "btn-primary" : "")}
          onClick={() => setTerm("MONTHLY")}
          type="button"
        >
          Monthly
        </button>
        <button
          className={"btn " + (term === "YEARLY" ? "btn-primary" : "")}
          onClick={() => setTerm("YEARLY")}
          type="button"
        >
          Yearly
        </button>
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="text-lg font-semibold">Starter</div>
          <div className="muted text-sm">Includes {starter.decks} decks</div>
          <div className="text-2xl font-bold">
            {term === "MONTHLY" ? price(starter.monthly) : price(starter.yearly)}
          </div>
          <ul className="text-sm list-disc ml-4 space-y-1">
            <li>30 active decks</li>
            <li>Tickets &amp; documents</li>
            <li>Email notifications</li>
          </ul>
          <button className="btn btn-primary mt-2" onClick={() => upgrade("Starter")} type="button">
            Upgrade Now
          </button>
        </div>

        <div className="card space-y-2">
          <div className="text-lg font-semibold">Pro</div>
          <div className="muted text-sm">Includes {String(pro.decks).toLowerCase()} decks</div>
          <div className="text-2xl font-bold">
            {term === "MONTHLY" ? price(pro.monthly) : price(pro.yearly)}
          </div>
          <ul className="text-sm list-disc ml-4 space-y-1">
            <li>Unlimited active decks</li>
            <li>Priority email notifications</li>
            <li>Everything in Starter</li>
          </ul>
          <button className="btn btn-primary mt-2" onClick={() => upgrade("Pro")} type="button">
            Upgrade Now
          </button>
        </div>
      </div>
    </div>
  );
}
