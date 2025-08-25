"use client";
import React from "react";

export default function CoachPaymentsToggles({ initial }: { initial: { enableBank: boolean; enableEwallet: boolean; bookingUrl: string } }) {
  const [enableBank, setEnableBank] = React.useState(initial.enableBank);
  const [enableEwallet, setEnableEwallet] = React.useState(initial.enableEwallet);
  const [bookingUrl, setBookingUrl] = React.useState(initial.bookingUrl || "");

  async function save(){
    const r = await fetch("/api/coach/payments/toggles",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ enableBank, enableEwallet, bookingUrl }) });
    if (r.ok) (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Saved"}}));
    else (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed to save"}}));
  }

  return (
    <div className="grid md:grid-cols-2 gap-3">
      <label className="label">Enable Bank Transfer
        <select className="input" value={enableBank ? "yes" : "no"} onChange={(e)=>setEnableBank(e.target.value==="yes")}>
          <option value="no">No</option><option value="yes">Yes</option>
        </select>
      </label>
      <label className="label">Enable E-Wallet
        <select className="input" value={enableEwallet ? "yes" : "no"} onChange={(e)=>setEnableEwallet(e.target.value==="yes")}>
          <option value="no">No</option><option value="yes">Yes</option>
        </select>
      </label>
      <label className="label md:col-span-2">Booking Link
        <input className="input" value={bookingUrl} onChange={(e)=>setBookingUrl(e.target.value)} placeholder="https://cal.com/..." />
      </label>
      <div className="md:col-span-2">
        <button className="btn btn-primary" onClick={save}>Save</button>
      </div>
    </div>
  );
}
