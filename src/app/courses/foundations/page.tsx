"use client";

import { useMemo } from "react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";
import { EditableIcon } from "@/components/editable-icon";
import { useContentContext } from "@/components/content-provider";

const PROJECT_ICONS = new Set(["Wrench", "Hammer", "Package", "Target", "Trophy"]);

interface LessonDef {
  lessonKey: string;
  titleFallback: string;
  iconFallback: string;
}

interface SectionDef {
  sectionKey: string;
  titleFallback: string;
  lessons: LessonDef[];
}

const SECTIONS: SectionDef[] = [
  {
    sectionKey: "foundations_s0",
    titleFallback: "Introduction",
    lessons: [
      { lessonKey: "foundations_l0_0", titleFallback: "How This Course Works", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l0_1", titleFallback: "Join the Community", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l0_2", titleFallback: "Motivation and Mindset", iconFallback: "BookOpen" },
    ],
  },
  {
    sectionKey: "foundations_s1",
    titleFallback: "Getting Your Tools Ready",
    lessons: [
      { lessonKey: "foundations_l1_0", titleFallback: "Introduction to Modding Tools", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l1_1", titleFallback: "Installing ARCropolis & Skyline", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l1_2", titleFallback: "Understanding the Switch File System", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l1_3", titleFallback: "Project: Your Very First Mod", iconFallback: "Wrench" },
    ],
  },
  {
    sectionKey: "foundations_s2",
    titleFallback: "Understanding Smash Files",
    lessons: [
      { lessonKey: "foundations_l2_0", titleFallback: "How Smash Ultimate's File Structure Works", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l2_1", titleFallback: "Working with .NUTEXB Texture Files", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l2_2", titleFallback: "The Fighter Folder Breakdown", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l2_3", titleFallback: "Reading ARC File Paths", iconFallback: "BookOpen" },
    ],
  },
  {
    sectionKey: "foundations_s3",
    titleFallback: "Skin Modding",
    lessons: [
      { lessonKey: "foundations_l3_0", titleFallback: "What Is a Skin Mod?", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l3_1", titleFallback: "Using Switch Toolbox", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l3_2", titleFallback: "Editing Textures and Normal Maps", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l3_3", titleFallback: "Ink and Emission: Advanced Texture Layers", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l3_4", titleFallback: "Project: Build a Custom Skin Mod", iconFallback: "Wrench" },
    ],
  },
  {
    sectionKey: "foundations_s4",
    titleFallback: "Sharing Your Work",
    lessons: [
      { lessonKey: "foundations_l4_0", titleFallback: "Publishing to GameBanana", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l4_1", titleFallback: "Writing a Good Mod Page", iconFallback: "BookOpen" },
      { lessonKey: "foundations_l4_2", titleFallback: "What Comes Next", iconFallback: "BookOpen" },
    ],
  },
];

function LessonRow({ lesson, isLast }: { lesson: LessonDef; isLast: boolean }) {
  const { content } = useContentContext();
  const iconName = content[`${lesson.lessonKey}_icon`] ?? lesson.iconFallback;
  const isProject = PROJECT_ICONS.has(iconName);

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 cursor-default hover:bg-[var(--surface-raised)] transition-colors"
      style={{ borderBottom: !isLast ? "1px solid var(--border-color)" : "none" }}
    >
      <span
        style={{
          color: isProject ? "var(--accent-medium)" : "var(--text-muted)",
          opacity: isProject ? 1 : 0.6,
          flexShrink: 0,
        }}
      >
        <EditableIcon
          contentKey={`${lesson.lessonKey}_icon`}
          fallback={lesson.iconFallback}
          size={15}
          strokeWidth={1.5}
        />
      </span>
      <Editable
        as="span"
        contentKey={`${lesson.lessonKey}_title`}
        fallback={lesson.titleFallback}
        className="flex-1 text-sm text-[var(--text)]"
      />
      {isProject && (
        <span
          className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)] hidden sm:inline"
          style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}
        >
          Project
        </span>
      )}
      <span
        className="font-mono text-[10px] uppercase tracking-widest"
        style={{ color: "var(--text-muted)", opacity: 0.4 }}
      >
        Soon
      </span>
    </div>
  );
}

export default function FoundationsPage() {
  const { content } = useContentContext();

  const [lessonCount, projectCount] = useMemo(() => {
    let l = 0;
    let p = 0;
    for (const section of SECTIONS) {
      for (const lesson of section.lessons) {
        const iconName = content[`${lesson.lessonKey}_icon`] ?? lesson.iconFallback;
        if (PROJECT_ICONS.has(iconName)) p++;
        else l++;
      }
    }
    return [l, p];
  }, [content]);

  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-3xl mx-auto px-6 py-16">

          {/* Course header */}
          <div className="mb-14">
            <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-3">
              Course
            </p>
            <div className="flex items-center gap-3 mb-5">
              <Editable
                contentKey="foundations_title"
                fallback="Foundations"
                as="h1"
                className="text-4xl font-extralight tracking-wide text-[var(--text)]"
              />
              <span
                className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)]"
                style={{ color: "var(--accent-medium)", border: "1px solid var(--accent-medium)" }}
              >
                Beginner
              </span>
            </div>
            <Editable
              contentKey="foundations_description"
              fallback="This is where it all begins. You'll set up your modding environment, learn how Smash Ultimate stores its files, create your first skin mod, and publish it for the community. No prior experience required."
              as="p"
              className="text-[var(--text-muted)] leading-relaxed"
            />
            <div
              className="mt-5 font-mono text-[11px] flex items-center gap-3"
              style={{ color: "var(--text-muted)" }}
            >
              <span>{lessonCount} lessons</span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>{projectCount} projects</span>
            </div>
          </div>

          {/* Sections */}
          <div className="flex flex-col gap-10">
            {SECTIONS.map((section) => (
              <div key={section.sectionKey}>
                <div className="flex items-center gap-4 mb-3">
                  <Editable
                    as="span"
                    contentKey={`${section.sectionKey}_title`}
                    fallback={section.titleFallback}
                    className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] whitespace-nowrap"
                  />
                  <div className="h-px flex-1 bg-[var(--border-color)]" />
                </div>
                <div
                  style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-card)",
                    overflow: "hidden",
                  }}
                >
                  {section.lessons.map((lesson, i) => (
                    <LessonRow
                      key={lesson.lessonKey}
                      lesson={lesson}
                      isLast={i === section.lessons.length - 1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
