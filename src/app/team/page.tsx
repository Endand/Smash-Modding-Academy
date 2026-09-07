"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";
import { useContentContext } from "@/components/content-provider";
import { createClient } from "@/lib/supabase/client";
import { buildCourseStructure, getEffectiveStatus, parseJSON } from "@/lib/courses/course-structure";
import { getCourseKeys, getCourseSlug, SEED_COURSE_IDS } from "@/lib/courses/course-utils";
import { roleColor, ADMIN_COLOR } from "@/lib/role-color";

interface Work {
  title: string;
  href: string;
}

interface CourseWork {
  courseId: string;
  courseTitle: string;
  wrote: Work[];
  edited: Work[];
}

interface Person {
  username: string;
  role: string | null;
  courses: CourseWork[];
  total: number;
}

// Staff groups appear in this order; anything unrecognised falls in after them.
const ROLE_ORDER = ["Admin", "Professor", "Assistant", "Editor"];
const UNGROUPED = "Contributors";

function badgeColor(role: string | null): string {
  if (!role) return "var(--accent-medium)";
  return role.toLowerCase() === "admin" ? ADMIN_COLOR : roleColor(role);
}

export default function TeamPage() {
  const { content } = useContentContext();
  const [staff, setStaff] = useState<Record<string, string> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Roles come from the staff_directory view, which is readable without an
  // account. If it has not been created yet the page still works: everyone
  // credited is listed, just without role grouping.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("staff_directory").select("username, role");
        if (cancelled) return;
        if (error || !data) {
          setStaff(null);
        } else {
          const map: Record<string, string> = {};
          for (const r of data as { username: string; role: string }[]) {
            if (r.username) map[r.username.trim().toLowerCase()] = r.role;
          }
          setStaff(map);
        }
      } catch {
        if (!cancelled) setStaff(null);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Who worked on what, read straight from the author and editor credits on
  // every published lesson, kept grouped by the course each lesson belongs to.
  // Nothing is maintained by hand, so the page follows the credits
  // automatically as lessons and staff change.
  const credited = useMemo(() => {
    const people = new Map<string, { username: string; courses: Map<string, CourseWork> }>();

    const add = (
      name: string,
      courseId: string,
      courseTitle: string,
      work: Work,
      kind: "wrote" | "edited"
    ) => {
      const key = name.trim().toLowerCase();
      if (!key) return;
      let p = people.get(key);
      if (!p) {
        p = { username: name.trim(), courses: new Map() };
        people.set(key, p);
      }
      let c = p.courses.get(courseId);
      if (!c) {
        c = { courseId, courseTitle, wrote: [], edited: [] };
        p.courses.set(courseId, c);
      }
      if (!c[kind].some((w) => w.href === work.href)) c[kind].push(work);
    };

    const courseIds: string[] = parseJSON(content["curriculum_course_ids"], SEED_COURSE_IDS);
    for (const courseId of courseIds) {
      if (content[`course_${courseId}_deleted`] === "1") continue;
      const courseSlug = getCourseSlug(courseId, content);
      const courseTitle = content[getCourseKeys(courseId).titleKey] ?? "Untitled course";
      const { allLessons } = buildCourseStructure(courseId, content);

      for (const lesson of allLessons) {
        // Published only: a visitor following a link to a draft would just hit
        // the "not published" gate.
        if (getEffectiveStatus(lesson.lessonKey, lesson.hasStaticContent, content) !== "published") continue;

        const work: Work = {
          title: content[`${lesson.lessonKey}_title`] ?? lesson.titleFallback,
          href: `/courses/${courseSlug}/${lesson.slug}`,
        };
        const author = (content[`${lesson.lessonKey}_author`] ?? "").trim();
        if (author) add(author, courseId, courseTitle, work, "wrote");
        (content[`${lesson.lessonKey}_editors`] ?? "")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((e) => add(e, courseId, courseTitle, work, "edited"));
      }
    }

    // Flatten, biggest contribution first at both levels.
    const out = new Map<string, Person>();
    for (const [key, p] of people) {
      const courses = [...p.courses.values()].sort(
        (a, b) =>
          b.wrote.length + b.edited.length - (a.wrote.length + a.edited.length) ||
          a.courseTitle.localeCompare(b.courseTitle)
      );
      const total = courses.reduce((n, c) => n + c.wrote.length + c.edited.length, 0);
      out.set(key, { username: p.username, role: null, courses, total });
    }
    return out;
  }, [content]);

  // Group by role. Somebody holding a role but credited on nothing is not
  // listed at all; somebody credited whose account is not in the directory is
  // still shown, so their work is not quietly dropped.
  const groups = useMemo(() => {
    const byRole = new Map<string, Person[]>();
    for (const p of credited.values()) {
      const role = staff?.[p.username.toLowerCase()] ?? null;
      const bucket = role ?? UNGROUPED;
      const list = byRole.get(bucket) ?? [];
      list.push({ ...p, role });
      byRole.set(bucket, list);
    }
    const rank = (name: string) => {
      const i = ROLE_ORDER.indexOf(name);
      if (i !== -1) return i;
      return name === UNGROUPED ? ROLE_ORDER.length + 1 : ROLE_ORDER.length;
    };
    return [...byRole.entries()]
      .map(([name, people]) => ({
        name,
        people: [...people].sort((a, b) => b.total - a.total || a.username.localeCompare(b.username)),
      }))
      .sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
  }, [credited, staff]);

  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
            About us
          </p>
          <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-5">
            <Editable as="span" contentKey="team_title" fallback="The team" />
          </h1>
          <Editable
            as="p"
            contentKey="team_body"
            fallback="Smash Modding Academy is written and maintained by modders from across the community. Everyone below has written or edited lessons on this site."
            className="text-[15px] leading-relaxed text-[var(--text-muted)] mb-14"
          />

          {!loaded ? (
            <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
              Loading the team.
            </p>
          ) : groups.length === 0 ? (
            <p className="text-[13px] italic" style={{ color: "var(--text-muted)", opacity: 0.5 }}>
              No lesson credits yet. Once a lesson lists an author, they show up here.
            </p>
          ) : (
            <div className="flex flex-col gap-12">
              {groups.map((g) => (
                <section key={g.name}>
                  <div className="flex items-center gap-3 mb-5">
                    <h2
                      className="font-mono text-[10px] uppercase tracking-widest"
                      style={{ color: badgeColor(g.name === UNGROUPED ? null : g.name) }}
                    >
                      {g.name === UNGROUPED ? UNGROUPED : `${g.name}s`}
                    </h2>
                    <div className="flex-1 h-px" style={{ background: "var(--border-color)" }} />
                    <span
                      className="font-mono text-[10px] uppercase tracking-widest opacity-40"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {g.people.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-6">
                    {g.people.map((p) => (
                      <PersonCard key={p.username} person={p} open={open} toggle={toggle} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function PersonCard({
  person, open, toggle,
}: {
  person: Person;
  open: Record<string, boolean>;
  toggle: (key: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-2.5">
        <span className="text-[15px]" style={{ color: "var(--text)" }}>
          @{person.username}
        </span>
        {person.role && (
          <span
            className="font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-[var(--radius-tag)]"
            style={{ color: badgeColor(person.role), border: `1px solid ${badgeColor(person.role)}` }}
          >
            {person.role}
          </span>
        )}
        <span
          className="font-mono text-[9px] uppercase tracking-widest opacity-40"
          style={{ color: "var(--text-muted)" }}
        >
          {person.courses.length} course{person.courses.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {person.courses.map((c) => {
          const key = `${person.username}|${c.courseId}`;
          const isOpen = !!open[key];
          return (
            <div key={c.courseId}>
              <button
                onClick={() => toggle(key)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-2 py-1.5 text-left cursor-pointer group"
              >
                {isOpen
                  ? <ChevronDown size={12} className="shrink-0" style={{ color: "var(--text-muted)" }} />
                  : <ChevronRight size={12} className="shrink-0" style={{ color: "var(--text-muted)" }} />}
                <span
                  className="text-[14px] capitalize transition-colors group-hover:text-[var(--text)]"
                  style={{ color: isOpen ? "var(--text)" : "var(--text-muted)" }}
                >
                  {c.courseTitle}
                </span>
                <span
                  className="ml-auto shrink-0 font-mono text-[9px] uppercase tracking-widest opacity-50"
                  style={{ color: "var(--text-muted)" }}
                >
                  {c.wrote.length > 0 && `${c.wrote.length} written`}
                  {c.wrote.length > 0 && c.edited.length > 0 && " · "}
                  {c.edited.length > 0 && `${c.edited.length} edited`}
                </span>
              </button>

              {isOpen && (
                <div
                  className="ml-[18px] pl-3 py-1 flex flex-col gap-1"
                  style={{ borderLeft: "1px solid var(--border-color)" }}
                >
                  {c.wrote.length > 0 && <WorkLine label="Wrote" items={c.wrote} />}
                  {c.edited.length > 0 && <WorkLine label="Edited" items={c.edited} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkLine({ label, items }: { label: string; items: Work[] }) {
  return (
    <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
      <span className="font-mono text-[9px] uppercase tracking-widest opacity-50 mr-2">{label}</span>
      {items.map((w, i) => (
        <span key={w.href}>
          <Link href={w.href} className="hover:underline capitalize" style={{ color: "var(--accent-medium)" }}>
            {w.title}
          </Link>
          {i < items.length - 1 && <span className="opacity-40">, </span>}
        </span>
      ))}
    </p>
  );
}
