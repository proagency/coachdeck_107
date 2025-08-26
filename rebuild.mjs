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

/* 1) Prisma model: AdminConfig (externalPaymentWebhookUrl) */
const schemaPath = "prisma/schema.prisma";
if (exists(schemaPath)) {
  let schema = read(schemaPath);

  if (!/model\s+AdminConfig\b/.test(schema)) {
    const model = `

model AdminConfig {
  id                        String   @id @default("singleton")
  externalPaymentWebhookUrl String?
  updatedAt                 DateTime @updatedAt
}
`;
    schema += model;
    write(schemaPath, schema);
    console.log("• Added AdminConfig model to prisma/schema.prisma");
  } else {
    console.log("• AdminConfig model already present — skipping model append");
  }
} else {
  console.warn("! prisma/schema.prisma not found — skipping model creation");
}

/* 2) API route to read/update AdminConfig (super admin / admin only) */
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

/* 3) Client form for Plans Configuration (webhook url) */
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

/* 4) Inject Plans Configuration card on /admin/plans (super admin page) */
const adminPlansPath = "app/admin/plans/page.tsx";
if (exists(adminPlansPath)) {
  let src = read(adminPlansPath);

  // Ensure prisma import + AdminWebhookForm import
  if (!/from\s+"@\/lib\/db"/.test(src)) {
    const firstImport = src.match(/^(?:import .+\n)+/m);
    if (firstImport) {
      src = src.replace(firstImport[0], firstImport[0] + `import { prisma } from "@/lib/db";\n`);
    } else {
      src = `import { prisma } from "@/lib/db";\n` + src;
    }
  }
  if (!/AdminWebhookForm/.test(src)) {
    const firstImport = src.match(/^(?:import .+\n)+/m);
    if (firstImport) {
      src = src.replace(firstImport[0], firstImport[0] + `import AdminWebhookForm from "@/components/admin/AdminWebhookForm";\n`);
    } else {
      src = `import AdminWebhookForm from "@/components/admin/AdminWebhookForm";\n` + src;
    }
  }

  // Ensure cfg is fetched in server component
  if (!/prisma\.adminConfig/.test(src)) {
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

  // Inject the Config card into the returned JSX (after opening container)
  if (!src.includes("<AdminWebhookForm")) {
    src = src.replace(
      /return\s*\(\s*<div[^>]*className="([^"]*)"/,
      (m, cls) =>
        m.replace(
          cls,
          `${cls}`
        ) +
        `
        <section className="card space-y-2">
          <div className="font-medium">Plans Configuration</div>
          <AdminWebhookForm initial={{ externalPaymentWebhookUrl: cfg.externalPaymentWebhookUrl }} />
        </section>`
    );
  }

  write(adminPlansPath, src);
} else {
  console.warn("! /admin/plans page not found at app/admin/plans/page.tsx — skipping UI patch");
}

/* 5) Ensure sidebar is NOT hidden on /admin/plans and /approvals */
const layoutPath = "app/layout.tsx";
if (exists(layoutPath)) {
  let layout = read(layoutPath);
  let changed = false;

  // Add a helper guard that forces sidebar on these routes
  if (!/const\s+SHOW_SIDEBAR_ALWAYS\b/.test(layout)) {
    // Find pathname declaration line
    const pathLine = layout.match(/\bconst\s+pathname\s*=\s*.*\n/);
    if (pathLine) {
      layout = layout.replace(
        pathLine[0],
        pathLine[0] + `  const SHOW_SIDEBAR_ALWAYS = pathname.startsWith("/admin/plans") || pathname.startsWith("/approvals");\n`
      );
      changed = true;
    } else {
      // Prepend near top of component as fallback (safe for most layouts)
      layout = layout.replace(
        /export default async function [\s\S]*?\{/,
        (m) => m + `\n  const SHOW_SIDEBAR_ALWAYS = pathname.startsWith("/admin/plans") || pathname.startsWith("/approvals");\n`
      );
      changed = true;
    }
  }

  // Extend existing showSidebar if present
  if (/const\s+showSidebar\s*=/.test(layout) && !/SHOW_SIDEBAR_ALWAYS/.test(layout)) {
    layout = layout.replace(
      /const\s+showSidebar\s*=\s*([^\n;]+);/,
      (m, expr) => `const showSidebar = (${expr}) || SHOW_SIDEBAR_ALWAYS;`
    );
    changed = true;
  }

  if (changed) {
    write(layoutPath, layout);
  } else {
    console.log("• layout.tsx unchanged (logic not found or already patched)");
  }
} else {
  console.warn("! app/layout.tsx not found — skipping sidebar patch");
}

console.log("\nPatch complete.\nNext steps:\n- npx prisma format\n- npx prisma migrate dev -n add_admin_config_webhook\n- Restart dev server / redeploy.");
