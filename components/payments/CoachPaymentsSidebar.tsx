"use client";
import React from "react";

export default function CoachPaymentsSidebar(){
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {/* Desktop floating sidebar */}
      <aside className="hidden md:block fixed left-4 top-28 w-40 z-40">
        <nav className="card p-3 space-y-2">
          <a className="btn w-full" href="#toggles">Toggles</a>
          <a className="btn w-full" href="#banks">Bank Accounts</a>
          <a className="btn w-full" href="#ewallets">E-Wallets</a>
          <a className="btn w-full" href="#plans">Plans</a>
          <a className="btn w-full" href="#invoices">Invoices</a>
        </nav>
      </aside>

      {/* Mobile burger */}
      <button className="md:hidden fixed bottom-4 right-4 z-40 btn btn-primary" onClick={()=>setOpen(true)}>Menu</button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={()=>setOpen(false)}>
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-white shadow-xl p-4" onClick={(e)=>e.stopPropagation()}>
            <div className="font-medium mb-3">Payments Menu</div>
            <nav className="grid gap-2">
              <a className="btn" href="#toggles" onClick={()=>setOpen(false)}>Toggles</a>
              <a className="btn" href="#banks" onClick={()=>setOpen(false)}>Bank Accounts</a>
              <a className="btn" href="#ewallets" onClick={()=>setOpen(false)}>E-Wallets</a>
              <a className="btn" href="#plans" onClick={()=>setOpen(false)}>Plans</a>
              <a className="btn" href="#invoices" onClick={()=>setOpen(false)}>Invoices</a>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
