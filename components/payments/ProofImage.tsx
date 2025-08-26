"use client";
import React from "react";

/**
 * Tries to render an <img> for the given URL.
 * If it fails (onError), falls back to a simple anchor link.
 * Works with relative (/uploads/...) or absolute URLs and ignores file extensions.
 */
export default function ProofImage({ url, alt = "Proof of payment", className = "" }: { url: string; alt?: string; className?: string }) {
  const [failed, setFailed] = React.useState(false);
  if (!url) return <div className="muted text-sm">No proof uploaded yet.</div>;

  // Normalize: if it looks like a filesystem path, try to make it web-accessible
  const webUrl = url.startsWith("/uploads/") || url.startsWith("http") ? url : (url.includes("uploads") ? url.slice(url.indexOf("uploads")).replace(/^uploads/, "/uploads") : url);

  if (failed) {
    return (
      <div className="space-y-1">
        <div className="muted text-sm">Couldn&apos;t load the image. Open the file instead:</div>
        <a href={webUrl} className="underline break-all" target="_blank" rel="noreferrer">{webUrl}</a>
      </div>
    );
  }

  return (
    <img
      src={webUrl}
      alt={alt}
      className={className + " rounded-[3px] border max-w-full h-auto"}
      onError={() => setFailed(true)}
    />
  );
}
