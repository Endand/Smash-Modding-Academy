// Which parts of a project submission are asked for, and which are compulsory.
//
// Each project sets this itself, because projects differ: a coding project
// wants the repository above all, a skin project wants to see the thing.
// Stored as ordinary content keys, so changing it goes through the same
// editing and approval path as the rest of the lesson.

export type FieldMode = "required" | "optional" | "off";

export const FIELD_MODES: FieldMode[] = ["required", "optional", "off"];

export type FieldId = "showcase" | "repo" | "file" | "notes";

export interface FieldDef {
  id: FieldId;
  /** Shown on the editor's settings row. */
  label: string;
  /** Shown above the input on the submission form. */
  formLabel: string;
  hint: string;
  fallback: FieldMode;
}

// Order matters: this is the order fields appear on the form and, for the
// ones that render, in a posted solution. Showcase leads, because what people
// want first is to see what you made.
export const SUBMISSION_FIELDS: FieldDef[] = [
  {
    id: "showcase",
    label: "Showcase",
    formLabel: "Showcase",
    hint: "Screenshots or a clip of it working",
    fallback: "required",
  },
  {
    id: "repo",
    label: "Repository link",
    formLabel: "Repository link",
    hint: "GitHub, or wherever the work lives",
    fallback: "required",
  },
  {
    id: "file",
    label: "Project file",
    formLabel: "Project file",
    hint: "The built mod, for people to try",
    fallback: "optional",
  },
  {
    id: "notes",
    label: "Notes",
    formLabel: "Notes",
    hint: "How they approached it",
    fallback: "optional",
  },
];

export function fieldModeKey(lessonKey: string, id: FieldId): string {
  return `${lessonKey}_sub_${id}`;
}

export function fieldMode(
  content: Record<string, string>,
  lessonKey: string,
  id: FieldId
): FieldMode {
  const stored = content[fieldModeKey(lessonKey, id)];
  if (stored === "required" || stored === "optional" || stored === "off") return stored;
  return SUBMISSION_FIELDS.find((f) => f.id === id)?.fallback ?? "optional";
}

// A project with everything switched off has no form worth showing.
export function anyFieldOn(content: Record<string, string>, lessonKey: string): boolean {
  return SUBMISSION_FIELDS.some((f) => fieldMode(content, lessonKey, f.id) !== "off");
}
