import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  incrementCount: defineAction({
    input: z.object({
      amount: z.number(),
    }),
    handler: async (input, context) => {
      const count = await context.locals.runtime.env.KV.get("count");
      const newCount = count ? parseInt(count) + input.amount : input.amount;
      await context.locals.runtime.env.KV.put("count", newCount.toString());
      console.log(`New count is ${newCount}`);
      return `Count incremented by ${input.amount}!`;
    },
  }),
};
