"use client";

import { BookOpen, Hammer, Users } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Editable } from "@/components/editable-text";

export function HowItWorks() {
  const { theme } = useTheme();
  const filled = theme === "light";

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
            How It Works
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          <div className="flex flex-col gap-4">
            <BookOpen
              className="w-6 h-6 text-[var(--accent-medium)]"
              strokeWidth={filled ? 0 : 1.5}
              fill={filled ? "currentColor" : "none"}
            />
            <Editable
              contentKey="how_learn_title"
              fallback="Learn"
              as="h3"
              className="text-xl font-light text-[var(--text)]"
            />
            <Editable
              contentKey="how_learn_body"
              fallback="Follow a structured path through curated tutorials, video guides, and documentation — from file systems to fighter movesets."
              as="p"
              className="text-[var(--text-muted)] leading-relaxed text-sm"
            />
          </div>

          <div className="flex flex-col gap-4">
            <Hammer
              className="w-6 h-6 text-[var(--accent-medium)]"
              strokeWidth={filled ? 0 : 1.5}
              fill={filled ? "currentColor" : "none"}
            />
            <Editable
              contentKey="how_build_title"
              fallback="Build"
              as="h3"
              className="text-xl font-light text-[var(--text)]"
            />
            <Editable
              contentKey="how_build_body"
              fallback="Create real mods at every step. Texture swaps, custom stages, character edits — build your portfolio as you learn."
              as="p"
              className="text-[var(--text-muted)] leading-relaxed text-sm"
            />
          </div>

          <div className="flex flex-col gap-4">
            <Users
              className="w-6 h-6 text-[var(--accent-medium)]"
              strokeWidth={filled ? 0 : 1.5}
              fill={filled ? "currentColor" : "none"}
            />
            <Editable
              contentKey="how_connect_title"
              fallback="Connect"
              as="h3"
              className="text-xl font-light text-[var(--text)]"
            />
            <Editable
              contentKey="how_connect_body"
              fallback="Join a community of modders. Get help, share your work, and collaborate on projects."
              as="p"
              className="text-[var(--text-muted)] leading-relaxed text-sm"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
