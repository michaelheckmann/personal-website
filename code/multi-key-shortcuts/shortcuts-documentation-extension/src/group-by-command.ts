import { SECTION_TITLE } from "./constants";
import { Shortcut } from "./parse-skhdrc";

const commandTypes = {
  "open -a": SECTION_TITLE.APP,
  "make new tab": SECTION_TITLE.BROWSE,
  "raycast://": SECTION_TITLE.RAYCAST,
  "alfred://": SECTION_TITLE.ALFRED,
} as const;

export const groupByCommand = (shortcuts: Shortcut[]) => {
  return shortcuts.reduce(
    (groups, shortcut) => {
      const command =
        Object.entries(commandTypes).find(([pattern]) => shortcut.command.includes(pattern))?.[1] ??
        SECTION_TITLE.OTHER;

      return {
        ...groups,
        [command]: [...(groups[command] || []), shortcut],
      };
    },
    {} as Record<string, Shortcut[]>,
  );
};
