"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

export function Nav() {
  const { theme } = useTheme();
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = profile?.username
    ? `@${profile.username}`
    : user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email;
  const initials = displayName
    ? displayName
        .replace(/^@/, "")
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg)]"
      style={{
        borderBottom:
          theme === "dark" ? "1px solid var(--border-color)" : "none",
        boxShadow:
          theme === "light" ? "0 1px 3px rgba(45,41,38,0.06)" : "none",
      }}
    >
      <div className="w-full px-6 md:px-10 lg:px-16 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-lg font-extralight tracking-wide text-[var(--text)]"
          >
            Smash Academy
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            <Link
              href="/"
              className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Home
            </Link>
            <Link
              href="/about"
              className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              About
            </Link>
            <Link
              href="/curriculum"
              className="font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
            >
              Curriculum
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {loading ? (
            <div className="w-[72px]" />
          ) : user ? (
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono uppercase"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {initials}
                </div>
              )}
              {profile?.username && (
                <span className="hidden sm:inline font-mono text-[12px] text-[var(--text-muted)]">
                  @{profile.username}
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="font-mono text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-[var(--radius-button)] border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="font-mono text-[11px] uppercase tracking-widest px-4 py-1.5 rounded-[var(--radius-button)] border border-[var(--border-strong)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)] transition-colors cursor-pointer"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
