"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient, withTimeout } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  username: string;
  created_at: string;
  is_admin: boolean;
  role: string | null;
  /** Banned by an admin from posting project submissions. Optional because
   *  the column is added by a later migration; missing reads as not banned. */
  submissions_banned?: boolean;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser: User | null;
  initialProfile: Profile | null;
}

export function AuthProvider({ children, initialUser, initialProfile }: AuthProviderProps) {
  // Initialised from server-fetched data — no loading flash.
  const [user, setUser] = useState<User | null>(initialUser);
  const [profile, setProfile] = useState<Profile | null>(initialProfile);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
      );
      if (error) return null;
      return data as Profile | null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setProfile(null);
        return;
      }

      // INITIAL_SESSION fires on mount with the same session already loaded
      // from the server — skip re-fetching profile we already have.
      // TOKEN_REFRESHED is background credential rotation — profile unchanged.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
        return;
      }

      // SIGNED_IN (OAuth redirect, etc.) — fetch the profile for the new user.
      const prof = await fetchProfile(currentUser.id);
      if (prof !== null) setProfile(prof);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
