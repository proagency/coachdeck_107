"use client";
import React from "react";

export default function CreateInvoiceButton({ planId, defaultChannel = "BANK" }: { planId: string; defaultChannel?: "BANK"|"E_WALLET" }) {
  const [open, setOpen] = React.useState(false);
  const [channel, setChannel] = React.useState(defaultChannel);

  async function create(){
    const r = await fetch("/api/invoices",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ planId, channel }) });
    if (!r.ok){ (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed to create invoice"}})); return; }
    const j = await r.json();
    window.location.href = "/payments/"+j.invoice.id;
  }

  return (
    <div>
      <button className="btn btn-primary" onClick={()=>setOpen(true)}>Create Invoice</button>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={()=>setOpen(false)}>
          <div className="card w-[420px]" onClick={(e)=>e.stopPropagation()}>
            <div className="font-medium">Choose a channel</div>
            <select className="input mt-2" value={channel} onChange={(e)=>setChannel(e.target.value as any)}>
              <option value="BANK">Bank transfer</option>
              <option value="E_WALLET">E-Wallet</option>
            </select>
            <div className="flex gap-2 mt-3">
              <button className="btn" onClick={()=>setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={create}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
