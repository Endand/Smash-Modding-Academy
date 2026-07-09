"use client";

import { createElement, useRef, useEffect, useCallback } from "react";
import { useContentContext } from "./content-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { renderInline } from "@/lib/inline-markdown";

interface EditableProps {
  contentKey: string;
  fallback: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

export function Editable({ contentKey, fallback, as = "span", className, style }: EditableProps) {
  const { can } = usePermissions();
  const { content, updateContent } = useContentContext();
  const value = content[contentKey] ?? fallback;

  if (!can("edit_content")) {
    return createElement(as, { className, style: { whiteSpace: "pre-wrap", ...style } }, ...renderInline(value));
  }

  return (
    <AdminField
      tag={as}
      value={value}
      className={className}
      style={style}
      onSave={(v) => updateContent(contentKey, v)}
    />
  );
}

interface AdminFieldProps {
  tag: keyof React.JSX.IntrinsicElements;
  value: string;
  className?: string;
  style?: React.CSSProperties;
  onSave: (value: string) => void;
}

function AdminField({ tag, value, className, style, onSave }: AdminFieldProps) {
  const ref = useRef<HTMLElement | null>(null);
  const isEditing = useRef(false);
  const saved = useRef(value);

  // Sync real-time updates from other sessions while not actively typing
  useEffect(() => {
    if (ref.current && !isEditing.current && saved.current !== value) {
      ref.current.innerText = value;
      saved.current = value;
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    isEditing.current = false;
    // innerText (not textContent) so Shift+Enter line breaks survive as \n
    const next = ref.current?.innerText?.replace(/\n+$/, "").trim() ?? "";
    if (!next) {
      if (ref.current) ref.current.innerText = saved.current;
      return;
    }
    if (next !== saved.current) {
      saved.current = next;
      onSave(next);
    }
  }, [onSave]);

  // Wrap the current selection (or caret) in a markdown marker, saved as text
  // so bold/italic/underline persist instead of being lost on blur.
  const wrapSelection = useCallback((marker: string) => {
    const sel = window.getSelection();
    const selected = sel ? sel.toString() : "";
    document.execCommand("insertText", false, `${marker}${selected}${marker}`);
    if (!selected && sel && sel.focusNode) {
      // put the caret between the two markers
      try {
        const range = document.createRange();
        range.setStart(sel.focusNode, Math.max(0, sel.focusOffset - marker.length));
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch { /* selection moved — ignore */ }
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
      return;
    }
    if (e.key === "Escape") {
      const el = e.currentTarget as HTMLElement;
      el.innerText = saved.current;
      el.blur();
      return;
    }
    // Ctrl/Cmd + B / I / U → insert markdown markers (persist on save)
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey) {
      const k = e.key.toLowerCase();
      const marker = k === "b" ? "**" : k === "i" ? "*" : k === "u" ? "__" : null;
      if (marker) {
        e.preventDefault();
        wrapSelection(marker);
      }
    }
  }, [wrapSelection]);

  return createElement(tag, {
    ref: (el: HTMLElement | null) => { ref.current = el; },
    "data-admin-field": "",
    className,
    style: { whiteSpace: "pre-wrap", ...style },
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: false,
    onClick: (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); },
    onFocus: () => { isEditing.current = true; },
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    children: value,
  });
}
