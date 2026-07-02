"use client";

import { createElement, useRef, useEffect, useCallback } from "react";
import { useAuth } from "./auth-provider";
import { useContentContext } from "./content-provider";

interface EditableProps {
  contentKey: string;
  fallback: string;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
}

export function Editable({ contentKey, fallback, as = "span", className, style }: EditableProps) {
  const { profile } = useAuth();
  const { content, updateContent } = useContentContext();
  const isAdmin = !!profile?.is_admin;
  const value = content[contentKey] ?? fallback;

  if (!isAdmin) {
    return createElement(as, { className, style }, value);
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
      ref.current.textContent = value;
      saved.current = value;
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    isEditing.current = false;
    const next = ref.current?.textContent?.trim() ?? "";
    if (!next) {
      if (ref.current) ref.current.textContent = saved.current;
      return;
    }
    if (next !== saved.current) {
      saved.current = next;
      onSave(next);
    }
  }, [onSave]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
    if (e.key === "Escape") {
      const el = e.currentTarget as HTMLElement;
      el.textContent = saved.current;
      el.blur();
    }
  }, []);

  return createElement(tag, {
    ref: (el: HTMLElement | null) => { ref.current = el; },
    "data-admin-field": "",
    className,
    style,
    contentEditable: true,
    suppressContentEditableWarning: true,
    spellCheck: false,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onFocus: () => { isEditing.current = true; },
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    children: value,
  });
}
