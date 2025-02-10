// @ts-check
import expressiveCode from "astro-expressive-code";
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import rehypeExternalLinks from "rehype-external-links";

import { addClassnamesPlugin } from "./helpers/markdown/expressive-code-plugins";
import shikiTheme from "./helpers/markdown/shiki.json";
import { baseLocale, locales } from "./src/i18n/i18n-util";

const sitemapLocales = Object.fromEntries(
  locales.map((_, i) => [locales[i], locales[i]]),
); // Create an object with keys and values based on locales

// https://astro.build/config
export default defineConfig({
  site: "https://heckmann.app",
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: baseLocale,
        locales: sitemapLocales,
      },
    }),
    expressiveCode({
      themes: [shikiTheme],
      plugins: [addClassnamesPlugin()],
      styleOverrides: {
        frames: {
          terminalBackground: "#18181b", // zinc-900
          terminalTitlebarBackground: "#27272a", // zinc-800
          editorBackground: "#18181b", // zinc-900
          inlineButtonBackground: "#18181b", // zinc-900
          inlineButtonBorder: "#52525b", // zinc-600
          inlineButtonForeground: "#a1a1aa", // zinc-400
          editorTabBorderRadius: "0.5em",
          frameBoxShadowCssValue:
            "0px 5.5px 3.6px rgba(0, 0, 0, 0.024), 0px 15.2px 10px rgba(0, 0, 0, 0.035), 0px 36.5px 24.1px rgba(0, 0, 0, 0.046), 0px 121px 80px rgba(0, 0, 0, 0.07)",
        },
        borderRadius: "0.5rem",
      },
    }),
    mdx(),
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
  vite: { plugins: [tailwindcss()] },
  markdown: { rehypePlugins: [[rehypeExternalLinks, { target: "_blank" }]] },
});
