import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaticLessonKey } from "@/lib/courses/foundations-data";
import { LessonSidebar } from "@/components/lesson-sidebar";
import { LessonContent } from "@/components/lesson-content";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;

  // Static lesson lookup (fast, in-memory)
  let lessonKey = getStaticLessonKey(slug);

  // Dynamic lesson lookup (Supabase — only when static lookup misses)
  if (!lessonKey) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", "foundations_slug_map")
      .maybeSingle();
    if (data?.value) {
      try {
        const slugMap: Record<string, string> = JSON.parse(data.value);
        lessonKey = slugMap[slug] ?? null;
      } catch { /* invalid JSON */ }
    }
  }

  if (!lessonKey) return notFound();

  return (
    <>
      <Nav />
      <div className="pt-14 min-h-screen flex flex-col md:flex-row">
        <LessonSidebar currentSlug={slug} courseId="foundations" />
        <main className="flex-1 min-w-0">
          <LessonContent lessonKey={lessonKey} slug={slug} courseId="foundations" />
        </main>
      </div>
      <Footer />
    </>
  );
}
