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

// A preview link is a sharing affordance, not lesson content: it changes
// nothing a reader sees. So it is exempt from the edit-approval queue —
// otherwise an editor's link would sit unusable until someone approved it,
// and anyone with edit rights is meant to be able to share a preview.
export function isPreviewTokenKey(key: string): boolean {
  return /_preview_token$/.test(key);
}

// 24 hex chars of CSPRNG output — short enough to share, long enough not to guess.
export function newPreviewToken(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Expiry ────────────────────────────────────────────────────────────────────
// The stored value is `<token>` for a link that never expires, or
// `<token>:<epochMillis>` for one that does. The shared URL always carries just
// the token, so the expiry can't be edited by whoever holds the link.
//
// The bare form is also what every link created before expiry existed looks
// like, so those keep working as permanent rather than silently dying.

export type PreviewDuration = "day" | "week" | "forever";

export const PREVIEW_DURATIONS: { value: PreviewDuration; label: string; ms: number | null }[] = [
  { value: "day",     label: "1 day",     ms: 24 * 60 * 60 * 1000 },
  { value: "week",    label: "1 week",    ms: 7 * 24 * 60 * 60 * 1000 },
  { value: "forever", label: "Forever",   ms: null },
];

export function buildStoredToken(token: string, ms: number | null, now = Date.now()): string {
  return ms === null ? token : `${token}:${now + ms}`;
}

export function parseStoredToken(
  stored: string | undefined | null
): { token: string; expiresAt: number | null } | null {
  if (!stored) return null;
  const idx = stored.indexOf(":");
  if (idx === -1) return { token: stored, expiresAt: null };
  const token = stored.slice(0, idx);
  const expiresAt = Number(stored.slice(idx + 1));
  if (!token || !Number.isFinite(expiresAt)) return null;
  return { token, expiresAt };
}

export type TokenState = "none" | "active" | "expired";

export function tokenState(stored: string | undefined | null, now = Date.now()): TokenState {
  const parsed = parseStoredToken(stored);
  if (!parsed) return "none";
  if (parsed.expiresAt !== null && now >= parsed.expiresAt) return "expired";
  return "active";
}

// "Expires in 6 days" / "Expires in 3 hours" / "Never expires" / "Expired"
export function expiryLabel(expiresAt: number | null, now = Date.now()): string {
  if (expiresAt === null) return "Never expires";
  const left = expiresAt - now;
  if (left <= 0) return "Expired";
  const mins = Math.floor(left / 60000);
  if (mins < 60) return `Expires in ${mins} minute${mins === 1 ? "" : "s"}`;
  const hours = Math.floor(mins / 60);
  // Hand over to days a little before the 24h mark, so a link created moments
  // ago for "1 day" reads "Expires in 1 day" rather than "in 23 hours".
  if (hours < 23) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(left / (24 * 60 * 60 * 1000));
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}

// Does `token` unlock this scope? A course token unlocks the course and all of
// its lessons; a lesson token unlocks only that lesson.
export function hasPreviewGrant(
  token: string | null | undefined,
  content: Record<string, string>,
  courseId: string,
  lessonKey?: string,
  now = Date.now()
): boolean {
  if (!token) return false;
  const matches = (stored: string | undefined) => {
    const parsed = parseStoredToken(stored);
    if (!parsed || parsed.token !== token) return false;
    return parsed.expiresAt === null || now < parsed.expiresAt;
  };
  if (matches(content[coursePreviewKey(courseId)])) return true;
  if (lessonKey && matches(content[lessonPreviewKey(lessonKey)])) return true;
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
