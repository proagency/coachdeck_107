"use client";
import React from "react";

export default function CreateDeckModal() {
  const [open, setOpen] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [studentEmail, setStudentEmail] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);

    // show immediate toast
    (window as any).dispatchEvent(
      new CustomEvent("toast", { detail: { kind: "info", msg: "Creating your deck now..." } })
    );

    const r = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, studentEmail }),
    });

    if (r.ok) {
      const j = await r.json();
      // redirect to the new deck after backend finishes
      window.location.href = "/decks/" + j.deck.id;
    } else {
      setCreating(false);
      (window as any).dispatchEvent(
        new CustomEvent("toast", { detail: { kind: "error", msg: "Failed to create deck" } })
      );
    }
  }

  return (
    <>
      <button className="btn btn-primary" type="button" onClick={() => setOpen(true)}>
        + New Deck
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Create Deck</h2>
              <button className="btn" type="button" onClick={() => setOpen(false)} disabled={creating}>
                Close
              </button>
            </div>

            <form className="mt-4 grid gap-3" onSubmit={onSubmit}>
              <label className="label">
                Deck Name
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Math Coaching with Alex"
                  required
                />
              </label>

              <label className="label">
                Student Email
                <input
                  className="input"
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="student@example.com"
                  required
                />
              </label>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button className="btn" type="button" onClick={() => setOpen(false)} disabled={creating}>
                  Cancel
                </button>
                <button className="btn btn-primary" type="submit" disabled={creating}>
                  {creating ? "Creating…" : "Create Deck"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm text-center space-y-2">
            <div className="font-medium">Creating your deck now...</div>
            <div className="muted text-sm">Please wait while we set things up.</div>
          </div>
        </div>
      )}
    </>
  );
}
