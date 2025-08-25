// patch.cjs
// - Centers/widens layout (mx-auto max-w-7xl)
// - Rewrites /payments/[id] to be server-only (no useState in server files)
// - Adds/overwrites ProofUploadForm as a client component (upload proof)
// - Ensures invoice create API includes 'channel' (BANK/E_WALLET)
// Run: node patch.cjs

const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function readFile(rel) {
  const full = path.join(process.cwd(), rel);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}
function writeFile(rel, content) {
  const full = path.join(process.cwd(), rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content, "utf8");
  console.log("✓ wrote", rel);
}
function replaceAll(str, pairs) {
  let out = str;
  for (const [from, to] of pairs) out = out.split(from).join(to);
  return out;
}

// 1) Center/widen layout
(function patchLayout() {
  const rel = "app/layout.tsx";
  const src = readFile(rel);
  if (!src) { console.warn("! skip", rel, "(not found)"); return; }
  let patched = replaceAll(src, [
    ["container max-w-6xl", "mx-auto max-w-7xl"],
    ["max-w-6xl", "max-w-7xl"]
  ]);
  patched = patched.replace(/className="([^"]*)\bcontainer\b([^"]*)"/g, (_m, a, b) => {
    const cls = (a + " mx-auto " + b).replace(/\s+/g, " ").trim();
    return `className="${cls}"`;
  });
  if (patched !== src) writeFile(rel, patched);
  else console.log("= layout already centered/wide");
})();

// 2) Server-only payments detail page
writeFile(
  "app/payments/[id]/page.tsx",
  [
    'import { getServerSession } from "next-auth";',
    'import { authOptions } from "@/lib/auth";',
    'import { prisma } from "@/lib/db";',
    'import { notFound } from "next/navigation";',
    'import Link from "next/link";',
    'import ProofUploadForm from "@/components/payments/ProofUploadForm";',
    "",
    'export const metadata = { title: "Invoice — CoachDeck" };',
    "",
    "export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {",
    "  const p = await params;",
    "  const id = p.id;",
    "  const session = await getServerSession(authOptions);",
    "  const email = session?.user?.email ?? null;",
    "  if (!email) return notFound();",
    "",
    "  const me = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true } });",
    "  if (!me) return notFound();",
    "",
    "  const inv = await prisma.invoice.findFirst({",
    "    where: { id },",
    "    include: { plan: true, coach: true, student: true },",
    "  });",
    "  if (!inv) return notFound();",
    "",
    "  const isStudentOwner = inv.studentId === me.id && me.role === \"STUDENT\";",
    "  const isCoachOwner = inv.coachId === me.id && me.role === \"COACH\";",
    "  const isAdmin = me.role === \"SUPER_ADMIN\" || (session?.user as any)?.accessLevel === \"ADMIN\";",
    "  if (!isStudentOwner && !isCoachOwner && !isAdmin) return notFound();",
    "",
    "  const banks = await prisma.coachBankAccount.findMany({ where: { coachId: inv.coachId } });",
    "  const wallets = await prisma.coachEwallet.findMany({ where: { coachId: inv.coachId } });",
    "",
    "  return (",
    '    <div className="space-y-6">',
    '      <div className="flex items-center justify-between gap-3">',
    "        <h1 className=\"text-2xl font-semibold\">Invoice</h1>",
    "        <Link className=\"btn\" href=\"/payments\">Back</Link>",
    "      </div>",
    "",
    '      <div className="card space-y-2">',
    "        <div className=\"font-medium\">"+'Title'+"</div>",
    "        <div>"+'{inv.title || (inv.plan ? inv.plan.name + " Plan" : "—")}'+"</div>",
    "        <div className=\"grid md:grid-cols-3 gap-3\">",
    "          <div>",
    "            <div className=\"muted text-sm\">Amount</div>",
    "            <div className=\"font-semibold\">{(inv.currency === \"PHP\" ? \"₱\" : \"\") + inv.amount.toLocaleString()} {inv.currency}</div>",
    "          </div>",
    "          <div>",
    "            <div className=\"muted text-sm\">Status</div>",
    "            <div className=\"font-semibold\">{inv.status}</div>",
    "          </div>",
    "          <div>",
    "            <div className=\"muted text-sm\">Channel</div>",
    "            <div className=\"font-semibold\">{inv.channel || \"-\"}</div>",
    "          </div>",
    "        </div>",
    "      </div>",
    "",
    '      <div className="grid md:grid-cols-2 gap-4">',
    "        <div className=\"card\">",
    "          <div className=\"font-medium mb-2\">Bank Accounts</div>",
    "          {banks.length === 0 ? (",
    "            <div className=\"muted text-sm\">No bank channels available.</div>",
    "          ) : (",
    "            <ul className=\"text-sm list-disc ml-4\">",
    "              {banks.map(function(b){",
    "                return (",
    "                  <li key={b.id}><span className=\"font-medium\">{b.bankName}</span>{\" — \"}{b.accountName}{\" (\"}{b.accountNumber}{\")\"}{b.branch? \" • \" + b.branch : \"\"}</li>",
    "                );",
    "              })}",
    "            </ul>",
    "          )}",
    "        </div>",
    "        <div className=\"card\">",
    "          <div className=\"font-medium mb-2\">E-Wallets</div>",
    "          {wallets.length === 0 ? (",
    "            <div className=\"muted text-sm\">No e-wallet channels available.</div>",
    "          ) : (",
    "            <ul className=\"text-sm list-disc ml-4\">",
    "              {wallets.map(function(w){",
    "                return (<li key={w.id}><span className=\"font-medium\">{w.provider}</span>{\" — \"}{w.handle}</li>);",
    "              })}",
    "            </ul>",
    "          )}",
    "        </div>",
    "      </div>",
    "",
    "      {isStudentOwner && (",
    "        <div className=\"card\">",
    "          <div className=\"font-medium mb-2\">Upload proof of payment</div>",
    "          <ProofUploadForm invoiceId={inv.id} />",
    "        </div>",
    "      )}",
    "    </div>",
    "  );",
    "}",
    ""
  ].join("\n")
);

// 3) Client component for proof upload (no template strings)
writeFile(
  "components/payments/ProofUploadForm.tsx",
  [
    '"use client";',
    'import React from "react";',
    "",
    "export default function ProofUploadForm({ invoiceId }: { invoiceId: string }) {",
    "  const [file, setFile] = React.useState<File | null>(null);",
    "  const [loading, setLoading] = React.useState(false);",
    "",
    "  async function onSubmit(e: React.FormEvent) {",
    "    e.preventDefault();",
    "    if (!file) return;",
    "    if (file.size > 10 * 1024 * 1024) {",
    "      (window as any).dispatchEvent(new CustomEvent(\"toast\", { detail: { kind: \"error\", msg: \"Max 10MB\" } }));",
    "      return;",
    "    }",
    "    setLoading(true);",
    "    const fd = new FormData();",
    "    fd.append(\"file\", file);",
    "    const r = await fetch(\"/api/invoices/\" + invoiceId + \"/upload\", { method: \"POST\", body: fd });",
    "    setLoading(false);",
    "    if (r.ok) {",
    "      (window as any).dispatchEvent(new CustomEvent(\"toast\", { detail: { kind: \"success\", msg: \"Uploaded\" } }));",
    "    } else {",
    "      (window as any).dispatchEvent(new CustomEvent(\"toast\", { detail: { kind: \"error\", msg: \"Upload failed\" } }));",
    "    }",
    "  }",
    "",
    "  return (",
    "    <form onSubmit={onSubmit} className=\"flex items-center gap-3\">",
    "      <input",
    "        className=\"input\"",
    "        type=\"file\"",
    "        accept=\"image/*,application/pdf\"",
    "        onChange={function(e){ setFile((e.target as HTMLInputElement).files?.[0] || null); }}",
    "      />",
    "      <button className=\"btn btn-primary\" disabled={loading || !file} type=\"submit\">",
    "        {loading ? \"Uploading…\" : \"Upload\"}",
    "      </button>",
    "    </form>",
    "  );",
    "}",
    ""
  ].join("\n")
);

// 4) Ensure invoice create API sets 'channel'
writeFile(
  "app/api/invoices/route.ts",
  [
    'import { NextResponse } from "next/server";',
    'import { getServerSession } from "next-auth";',
    'import { authOptions } from "@/lib/auth";',
    'import { prisma } from "@/lib/db";',
    "",
    "export async function POST(req: Request) {",
    "  const session = await getServerSession(authOptions);",
    "  const email = session?.user?.email ?? null;",
    "  if (!email) return NextResponse.json({ error: \"unauthorized\" }, { status: 401 });",
    "",
    "  const me = await prisma.user.findUnique({ where: { email } });",
    "  if (!me || me.role !== \"STUDENT\") {",
    "    return NextResponse.json({ error: \"forbidden\" }, { status: 403 });",
    "  }",
    "",
    "  const j = await req.json().catch(function(){ return null as any; });",
    "  const planId = j?.planId ? String(j.planId) : \"\";",
    "  if (!planId) return NextResponse.json({ error: \"invalid_payload\" }, { status: 400 });",
    "",
    "  const plan = await prisma.paymentPlan.findUnique({ where: { id: planId } });",
    "  if (!plan || !plan.active) return NextResponse.json({ error: \"plan_unavailable\" }, { status: 404 });",
    "",
    "  let channel: \"BANK\" | \"E_WALLET\" = \"BANK\";",
    "  if (j?.channel === \"BANK\" || j?.channel === \"E_WALLET\") {",
    "    channel = j.channel;",
    "  } else {",
    "    const cfg = await prisma.coachPaymentsConfig.findUnique({ where: { coachId: plan.coachId } });",
    "    if (cfg) {",
    "      if (cfg.enableBank) channel = \"BANK\";",
    "      else if (cfg.enableEwallet) channel = \"E_WALLET\";",
    "    }",
    "  }",
    "",
    "  const invoice = await prisma.invoice.create({",
    "    data: {",
    "      title: plan.name + \" Plan\",",
    "      coachId: plan.coachId,",
    "      studentId: me.id,",
    "      planId: plan.id,",
    "      amount: plan.amount,",
    "      currency: plan.currency,",
    "      channel,",
    "      status: \"PENDING\",",
    "    },",
    "    select: { id: true },",
    "  });",
    "",
    "  return NextResponse.json({ invoice }, { status: 201 });",
    "}",
    ""
  ].join("\n")
);

console.log("All done. Restart your dev server (pnpm dev).");
