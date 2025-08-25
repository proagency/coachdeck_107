"use client";
import React from "react";

export default function ProofUploadForm({ invoiceId }: { invoiceId: string }) {
  const [file, setFile] = React.useState<File|null>(null);
  const [loading, setLoading] = React.useState(false);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Max 10MB"}})); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(\`/api/invoices/\${invoiceId}/upload\`, { method: "POST", body: fd });
    setLoading(false);
    if (r.ok) {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Uploaded"}}));
      location.reload();
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Upload failed"}}));
    }
  }

  return (
    <form className="card space-y-3" onSubmit={upload}>
      <div className="font-medium">Upload Proof of Payment</div>
      <input className="input" type="file" onChange={(e)=>setFile(e.target.files?.[0] || null)} accept="image/*,.pdf" />
      <button className="btn btn-primary" disabled={loading || !file}>{loading ? "Uploading…" : "Upload"}</button>
    </form>
  );
}
