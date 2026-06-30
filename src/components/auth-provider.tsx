"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient, withTimeout } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  username: string;
  created_at: string;
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

    withTimeout(supabase.auth.getUser())
      .then(async ({ data: { user }, error }) => {
        console.log("[auth] getUser result:", { user: user?.id, error });
        setUser(user);
        if (user) {
          const prof = await fetchProfile(user.id);
          console.log("[auth] profile result:", prof);
          setProfile(prof);
        }
        setLoading(false);
        console.log("[auth] loading set to false");
      })
      .catch((err) => {
        console.error("[auth] getUser exception:", err);
        setLoading(false);
      });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        const prof = await fetchProfile(currentUser.id);
        setProfile(prof);
      } else {
        setProfile(null);
      }
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
