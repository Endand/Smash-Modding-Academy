"use client";

import { useState, useRef, useEffect } from "react";
import { Link2, Check, Copy, Clock } from "lucide-react";
import { useContentContext } from "@/components/content-provider";
import {
  newPreviewToken, withPreview, buildStoredToken, parseStoredToken,
  tokenState, expiryLabel, PREVIEW_DURATIONS,
} from "@/lib/preview-token";

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
  const stored = content[tokenKey] ?? "";

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // True only while the write is actually in flight. The label reads
  // "Generating…" until it lands, because updateContent applies optimistically
  // — without this the button would turn green a beat before the link exists.
  const [generating, setGenerating] = useState(false);
  const [url, setUrl] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Panel details (URL, expiry wording) are resolved when the panel opens and
  // after each write, rather than on every render.
  const [state, setState] = useState<"none" | "active" | "expired">("none");
  const [expiry, setExpiry] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        boxRef.current && !boxRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const refresh = (value: string) => {
    const st = tokenState(value);
    setState(st);
    const parsed = parseStoredToken(value);
    setExpiry(st === "active" && parsed ? expiryLabel(parsed.expiresAt) : "");
    if (st === "active" && parsed) {
      setUrl(`${window.location.origin}${withPreview(path, parsed.token)}`);
    } else {
      setUrl("");
    }
  };

  const handleClick = () => {
    if (open) { setOpen(false); return; }
    refresh(stored);
    setOpen(true);
  };

  const generate = async (ms: number | null) => {
    setGenerating(true);
    const value = buildStoredToken(newPreviewToken(), ms);
    try {
      await updateContent(tokenKey, value);
      refresh(value);
    } finally {
      setGenerating(false);
    }
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
    refresh("");
    setOpen(false);
  };

  // The button only goes green once a live link genuinely exists.
  const live = !generating && tokenState(stored) === "active";
  const label = generating ? "Generating…" : live ? "Preview link" : "Share preview";

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        onClick={handleClick}
        disabled={generating}
        title={live ? `Share or revoke this ${what}'s preview link` : `Create a link that previews this ${what} without publishing it`}
        className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] transition-colors disabled:cursor-default"
        style={live
          ? { color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }
          : { color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
      >
        {generating
          ? <Clock size={11} className="animate-pulse" />
          : <Link2 size={11} />}
        {label}
      </button>

      {open && (
        <div
          ref={boxRef}
          className="absolute right-0 top-full mt-2 z-50 p-3 rounded-[var(--radius-card)] w-[min(360px,80vw)]"
          style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", boxShadow: "0 8px 32px rgba(0,0,0,0.35)" }}
        >
          {state === "active" ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Anyone with this link can view this {what}
                </p>
                <span className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--accent-medium)" }}>
                  {expiry}
                </span>
              </div>
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
            </>
          ) : (
            <>
              <p className="font-mono text-[9px] uppercase tracking-widest mb-2.5" style={{ color: "var(--text-muted)" }}>
                {state === "expired"
                  ? "That link expired — create a new one"
                  : `How long should this ${what} link work?`}
              </p>
              <div className="flex items-center gap-2">
                {PREVIEW_DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => generate(d.ms)}
                    disabled={generating}
                    className="flex-1 px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] transition-colors disabled:opacity-40 disabled:cursor-default hover:brightness-125"
                    style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {generating && (
                <p className="mt-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  Generating…
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
