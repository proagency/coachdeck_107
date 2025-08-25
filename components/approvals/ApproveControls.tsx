"use client";
import React from "react";

export default function ApproveControls({ id }: { id: string }) {
  const [loading, setLoading] = React.useState<"APPROVE" | "DENY" | null>(null);

  async function act(action: "APPROVE" | "DENY") {
    setLoading(action);
    const r = await fetch("/api/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    setLoading(null);

    if (r.ok) {
      (window as any).dispatchEvent(
        new CustomEvent("toast", {
          detail: { kind: "success", msg: action === "APPROVE" ? "Approved" : "Denied" },
        })
      );
      // remove the row from the list
      const el = document.querySelector('[data-approve-row="' + id + '"]') as HTMLElement | null;
      if (el) el.remove();
    } else {
      (window as any).dispatchEvent(
        new CustomEvent("toast", { detail: { kind: "error", msg: "Action failed" } })
      );
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className="btn btn-primary"
        onClick={() => act("APPROVE")}
        disabled={loading !== null}
      >
        {loading === "APPROVE" ? "Approving…" : "Approve"}
      </button>
      <button className="btn" onClick={() => act("DENY")} disabled={loading !== null}>
        {loading === "DENY" ? "Denying…" : "Deny"}
      </button>
    </div>
  );
}
