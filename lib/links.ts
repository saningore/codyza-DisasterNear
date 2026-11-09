const HOSTS = new Set([
  "api.weather.gov",
  "alerts.weather.gov",
  "www.weather.gov",
  "weather.gov",
  "forecast.weather.gov",
  "www.noaa.gov",
  "noaa.gov",
  "www.nhc.noaa.gov",
  "earthquake.usgs.gov",
  "www.usgs.gov",
  "usgs.gov",
  "www.fema.gov",
  "fema.gov",
  "www.ready.gov",
  "ready.gov",
  "codyza.com",
  "www.codyza.com",
]);

export function officialHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;
  if (url.protocol === "https:") return url.toString();
  if (url.protocol === "http:" && (host.endsWith("weather.gov") || host.endsWith("noaa.gov"))) {
    return url.toString();
  }
  return null;
}

export function isAlertId(value: string): boolean {
  return /^[A-Za-z0-9:._-]{8,200}$/.test(value);
}

export function nwsAlertRecordUrl(id: string | null, featureId: string | null): string | null {
  const fromFeature = officialHttpUrl(featureId);
  if (fromFeature && /^https:\/\/api\.weather\.gov\/alerts\/[^/]+\/?$/.test(fromFeature)) return fromFeature;
  if (id && isAlertId(id)) return `https://api.weather.gov/alerts/${id}`;
  return fromFeature && fromFeature.includes("api.weather.gov/alerts/") ? fromFeature : null;
}

export function nwsOfficeUrl(office: string | null): string | null {
  if (!office || !/^[A-Z]{3,4}$/.test(office)) return null;
  return `https://www.weather.gov/${office}/`;
}

export function nwsForecastPage(latitude: number, longitude: number): string {
  return `https://forecast.weather.gov/MapClick.php?lat=${latitude}&lon=${longitude}`;
}

export function femaDisasterUrl(disasterNumber: number): string | null {
  if (!Number.isInteger(disasterNumber) || disasterNumber < 1 || disasterNumber > 99999) return null;
  return `https://www.fema.gov/disaster/${disasterNumber}`;
}

export function nwsZoneId(value: unknown): string | null {
  const safe = officialHttpUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  if (url.hostname !== "api.weather.gov") return null;
  const match = url.pathname.match(/^\/zones\/(?:forecast|county|fire)\/([A-Z]{3}\d{3})\/?$/);
  return match ? match[1] : null;
}

export function officeIdFromUrl(value: unknown): string | null {
  const safe = officialHttpUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  if (url.hostname !== "api.weather.gov") return null;
  const match = url.pathname.match(/^\/offices\/([A-Za-z]{3,4})\/?$/);
  return match ? match[1].toUpperCase() : null;
}
