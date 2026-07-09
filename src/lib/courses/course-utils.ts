// Per-course content key conventions
// Built-in courses keep their existing key names; dynamic ones use a generated prefix.

const BUILTIN_KEY_OVERRIDES: Record<string, { titleKey?: string; levelKey?: string; descKey?: string }> = {
  foundations: {
    titleKey: "foundations_title",
    levelKey: "foundations_level",
    descKey: "foundations_description",
  },
  "character-modding": {
    titleKey: "curriculum_course_1_title",
    levelKey: "curriculum_course_1_level",
    descKey: "curriculum_course_1_desc",
  },
};

export interface CourseKeys {
  titleKey: string;
  levelKey: string;
  descKey: string;
}

export function getCourseKeys(courseId: string): CourseKeys {
  const ov = BUILTIN_KEY_OVERRIDES[courseId] ?? {};
  return {
    titleKey: ov.titleKey ?? `course_${courseId}_title`,
    levelKey: ov.levelKey ?? `course_${courseId}_level`,
    descKey:  ov.descKey  ?? `course_${courseId}_desc`,
  };
}

// URL slug for each course — all courses read from content, with static defaults
const STATIC_SLUG_DEFAULTS: Record<string, string> = {
  "character-modding": "character-modding",
};

export function getCourseSlug(courseId: string, content: Record<string, string>): string {
  // Stored slug takes priority for all courses (allows admin to rename URL)
  const stored = content[`course_${courseId}_slug`];
  if (stored) return stored;
  return STATIC_SLUG_DEFAULTS[courseId] ?? courseId;
}

export function slugFromTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "course";
}

// "available" = public; "soon" = public teaser (not clickable); "draft" =
// hidden from everyone without edit access to the course or a lesson in it.
export type CourseStatus = "available" | "soon" | "draft";

const DEFAULT_STATUS: Record<string, CourseStatus> = {
  foundations: "available",
};

export function getCourseStatus(courseId: string, content: Record<string, string>): CourseStatus {
  const stored = content[`course_${courseId}_status`];
  if (stored === "available" || stored === "soon" || stored === "draft") return stored;
  return DEFAULT_STATUS[courseId] ?? "soon";
}

// Initial course list — shown on curriculum page unless deleted from site_content
export const SEED_COURSE_IDS = ["foundations", "character-modding"];

// Icons that mark a lesson as a project (drives the Project badge and layout)
export const PROJECT_ICONS = new Set(["Wrench", "Hammer", "Package", "Target", "Trophy"]);
