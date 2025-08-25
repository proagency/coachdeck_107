"use client";
import React from "react";

export default function ProofUploadForm({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);

    const r = await fetch("/api/invoices/" + invoiceId + "/upload", {
      method: "POST",
      body: fd,
    });

    setLoading(false);
    if (r.ok) {
      (window as any).dispatchEvent(
        new CustomEvent("toast", { detail: { kind: "success", msg: "Uploaded" } })
      );
      window.location.reload();
    } else {
      (window as any).dispatchEvent(
        new CustomEvent("toast", { detail: { kind: "error", msg: "Upload failed" } })
      );
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-2">
      <div className="font-medium">Upload Proof of Payment</div>
      <input
        type="file"
        accept="image/*,application/pdf"
        className="input"
        onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
      />
      <button className="btn btn-primary" disabled={loading} type="submit">
        {loading ? "Uploading…" : "Submit Proof"}
      </button>
    </form>
  );
}
