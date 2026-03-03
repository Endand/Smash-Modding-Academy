"use client";

import Link from "next/link";
import { CanvasBackdrop } from "@/components/canvas-backdrop";

export function Hero() {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      <CanvasBackdrop />
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        <h1
          className="font-extralight text-[var(--text)] leading-[1.1] mb-6"
          style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
        >
          Your Journey Into Smash Modding Starts Here
        </h1>
        <p
          className="text-[var(--text-muted)] leading-relaxed mb-10 max-w-2xl mx-auto"
          style={{ fontSize: "clamp(1rem, 1.5vw, 1.125rem)" }}
        >
          A free, structured curriculum for learning Super Smash Bros. Ultimate
          character modding — from setting up your tools to building custom
          fighters from scratch.
        </p>
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
