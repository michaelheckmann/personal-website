import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { env } from "cloudflare:workers";
import { validate } from "disposable-email";

export const server = {
  subscribeNewsletter: defineAction({
    accept: "form",
    input: z.object({
      email: z.email(),
    }),
    handler: async ({ email }) => {
      if (!validate(email)) {
        throw new Error("Disposable email not allowed");
      }

      // await sleep(5000);
      // return true;

      const url = `https://api.beehiiv.com/v2/publications/${env.BEEHIIV_PUB_ID}/subscriptions`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.BEEHIIV_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          referring_site: "https://heckmann.app",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to subscribe to newsletter");
      }

      const response = (await res.json()) as {
        data?: {
          id?: string;
        };
      };

      if (!response.data?.id) {
        throw new Error("Failed to subscribe to newsletter");
      }

      return true;
    },
  }),
};
