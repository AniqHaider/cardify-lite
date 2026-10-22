import { defineConfig } from "vitest/config";

// The widget: lazy-loaded ESM bundle (Lit + the card element + the overlay).
export default defineConfig({
  build: {
    lib: { entry: "src/widget.ts", formats: ["es"], fileName: () => "cardify-widget.js" },
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
  test: { environment: "happy-dom", include: ["test/**/*.test.ts"] },
});
