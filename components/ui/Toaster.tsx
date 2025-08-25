"use client";
import React from "react";

export default function Toaster() {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    function onToast(e) {
      const d = (e && e.detail) || {};
      const id = Date.now();
      setItems((prev) => [...prev, { id, kind: d.kind || "success", msg: d.msg || "" }]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 3500);
    }
    window.addEventListener("toast", onToast);
    return () => window.removeEventListener("toast", onToast);
  }, []);
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {items.map((t: any) => (
        <div key={t.id} className={"card border " + (t.kind === "success" ? "border-green-500" : "border-red-500")}>
          <div className="text-sm">{t.msg}</div>
        </div>
      ))}
    </div>
  );
}
      