import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

export default async function LessonPage({ params }: Props) {
  const { courseSlug, lessonSlug } = await params;

  // Resolve courseId from courseSlug
  let courseId: string | null = SEED_SLUG_MAP[courseSlug] ?? null;
  if (!courseId) {
    const supabase = await createClient();
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
  if (!courseId) return notFound();

  // Resolve lessonKey from lessonSlug via the course's slug map
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", `${courseId}_slug_map`)
    .maybeSingle();

  let lessonKey: string | null = null;
  if (data?.value) {
    try {
      const m: Record<string, string> = JSON.parse(data.value);
      lessonKey = m[lessonSlug] ?? null;
    } catch { /* invalid JSON */ }
  }
  if (!lessonKey) return notFound();

  return (
    <>
      <Nav />
      <div className="pt-14 min-h-screen flex flex-col md:flex-row">
        <LessonSidebar currentSlug={lessonSlug} courseId={courseId} />
        <main className="flex-1 min-w-0">
          <LessonContent lessonKey={lessonKey} slug={lessonSlug} courseId={courseId} />
        </main>
      </div>
      <Footer />
    </>
  );
}
