"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

function validateUsername(value: string): string | null {
  if (value.length < MIN_LENGTH) {
    return `Must be at least ${MIN_LENGTH} characters`;
  }
  if (value.length > MAX_LENGTH) {
    return `Must be ${MAX_LENGTH} characters or fewer`;
  }
  if (!USERNAME_REGEX.test(value)) {
    return "Only letters, numbers, and underscores";
  }
  return null;
}

export default function SetupUsernamePage() {
  const { user, profile, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if not logged in or already has profile
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && user && profile) {
      router.replace("/");
    }
  }, [loading, user, profile, router]);

  const checkUniqueness = useCallback(async (value: string) => {
    const validationError = validateUsername(value);
    if (validationError) {
      setError(validationError);
      return;
    }

    setChecking(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", value.toLowerCase())
      .maybeSingle();

    if (data) {
      setError("Username is already taken");
    } else {
      setError(null);
    }
    setChecking(false);
  }, []);

  const handleBlur = () => {
    if (username.length > 0) {
      checkUniqueness(username);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, MAX_LENGTH);
    setUsername(value);
    if (error) {
      const validationError = validateUsername(value);
      if (!validationError) {
        setError(null);
      } else {
        setError(validationError);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    // Check uniqueness one more time
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase())
      .maybeSingle();

    if (existing) {
      setError("Username is already taken");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("profiles").insert({
      id: user!.id,
      username: username.toLowerCase(),
    });

    if (insertError) {
      if (insertError.code === "23505") {
        setError("Username is already taken");
      } else {
        setError("Something went wrong. Try again.");
      }
      setSubmitting(false);
      return;
    }

    // Force a full reload so the auth provider re-fetches the profile
    window.location.href = "/";
  };

  if (loading || !user || profile) {
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
          <h1 className="text-2xl font-extralight tracking-wide text-[var(--text)]">
            Choose your username
          </h1>
          <p className="mt-2 text-[var(--text-muted)] text-sm">
            This is how other modders will know you
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="username"
              className="block font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-2"
            >
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono text-sm">
                @
              </span>
              <input
                id="username"
                type="text"
                value={username}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="your_username"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                maxLength={MAX_LENGTH}
                className="w-full pl-8 pr-4 py-2.5 font-mono text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] bg-transparent outline-none transition-colors"
                style={{
                  borderRadius: "var(--radius-button)",
                  border: error
                    ? "1px solid #c67a5c"
                    : "1px solid var(--border-strong)",
                }}
                onFocus={(e) => {
                  if (!error) {
                    e.currentTarget.style.borderColor = "var(--accent-medium)";
                  }
                }}
                onBlurCapture={(e) => {
                  if (!error) {
                    e.currentTarget.style.borderColor = "var(--border-strong)";
                  }
                }}
              />
            </div>
            <div className="mt-2 min-h-[20px]">
              {error && (
                <p className="font-mono text-[11px] text-[#c67a5c]">
                  {error}
                </p>
              )}
              {checking && !error && (
                <p className="font-mono text-[11px] text-[var(--text-muted)]">
                  Checking availability...
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || checking || !!error || username.length < MIN_LENGTH}
            className="w-full px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              borderRadius: "var(--radius-button)",
              backgroundColor: "var(--accent)",
              color: "#fff",
              border: "none",
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.backgroundColor = "var(--accent-medium)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--accent)";
            }}
          >
            {submitting ? "Setting up..." : "Continue"}
          </button>
        </form>

        <p className="mt-4 text-center text-[var(--text-muted)] text-xs">
          3–20 characters · letters, numbers, underscores
        </p>
      </div>
    </div>
  );
}
