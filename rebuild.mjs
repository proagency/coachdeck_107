// fix-uploads.mjs
// Purpose: Make uploads work reliably on Railway by serving from an API route
// instead of relying on Next's public folder during a standalone runtime.

import fs from "fs";
import path from "path";

const root = process.cwd();
const p = (...x) => path.join(root, ...x);
const ensure = (d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };
const write = (rel, data) => { ensure(path.dirname(p(rel))); fs.writeFileSync(p(rel), data, "utf8"); console.log("✓ wrote", rel); };
const exists = (rel) => fs.existsSync(p(rel));

/* 1) API route to serve files from UPLOAD_DIR at /api/uploads/:path* */
write("app/api/uploads/[...path]/route.ts", `
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join, normalize } from "path";

const MIME: Record<string,string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
  svg: "image/svg+xml"
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const safeSegs = (path || []).filter((s) => /^[\\w.%-]+$/.test(s));
  const rel = safeSegs.join("/");
  const base = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
  const full = normalize(join(base, rel));
  const safeBase = normalize(base);

  if (!full.startsWith(safeBase)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const buf = await fs.readFile(full);
    const ext = (rel.split(".").pop() || "").toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
`.trim() + "\n");

/* 2) Patch upload route to save + return /api/uploads/<file> */
if (exists("app/api/invoices/[id]/upload/route.ts")) {
  write("app/api/invoices/[id]/upload/route.ts", `
import { NextResponse } from "next/server";
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

  const inv = await prisma.invoice.findUnique({ where: { id }, include: { student: true, coach: true } });
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const me = await prisma.user.findFirst({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const isOwnerStudent = inv.studentId === me.id;
  const isCoach = inv.coachId === me.id;
  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN";
  if (!isOwnerStudent && !isCoach && !isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const safe = (file.name || "proof").toLowerCase().replace(/[^a-z0-9\\.\\-_]+/g, "_").slice(0, 120);
  const filename = \`\${id}-\${Date.now()}-\${safe || "proof"}\`;

  const baseDir = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
  await fs.mkdir(baseDir, { recursive: true });
  const full = join(baseDir, filename);
  await fs.writeFile(full, buffer);
  console.log("[upload] wrote:", full);

  // Serve via API route (works in Railway standalone)
  const proofUrl = \`/api/uploads/\${filename}\`;

  const updated = await prisma.invoice.update({
    where: { id },
    data: { proofUrl, status: inv.status === "PENDING" ? "SUBMITTED" : inv.status },
  });

  return NextResponse.json({ ok: true, proofUrl: updated.proofUrl });
}
`.trim() + "\n");
} else {
  console.log("! Skipped: app/api/invoices/[id]/upload/route.ts not found");
}

/* 3) Ensure a boot helper exists (optional, but useful) */
const pkgPath = p("package.json");
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.scripts = {
    ...pkg.scripts,
    start: "node scripts/ensure-uploads.mjs && prisma migrate deploy && next start -p ${PORT:-3000} -H 0.0.0.0",
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  console.log("✓ updated package.json start script");
}

write("scripts/ensure-uploads.mjs", `
import { promises as fs } from "fs";
import { join } from "path";
const base = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
await fs.mkdir(base, { recursive: true });
try {
  await fs.writeFile(join(base, ".can-write"), String(Date.now()));
  console.log("[ensure-uploads] OK:", base);
} catch (e) {
  console.error("[ensure-uploads] failed:", base, e);
  process.exit(1);
}
`.trim() + "\n");

console.log("All done.\n- New files will use proofUrl like /api/uploads/<file>\n- Make sure Railway has env UPLOAD_DIR=/app/public/uploads\n- Redeploy and test: GET /api/uploads/<your-filename>");
