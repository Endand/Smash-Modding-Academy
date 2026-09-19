export const COURSE_TITLE_KEY = "foundations_title";
export const COURSE_LEVEL_KEY = "foundations_level";

export interface LessonContent {
  introduction: string;
  outcomes: string[];
  sections: Array<{
    heading: string;
    paragraphs: string[];
    bullets?: string[];
    note?: string;
  }>;
  assignment?: {
    description: string;
    items: string[];
  };
  knowledgeCheck: Array<{ question: string; answer: string }>;
  resources?: Array<{ title: string; url: string; description: string }>;
}

export interface CourseLessonDef {
  lessonKey: string;
  slug: string;
  titleFallback: string;
  iconFallback: string;
  content?: LessonContent;
}

export interface CourseSectionDef {
  sectionKey: string;
  titleFallback: string;
  lessons: CourseLessonDef[];
}

export const FOUNDATIONS_SECTIONS: CourseSectionDef[] = [
  {
    sectionKey: "foundations_s0",
    titleFallback: "Introduction",
    lessons: [
      {
        lessonKey: "foundations_l0_0",
        slug: "how-this-course-works",
        titleFallback: "How This Course Works",
        iconFallback: "BookOpen",
        content: {
          introduction:
            "Welcome to Smash Modding Academy. This is the starting point of the Foundations course — where people who have never touched a modding tool learn to publish their first mods. Before you install anything, spend a few minutes here understanding how this course works so you can get the most out of it.",
          outcomes: [
            "Understand how the SMA curriculum is organized into courses, sections, and lessons",
            "Know the difference between a lesson and a hands-on project",
            "Know what to do when you get stuck",
            "Have a clear picture of what you'll build by the end of Foundations",
          ],
          sections: [
            {
              heading: "How the course is structured",
              paragraphs: [
                "SMA is organized into courses, sections, and lessons. You're currently in the Foundations course. Within each course, content is grouped into sections — think of them as chapters. Each section focuses on a related set of skills, and within each section are individual lessons and projects.",
                "Work through lessons in order. Each one builds on the last, and skipping ahead often means missing context that makes later material harder to understand.",
              ],
            },
            {
              heading: "Lessons vs. projects",
              paragraphs: [
                "Most entries in the sidebar are lessons: focused reads that introduce a concept, show you how it works, and leave you with a clear mental model. A few entries are projects: hands-on tasks where you apply what you've learned by making an actual mod.",
                "You'll know the difference by the icon. A book icon means it's a lesson. A wrench icon — and the 'Project' badge on the right — means it's a project. Projects are not optional. They're where real learning happens.",
              ],
            },
            {
              heading: "What to do when you get stuck",
              paragraphs: [
                "Getting stuck is completely normal, especially in the early stages. The important thing is knowing what to do about it.",
                "First, re-read the relevant section of the lesson — you often miss something on the first pass. Then try searching for the specific error or concept. If you're still stuck after 15–20 minutes, reach out in the community Discord. Don't grind on a problem alone for hours.",
              ],
              note: "Struggling productively for a short time is good. Struggling alone for hours is not. Ask for help.",
            },
            {
              heading: "What you'll build",
              paragraphs: [
                "By the end of Foundations, you'll have published two real mods on GameBanana: a custom skin mod and a texture edit. You'll understand how Smash Ultimate's file system is organized, how to use the core modding tools, and how to write a mod page that other players actually want to read.",
                "These aren't toy examples. They're the same techniques used by experienced modders — you're just learning the fundamentals first.",
              ],
            },
          ],
          assignment: {
            description: "Before moving on, make sure you've done the following:",
            items: [
              "Read this entire lesson a second time — you'll notice something you missed on the first pass.",
              "Decide which character you want to mod first. Write it down somewhere.",
              "Bookmark the Foundations course page so you can find your place easily.",
            ],
          },
          knowledgeCheck: [
            {
              question: "What is the difference between a lesson and a project?",
              answer:
                "Lessons introduce a concept through reading and explanation. Projects are hands-on tasks where you apply what you've learned by making a real mod.",
            },
            {
              question: "How long should you try to solve a problem before asking for help?",
              answer:
                "About 15–20 minutes. Spending longer without reaching out is usually not productive — ask in the community Discord after that.",
            },
            {
              question: "What two mods will you have published by the end of Foundations?",
              answer:
                "A custom skin mod and a texture edit, both published on GameBanana.",
            },
          ],
          resources: [
            {
              title: "GameBanana — Smash Ultimate mods",
              url: "https://gamebanana.com/games/6498",
              description: "The main community hub for publishing and discovering Smash Ultimate mods.",
            },
            {
              title: "SmashBoards Modding Forum",
              url: "https://smashboards.com/forums/smash-bros-modding.274/",
              description: "Forum for deeper modding discussion, tutorials, and community help.",
            },
          ],
        },
      },
      {
        lessonKey: "foundations_l0_1",
        slug: "join-the-community",
        titleFallback: "Join the Community",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l0_2",
        slug: "motivation-and-mindset",
        titleFallback: "Motivation and Mindset",
        iconFallback: "BookOpen",
      },
    ],
  },
  {
    sectionKey: "foundations_s1",
    titleFallback: "Getting Your Tools Ready",
    lessons: [
      {
        lessonKey: "foundations_l1_0",
        slug: "introduction-to-modding-tools",
        titleFallback: "Introduction to Modding Tools",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l1_1",
        slug: "installing-arcropolis-and-skyline",
        titleFallback: "Installing ARCropolis & Skyline",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l1_2",
        slug: "understanding-the-switch-file-system",
        titleFallback: "Understanding the Switch File System",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l1_3",
        slug: "your-very-first-mod",
        titleFallback: "Project: Your Very First Mod",
        iconFallback: "Hammer",
      },
    ],
  },
  {
    sectionKey: "foundations_s2",
    titleFallback: "Understanding Smash Files",
    lessons: [
      {
        lessonKey: "foundations_l2_0",
        slug: "how-smash-ultimates-file-structure-works",
        titleFallback: "How Smash Ultimate's File Structure Works",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l2_1",
        slug: "working-with-nutexb-texture-files",
        titleFallback: "Working with .NUTEXB Texture Files",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l2_2",
        slug: "the-fighter-folder-breakdown",
        titleFallback: "The Fighter Folder Breakdown",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l2_3",
        slug: "reading-arc-file-paths",
        titleFallback: "Reading ARC File Paths",
        iconFallback: "BookOpen",
      },
    ],
  },
  {
    sectionKey: "foundations_s3",
    titleFallback: "Skin Modding",
    lessons: [
      {
        lessonKey: "foundations_l3_0",
        slug: "what-is-a-skin-mod",
        titleFallback: "What Is a Skin Mod?",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l3_1",
        slug: "using-switch-toolbox",
        titleFallback: "Using Switch Toolbox",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l3_2",
        slug: "editing-textures-and-normal-maps",
        titleFallback: "Editing Textures and Normal Maps",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l3_3",
        slug: "ink-and-emission-advanced-texture-layers",
        titleFallback: "Ink and Emission: Advanced Texture Layers",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l3_4",
        slug: "build-a-custom-skin-mod",
        titleFallback: "Project: Build a Custom Skin Mod",
        iconFallback: "Hammer",
      },
    ],
  },
  {
    sectionKey: "foundations_s4",
    titleFallback: "Sharing Your Work",
    lessons: [
      {
        lessonKey: "foundations_l4_0",
        slug: "publishing-to-gamebanana",
        titleFallback: "Publishing to GameBanana",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l4_1",
        slug: "writing-a-good-mod-page",
        titleFallback: "Writing a Good Mod Page",
        iconFallback: "BookOpen",
      },
      {
        lessonKey: "foundations_l4_2",
        slug: "what-comes-next",
        titleFallback: "What Comes Next",
        iconFallback: "BookOpen",
      },
    ],
  },
];

// All lessons in order (flat list)
export function getAllLessons() {
  return FOUNDATIONS_SECTIONS.flatMap((s) => s.lessons);
}

// Look up a static lesson by lessonKey
export function getStaticLesson(lessonKey: string): CourseLessonDef | null {
  return getAllLessons().find((l) => l.lessonKey === lessonKey) ?? null;
}

// Look up a lesson by slug — returns the lessonKey if found in static data
export function getStaticLessonKey(slug: string): string | null {
  return getAllLessons().find((l) => l.slug === slug)?.lessonKey ?? null;
}

// Legacy helper kept for backwards compat
export function getLessonContext(slug: string) {
  const all = getAllLessons();
  const idx = all.findIndex((l) => l.slug === slug);
  if (idx === -1) return null;
  const lesson = all[idx];
  const section = FOUNDATIONS_SECTIONS.find((s) =>
    s.lessons.some((l) => l.slug === slug)
  )!;
  return {
    lesson,
    section,
    prev: idx > 0 ? all[idx - 1] : null,
    next: idx < all.length - 1 ? all[idx + 1] : null,
  };
}
