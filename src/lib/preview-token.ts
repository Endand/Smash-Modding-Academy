// Secret preview links — pure helpers, safe on server and client.
//
// A course or lesson can hold a random token in site_content. Anyone who opens
// the page with `?preview=<token>` sees it as if it were published, without an
// account and without being granted edit access. A course token also unlocks
// every lesson inside that course, so a single link previews the whole thing.
//
// NOTE: this is a shareability feature, not a security boundary. site_content
// is world-readable (RLS: SELECT USING (true)), so unpublished content — and
// these tokens — can already be read straight from the API by anyone who looks.
// Treat a preview link as "unlisted", not "protected".

export const PREVIEW_PARAM = "preview";

export function coursePreviewKey(courseId: string): string {
  return `course_${courseId}_preview_token`;
}

export function lessonPreviewKey(lessonKey: string): string {
  return `${lessonKey}_preview_token`;
}

// 24 hex chars of CSPRNG output — short enough to share, long enough not to guess.
export function newPreviewToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Does `token` unlock this scope? A course token unlocks the course and all of
// its lessons; a lesson token unlocks only that lesson.
export function hasPreviewGrant(
  token: string | null | undefined,
  content: Record<string, string>,
  courseId: string,
  lessonKey?: string
): boolean {
  if (!token) return false;
  const courseToken = content[coursePreviewKey(courseId)];
  if (courseToken && courseToken === token) return true;
  if (lessonKey) {
    const lessonToken = content[lessonPreviewKey(lessonKey)];
    if (lessonToken && lessonToken === token) return true;
  }
  return false;
}

// Pull the token out of a route's resolved searchParams.
export function readPreviewParam(
  sp: Record<string, string | string[] | undefined> | undefined
): string | null {
  const raw = sp?.[PREVIEW_PARAM];
  return typeof raw === "string" && raw ? raw : null;
}

// Carry an active preview token across internal links, so someone previewing
// can click through the sidebar / prev / next without losing access.
export function withPreview(href: string, token: string | null | undefined): string {
  if (!token) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}${PREVIEW_PARAM}=${encodeURIComponent(token)}`;
}
