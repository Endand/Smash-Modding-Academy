"use client";

import { useState, useRef, useEffect } from "react";
import { Link2, Check, Copy } from "lucide-react";
import { useContentContext } from "@/components/content-provider";
import { newPreviewToken, withPreview } from "@/lib/preview-token";

// Generates / shows / revokes a secret preview link for a course or lesson.
// Rendered only for users who already have edit rights on that scope.
export function PreviewLinkBtn({
  tokenKey,
  path,
  what,
}: {
  tokenKey: string;   // site_content key holding the token
  path: string;       // page path the link should point at, e.g. /courses/foo
  what: string;       // "course" | "lesson" — used in the copy
}) {
  const { content, updateContent } = useContentContext();
  const token = content[tokenKey] ?? "";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        boxRef.current && !boxRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Built when the panel opens: this runs in an event handler, so `window` is
  // available (it isn't while the component renders on the server).
  const [url, setUrl] = useState("");

  const handleClick = async () => {
    if (open) { setOpen(false); return; }
    let active = token;
    if (!active) {
      active = newPreviewToken();
      setBusy(true);
      await updateContent(tokenKey, active);
      setBusy(false);
    }
    setUrl(`${window.location.origin}${withPreview(path, active)}`);
    setOpen(true);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked — the link is selectable in the box */ }
  };

  const revoke = async () => {
    await updateContent(tokenKey, "");
    setOpen(false);
  };

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        onClick={handleClick}
        disabled={busy}
        title={token ? `Share or revoke this ${what}'s preview link` : `Create a link that previews this ${what} without publishing it`}
        className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] transition-colors disabled:opacity-50"
        style={token
          ? { color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }
          : { color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
      >
        <Link2 size={11} />
        {token ? "Preview link" : "Share preview"}
      </button>

      {open && (
        <div
          ref={boxRef}
          className="absolute right-0 top-full mt-2 z-50 p-3 rounded-[var(--radius-card)] w-[min(360px,80vw)]"
          style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}
        >
          <p className="font-mono text-[9px] uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>
            Anyone with this link can view this {what}
          </p>
          <div
            className="font-mono text-[10px] break-all p-2 rounded mb-2 select-all"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-color)", color: "var(--text-muted)" }}
          >
            {url}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copy}
              className="flex items-center gap-1.5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]"
              style={{ background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }}
            >
              {copied ? <Check size={10} strokeWidth={3} /> : <Copy size={10} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={revoke}
              title="Disable this link — anyone still holding it loses access"
              className="px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] hover:brightness-110"
              style={{ color: "#ed4245", border: "1px solid #ed4245" }}
            >
              Revoke
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
