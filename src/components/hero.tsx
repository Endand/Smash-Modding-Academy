"use client";

import Link from "next/link";
import { CanvasBackdrop } from "@/components/canvas-backdrop";
import { Editable } from "@/components/editable-text";

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      <CanvasBackdrop />
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <Editable
          contentKey="hero_title"
          fallback="Your Journey Into Smash Modding Starts Here"
          as="h1"
          className="font-extralight text-[var(--text)] leading-[1.1] mb-6"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        />
        <Editable
          contentKey="hero_subtitle"
          fallback="A free, structured curriculum for learning Super Smash Bros. Ultimate character modding — from setting up your tools to building custom fighters from scratch."
          as="p"
          className="text-[var(--text-muted)] leading-relaxed mb-10 max-w-2xl mx-auto"
          style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)" }}
        />
        <Link
          href="/curriculum"
          className="inline-block font-mono text-[11px] uppercase tracking-widest px-8 py-3 rounded-[var(--radius-button)] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
        >
          View Curriculum
        </Link>
      </div>
    </section>
  );
}
