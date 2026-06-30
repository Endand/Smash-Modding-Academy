"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "@/components/theme-provider";
import { createClient } from "@/lib/supabase/client";

const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

function validateUsername(value: string): string | null {
  if (value.length < MIN_LENGTH) return `Must be at least ${MIN_LENGTH} characters`;
  if (value.length > MAX_LENGTH) return `Must be ${MAX_LENGTH} characters or fewer`;
  if (!USERNAME_REGEX.test(value)) return "Only letters, numbers, and underscores";
  return null;
}

export function UsernameSetup() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const checkUniqueness = useCallback(async (value: string) => {
    const validationError = validateUsername(value);
    if (validationError) { setError(validationError); return; }
    setChecking(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", value.toLowerCase())
        .maybeSingle();
      setError(data ? "Username is already taken" : null);
    } catch (err) {
      console.error("[username] uniqueness check failed:", err);
      setError("Couldn't check availability. Try again.");
    } finally {
      setChecking(false);
    }
  }, []);

  const handleBlur = () => { if (username.length > 0) checkUniqueness(username); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, MAX_LENGTH);
    setUsername(value);
    if (error) {
      const v = validateUsername(value);
      setError(v || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateUsername(username);
    if (validationError) { setError(validationError); return; }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      if (existing) { setError("Username is already taken"); return; }
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user!.id,
        username: username.toLowerCase(),
      });
      if (insertError) {
        setError(insertError.code === "23505" ? "Username is already taken" : "Something went wrong. Try again.");
        return;
      }
      window.location.href = "/";
    } catch (err) {
      console.error("[username] submit failed:", err);
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div
        className="w-full max-w-sm p-8"
        style={{
          backgroundColor: "var(--surface)",
          borderRadius: "var(--radius-card)",
          border: theme === "dark" ? "1px solid var(--border-color)" : "none",
          boxShadow: theme === "light" ? "var(--shadow-medium)" : "none",
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
            <label htmlFor="username" className="block font-mono text-[11px] uppercase tracking-widest text-[var(--text-muted)] mb-2">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-mono text-sm">@</span>
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
                  border: error ? "1px solid #c67a5c" : "1px solid var(--border-strong)",
                }}
              />
            </div>
            <div className="mt-2 min-h-[20px]">
              {error && <p className="font-mono text-[11px] text-[#c67a5c]">{error}</p>}
              {checking && !error && <p className="font-mono text-[11px] text-[var(--text-muted)]">Checking availability...</p>}
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
