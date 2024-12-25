import { removeLocaleFromPath } from "@/lib/routing";
import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async (context) => {
  const posts = await getCollection("blog");
  return rss({
    title: "Michael Heckmann",
    description:
      "Ich entwickle digitale Lösungen, die funktionieren und sich gut anfühlen.",
    site: context.site ?? "",
    items: posts
      .filter(({ id }) => id.startsWith("de/"))
      .map((post) => ({
        ...post.data,
        link: `/de/blog/${removeLocaleFromPath(post.id)}/`,
      })),
    customData: "<language>de</language>",
  });
};
