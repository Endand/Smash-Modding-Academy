import { notFound } from "next/navigation";
import { getLessonContext } from "@/lib/courses/foundations-data";
import { LessonSidebar } from "@/components/lesson-sidebar";
import { LessonContent } from "@/components/lesson-content";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LessonPage({ params }: Props) {
  const { slug } = await params;
  const ctx = getLessonContext(slug);

  if (!ctx || !ctx.lesson.content) return notFound();

  const { lesson, prev, next } = ctx;

  return (
    <>
      <Nav />
      <div className="pt-14 min-h-screen flex flex-col md:flex-row">
        <LessonSidebar currentSlug={slug} />
        <main className="flex-1 min-w-0">
          <LessonContent lesson={lesson} prev={prev} next={next} />
        </main>
      </div>
      <Footer />
    </>
  );
}
