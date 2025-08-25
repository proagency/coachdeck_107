// patch.cjs
// Fix layout centering/widening and invoice create "channel" requirement.
// Run with: node patch.cjs

const fs = require("fs");
const path = require("path");

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readFile(rel) {
  const full = path.join(process.cwd(), rel);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, "utf8");
}

function writeFile(rel, content) {
  const full = path.join(process.cwd(), rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content, "utf8");
  console.log("✓ wrote", rel);
}

function replaceAll(str, pairs) {
  let out = str;
  for (const [from, to] of pairs) {
    out = out.split(from).join(to);
  }
  return out;
}

function patchLayout() {
  const rel = "app/layout.tsx";
  const src = readFile(rel);
  if (!src) {
    console.warn("! skip", rel, "(not found)");
    return;
  }

  // Replace Tailwind "container max-w-6xl" with centered, wider wrapper
  let patched = replaceAll(src, [
    ["container max-w-6xl", "mx-auto max-w-7xl"],
    ["container  max-w-6xl", "mx-auto max-w-7xl"],
    ["container  max-w-7xl", "mx-auto max-w-7xl"],
    // also ensure any lingering 6xl containers are upgraded
    ["max-w-6xl", "max-w-7xl"],
  ]);

  // In case "container" alone is used in header/main wrappers, nudge to mx-auto
  patched = patched.replace(/className="([^"]*)\bcontainer\b([^"]*)"/g, (m, a, b) => {
    const cls = (a + " mx-auto " + b).replace(/\s+/g, " ").trim();
    return `className="${cls}"`;
  });

  if (patched !== src) {
    writeFile(rel, patched);
  } else {
    console.log("= layout unchanged (already centered/wide)");
  }
}

function writeInvoicesAPI() {
  const rel = "app/api/invoices/route.ts";
  const content = [
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
    "  const j = await req.json().catch(() => null as any);",
    "  const planId = j?.planId ? String(j.planId) : \"\";",
    "  if (!planId) return NextResponse.json({ error: \"invalid_payload\" }, { status: 400 });",
    "",
    "  const plan = await prisma.paymentPlan.findUnique({ where: { id: planId } });",
    "  if (!plan || !plan.active) return NextResponse.json({ error: \"plan_unavailable\" }, { status: 404 });",
    "",
    "  // Determine a valid channel (Prisma requires it).",
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
    "",
  ].join("\n");

  writeFile(rel, content);
}

function main() {
  console.log("— CoachDeck Patch —");
  patchLayout();
  writeInvoicesAPI();
  console.log("All done. Restart dev server if running: pnpm dev");
}

main();
