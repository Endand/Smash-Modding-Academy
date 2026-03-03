"use client";

import { Wrench, Swords } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

const courses = [
  {
    icon: Wrench,
    title: "Foundations",
    description:
      "Getting started with modding tools, file systems, backups, and the modding ecosystem.",
  },
  {
    icon: Swords,
    title: "Character Modding",
    description:
      "Hitboxes, movesets, animations, and building custom fighters from scratch.",
  },
];

export function CurriculumPreview() {
  const { theme } = useTheme();
  const filled = theme === "light";

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-16 flex flex-col gap-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)]">
            Curriculum
          </span>
          <h2 className="text-3xl font-light text-[var(--text)]">
            What you&apos;ll learn
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => {
            const Icon = course.icon;
            const spanClass = "";
            return (
              <div
                key={course.title}
                className={`p-6 rounded-[var(--radius-card)] bg-[var(--surface)] border border-[var(--border-color)] flex flex-col gap-4 ${spanClass}`}
                style={{
                  boxShadow: theme === "light" ? "0 4px 16px rgba(45,41,38,0.08)" : "none",
                  borderColor: theme === "light" ? "transparent" : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <Icon
                    className="w-5 h-5 text-[var(--accent-medium)]"
                    strokeWidth={filled ? 0 : 1.5}
                    fill={filled ? "currentColor" : "none"}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] px-2 py-0.5 rounded-[var(--radius-tag)] border border-[var(--border-color)]">
                    Coming Soon
                  </span>
                </div>
                <h3 className="text-lg font-light text-[var(--text)]">
                  {course.title}
                </h3>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                  {course.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
