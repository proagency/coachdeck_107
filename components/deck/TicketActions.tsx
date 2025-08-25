"use client";
import React from "react";
type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export function TicketActions({ ticketId, current, canUpdateStatus }: { ticketId: string; current: Status; canUpdateStatus: boolean }) {
  const [status, setStatus] = React.useState<Status>(current);
  const [comment, setComment] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function updateStatus(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch(\`/api/tickets/\${ticketId}/status\`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSaving(false);
    if (r.ok) {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Status updated"}}));
      location.reload();
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed to update"}}));
    }
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    const r = await fetch(\`/api/tickets/\${ticketId}/comments\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    setSaving(false);
    if (r.ok) {
      setComment("");
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Reply posted"}}));
      location.reload();
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Failed to reply"}}));
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      {canUpdateStatus && (
        <form onSubmit={updateStatus} className="flex items-center gap-2">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            <option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option>
          </select>
          <button className="btn btn-primary" disabled={saving}>Update</button>
        </form>
      )}
      <form onSubmit={addComment} className="flex items-center gap-2">
        <input className="input" placeholder="Write a reply…" value={comment} onChange={(e)=>setComment(e.target.value)} />
        <button className="btn btn-primary" disabled={saving}>Reply</button>
      </form>
    </div>
  );
}
