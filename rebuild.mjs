import fs from "fs";
import path from "path";

const root = process.cwd();
const p = (...x) => path.join(root, ...x);
const ensure = (d) => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); };
const write = (rel, data) => { ensure(path.dirname(p(rel))); fs.writeFileSync(p(rel), data, "utf8"); console.log("✓ wrote", rel); };
const exists = (rel) => fs.existsSync(p(rel));

/* 1) Ensure a boot step makes the uploads dir (works locally & on Railway) */
const pkgPath = p("package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

pkg.scripts = {
  ...pkg.scripts,
  build: pkg.scripts?.build || "prisma generate && next build",
  start: "node scripts/ensure-uploads.mjs && prisma migrate deploy && next start -p ${PORT:-3000} -H 0.0.0.0"
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log("✓ updated package.json start script");

/* 2) Boot helper: ensures uploads dir exists and is writable */
write("scripts/ensure-uploads.mjs", `import { promises as fs } from "fs";
import { join } from "path";

const base = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");

async function main(){
  await fs.mkdir(base, { recursive: true });
  // touch a canary (won't overwrite if exists)
  const canary = join(base, ".can-write");
  try {
    await fs.writeFile(canary, String(Date.now()), { flag: "w" });
    console.log("[ensure-uploads] OK:", base);
  } catch (e) {
    console.error("[ensure-uploads] Failed to write to:", base, e);
    process.exit(1);
  }
}
main();
`);

/* 3) Upload route: use UPLOAD_DIR + UPLOAD_PUBLIC_BASE; keep fallback sane */
if (exists("app/api/invoices/[id]/upload/route.ts")) {
  const route = `
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

  const baseDir = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads"); // ← mount volume here
  await fs.mkdir(baseDir, { recursive: true });
  const full = join(baseDir, filename);
  await fs.writeFile(full, buffer);
  console.log("[upload] wrote:", full);

  const publicBase = process.env.UPLOAD_PUBLIC_BASE || "/uploads";
  const proofUrl = \`\${publicBase.replace(/\\/$/,"")}/\${filename}\`;

  const updated = await prisma.invoice.update({
    where: { id },
    data: { proofUrl, status: inv.status === "PENDING" ? "SUBMITTED" : inv.status },
  });

  return NextResponse.json({ ok: true, proofUrl: updated.proofUrl });
}
`;
  write("app/api/invoices/[id]/upload/route.ts", route.trim() + "\n");
} else {
  console.log("! Skipped: app/api/invoices/[id]/upload/route.ts not found");
}

/* 4) Debug endpoint: confirms volume path and read/write */
write("app/api/_debug/volume/route.ts", `
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { join } from "path";

export async function GET() {
  const dir = process.env.UPLOAD_DIR || join(process.cwd(), "public", "uploads");
  try {
    await fs.mkdir(dir, { recursive: true });
    const test = join(dir, ".debug-" + Date.now());
    await fs.writeFile(test, "ok");
    return NextResponse.json({ ok: true, dir, wrote: test });
  } catch (e:any) {
    return NextResponse.json({ ok: false, dir, error: e?.message || String(e) }, { status: 500 });
  }
}
`.trim() + "\n");

/* 5) Helpful README snippet for Railway */
const readme = `
### Railway Volume Setup

- Mount your Volume to: **/app/public/uploads**
- Or set env \`UPLOAD_DIR=/app/public/uploads\` and \`UPLOAD_PUBLIC_BASE=/uploads\`
- The app will:
  - Ensure the directory exists on boot
  - Save files there at runtime
  - Serve them from \`/uploads/...\` via Next's static \`public\` folder

**Debug**
- Open \`/api/_debug/volume\` → should return \`{ ok: true, dir, wrote }\`
- After an upload, open the returned \`proofUrl\` directly in the browser.
`;
write("RAILWAY-VOLUME.md", readme);

console.log("Done. Now set Railway env (optional):");
console.log("- UPLOAD_DIR=/app/public/uploads");
console.log("- UPLOAD_PUBLIC_BASE=/uploads");
