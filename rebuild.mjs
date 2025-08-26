import fs from "fs";
import path from "path";

const root = process.cwd();
const p = (...x) => path.join(root, ...x);
const exists = (rel) => fs.existsSync(p(rel));
const ensureDir = (rel) => fs.mkdirSync(path.dirname(p(rel)), { recursive: true });
const read = (rel) => fs.readFileSync(p(rel), "utf8");
const write = (rel, data) => { ensureDir(rel); fs.writeFileSync(p(rel), data, "utf8"); console.log("✓ wrote", rel); };

// 1) Create the coach-only DocCreateForm client component
const docFormPath = "components/deck/DocCreateForm.tsx";
const docFormCode = `\
"use client";
import * as React from "react";

export default function DocCreateForm({ deckId }: { deckId: string }) {
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg:"Title is required"}}));
      return;
    }
    setSaving(true);
    const r = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deckId, title: title.trim(), url: url.trim() || undefined }),
    });
    setSaving(false);
    if (r.ok) {
      setTitle(""); setUrl("");
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"success",msg:"Document added"}}));
      location.reload();
    } else {
      const j = await r.json().catch(()=>({}));
      (window as any).dispatchEvent(new CustomEvent("toast",{detail:{kind:"error",msg: j?.error || "Failed to add document"}}));
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label className="label">Title
        <input className="input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Syllabus" />
      </label>
      <label className="label">File URL (optional)
        <input className="input" value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" />
      </label>
      <button className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Add Document"}</button>
    </form>
  );
}
`;
write(docFormPath, docFormCode);

// 2) Patch deck detail page: add import + inject coach-only form into "Documents" card
const deckPagePath = "app/(dashboard)/decks/[id]/page.tsx";
if (exists(deckPagePath)) {
  let src = read(deckPagePath);

  // 2a) import DocCreateForm if missing
  if (!src.includes('DocCreateForm')) {
    // find last import line and insert after it
    const importRegex = /^(import .+\n)+/m;
    const m = src.match(importRegex);
    if (m) {
      const head = m[0];
      const injected = head + `import DocCreateForm from "@/components/deck/DocCreateForm";\n`;
      src = src.replace(head, injected);
    } else {
      // fallback: prepend
      src = `import DocCreateForm from "@/components/deck/DocCreateForm";\n` + src;
    }
  }

  // 2b) If a Documents card exists, insert the conditional form after its title
  if (src.includes('font-medium mb-2">Documents') && !src.includes("<DocCreateForm")) {
    src = src.replace(
      /(<div className="font-medium mb-2">Documents<\/div>)/,
      `$1
            {(isCoach || isAdmin) && (
              <div className="mb-3">
                <DocCreateForm deckId={deck.id} />
                <div className="h-px my-3 bg-gray-100" />
              </div>
            )}`
    );
    write(deckPagePath, src);
  } else {
    // 2c) If card not found, append a full Documents card near the end (before final return wrapper closes)
    // Try to insert before the last closing </div> in the file as a safe fallback.
    if (!src.includes("<DocCreateForm")) {
      const docsCard = `
        {/* Fallback Documents card (auto-injected) */}
        <div className="card">
          <div className="font-medium mb-2">Documents</div>
          {(typeof isCoach !== "undefined" && (isCoach || (typeof isAdmin!=="undefined" && isAdmin))) && (
            <div className="mb-3">
              <DocCreateForm deckId={deck.id} />
              <div className="h-px my-3 bg-gray-100" />
            </div>
          )}
          <ul className="text-sm list-disc ml-4 mt-2">
            {deck.documents?.map((d: any) => (
              <li key={d.id}>
                {d.url ? <a className="underline" href={d.url} target="_blank" rel="noreferrer">{d.title}</a> : d.title}
              </li>
            ))}
            {(!deck.documents || deck.documents.length === 0) && <li className="muted">No documents yet.</li>}
          </ul>
        </div>
      `;
      // naive append just before file end of default export return wrapper is risky; append at bottom
      src = src + "\n" + docsCard + "\n";
      write(deckPagePath, src);
    } else {
      write(deckPagePath, src);
    }
  }
} else {
  console.warn(`! skip: ${deckPagePath} not found (make sure your paths match)`);
}

// 3) API: create /api/documents if missing (coach/admin only)
const docApiPath = "app/api/documents/route.ts";
if (!exists(docApiPath)) {
  const docApiCode = `\
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email ?? null;
  if (!email) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({ where: { email } });
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(()=>null) as { deckId?: string; title?: string; url?: string };
  const deckId = (body?.deckId || "").trim();
  const title = (body?.title || "").trim();
  const url = (body?.url || "").trim() || undefined;

  if (!deckId || !title) return NextResponse.json({ error: "invalid_payload" }, { status: 400 });

  const isAdmin = (session?.user as any)?.accessLevel === "ADMIN";
  const deck = await prisma.deck.findUnique({ where: { id: deckId } });
  if (!deck) return NextResponse.json({ error: "deck_not_found" }, { status: 404 });
  if (!isAdmin && deck.coachId !== me.id) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const doc = await prisma.document.create({
    data: { deckId, title, url, createdById: me.id },
  });

  return NextResponse.json({ document: doc }, { status: 201 });
}
`;
  write(docApiPath, docApiCode);
} else {
  console.log("• api/documents already exists — leaving as-is");
}

console.log("\nDone. Restart your dev server. On /decks/[id], coaches should now see an “Add Document” form inside the Documents card.");
