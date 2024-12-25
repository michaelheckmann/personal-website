import { removeLocaleFromPath } from "@/lib/routing";
import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async (context) => {
  const posts = await getCollection("blog");
  return rss({
    title: "Michael Heckmann",
    description: "I build digital things that work well and feel right.",
    site: context.site ?? "",
    items: posts
      .filter(({ id }) => id.startsWith("en/"))
      .map((post) => ({
        ...post.data,
        link: `/en/blog/${removeLocaleFromPath(post.id)}/`,
      })),
    customData: "<language>en</language>",
  });
};
