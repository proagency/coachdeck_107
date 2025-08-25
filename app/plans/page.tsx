import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata = { title: "Plans & Billing — CoachDeck" };

export default async function PlansPage() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return null;

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "COACH") return <div className="muted">Coaches only.</div>;

  // Prices would typically come from Super Admin config; hardcode placeholders here
  const starter = { monthly: 499, yearly: 4990, decks: "30 decks" };
  const pro = { monthly: 999, yearly: 9990, decks: "Unlimited decks" };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Plans & Billing</h1>
      <PlansClient coach={{ name: me.name ?? "", email: me.email!, phone: me.phone ?? "" }} starter={starter} pro={pro} />
    </div>
  );
}

// Client island
function PlansClient({ coach, starter, pro }: any) {
  "use client";
  const [term, setTerm] = React.useState<"MONTHLY"|"YEARLY">("MONTHLY");
  const price = (p:number) => \`₱\${p.toLocaleString()}\`;

  async function upgrade(planName:string){
    const full = prompt("Confirm your full name", coach.name || "");
    if (full === null) return;
    const body = { planName, firstName: full.split(" ")[0] || full, lastName: full.split(" ").slice(1).join(" ") || "-", email: coach.email, mobile: coach.phone || "", amount: term==="MONTHLY" ? (planName==="Starter"?starter.monthly:pro.monthly) : (planName==="Starter"?starter.yearly:pro.yearly) };
    const r = await fetch("/api/checkout",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(body) });
    if (!r.ok){ (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Checkout failed"}})); return; }
    const j = await r.json();
    if (j.payment_url) window.location.href = j.payment_url;
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-3">
        <span className="font-medium">Billing Term:</span>
        <button className={"btn " + (term==="MONTHLY"?"btn-primary":"")} onClick={()=>setTerm("MONTHLY")}>Monthly</button>
        <button className={"btn " + (term==="YEARLY"?"btn-primary":"")} onClick={()=>setTerm("YEARLY")}>Yearly</button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="card space-y-2">
          <div className="font-semibold">Starter</div>
          <div className="muted text-sm">Includes {starter.decks}</div>
          <div className="text-2xl font-bold">{term==="MONTHLY" ? price(starter.monthly) : price(starter.yearly)}</div>
          <button className="btn btn-primary" onClick={()=>upgrade("Starter")}>Upgrade Now</button>
        </div>
        <div className="card space-y-2">
          <div className="font-semibold">Pro</div>
          <div className="muted text-sm">Includes {pro.decks}</div>
          <div className="text-2xl font-bold">{term==="MONTHLY" ? price(pro.monthly) : price(pro.yearly)}</div>
          <button className="btn btn-primary" onClick={()=>upgrade("Pro")}>Upgrade Now</button>
        </div>
      </div>
    </div>
  );
}
