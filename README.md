# DisasterNear

DisasterNear shows official hazard information for a U.S. location you enter or share from your device.

Searches use:

- National Weather Service active alerts and point metadata
- U.S. Geological Survey earthquake catalog
- FEMA OpenFEMA disaster declarations
- U.S. Census Bureau gazetteers and geocoder

The site does not invent alerts, severity, instructions, or locations. An empty result is not a statement that the area is safe. USGS earthquakes and FEMA declarations are shown apart from active weather alerts.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and search a real ZIP code such as `10001`, `33101`, or `99501`.

`npm run geography` rebuilds the Census ZIP and place files. Pass `--refresh` to download them again.

## Checks

```bash
npm run test:unit
npm run test:integration
npm run test:e2e
npm run check:ready
npm run build
```

Powered by Codyza.
