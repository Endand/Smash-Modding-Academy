# Smash Modding Academy

A free, community run course site that teaches modding for Super Smash Bros.
Ultimate, from installing your first mod to writing your own code.

Live at **[smash-academy.vercel.app](https://smash-academy.vercel.app)**.

Smash modding has a real learning cliff. The tools assume you already know the
file formats, the guides assume you already have a working setup, and the
answers are scattered across Discord servers, wikis and old forum posts. This
site is an attempt to write that knowledge down once, in an order that makes
sense, and keep it current.

## How the site works

The unusual part is that **lessons are written on the live site, not in this
repository**. Signed in staff click any piece of text and edit it in place.
There is no CMS, no markdown files to commit, and no rebuild.

Every editable string lives in a `site_content` table in Supabase, keyed by a
path like `character-modding_ldyn_1788491515220_s3_p0`, meaning course, lesson,
section, paragraph. The app reads that table on the server, renders the page,
and writes changes straight back. What is in this repository is the machinery
around that: the page structure, the editing tools, and the rules about who may
change what.

The consequence worth knowing before you dig in: **almost nothing you see on
the site is in the code.** Lesson text, course names, categories and the
curriculum order are all rows in the database.

### The pieces

- **Courses and lessons.** A curriculum of courses, grouped into categories
  (Modeling, Animation, Coding, Others) with a featured starting course.
  Lessons hold sections, paragraphs, and blocks: code with syntax highlighting,
  images, video embeds, file attachments and tables.
- **Roles and scoped permissions.** Admins grant a professor, assistant or
  editor access to a specific course or lesson. Permissions apply only inside
  what they were granted.
- **An approval queue.** An editor's changes do not go live. They queue as
  proposals for someone with approval rights on that lesson, who applies or
  rejects them as a batch.
- **Preview links.** A secret link that opens an unpublished lesson for
  someone with no account, optionally expiring after a day or a week.
- **Project submissions.** Project lessons can invite learners to post their
  work: screenshots, a video link, a repository and the built files.
- **A team page** built automatically from the author and editor credits on
  published lessons, so nobody has to maintain a list of contributors.

## Stack

- [Next.js 16](https://nextjs.org) (App Router) and React 19
- TypeScript, strict
- Tailwind CSS v4
- [Supabase](https://supabase.com) for Postgres, auth and file storage
- Deployed on Vercel, on every push to `main`

## Running it locally

You will need Node 20 or newer and a Supabase project.

```bash
npm install
```

Create `.env.local` with your Supabase project's URL and anon key, both found
under Project Settings, API:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

Then:

```bash
npm run dev
```

The site runs at [http://localhost:3000](http://localhost:3000), reading from
whichever Supabase project you pointed it at.

### Database setup

The SQL in `supabase/` is applied by hand in the Supabase SQL Editor, in this
order. Each file is additive and safe to re-run.

| File | What it adds |
| --- | --- |
| `profiles_schema.sql` | User profiles and usernames |
| `admin_schema.sql` | The `is_admin` flag and the `site_content` table |
| `features_schema.sql` | Roles, lesson progress, image storage |
| `revisions_schema.sql` | The edit approval queue |
| `staff_schema.sql` | The public staff directory the team page reads |
| `submissions_schema.sql` | Project submissions and their storage buckets |
| `submission_bans_schema.sql` | The admin ban on posting submissions |

Sign in once to create your profile, then set yourself as an admin:

```sql
UPDATE public.profiles SET is_admin = true WHERE username = '<your-username>';
```

Admin tools then appear on the site itself, under `/admin`.

## Layout

```
src/app/          Routes. Courses and lessons are dynamic: /courses/[courseSlug]/[lessonSlug]
src/components/   The editing system, lesson rendering, navigation, submissions
src/lib/          Content key conventions, permissions helpers, uploads, markdown
src/hooks/        Permission and course structure hooks
supabase/         SQL migrations, applied by hand
```

## Contributing

The most useful contribution is not code. Modding tools change constantly, so
lessons go stale: a button gets renamed, a download moves, a step stops
working. If something did not match what you saw on screen, say so. See
[the contribute page](https://smash-academy.vercel.app/contribute) for the ways
to help, including writing lessons, which needs no Git at all.

For code, open an issue before a large change. Much of what looks like a
missing feature is a deliberate constraint of the in-place editing model.

## A note on scope

This site teaches modding. It does not host game files, and it does not help
anyone obtain them.

Smash Modding Academy is an independent community project. It is not
affiliated with, endorsed by, or connected to Nintendo, HAL Laboratory, Sora
Ltd., or anyone else holding rights in Super Smash Bros. Ultimate. Those names
are used only to describe what the site teaches about.
