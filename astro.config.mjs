// @ts-check
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import { defineConfig } from "astro/config";
import { baseLocale, locales } from "./src/i18n/i18n-util";

const sitemapLocales = Object.fromEntries(
  locales.map((_, i) => [locales[i], locales[i]]),
); // Create an object with keys and values based on locales

// https://astro.build/config
export default defineConfig({
  site: "https://heckmann.app",
  integrations: [
    mdx(),
    sitemap({
      i18n: {
        defaultLocale: baseLocale,
        locales: sitemapLocales,
      },
    }),
    tailwind({ applyBaseStyles: false }),
  ],
  i18n: {
    locales,
    defaultLocale: baseLocale,
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
    fallback: { de: "en" },
  },
});
