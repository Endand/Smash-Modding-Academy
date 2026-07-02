"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient, withTimeout } from "@/lib/supabase/client";

type ContentMap = Record<string, string>;

interface ContentContextValue {
  content: ContentMap;
  updateContent: (key: string, value: string) => Promise<void>;
}

const ContentContext = createContext<ContentContextValue>({
  content: {},
  updateContent: async () => {},
});

export function useContentContext(): ContentContextValue {
  return useContext(ContentContext);
}

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [content, setContent] = useState<ContentMap>({});

  useEffect(() => {
    const supabase = createClient();

    // Initial load — retry once if the first attempt times out (Supabase
    // free-tier cold starts can take longer than a single timeout window).
    const loadContent = async () => {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const { data, error } = await withTimeout(
            supabase.from("site_content").select("key, value"),
            30000
          );
          if (error) throw error;
          if (data && data.length > 0) {
            setContent(Object.fromEntries(data.map((r) => [r.key, r.value])));
          }
          return;
        } catch (err) {
          console.warn(`[content] load attempt ${attempt} failed:`, err);
          if (attempt < 2) await new Promise((r) => setTimeout(r, 3000));
        }
      }
    };
    loadContent();

    // Real-time: any INSERT or UPDATE propagates immediately to all clients
    const channel = supabase
      .channel("site_content_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const { key, value } = payload.new as { key: string; value: string };
            setContent((prev) => ({ ...prev, [key]: value }));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateContent = useCallback(async (key: string, value: string) => {
    const supabase = createClient();
    // Optimistic local update so the editing user sees it instantly
    setContent((prev) => ({ ...prev, [key]: value }));
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await withTimeout(
        supabase.from("site_content").upsert(
          { key, value, updated_at: new Date().toISOString(), updated_by: user?.id ?? null },
          { onConflict: "key" }
        )
      );
    } catch (err) {
      console.error("[content] save failed:", err);
    }
  }, []);

  return (
    <ContentContext.Provider value={{ content, updateContent }}>
      {children}
    </ContentContext.Provider>
  );
}
