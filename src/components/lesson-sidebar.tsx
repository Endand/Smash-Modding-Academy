"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronDown, BookOpen, Wrench, Check } from "lucide-react";
import { useContentContext } from "@/components/content-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { useProgress } from "@/components/progress-provider";
import { useCourseStructure, getEffectiveStatus } from "@/hooks/use-course-structure";
import { getCourseKeys, getCourseSlug, PROJECT_ICONS } from "@/lib/courses/course-utils";

interface SidebarProps {
  currentSlug: string;
  courseId?: string;
}

export function LessonSidebar({ currentSlug, courseId = "foundations" }: SidebarProps) {
  const { content } = useContentContext();
  const { can } = usePermissions();
  const canPublish = can("manage_lessons");
  const { completed } = useProgress();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { sections } = useCourseStructure(courseId);
  const courseSlug = getCourseSlug(courseId, content);
  const courseTitle = content[getCourseKeys(courseId).titleKey] ?? "Course";

  const sidebarContent = (
    <div className="py-4">
      <Link
        href={`/courses/${courseSlug}`}
        className="flex items-center gap-1.5 px-4 pb-4 font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        style={{ borderBottom: "1px solid var(--border-color)" }}
        onClick={() => setMobileOpen(false)}
      >
        <ChevronLeft size={12} />
        {courseTitle}
      </Link>

      <div className="pt-4 flex flex-col gap-5">
        {sections.map((section) => {
          const sectionTitle = content[`${section.sectionKey}_title`] ?? section.titleFallback;
          return (
            <div key={section.sectionKey}>
              <p className="px-4 pb-2 font-mono text-[9px] uppercase tracking-widest text-[var(--text-muted)] opacity-40">
                {sectionTitle}
              </p>
              {section.lessons.map((lesson) => {
                const title = content[`${lesson.lessonKey}_title`] ?? lesson.titleFallback;
                const iconName = content[`${lesson.lessonKey}_icon`] ?? lesson.iconFallback;
                const isProject = PROJECT_ICONS.has(iconName);
                const isActive = lesson.slug === currentSlug;
                const status = getEffectiveStatus(lesson.lessonKey, lesson.hasStaticContent, content);
                const isAccessible = status === "published" || canPublish;
                const isComplete = completed.has(lesson.lessonKey);

                // Hide drafts from non-editors
                if (status === "draft" && !canPublish) return null;

                const row = (
                  <div
                    className={`flex items-center gap-2.5 py-1.5 pr-4 text-xs transition-colors ${
                      !isActive && isAccessible ? "hover:bg-[var(--surface-raised)]" : ""
                    } ${!isAccessible ? "opacity-35" : ""}`}
                    style={{
                      paddingLeft: "14px",
                      borderLeft: isActive
                        ? "2px solid var(--accent-medium)"
                        : "2px solid transparent",
                      background: isActive ? "var(--surface-raised)" : undefined,
                      color: isActive ? "var(--text)" : "var(--text-muted)",
                    }}
                  >
                    <span className="shrink-0" style={{ color: isProject ? "var(--accent-medium)" : "inherit" }}>
                      {isProject ? <Wrench size={11} strokeWidth={1.5} /> : <BookOpen size={11} strokeWidth={1.5} />}
                    </span>
                    <span className="leading-snug flex-1">{title}</span>
                    {isComplete && (
                      <Check size={11} strokeWidth={2.5} className="shrink-0" style={{ color: "var(--accent-medium)" }} aria-label="Completed" />
                    )}
                    {status === "draft" && canPublish && (
                      <span className="font-mono text-[8px] uppercase opacity-40" style={{ color: "var(--text-muted)" }}>
                        Draft
                      </span>
                    )}
                  </div>
                );

                return isAccessible ? (
                  <Link
                    key={lesson.lessonKey}
                    href={`/courses/${courseSlug}/${lesson.slug}`}
                    className="block"
                    onClick={() => setMobileOpen(false)}
                  >
                    {row}
                  </Link>
                ) : (
                  <div key={lesson.lessonKey}>{row}</div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle bar */}
      <div
        className="md:hidden sticky top-14 z-40 flex items-center justify-between px-5 py-2.5 cursor-pointer select-none"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border-color)" }}
        onClick={() => setMobileOpen((v) => !v)}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          Course Contents
        </span>
        <ChevronDown
          size={13}
          className="text-[var(--text-muted)] transition-transform duration-200"
          style={{ transform: mobileOpen ? "rotate(180deg)" : undefined }}
        />
      </div>

      {/* Mobile expanded panel */}
      {mobileOpen && (
        <div className="md:hidden" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border-color)" }}>
          {sidebarContent}
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:block w-[260px] shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto"
        style={{ borderRight: "1px solid var(--border-color)" }}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
