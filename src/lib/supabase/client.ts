import { createBrowserClient } from "@supabase/ssr";
import { processLock } from "@supabase/auth-js";

const REQUEST_TIMEOUT_MS = 30000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: fetchWithTimeout },
      // Every request first reads the session under an auth lock. By default
      // that is a browser-wide Web Lock shared by every open tab of the site,
      // and when auth-js waits too long for it, it takes it with
      // `steal: true`, which aborts whatever request held it:
      // "AbortError: Lock broken by another request with the 'steal' option".
      // With a lesson open in one tab and the course page in another, that was
      // dropping saves. processLock scopes the lock to this tab, so tabs stop
      // aborting each other's requests.
      auth: { lock: processLock },
    }
  );
}

// Races a promise against a hard timeout so callers never hang, regardless
// of whether the underlying request actually honors cancellation.
export function withTimeout<T>(promise: PromiseLike<T>, ms = 10000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// An abort from the auth lock happens before the request is sent, so the
// request never reached the server and is safe to send again.
function isLockAbort(err: unknown): boolean {
  if (!err) return false;
  const e = err as { name?: string; message?: string };
  return e.name === "AbortError" || /AbortError|Lock broken/i.test(`${e.message ?? ""} ${String(err)}`);
}

/**
 * Runs a Supabase request, retrying it if it was aborted by the auth lock.
 *
 * Takes a factory rather than a promise because a Supabase query builder
 * runs once when awaited: retrying means building it again. Aborts can
 * arrive either thrown or as a returned `{ error }`, so both are checked.
 * Anything else, including a genuine timeout, is passed straight through.
 */
export async function withRetry<T>(
  make: () => PromiseLike<T>,
  { attempts = 3, ms = 10000 }: { attempts?: number; ms?: number } = {}
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 250 * i));
    const final = i === attempts - 1;
    try {
      const result = await withTimeout(make(), ms);
      const err = (result as { error?: unknown } | null)?.error;
      if (err && isLockAbort(err) && !final) {
        last = err;
        continue;
      }
      return result;
    } catch (err) {
      last = err;
      if (!isLockAbort(err) || final) throw err;
    }
  }
  throw last;
}
