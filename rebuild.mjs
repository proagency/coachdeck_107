// patch.mjs
// Fix + debug proof-of-payment image rendering.
//
// 1) app/api/invoices/[id]/upload/route.ts: logs absolute write path; always stores "/uploads/<file>"
// 2) app/api/_debug/exists/route.ts: check if a /uploads file exists on disk
// 3) components/payments/ProofImage.tsx: robust client renderer with cache-busting + fallback

import fs from "fs";
import path from "path";

const root = process.cwd();
const join = (...p) => path.join(root, ...p);
const ensure = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); };
const write = (rel, s) => { const f = join(rel); ensure(path.dirname(f)); fs.writeFileSync(f, s, "utf8"); console.log("✓ wrote", rel); };
const exists = (rel) => fs.existsSync(join(rel));

/* 1) Upload route (harden + log) */
if (exists("app/api/invoices/[id]/upload/route.ts")) {
  write("app/api/invoices/[id]/upload/route.ts", `import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { promises as fs } from "fs";
import { join } from "path";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Only student, coach, or admin
  const inv = await prisma.invoice.findUnique({ where: { id }, include: { student: true, coach: true } });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const me = await prisma.user.findFirst({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isOwnerStudent = inv.studentId === me.id;
  const isCoach = inv.coachId === me.id;
  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN";
  if (!isOwnerStudent && !isCoach && !isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const safe = (file.name || "proof").toLowerCase().replace(/[^a-z0-9\\.\\-_]+/g, "_").slice(0, 120);
  const filename = \`\${id}-\${Date.now()}-\${safe || "proof"}\`;

  const pub = join(process.cwd(), "public");
  const dir = join(pub, "uploads");
  await fs.mkdir(dir, { recursive: true });
  const full = join(dir, filename);
  await fs.writeFile(full, buffer);

  // Debug logging (server console)
  console.log("[upload] wrote file:", full);

  const proofUrl = "/uploads/" + filename;
  const updated = await prisma.invoice.update({
    where: { id },
    data: { proofUrl, status: inv.status === "PENDING" ? "SUBMITTED" : inv.status },
  });

  return NextResponse.json({ ok: true, proofUrl: updated.proofUrl });
}
`);
} else {
  console.log("! Skipped: upload route not found");
}

/* 2) Debug: check if /uploads URL exists on disk */
write("app/api/_debug/exists/route.ts", `import { NextResponse } from "next/server";
import { existsSync } from "fs";
import { join } from "path";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const u = url.searchParams.get("url") || "";
  if (!u.startsWith("/uploads/")) {
    return NextResponse.json({ ok: false, reason: "url must start with /uploads/" }, { status: 400 });
  }
  const full = join(process.cwd(), "public", u.replace(/^\\/+/, ""));
  const ok = existsSync(full);
  return NextResponse.json({ ok, url: u, full });
}
`);

/* 3) ProofImage (robust client renderer) */
write("components/payments/ProofImage.tsx", `"use client";
import React from "react";

/**
 * Renders an <img> for a proof URL.
 * - Builds an absolute URL using window.location.origin if relative.
 * - Adds a cache-busting query to avoid stale 404s.
 * - Falls back to a link if the image fails to load.
 */
export default function ProofImage({ url, alt = "Proof of payment", className = "" }: { url: string; alt?: string; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (!url) return <div className="muted text-sm">No proof uploaded yet.</div>;

  // Build absolute URL + cache buster
  let href = url;
  if (!/^https?:\\/\\//i.test(href)) {
    try {
      href = new URL(href, typeof window !== "undefined" ? window.location.origin : "http://localhost").toString();
    } catch {
      // leave as-is
    }
  }
  const bust = \`\${href}\${href.includes("?") ? "&" : "?"}t=\${Date.now()}\`;

  if (failed) {
    return (
      <div className="space-y-1">
        <div className="muted text-sm">Couldn&apos;t load the image. Open the file instead:</div>
        <a href={href} className="underline break-all" target="_blank" rel="noreferrer">{href}</a>
      </div>
    );
  }

  return (
    <img
      src={bust}
      alt={alt}
      className={className + " rounded-[3px] border max-w-full h-auto"}
      onError={() => setFailed(true)}
    />
  );
}
`);

console.log("Done. Restart dev and test:");
console.log("1) Upload a proof file again.");
console.log("2) Open the returned `proofUrl` directly in the browser.");
console.log("3) Try: /api/_debug/exists?url=/uploads/<yourfilename>");
