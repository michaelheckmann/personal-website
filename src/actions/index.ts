import { defineAction } from "astro:actions";
import { z } from "astro:schema";
import { validate } from "disposable-email";
// import { LoopsClient, APIError } from "loops";

export const server = {
  subscribeNewsletter: defineAction({
    accept: "form",
    input: z.object({
      email: z.string().email(),
    }),
    handler: async ({ email }, ctx) => {
      const { env } = ctx.locals.runtime;
      if (!validate(email)) {
        throw new Error("Disposable email not allowed");
      }

      // await sleep(5000);
      // return true;

    //   const url = `https://api.beehiiv.com/v2/publications/${env.LOOPS_API_KEY}/subscriptions`;
    //   const res = await fetch(url, {
    //     method: "POST",
    //     headers: {
    //       Authorization: `Bearer ${env.BEEHIIV_API_KEY}`,
    //       "Content-Type": "application/json",
    //     },
    //     body: JSON.stringify({
    //       email,
    //       referring_site: "https://heckmann.app",
    //     }),
    //   });

    //   if (!res.ok) {
    //     throw new Error("Failed to subscribe to newsletter");
    //   }

    //   const { data } = await res.json();
    //   if (!data?.id) {
    //     throw new Error("Failed to subscribe to newsletter");
    //   }

    //   return true;
    // },
  }),
};
