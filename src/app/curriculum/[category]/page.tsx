"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";
import { useContentContext } from "@/components/content-provider";
import { useAuth } from "@/components/auth-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { CourseCard, RemoveWarning, courseIsVisible } from "@/components/course-card";
import { parseJSON } from "@/lib/courses/course-structure";
import { getCourseKeys, SEED_COURSE_IDS } from "@/lib/courses/course-utils";
import {
  buildCategories, getCategoryTitle, newCourseId,
  categoryTitleKey, categoryDescKey, categoryCoursesKey,
} from "@/lib/courses/categories";

export default function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category: categoryId } = use(params);
  const { content, updateContent, updateMany } = useContentContext();
  const { can, isAdmin } = usePermissions();
  const { profile } = useAuth();
  const canManageCourses = can("manage_courses");

  const courseIds: string[] = parseJSON(content["curriculum_course_ids"], SEED_COURSE_IDS);
  const liveCourseIds = canManageCourses
    ? courseIds
    : courseIds.filter((id) => content[`course_${id}_deleted`] !== "1");

  const categories = buildCategories(content, liveCourseIds);
  const category = categories.find((c) => c.id === categoryId);

  const [pendingRemove, setPendingRemove] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newCourseName, setNewCourseName] = useState("");

  if (!category) return notFound();

  // The stored order, which is what edits are applied to. buildCategories may
  // have appended uncategorised courses on top of it, so writes start from the
  // list actually on screen to keep those in place once anything is moved.
  const order = category.courseIds;

  const saveOrder = (next: string[]) =>
    updateContent(categoryCoursesKey(categoryId), JSON.stringify(next));

  const move = (courseId: string, dir: -1 | 1) => {
    const i = order.indexOf(courseId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    saveOrder(next);
  };

  const moveToCategory = (courseId: string, targetId: string) => {
    if (targetId === categoryId) return;
    const target = categories.find((c) => c.id === targetId);
    if (!target) return;
    // Add to the target first, so a failed second write duplicates the course
    // rather than dropping it out of every category.
    updateContent(categoryCoursesKey(targetId), JSON.stringify([...target.courseIds, courseId]));
    saveOrder(order.filter((id) => id !== courseId));
  };

  const addCourse = () => {
    const name = newCourseName.trim() || "New Course";
    const { courseId: cId, slugSuffix } = newCourseId();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || `course-${slugSuffix}`;

    const slugMap: Record<string, string> = parseJSON(content["curriculum_slug_map"], {});

    // One request: a course is only half a course if some of these land and
    // the rest don't. The last entry files it into this category, last place.
    updateMany([
      ["curriculum_course_ids", JSON.stringify([...courseIds, cId])],
      [getCourseKeys(cId).titleKey, name],
      [getCourseKeys(cId).levelKey, "Beginner"],
      [getCourseKeys(cId).descKey, "Description of this course."],
      [`course_${cId}_slug`, slug],
      [`course_${cId}_status`, "soon"],
      ["curriculum_slug_map", JSON.stringify({ ...slugMap, [slug]: cId })],
      [categoryCoursesKey(categoryId), JSON.stringify([...order, cId])],
    ]);

    setNewCourseName("");
    setAdding(false);
  };

  const handleRemoveConfirm = () => {
    if (!pendingRemove) return;
    updateContent(`course_${pendingRemove}_deleted`, "1");
    setPendingRemove(null);
  };

  const pendingCourseName = pendingRemove
    ? (content[getCourseKeys(pendingRemove).titleKey] ?? "this course")
    : "";

  const visible = order.filter((id) =>
    courseIsVisible(id, content, profile?.username, isAdmin, canManageCourses)
  );

  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <Link
            href="/curriculum"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-colors mb-6"
          >
            <ChevronLeft size={12} /> Curriculum
          </Link>

          <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-4">
            <Editable
              as="span"
              contentKey={categoryTitleKey(categoryId)}
              fallback={getCategoryTitle(content, categoryId)}
            />
          </h1>
          <Editable
            as="p"
            contentKey={categoryDescKey(categoryId)}
            fallback="The recommended order to work through these courses."
            className="text-[var(--text-muted)] leading-relaxed mb-12"
          />

          {visible.length === 0 && !canManageCourses ? (
            <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
              No courses in this path yet. Check back soon.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {order.map((courseId, i) => (
                <CourseRow
                  key={courseId}
                  courseId={courseId}
                  step={visible.indexOf(courseId) + 1}
                  canManage={canManageCourses}
                  canMoveUp={i > 0}
                  canMoveDown={i < order.length - 1}
                  onMove={(dir) => move(courseId, dir)}
                  onRemove={() => setPendingRemove(courseId)}
                  categories={categories.map((c) => ({ id: c.id, title: c.title }))}
                  categoryId={categoryId}
                  onMoveToCategory={(target) => moveToCategory(courseId, target)}
                />
              ))}

              {canManageCourses && (
                adding ? (
                  <div
                    className="p-5 flex items-center gap-2"
                    style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)" }}
                  >
                    <input
                      autoFocus
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addCourse();
                        if (e.key === "Escape") { setAdding(false); setNewCourseName(""); }
                      }}
                      placeholder="Course name"
                      className="flex-1 px-3 py-2 text-sm font-mono bg-transparent outline-none"
                      style={{ border: "1px solid var(--border-strong)", borderRadius: "var(--radius-button)", color: "var(--text)" }}
                    />
                    <button
                      onClick={addCourse}
                      className="px-4 py-2 text-[11px] font-mono uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]"
                      style={{ background: "var(--accent)", color: "#fff" }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => { setAdding(false); setNewCourseName(""); }}
                      className="px-3 py-2 text-[11px] font-mono uppercase tracking-widest cursor-pointer"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAdding(true)}
                    className="flex items-center justify-center gap-2 px-4 py-4 font-mono text-[10px] uppercase tracking-widest cursor-pointer transition-colors"
                    style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)", color: "var(--text-muted)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; e.currentTarget.style.borderColor = "var(--accent-medium)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
                  >
                    <Plus size={11} /> Add Course to {getCategoryTitle(content, categoryId)}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {pendingRemove && (
        <RemoveWarning
          courseName={pendingCourseName}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setPendingRemove(null)}
        />
      )}
    </>
  );
}

function CourseRow({
  courseId, step, canManage, canMoveUp, canMoveDown, onMove, onRemove,
  categories, categoryId, onMoveToCategory,
}: {
  courseId: string;
  step: number;
  canManage: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  categories: { id: string; title: string }[];
  categoryId: string;
  onMoveToCategory: (target: string) => void;
}) {
  const card = <CourseCard courseId={courseId} onRemove={onRemove} />;
  // CourseCard hides itself for drafts and removals the viewer can't see; when
  // it does, the whole row including its step number should go with it.
  if (!card) return null;

  return (
    <div className="flex items-stretch gap-3">
      {step > 0 && (
        <div className="shrink-0 w-6 pt-6 text-right">
          <span className="font-mono text-[11px]" style={{ color: "var(--accent-medium)" }}>
            {step}
          </span>
        </div>
      )}
      <div className="flex-1 min-w-0">{card}</div>

      {canManage && (
        <div className="flex flex-col justify-center gap-1 shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={!canMoveUp}
            title="Move earlier in the path"
            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            <ChevronUp size={10} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={!canMoveDown}
            title="Move later in the path"
            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            <ChevronDown size={10} />
          </button>
          {categories.length > 1 && (
            <div className="relative inline-flex items-center">
              <select
                value={categoryId}
                onChange={(e) => { if (e.target.value !== categoryId) onMoveToCategory(e.target.value); }}
                title="Move this course to another category"
                className="appearance-none font-mono text-[9px] uppercase tracking-widest w-5 h-5 rounded cursor-pointer bg-transparent outline-none text-center"
                style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
