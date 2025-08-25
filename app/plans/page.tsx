import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

export const metadata = { title: "Plans & Billing — CoachDeck" };

export default async function PlansPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) redirect("/signin");

  const coach = await prisma.user.findUnique({ where: { email } });
  if (!coach || coach.role !== "COACH") redirect("/");

  const starter = { monthly: 0, yearly: 0, decks: "30 decks" }; // adjust pricing as needed
  const pro = { monthly: 0, yearly: 0, decks: "Unlimited decks" };

  function PlansClient({ coach, starter, pro }: any) {
    "use client";
    const [term, setTerm] = React.useState<"MONTHLY" | "YEARLY">("MONTHLY");
    const price = (p: number) => "₱" + p.toLocaleString();

    async function upgrade(planName: string) {
      const full = prompt("Confirm your full name", coach.name || "");
      if (full === null) return;
      const body = {
        planName,
        firstName: full.split(" ")[0] || full,
        lastName: full.split(" ").slice(1).join(" ") || "-",
        email: coach.email,
        mobile: coach.phone || "",
        amount:
          term === "MONTHLY"
            ? planName === "Starter"
              ? starter.monthly
              : pro.monthly
            : planName === "Starter"
            ? starter.yearly
            : pro.yearly,
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
      const j = await r.json();
      if (j.payment_url) window.location.href = j.payment_url;
    }

    return (
      <div className="space-y-4">
        <div className="card flex items-center gap-3">
          <span className="font-medium">Billing Term:</span>
          <button className={"btn " + (term === "MONTHLY" ? "btn-primary" : "")} onClick={() => setTerm("MONTHLY")}>
            Monthly
          </button>
          <button className={"btn " + (term === "YEARLY" ? "btn-primary" : "")} onClick={() => setTerm("YEARLY")}>
            Yearly
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="card space-y-2">
            <div className="font-semibold">Starter</div>
            <div className="muted text-sm">Includes {starter.decks}</div>
            <div className="text-2xl font-bold">
              {term === "MONTHLY" ? price(starter.monthly) : price(starter.yearly)}
            </div>
            <button className="btn btn-primary" onClick={() => upgrade("Starter")}>
              Upgrade Now
            </button>
          </div>
          <div className="card space-y-2">
            <div className="font-semibold">Pro</div>
            <div className="muted text-sm">Includes {pro.decks}</div>
            <div className="text-2xl font-bold">{term === "MONTHLY" ? price(pro.monthly) : price(pro.yearly)}</div>
            <button className="btn btn-primary" onClick={() => upgrade("Pro")}>
              Upgrade Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <PlansClient coach={coach} starter={starter} pro={pro} />;
}
