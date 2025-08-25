"use client";
import React from "react";

export default function ProofUploadForm({ invoiceId }: { invoiceId: string }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: "Max 10MB" } }));
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/invoices/" + invoiceId + "/upload", { method: "POST", body: fd });
    setLoading(false);
    if (r.ok) {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "success", msg: "Uploaded" } }));
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: "Upload failed" } }));
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3">
      <input
        className="input"
        type="file"
        accept="image/*,application/pdf"
        onChange={function(e){ setFile((e.target as HTMLInputElement).files?.[0] || null); }}
      />
      <button className="btn btn-primary" disabled={loading || !file} type="submit">
        {loading ? "Uploading…" : "Upload"}
      </button>
    </form>
  );
}
