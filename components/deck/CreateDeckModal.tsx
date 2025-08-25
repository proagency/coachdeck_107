"use client";
import React from "react";

export default function CreateDeckModal() {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [studentEmail, setStudentEmail] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  React.useEffect(()=> {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-create-deck", onOpen as any);
    return () => window.removeEventListener("open-create-deck", onOpen as any);
  },[]);

  async function create(e: React.FormEvent){
    e.preventDefault(); setCreating(true);
    const r = await fetch("/api/decks",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ name, studentEmail }) });
    if (r.ok){
      const j = await r.json();
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Deck created"}}));
      window.location.href = \`/decks/\${j.deck.id}\`;
    } else {
      setCreating(false);
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed to create deck"}}));
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={()=>!creating && setOpen(false)}>
      <div className="card w-[420px] max-w-[95vw]" onClick={(e)=>e.stopPropagation()}>
        {!creating ? (
          <form className="space-y-3" onSubmit={create}>
            <div className="font-medium">Create Deck</div>
            <label className="label">Deck Name
              <input className="input" value={name} onChange={(e)=>setName(e.target.value)} required />
            </label>
            <label className="label">Student Email
              <input className="input" type="email" value={studentEmail} onChange={(e)=>setStudentEmail(e.target.value)} required />
            </label>
            <div className="flex gap-2">
              <button className="btn" type="button" onClick={()=>setOpen(false)}>Cancel</button>
              <button className="btn btn-primary" type="submit">Create</button>
            </div>
          </form>
        ) : (
          <div className="space-y-2">
            <div className="font-medium">Creating your deck now…</div>
            <div className="muted text-sm">Please wait while we set things up and send your student a welcome email.</div>
          </div>
        )}
      </div>
    </div>
  );
}
