import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CourseOverview } from "@/components/course-overview";
import { SEED_COURSE_IDS } from "@/lib/courses/course-utils";

// Static slug → courseId for seed courses that don't have their own page files.
// "foundations" has a static page that takes priority and never hits this route.
const SEED_SLUG_MAP: Record<string, string> = {
  "character-modding": "character-modding",
};

interface Props {
  params: Promise<{ courseSlug: string }>;
}

export default async function CoursePage({ params }: Props) {
  const { courseSlug } = await params;

  // 1. Check seed courses with known slugs
  let courseId: string | null = SEED_SLUG_MAP[courseSlug] ?? null;

  // 2. Check dynamically added courses via slug map in site_content
  if (!courseId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", "curriculum_slug_map")
      .maybeSingle();
    if (data?.value) {
      try {
        const slugMap: Record<string, string> = JSON.parse(data.value);
        courseId = slugMap[courseSlug] ?? null;
      } catch { /* invalid JSON */ }
    }
  }

  if (!courseId) return notFound();

  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <CourseOverview courseId={courseId} />
      </main>
      <Footer />
    </>
  );
}
