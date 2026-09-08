"use client";

import { useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { ArrowRight, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { Editable } from "@/components/editable-text";
import { useContentContext } from "@/components/content-provider";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/components/auth-provider";
import { RemoveBtn } from "@/components/lesson-content";
import { CourseCard, RemoveWarning, courseIsVisible } from "@/components/course-card";
import { parseJSON } from "@/lib/courses/course-structure";
import { getCourseKeys, SEED_COURSE_IDS } from "@/lib/courses/course-utils";
import {
  buildCategories, getFeaturedCourseId, getCategoryIds, newCategoryId,
  categoryTitleKey, categoryDescKey, categoryCoursesKey,
  type LiveCategory,
} from "@/lib/courses/categories";

export default function CurriculumPage() {
  const { content, updateContent } = useContentContext();
  const { can, isAdmin } = usePermissions();
  const { profile } = useAuth();
  const canManageCourses = can("manage_courses");

  const courseIds: string[] = parseJSON(content["curriculum_course_ids"], SEED_COURSE_IDS);
  const liveCourseIds = canManageCourses
    ? courseIds
    : courseIds.filter((id) => content[`course_${id}_deleted`] !== "1");

  const featuredId = getFeaturedCourseId(content);
  const categories = buildCategories(content, liveCourseIds);
  const visibleCount = (ids: string[]) =>
    ids.filter((id) => courseIsVisible(id, content, profile?.username, isAdmin, canManageCourses)).length;

  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  const moveCategory = (id: string, dir: -1 | 1) => {
    const ids = getCategoryIds(content);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    updateContent("curriculum_category_ids", JSON.stringify(next));
  };

  const addCategory = () => {
    const name = newCategoryName.trim() || "New Category";
    // The id doubles as the URL, so it is derived once and then left alone;
    // renaming the category later never breaks a shared link.
    const existing = getCategoryIds(content);
    const id = newCategoryId(name, existing);

    updateContent("curriculum_category_ids", JSON.stringify([...existing, id]));
    updateContent(categoryTitleKey(id), name);
    updateContent(categoryCoursesKey(id), "[]");
    setNewCategoryName("");
    setAddingCategory(false);
  };

  const removeCategory = (id: string) => {
    // Courses in it are not touched: buildCategories sweeps them into the
    // fallback category so nothing becomes unreachable.
    updateContent(`category_${id}_deleted`, "1");
  };

  const handleRemoveConfirm = () => {
    if (!pendingRemove) return;
    updateContent(`course_${pendingRemove}_deleted`, "1");
    setPendingRemove(null);
  };

  const pendingCourseName = pendingRemove
    ? (content[getCourseKeys(pendingRemove).titleKey] ?? "this course")
    : "";

  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="mb-12">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-3">Paths</p>
            <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-4">Curriculum</h1>
            <Editable
              contentKey="curriculum_subtitle"
              fallback="A structured path through Smash Ultimate modding, from your first texture swap to publishing finished mods."
              as="p"
              className="text-[var(--text-muted)] leading-relaxed"
            />
          </div>

          {/* Start here */}
          <div className="mb-14">
            <p className="font-mono text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--accent-medium)" }}>
              Start here
            </p>
            <CourseCard courseId={featuredId} onRemove={() => setPendingRemove(featuredId)} />
          </div>

          {/* Branches */}
          <div className="flex items-center gap-3 mb-5">
            <p className="font-mono text-[10px] uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
              Then choose a path
            </p>
            <div className="flex-1 h-px" style={{ background: "var(--border-color)" }} />
          </div>

          <div className="flex flex-col gap-3">
            {categories.map((cat, i) => (
              <CategoryCard
                key={cat.id}
                category={cat}
                canManage={canManageCourses}
                canMoveUp={i > 0}
                canMoveDown={i < categories.length - 1}
                onMove={(dir) => moveCategory(cat.id, dir)}
                onRemove={() => removeCategory(cat.id)}
                count={visibleCount(cat.courseIds)}
              />
            ))}

            {canManageCourses && (
              addingCategory ? (
                <div
                  className="p-5 flex items-center gap-2"
                  style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)" }}
                >
                  <input
                    autoFocus
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addCategory();
                      if (e.key === "Escape") { setAddingCategory(false); setNewCategoryName(""); }
                    }}
                    placeholder="Category name"
                    className="flex-1 px-3 py-2 text-sm font-mono bg-transparent outline-none"
                    style={{ border: "1px solid var(--border-strong)", borderRadius: "var(--radius-button)", color: "var(--text)" }}
                  />
                  <button
                    onClick={addCategory}
                    className="px-4 py-2 text-[11px] font-mono uppercase tracking-widest cursor-pointer rounded-[var(--radius-button)]"
                    style={{ background: "var(--accent)", color: "#fff" }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingCategory(false); setNewCategoryName(""); }}
                    className="px-3 py-2 text-[11px] font-mono uppercase tracking-widest cursor-pointer"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingCategory(true)}
                  className="flex items-center justify-center gap-2 px-4 py-4 font-mono text-[10px] uppercase tracking-widest cursor-pointer transition-colors"
                  style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-card)", color: "var(--text-muted)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent-medium)"; e.currentTarget.style.borderColor = "var(--accent-medium)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
                >
                  <Plus size={11} /> Add Category
                </button>
              )
            )}
          </div>
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

function CategoryCard({
  category, count, canManage, canMoveUp, canMoveDown, onMove, onRemove,
}: {
  category: LiveCategory;
  count: number;
  canManage: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-stretch gap-2">
      <Link href={`/curriculum/${category.id}`} className="block group flex-1 min-w-0">
        <div
          className="p-6 flex items-start justify-between gap-4 transition-all group-hover:border-[var(--accent-medium)]"
          style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-card)" }}
        >
          <div className="flex-1 min-w-0">
            <Editable
              contentKey={categoryTitleKey(category.id)}
              fallback={category.title}
              as="h2"
              className="text-lg font-extralight text-[var(--text)] mb-2"
            />
            <Editable
              contentKey={categoryDescKey(category.id)}
              fallback="The recommended order to work through these courses."
              as="p"
              className="text-sm text-[var(--text-muted)]"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-[9px] uppercase tracking-widest opacity-50" style={{ color: "var(--text-muted)" }}>
              {count} course{count === 1 ? "" : "s"}
            </span>
            <ArrowRight size={16} strokeWidth={1.5} className="transition-opacity opacity-30 group-hover:opacity-70" style={{ color: "var(--text)" }} />
          </div>
        </div>
      </Link>

      {/* Reorder and remove sit outside the link, so their clicks can't navigate */}
      {canManage && (
        <div className="flex flex-col justify-center gap-1 shrink-0">
          <button
            onClick={() => onMove(-1)}
            disabled={!canMoveUp}
            title="Move category up"
            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            <ChevronUp size={10} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={!canMoveDown}
            title="Move category down"
            className="w-5 h-5 rounded flex items-center justify-center cursor-pointer disabled:opacity-20 disabled:cursor-default"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-muted)" }}
          >
            <ChevronDown size={10} />
          </button>
          <RemoveBtn onClick={onRemove} title="Remove category" size="w-5 h-5" vis="" />
        </div>
      )}
    </div>
  );
}
