import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CourseOverview } from "@/components/course-overview";
import { createClient } from "@/lib/supabase/server";
import { PreviewTokenProvider } from "@/hooks/use-permissions";
import { readPreviewParam } from "@/lib/preview-token";
import { RevisionGate } from "@/components/revision-gate";

// If the course URL was renamed (course_foundations_slug set to something
// else), this legacy static route stops resolving.
async function foundationsSlugCurrent(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("value")
    .eq("key", "course_foundations_slug")
    .maybeSingle();
  return !data?.value || data.value === "foundations";
}

export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_content")
    .select("key, value")
    .in("key", ["foundations_title", "foundations_description"]);
  const map = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));

  const title = map["foundations_title"] ?? "Foundations";
  return {
    title: `${title} — Smash Modding Academy`,
    ...(map["foundations_description"] ? { description: map["foundations_description"] } : {}),
  };
}

export default async function FoundationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await foundationsSlugCurrent())) return notFound();
  const previewToken = readPreviewParam(await searchParams);

  return (
    <>
      <Nav />
      <PreviewTokenProvider token={previewToken}>
        <main className="pt-14 min-h-screen">
          <RevisionGate scope={{ type: "course", courseId: "foundations" }}>
            <CourseOverview courseId="foundations" />
          </RevisionGate>
        </main>
      </PreviewTokenProvider>
      <Footer />
    </>
  );
}
