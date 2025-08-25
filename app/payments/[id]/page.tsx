import React from "react";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import Link from "next/link";

export const metadata = { title: "Invoice — CoachDeck" };

function ProofUploadForm({ invoiceId }: { invoiceId: string }) {
  "use client";
  const [loading, setLoading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!inputRef.current || !inputRef.current.files || inputRef.current.files.length === 0) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", inputRef.current.files[0]);
    const r = await fetch("/api/invoices/" + invoiceId + "/upload", { method: "POST", body: fd });
    setLoading(false);
    if (r.ok) {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "success", msg: "Proof submitted" } }));
      window.location.reload();
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast", { detail: { kind: "error", msg: "Upload failed" } }));
    }
  }

  return (
    <form onSubmit={onUpload} className="card space-y-2">
      <div className="font-medium">Upload Proof of Payment</div>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="input" />
      <button className="btn btn-primary" disabled={loading}>{loading ? "Uploading…" : "Submit Proof"}</button>
    </form>
  );
}

export default async function InvoiceDetail({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return notFound();

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me || me.role !== "STUDENT") return notFound();

  const id = params.id;
  const inv = await prisma.invoice.findFirst({
    where: { id, studentId: me.id },
    include: { plan: { include: { coach: true } }, coach: true },
  });
  if (!inv) return notFound();

  const banks = await prisma.coachBankAccount.findMany({ where: { coachId: inv.coachId } });
  const wallets = await prisma.coachEwallet.findMany({ where: { coachId: inv.coachId } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoice</h1>
        <Link className="btn" href="/payments">Back</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <div className="card space-y-1">
            <div className="font-medium">{inv.title}</div>
            <div className="muted text-sm">{inv.description || ""}</div>
            <div className="text-lg font-semibold">
              {"₱" + inv.amount.toLocaleString()} {inv.currency}
            </div>
            <div className="text-sm">Coach: {inv.coach?.email || ""}</div>
            <div className="text-sm">Status: {inv.status}</div>
            {inv.proofUrl && (
              <div className="text-sm">
                Proof:{" "}
                <a className="underline" href={inv.proofUrl} target="_blank">
                  view file
                </a>
              </div>
            )}
          </div>

          <div className="card">
            <div className="font-medium mb-2">Bank Transfer</div>
            {banks.length === 0 ? (
              <div className="muted text-sm">No bank channels available.</div>
            ) : (
              <ul className="text-sm list-disc ml-4">
                {banks.map((b) => (
                  <li key={b.id}>
                    <span className="font-medium">{b.bankName}</span> — {b.accountName} ({b.accountNumber})
                    {b.branch ? " • " + b.branch : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card">
            <div className="font-medium mb-2">E-Wallets</div>
            {wallets.length === 0 ? (
              <div className="muted text-sm">No e-wallet channels available.</div>
            ) : (
              <ul className="text-sm list-disc ml-4">
                {wallets.map((w) => (
                  <li key={w.id}>
                    <span className="font-medium">{w.provider}</span> — {w.handle}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ProofUploadForm invoiceId={inv.id} />
        </div>
      </div>
    </div>
  );
}
