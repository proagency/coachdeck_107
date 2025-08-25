"use client";
import React from "react";

export default function CoachInvoicesTable({ invoices }: { invoices: any[] }) {
  const [items, setItems] = React.useState(invoices || []);

  async function setStatus(id: string, status: string){
    const r = await fetch(\`/api/invoices/\${id}/status\`, { method:"PATCH", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ status }) });
    if (r.ok){ const j = await r.json(); setItems((prev:any[])=>prev.map(x=>x.id===id?{...x,status:j.invoice.status}:x)); (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Status updated"}})); }
    else (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed"}}));
  }

  return (
    <div className="grid gap-2">
      {items.map(inv => (
        <div key={inv.id} className="border rounded p-3 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="font-medium">{inv.title}</div>
            <div className="text-sm muted">Student: {inv.student.email} • Plan: {inv.plan?.name ?? "—"}</div>
            <div className="text-sm">₱{inv.amount.toLocaleString()} {inv.currency}</div>
          </div>
          <div className="flex items-center gap-2">
            <select className="input" value={inv.status} onChange={(e)=>setStatus(inv.id, e.target.value)}>
              <option>PENDING</option><option>SUBMITTED</option><option>UNDER_REVIEW</option><option>PAID</option><option>REJECTED</option><option>CANCELED</option>
            </select>
            <a className="btn" href={"/payments/"+inv.id} target="_blank">Open</a>
          </div>
        </div>
      ))}
      {items.length===0 && <div className="muted text-sm">No invoices yet.</div>}
    </div>
  );
}
