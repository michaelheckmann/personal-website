import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  // Load Markdown and MDX files in the `src/content/blog/` directory.
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(), // Transform string to Date object
      updatedDate: z.coerce.date().optional(),
      cover: image(),
      coverAlt: z.string(),
      colors: z.array(z.string()),
      tags: z.array(z.string()),
      translated: z.boolean().optional(),
      reference: z.string(),
    }),
});

export const collections = { blog };
