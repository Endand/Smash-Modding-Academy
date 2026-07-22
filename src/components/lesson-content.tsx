"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, ChevronUp, Plus, X, ChevronDown, Code, Image as ImageIcon, Quote, Check, Copy, Lock, Eye, Pencil, Video } from "lucide-react";
import { useProgress } from "@/components/progress-provider";
import { Editable } from "@/components/editable-text";
import { useContentContext } from "@/components/content-provider";
import { usePermissions, EditScopeProvider, PreviewModeProvider, evalPermission, lessonAclKey, type EditScope } from "@/hooks/use-permissions";
import { useAuth } from "@/components/auth-provider";
import { useCourseStructure, getEffectiveStatus, parseJSON } from "@/hooks/use-course-structure";
import { getStaticLesson } from "@/lib/courses/foundations-data";
import { getCourseKeys, getCourseSlug, slugFromTitle, PROJECT_ICONS } from "@/lib/courses/course-utils";
import { replaceSlugMapEntry } from "@/lib/courses/slug-sync";
import { renderInline } from "@/lib/inline-markdown";

// ── Shared admin UI ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-5">
      {label}
    </p>
  );
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 flex items-center gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-widest cursor-pointer w-full justify-center transition-colors"
      style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)", color: "var(--text-muted)" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; e.currentTarget.style.borderColor = "var(--accent-medium)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
    >
      <Plus size={11} />
      {label}
    </button>
  );
}

function MoveBtns({ onMove, canUp, canDown }: { onMove: (dir: -1 | 1) => void; canUp: boolean; canDown: boolean }) {
  const btnStyle: React.CSSProperties = {
    background: "var(--surface-raised)",
    border: "1px solid var(--border-strong)",
    color: "var(--text-muted)",
  };
  return (
    <>
      <button
        onClick={() => onMove(-1)}
        disabled={!canUp}
        title="Move up"
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-20 disabled:cursor-default"
        style={btnStyle}
      >
        <ChevronUp size={12} />
      </button>
      <button
        onClick={() => onMove(1)}
        disabled={!canDown}
        title="Move down"
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-20 disabled:cursor-default"
        style={btnStyle}
      >
        <ChevronDown size={12} />
      </button>
    </>
  );
}

function RemoveBtn({ onClick, title = "Remove" }: { onClick: () => void; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity hover:brightness-110"
      style={{ background: "#ed4245", border: "1px solid #ed4245", color: "#fff" }}
    >
      <X size={11} strokeWidth={2.5} />
    </button>
  );
}

// ── Syntax highlighting ───────────────────────────────────────────────────────

const SH = {
  kw:    "#7289da",
  str:   "#43b581",
  cmt:   "#72767d",
  num:   "#faa61a",
  fn:    "#5bc6e8",
  var:   "#ed9c79",
  plain: "#dcddde",
};

type Token = { text: string; color: string };

const JS_KW = new Set(["break","case","catch","class","const","continue","debugger","default","delete","do","else","export","extends","false","finally","for","from","function","if","import","in","instanceof","interface","let","namespace","new","null","of","return","static","super","switch","this","throw","true","try","type","typeof","undefined","var","void","while","with","yield","async","await","abstract","declare","enum","implements","readonly","satisfies"]);
const PY_KW = new Set(["False","None","True","and","as","assert","async","await","break","class","continue","def","del","elif","else","except","finally","for","from","global","if","import","in","is","lambda","nonlocal","not","or","pass","raise","return","try","while","with","yield"]);

function tokenizeJS(code: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < code.length) {
    if (code[i]==='/' && code[i+1]==='/') { const e=code.indexOf('\n',i); const end=e<0?code.length:e; out.push({text:code.slice(i,end),color:SH.cmt}); i=end; continue; }
    if (code[i]==='/' && code[i+1]==='*') { const e=code.indexOf('*/',i+2); const end=e<0?code.length:e+2; out.push({text:code.slice(i,end),color:SH.cmt}); i=end; continue; }
    if (code[i]==='`') { let j=i+1; while(j<code.length){if(code[j]==='\\'){j+=2;}else if(code[j]==='`'){j++;break;}else j++;} out.push({text:code.slice(i,j),color:SH.str}); i=j; continue; }
    if (code[i]==='"'||code[i]==="'") { const q=code[i]; let j=i+1; while(j<code.length){if(code[j]==='\\'){j+=2;}else if(code[j]===q||code[j]==='\n'){if(code[j]===q)j++;break;}else j++;} out.push({text:code.slice(i,j),color:SH.str}); i=j; continue; }
    if (/[0-9]/.test(code[i])||(code[i]==='.'&&/[0-9]/.test(code[i+1]??''))) { const m=/^(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?n?|\.\d[\d_]*(?:[eE][+-]?\d+)?)/.exec(code.slice(i)); const t=m?m[0]:code[i]; out.push({text:t,color:SH.num}); i+=t.length; continue; }
    if (/[a-zA-Z_$]/.test(code[i])) { let j=i; while(j<code.length&&/[\w$]/.test(code[j]))j++; const w=code.slice(i,j); const after=code.slice(j).trimStart(); out.push({text:w,color:JS_KW.has(w)?SH.kw:after[0]==='('?SH.fn:SH.plain}); i=j; continue; }
    out.push({text:code[i],color:SH.plain}); i++;
  }
  return out;
}

function tokenizePy(code: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < code.length) {
    if ((code[i]==='"'||code[i]==="'") && code.slice(i,i+3)===code[i].repeat(3)) { const q=code[i].repeat(3); const e=code.indexOf(q,i+3); const j=e<0?code.length:e+3; out.push({text:code.slice(i,j),color:SH.str}); i=j; continue; }
    if (code[i]==='#') { const e=code.indexOf('\n',i); const end=e<0?code.length:e; out.push({text:code.slice(i,end),color:SH.cmt}); i=end; continue; }
    if (code[i]==='"'||code[i]==="'") { const q=code[i]; let j=i+1; while(j<code.length){if(code[j]==='\\'){j+=2;}else if(code[j]===q||code[j]==='\n'){if(code[j]===q)j++;break;}else j++;} out.push({text:code.slice(i,j),color:SH.str}); i=j; continue; }
    if (/[0-9]/.test(code[i])) { const m=/^(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?[jJ]?)/.exec(code.slice(i)); const t=m?m[0]:code[i]; out.push({text:t,color:SH.num}); i+=t.length; continue; }
    if (/[a-zA-Z_]/.test(code[i])) { let j=i; while(j<code.length&&/\w/.test(code[j]))j++; const w=code.slice(i,j); const after=code.slice(j).trimStart(); out.push({text:w,color:PY_KW.has(w)?SH.kw:after[0]==='('?SH.fn:SH.plain}); i=j; continue; }
    out.push({text:code[i],color:SH.plain}); i++;
  }
  return out;
}

function tokenizeBash(code: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < code.length) {
    if (code[i]==='#') { const e=code.indexOf('\n',i); const end=e<0?code.length:e; out.push({text:code.slice(i,end),color:SH.cmt}); i=end; continue; }
    if (code[i]==='"') { let j=i+1; while(j<code.length){if(code[j]==='\\'){j+=2;}else if(code[j]==='"'){j++;break;}else j++;} out.push({text:code.slice(i,j),color:SH.str}); i=j; continue; }
    if (code[i]==="'") { let j=i+1; while(j<code.length&&code[j]!=="'")j++; if(j<code.length)j++; out.push({text:code.slice(i,j),color:SH.str}); i=j; continue; }
    if (code[i]==='$') { let j=i+1; if(code[j]==='{'){j++;while(j<code.length&&code[j]!=='}')j++;if(j<code.length)j++;}else{while(j<code.length&&/[\w]/.test(code[j]))j++;} out.push({text:code.slice(i,j),color:SH.var}); i=j; continue; }
    if (/[0-9]/.test(code[i]) && (i===0 || !/[\w.]/.test(code[i-1]))) { const m=/^\d+(?:\.\d+)?/.exec(code.slice(i)); const t=m?m[0]:code[i]; out.push({text:t,color:SH.num}); i+=t.length; continue; }
    out.push({text:code[i],color:SH.plain}); i++;
  }
  return out;
}

function tokenizeJSON(code: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < code.length) {
    if (code[i]==='"') { let j=i+1; while(j<code.length){if(code[j]==='\\'){j+=2;}else if(code[j]==='"'){j++;break;}else j++;} const after=code.slice(j).trimStart(); out.push({text:code.slice(i,j),color:after[0]===':'?SH.kw:SH.str}); i=j; continue; }
    if (/[0-9\-]/.test(code[i])) { const s=i; if(code[i]==='-')i++; if(/[0-9]/.test(code[i]??'')){while(i<code.length&&/[0-9.eE+\-]/.test(code[i]))i++; out.push({text:code.slice(s,i),color:SH.num}); continue;} i=s; }
    if (code.slice(i,i+4)==='null'||code.slice(i,i+4)==='true'||code.slice(i,i+5)==='false') { const kw=code[i+1]==='a'?'false':code[i]==='n'?'null':'true'; out.push({text:kw,color:SH.var}); i+=kw.length; continue; }
    out.push({text:code[i],color:SH.plain}); i++;
  }
  return out;
}

const RUST_KW = new Set(["as","async","await","break","const","continue","crate","dyn","else","enum","extern","false","fn","for","if","impl","in","let","loop","match","mod","move","mut","pub","ref","return","self","Self","static","struct","super","trait","true","type","union","unsafe","use","where","while","abstract","become","box","do","final","macro","override","priv","typeof","unsized","virtual","yield"]);

function tokenizeRust(code: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < code.length) {
    if (code[i]==='/' && code[i+1]==='/') { const e=code.indexOf('\n',i); const end=e<0?code.length:e; out.push({text:code.slice(i,end),color:SH.cmt}); i=end; continue; }
    if (code[i]==='/' && code[i+1]==='*') { const e=code.indexOf('*/',i+2); const end=e<0?code.length:e+2; out.push({text:code.slice(i,end),color:SH.cmt}); i=end; continue; }
    if (code[i]==='"') { let j=i+1; while(j<code.length){if(code[j]==='\\'){j+=2;}else if(code[j]==='"'){j++;break;}else j++;} out.push({text:code.slice(i,j),color:SH.str}); i=j; continue; }
    if (code[i]==="'") {
      // Char literal ('a', '\n') vs lifetime ('static, 'a) — lifetimes have no closing quote
      const ch=/^'(?:\\.|[^'\\])'/.exec(code.slice(i));
      if (ch) { out.push({text:ch[0],color:SH.str}); i+=ch[0].length; continue; }
      const lt=/^'[A-Za-z_]\w*/.exec(code.slice(i));
      if (lt) { out.push({text:lt[0],color:SH.kw}); i+=lt[0].length; continue; }
      out.push({text:code[i],color:SH.plain}); i++; continue;
    }
    if (/[0-9]/.test(code[i])) { const m=/^(?:0[xXbBoO][0-9a-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?)(?:[iu](?:8|16|32|64|128|size)|f32|f64)?/.exec(code.slice(i)); const t=m?m[0]:code[i]; out.push({text:t,color:SH.num}); i+=t.length; continue; }
    if (/[a-zA-Z_]/.test(code[i])) { let j=i; while(j<code.length&&/[\w]/.test(code[j]))j++; const w=code.slice(i,j); const after=code.slice(j).trimStart(); out.push({text:w,color:RUST_KW.has(w)?SH.kw:after[0]==='('?SH.fn:/^[A-Z]/.test(w)?SH.fn:SH.plain}); i=j; continue; }
    out.push({text:code[i],color:SH.plain}); i++;
  }
  return out;
}

function tokenize(code: string, lang: string): Token[] {
  const l = lang.toLowerCase().trim();
  if (["js","javascript","ts","typescript","jsx","tsx"].includes(l)) return tokenizeJS(code);
  if (["py","python"].includes(l)) return tokenizePy(code);
  if (["sh","bash","shell","zsh"].includes(l)) return tokenizeBash(code);
  if (["json"].includes(l)) return tokenizeJSON(code);
  if (["rs","rust"].includes(l)) return tokenizeRust(code);
  return [{ text: code, color: SH.plain }];
}

function HighlightedCode({ code, lang }: { code: string; lang: string }) {
  const tokens = tokenize(code, lang);
  return (
    <pre className="whitespace-pre-wrap break-words text-[13px] leading-relaxed p-4 overflow-x-auto" style={{ fontFamily: "var(--font-jetbrains), monospace", color: SH.plain }}>
      {tokens.map((tok, idx) =>
        tok.color === SH.plain
          ? tok.text
          : <span key={idx} style={{ color: tok.color }}>{tok.text}</span>
      )}
    </pre>
  );
}

// ── Rich content block renderer ───────────────────────────────────────────────

type BlockType = "text" | "code" | "image" | "quote" | "video";

// Parse a YouTube/Vimeo URL into a safe embed URL. The embed is rebuilt from the
// extracted id (never the raw input), so arbitrary iframe srcs can't be injected.
function videoEmbed(url: string): string | null {
  const u = url.trim();
  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

interface Block {
  j: number;
  type: BlockType;
}

function EditableTextarea({
  contentKey,
  fallback,
  className,
  style,
  mono,
  lang,
}: {
  contentKey: string;
  fallback: string;
  className?: string;
  style?: React.CSSProperties;
  mono?: boolean;
  lang?: string;
}) {
  const { content, updateContent } = useContentContext();
  const { can } = usePermissions();
  const canEdit = can("edit_content");
  const value = content[contentKey] ?? fallback;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // View mode: syntax-highlighted for code, plain pre for text
  if (!canEdit || !editing) {
    const viewEl = lang ? (
      <HighlightedCode code={value || fallback} lang={lang} />
    ) : (
      <pre
        className={`whitespace-pre-wrap break-words ${className ?? ""}`}
        style={{ fontFamily: mono ? "var(--font-jetbrains), monospace" : "inherit", ...style }}
      >
        {value}
      </pre>
    );

    if (!canEdit) return viewEl;

    // Admin view-mode: click to enter edit
    return (
      <div
        onClick={() => { setEditing(true); setDraft(value); }}
        className="cursor-text"
        style={{ outline: "1px dashed transparent", borderRadius: "var(--radius-card)", transition: "outline-color 0.15s" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.outlineColor = "var(--border-strong)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.outlineColor = "transparent"; }}
      >
        {viewEl}
      </div>
    );
  }

  // Admin edit mode: textarea
  return (
    <textarea
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        setEditing(false);
        if (draft !== value) updateContent(contentKey, draft);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") { setEditing(false); setDraft(value); }
      }}
      rows={Math.max(3, (draft.match(/\n/g)?.length ?? 0) + 2)}
      className={`w-full resize-none bg-transparent outline-none ${className ?? ""}`}
      style={{
        fontFamily: mono ? "var(--font-jetbrains), monospace" : "inherit",
        border: "1px solid var(--accent-medium)",
        borderRadius: "var(--radius-card)",
        padding: "0.5rem",
        color: SH.plain,
        ...style,
      }}
    />
  );
}

// ── Copy-to-clipboard for code blocks ─────────────────────────────────────────

function CopyCodeBtn({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (http/permissions) — silently ignore */
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy code"
      className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer transition-colors shrink-0"
      style={{ color: copied ? "#43b581" : "#72767d" }}
    >
      {copied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} strokeWidth={1.5} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ── Image upload to Supabase Storage ──────────────────────────────────────────

function ImageUploadBtn({ onUploaded }: { onUploaded: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("lesson-images")
        .upload(path, file, { cacheControl: "31536000" });
      if (error) throw error;
      const { data } = supabase.storage.from("lesson-images").getPublicUrl(path);
      onUploaded(data.publicUrl);
    } catch (err) {
      console.error("[upload] failed:", err);
      alert("Image upload failed — check that the lesson-images bucket exists.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="shrink-0 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-tag)] transition-opacity hover:opacity-100 opacity-60 disabled:opacity-30"
        style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
      >
        {busy ? "Uploading…" : "Upload"}
      </button>
    </>
  );
}

function BlockRenderer({
  block,
  lk,
  si,
  canEdit,
  canManage,
  onRemove,
  onMove,
  canMoveUp,
  canMoveDown,
}: {
  block: Block;
  lk: string;
  si: number;
  canEdit: boolean;
  canManage: boolean;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { content, updateContent } = useContentContext();
  const prefix = `${lk}_s${si}_blk${block.j}`;
  const blockContent = content[`${prefix}_content`] ?? "";
  const lang = content[`${prefix}_lang`] ?? "";
  const caption = content[`${prefix}_caption`] ?? "";

  const controls = canManage ? (
    <div className="absolute left-full top-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1">
      <MoveBtns onMove={onMove} canUp={canMoveUp} canDown={canMoveDown} />
      <RemoveBtn onClick={onRemove} title={`Remove ${block.type} block`} />
    </div>
  ) : null;

  if (block.type === "text") {
    return (
      <div className="group relative">
        {controls}
        {canEdit ? (
          <Editable
            as="p"
            contentKey={`${prefix}_content`}
            fallback="New paragraph…"
            className="leading-relaxed text-[15px]"
            style={{ color: "var(--text-muted)" }}
          />
        ) : (
          <p className="leading-relaxed text-[15px]" style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
            {renderInline(blockContent || "New paragraph…")}
          </p>
        )}
      </div>
    );
  }

  if (block.type === "code") {
    const displayLang = lang || "plaintext";
    return (
      <div className="group relative">
        {controls}
        {/* Header bar: language label + copy button */}
        <div
          className="flex items-center justify-between gap-3 px-4 py-1.5 rounded-t-[var(--radius-card)]"
          style={{ background: "#232428", borderBottom: "1px solid #1a1b1e" }}
        >
          {canEdit ? (
            <Editable
              as="span"
              contentKey={`${prefix}_lang`}
              fallback="plaintext"
              className="font-mono text-[10px] uppercase tracking-widest"
              style={{ color: "#72767d" }}
            />
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "#72767d" }}>
              {displayLang}
            </span>
          )}
          <CopyCodeBtn code={blockContent || "// code here"} />
        </div>
        {/* Code body */}
        <div className="overflow-x-auto rounded-b-[var(--radius-card)]" style={{ background: "#313338" }}>
          <EditableTextarea
            contentKey={`${prefix}_content`}
            fallback="// code here"
            mono
            lang={displayLang}
            className="text-[13px] leading-relaxed p-4"
            style={{ color: SH.plain }}
          />
        </div>
      </div>
    );
  }

  if (block.type === "image") {
    const url = blockContent;
    return (
      <div className="group relative">
        {controls}
        {canEdit && (
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[9px] uppercase tracking-widest opacity-40" style={{ color: "var(--text-muted)" }}>
              URL:
            </span>
            <Editable
              as="span"
              contentKey={`${prefix}_content`}
              fallback="https://example.com/image.png"
              className="font-mono text-[10px] flex-1 truncate"
              style={{ color: "var(--text-muted)" }}
            />
            <ImageUploadBtn onUploaded={(publicUrl) => updateContent(`${prefix}_content`, publicUrl)} />
          </div>
        )}
        {url && url !== "https://example.com/image.png" ? (
          <figure>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={caption || ""}
              className="w-full rounded-[var(--radius-card)] object-cover"
              style={{ border: "1px solid var(--border-color)" }}
            />
            {(caption || canEdit) && (
              <figcaption className="text-center mt-2 text-[12px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                <Editable as="span" contentKey={`${prefix}_caption`} fallback="Image caption (optional)" />
              </figcaption>
            )}
          </figure>
        ) : (
          <div
            className="flex items-center justify-center py-10 rounded-[var(--radius-card)]"
            style={{ border: "1px dashed var(--border-strong)", color: "var(--text-muted)", opacity: 0.4 }}
          >
            <ImageIcon size={24} strokeWidth={1} />
          </div>
        )}
      </div>
    );
  }

  if (block.type === "video") {
    const embed = videoEmbed(blockContent);
    return (
      <div className="group relative">
        {controls}
        {canEdit && (
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-[9px] uppercase tracking-widest opacity-40" style={{ color: "var(--text-muted)" }}>
              Video URL:
            </span>
            <Editable
              as="span"
              contentKey={`${prefix}_content`}
              fallback="https://youtube.com/watch?v=…"
              className="font-mono text-[10px] flex-1 truncate"
              style={{ color: "var(--text-muted)" }}
            />
          </div>
        )}
        {embed ? (
          <figure>
            <div className="w-full aspect-video overflow-hidden rounded-[var(--radius-card)]" style={{ border: "1px solid var(--border-color)", background: "#000" }}>
              <iframe
                src={embed}
                title={caption || "Video"}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            {(caption || canEdit) && (
              <figcaption className="text-center mt-2 text-[12px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                <Editable as="span" contentKey={`${prefix}_caption`} fallback="Video caption (optional)" />
              </figcaption>
            )}
          </figure>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-2 py-10 rounded-[var(--radius-card)]"
            style={{ border: "1px dashed var(--border-strong)", color: "var(--text-muted)", opacity: 0.5 }}
          >
            <Video size={24} strokeWidth={1} />
            {canEdit && blockContent && (
              <span className="text-[11px]">Paste a YouTube or Vimeo link above</span>
            )}
          </div>
        )}
      </div>
    );
  }

  if (block.type === "quote") {
    return (
      <div className="group relative">
        {controls}
        <div
          className="px-4 py-3 text-[13px] leading-relaxed"
          style={{
            borderLeft: "3px solid var(--accent-medium)",
            background: "var(--surface)",
            color: "var(--text-muted)",
            borderRadius: "0 var(--radius-card) var(--radius-card) 0",
          }}
        >
          {canEdit ? (
            <Editable as="span" contentKey={`${prefix}_content`} fallback="Quote text here…" />
          ) : (
            <span style={{ whiteSpace: "pre-wrap" }}>{renderInline(blockContent || "Quote text here…")}</span>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ── Add-block menu ────────────────────────────────────────────────────────────

function AddBlockMenu({
  onAdd,
}: {
  onAdd: (type: BlockType) => void;
}) {
  const [open, setOpen] = useState(false);

  const options: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: "text", label: "Paragraph", icon: <span className="font-mono text-[10px]">¶</span> },
    { type: "code", label: "Code Block", icon: <Code size={11} /> },
    { type: "image", label: "Image", icon: <ImageIcon size={11} /> },
    { type: "video", label: "Video", icon: <Video size={11} /> },
    { type: "quote", label: "Quote", icon: <Quote size={11} /> },
  ];

  return (
    <div className="relative mt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2 text-[10px] font-mono uppercase tracking-widest cursor-pointer w-full justify-center transition-colors"
        style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)", color: "var(--text-muted)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; e.currentTarget.style.borderColor = "var(--accent-medium)"; }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; } }}
      >
        <Plus size={11} /> Add Block
      </button>
      {open && (
        <div
          className="absolute left-1/2 -translate-x-1/2 mt-1 z-20 flex flex-col overflow-hidden"
          style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", background: "var(--surface)", minWidth: "140px" }}
        >
          {options.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => { onAdd(type); setOpen(false); }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-[12px] text-left cursor-pointer transition-colors hover:bg-[var(--surface-raised)]"
              style={{ color: "var(--text-muted)" }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Lesson URL slug row (admin only) ──────────────────────────────────────────

function LessonSlugRow({
  lk, courseId, courseSlug, urlSlug, fallbackTitle,
}: {
  lk: string;
  courseId: string;
  courseSlug: string;
  urlSlug: string;
  fallbackTitle: string;
}) {
  const { content, updateContent } = useContentContext();
  const { can } = usePermissions();
  const currentSlug = content[`${lk}_slug`] ?? urlSlug;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentSlug);

  if (!can("edit_urls")) return null;

  const applySlug = (slug: string) => {
    const clean = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || currentSlug;
    updateContent(`${lk}_slug`, clean);
    // Replace this lesson's entry in the course slug map — old URLs stop resolving
    updateContent(`${courseId}_slug_map`, replaceSlugMapEntry(content[`${courseId}_slug_map`], clean, lk));
    setEditing(false);
  };

  const syncFromTitle = () => applySlug(slugFromTitle(content[`${lk}_title`] ?? fallbackTitle));

  return (
    <div className="-mt-2 mb-6 flex items-center gap-2 font-mono text-[11px] flex-wrap" style={{ color: "var(--text-muted)" }}>
      <span className="opacity-50">URL:</span>
      {editing ? (
        <>
          <span className="opacity-40">/courses/{courseSlug}/</span>
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") applySlug(draft); if (e.key === "Escape") setEditing(false); }}
            className="px-2 py-0.5 bg-transparent outline-none border-b w-40"
            style={{ borderColor: "var(--accent-medium)", color: "var(--text)" }}
          />
          <button onClick={() => applySlug(draft)} className="px-2 py-0.5 cursor-pointer" style={{ color: "var(--accent-medium)" }}>Save</button>
          <button onClick={() => setEditing(false)} className="px-2 py-0.5 cursor-pointer opacity-50">Cancel</button>
        </>
      ) : (
        <>
          <span>/courses/{courseSlug}/<span style={{ color: "var(--text)" }}>{currentSlug}</span></span>
          <button onClick={() => { setDraft(currentSlug); setEditing(true); }} className="px-2 py-0.5 cursor-pointer hover:opacity-100 opacity-40 transition-opacity">Edit</button>
          <button onClick={syncFromTitle} className="px-2 py-0.5 cursor-pointer hover:opacity-100 opacity-40 transition-opacity">Sync from title</button>
        </>
      )}
    </div>
  );
}

// ── Author credits (admin-editable, staff picker) ─────────────────────────────

interface StaffUser {
  username: string;
  is_admin: boolean;
  role: string | null;
}

// Searchable picker over the staff pool. Default pool is admins + role-holders
// (for author credits); rolesOnly restricts to role-holders (for edit grants).
function StaffPicker({
  label, exclude, onSelect, rolesOnly = false,
}: {
  label: string;
  exclude: string[];
  onSelect: (username: string) => void;
  rolesOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pool, setPool] = useState<StaffUser[] | null>(null);

  useEffect(() => {
    if (!open || pool !== null) return;
    (async () => {
      try {
        const supabase = createClient();
        let query = supabase.from("profiles").select("username, is_admin, role");
        query = rolesOnly ? query.not("role", "is", null) : query.or("is_admin.eq.true,role.not.is.null");
        const { data } = await query.order("username");
        setPool((data ?? []) as StaffUser[]);
      } catch {
        setPool([]);
      }
    })();
  }, [open, pool, rolesOnly]);

  const needle = q.trim().toLowerCase();
  const matches = (pool ?? [])
    .filter((u) => !exclude.includes(u.username))
    .filter((u) => u.username.toLowerCase().includes(needle))
    .slice(0, 8);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="cursor-pointer px-2 py-0.5 rounded-[var(--radius-tag)] font-mono text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity"
        style={{ border: "1px dashed var(--border-strong)", color: "var(--text-muted)" }}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="relative inline-flex">
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setOpen(false); setQ(""); }
          if (e.key === "Enter" && matches[0]) { onSelect(matches[0].username); setOpen(false); setQ(""); }
        }}
        onBlur={() => setTimeout(() => { setOpen(false); setQ(""); }, 150)}
        placeholder="Search staff…"
        className="px-2 py-0.5 bg-transparent outline-none border-b w-36 text-[12px]"
        style={{ borderColor: "var(--accent-medium)", color: "var(--text)" }}
      />
      <div
        className="absolute left-0 top-full mt-1 z-30 flex flex-col overflow-hidden min-w-[180px]"
        style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}
      >
        {pool === null ? (
          <span className="px-3 py-2 text-[11px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>Loading…</span>
        ) : matches.length > 0 ? (
          matches.map((u) => (
            <button
              key={u.username}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(u.username); setOpen(false); setQ(""); }}
              className="flex items-center justify-between gap-3 px-3 py-2 text-left text-[12px] cursor-pointer hover:bg-[var(--surface-raised)] transition-colors"
              style={{ color: "var(--text)" }}
            >
              @{u.username}
              <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-muted)", opacity: 0.6 }}>
                {u.is_admin ? "Admin" : u.role}
              </span>
            </button>
          ))
        ) : (
          <span className="px-3 py-2 text-[11px]" style={{ color: "var(--text-muted)", opacity: 0.6 }}>No staff found.</span>
        )}
      </div>
    </span>
  );
}

function AuthorCredits({ lk, lastUpdated }: { lk: string; lastUpdated: string | null }) {
  const { content, updateContent } = useContentContext();
  const { can } = usePermissions();
  const canEditAuthors = can("edit_authors");
  const author = (content[`${lk}_author`] ?? "").trim();
  const editors = (content[`${lk}_editors`] ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  // Fixed locale + UTC so server and client render the same string
  const updatedDisplay = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })
    : null;

  // Learners only see the block when credits or an edit date exist
  if (!canEditAuthors && !author && editors.length === 0 && !updatedDisplay) return null;

  const saveEditors = (list: string[]) => updateContent(`${lk}_editors`, list.join(", "));

  return (
    <div
      className="mb-4 pt-4 flex flex-col gap-1.5 font-mono text-[12px]"
      style={{ borderTop: "1px solid var(--border-color)", color: "var(--text-muted)" }}
    >
      {(canEditAuthors || author) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="uppercase tracking-widest text-[10px] opacity-50 shrink-0">Written by</span>
          {author && <span style={{ color: "var(--text)" }}>@{author}</span>}
          {canEditAuthors && author && (
            <button
              onClick={() => updateContent(`${lk}_author`, "")}
              title="Remove author"
              className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: "#ed4245" }}
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
          {canEditAuthors && !author && (
            <StaffPicker label="Set author…" exclude={[]} onSelect={(u) => updateContent(`${lk}_author`, u)} />
          )}
        </div>
      )}
      {/* Edited by: hidden from the public entirely when there are no editors */}
      {(canEditAuthors || editors.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="uppercase tracking-widest text-[10px] opacity-50 shrink-0">Edited by</span>
          {canEditAuthors ? (
            <>
              {editors.map((e) => (
                <span key={e} className="flex items-center gap-1" style={{ color: "var(--text)" }}>
                  @{e}
                  <button
                    onClick={() => saveEditors(editors.filter((x) => x !== e))}
                    title="Remove editor"
                    className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                    style={{ color: "#ed4245" }}
                  >
                    <X size={11} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
              <StaffPicker
                label={editors.length ? "+ Add" : "Add editor…"}
                exclude={editors}
                onSelect={(u) => saveEditors([...editors, u])}
              />
            </>
          ) : (
            <span style={{ color: "var(--text)" }}>{editors.map((e) => `@${e}`).join(", ")}</span>
          )}
        </div>
      )}
      {updatedDisplay && (
        <div className="flex items-center gap-2">
          <span className="uppercase tracking-widest text-[10px] opacity-50 shrink-0">Updated</span>
          <span>{updatedDisplay}</span>
        </div>
      )}
    </div>
  );
}

// ── Edit-access grants (admin only) ───────────────────────────────────────────

export function EditAccessManager({
  aclKey, title, hint, grantScope,
}: {
  aclKey: string;
  title: string;
  hint: string;
  // When set, non-admins holding manage_access in this scope (e.g. a professor
  // granted the course) can also manage the list. Omitted → admins only.
  grantScope?: EditScope;
}) {
  const { content, updateContent } = useContentContext();
  const { isAdmin, previewMode } = usePermissions();
  const { profile } = useAuth();
  const canGrant =
    isAdmin || (!!grantScope && evalPermission(profile, content, grantScope, "manage_access"));
  if (previewMode || !canGrant) return null;

  let users: string[] = [];
  try { users = JSON.parse(content[aclKey] ?? "[]"); } catch { users = []; }

  const save = (list: string[]) => updateContent(aclKey, JSON.stringify(list));

  return (
    <div
      className="mb-10 px-5 pt-4 pb-5 flex flex-col gap-2"
      style={{ background: "var(--surface)", border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)" }}
    >
      <div className="flex items-center gap-2">
        <Lock size={12} style={{ color: "var(--text-muted)" }} />
        <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{title}</span>
      </div>
      <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)", opacity: 0.65 }}>{hint}</p>
      <div className="flex items-center gap-2 flex-wrap mt-1 font-mono text-[12px]">
        {users.map((u) => (
          <span
            key={u}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-tag)]"
            style={{ border: "1px solid var(--accent-medium)", color: "var(--accent-medium)" }}
          >
            @{u}
            <button onClick={() => save(users.filter((x) => x !== u))} title="Revoke access" className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity" style={{ color: "#ed4245" }}>
              <X size={11} strokeWidth={2.5} />
            </button>
          </span>
        ))}
        <StaffPicker
          label={users.length ? "+ Grant" : "Grant access…"}
          exclude={users}
          rolesOnly
          onSelect={(u) => save([...users, u])}
        />
      </div>
    </div>
  );
}

// ── Mark-complete button ──────────────────────────────────────────────────────

function MarkCompleteButton({ lessonKey }: { lessonKey: string }) {
  const { completed, signedIn, toggleComplete } = useProgress();

  // Logged-out nudge: same spot the Mark Complete button would occupy
  if (!signedIn) {
    return (
      <div className="flex justify-center mb-10">
        <Link
          href="/login"
          className="flex items-center gap-2 px-5 py-2 font-mono text-[11px] uppercase tracking-widest rounded-[var(--radius-button)] transition-colors hover:text-[var(--text)] hover:border-[var(--text-muted)]"
          style={{ border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
        >
          <Check size={13} strokeWidth={2.5} className="opacity-50" />
          Sign in to track your progress
        </Link>
      </div>
    );
  }

  const done = completed.has(lessonKey);

  return (
    <div className="flex justify-center mb-10">
      <button
        onClick={() => toggleComplete(lessonKey)}
        className="flex items-center gap-2 px-5 py-2 font-mono text-[11px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] transition-colors"
        style={done
          ? { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }
          : { background: "transparent", color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}
        title={done ? "Click to mark incomplete" : undefined}
      >
        <Check size={13} strokeWidth={2.5} />
        {done ? "Completed" : "Mark Lesson Complete"}
      </button>
    </div>
  );
}

// ── Status control on lesson page ─────────────────────────────────────────────

const STATUSES = [
  { value: "published", label: "Published" },
  { value: "soon", label: "Soon" },
  { value: "draft", label: "Draft" },
] as const;

function LessonStatusBadge({ lessonKey, hasStaticContent }: { lessonKey: string; hasStaticContent: boolean }) {
  const { content, updateContent } = useContentContext();
  const { can } = usePermissions();
  const status = getEffectiveStatus(lessonKey, hasStaticContent, content);

  if (!can("manage_lessons")) return null;

  return (
    <div className="relative inline-flex items-center">
      <select
        value={status}
        onChange={(e) => updateContent(`${lessonKey}_status`, e.target.value)}
        className="appearance-none font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 pr-6 rounded-[var(--radius-tag)] cursor-pointer bg-transparent outline-none"
        style={{
          color: status === "published" ? "var(--accent-medium)" : "var(--text-muted)",
          border: `1px solid ${status === "published" ? "var(--accent-medium)" : "var(--border-strong)"}`,
        }}
      >
        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <ChevronDown size={8} className="absolute right-1 pointer-events-none" style={{ color: status === "published" ? "var(--accent-medium)" : "var(--text-muted)" }} />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  lessonKey: string;
  slug: string;
  courseId?: string;
  lastUpdated?: string | null;
}

export function LessonContent({ lessonKey, slug, courseId = "foundations", lastUpdated = null }: Props) {
  const { content, updateContent } = useContentContext();
  // Permissions here are scoped to THIS lesson — a role-holder can act only if
  // an admin granted them this lesson (or its whole course).
  const { canReal, isAdminReal } = usePermissions({ type: "lesson", courseId, lessonKey });

  // "Preview as reader" — an editor can flip this to see the page exactly as a
  // reader would (markdown formatted, no edit UI). Local to this lesson page.
  const [previewMode, setPreviewMode] = useState(false);

  // Affordance flags respect the preview toggle; the nested subtree gets the
  // preview flag via PreviewModeProvider so every Editable renders read-only too.
  const canEdit = !previewMode && canReal("edit_content");
  const canManage = !previewMode && canReal("manage_sections");
  const canPublish = !previewMode && canReal("manage_lessons");

  // Real (preview-independent) — for access gating and the toggle's own visibility
  const canViewDrafts = isAdminReal || canReal("manage_lessons") || canReal("view_drafts") || canReal("edit_content");
  const canEditHere = isAdminReal || canReal("edit_content") || canReal("manage_sections");
  const { allLessons } = useCourseStructure(courseId);

  // Static lesson data for fallbacks (only exists for foundations lessons)
  const staticLesson = getStaticLesson(lessonKey);
  const d = staticLesson?.content ?? null;
  const lk = lessonKey;

  // Projects get a leaner layout: no overview/knowledge check/resources,
  // and an Odin-style boxed assignment
  const iconName = content[`${lk}_icon`] ?? staticLesson?.iconFallback ?? "BookOpen";
  const isProject = PROJECT_ICONS.has(iconName);

  // Lesson status
  const status = getEffectiveStatus(lk, !!d, content);
  const courseTitle = content[getCourseKeys(courseId).titleKey] ?? "Course";
  const courseSlug = getCourseSlug(courseId, content);

  // Follow slug renames: old URLs die on rename, so when the lesson or course
  // slug changes while this page is open, swap the address to the live URL.
  const router = useRouter();
  const pathname = usePathname();
  const contentSlug = content[`${lk}_slug`] ?? slug;
  useEffect(() => {
    if (!pathname.startsWith("/courses/")) return;
    const target = `/courses/${courseSlug}/${contentSlug}`;
    if (pathname === target) return;
    // small delay so the slug/map upserts land before the server resolves it
    const t = setTimeout(() => router.replace(target), 1200);
    return () => clearTimeout(t);
  }, [pathname, courseSlug, contentSlug, router]);

  // Prev / Next from live structure
  const currentIdx = allLessons.findIndex((l) => l.slug === slug);
  const prev = currentIdx > 0 ? allLessons[currentIdx - 1] : null;
  const next = currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null;

  const isAccessiblePrev = prev && (getEffectiveStatus(prev.lessonKey, prev.hasStaticContent, content) === "published" || canPublish);
  const isAccessibleNext = next && (getEffectiveStatus(next.lessonKey, next.hasStaticContent, content) === "published" || canPublish);

  // ── Outcomes ─────────────────────────────────────────────────────────────
  const defaultOutcomeCount = d?.outcomes.length ?? 0;
  const outcomeCount = parseInt(content[`${lk}_outcome_count`] ?? "", 10) || defaultOutcomeCount;
  const outcomes: { i: number; fallback: string }[] = [];
  for (let i = 0; i < outcomeCount; i++) {
    if (content[`${lk}_outcome_${i}_deleted`] === "1") continue;
    outcomes.push({ i, fallback: d?.outcomes[i] ?? "" });
  }
  const addOutcome = () => {
    const idx = outcomeCount;
    updateContent(`${lk}_outcome_count`, String(idx + 1));
    updateContent(`${lk}_outcome_${idx}`, "New learning outcome");
  };
  const deleteOutcome = (idx: number) => updateContent(`${lk}_outcome_${idx}_deleted`, "1");

  // ── Main Sections ─────────────────────────────────────────────────────────
  const defaultSectionCount = d?.sections.length ?? 0;
  const sectionCount = parseInt(content[`${lk}_section_count`] ?? "", 10) || defaultSectionCount;
  type SectionEntry = { i: number; def: (typeof d extends null ? never : NonNullable<typeof d>["sections"][number]) | undefined; paraCount: number; blkCount: number };
  const sections: SectionEntry[] = [];
  for (let i = 0; i < sectionCount; i++) {
    if (content[`${lk}_s${i}_deleted`] === "1") continue;
    const def = d?.sections[i];
    const paraCount = def
      ? def.paragraphs.length
      : parseInt(content[`${lk}_s${i}_para_count`] ?? "", 10) || 1;
    const blkCount = parseInt(content[`${lk}_s${i}_blk_count`] ?? "", 10) || 0;
    sections.push({ i, def, paraCount, blkCount });
  }
  const addSection = () => {
    const idx = sectionCount;
    updateContent(`${lk}_section_count`, String(idx + 1));
    updateContent(`${lk}_s${idx}_heading`, "New Section");
    updateContent(`${lk}_s${idx}_p0`, "Add your content here.");
    updateContent(`${lk}_s${idx}_para_count`, "1");
  };
  const deleteSection = (idx: number) => updateContent(`${lk}_s${idx}_deleted`, "1");

  // Section display order: stored order first, then anything new appended
  const sectionOrderStored = parseJSON<string[]>(content[`${lk}_section_order`], []);
  const sectionIds = sections.map((s) => String(s.i));
  const sectionOrderIds = [
    ...sectionOrderStored.filter((id) => sectionIds.includes(id)),
    ...sectionIds.filter((id) => !sectionOrderStored.includes(id)),
  ];
  const orderedSections = sectionOrderIds
    .map((id) => sections.find((s) => String(s.i) === id))
    .filter((s): s is SectionEntry => !!s);
  const moveSection = (sectionIdx: number, dir: -1 | 1) => {
    const idx = sectionOrderIds.indexOf(String(sectionIdx));
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= sectionOrderIds.length) return;
    const next = [...sectionOrderIds];
    [next[idx], next[j]] = [next[j], next[idx]];
    updateContent(`${lk}_section_order`, JSON.stringify(next));
  };

  const addBlock = (si: number, currentBlkCount: number, type: BlockType) => {
    const j = currentBlkCount;
    updateContent(`${lk}_s${si}_blk_count`, String(j + 1));
    updateContent(`${lk}_s${si}_blk${j}_type`, type);
    if (type === "text") updateContent(`${lk}_s${si}_blk${j}_content`, "New paragraph…");
    if (type === "code") { updateContent(`${lk}_s${si}_blk${j}_content`, "// code here"); updateContent(`${lk}_s${si}_blk${j}_lang`, "plaintext"); }
    if (type === "image") updateContent(`${lk}_s${si}_blk${j}_content`, "");
    if (type === "video") updateContent(`${lk}_s${si}_blk${j}_content`, "");
    if (type === "quote") updateContent(`${lk}_s${si}_blk${j}_content`, "Quote text here…");
  };
  const deleteBlock = (si: number, j: number) => updateContent(`${lk}_s${si}_blk${j}_deleted`, "1");
  const deleteParag = (si: number, j: number) => updateContent(`${lk}_s${si}_p${j}_deleted`, "1");

  // ── Assignment ────────────────────────────────────────────────────────────
  const defaultAssignCount = d?.assignment?.items.length ?? 0;
  const assignCount = parseInt(content[`${lk}_assign_count`] ?? "", 10) || defaultAssignCount;
  const assignItems: { i: number; fallback: string }[] = [];
  for (let i = 0; i < assignCount; i++) {
    if (content[`${lk}_assign_${i}_deleted`] === "1") continue;
    assignItems.push({ i, fallback: d?.assignment?.items[i] ?? "" });
  }
  const addAssignItem = () => {
    const idx = assignCount;
    updateContent(`${lk}_assign_count`, String(idx + 1));
    updateContent(`${lk}_assign_${idx}`, "Complete this task.");
  };
  const deleteAssignItem = (idx: number) => updateContent(`${lk}_assign_${idx}_deleted`, "1");

  // Assignment display order
  type AssignEntry = { i: number; fallback: string };
  const assignOrderStored = parseJSON<string[]>(content[`${lk}_assign_order`], []);
  const assignIds = assignItems.map((a) => String(a.i));
  const assignOrderIds = [
    ...assignOrderStored.filter((id) => assignIds.includes(id)),
    ...assignIds.filter((id) => !assignOrderStored.includes(id)),
  ];
  const orderedAssignItems = assignOrderIds
    .map((id) => assignItems.find((a) => String(a.i) === id))
    .filter((a): a is AssignEntry => !!a);
  const moveAssignItem = (assignIdx: number, dir: -1 | 1) => {
    const idx = assignOrderIds.indexOf(String(assignIdx));
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= assignOrderIds.length) return;
    const next = [...assignOrderIds];
    [next[idx], next[j]] = [next[j], next[idx]];
    updateContent(`${lk}_assign_order`, JSON.stringify(next));
  };

  // ── Knowledge Check ───────────────────────────────────────────────────────
  const defaultKCCount = d?.knowledgeCheck.length ?? 0;
  const kcCount = parseInt(content[`${lk}_kc_count`] ?? "", 10) || defaultKCCount;
  type KCEntry = { i: number; defQ: string; defA: string };
  const kcItems: KCEntry[] = [];
  for (let i = 0; i < kcCount; i++) {
    if (content[`${lk}_kc${i}_deleted`] === "1") continue;
    kcItems.push({ i, defQ: d?.knowledgeCheck[i]?.question ?? "", defA: d?.knowledgeCheck[i]?.answer ?? "" });
  }
  const addKCItem = () => {
    const idx = kcCount;
    updateContent(`${lk}_kc_count`, String(idx + 1));
    updateContent(`${lk}_kc${idx}_q`, "New question");
    updateContent(`${lk}_kc${idx}_a`, "Answer goes here.");
  };
  const deleteKCItem = (idx: number) => updateContent(`${lk}_kc${idx}_deleted`, "1");

  // Knowledge-check display order
  const kcOrderStored = parseJSON<string[]>(content[`${lk}_kc_order`], []);
  const kcIds = kcItems.map((k) => String(k.i));
  const kcOrderIds = [
    ...kcOrderStored.filter((id) => kcIds.includes(id)),
    ...kcIds.filter((id) => !kcOrderStored.includes(id)),
  ];
  const orderedKCItems = kcOrderIds
    .map((id) => kcItems.find((k) => String(k.i) === id))
    .filter((k): k is KCEntry => !!k);
  const moveKCItem = (kcIdx: number, dir: -1 | 1) => {
    const idx = kcOrderIds.indexOf(String(kcIdx));
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= kcOrderIds.length) return;
    const next = [...kcOrderIds];
    [next[idx], next[j]] = [next[j], next[idx]];
    updateContent(`${lk}_kc_order`, JSON.stringify(next));
  };

  // ── Resources ─────────────────────────────────────────────────────────────
  const defaultResCount = d?.resources?.length ?? 0;
  const resCount = parseInt(content[`${lk}_res_count`] ?? "", 10) || defaultResCount;
  type ResEntry = { i: number; defTitle: string; defUrl: string; defDesc: string };
  const resItems: ResEntry[] = [];
  for (let i = 0; i < resCount; i++) {
    if (content[`${lk}_res${i}_deleted`] === "1") continue;
    resItems.push({ i, defTitle: d?.resources?.[i]?.title ?? "", defUrl: d?.resources?.[i]?.url ?? "https://example.com", defDesc: d?.resources?.[i]?.description ?? "" });
  }
  const addResource = () => {
    const idx = resCount;
    updateContent(`${lk}_res_count`, String(idx + 1));
    updateContent(`${lk}_res${idx}_title`, "Resource Title");
    updateContent(`${lk}_res${idx}_url`, "https://example.com");
    updateContent(`${lk}_res${idx}_desc`, "Description of this resource.");
  };
  const deleteResource = (idx: number) => updateContent(`${lk}_res${idx}_deleted`, "1");

  // Resource display order
  const resOrderStored = parseJSON<string[]>(content[`${lk}_res_order`], []);
  const resIds = resItems.map((r) => String(r.i));
  const resOrderIds = [
    ...resOrderStored.filter((id) => resIds.includes(id)),
    ...resIds.filter((id) => !resOrderStored.includes(id)),
  ];
  const orderedResItems = resOrderIds
    .map((id) => resItems.find((r) => String(r.i) === id))
    .filter((r): r is ResEntry => !!r);
  const moveResource = (resIdx: number, dir: -1 | 1) => {
    const idx = resOrderIds.indexOf(String(resIdx));
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= resOrderIds.length) return;
    const next = [...resOrderIds];
    [next[idx], next[j]] = [next[j], next[idx]];
    updateContent(`${lk}_res_order`, JSON.stringify(next));
  };

  // ── "Coming Soon" gate — only draft-viewers (assistants/professors) pass ──
  const courseDeleted = content[`course_${courseId}_deleted`] === "1";
  if ((status !== "published" || courseDeleted) && !canViewDrafts) {
    return (
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-20 text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
          {status === "draft" ? "Not published" : "Coming soon"}
        </p>
        <h1 className="text-2xl font-extralight text-[var(--text)] mb-4">
          {content[`${lk}_title`] ?? staticLesson?.titleFallback ?? "Lesson"}
        </h1>
        <p className="text-sm text-[var(--text-muted)]">
          This lesson isn't available yet. Check back soon.
        </p>
        <Link href={`/courses/${courseSlug}`} className="inline-block mt-6 font-mono text-[11px] uppercase tracking-widest" style={{ color: "var(--accent-medium)" }}>
          ← Back to {courseTitle}
        </Link>
      </div>
    );
  }

  return (
    <EditScopeProvider scope={{ type: "lesson", courseId, lessonKey }}>
    <PreviewModeProvider value={previewMode}>
    <div className="max-w-2xl mx-auto px-6 md:px-10 py-10 md:py-14">

      {/* Breadcrumb + preview toggle */}
      <div className="flex items-center justify-between gap-3 mb-10">
        <nav className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] min-w-0" aria-label="Breadcrumb">
          <Link href="/curriculum" className="hover:text-[var(--text)] transition-colors">Curriculum</Link>
          <span className="opacity-30">/</span>
          <Link href={`/courses/${courseSlug}`} className="hover:text-[var(--text)] transition-colors truncate">{courseTitle}</Link>
          <span className="opacity-30">/</span>
          <span className="truncate" style={{ color: "var(--text)" }}>{content[`${lk}_title`] ?? staticLesson?.titleFallback}</span>
        </nav>
        {canEditHere && (
          <button
            onClick={() => setPreviewMode((v) => !v)}
            title={previewMode ? "Return to editing" : "Preview how readers see this page"}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)] transition-colors"
            style={previewMode
              ? { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" }
              : { color: "var(--text-muted)", border: "1px solid var(--border-strong)" }}
          >
            {previewMode ? <Pencil size={12} /> : <Eye size={12} />}
            {previewMode ? "Editing" : "Preview"}
          </button>
        )}
      </div>

      {/* Title + status badge */}
      <div className="flex items-start gap-3 mb-5">
        <h1 className="text-3xl font-extralight tracking-wide text-[var(--text)] leading-tight flex-1 capitalize">
          <Editable as="span" contentKey={`${lk}_title`} fallback={staticLesson?.titleFallback ?? "Untitled Lesson"} />
        </h1>
        <LessonStatusBadge lessonKey={lk} hasStaticContent={!!d} />
      </div>

      {/* Lesson URL (admin only) */}
      <LessonSlugRow
        lk={lk}
        courseId={courseId}
        courseSlug={courseSlug}
        urlSlug={slug}
        fallbackTitle={staticLesson?.titleFallback ?? "Lesson"}
      />

      {/* Introduction */}
      {canEdit ? (
        <Editable
          as="p"
          contentKey={`${lk}_intro`}
          fallback={d?.introduction ?? ""}
          className="leading-relaxed text-[15px] mb-12"
          style={{ color: "var(--text-muted)" }}
        />
      ) : (
        <p className="leading-relaxed text-[15px] mb-12" style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
          {renderInline(content[`${lk}_intro`] ?? (d?.introduction ?? ""))}
        </p>
      )}

      {/* ── Lesson Overview (hidden on projects; hidden for learners when empty) ── */}
      {!isProject && (outcomes.length > 0 || canManage) && (
        <div className="mb-12 px-5 pt-4 pb-5" style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)" }}>
          <SectionLabel label="Lesson Overview" />
          <ul className="flex flex-col gap-2.5">
            {outcomes.map(({ i, fallback }) => (
              <li key={i} className="group flex items-start gap-2 text-sm text-[var(--text-muted)]">
                <span className="shrink-0 mt-0.5" style={{ color: "var(--accent-medium)" }}>▸</span>
                <Editable as="span" contentKey={`${lk}_outcome_${i}`} fallback={fallback} className="flex-1" />
                {canManage && <RemoveBtn onClick={() => deleteOutcome(i)} title="Remove outcome" />}
              </li>
            ))}
          </ul>
          {canManage && <AddBtn label="Add Outcome" onClick={addOutcome} />}
        </div>
      )}

      {/* ── Table of contents ────────────────────────────── */}
      {orderedSections.length >= 2 && (
        <nav className="mb-12" aria-label="Lesson contents">
          <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-3 opacity-60">
            Contents
          </p>
          <ul className="flex flex-col gap-1.5">
            {orderedSections.map(({ i, def }, tocIdx) => (
              <li key={i} className="flex items-baseline gap-2.5">
                <span className="shrink-0 font-mono text-[9px] opacity-40" style={{ color: "var(--text-muted)" }}>
                  {String(tocIdx + 1).padStart(2, "0")}
                </span>
                <a
                  href={`#section-${i}`}
                  className="text-[13px] transition-colors hover:text-[var(--accent-medium)] capitalize"
                  style={{ color: "var(--text-muted)" }}
                >
                  {content[`${lk}_s${i}_heading`] ?? def?.heading ?? "New Section"}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {/* ── Main Sections ────────────────────────────────── */}
      <div className="flex flex-col gap-10 mb-14">
        {orderedSections.map(({ i, def, paraCount, blkCount }, secIdx) => {
          // Build extra blocks list
          const blocks: Block[] = [];
          for (let j = 0; j < blkCount; j++) {
            if (content[`${lk}_s${i}_blk${j}_deleted`] === "1") continue;
            const type = (content[`${lk}_s${i}_blk${j}_type`] ?? "text") as BlockType;
            blocks.push({ j, type });
          }

          // Unified item order: paragraphs and blocks share one movable stream,
          // so a quote/code block can sit anywhere between paragraphs.
          const paraIds: string[] = [];
          for (let j = 0; j < paraCount; j++) {
            if (content[`${lk}_s${i}_p${j}_deleted`] === "1") continue;
            paraIds.push(`p${j}`);
          }
          const allItemIds = [...paraIds, ...blocks.map((b) => `blk${b.j}`)];
          const itemOrderStored = parseJSON<string[]>(content[`${lk}_s${i}_item_order`], []);
          const itemOrder = [
            ...itemOrderStored.filter((id) => allItemIds.includes(id)),
            ...allItemIds.filter((id) => !itemOrderStored.includes(id)),
          ];
          const moveItem = (id: string, dir: -1 | 1) => {
            const idx = itemOrder.indexOf(id);
            const target = idx + dir;
            if (idx < 0 || target < 0 || target >= itemOrder.length) return;
            const next = [...itemOrder];
            [next[idx], next[target]] = [next[target], next[idx]];
            updateContent(`${lk}_s${i}_item_order`, JSON.stringify(next));
          };

          return (
            <section key={i} id={`section-${i}`} className="group relative" style={{ scrollMarginTop: "5rem" }}>
              {canManage && (
                <div className="absolute left-full top-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1">
                  <MoveBtns onMove={(dir) => moveSection(i, dir)} canUp={secIdx > 0} canDown={secIdx < orderedSections.length - 1} />
                  <RemoveBtn onClick={() => deleteSection(i)} title="Remove section" />
                </div>
              )}
              <h2 className="text-xl font-light text-[var(--text)] mb-4 tracking-tight capitalize">
                <Editable as="span" contentKey={`${lk}_s${i}_heading`} fallback={def?.heading ?? "New Section"} />
              </h2>
              <div className="flex flex-col gap-4">
                {itemOrder.map((itemId, itemIdx) => {
                  const canUp = itemIdx > 0;
                  const canDown = itemIdx < itemOrder.length - 1;

                  // Rich content block
                  if (itemId.startsWith("blk")) {
                    const j = parseInt(itemId.slice(3), 10);
                    const block = blocks.find((b) => b.j === j);
                    if (!block) return null;
                    return (
                      <BlockRenderer
                        key={itemId}
                        block={block}
                        lk={lk}
                        si={i}
                        canEdit={canEdit}
                        canManage={canManage}
                        onRemove={() => deleteBlock(i, block.j)}
                        onMove={(dir) => moveItem(itemId, dir)}
                        canMoveUp={canUp}
                        canMoveDown={canDown}
                      />
                    );
                  }

                  // Original paragraph
                  const j = parseInt(itemId.slice(1), 10);
                  const paraFallback = def?.paragraphs[j] ?? "";
                  return (
                    <div key={itemId} className="group/p relative">
                      {canManage && (
                        <div className="absolute left-full top-0 ml-1.5 opacity-0 group-hover/p:opacity-100 transition-opacity z-10 flex items-center gap-1">
                          <MoveBtns onMove={(dir) => moveItem(itemId, dir)} canUp={canUp} canDown={canDown} />
                          <RemoveBtn onClick={() => deleteParag(i, j)} title="Remove paragraph" />
                        </div>
                      )}
                      {canEdit ? (
                        <Editable
                          as="p"
                          contentKey={`${lk}_s${i}_p${j}`}
                          fallback={paraFallback}
                          className="leading-relaxed text-[15px]"
                          style={{ color: "var(--text-muted)" }}
                        />
                      ) : (
                        <p className="leading-relaxed text-[15px]" style={{ color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
                          {renderInline(content[`${lk}_s${i}_p${j}`] ?? paraFallback)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Existing note / quote */}
              {(def?.note || content[`${lk}_s${i}_note`]) && content[`${lk}_s${i}_note_deleted`] !== "1" && (
                <div className="group/note relative mt-5">
                  {canManage && (
                    <div className="absolute left-full top-0 ml-1.5 opacity-0 group-hover/note:opacity-100 transition-opacity z-10">
                      <RemoveBtn onClick={() => updateContent(`${lk}_s${i}_note_deleted`, "1")} title="Remove callout" />
                    </div>
                  )}
                  <div
                    className="px-4 py-3 text-[13px] leading-relaxed"
                    style={{ borderLeft: "3px solid var(--accent-medium)", background: "var(--surface)", color: "var(--text-muted)", borderRadius: "0 var(--radius-card) var(--radius-card) 0" }}
                  >
                    {canEdit ? (
                      <Editable as="span" contentKey={`${lk}_s${i}_note`} fallback={def?.note ?? ""} />
                    ) : (
                      <span style={{ whiteSpace: "pre-wrap" }}>{renderInline(content[`${lk}_s${i}_note`] ?? (def?.note ?? ""))}</span>
                    )}
                  </div>
                </div>
              )}

              {canManage && (
                <AddBlockMenu onAdd={(type) => addBlock(i, blkCount, type)} />
              )}
            </section>
          );
        })}
        {canManage && <AddBtn label="Add Section" onClick={addSection} />}
      </div>

      {/* ── Assignment ───────────────────────────────────── */}
      {isProject ? (
        /* Odin-style boxed assignment for projects */
        <div
          className="mb-14 px-6 pt-5 pb-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)" }}
        >
          <SectionLabel label="Assignment" />
          <Editable
            as="p"
            contentKey={`${lk}_assign_desc`}
            fallback={d?.assignment?.description ?? "Complete the following steps."}
            className="text-[14px] leading-relaxed mb-5"
            style={{ color: "var(--text)" }}
          />
          {orderedAssignItems.length > 0 ? (
            <ol className="flex flex-col gap-3">
              {orderedAssignItems.map(({ i, fallback }, pos) => (
                <li key={i} className="group flex items-start gap-3 text-[14px]">
                  <span className="shrink-0 font-mono text-[12px] mt-[2px] w-5 text-right" style={{ color: "var(--accent-medium)" }}>
                    {pos + 1}.
                  </span>
                  <Editable as="span" contentKey={`${lk}_assign_${i}`} fallback={fallback} className="flex-1 leading-relaxed" style={{ color: "var(--text-muted)" }} />
                  {canManage && (
                    <span className="flex items-center gap-0.5 shrink-0">
                      <MoveBtns onMove={(dir) => moveAssignItem(i, dir)} canUp={pos > 0} canDown={pos < orderedAssignItems.length - 1} />
                      <RemoveBtn onClick={() => deleteAssignItem(i)} title="Remove step" />
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
              No steps yet.
            </p>
          )}
          {canManage && <AddBtn label="Add Step" onClick={addAssignItem} />}
        </div>
      ) : (
        <div className="mb-14">
          <SectionLabel label="Assignment" />
          {assignItems.length > 0 ? (
            <>
              <Editable
                as="p"
                contentKey={`${lk}_assign_desc`}
                fallback={d?.assignment?.description ?? "Before moving on, complete the following tasks."}
                className="text-[14px] leading-relaxed mb-4"
                style={{ color: "var(--text-muted)" }}
              />
              <ul className="flex flex-col gap-3">
                {orderedAssignItems.map(({ i, fallback }, pos) => (
                  <li key={i} className="group flex items-start gap-3 text-[14px]">
                    <span className="shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent-medium)" }} />
                    <Editable as="span" contentKey={`${lk}_assign_${i}`} fallback={fallback} className="flex-1 leading-relaxed" style={{ color: "var(--text-muted)" }} />
                    {canManage && (
                      <span className="flex items-center gap-0.5 shrink-0">
                        <MoveBtns onMove={(dir) => moveAssignItem(i, dir)} canUp={pos > 0} canDown={pos < orderedAssignItems.length - 1} />
                        <RemoveBtn onClick={() => deleteAssignItem(i)} title="Remove task" />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
              There is no assignment for this lesson.
            </p>
          )}
          {canManage && <AddBtn label="Add Task" onClick={addAssignItem} />}
        </div>
      )}

      {/* ── Knowledge Check (not shown on projects) ──────── */}
      {!isProject && (
      <div className="mb-14">
        <SectionLabel label="Knowledge Check" />
        {orderedKCItems.length > 0 ? (
          <div className="flex flex-col gap-2">
            {orderedKCItems.map(({ i, defQ, defA }, displayIdx) => (
              <div key={i} className="group relative">
                {canManage && (
                  <div className="absolute left-full top-0 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1">
                    <MoveBtns onMove={(dir) => moveKCItem(i, dir)} canUp={displayIdx > 0} canDown={displayIdx < orderedKCItems.length - 1} />
                    <RemoveBtn onClick={() => deleteKCItem(i)} title="Remove question" />
                  </div>
                )}
                <details style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)", overflow: "hidden" }}>
                  <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none text-[13px] hover:bg-[var(--surface-raised)] transition-colors select-none" style={{ color: "var(--text)" }}>
                    <span className="shrink-0 font-mono text-[9px] opacity-40 w-5" style={{ color: "var(--text-muted)" }}>
                      {String(displayIdx + 1).padStart(2, "0")}
                    </span>
                    <Editable as="span" contentKey={`${lk}_kc${i}_q`} fallback={defQ} />
                  </summary>
                  <div className="px-4 py-3.5 text-[13px] leading-relaxed" style={{ borderTop: "1px solid var(--border-color)", background: "var(--surface)", color: "var(--text-muted)" }}>
                    <Editable as="span" contentKey={`${lk}_kc${i}_a`} fallback={defA} />
                  </div>
                </details>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            There is no knowledge check for this lesson.
          </p>
        )}
        {canManage && <AddBtn label="Add Question" onClick={addKCItem} />}
      </div>
      )}

      {/* ── Additional Resources (not shown on projects) ─── */}
      {!isProject && (
      <div className="mb-14">
        <SectionLabel label="Additional Resources" />
        {resItems.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {orderedResItems.map(({ i, defTitle, defUrl, defDesc }, resPos) => {
              const url = content[`${lk}_res${i}_url`] ?? defUrl;
              const isNew = i >= defaultResCount;
              return (
                <li key={i} className="group flex items-start gap-2.5 text-[13px]">
                  <span className="shrink-0 mt-0.5" style={{ color: "var(--accent-medium)" }}>→</span>
                  <div className="flex-1 min-w-0">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--accent-medium)" }}>
                      <Editable as="span" contentKey={`${lk}_res${i}_title`} fallback={defTitle} />
                    </a>
                    <span style={{ color: "var(--text-muted)" }}> — </span>
                    <Editable as="span" contentKey={`${lk}_res${i}_desc`} fallback={defDesc} style={{ color: "var(--text-muted)" }} />
                    {canEdit && isNew && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="font-mono text-[9px] uppercase tracking-widest opacity-40 shrink-0" style={{ color: "var(--text-muted)" }}>URL:</span>
                        <Editable as="span" contentKey={`${lk}_res${i}_url`} fallback={defUrl} className="font-mono text-[10px] truncate" style={{ color: "var(--text-muted)" }} />
                      </div>
                    )}
                  </div>
                  {canManage && (
                    <span className="flex items-center gap-0.5 shrink-0">
                      <MoveBtns onMove={(dir) => moveResource(i, dir)} canUp={resPos > 0} canDown={resPos < orderedResItems.length - 1} />
                      <RemoveBtn onClick={() => deleteResource(i)} title="Remove resource" />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
            There are no additional resources for this lesson.
          </p>
        )}
        {canManage && <AddBtn label="Add Resource" onClick={addResource} />}
      </div>
      )}

      {/* Edit access — admins and course-granted professors can grant this lesson
          to editors/assistants; the grant scope is the whole course. */}
      <EditAccessManager
        aclKey={lessonAclKey(lk)}
        title="Edit access — this lesson"
        hint="People listed here can work on this lesson (per their role). Admins — and professors granted this course — can add editors and assistants."
        grantScope={{ type: "course", courseId }}
      />

      {/* Author credits */}
      <AuthorCredits lk={lk} lastUpdated={lastUpdated} />

      {/* Mark complete */}
      {status === "published" && <MarkCompleteButton lessonKey={lk} />}

      {/* Prev / Next navigation */}
      <div className="flex items-start justify-between gap-4 pt-8" style={{ borderTop: "1px solid var(--border-color)" }}>
        {isAccessiblePrev ? (
          <Link href={`/courses/${courseSlug}/${prev!.slug}`} className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
            <ChevronLeft size={15} className="shrink-0" />
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 mb-0.5">Previous</div>
              <div>{content[`${prev!.lessonKey}_title`] ?? prev!.titleFallback}</div>
            </div>
          </Link>
        ) : <div />}
        {isAccessibleNext ? (
          <Link href={`/courses/${courseSlug}/${next!.slug}`} className="flex items-center gap-2 text-[13px] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors text-right">
            <div>
              <div className="font-mono text-[9px] uppercase tracking-widest opacity-50 mb-0.5">Next</div>
              <div>{content[`${next!.lessonKey}_title`] ?? next!.titleFallback}</div>
            </div>
            <ChevronRight size={15} className="shrink-0" />
          </Link>
        ) : <div />}
      </div>
    </div>
    </PreviewModeProvider>
    </EditScopeProvider>
  );
}
