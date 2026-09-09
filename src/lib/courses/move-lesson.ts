// Moving a lesson from one course to another.
//
// A lesson key is `${courseId}_${lessonId}`, and every key the lesson owns is
// built from it: `${lk}_title`, `${lk}_s0_blk2_content`, `${lk}_edit_acl` and
// so on. That assumption is baked into the structure builder, the slug sync
// and the permission scopes, so a lesson cannot simply be listed under another
// course: it has to be re-keyed under the destination's prefix.
//
// This module works out every write that requires, as one plan, so the caller
// can send it in a single request. A half-applied move would leave a lesson in
// two courses or in none.

import { parseJSON, getSectionIdList, getLessonIdList, buildCourseStructure } from "./course-structure";
import { getCourseSlug } from "./course-utils";

export interface MovePlan {
  writes: [string, string][];
  newLessonKey: string;
  newSlug: string;
  /** Path the lesson now lives at, for a "view it there" link. */
  newPath: string;
}

// Every lesson id the course has ever listed, deleted ones included: an id
// still in a list is still capable of owning keys.
export function allLessonIds(content: Record<string, string>, courseId: string): string[] {
  const ids = new Set<string>();
  for (const sId of getSectionIdList(courseId, content)) {
    for (const lId of getLessonIdList(courseId, sId, content)) ids.add(lId);
  }
  return [...ids];
}

/**
 * The content keys belonging to one lesson.
 *
 * Prefix matching alone is not enough: with lessons `l1` and `l1_3` in the same
 * course, `foundations_l1_3_title` starts with `foundations_l1_`, but it is not
 * l1's. Every key is therefore attributed to the LONGEST lesson id it begins
 * with, which gives each key exactly one owner.
 */
export function lessonOwnedKeys(
  content: Record<string, string>,
  courseId: string,
  lessonId: string
): string[] {
  const siblings = allLessonIds(content, courseId);
  if (!siblings.includes(lessonId)) siblings.push(lessonId);
  const prefix = `${courseId}_`;

  const out: string[] = [];
  for (const key of Object.keys(content)) {
    if (!key.startsWith(prefix)) continue;
    const rest = key.slice(prefix.length);
    let owner = "";
    for (const id of siblings) {
      if (rest.startsWith(`${id}_`) && id.length > owner.length) owner = id;
    }
    if (owner === lessonId) out.push(key);
  }
  return out;
}

function slugMapOf(content: Record<string, string>, courseId: string): Record<string, string> {
  return parseJSON<Record<string, string>>(content[`${courseId}_slug_map`], {});
}

// A slug only has to be unique within its own course, so a clash on arrival is
// resolved by numbering rather than by refusing the move.
function freeSlug(map: Record<string, string>, base: string): string {
  const clean = base || "lesson";
  if (!map[clean]) return clean;
  let n = 2;
  while (map[`${clean}-${n}`]) n++;
  return `${clean}-${n}`;
}

/**
 * Plans the move. Returns null only when it makes no sense: the lesson is
 * already in that course.
 *
 * `newId` and `newSectionId` are supplied by the caller rather than generated
 * here so the planner stays pure and the clock is never read during render.
 */
export function planLessonMove({
  content,
  fromCourseId,
  fromSectionId,
  lessonId,
  toCourseId,
  newId,
  newSectionId,
}: {
  content: Record<string, string>;
  fromCourseId: string;
  fromSectionId: string;
  lessonId: string;
  toCourseId: string;
  /** Fallback id, used only if `lessonId` is already taken in the destination. */
  newId: string;
  /** Used only if the destination course has no section yet. */
  newSectionId: string;
}): MovePlan | null {
  if (toCourseId === fromCourseId) return null;

  const writes: [string, string][] = [];

  // The lesson lands at the end of the destination's first live section. A
  // course that has no section yet gets one, rather than the move being
  // refused: a new course is empty by definition, and that is exactly the
  // course somebody is most likely to be filling.
  const destSections = buildCourseStructure(toCourseId, content).sections;
  const targetSectionId = destSections[0]?.sectionId ?? newSectionId;
  if (!destSections[0]) {
    const sectionIds = getSectionIdList(toCourseId, content);
    writes.push([`${toCourseId}_section_ids`, JSON.stringify([...sectionIds, newSectionId])]);
    writes.push([`${toCourseId}_${newSectionId}_title`, "Lessons"]);
  }

  // Keep the same lesson id where the destination has no claim on it, so the
  // key changes as little as it has to.
  const taken = new Set(allLessonIds(content, toCourseId));
  const newLessonId = taken.has(lessonId) ? newId : lessonId;

  const oldLk = `${fromCourseId}_${lessonId}`;
  const newLk = `${toCourseId}_${newLessonId}`;

  // 1. Copy the lesson's content across to the new prefix.
  for (const key of lessonOwnedKeys(content, fromCourseId, lessonId)) {
    // `_deleted` is left behind deliberately: it is about to be set on the old
    // key. `_slug` is written below, once the destination has been checked for
    // a clash.
    if (key === `${oldLk}_deleted` || key === `${oldLk}_slug`) continue;
    writes.push([`${newLk}_${key.slice(oldLk.length + 1)}`, content[key]]);
  }

  // The lesson arrives live. This matters when it is moving back somewhere it
  // has been before: the destination key still carries the "deleted" flag that
  // the earlier move out set on it, and nothing else clears it. Without this
  // the lesson rejoins the section list but the structure builder skips it, so
  // it vanishes from the course page while its URL still resolves.
  writes.push([`${newLk}_deleted`, "0"]);

  // 2. Slug, and both courses' slug maps. The destination gains an entry, the
  //    source loses every entry pointing at the old key, so its old URL stops
  //    resolving rather than 404ing through a stale map.
  const destMap = slugMapOf(content, toCourseId);
  const newSlug = freeSlug(destMap, content[`${oldLk}_slug`] ?? lessonId);
  writes.push([`${newLk}_slug`, newSlug]);
  writes.push([`${toCourseId}_slug_map`, JSON.stringify({ ...destMap, [newSlug]: newLk })]);

  const sourceMap = slugMapOf(content, fromCourseId);
  const trimmedSource: Record<string, string> = {};
  for (const [s, v] of Object.entries(sourceMap)) {
    if (v !== oldLk) trimmedSource[s] = v;
  }
  writes.push([`${fromCourseId}_slug_map`, JSON.stringify(trimmedSource)]);

  // 3. Section membership: out of the source list, on to the end of the target.
  const fromIds = getLessonIdList(fromCourseId, fromSectionId, content).filter((x) => x !== lessonId);
  writes.push([`${fromCourseId}_${fromSectionId}_lesson_ids`, JSON.stringify(fromIds)]);

  const toIds = destSections[0] ? getLessonIdList(toCourseId, targetSectionId, content) : [];
  if (!toIds.includes(newLessonId)) toIds.push(newLessonId);
  writes.push([`${toCourseId}_${targetSectionId}_lesson_ids`, JSON.stringify(toIds)]);

  // 4. Retire the original. Removing it from the section list already hides it,
  //    but the flag stops it resurfacing if that list is ever rebuilt from a
  //    static default.
  writes.push([`${oldLk}_deleted`, "1"]);

  return {
    writes,
    newLessonKey: newLk,
    newSlug,
    newPath: `/courses/${getCourseSlug(toCourseId, content)}/${newSlug}`,
  };
}
