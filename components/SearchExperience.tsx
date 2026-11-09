"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AlertList from "@/components/AlertList";
import HazardMap from "@/components/HazardMap";
import SourceStatus from "@/components/SourceStatus";
import SupplementaryPanels from "@/components/SupplementaryPanels";
import { readOfflineReport, readRecentReport, readSeenIds, samePoint, storeReport, writeSeenIds } from "@/lib/browser-store";
import { NOTIFY_NOTE, NO_GUARANTEE, OFFLINE_COPY, precisionNote } from "@/lib/copy";
import { nwsOfficeUrl } from "@/lib/links";
import { rememberLocation, type SavedLocation } from "@/lib/map-data";
import { notificationCopy, rememberSeen, unseenSevere } from "@/lib/monitor";
import { formatOfficialTime } from "@/lib/time";
import type { GeocodeHit, HazardReport, OfficialAlert, Precision } from "@/lib/types";

const SAVED_KEY = "disasternear.saved";

export type InitialQuery = {
  lat: number;
  lon: number;
  label: string;
  precision: Precision;
};

export default function SearchExperience({ initial }: { initial: InitialQuery | null }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState(initial?.label ?? "");
  const [suggestions, setSuggestions] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState("");
  const [refreshNote, setRefreshNote] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [notifyNote, setNotifyNote] = useState("");
  const [report, setReport] = useState<HazardReport | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedLocation[]>([]);
  const requestId = useRef(0);
  const started = useRef(false);
  const reportRef = useRef<HazardReport | null>(null);
  const savedRef = useRef<SavedLocation[]>([]);
  const seenRef = useRef<string[]>([]);
  const initialized = useRef(new Set<string>());
  reportRef.current = report;
  savedRef.current = saved;

  const loadHazards = useCallback(async (hit: Pick<GeocodeHit, "label" | "latitude" | "longitude" | "precision">, reason: "search" | "refresh") => {
    const id = ++requestId.current;
    if (reason === "search") {
      const recent = readRecentReport(hit);
      if (recent) {
        setReport(recent);
        setFromCache(false);
        setError("");
        setLoading(false);
        setLocating(false);
        replaceUrl(hit);
        return;
      }
      setLoading(true);
      setError("");
      setRefreshNote("");
      setFromCache(false);
      setActiveId(null);
    }
    const params = new URLSearchParams({
      lat: String(hit.latitude),
      lon: String(hit.longitude),
      label: hit.label,
      precision: hit.precision,
    });
    try {
      const response = await fetch(`/api/hazards?${params.toString()}`);
      const body = await response.json() as HazardReport & { error?: string };
      if (id !== requestId.current) return;
      if (!response.ok) throw new Error(body.error || "Hazard information could not be loaded.");
      setReport(body);
      setFromCache(false);
      storeReport(body);
      observe(body);
      if (reason === "search") replaceUrl(hit);
      setRefreshNote("");
    } catch (cause) {
      if (id !== requestId.current) return;
      const message = cause instanceof Error ? cause.message : "Hazard information could not be loaded.";
      const cached = readOfflineReport(hit);
      if (reason === "refresh" && reportRef.current) {
        setFromCache(true);
        setRefreshNote(`Could not refresh. Showing results retrieved at ${formatOfficialTime(reportRef.current.retrievedAt, reportRef.current.timeZone) ?? reportRef.current.retrievedAt}. ${OFFLINE_COPY}`);
      } else if (cached) {
        setReport(cached);
        setFromCache(true);
        setError("");
      } else {
        setError(message);
      }
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setLocating(false);
      }
    }
    function replaceUrl(place: { label: string; latitude: number; longitude: number; precision: Precision }) {
      const next = `/?${new URLSearchParams({
        lat: String(place.latitude),
        lon: String(place.longitude),
        label: place.label,
        precision: place.precision,
      }).toString()}`;
      if (`${window.location.pathname}${window.location.search}` !== next) {
        router.replace(next, { scroll: false });
      }
    }

    function observe(body: HazardReport) {
      const watched = savedRef.current.some((item) => item.notify && samePoint(item, body.origin));
      if (!watched) return;
      const key = `${body.origin.latitude.toFixed(5)},${body.origin.longitude.toFixed(5)}`;
      if (!initialized.current.has(key)) {
        initialized.current.add(key);
        seenRef.current = rememberSeen(seenRef.current, body.alerts);
        writeSeenIds(seenRef.current);
        postWatch();
        return;
      }
      const fresh = unseenSevere(body.alerts, seenRef.current);
      seenRef.current = rememberSeen(seenRef.current, body.alerts);
      writeSeenIds(seenRef.current);
      postWatch();
      for (const alert of fresh) void showNotification(alert, body.origin);
    }
  }, [router]);

  useEffect(() => {
    if (started.current || !initial) return;
    started.current = true;
    void loadHazards({
      label: initial.label,
      latitude: initial.lat,
      longitude: initial.lon,
      precision: initial.precision,
    }, "search");
  }, [initial, loadHazards]);

  useEffect(() => {
    if (!report) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadHazards(report.origin, "refresh");
    }, 120_000);
    return () => window.clearInterval(timer);
  }, [report, loadHazards]);

  useEffect(() => {
    seenRef.current = readSeenIds();
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SAVED_KEY) ?? "[]") as SavedLocation[];
      if (Array.isArray(parsed)) setSaved(parsed.slice(0, 5));
    } catch {
      setSaved([]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const current = reportRef.current?.origin;
      for (const item of savedRef.current) {
        if (!item.notify || (current && samePoint(item, current))) continue;
        void fetchQuiet(item);
      }
    }, 600_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      const response = await fetch(`/api/geocode?suggest=1&q=${encodeURIComponent(trimmed)}`);
      if (!response.ok) return;
      const body = await response.json() as { suggestions?: GeocodeHit[] };
      setSuggestions(body.suggestions ?? []);
      setOpen(true);
      setActive(-1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setOpen(false);
    setError("");
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
    const body = await response.json() as GeocodeHit & { error?: string };
    if (!response.ok) {
      setError(body.error || "That location could not be found. Try a street address or another ZIP code.");
      return;
    }
    await loadHazards(body, "search");
  }

  function choose(hit: GeocodeHit) {
    setQuery(hit.label);
    setOpen(false);
    void loadHazards(hit, "search");
  }

  function locate() {
    setError("");
    if (!window.isSecureContext) {
      setError("Location requires a secure page. Enter a ZIP code or street address.");
      return;
    }
    if (!navigator.geolocation) {
      setError("This browser does not support location. Enter a ZIP code or street address.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadHazards({
          label: "Device location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          precision: "device",
        }, "search");
      },
      (failure) => {
        setLocating(false);
        setError(failure.code === 1
          ? "Location permission was denied. Enter a ZIP code or street address."
          : "Your location could not be determined. Enter a ZIP code or street address.");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function saveLocation() {
    if (!report) return;
    persistSaved(rememberLocation(saved, report.origin));
  }

  function removeSaved(item: SavedLocation) {
    persistSaved(saved.filter((savedItem) => !samePoint(savedItem, item)));
  }

  function persistSaved(next: SavedLocation[]) {
    setSaved(next);
    savedRef.current = next;
    window.localStorage.setItem(SAVED_KEY, JSON.stringify(next));
    postWatch(next);
  }

  async function toggleNotify() {
    if (!report) return;
    const current = saved.find((item) => samePoint(item, report.origin));
    if (current?.notify) {
      persistSaved(saved.map((item) => samePoint(item, report.origin) ? { ...item, notify: false } : item));
      setNotifyNote("Notifications are off for this location.");
      return;
    }
    if (!("Notification" in window)) {
      setNotifyNote("This browser does not support notifications. The page still checks while it is open.");
      return;
    }
    const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    if (permission !== "granted") {
      setNotifyNote("Notification permission was denied. DisasterNear will not send a browser notification.");
      return;
    }
    const next = rememberLocation(saved, { ...report.origin, notify: true });
    const key = `${report.origin.latitude.toFixed(5)},${report.origin.longitude.toFixed(5)}`;
    initialized.current.add(key);
    seenRef.current = rememberSeen(seenRef.current, report.alerts);
    writeSeenIds(seenRef.current);
    persistSaved(next);
    const background = await registerPeriodic();
    setNotifyNote(background
      ? "Notifications are on. Current Severe and Extreme alerts are marked as seen. A new official alert can notify this browser while the page is open, and in the background when the browser allows it."
      : "Notifications are on while this page is open. Current Severe and Extreme alerts are marked as seen. This browser did not allow a background check.");
  }

  const watching = report ? saved.some((item) => item.notify && samePoint(item, report.origin)) : false;

  function postWatch(list = savedRef.current) {
    const locations = list.filter((item) => item.notify).slice(0, 5);
    navigator.serviceWorker?.ready.then((registration) => {
      registration.active?.postMessage({ type: "watch", locations, seen: seenRef.current });
    }).catch(() => undefined);
  }

  async function fetchQuiet(item: SavedLocation) {
    const params = new URLSearchParams({
      lat: String(item.latitude),
      lon: String(item.longitude),
      label: item.label,
      precision: item.precision,
    });
    try {
      const response = await fetch(`/api/hazards?${params.toString()}`);
      if (!response.ok) return;
      const body = await response.json() as HazardReport;
      const key = `${body.origin.latitude.toFixed(5)},${body.origin.longitude.toFixed(5)}`;
      if (!initialized.current.has(key)) {
        initialized.current.add(key);
        seenRef.current = rememberSeen(seenRef.current, body.alerts);
        writeSeenIds(seenRef.current);
        postWatch();
        return;
      }
      const fresh = unseenSevere(body.alerts, seenRef.current);
      seenRef.current = rememberSeen(seenRef.current, body.alerts);
      writeSeenIds(seenRef.current);
      postWatch();
      for (const alert of fresh) void showNotification(alert, body.origin);
    } catch {
      return;
    }
  }

  const office = report ? nwsOfficeUrl(report.officeId) : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="rounded-3xl border border-line bg-card p-5 sm:p-8">
        <h1 className="font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Know hazards around your location</h1>
        <p className="mt-3 max-w-3xl text-lg">Check a U.S. ZIP code, city, or street address. Active alerts come from the National Weather Service. Earthquake records and FEMA declarations are shown separately.</p>
        <form className="mt-6" role="search" onSubmit={onSubmit}>
          <label className="font-bold" htmlFor="place">ZIP code, city, or street address</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1">
              <input
                id="place"
                className="min-h-12 w-full rounded-2xl border border-line bg-paper px-4 text-base"
                role="combobox"
                aria-expanded={open && suggestions.length > 0}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
                value={query}
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (!open || !suggestions.length) return;
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActive((index) => Math.min(suggestions.length - 1, index + 1));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActive((index) => Math.max(0, index - 1));
                  } else if (event.key === "Escape") {
                    setOpen(false);
                  } else if (event.key === "Enter" && active >= 0 && suggestions[active]) {
                    event.preventDefault();
                    choose(suggestions[active]);
                  }
                }}
              />
              {open && suggestions.length ? (
                <ul id={listId} role="listbox" className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-line bg-card p-1 shadow-lg">
                  {suggestions.map((suggestion, index) => (
                    <li key={`${suggestion.label}-${suggestion.latitude}`} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                      <button type="button" className={`w-full rounded-xl px-3 py-3 text-left ${index === active ? "bg-moss" : ""}`} onClick={() => choose(suggestion)}>
                        {suggestion.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <button type="submit" className="min-h-12 rounded-full bg-pine px-5 font-bold text-card" disabled={loading}>
              {loading ? "Checking…" : "Check hazards"}
            </button>
          </div>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-full border border-pine px-4 font-bold" onClick={locate} disabled={locating}>
            {locating ? "Finding location…" : "Use my location"}
          </button>
        </div>
        {error ? <p className="mt-3 font-bold" role="alert">{error}</p> : null}
        {saved.length ? (
          <div className="mt-5">
            <h2 className="text-sm font-bold">Saved on this device</h2>
            <p className="text-sm text-ink/70">Saved on this device only. This is not an account. The last check can stay on this device for offline viewing and is labeled with the time it was retrieved.</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {saved.map((item) => (
                <li key={`${item.latitude}-${item.longitude}`} className="flex items-center gap-1 rounded-full bg-moss px-2 py-1">
                  <button type="button" className="min-h-11 px-2 font-bold" onClick={() => void loadHazards(item, "search")}>{item.label}{item.notify ? " · notifications on" : ""}</button>
                  <button type="button" className="min-h-11 px-2 text-sm" onClick={() => removeSaved(item)} aria-label={`Remove ${item.label}`}>Remove</button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <div className="mt-8" aria-live="polite" aria-busy={loading}>
        {loading && !report ? <p>Checking the National Weather Service, USGS, and FEMA…</p> : null}
        {refreshNote ? <p className="mb-4 font-bold" role="alert">{refreshNote}</p> : null}
        {report ? (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-serif text-3xl font-semibold">Hazards for {report.origin.label}</h2>
                <p className="mt-2 max-w-3xl">{precisionNote(report.origin.precision)}</p>
                {report.placeLabel ? <p className="mt-2 text-sm">NWS location context, not an alert: {report.placeLabel}</p> : null}
                {report.gridNote ? <p className="mt-2 text-sm">{report.gridNote} Times are shown in UTC.</p> : null}
                <p className="mt-2 text-sm">This page asks the sources again every 2 minutes while it is open. {NOTIFY_NOTE}</p>
                {report.zoneNote ? <p className="mt-2 text-sm font-bold">{report.zoneNote}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="min-h-11 rounded-full border border-pine px-4 font-bold" onClick={saveLocation}>Save this location</button>
                <button type="button" className="min-h-11 max-w-full whitespace-normal rounded-full border border-clay px-4 text-left font-bold" onClick={() => void toggleNotify()}>
                  {watching ? "Stop notifications for this location" : "Notify me about new Severe or Extreme alerts"}
                </button>
              </div>
            </div>
            {notifyNote ? <p className="mt-3 text-sm font-bold">{notifyNote}</p> : null}
            {fromCache ? <p className="mt-3 rounded-2xl bg-amber px-4 py-3 font-bold" role="status">Checked at {formatOfficialTime(report.retrievedAt, report.timeZone) ?? report.retrievedAt}. {OFFLINE_COPY}</p> : null}
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold">
              {office ? <a className="text-sea underline underline-offset-2" href={office} target="_blank" rel="noopener noreferrer">Weather Forecast Office {report.officeId}</a> : null}
              <a className="text-sea underline underline-offset-2" href={report.forecastPage} target="_blank" rel="noopener noreferrer">Open the NWS forecast page for this point</a>
            </div>
            <p className="mt-2 text-xs text-ink/70">The forecast page is the NWS forecast. It is not an alert.</p>
            <div className="mt-6">
              <SourceStatus sources={report.sources} retrievedAt={report.retrievedAt} timeZone={report.timeZone} />
            </div>
            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <AlertList report={report} activeId={activeId} onSelect={setActiveId} />
              <HazardMap report={report} activeId={activeId} onSelect={setActiveId} />
            </div>
            <p className="mt-6" data-safety="no-guarantee">{NO_GUARANTEE}</p>
            <SupplementaryPanels report={report} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

async function showNotification(alert: OfficialAlert, origin: HazardReport["origin"]) {
  const { title, body } = notificationCopy(alert);
  const url = `/?${new URLSearchParams({
    lat: String(origin.latitude),
    lon: String(origin.longitude),
    label: origin.label,
    precision: origin.precision,
  }).toString()}`;
  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, { body, tag: alert.id ?? title, data: { url } });
      return;
    }
  } catch {
    // The page notification below is the fallback.
  }
  if (Notification.permission === "granted") new Notification(title, { body, tag: alert.id ?? title });
}

async function registerPeriodic(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker?.ready;
    const periodic = registration && "periodicSync" in registration
      ? (registration as ServiceWorkerRegistration & {
        periodicSync: { register: (tag: string, options: { minInterval: number }) => Promise<void> };
      }).periodicSync
      : null;
    if (!periodic) return false;
    await periodic.register("disasternear-nws", { minInterval: 15 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}
