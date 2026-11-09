import type { HazardReport } from "@/lib/types";

const OFFLINE_KEY = "disasternear.offline";
const RECENT_KEY = "disasternear.recent";
const SEEN_KEY = "disasternear.seen";
const RECENT_MS = 20_000;

type StoredReport = {
  at: number;
  report: HazardReport;
};

export function samePoint(
  left: { latitude: number; longitude: number },
  right: { latitude: number; longitude: number },
): boolean {
  return left.latitude.toFixed(5) === right.latitude.toFixed(5)
    && left.longitude.toFixed(5) === right.longitude.toFixed(5);
}

export function storeReport(report: HazardReport): void {
  const payload = JSON.stringify({ at: Date.now(), report } satisfies StoredReport);
  try {
    window.localStorage.setItem(OFFLINE_KEY, payload);
    window.sessionStorage.setItem(RECENT_KEY, payload);
  } catch {
    return;
  }
  const worker = navigator.serviceWorker?.controller;
  worker?.postMessage({ type: "cache-report", report });
}

export function readRecentReport(origin: { latitude: number; longitude: number }): HazardReport | null {
  const stored = readStored(RECENT_KEY, window.sessionStorage);
  if (!stored) return null;
  if (Date.now() - stored.at > RECENT_MS) return null;
  if (!samePoint(stored.report.origin, origin)) return null;
  return stored.report;
}

export function readOfflineReport(origin: { latitude: number; longitude: number }): HazardReport | null {
  const stored = readStored(OFFLINE_KEY, window.localStorage);
  if (!stored || !samePoint(stored.report.origin, origin)) return null;
  return stored.report;
}

export function readSeenIds(): string[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(SEEN_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(-200) : [];
  } catch {
    return [];
  }
}

export function writeSeenIds(ids: string[]): void {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-200)));
  } catch {
    return;
  }
}

function readStored(key: string, storage: Storage): StoredReport | null {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "null") as StoredReport | null;
    if (!parsed?.report?.origin || typeof parsed.at !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}
