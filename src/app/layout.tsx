import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { ContentProvider } from "@/components/content-provider";
import { ProgressProvider } from "@/components/progress-provider";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/components/auth-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smash Modding Academy — Learn Super Smash Bros. Ultimate Modding",
  description:
    "A free, structured curriculum for learning Super Smash Bros. Ultimate character modding — from setting up your tools to building custom fighters from scratch.",
  icons: {
    icon: "/favicon.svg",
  },
};

// PostgREST caps a single select at 1000 rows, so page through everything —
// otherwise courses whose keys sort last silently lose their saved content.
async function fetchAllContent(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ key: string; value: string }[]> {
  const pageSize = 1000;
  const all: { key: string; value: string }[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("site_content")
      .select("key, value")
      .order("key", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as { key: string; value: string }[]));
    if (data.length < pageSize) break;
  }
  return all;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  // Fetch auth and content in parallel — this runs server-side so data is
  // baked into the initial HTML with no client-side loading flash.
  const [{ data: { user } }, contentRows] = await Promise.all([
    supabase.auth.getUser(),
    fetchAllContent(supabase),
  ]);

  let initialProfile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    initialProfile = data as Profile | null;
  }

  const initialContent: Record<string, string> = contentRows
    ? Object.fromEntries(contentRows.map((r: { key: string; value: string }) => [r.key, r.value]))
    : {};

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider initialUser={user ?? null} initialProfile={initialProfile}>
            <ContentProvider initialContent={initialContent}>
              <ProgressProvider>
                {children}
              </ProgressProvider>
            </ContentProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
