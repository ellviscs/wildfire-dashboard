import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  assetsInclude: ["**/*.png", "**/*.jpg"],
  server: {
    proxy: {
      // Proxy semua request /nasa-firms-api/... ke NASA (atasi CORS di dev)
      "/nasa-firms-api": {
        target: "https://firms.modaps.eosdis.nasa.gov",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nasa-firms-api/, ""),
      },
    },
  },
});
