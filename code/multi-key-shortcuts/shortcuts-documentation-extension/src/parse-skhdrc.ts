import fs from "fs";
import { COMMAND_DELIMITER, COMMAND_END, DESCRIPTION_PREFIX, MODE_DELIMITER, SKHDRC_PATH } from "./constants";
import { groupByCommand } from "./group-by-command";
import { replaceKey } from "./replace-key";

export type Shortcut = {
  mode: string;
  description: string;
  keys: string[];
  command: string;
};

export const parseSkhdrc = () => {
  const file = fs.readFileSync(SKHDRC_PATH, "utf8");
  const lines = file.split("\n");
  const shortcuts: Shortcut[] = [];

  let currentShortcut: Shortcut = {
    description: "",
    mode: "",
    keys: [],
    command: "",
  };

  lines.forEach((line) => {
    const trimmedLine = line.trim();
    const isDescription = trimmedLine.startsWith(DESCRIPTION_PREFIX);

    if (!trimmedLine) {
      return;
    }

    if (!isDescription && !currentShortcut.description) {
      return;
    }

    if (isDescription) {
      // Add the previous shortcut
      if (currentShortcut.description) {
        currentShortcut.keys = currentShortcut.keys.sort((a, b) => a.length - b.length);
        shortcuts.push(currentShortcut);
        // Reset the current shortcut
        currentShortcut = {
          description: "",
          mode: "",
          keys: [],
          command: "",
        };
      }

      const description = trimmedLine.replace(DESCRIPTION_PREFIX, "");
      currentShortcut.description = description.trim();
      return;
    }

    const [mode, ...commandPartOne] = trimmedLine.split(MODE_DELIMITER);
    currentShortcut.mode = mode.trim();
    const [key, ...commandPartTwo] = commandPartOne.join(MODE_DELIMITER).split(COMMAND_DELIMITER);
    currentShortcut.keys.push(replaceKey(key.trim()));
    const [command] = commandPartTwo.join(COMMAND_DELIMITER).split(COMMAND_END);
    currentShortcut.command = command.trim();
  });

  // Add the last shortcut
  if (currentShortcut) {
    currentShortcut.keys = currentShortcut.keys.sort((a, b) => a.length - b.length);
    shortcuts.push(currentShortcut);
  }

  return groupByCommand(shortcuts);
};
