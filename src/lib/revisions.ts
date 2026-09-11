// Edit-approval queue — pure helpers, no React.
//
// Editors without approve rights don't write site_content directly. Their
// changes become rows in content_revisions, which a professor/assistant with
// `approve_edits` on that lesson applies or rejects.

export interface Revision {
  id: string;
  key: string;
  new_value: string;
  base_value: string | null;
  course_id: string | null;
  lesson_key: string | null;
  batch_id: string;
  label: string | null;
  author_id: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  note: string | null;
}

// A group of revisions produced by one editing action (one click), shown to
// the reviewer as a single approve/reject unit so structural changes — which
// touch several keys at once — can never be half-applied.
export interface RevisionBatch {
  batchId: string;
  authorId: string;
  createdAt: string;
  lessonKey: string | null;
  courseId: string | null;
  revisions: Revision[];
}

export function groupIntoBatches(rows: Revision[]): RevisionBatch[] {
  const byBatch = new Map<string, RevisionBatch>();
  for (const r of rows) {
    let b = byBatch.get(r.batch_id);
    if (!b) {
      b = {
        batchId: r.batch_id,
        authorId: r.author_id,
        createdAt: r.created_at,
        lessonKey: r.lesson_key,
        courseId: r.course_id,
        revisions: [],
      };
      byBatch.set(r.batch_id, b);
    }
    b.revisions.push(r);
    // A batch is as old as its earliest row
    if (r.created_at < b.createdAt) b.createdAt = r.created_at;
  }
  return [...byBatch.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// A course's review queue spans many lessons, so batches are clustered by the
// lesson they belong to. `lessonKey: null` collects the course's own keys
// (title, description, section order) which belong to no single lesson.
export interface LessonGroup {
  lessonKey: string | null;
  batches: RevisionBatch[];
  latest: string;
  count: number;
}

export function groupBatchesByLesson(batches: RevisionBatch[]): LessonGroup[] {
  const byLesson = new Map<string, LessonGroup>();
  for (const b of batches) {
    const k = b.lessonKey ?? "";
    let g = byLesson.get(k);
    if (!g) {
      g = { lessonKey: b.lessonKey, batches: [], latest: b.createdAt, count: 0 };
      byLesson.set(k, g);
    }
    g.batches.push(b);
    g.count += b.revisions.length;
    if (b.createdAt > g.latest) g.latest = b.createdAt;
  }
  // Most recently touched lesson first — that's where the reviewer's attention is.
  return [...byLesson.values()].sort((a, b) => b.latest.localeCompare(a.latest));
}

// Has the live value moved on since this edit was proposed? Approving would
// then silently overwrite whatever landed in between, so the reviewer is warned.
export function isStale(rev: Revision, liveContent: Record<string, string>): boolean {
  const live = liveContent[rev.key];
  const base = rev.base_value;
  // base null means the key didn't exist when the edit was made
  if (base === null) return live !== undefined;
  return live !== base;
}

// Human label for a content key, so the review list reads like prose instead
// of `foundations_l2_1_s0_blk3_content`.
export function describeKey(key: string): string {
  const k = key;
  const test = (re: RegExp) => re.test(k);

  if (test(/_title$/)) return "Title";
  if (test(/_intro$/)) return "Introduction";
  if (test(/_desc$/) && !test(/_res\d+_desc$/)) return "Description";
  if (test(/_slug$/)) return "URL slug";
  if (test(/_slug_map$/) || test(/^curriculum_slug_map$/)) return "URL mapping";
  if (test(/_status$/)) return "Publish status";
  if (test(/_deleted$/)) return "Removal";
  if (test(/_icon$/)) return "Icon";
  if (test(/_level$/)) return "Difficulty";
  if (test(/_author$/) || test(/_editors$/)) return "Credits";

  if (test(/_section_ids$/)) return "Section order";
  if (test(/_lesson_ids$/)) return "Lesson order";

  if (test(/_s\d+_heading$/)) return "Section heading";
  if (test(/_s\d+_p\d+$/)) return "Paragraph";
  if (test(/_s\d+_para_count$/)) return "Paragraph count";
  if (test(/_s\d+_note$/)) return "Callout";
  if (test(/_s\d+_blk\d+_content$/)) return "Block content";
  if (test(/_s\d+_blk\d+_lang$/)) return "Code language";
  if (test(/_s\d+_blk\d+_caption$/)) return "Caption";
  if (test(/_s\d+_blk\d+_width$/)) return "Image size";
  if (test(/_s\d+_blk\d+_filename$/)) return "Attachment name";
  if (test(/_s\d+_blk\d+_filesize$/)) return "Attachment size";
  if (test(/_s\d+_blk\d+_cell_\d+_\d+_img$/)) return "Table cell image";
  if (test(/_s\d+_blk\d+_cell_\d+_\d+$/)) return "Table cell";
  if (test(/_s\d+_blk\d+_(rows|cols)$/)) return "Table size";
  if (test(/_s\d+_blk\d+_header$/)) return "Table header row";
  if (test(/_s\d+_blk\d+_type$/)) return "Block type";
  if (test(/_s\d+_blk/)) return "Content block";
  if (test(/_block_ids$/) || test(/_blk_ids$/)) return "Block order";
  if (test(/_section_count$/)) return "Section count";

  if (test(/_outcome/)) return "Learning outcome";
  if (test(/_assign_desc$/)) return "Assignment intro";
  if (test(/_assign_count$/)) return "Assignment count";
  if (test(/_assign_\d+$/)) return "Assignment step";
  if (test(/_kc\d+_q$/)) return "Knowledge-check question";
  if (test(/_kc\d+_a$/)) return "Knowledge-check answer";
  if (test(/_kc_count$/)) return "Knowledge-check count";
  if (test(/_res\d+_title$/)) return "Resource name";
  if (test(/_res\d+_url$/)) return "Resource link";
  if (test(/_res\d+_desc$/)) return "Resource description";
  if (test(/_res_count$/)) return "Resource count";
  if (test(/_preview_token$/)) return "Preview link";
  if (test(/_submissions_enabled$/)) return "Project submissions";
  if (test(/_submissions_intro$/)) return "Submissions intro";
  if (test(/_sub_(showcase|repo|file|notes)$/)) return "Submission field";
  if (test(/_edit_acl$/)) return "Edit access";

  return "Content";
}

// Short summary for a whole batch: "Paragraph, Block content +2 more"
export function describeBatch(batch: RevisionBatch): string {
  const labels = [...new Set(batch.revisions.map((r) => r.label || describeKey(r.key)))];
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} more`;
}

// Structural keys are bookkeeping (counts, id arrays) rather than prose. The
// review UI shows them, but de-emphasised — the reader cares about the text.
export function isStructuralKey(key: string): boolean {
  return /_(count|ids|deleted)$/.test(key) || /_slug_map$/.test(key);
}

export function truncate(v: string | null, n = 220): string {
  if (v === null) return "(empty)";
  if (v.length <= n) return v || "(empty)";
  return `${v.slice(0, n)}…`;
}
