# DisasterNear

DisasterNear shows official hazard information for a U.S. location you enter or share from your device.

Searches use:

- National Weather Service active alerts for the coordinate, plus active alerts for the NWS forecast zone, county, and fire-weather zone
- A point-in-polygon test of each official alert shape against that coordinate
- U.S. Geological Survey earthquake catalog
- FEMA OpenFEMA disaster declarations
- U.S. Census Bureau gazetteers and geocoder

The site does not invent alerts, severity, instructions, or locations. An empty result is not a statement that the area is safe. Alerts whose polygon contains the coordinate stay separate from alerts that only match the surrounding NWS zone. USGS earthquakes and FEMA declarations are shown apart from active weather alerts.

Up to five locations can be saved in this browser. You can ask this browser to notify you when a new NWS alert with severity Severe or Extreme appears for a saved location. The notification repeats the official event name and headline. It is not a Wireless Emergency Alert.

## Requirements

- Node.js 22 or newer
- npm

No API key, account, or environment variable is required. NWS, USGS, FEMA, and Census are called server-side with the User-Agent `DisasterNear/1.0 (https://codyza.com)`.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and search a real ZIP code such as `10001`, `33101`, or `99501`.

The Census ZIP and place files already live in `data/zcta.json` and `data/places.json`. `npm run geography` rebuilds them. Pass `--refresh` to download the Census 2025 gazetteers again.

## Rate limits

Limits are counted in memory on one server process, per client address (`x-forwarded-for`, otherwise `local`):

- Geocoding: 30 requests per minute
- Hazard checks: 20 requests per minute

A limit that is reached returns HTTP 429 and does not invent a result. The count does not carry across separate server instances or a restart.

## Caching

- While the Next.js server is running, upstream NWS, USGS, FEMA, and Census responses may be reused for 30 seconds. Outside that runtime, those fetches are not given a shared cache lifetime.
- Responses from `/api/geocode` and `/api/hazards` use `Cache-Control: no-store`, so the browser does not treat them as a fresh official check.
- After a search, the page keeps that result for 20 seconds in `sessionStorage` so updating the address bar does not send a second hazard request.
- The last successful check is also stored in `localStorage` and in the service worker cache. If the network fails, the page shows that copy with the time it was retrieved and says the sources were not contacted again.
- The service worker caches the app shell for offline opening. It does not answer `/api/*` from cache, so a cached payload is never returned as a new check.

## Location and polygons

A ZIP search uses the Census center of the ZIP code. A city search uses the Census place center. A street address uses the Census geocoder. Device location uses the coordinate the browser shares.

For each coordinate the server:

1. Asks NWS `alerts/active?point=` for alerts that affect that point.
2. Reads the forecast zone, county, and fire-weather zone from NWS `/points`.
3. Asks NWS `alerts/active?zone=` for those zone ids.
4. Tests each included polygon or multipolygon against the coordinate.

An alert is listed at the location when NWS returned it for the point, or when its polygon contains the point. An alert returned only for the zone, whose polygon does not contain the point, is listed under “Same NWS zone, not at this point.” That is the check that still shows a warning covering part of a ZIP when the ZIP center is outside the polygon. If NWS does not include a zone, or the zone query fails, the page says so instead of adding a shape.

## Notifications and offline

The web app manifest and service worker are served at `/manifest.webmanifest` and `/sw.js`. The worker caches the shell and the last hazard report. Background notification checks use Periodic Background Sync when the browser grants it, about every 15 minutes, for saved locations you turned on. While the page is open, the current location is checked every 2 minutes, and other notification locations about every 10 minutes.

Notifications are sent only for new alert ids whose official severity is Severe or Extreme. Current alerts are marked as seen when you turn notifications on, so the page does not notify you about an alert that is already on screen. FEMA declarations and USGS earthquakes do not send notifications.

## Checks

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run check:ready
npm run build
```

`npm run check:ready` confirms the gazetteer files and one live read from NWS, USGS, and FEMA.

Powered by Codyza.
