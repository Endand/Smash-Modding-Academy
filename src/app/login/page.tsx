"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";

export default function LoginPage() {
  const { user, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleOAuth = async (provider: "google" | "github" | "discord") => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  if (loading || user) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-[var(--text-muted)] font-mono text-[11px] uppercase tracking-widest">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
      <div
        className="w-full max-w-sm p-8"
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-card)",
          border:
            theme === "dark" ? "1px solid var(--border-color)" : "none",
          boxShadow:
            theme === "light" ? "var(--shadow-medium)" : "none",
        }}
      >
        <div className="mb-8">
          <Link
            href="/"
            className="text-lg font-extralight tracking-wide text-[var(--text)]"
          >
            Smash Modding Academy
          </Link>
          <p className="mt-2 text-[var(--text-muted)] text-sm">
            Sign in to continue
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => handleOAuth("google")}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--text)] cursor-pointer transition-colors"
            style={{
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--border-strong)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--text-muted)";
              e.currentTarget.style.backgroundColor =
                theme === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "var(--surface-raised)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 001 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <button
            onClick={() => handleOAuth("github")}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--text)] cursor-pointer transition-colors"
            style={{
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--border-strong)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--text-muted)";
              e.currentTarget.style.backgroundColor =
                theme === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "var(--surface-raised)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>

          <button
            onClick={() => handleOAuth("discord")}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--text)] cursor-pointer transition-colors"
            style={{
              borderRadius: "var(--radius-button)",
              border: "1px solid var(--border-strong)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--text-muted)";
              e.currentTarget.style.backgroundColor =
                theme === "dark"
                  ? "rgba(255,255,255,0.05)"
                  : "var(--surface-raised)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-strong)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2">
              <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.1.246.198.373.292a.077.077 0 0 1-.006.127c-.598.35-1.22.645-1.873.893a.076.076 0 0 0-.041.106c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            Continue with Discord
          </button>
        </div>

        <p className="mt-6 text-center text-[var(--text-muted)] text-xs">
          By continuing, you agree to our terms of service.
        </p>
      </div>
    </div>
  );
}
