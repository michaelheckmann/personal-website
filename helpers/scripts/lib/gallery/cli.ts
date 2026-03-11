import type { CliOptions } from "./shared";

export function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    refresh: false,
    skipPrompts: false,
    showHelp: false,
    persistOrder: false,
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];

    if (arg === "--refresh") {
      options.refresh = true;
      continue;
    }

    if (arg === "--yes" || arg === "-y") {
      options.skipPrompts = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.showHelp = true;
      continue;
    }

    if (arg === "--persist-order" || arg === "--save-order") {
      options.persistOrder = true;
      continue;
    }

    if (arg === "--curl") {
      const nextArg = args[index + 1];
      if (!nextArg) {
        throw new Error("Missing value for --curl");
      }

      options.curlCommand = nextArg;
      index++;
      continue;
    }

    if (arg === "--cookie") {
      const nextArg = args[index + 1];
      if (!nextArg) {
        throw new Error("Missing value for --cookie");
      }

      options.cookieHeader = nextArg;
      index++;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}
