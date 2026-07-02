"use client";

import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ArrowRight } from "lucide-react";
import { Editable } from "@/components/editable-text";

const COURSES = [
  {
    titleKey: "curriculum_course_0_title",
    titleFallback: "Foundations",
    slug: "foundations",
    levelKey: "curriculum_course_0_level",
    levelFallback: "Beginner",
    descKey: "curriculum_course_0_desc",
    descFallback: "Tools setup, file structure, skin modding, and publishing your first mod.",
    stats: "17 lessons · 2 projects",
    available: true,
  },
  {
    titleKey: "curriculum_course_1_title",
    titleFallback: "Character Modding",
    slug: "character-modding",
    levelKey: "curriculum_course_1_level",
    levelFallback: "Intermediate",
    descKey: "curriculum_course_1_desc",
    descFallback: "Hitboxes, movesets, animations, and building custom fighters from scratch.",
    stats: "Coming soon",
    available: false,
  },
];

export default function CurriculumPage() {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="mb-12">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-3">
              Paths
            </p>
            <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-4">
              Curriculum
            </h1>
            <Editable
              contentKey="curriculum_subtitle"
              fallback="A structured path through Smash Ultimate modding — from your first texture swap to publishing finished mods."
              as="p"
              className="text-[var(--text-muted)] leading-relaxed"
            />
          </div>

          <div className="flex flex-col gap-3">
            {COURSES.map((course) =>
              course.available ? (
                <Link key={course.titleKey} href={`/courses/${course.slug}`} className="block group">
                  <div
                    className="p-6 flex items-start justify-between gap-4 transition-colors group-hover:border-[var(--accent-medium)]"
                    style={{
                      backgroundColor: "var(--surface)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "var(--radius-card)",
                    }}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Editable
                          contentKey={course.titleKey}
                          fallback={course.titleFallback}
                          as="h2"
                          className="text-lg font-extralight text-[var(--text)]"
                        />
                        <Editable
                          contentKey={course.levelKey}
                          fallback={course.levelFallback}
                          as="span"
                          className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)]"
                          style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}
                        />
                      </div>
                      <Editable
                        contentKey={course.descKey}
                        fallback={course.descFallback}
                        as="p"
                        className="text-sm text-[var(--text-muted)]"
                      />
                      <p
                        className="font-mono text-[10px] mt-3"
                        style={{ color: "var(--text-muted)", opacity: 0.6 }}
                      >
                        {course.stats}
                      </p>
                    </div>
                    <ArrowRight
                      size={16}
                      strokeWidth={1.5}
                      className="mt-1 flex-shrink-0 transition-opacity opacity-30 group-hover:opacity-70"
                      style={{ color: "var(--text)" }}
                    />
                  </div>
                </Link>
              ) : (
                <div
                  key={course.titleKey}
                  className="p-6 flex items-start justify-between gap-4 opacity-50"
                  style={{
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-card)",
                  }}
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Editable
                        contentKey={course.titleKey}
                        fallback={course.titleFallback}
                        as="h2"
                        className="text-lg font-extralight text-[var(--text)]"
                      />
                      <Editable
                        contentKey={course.levelKey}
                        fallback={course.levelFallback}
                        as="span"
                        className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)]"
                        style={{ color: "var(--text-muted)", border: "1px solid var(--border-color)" }}
                      />
                    </div>
                    <Editable
                      contentKey={course.descKey}
                      fallback={course.descFallback}
                      as="p"
                      className="text-sm text-[var(--text-muted)]"
                    />
                    <p
                      className="font-mono text-[10px] mt-3"
                      style={{ color: "var(--text-muted)", opacity: 0.6 }}
                    >
                      {course.stats}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
