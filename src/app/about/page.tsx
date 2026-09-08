"use client";

import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Editable } from "@/components/editable-text";
import { DISCORD_URL } from "@/lib/support";

const SECTIONS = [
  {
    key: "about_who",
    heading: "Who makes it",
    fallback:
      "Everything here is written by modders who already work on Smash Ultimate mods, in their own time and for free. Nobody is paid to write lessons. When somebody works out how a tool behaves, or which step everybody gets stuck on, that knowledge usually stays in a Discord thread and gets lost. This site exists so it gets written down once and stays findable.",
  },
  {
    key: "about_why",
    heading: "Why it exists",
    fallback:
      "Smash modding has a real learning cliff. The tools assume you already know the file formats, the guides assume you already have a working setup, and the answers are scattered across servers, wikis and old forum posts. Working through it alone takes weeks. A structured path through the same material takes a fraction of that, and that path is what we are trying to build.",
  },
  {
    key: "about_how",
    heading: "How it works",
    fallback:
      "Courses are ordered so each one only assumes what came before it. Start with Master Consumer to learn to install and use mods properly, then pick a major and follow its recommended order. Lessons are free to read with no account. Signing in only adds progress tracking, so you can see how far through a course you are.",
  },
  {
    key: "about_free",
    heading: "Free, and staying that way",
    fallback:
      "Every lesson is free to read and there is no paywall planned. Running the site still costs money for hosting, the domain and image storage, which is covered by donations from people who found it useful. Nobody takes a wage from it.",
  },
  {
    key: "about_nintendo",
    heading: "Not affiliated with Nintendo",
    fallback:
      "Smash Modding Academy is an independent community project. It is not affiliated with, endorsed by, or connected to Nintendo, HAL Laboratory, Sora Ltd., or anyone else who holds rights in Super Smash Bros. Ultimate. Those names and characters belong to their owners and are referred to here only to teach about the game. We do not host game files, and we do not condone piracy.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Nav />
      <main className="pt-14 min-h-screen">
        <div className="max-w-2xl mx-auto px-6 md:px-10 py-16 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-4">
            About us
          </p>
          <h1 className="text-4xl font-extralight tracking-wide text-[var(--text)] mb-5">
            <Editable as="span" contentKey="about_title" fallback="About" />
          </h1>

          {/* Lead paragraph keeps the original about_body key */}
          <Editable
            contentKey="about_body"
            fallback="Smash Modding Academy is a free, community run site that teaches modding for Super Smash Bros. Ultimate, from installing your first mod to building your own."
            as="p"
            className="text-[15px] leading-relaxed text-[var(--text-muted)] mb-12"
          />

          <div className="flex flex-col gap-9">
            {SECTIONS.map((s) => (
              <section key={s.key}>
                <Editable
                  as="h2"
                  contentKey={`${s.key}_heading`}
                  fallback={s.heading}
                  className="text-[17px] font-light text-[var(--text)] mb-3"
                />
                <Editable
                  as="p"
                  contentKey={s.key}
                  fallback={s.fallback}
                  className="text-[14px] leading-relaxed text-[var(--text-muted)]"
                />
              </section>
            ))}
          </div>

          <div className="mt-14 pt-8 flex flex-col gap-2.5" style={{ borderTop: "1px solid var(--border-color)" }}>
            <Link href="/curriculum" className="text-[14px] hover:underline" style={{ color: "var(--accent-medium)" }}>
              Browse the curriculum →
            </Link>
            <Link href="/team" className="text-[14px] hover:underline" style={{ color: "var(--accent-medium)" }}>
              Meet the people who write it →
            </Link>
            <Link href="/contribute" className="text-[14px] hover:underline" style={{ color: "var(--accent-medium)" }}>
              Help build it →
            </Link>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[14px] hover:underline"
              style={{ color: "var(--accent-medium)" }}
            >
              Join the Discord →
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
