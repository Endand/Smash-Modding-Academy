"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen, Book, FileText, Pencil,
  Hammer, Wrench, Settings, Code, Code2,
  Layers, Package, Image, Palette,
  Zap, Star, Trophy, Target,
  Gamepad2, Cpu, Swords,
  Download, Play, Lightbulb, Flame,
  Users, Globe,
  type LucideProps,
} from "lucide-react";
import { useAuth } from "./auth-provider";
import { useContentContext } from "./content-provider";

type LucideIcon = React.ComponentType<LucideProps>;

export const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Book,
  FileText,
  Pencil,
  Hammer,
  Wrench,
  Settings,
  Code,
  Code2,
  Layers,
  Package,
  Image,
  Palette,
  Zap,
  Star,
  Trophy,
  Target,
  Gamepad2,
  Cpu,
  Swords,
  Download,
  Play,
  Lightbulb,
  Flame,
  Users,
  Globe,
};

interface EditableIconProps {
  contentKey: string;
  fallback: string;
  size?: number;
  className?: string;
  strokeWidth?: number;
  fill?: string;
}

export function EditableIcon({
  contentKey,
  fallback,
  size = 16,
  className,
  strokeWidth = 1.5,
  fill = "none",
}: EditableIconProps) {
  const { profile } = useAuth();
  const { content, updateContent } = useContentContext();
  const isAdmin = !!profile?.is_admin;
  const iconName = content[contentKey] ?? fallback;
  const Icon = ICONS[iconName] ?? ICONS[fallback] ?? BookOpen;

  if (!isAdmin) {
    return <Icon size={size} className={className} strokeWidth={strokeWidth} fill={fill} />;
  }

  return (
    <AdminIconPicker
      iconName={iconName}
      size={size}
      className={className}
      strokeWidth={strokeWidth}
      fill={fill}
      onSelect={(name) => updateContent(contentKey, name)}
    />
  );
}

function AdminIconPicker({
  iconName,
  size,
  className,
  strokeWidth,
  fill,
  onSelect,
}: {
  iconName: string;
  size: number;
  className?: string;
  strokeWidth: number;
  fill: string;
  onSelect: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const Icon = ICONS[iconName] ?? BookOpen;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen((v) => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        data-admin-field=""
        onClick={handleClick}
        title="Click to change icon"
        style={{ display: "inline-flex", cursor: "pointer", background: "none", border: "none", padding: 0, color: "inherit" }}
      >
        <Icon size={size} className={className} strokeWidth={strokeWidth} fill={fill} />
      </button>
      {open &&
        createPortal(
          <div
            ref={pickerRef}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              zIndex: 9999,
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-card)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
              padding: "8px",
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: "3px",
              width: "208px",
            }}
          >
            {Object.entries(ICONS).map(([name, IconComp]) => {
              const selected = name === iconName;
              return (
                <IconCell
                  key={name}
                  name={name}
                  IconComp={IconComp}
                  selected={selected}
                  onSelect={() => {
                    onSelect(name);
                    setOpen(false);
                  }}
                />
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

function IconCell({
  name,
  IconComp,
  selected,
  onSelect,
}: {
  name: string;
  IconComp: LucideIcon;
  selected: boolean;
  onSelect: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      title={name}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "8px 4px",
        background: selected
          ? "rgba(90,172,167,0.18)"
          : hovered
          ? "var(--surface-raised)"
          : "transparent",
        border: selected ? "1px solid var(--accent-medium)" : "1px solid transparent",
        borderRadius: "4px",
        cursor: "pointer",
        color: selected ? "var(--accent-medium)" : hovered ? "var(--text)" : "var(--text-muted)",
        transition: "background 0.1s, color 0.1s",
      }}
    >
      <IconComp size={15} strokeWidth={1.5} />
    </button>
  );
}
