import type {
  Mode,
  ModeShortcut,
  ModeShortcutCommand,
  Shortcut,
} from "./types";
import { executeKeypress, open, openApp, openRaycast, openUrl } from "./utils";

export type ModeName = (typeof modes)[number]["name"];

/** The available modes and mode shortcuts. */
export const modes = [
  {
    name: "default",
    icon: "default",
    isDefault: true,
  },
  {
    name: "shortcut",
    icon: "shortcut",
    isDefault: false,
  },
  {
    name: "launcher",
    icon: "launcher",
    isDefault: false,
  },
] as const satisfies Mode[];

export const modeShortcuts: Record<
  Exclude<ModeName, "default">,
  ModeShortcut
> = {
  shortcut: {
    modifiers: ["cmd"],
    key: "space",
  },
  launcher: {
    modifiers: ["cmd", "shift"],
    key: "space",
  },
};

export const modeShortcutCommands: ModeShortcutCommand<ModeName>[] = [
  {
    fromMode: "default",
    toMode: "shortcut",
    shortcut: modeShortcuts.shortcut,
  },
  {
    fromMode: "shortcut",
    toMode: "default",
    shortcut: modeShortcuts.shortcut,
  },
  {
    fromMode: "default",
    toMode: "launcher",
    shortcut: modeShortcuts.launcher,
  },
  {
    fromMode: "launcher",
    toMode: "default",
    shortcut: modeShortcuts.launcher,
  },
];

/** The available shortcuts to change apps, execute scripts, etc. */
export const shortcuts: Shortcut<Exclude<ModeName, "default">>[] = [
  /* Apps */
  {
    mode: "launcher",
    modifiers: ["cmd"],
    key: "a",
    omitModifierAllowed: true,
    command: openApp("Arc"),
    comment: "Open Arc",
  },
  {
    mode: "launcher",
    modifiers: ["cmd"],
    key: "k",
    omitModifierAllowed: true,
    command: openApp("Calendar"),
    comment: "Open Calendar",
  },
  {
    mode: "launcher",
    modifiers: ["cmd"],
    key: "e",
    omitModifierAllowed: true,
    command: openApp("Reminders"),
    comment: "Open Reminders",
  },
  /* Browse */
  {
    mode: "launcher",
    modifiers: ["cmd"],
    key: "g",
    omitModifierAllowed: true,
    command: openUrl(
      "https://github.com/michaelheckmann?tab=repositories",
      "Space1",
    ),
    comment: "Visit GitHub",
  },
  {
    mode: "launcher",
    modifiers: ["cmd"],
    key: "y",
    omitModifierAllowed: true,
    command: openUrl("https://www.youtube.com/", "Space2"),
    comment: "Visit Youtube",
  },
  /* Folders */
  {
    mode: "launcher",
    modifiers: ["cmd"],
    key: "d",
    omitModifierAllowed: true,
    command: open("$HOME/Developer"),
    comment: "Open the Developer folder",
  },
  /* Scripts */
  {
    mode: "shortcut",
    modifiers: ["cmd"],
    key: "c",
    omitModifierAllowed: true,
    command: openRaycast("raycast/clipboard-history/clipboard-history"),
    comment: "View Clipboard History",
  },
  {
    mode: "shortcut",
    modifiers: ["cmd"],
    key: "p",
    omitModifierAllowed: true,
    command: openRaycast("thomas/color-picker/pick-color"),
    comment: "Pick a Color",
  },
  {
    mode: "shortcut",
    modifiers: ["cmd"],
    key: "r",
    omitModifierAllowed: true,
    // Open raycast/apple-reminders/quick-add-reminder
    // Since this command accepts the args inline, we can't use the openRaycast function
    // It would execute with args = undefined immediately without showing the input dialog
    // 0x0A is just an arbitrary key that is also defined in the Raycast hotkey settings for
    // this command (^)
    command: executeKeypress({ key: "0x0A", modifiers: ["hyper"] }),
    comment: "Create a Reminder",
  },
  /* AI */
  {
    mode: "shortcut",
    modifiers: ["cmd"],
    omitModifierAllowed: true,
    key: "space",
    command: openRaycast("raycast/raycast-ai/ai-chat"),
    comment: "Open AI Chat",
  },
  {
    mode: "shortcut",
    modifiers: ["cmd", "shift"],
    key: "b",
    command: openRaycast("raycast/raycast-ai/send-screen-to-ai-chat"),
    comment: "Open AI Chat with Screenshot",
  },
  {
    mode: "shortcut",
    modifiers: ["cmd", "shift"],
    key: "p",
    command: openRaycast("raycast/raycast-ai/search-ai-chat-presets", {
      forceFocus: true,
    }),
    comment: "Search AI Chat Presets",
  },
];
