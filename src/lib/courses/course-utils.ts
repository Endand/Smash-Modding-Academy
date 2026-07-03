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

// URL slug for each course (static courses have fixed slugs)
const STATIC_SLUGS: Record<string, string> = {
  foundations:       "foundations",
  "character-modding": "character-modding",
};

export function getCourseSlug(courseId: string, content: Record<string, string>): string {
  return STATIC_SLUGS[courseId] ?? content[`course_${courseId}_slug`] ?? courseId;
}

// "available" = public; "soon" = hidden from non-admins
const DEFAULT_STATUS: Record<string, "available" | "soon"> = {
  foundations: "available",
};

export function getCourseStatus(courseId: string, content: Record<string, string>): "available" | "soon" {
  const stored = content[`course_${courseId}_status`];
  if (stored === "available" || stored === "soon") return stored;
  return DEFAULT_STATUS[courseId] ?? "soon";
}

// Initial course list — shown on curriculum page unless deleted from site_content
export const SEED_COURSE_IDS = ["foundations", "character-modding"];
