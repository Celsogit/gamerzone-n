import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    spa: {
      enabled: true,
      maskPath: "/",
    },
  },
  nitro: false,
   vite: {
    base: './',
  },
});
