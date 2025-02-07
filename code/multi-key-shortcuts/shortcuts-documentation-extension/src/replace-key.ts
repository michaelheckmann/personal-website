/**
 * Replaces specific key names in a command string with their corresponding symbols.
 *
 * @param command - The command string containing key names to be replaced.
 * @returns The command string with key names replaced by their corresponding symbols.
 *
 * Any hyphens or plus signs in the command string are removed.
 */
export const replaceKey = (command: string) => {
  const replacements: Record<string, string> = {
    cmd: "⌘",
    ctrl: "⌃",
    alt: "⌥",
    shift: "⇧",
    space: "␣",
    return: "↩",
    tab: "⇥",
    "0x2F": ".",
  };

  return command
    .replace(/[-+]/g, "")
    .split(" ")
    .map((part) => replacements[part] || part)
    .join(" ");
};
