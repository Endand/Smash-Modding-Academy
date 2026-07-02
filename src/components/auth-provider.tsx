"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient, withTimeout } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  username: string;
  created_at: string;
  is_admin: boolean;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
      );
      if (error) {
        console.error("Profile fetch error:", error);
        return null;
      }
      return data as Profile | null;
    } catch (e) {
      console.error("Profile fetch exception:", e);
      return null;
    }
  };

  useEffect(() => {
    const supabase = createClient();

    // onAuthStateChange fires INITIAL_SESSION immediately from the local
    // cached session (no network call), so we don't also call getUser()
    // which makes a redundant round-trip and doubles the cold-start wait.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (!currentUser) {
        setProfile(null);
        setLoading(false);
        return;
      }
      // TOKEN_REFRESHED is background credential rotation — user and profile
      // haven't changed, skip re-fetch to avoid losing the admin badge.
      if (event === "TOKEN_REFRESHED") {
        setLoading(false);
        return;
      }
      const prof = await fetchProfile(currentUser.id);
      if (prof !== null) setProfile(prof);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // No client-side redirect — username setup is handled inline on the homepage

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
