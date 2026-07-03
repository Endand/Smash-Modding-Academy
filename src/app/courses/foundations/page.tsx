import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { CourseOverview } from "@/components/course-overview";

export default function FoundationsPage() {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <CourseOverview courseId="foundations" />
      </main>
      <Footer />
    </>
  );
}
