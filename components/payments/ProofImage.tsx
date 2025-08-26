"use client";
import React from "react";

/**
 * Renders an <img> for a proof URL.
 * - Builds an absolute URL using window.location.origin if relative.
 * - Adds a cache-busting query to avoid stale 404s.
 * - Falls back to a link if the image fails to load.
 */
export default function ProofImage({ url, alt = "Proof of payment", className = "" }: { url: string; alt?: string; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (!url) return <div className="muted text-sm">No proof uploaded yet.</div>;

  // Build absolute URL + cache buster
  let href = url;
  if (!/^https?:\/\//i.test(href)) {
    try {
      href = new URL(href, typeof window !== "undefined" ? window.location.origin : "http://localhost").toString();
    } catch {
      // leave as-is
    }
  }
  const bust = `${href}${href.includes("?") ? "&" : "?"}t=${Date.now()}`;

  if (failed) {
    return (
      <div className="space-y-1">
        <div className="muted text-sm">Couldn&apos;t load the image. Open the file instead:</div>
        <a href={href} className="underline break-all" target="_blank" rel="noreferrer">{href}</a>
      </div>
    );
  }

  return (
    <img
      src={bust}
      alt={alt}
      className={className + " rounded-[3px] border max-w-full h-auto"}
      onError={() => setFailed(true)}
    />
  );
}
