import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaticLessonKey, getStaticLesson } from "@/lib/courses/foundations-data";
import { LessonSidebar } from "@/components/lesson-sidebar";
import { LessonContent } from "@/components/lesson-content";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const SEED_SLUG_MAP: Record<string, string> = {
  "character-modding": "character-modding",
};

interface Props {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}

async function resolveLesson(
  courseSlug: string,
  lessonSlug: string
): Promise<{ courseId: string; lessonKey: string } | null> {
  const supabase = await createClient();

  // Resolve courseId from courseSlug
  let courseId: string | null = SEED_SLUG_MAP[courseSlug] ?? null;
  if (courseId) {
    // Seed slug hit — but if the course was renamed, the old URL is dead
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", `course_${courseId}_slug`)
      .maybeSingle();
    if (data?.value && data.value !== courseSlug) courseId = null;
  } else {
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", "curriculum_slug_map")
      .maybeSingle();
    if (data?.value) {
      try {
        const m: Record<string, string> = JSON.parse(data.value);
        courseId = m[courseSlug] ?? null;
      } catch { /* invalid JSON */ }
    }
  }
  if (!courseId) return null;

  // Resolve lessonKey: static seed lessons first (foundations), then the course's slug map
  let lessonKey: string | null =
    courseId === "foundations" ? getStaticLessonKey(lessonSlug) : null;

  if (lessonKey) {
    // Static slug hit — but if the lesson was renamed, the old URL is dead
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", `${lessonKey}_slug`)
      .maybeSingle();
    if (data?.value && data.value !== lessonSlug) lessonKey = null;
  }

  if (!lessonKey) {
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", `${courseId}_slug_map`)
      .maybeSingle();
    if (data?.value) {
      try {
        const m: Record<string, string> = JSON.parse(data.value);
        lessonKey = m[lessonSlug] ?? null;
      } catch { /* invalid JSON */ }
    }

    // Last resort: reverse-lookup a lesson whose own `<lk>_slug` key matches,
    // covering the window where the slug map write hasn't landed yet
    if (!lessonKey) {
      const { data: rows } = await supabase
        .from("site_content")
        .select("key")
        .like("key", `${courseId}\\_%\\_slug`)
        .eq("value", lessonSlug)
        .limit(1);
      if (rows?.[0]) lessonKey = rows[0].key.replace(/_slug$/, "");
    }
  }
  if (!lessonKey) return null;

  return { courseId, lessonKey };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug, lessonSlug } = await params;
  const resolved = await resolveLesson(courseSlug, lessonSlug);
  if (!resolved) return {};
  const { lessonKey } = resolved;

  const staticLesson = getStaticLesson(lessonKey);
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("key, value")
    .in("key", [`${lessonKey}_title`, `${lessonKey}_intro`]);
  const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));

  const title = map[`${lessonKey}_title`] ?? staticLesson?.titleFallback;
  const rawDesc = map[`${lessonKey}_intro`] ?? staticLesson?.content?.introduction ?? "";
  const description = rawDesc.length > 160 ? `${rawDesc.slice(0, 157)}…` : rawDesc;
  return {
    ...(title ? { title: `${title} — Smash Modding Academy` } : {}),
    ...(description ? { description } : {}),
  };
}

export default async function LessonPage({ params }: Props) {
  const { courseSlug, lessonSlug } = await params;
  const resolved = await resolveLesson(courseSlug, lessonSlug);
  if (!resolved) return notFound();
  const { courseId, lessonKey } = resolved;

  // Most recent edit across this lesson's content keys
  const supabase = await createClient();
  const { data: upd } = await supabase
    .from("site_content")
    .select("updated_at")
    .like("key", `${lessonKey.replace(/_/g, "\\_")}\\_%`)
    .order("updated_at", { ascending: false })
    .limit(1);
  const lastUpdated = upd?.[0]?.updated_at ?? null;

  return (
    <>
      <Nav />
      <div className="pt-14 min-h-screen flex flex-col md:flex-row">
        <LessonSidebar currentSlug={lessonSlug} courseId={courseId} />
        <main className="flex-1 min-w-0">
          <LessonContent lessonKey={lessonKey} slug={lessonSlug} courseId={courseId} lastUpdated={lastUpdated} />
        </main>
      </div>
      <Footer />
    </>
  );
}
