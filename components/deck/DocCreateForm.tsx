"use client";
import * as React from "react";

export default function DocCreateForm({ deckId }: { deckId: string }) {
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Title is required"}}));
      return;
    }
    setSaving(true);
    const r = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deckId, title: title.trim(), url: url.trim() || undefined }),
    });
    setSaving(false);
    if (r.ok) {
      setTitle(""); setUrl("");
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Document added"}}));
      location.reload();
    } else {
      const j = await r.json().catch(()=>({}));
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg: j?.error || "Failed to add document"}}));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label className="label">Title
        <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Syllabus" />
      </label>
      <label className="label">File URL (optional)
        <input className="input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" />
      </label>
      <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Document"}</button>
    </form>
  );
}
