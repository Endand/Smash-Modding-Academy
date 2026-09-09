// Shared Supabase Storage helpers.
//
// Two buckets, kept apart on purpose: lesson attachments are written by staff
// and are part of the published lesson, while project files are written by any
// signed-in learner. Separate buckets mean the write policies can differ
// without one loosening the other.

import { createClient } from "@/lib/supabase/client";

export const LESSON_IMAGES_BUCKET = "lesson-images";
export const LESSON_FILES_BUCKET = "lesson-files";
export const PROJECT_FILES_BUCKET = "project-files";

// Storage caps. The bucket itself should enforce these too (see
// supabase/storage_schema.sql); checking here just gives a useful message
// instead of an opaque 413.
export const MAX_LESSON_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_PROJECT_FILE_BYTES = 25 * 1024 * 1024; // 25 MB, the built mod
export const MAX_MEDIA_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB per screenshot
export const MAX_MEDIA_VIDEO_BYTES = 50 * 1024 * 1024; // 50 MB per clip
// Showcase media is meant to be a handful of shots, not an album.
export const MAX_MEDIA_ITEMS = 6;

// "video" is a file in our own storage; "embed" is a YouTube/Vimeo link the
// person pasted, which stays on its own host and costs us nothing to serve.
export type MediaKind = "image" | "video" | "embed";

export interface MediaItem {
  url: string;
  name: string;
  kind: MediaKind;
}

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)$/i;

// A file's MIME type is the reliable signal at upload time; the extension is
// the fallback for media already stored, where only the URL survives.
export function mediaKind(file: { type?: string; name: string }): MediaKind {
  if (file.type?.startsWith("video/")) return "video";
  if (file.type?.startsWith("image/")) return "image";
  return VIDEO_EXT.test(file.name) ? "video" : "image";
}

export function maxBytesForKind(kind: MediaKind): number {
  return kind === "video" ? MAX_MEDIA_VIDEO_BYTES : MAX_MEDIA_IMAGE_BYTES;
}

export interface UploadedFile {
  url: string;
  name: string;
  size: number;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

// Storage object keys must be plain: strip anything that isn't safe in a path,
// and keep the name short so the public URL stays manageable.
function safeName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+/, "");
  return (cleaned || "file").slice(0, 60);
}

/**
 * Uploads to `bucket` under a collision-proof path and returns the public URL.
 * `folder` scopes objects (e.g. by lesson) so they can be found and cleaned up
 * later. Throws with a readable message on failure.
 */
export async function uploadToBucket(
  bucket: string,
  file: File,
  folder?: string
): Promise<UploadedFile> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${folder ? `${folder}/` : ""}${stamp}-${safeName(file.name)}`;

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { cacheControl: "31536000", contentType: file.type || undefined });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, name: file.name, size: file.size };
}

// Public storage URLs render inline by default. Adding `?download=<name>` makes
// Supabase send Content-Disposition: attachment, so the browser saves the file
// under its original name rather than opening it in a tab.
export function downloadUrl(url: string, filename?: string): string {
  if (!url) return url;
  const name = (filename ?? "").trim();
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}download${name ? `=${encodeURIComponent(name)}` : ""}`;
}

// Last path segment, minus the upload stamp we prepend, as a display fallback
// for attachments saved before the filename was recorded alongside the URL.
export function fileNameFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split("/").pop() ?? "";
    const decoded = decodeURIComponent(last);
    return decoded.replace(/^\d{13}-[a-z0-9]{6}-/, "") || decoded;
  } catch {
    return "";
  }
}
