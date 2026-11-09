import { UpstreamError } from "@/lib/errors";
import { USER_AGENT } from "@/lib/types";

export async function fetchJson(url: string, timeoutMs = 8000): Promise<{ status: number; body: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const init: RequestInit & { next?: { revalidate: number } } = {
      signal: controller.signal,
      headers: {
        Accept: "application/geo+json, application/json",
        "User-Agent": USER_AGENT,
      },
    };
    if (process.env.NEXT_RUNTIME) init.next = { revalidate: 30 };
    const response = await fetch(url, init);
    if (response.status === 204) return { status: 204, body: null };
    const body = await response.json().catch(() => null);
    return { status: response.status, body };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamError("A source took too long to respond.");
    }
    throw new UpstreamError("A source could not be reached.");
  } finally {
    clearTimeout(timer);
  }
}

const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export function clientKey(header: string | null): string {
  const forwarded = header?.split(",")[0]?.trim();
  return forwarded || "local";
}
