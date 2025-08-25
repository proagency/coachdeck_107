"use client";
import React from "react";

type CoachInfo = { name: string; email: string; phone: string };
type StarterPlan = { decks: number; monthly: number; yearly: number };
type ProPlan = { decks: string; monthly: number; yearly: number };

export default function PlansClient({
  coach,
  starter,
  pro,
}: {
  coach: CoachInfo;
  starter: StarterPlan;
  pro: ProPlan;
}) {
  const [term, setTerm] = React.useState<"MONTHLY" | "YEARLY">("MONTHLY");

  function price(p: number) {
    try {
      return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(p);
    } catch {
      return "₱" + p.toLocaleString();
    }
  }

  async function upgrade(planName: "Starter" | "Pro") {
    const full = window.prompt("Confirm your full name", coach.name || "");
    if (full === null) return;

    const first = full.split(" ")[0] || full;
    const last = full.split(" ").slice(1).join(" ") || "-";
    const amount =
      term === "MONTHLY"
        ? (planName === "Starter" ? starter.monthly : pro.monthly)
        : (planName === "Starter" ? starter.yearly : pro.yearly);

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
      window.location.href = url;
    } else {
      (window as any).dispatchEvent(
        new CustomEvent("toast", { detail: { kind: "error", msg: "Missing payment URL" } })
      );
    }
  }

  return (
    <div className="space-y-4">
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

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="text-lg font-semibold">Starter</div>
          <div className="muted text-sm">Includes {starter.decks} decks</div>
          <div className="text-2xl font-bold">
            {term === "MONTHLY" ? price(starter.monthly) : price(starter.yearly)}
          </div>
          <ul className="text-sm list-disc ml-4 space-y-1">
            <li>30 active decks</li>
            <li>Tickets & documents</li>
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
