"use client";
import React from "react";

export default function CoachBankAccounts({ initial }: { initial: any[] }) {
  const [items, setItems] = React.useState(initial || []);
  const [bankName, setBankName] = React.useState("");
  const [accountName, setAccountName] = React.useState("");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [branch, setBranch] = React.useState("");

  async function add(e: React.FormEvent){
    e.preventDefault();
    const r = await fetch("/api/coach/payments/banks",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ bankName, accountName, accountNumber, branch }) });
    if (r.ok) {
      const j = await r.json();
      setItems([j.bank, ...items]); setBankName(""); setAccountName(""); setAccountNumber(""); setBranch("");
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Bank added"}}));
    } else (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed to add"}}));
  }

  async function remove(id: string){
    const r = await fetch(\`/api/coach/payments/banks/\${id}\`,{ method:"DELETE" });
    if (r.ok) { setItems(items.filter(x=>x.id!==id)); (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Deleted"}})); }
    else (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed"}}));
  }

  return (
    <div className="space-y-3">
      <form className="grid md:grid-cols-4 gap-3" onSubmit={add}>
        <input className="input" placeholder="Bank Name" value={bankName} onChange={e=>setBankName(e.target.value)} required />
        <input className="input" placeholder="Account Name" value={accountName} onChange={e=>setAccountName(e.target.value)} required />
        <input className="input" placeholder="Account Number" value={accountNumber} onChange={e=>setAccountNumber(e.target.value)} required />
        <input className="input" placeholder="Branch (optional)" value={branch} onChange={e=>setBranch(e.target.value)} />
        <div className="md:col-span-4">
          <button className="btn btn-primary">Add Bank</button>
        </div>
      </form>

      <ul className="grid gap-2">
        {items.map(b => (
          <li key={b.id} className="border rounded p-3 flex items-center justify-between">
            <div className="text-sm"><span className="font-medium">{b.bankName}</span> — {b.accountName} ({b.accountNumber}) {b.branch? \`• \${b.branch}\`:""}</div>
            <button className="btn" onClick={()=>remove(b.id)}>Delete</button>
          </li>
        ))}
        {items.length===0 && <li className="muted text-sm">No bank accounts yet.</li>}
      </ul>
    </div>
  );
}
