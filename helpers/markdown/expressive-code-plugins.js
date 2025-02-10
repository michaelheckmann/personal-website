// @ts-check

import { definePlugin } from "@expressive-code/core";

export const addClassnamesPlugin = () => {
  return definePlugin({
    // The only required property is `name`
    name: "Example that does nothing",
    // Add more properties of `ExpressiveCodePlugin` to make your plugin
    // actually do something (e.g. `baseStyles`, `hooks`, etc.)
    hooks: {
      postprocessRenderedBlock: ({ codeBlock, renderData }) => {
        const cnMeta = codeBlock.meta
          .split(" ")
          .filter((m) => m.startsWith("cn-"));
        if (cnMeta.length > 0) {
          renderData.blockAst.properties.className = [
            // @ts-expect-error -- we know this is an array
            ...(renderData.blockAst.properties.className || []),
            ...cnMeta,
          ];
        }
      },
    },
  });
};
