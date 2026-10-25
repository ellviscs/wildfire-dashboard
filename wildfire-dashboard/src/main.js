import "./style.css";
import L from "leaflet";
import "leaflet.markercluster";

// ── Fix Leaflet's default icon paths when bundled with Vite ──────────────────
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ── Environment Variables ─────────────────────────────────────────────────────
const FIRMS_MAP_KEY = import.meta.env.VITE_NASA_FIRMS_MAP_KEY;

// ── Map Initialisation ────────────────────────────────────────────────────────
const map = L.map("map", {
  center: [0, 117],
  zoom: 4,
  zoomControl: true,
});

// Basemap: OpenStreetMap — no API key required
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  maxZoom: 19,
}).addTo(map);

// ── Marker Cluster Group ──────────────────────────────────────────────────────
const clusterGroup = L.markerClusterGroup({
  chunkedLoading: true,
  maxClusterRadius: 60,
  iconCreateFunction(cluster) {
    const count = cluster.getChildCount();
    const size = count < 10 ? "small" : count < 100 ? "medium" : "large";
    return L.divIcon({
      html: `<div class="cluster-icon cluster-${size}"><span>${count}</span></div>`,
      className: "",
      iconSize: L.point(40, 40),
    });
  },
});
map.addLayer(clusterGroup);

// ── Date Helpers ──────────────────────────────────────────────────────────────
function sliderIndexToDate(index) {
  const d = new Date();
  d.setDate(d.getDate() - Number(index));
  return d;
}

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── GIBS Layer Registry ───────────────────────────────────────────────────────
// All values (TileMatrixSet, maxNativeZoom) confirmed from NASA GIBS GetCapabilities.
//
// defaultOffsetDays: slider position (days back) applied when this mode is selected.
//   truecolor → H-1  (VIIRS NRT available ~3h after overpass)
//   aod       → H-2  (MAIAC processing lag; GetCapabilities Default is always H-2)
const GIBS_LAYERS = {
  truecolor: {
    // VIIRS Suomi-NPP Corrected Reflectance True Color
    // TileMatrixSet: GoogleMapsCompatible_Level9 | format: jpg
    urlTemplate: (dateStr) =>
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` +
      `VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${dateStr}/` +
      `GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    opacity: 0.65,
    maxNativeZoom: 9,
    defaultOffsetDays: 1,
    attribution: 'Imagery: <a href="https://earthdata.nasa.gov">NASA GIBS</a> · VIIRS S-NPP True Color',
  },
  aod: {
    // MODIS Combined (Terra+Aqua) MAIAC Aerosol Optical Depth
    // TileMatrixSet: GoogleMapsCompatible_Level7 | format: png
    // H-1 tile does NOT exist yet (404); H-2 is the latest available.
    urlTemplate: (dateStr) =>
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/` +
      `MODIS_Combined_MAIAC_L2G_AerosolOpticalDepth/default/${dateStr}/` +
      `GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
    opacity: 0.75,
    maxNativeZoom: 7,
    defaultOffsetDays: 2,
    attribution: 'NASA GIBS · MODIS Combined (Terra+Aqua) MAIAC AOD',
  },
};

// Active Leaflet tile layer instance (one at a time)
let activeGibsLayer = null;

function removeActiveGibsLayer() {
  if (activeGibsLayer) {
    map.removeLayer(activeGibsLayer);
    activeGibsLayer = null;
  }
}

/**
 * Switch to the requested GIBS mode for the given date.
 * Always creates a fresh L.tileLayer — never reuses a stale instance.
 */
function applyGibsMode(mode, date) {
  removeActiveGibsLayer();

  const cfg = GIBS_LAYERS[mode];
  if (!cfg) return; // "off" or unknown → leave map clean

  const dateStr = formatDate(date);
  console.log(`[GIBS] mode=${mode} date=${dateStr}`);

  activeGibsLayer = L.tileLayer(cfg.urlTemplate(dateStr), {
    opacity: cfg.opacity,
    attribution: cfg.attribution,
    maxNativeZoom: cfg.maxNativeZoom,
    maxZoom: 19,       // allow Leaflet to over-zoom (stretch) above maxNativeZoom
    tileSize: 256,
    zIndex: 10,        // sit above OSM basemap (default zIndex = 1)
  });

  activeGibsLayer.addTo(map);
}

// ── AOD Legend visibility ─────────────────────────────────────────────────────
const legendAod = document.getElementById("legendAod");

function updateLegendVisibility(mode) {
  if (mode === "aod") {
    legendAod.classList.remove("hidden");
  } else {
    legendAod.classList.add("hidden");
  }
}

// ── Date Slider + Layer Mode Controls ────────────────────────────────────────
const dateSlider          = document.getElementById("dateSlider");
const dateLabel           = document.getElementById("dateLabel");
const dateSliderContainer = document.getElementById("dateSliderContainer");
const layerModeSelect     = document.getElementById("layerMode");

const SLIDER_DAYS = 7;
dateSlider.max = SLIDER_DAYS - 1;

function updateDateLabel(index) {
  dateLabel.textContent = formatDate(sliderIndexToDate(Number(index)));
}

// Slider moved → refresh label + active GIBS layer for the new date
dateSlider.addEventListener("input", () => {
  const idx = Number(dateSlider.value);
  updateDateLabel(idx);
  console.log(`[Slider] index=${idx} date=${formatDate(sliderIndexToDate(idx))} mode=${layerModeSelect.value}`);
  applyGibsMode(layerModeSelect.value, sliderIndexToDate(idx));
});

// Layer mode changed → update legend, reset slider offset, swap layer
layerModeSelect.addEventListener("change", () => {
  const mode = layerModeSelect.value;
  console.log(`[LayerMode] changed to: ${mode}`);

  updateLegendVisibility(mode);

  if (mode === "off") {
    dateSliderContainer.classList.add("hidden");
    dateSliderContainer.classList.remove("flex");
    removeActiveGibsLayer();
  } else {
    // Each layer has its own default offset (H-1 for TrueColor, H-2 for AOD)
    const offset = GIBS_LAYERS[mode]?.defaultOffsetDays ?? 1;
    dateSlider.value = offset;
    updateDateLabel(offset);
    dateSliderContainer.classList.remove("hidden");
    dateSliderContainer.classList.add("flex");
    applyGibsMode(mode, sliderIndexToDate(offset));
  }
});

// Initialise slider at H-1 (safe default for True Color on first load)
const SLIDER_DEFAULT_INDEX = 1;
dateSlider.value = SLIDER_DEFAULT_INDEX;
updateDateLabel(SLIDER_DEFAULT_INDEX);

// ── FIRMS API ─────────────────────────────────────────────────────────────────
const timeRangeSelect = document.getElementById("timeRange");
const hotspotCount    = document.getElementById("hotspotCount");
const loadingOverlay  = document.getElementById("loadingOverlay");
const loadingMsg      = document.getElementById("loadingMsg");

async function fetchHotspots(dayRange) {
  if (!FIRMS_MAP_KEY) {
    showError("VITE_NASA_FIRMS_MAP_KEY is not set. Copy .env.example → .env and add your key.");
    return;
  }

  showLoading(`Fetching FIRMS data (last ${dayRange} day${dayRange > 1 ? "s" : ""})…`);
  clusterGroup.clearLayers();
  hotspotCount.textContent = "…";

  // NASA FIRMS /api/area/ via Vite proxy (/nasa-firms-api → strips prefix, fixes CORS)
  // DATE param = H-1 (yesterday) — today's satellite pass is often incomplete
  // DAY_RANGE clamped to 1–5 per NASA docs
  const clampedRange = Math.min(Number(dayRange), 5);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const startDate = formatDate(yesterday);

  const url =
    `/nasa-firms-api/api/area/csv/` +
    `${FIRMS_MAP_KEY}/VIIRS_SNPP_NRT/world/${clampedRange}/${startDate}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

    const csv = await response.text();
    const markers = parseFirmsCSV(csv);

    markers.forEach((m) => clusterGroup.addLayer(m));
    hotspotCount.textContent = markers.length.toLocaleString();
    hideLoading();
  } catch (err) {
    hideLoading();
    showError(`Failed to load FIRMS data: ${err.message}`);
    hotspotCount.textContent = "—";
  }
}

// ── CSV Parser ────────────────────────────────────────────────────────────────
function parseFirmsCSV(csv) {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const idx = (name) => headers.indexOf(name);

  const latI      = idx("latitude");
  const lngI      = idx("longitude");
  const brightI   = idx("bright_ti4") !== -1 ? idx("bright_ti4") : idx("brightness");
  const confI     = idx("confidence");
  const acqDateI  = idx("acq_date");
  const acqTimeI  = idx("acq_time");

  const markers = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < 3) continue;

    const lat = parseFloat(cols[latI]);
    const lng = parseFloat(cols[lngI]);
    if (isNaN(lat) || isNaN(lng)) continue;

    const brightness = parseFloat(cols[brightI]) || 0;
    const confidence = cols[confI]?.trim() || "n";
    const acqDate    = cols[acqDateI]?.trim() || "";
    const acqTime    = cols[acqTimeI]?.trim() || "";

    const confValue = parseConfidence(confidence);
    const color     = confidenceColor(confValue);

    const icon = L.divIcon({
      html: `<div style="
        width:10px;height:10px;
        border-radius:50%;
        background:${color};
        border:1px solid rgba(0,0,0,0.4);
        box-shadow:0 0 4px ${color}99;
      "></div>`,
      className: "",
      iconSize: [10, 10],
      iconAnchor: [5, 5],
    });

    const marker = L.marker([lat, lng], { icon });
    marker.on("click", () =>
      handleMarkerClick(marker, { lat, lng, brightness, confidence, acqDate, acqTime })
    );
    markers.push(marker);
  }

  return markers;
}

function parseConfidence(raw) {
  // VIIRS: "h" / "n" / "l"  |  MODIS: numeric string
  if (raw === "h") return 90;
  if (raw === "n") return 65;
  if (raw === "l") return 30;
  const n = parseInt(raw, 10);
  return isNaN(n) ? 50 : n;
}

function confidenceColor(value) {
  if (value >= 80) return "#dc2626"; // red-600
  if (value >= 50) return "#fb923c"; // orange-400
  return "#fde047";                  // yellow-300
}

// ── Reverse Geocoding (OSM Nominatim) ────────────────────────────────────────
const geocodeCache = new Map();

async function reverseGeocode(lat, lng) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (geocodeCache.has(key)) return geocodeCache.get(key);

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) throw new Error("Geocoding failed");
    const data = await res.json();
    const addr = data.address || {};
    const place =
      addr.city || addr.town || addr.village ||
      addr.county || addr.state || addr.country || "Unknown location";
    const result = { place, country: addr.country || "" };
    geocodeCache.set(key, result);
    return result;
  } catch {
    return { place: "Unknown location", country: "" };
  }
}

async function handleMarkerClick(marker, { lat, lng, brightness, confidence, acqDate, acqTime }) {
  marker.bindPopup(
    `<div class="popup-loading">📡 Looking up location…</div>`,
    { maxWidth: 260 }
  ).openPopup();

  const { place, country } = await reverseGeocode(lat, lng);
  const confValue = parseConfidence(confidence);
  const confLabel = confValue >= 80 ? "High" : confValue >= 50 ? "Nominal" : "Low";
  const confColor = confidenceColor(confValue);
  const timeStr   = acqTime ? `${acqTime.slice(0, 2)}:${acqTime.slice(2, 4)} UTC` : "N/A";

  marker
    .getPopup()
    .setContent(
      `<div class="popup-card">
        <div class="popup-title">🔥 ${place}</div>
        <div class="popup-subtitle">${country}</div>
        <table class="popup-table">
          <tr><td>🌡️ Brightness</td><td><b>${brightness > 0 ? brightness.toFixed(1) + " K" : "N/A"}</b></td></tr>
          <tr><td>📊 Confidence</td><td><b style="color:${confColor}">${confLabel} (${confValue}%)</b></td></tr>
          <tr><td>📅 Acquired</td><td><b>${acqDate}</b></td></tr>
          <tr><td>🕐 Time</td><td><b>${timeStr}</b></td></tr>
          <tr><td>📍 Coords</td><td><b>${lat.toFixed(4)}, ${lng.toFixed(4)}</b></td></tr>
        </table>
      </div>`
    )
    .update();
}

// ── Time Range Filter ─────────────────────────────────────────────────────────
timeRangeSelect.addEventListener("change", () => {
  fetchHotspots(Number(timeRangeSelect.value));
});

// ── UI Helpers ────────────────────────────────────────────────────────────────
function showLoading(msg = "Loading…") {
  loadingMsg.textContent = msg;
  loadingOverlay.style.display = "flex";
  loadingOverlay.style.opacity = "1";
}

function hideLoading() {
  loadingOverlay.style.opacity = "0";
  setTimeout(() => {
    loadingOverlay.style.display = "none";
    loadingOverlay.style.opacity = "";
  }, 500);
}

function showError(msg) {
  const toast = document.getElementById("errorToast");
  document.getElementById("errorMsg").textContent = msg;
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 7000);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
fetchHotspots(Number(timeRangeSelect.value));
