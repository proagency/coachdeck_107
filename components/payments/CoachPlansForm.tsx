"use client";
import React from "react";

type PaymentType = "ONE_TIME" | "SUBSCRIPTION";

export default function CoachPlansForm({ initial }: { initial: any[] }) {
  const [plans, setPlans] = React.useState(initial || []);
  const [draft, setDraft] = React.useState({ name:"", description:"", type:"ONE_TIME" as PaymentType, amount:"", currency:"PHP", active:true });

  async function create(e: React.FormEvent){
    e.preventDefault();
    const payload = { ...draft, amount: parseInt(draft.amount || "0", 10) };
    const r = await fetch("/api/coach/payments/plans",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
    if (r.ok){ const j = await r.json(); setPlans([j.plan, ...plans]); setDraft({ name:"", description:"", type:"ONE_TIME", amount:"", currency:"PHP", active:true }); (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Plan created"}})); }
    else (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed to create"}}));
  }

  async function update(id: string, patch: any){
    const r = await fetch(\`/api/coach/payments/plans/\${id}\`,{ method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(patch) });
    if (r.ok){ const j = await r.json(); setPlans(plans.map((p:any)=>p.id===id?j.plan:p)); (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Saved"}})); }
    else (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed to save"}}));
  }

  async function remove(id: string){
    const r = await fetch(\`/api/coach/payments/plans/\${id}\`,{ method:"DELETE" });
    if (r.ok){ setPlans(plans.filter((p:any)=>p.id!==id)); (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Deleted"}})); }
    else (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed to delete"}}));
  }

  return (
    <div className="space-y-4">
      <form className="grid md:grid-cols-5 gap-3" onSubmit={create}>
        <input className="input" placeholder="Name" value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} required />
        <select className="input" value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value as PaymentType})}>
          <option value="ONE_TIME">One-time</option>
          <option value="SUBSCRIPTION">Subscription</option>
        </select>
        <input className="input" placeholder="Amount (₱)" value={draft.amount} onChange={e=>setDraft({...draft,amount:e.target.value})} required />
        <input className="input" placeholder="Currency" value={draft.currency} onChange={e=>setDraft({...draft,currency:e.target.value})} />
        <div><button className="btn btn-primary">Add Plan</button></div>
        <div className="md:col-span-5">
          <input className="input" placeholder="Description" value={draft.description||""} onChange={e=>setDraft({...draft,description:e.target.value})} />
        </div>
      </form>

      <ul className="grid gap-2">
        {plans.map((p:any)=>(
          <li key={p.id} className="border rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <input className="input" value={p.name} onChange={e=>update(p.id,{ name:e.target.value })} />
              <select className="input w-44" value={p.type} onChange={e=>update(p.id,{ type:e.target.value })}>
                <option value="ONE_TIME">One-time</option>
                <option value="SUBSCRIPTION">Subscription</option>
              </select>
            </div>
            <div className="grid md:grid-cols-3 gap-2">
              <input className="input" type="number" value={p.amount} onChange={e=>update(p.id,{ amount: parseInt(e.target.value||"0",10) })} />
              <input className="input" value={p.currency} onChange={e=>update(p.id,{ currency: e.target.value })} />
              <select className="input" value={p.active?"yes":"no"} onChange={e=>update(p.id,{ active: e.target.value==="yes" })}>
                <option value="yes">Active</option><option value="no">Inactive</option>
              </select>
            </div>
            <textarea className="input" value={p.description||""} onChange={e=>update(p.id,{ description: e.target.value })} />
            <div><button className="btn" onClick={()=>remove(p.id)}>Delete</button></div>
          </li>
        ))}
        {plans.length===0 && <li className="muted text-sm">No plans yet.</li>}
      </ul>
    </div>
  );
}
