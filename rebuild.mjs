import fs from "fs";
import path from "path";

const root = process.cwd();
const p = (...x) => path.join(root, ...x);
const exists = (rel) => fs.existsSync(p(rel));
const read = (rel) => fs.readFileSync(p(rel), "utf8");
const write = (rel, data) => {
  const full = p(rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, data, "utf8");
  console.log("✓ wrote", rel);
};

// 1) Prisma model: AdminConfig (externalPaymentWebhookUrl)
const schemaPath = "prisma/schema.prisma";
if (exists(schemaPath)) {
  let schema = read(schemaPath);

  if (!/model\s+AdminConfig\b/.test(schema)) {
    const model = `

model AdminConfig {
  id                           String   @id @default("singleton")
  externalPaymentWebhookUrl    String?
  updatedAt                    DateTime @updatedAt
}
`;
    // append before EOF
    schema += model;
    write(schemaPath, schema);
    console.log("• Added AdminConfig model to prisma/schema.prisma");
  } else {
    console.log("• AdminConfig model already present — skipping schema append");
  }
} else {
  console.warn("! prisma/schema.prisma not found — skipping model creation");
}

// 2) API route to read/update AdminConfig (super admin / admin only)
const adminConfigApi = `import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const cfg = await prisma.adminConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return NextResponse.json({ config: cfg });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN" || me?.role === "SUPER_ADMIN";
  if (!isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const j = await req.json().catch(() => ({}));
  const url = typeof j.externalPaymentWebhookUrl === "string" ? j.externalPaymentWebhookUrl.trim() : undefined;

  const cfg = await prisma.adminConfig.upsert({
    where: { id: "singleton" },
    update: { externalPaymentWebhookUrl: url },
    create: { id: "singleton", externalPaymentWebhookUrl: url },
  });

  return NextResponse.json({ config: cfg });
}
`;
write("app/api/admin/config/route.ts", adminConfigApi);

// 3) Client form for Plans Configuration (webhook url)
const adminForm = `"use client";
import * as React from "react";

export default function AdminWebhookForm({ initial }: { initial: { externalPaymentWebhookUrl?: string | null } }) {
  const [url, setUrl] = React.useState(initial?.externalPaymentWebhookUrl || "");
  const [saving, setSaving] = React.useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ externalPaymentWebhookUrl: url.trim() || null }),
    });
    setSaving(false);
    if (r.ok) {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Saved"}}));
    } else {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Save failed"}}));
    }
  }

  return (
    <form className="space-y-2" onSubmit={onSave}>
      <label className="label">External Payment Webhook URL
        <input
          className="input"
          placeholder="https://example.com/payment-webhook"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
    </form>
  );
}
`;
write("components/admin/AdminWebhookForm.tsx", adminForm);

// 4) Inject Plans Configuration card on /admin/plans (super admin page)
const adminPlansPath = "app/(admin)/plans/page.tsx";
if (exists(adminPlansPath)) {
  let src = read(adminPlansPath);

  // Add import if missing
  if (!src.includes('components/admin/AdminWebhookForm')) {
    // Insert after imports block
    const importBlock = src.match(/^(?:import .+\n)+/m);
    if (importBlock) {
      const head = importBlock[0];
      const injected = head + `import AdminWebhookForm from "@/components/admin/AdminWebhookForm";\n`;
      src = src.replace(head, injected);
    } else {
      src = `import AdminWebhookForm from "@/components/admin/AdminWebhookForm";\n` + src;
    }
  }

  // Fetch AdminConfig in server component if not already present
  if (!src.includes("prisma.adminConfig")) {
    // Find first async page function and inject fetch
    src = src.replace(
      /export default async function [\s\S]*?\{/,
      (m) => m + `
  const cfg = await prisma.adminConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
`
    );
  }

  // Inject the Config card (before other content, if possible)
  if (!src.includes("<AdminWebhookForm")) {
    // Try to place after main title or at top of return content
    src = src.replace(
      /return\s*\(\s*<div[^>]*className="[^"]*space-y[^"]*"[^>]*>/,
      (m) =>
        `${m}
        <section className="card space-y-2">
          <div className="font-medium">Plans Configuration</div>
          <AdminWebhookForm initial={{ externalPaymentWebhookUrl: cfg.externalPaymentWebhookUrl }} />
        </section>`
    );
  }

  write(adminPlansPath, src);
} else {
  console.warn("! /admin/plans page not found at app/(admin)/plans/page.tsx — skipping UI patch");
}

// 5) Ensure sidebar is NOT hidden on /admin/plans and /approvals
const layoutPath = "app/layout.tsx";
if (exists(layoutPath)) {
  let layout = read(layoutPath);

  // Common pattern: pathname.startsWith("/plans") … we OR in the two routes
  const addOr = (val) =>
    `${val} || pathname.startsWith("/admin/plans") || pathname.startsWith("/approvals")`;

  let changed = false;

  // Try to find occurrences of pathname checks and extend them
  const patterns = [
    /pathname\.startsWith\(["']\/plans["']\)/g,
    /pathname\.startsWith\(["']\/coach\/payments["']\)/g, // keep existing
    /pathname\.startsWith\(["']\/payments["']\)/g, // keep existing
    /pathname\.startsWith\(["']\/payments\/\["']?id["']?\)/g,
  ];

  // Minimal guaranteed insertion: define a SHOW_ALWAYS guard if not present
  if (!/const\s+SHOW_SIDEBAR_ALWAYS\b/.test(layout)) {
    layout = layout.replace(
      /(\n\s*const\s+pathname\s*=\s*.*\n)/,
      `$1  const SHOW_SIDEBAR_ALWAYS = pathname.startsWith("/admin/plans") || pathname.startsWith("/approvals");\n`
    );
    changed = true;
  }

  // Try to patch a showSidebar assignment
  layout = layout.replace(
    /const\s+showSidebar\s*=\s*([^\n;]+);/,
    (m, expr) => {
      if (/SHOW_SIDEBAR_ALWAYS/.test(expr)) return m; // already patched
      changed = true;
      return `const showSidebar = (${expr}) || SHOW_SIDEBAR_ALWAYS;`;
    }
  );

  // Fallback: if we didn’t locate showSidebar, try adding a guard in the JSX visibility
  if (!/showSidebar/.test(layout)) {
    // Try to find <aside ...> and prepend a { (pathname checks) || SHOW_SIDEBAR_ALWAYS ? aside : null }
    // This is risky; so we just inject a const near top to reference later,
    // and assume your layout already renders the sidebar based on showSidebar or always-on.
  }

  if (changed) write(layoutPath, layout);
  else console.log("• layout.tsx unchanged (showSidebar logic not found or already patched)");
} else {
  console.warn("! app/layout.tsx not found — skipping sidebar patch");
}

console.log("\nPatch complete.\nNext steps:\n- npx prisma format\n- npx prisma migrate dev -n add_admin_config_webhook\n- Restart dev server / redeploy.");
