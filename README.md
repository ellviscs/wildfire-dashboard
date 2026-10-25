# 🔥 Wildfire & Smoke Dashboard

A real-time global wildfire monitoring dashboard built with **Vite**, **Tailwind CSS v4**, **Leaflet.js**, and **NASA FIRMS**.

---

## Features

| Feature | Details |
|---|---|
| 🗺️ Interactive Map | Leaflet.js + OpenStreetMap basemap |
| 📍 Hotspot Clustering | Auto-cluster via `leaflet.markercluster` |
| 🔥 Fire Data | NASA FIRMS API (VIIRS 375m / MODIS 1km) |
| 📊 Confidence Legend | High / Nominal / Low with color coding |
| ⏰ Time Filter | 24h / 48h / 7d / 10d range selector |
| 🌍 Reverse Geocoding | Click any marker → OSM Nominatim lookup |
| 💨 Smoke Layer | NASA GIBS True Color imagery (MODIS Terra) |
| 📅 Date Slider | Replay smoke/imagery for past 7 days |

---

## Quick Start

### 1. Get a NASA FIRMS MAP Key (free)

Go to → [https://firms.modaps.eosdis.nasa.gov/api/map_key/](https://firms.modaps.eosdis.nasa.gov/api/map_key/)  
Register and copy your MAP key.

### 2. Set up environment variables

```bash
# In the project root (wildfire-dashboard/)
cp .env.example .env
```

Then edit `.env` and replace `YOUR_FIRMS_MAP_KEY_HERE` with your actual key:

```
VITE_NASA_FIRMS_MAP_KEY=abcdef1234567890abcdef1234567890
VITE_FIRMS_SOURCE=VIIRS_SNPP_NRT
```

### 3. Install dependencies

```bash
cd wildfire-dashboard
npm install
```

### 4. Run in development mode

```bash
npm run dev
```

Open your browser at **http://localhost:5173**

### 5. Build for production

```bash
npm run build
npm run preview   # preview the production build locally
```

---

## Project Structure

```
wildfire-dashboard/
├── index.html          # App shell + UI controls
├── vite.config.js      # Vite config with Tailwind v4 plugin
├── package.json        # Dependencies
├── .env                # 🔒 YOUR secrets (never commit this)
├── .env.example        # Template — safe to commit
└── src/
    ├── main.js         # All app logic (map, API, geocoding)
    └── style.css       # Tailwind + custom popup/cluster styles
```

---

## API Reference

| Service | Endpoint | Auth |
|---|---|---|
| NASA FIRMS | `https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/{source}/…` | MAP Key (free) |
| OSM Nominatim | `https://nominatim.openstreetmap.org/reverse` | None |
| NASA GIBS | `https://gibs.earthdata.nasa.gov/wmts/…` | None |
| OpenStreetMap | `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` | None |

---

## Notes

- The FIRMS free key allows **~5,000 requests/day** for global data.
- GIBS tiles are limited to zoom level 9 (sufficient for country/region view).
- Nominatim requests are cached in-memory per session to respect their rate limit.
