import {
  modes,
  modeShortcutCommands,
  modeShortcuts,
  shortcuts,
} from "./config";
import { getRaycastMenubarCommand } from "./constants";
import type { Shortcut } from "./types";
import {
  contentFactory,
  renderBaseShortcut,
  renderShortcut,
  validateShortcuts,
  valueIfTrue,
} from "./utils";

const { saveContent, appendStrings } = contentFactory();

/* Modes */
const modesLines = modes.map(({ name, icon, isDefault }) => {
  return `:: ${name} ${valueIfTrue(
    !isDefault,
    "@"
  )} : open -g ${getRaycastMenubarCommand(icon)}`;
});

appendStrings(modesLines, { headline: "Modes" });

/* Mode Shortcut Commands */
const modeShortcutCommandLines = modeShortcutCommands.map(
  ({ fromMode, toMode, shortcut }) => {
    let baseCommand = `${renderBaseShortcut({
      mode: fromMode,
      ...shortcut,
    })} ; ${toMode}`;

    if (toMode === "default") {
      baseCommand += "\n";
      baseCommand += `${renderBaseShortcut({
        mode: fromMode,
        key: "escape",
      })} ; ${toMode}`;
    }

    return baseCommand;
  }
);

appendStrings(modeShortcutCommandLines, { headline: "Mode Shortcut Commands" });

/* Shortcuts */
const shortcutLines = validateShortcuts(shortcuts).map((shortcut) => {
  const modeShortcut = modeShortcuts[shortcut.mode];

  const constructCommand = <T extends string>(shortcut: Shortcut<T>) => {
    const unsetMode = `skhd -k '${renderBaseShortcut(modeShortcut)}'`;
    // If this is a keypress command, we first have to unset
    // the mode, else the keypress would not be recognized.
    if (shortcut.command.startsWith("skhd -k")) {
      return renderShortcut({
        ...shortcut,
        command: `${unsetMode}; ${shortcut.command}`,
      });
    } else {
      return `${renderShortcut(shortcut)}; ${unsetMode}`;
    }
  };

  let baseCommand = `## Shortcut: ${shortcut.comment}\n`;
  baseCommand += constructCommand(shortcut);
  if ("omitModifierAllowed" in shortcut && shortcut.omitModifierAllowed) {
    baseCommand += "\n";
    baseCommand += constructCommand({ ...shortcut, modifiers: [] });
  }
  return baseCommand;
});

appendStrings(shortcutLines, { headline: "Shortcuts", separateLines: true });

saveContent(".skhdrc");
