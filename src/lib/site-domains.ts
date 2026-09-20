// Which hosts are this site.
//
// Lesson authors paste links by copying the address bar, so a lot of stored
// copy holds absolute URLs like https://smash-academy.vercel.app/courses/...
// The day the site moves to its own domain, every one of those keeps pointing
// at the old host. Rewriting the stored text would fix the links written so
// far and none of the ones written afterwards.
//
// Instead, a link whose host is on this list renders as a path on whatever
// domain is serving the page. The host in the stored text stops mattering,
// and a move costs one entry in the admin panel rather than a migration.

export const SITE_DOMAINS_KEY = "site_domains";

// The host the site launched on. Kept as a default so the links written before
// any of this existed keep working even if the setting is never filled in.
const BUILT_IN = ["smash-academy.vercel.app"];

// Module-level rather than passed through: renderInline is called from a dozen
// components and is not a hook. ContentProvider sets this during render, on the
// server and the client alike, so both produce the same markup.
let domains: string[] = BUILT_IN;

export function parseSiteDomains(stored: string | undefined): string[] {
  const listed = (stored ?? "")
    .split(/[\s,]+/)
    .map((d) => d.trim().toLowerCase())
    // Tolerate a full URL being pasted in instead of a bare host.
    .map((d) => d.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter((d) => d.includes("."));
  return [...new Set([...BUILT_IN, ...listed])];
}

export function setSiteDomains(list: string[]): void {
  domains = list;
}

export function getSiteDomains(): string[] {
  return domains;
}

/**
 * The same-site path for `url`, or null if it points somewhere else.
 *
 * Deliberately ignores the browser's current location: the result has to match
 * between the server render and the client one, and the server does not know
 * the host the reader typed. The list is the single source of truth.
 */
export function toInternalPath(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!domains.includes(u.hostname.toLowerCase())) return null;
    return `${u.pathname}${u.search}${u.hash}` || "/";
  } catch {
    return null;
  }
}
