import { defineConfig } from "vite";

// The loader: tiny classic-script IIFE that a storefront includes. It fetches the
// merchant's config and only pulls the widget bundle when cards are switched on.
export default defineConfig({
  build: {
    lib: { entry: "src/loader.ts", formats: ["iife"], name: "CardifyLoader", fileName: () => "cardify-loader.js" },
    outDir: "dist",
    emptyOutDir: false,
    target: "es2020",
  },
});
