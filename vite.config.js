import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  // Ensure Leaflet assets (images) are handled correctly
  assetsInclude: ["**/*.png", "**/*.jpg"],
  server: {
    proxy: {
      // Semua request ke /nasa-firms-api/... diteruskan ke server NASA (atasi CORS)
      "/nasa-firms-api": {
        target: "https://firms.modaps.eosdis.nasa.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nasa-firms-api/, ""),
      },
    },
  },
});
