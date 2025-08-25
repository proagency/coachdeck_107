"use client";
import React from "react";

type ToastKind = "success" | "error" | "info";

type ToastEventDetail = {
  kind?: ToastKind;
  msg?: string;
  timeoutMs?: number; // optional override (default 3500ms)
};

type ToastItem = {
  id: number;
  kind: ToastKind;
  msg: string;
};

export default function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    function onToast(e: Event) {
      const ce = e as CustomEvent<ToastEventDetail>;
      const d = ce && ce.detail ? ce.detail : {};
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const item: ToastItem = {
        id,
        kind: d.kind === "error" ? "error" : d.kind === "info" ? "info" : "success",
        msg: typeof d.msg === "string" ? d.msg : "",
      };
      setItems((prev) => prev.concat(item));

      const ttl = typeof d.timeoutMs === "number" && d.timeoutMs > 0 ? d.timeoutMs : 3500;
      const timer = window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, ttl);

      return () => window.clearTimeout(timer);
    }

    window.addEventListener("toast", onToast as EventListener);
    return () => window.removeEventListener("toast", onToast as EventListener);
  }, []);

  function close(id: number) {
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  function kindStyles(kind: ToastKind) {
    if (kind === "error") {
      return "border-red-300 bg-red-50 text-red-800";
    }
    if (kind === "info") {
      return "border-blue-300 bg-blue-50 text-blue-800";
    }
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[1000] flex w-full max-w-sm flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={
            "pointer-events-auto flex items-start gap-3 rounded-[3px] border p-3 shadow-md " +
            kindStyles(t.kind)
          }
        >
          <span className="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full bg-current" />
          <div className="flex-1 text-sm">{t.msg}</div>
          <button
            aria-label="Close"
            className="rounded-[3px] px-2 text-xs underline hover:opacity-80"
            onClick={() => close(t.id)}
          >
            Close
          </button>
        </div>
      ))}
    </div>
  );
}
