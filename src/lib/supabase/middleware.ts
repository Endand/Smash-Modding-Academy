import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // If user is logged in and not on setup-username or auth routes, check for profile
  if (
    user &&
    pathname !== "/setup-username" &&
    !pathname.startsWith("/auth/") &&
    pathname !== "/login"
  ) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    // Only redirect when we're certain the profile doesn't exist.
    // On any query error (network, RLS, timeout) we let the request through
    // to avoid trapping users in a redirect loop.
    if (!profileError && !profile) {
      const url = request.nextUrl.clone();
      url.pathname = "/setup-username";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
