import fs from "fs";
import type { Key, Modifier, Shortcut, Space } from "./types";
/**
 * Checks if the condition is true and returns the provided value if true, otherwise returns an empty string.
 *
 * @param condition - The condition to check.
 * @param value - The value to return if the condition is true.
 * @returns The provided value if the condition is true, otherwise an empty string.
 */
export const valueIfTrue = (condition: boolean, value: string) =>
  condition ? value : "";

/**
 * Checks if an array is empty.
 * @param arr - The array to check.
 * @returns True if the array is empty, false otherwise.
 */
export const isEmptyArr = (arr?: any[]) => !arr || arr.length === 0;

/**
 * Removes multiple spaces from a string and trims leading and trailing spaces.
 *
 * @param string - The input string to remove multiple spaces from.
 * @returns The string with multiple spaces removed and leading/trailing spaces trimmed.
 */
export const removeMultipleSpaces = (string: string) =>
  string.replace(/\s{2,}/g, " ").trim();

type AppendStringsOptions = {
  headline?: string;
  separateLines?: boolean;
};

/**
 * Factory function that creates a content object with methods for appending strings and saving content.
 *
 * @returns An object with the following methods:
 *   - `appendStrings`: Appends an array of strings to the content, with optional options for formatting.
 *   - `saveContent`: Saves the content to a specified file path.
 */
export const contentFactory = () => {
  let content = "";

  /**
   * Appends an array of strings to the content, with optional options.
   *
   * @param strings - An array of strings to be appended.
   * @param options - Optional parameters for appending strings.
   * @returns void
   */
  const appendStrings = (
    strings: string[],
    options: AppendStringsOptions = {}
  ) => {
    const delimiter = options.separateLines ? "\n\n" : "\n";
    if (options.headline) {
      content += `# ${removeMultipleSpaces(options.headline)}\n`;
    }
    content += strings.map(removeMultipleSpaces).join(delimiter);
    content += "\n\n";
  };

  /**
   * Saves the content to the specified file path.
   *
   * @param path - The file path where the content will be saved.
   */
  const saveContent = (path: string) => {
    fs.writeFileSync(path, content);
  };

  return { appendStrings, saveContent };
};

/**
 * Renders the base shortcut with the provided parameters.
 *
 * @param options - The options for rendering the base shortcut.
 * @param options.key - The key of the shortcut.
 * @param options.mode - The mode of the shortcut.
 * @param options.modifiers - The modifiers of the shortcut.
 * @returns The rendered base shortcut.
 *
 * @example
 * renderBaseShortcut({ key: "space", mode: "cmd", modifiers: ["shift"] });
 * // => "cmd < shift - space"
 */
export const renderBaseShortcut = ({
  key,
  mode = "",
  modifiers = [],
}: {
  key: string;
  mode?: string;
  modifiers?: string[];
}) => {
  return removeMultipleSpaces(
    `${mode} ${valueIfTrue(!!mode, "<")} ${modifiers.join(" + ")} ${
      isEmptyArr(modifiers) ? "" : "-"
    } ${key}`
  );
};

/**
 * Renders a shortcut with the specified mode, key, command, and modifiers.
 *
 * @template T - The type of the shortcut.
 * @param mode - The mode of the shortcut.
 * @param key - The key of the shortcut.
 * @param command - The command of the shortcut.
 * @param rest - Additional properties of the shortcut.
 * @returns The rendered shortcut.
 */
export const renderShortcut = <T extends string>({
  mode,
  key,
  command,
  ...rest
}: Shortcut<T>) => {
  const modifiers = "modifiers" in rest ? rest.modifiers : [];
  return removeMultipleSpaces(
    `${renderBaseShortcut({ key, mode, modifiers })} : ${command}`
  );
};

/**
 * Validates an array of shortcuts to ensure there are no duplicates.
 *
 * @template T - The type of the shortcut.
 * @param shortcuts - The array of shortcuts to validate.
 * @returns - The validated array of shortcuts.
 * @throws - If there are duplicate shortcuts or duplicate shortcuts without modifiers.
 */
export const validateShortcuts = <T extends string>(
  shortcuts: Shortcut<T>[]
) => {
  const renderedShortcuts = shortcuts.map(renderBaseShortcut);
  let duplicates = renderedShortcuts.filter(
    (command, index) => renderedShortcuts.indexOf(command) !== index
  );
  if (duplicates.length > 0) {
    throw new Error(`Duplicate shortcuts: ${duplicates.join(", ")}`);
  }

  const shortcutsWithoutModifiers = shortcuts
    .filter((s) => "modifiers" in s && isEmptyArr(s.modifiers))
    .map(renderBaseShortcut);
  const shortcutsWithOmitModifierAllowed = shortcuts
    .filter((s) => "omitModifierAllowed" in s && s.omitModifierAllowed)
    .map(renderBaseShortcut);

  const allShortcutsWithoutModifiers = shortcutsWithoutModifiers.concat(
    shortcutsWithOmitModifierAllowed
  );

  duplicates = allShortcutsWithoutModifiers.filter(
    (command, index) => allShortcutsWithoutModifiers.indexOf(command) !== index
  );

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate shortcuts without modifiers: ${duplicates.join(", ")}`
    );
  }

  return shortcuts;
};

/**
 * Creates an AppleScript command.
 *
 * @param script - The AppleScript code.
 * @returns The formatted AppleScript command.
 */
const createAppleScriptCommand = (script: string) => {
  return (
    "osascript " +
    script
      .trim()
      .split("\n")
      .map((s) => `-e '${s}'`)
      .join(" ")
  );
};

/**
 * Creates a command to open the specified URL.
 *
 * @param url - The URL to open.
 * @returns The command to open the URL.
 */
export const open = (url: string) => `open ${url}`;

/**
 * Creates a command to open the specified application.
 *
 * @param appName - The name of the application to open.
 * @returns The command to open the application.
 */
export const openApp = (appName: string) => `open -a '${appName}'`;

/**
 * Creates a command to execute the specified Raycast script.
 *
 * @param script - The script's deep link.
 * @param params - Optional. The params to pass to the script.
 * @returns The command to execute the Raycast script.
 */
export const openRaycast = (
  script: `${string}/${string}/${string}`,
  params?: {
    forceFocus?: boolean;
    arguments?: Record<string, string>;
    launchType?: "userInitiated" | "background";
  }
) => {
  let command = `open -g 'raycast://extensions/${script}`;

  const searchParams = new URLSearchParams();

  if (params?.arguments) {
    searchParams.append("arguments", JSON.stringify(params.arguments));
  }
  if (params?.launchType) {
    searchParams.append("launchType", params.launchType);
  }

  command += `?${searchParams.toString()}'`;

  if (params?.forceFocus) {
    command += ` && open -a 'Raycast'`;
  }
  return command;
};

/**
 * Constructs a command string to open a Raycast AI command with optional parameters.
 *
 * @param script - The script path in the format `${string}/${string}/${string}`.
 * @param params - Optional parameters for the command.
 * @returns The constructed command string.
 */
export const openAICommand = (
  script: string,
  params?: {
    arguments?: Record<string, string>;
    launchType?: "userInitiated" | "background";
  }
) => {
  let command = `open -g 'raycast://ai-commands/${script}`;
  if (params) {
    const searchParams = new URLSearchParams();
    if (params.arguments) {
      searchParams.append("arguments", JSON.stringify(params.arguments));
    }
    if (params.launchType) {
      searchParams.append("launchType", params.launchType);
    }
    command += `?${searchParams.toString()}`;
  }
  return `${command}'`;
};

/**
 * Creates a command to execute the specified Alfred script.
 *
 * @param path - The script's deed link.
 * @returns The command to execute the Alfred script.
 */
export const openAlfred = (script: `${string}/${string}/${string}`) =>
  `open -g alfred://runtrigger/${script}`;

/**
 * Opens a URL in a browser or a specific space in the Arc application.
 * If the URL does not start with "http" or "https", "https://" will be appended to it.
 * If a space is provided, the URL will be opened in a new tab in that space in the Arc application.
 * If no space is provided, the URL will be opened in the default browser.
 *
 * @param url - The URL to open.
 * @param space - Optional. The space in the Arc application where the URL should be opened.
 * @returns A command to open the URL in the Arc application or the default browser.
 */
export const openUrl = (url: string, space?: Space) => {
  // Append https if there is no http // https
  if (!url.startsWith("http") && !url.startsWith("https")) {
    url = `https://${url}`;
  }

  if (!space) {
    return open(url);
  }
  return createAppleScriptCommand(`
    tell application "Arc"
      tell front window      
        tell space "${space}"
          make new tab with properties {URL:"${url}"}
        end tell
      end tell
      activate
    end tell
  `);
};

/**
 * Executes a keypress by generating and running an AppleScript command.
 * To find out the key code of a specific key, you can use the `skhd -o` command in the Terminal.
 *
 * @param keyCombo - The keyCombo object containing the key code and optional modifiers.
 * @returns The generated AppleScript command as a string.
 */
export const executeKeypress = (keyCombo: {
  key: Key;
  modifiers?: Modifier[];
}) => {
  const command = renderBaseShortcut(keyCombo);
  return `skhd -k '${command}'`;
};
