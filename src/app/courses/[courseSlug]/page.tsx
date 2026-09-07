import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CourseOverview } from "@/components/course-overview";
import { getCourseKeys } from "@/lib/courses/course-utils";
import { PreviewTokenProvider } from "@/hooks/use-permissions";
import { readPreviewParam } from "@/lib/preview-token";
import { RevisionGate } from "@/components/revision-gate";

// Static slug → courseId for seed courses that don't have their own page files.
// "foundations" has a static page that takes priority and never hits this route.
const SEED_SLUG_MAP: Record<string, string> = {
  "character-modding": "character-modding",
};

interface Props {
  params: Promise<{ courseSlug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

async function resolveCourseId(courseSlug: string): Promise<string | null> {
  const supabase = await createClient();

  // 1. Check seed courses with known slugs
  const seeded = SEED_SLUG_MAP[courseSlug];
  if (seeded) {
    // Seed slug hit — but if the course was renamed, the old URL is dead
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", `course_${seeded}_slug`)
      .maybeSingle();
    if (data?.value && data.value !== courseSlug) return null;
    return seeded;
  }

  // 2. Check dynamically added courses via slug map in site_content
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "curriculum_slug_map")
    .maybeSingle();
  if (data?.value) {
    try {
      const slugMap: Record<string, string> = JSON.parse(data.value);
      return slugMap[courseSlug] ?? null;
    } catch { /* invalid JSON */ }
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug } = await params;
  const courseId = await resolveCourseId(courseSlug);
  if (!courseId) return {};

  const { titleKey, descKey } = getCourseKeys(courseId);
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("key, value")
    .in("key", [titleKey, descKey]);
  const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));

  const title = map[titleKey];
  return {
    ...(title ? { title: `${title} | Smash Modding Academy` } : {}),
    ...(map[descKey] ? { description: map[descKey] } : {}),
  };
}

export default async function CoursePage({ params, searchParams }: Props) {
  const { courseSlug } = await params;
  const courseId = await resolveCourseId(courseSlug);
  if (!courseId) return notFound();
  const previewToken = readPreviewParam(await searchParams);

  return (
    <>
      <Nav />
      <PreviewTokenProvider token={previewToken}>
        <main className="pt-14 min-h-screen">
          <RevisionGate scope={{ type: "course", courseId }}>
            <CourseOverview courseId={courseId} />
          </RevisionGate>
        </main>
      </PreviewTokenProvider>
      <Footer />
    </>
  );
}
