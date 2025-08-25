"use client";
import React from "react";

export default function CoachEwallets({ initial }: { initial: any[] }) {
  const [items, setItems] = React.useState(initial || []);
  const [provider, setProvider] = React.useState("");
  const [handle, setHandle] = React.useState("");

  async function add(e: React.FormEvent){
    e.preventDefault();
    const r = await fetch("/api/coach/payments/ewallets",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ provider, handle }) });
    if (r.ok) { const j = await r.json(); setItems([j.wallet,...items]); setProvider(""); setHandle(""); (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"E-Wallet added"}})); }
    else (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed to add"}}));
  }

  async function remove(id: string){
    const r = await fetch(\`/api/coach/payments/ewallets/\${id}\`,{ method:"DELETE" });
    if (r.ok) { setItems(items.filter(x=>x.id!==id)); (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Deleted"}})); }
    else (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed"}}));
  }

  return (
    <div className="space-y-3">
      <form className="grid md:grid-cols-3 gap-3" onSubmit={add}>
        <input className="input" placeholder="Provider" value={provider} onChange={e=>setProvider(e.target.value)} required />
        <input className="input" placeholder="Handle" value={handle} onChange={e=>setHandle(e.target.value)} required />
        <div><button className="btn btn-primary">Add E-Wallet</button></div>
      </form>

      <ul className="grid gap-2">
        {items.map(w => (
          <li key={w.id} className="border rounded p-3 flex items-center justify-between">
            <div className="text-sm"><span className="font-medium">{w.provider}</span> — {w.handle}</div>
            <button className="btn" onClick={()=>remove(w.id)}>Delete</button>
          </li>
        ))}
        {items.length===0 && <li className="muted text-sm">No e-wallets yet.</li>}
      </ul>
    </div>
  );
}
