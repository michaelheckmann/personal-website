import { homedir } from "os";
import path from "path";

export const SKHDRC_PATH = path.join(homedir(), ".skhdrc");

export const DESCRIPTION_PREFIX = "## Shortcut:";
export const MODE_DELIMITER = "<";
export const COMMAND_DELIMITER = ":";
export const COMMAND_END = ";";

export const SECTION_TITLE = {
  APP: "Open App",
  BROWSE: "Browse",
  RAYCAST: "Raycast",
  ALFRED: "Alfred",
  OTHER: "Other",
};
