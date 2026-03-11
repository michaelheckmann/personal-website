import * as fs from "fs";
import * as path from "path";
import { createInterface } from "readline/promises";

import type { CliOptions, CookieAuth } from "./shared";
import { ensureDirectory, ENV_FILE, KREA_WEB_COOKIE_ENV_NAME } from "./shared";

function stripWrappingQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function sanitizeCookieHeader(value: string): string {
  return stripWrappingQuotes(value.trim())
    .replace(/^cookie\s*:\s*/i, "")
    .trim();
}

function getCookieValue(
  cookieHeader: string,
  cookieName: string,
): string | undefined {
  for (const cookiePart of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookiePart.trim().split("=");
    if (name !== cookieName) {
      continue;
    }

    return valueParts.join("=");
  }

  return undefined;
}

function createCookieAuth(cookieHeader: string, source: string): CookieAuth {
  const sanitizedCookie = sanitizeCookieHeader(cookieHeader);
  if (!sanitizedCookie || !sanitizedCookie.includes("=")) {
    throw new Error(`Could not extract a valid Cookie header from ${source}`);
  }

  return {
    cookieHeader: sanitizedCookie,
    workspaceId:
      getCookieValue(sanitizedCookie, "krea-workspace-id")?.trim() ||
      "workspace-unknown",
    source,
  };
}

function extractCookieFromCurlCommand(command: string): string | null {
  const normalizedCommand = command.replace(/\\\r?\n/g, " ");
  const matchers = [
    /(?:^|\s)(?:-b|--cookie)\s+'([^']+)'/,
    /(?:^|\s)(?:-b|--cookie)\s+"([^"]+)"/,
    /(?:^|\s)-H\s+'cookie:\s*([^']+)'/i,
    /(?:^|\s)-H\s+"cookie:\s*([^"]+)"/i,
  ];

  for (const matcher of matchers) {
    const match = normalizedCommand.match(matcher);
    if (match?.[1]) {
      return sanitizeCookieHeader(match[1]);
    }
  }

  return null;
}

function extractCookieFromAuthInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const cookieFromCurl = extractCookieFromCurlCommand(trimmed);
  if (cookieFromCurl) {
    return cookieFromCurl;
  }

  if (/^cookie\s*:/i.test(trimmed)) {
    return sanitizeCookieHeader(trimmed);
  }

  if (/^[^\s=;]+=[^;]+(?:;|$)/.test(trimmed)) {
    return sanitizeCookieHeader(trimmed);
  }

  return null;
}

function tryReadClipboardText(): string | null {
  if (process.platform !== "darwin") {
    return null;
  }

  try {
    const result = Bun.spawnSync({
      cmd: ["pbpaste"],
      stdout: "pipe",
      stderr: "pipe",
    });

    if (!result.success) {
      return null;
    }

    const clipboardText = new TextDecoder().decode(result.stdout).trim();
    return clipboardText || null;
  } catch {
    return null;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertEnvVariable(
  filePath: string,
  variableName: string,
  value: string,
): void {
  ensureDirectory(path.dirname(filePath));

  const serializedValue = `${variableName}=${JSON.stringify(value)}`;
  const variablePattern = new RegExp(`^${escapeRegExp(variableName)}=.*$`, "m");
  let fileContents = fs.existsSync(filePath)
    ? fs.readFileSync(filePath, "utf-8")
    : "";

  if (variablePattern.test(fileContents)) {
    fileContents = fileContents.replace(variablePattern, serializedValue);
  } else {
    fileContents = `${fileContents.trimEnd()}${fileContents.trimEnd() ? "\n" : ""}${serializedValue}\n`;
  }

  fs.writeFileSync(filePath, fileContents);
}

async function maybePersistCookieToEnv(
  cookieHeader: string,
  options: CliOptions,
): Promise<void> {
  if (options.skipPrompts || !process.stdin.isTTY) {
    return;
  }

  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await prompt.question(
      `Save extracted ${KREA_WEB_COOKIE_ENV_NAME} to ${path.relative(process.cwd(), ENV_FILE) || ".env"} for future runs? [Y/n] `,
    );

    const normalizedAnswer = answer.trim().toLowerCase();
    if (normalizedAnswer === "n" || normalizedAnswer === "no") {
      return;
    }

    upsertEnvVariable(ENV_FILE, KREA_WEB_COOKIE_ENV_NAME, cookieHeader);
    console.log(`Saved ${KREA_WEB_COOKIE_ENV_NAME} to ${ENV_FILE}`);
  } finally {
    prompt.close();
  }
}

export async function resolveCookieAuth(
  options: CliOptions,
): Promise<CookieAuth> {
  const directCandidates = [
    options.cookieHeader
      ? { input: options.cookieHeader, source: "--cookie" }
      : null,
    process.env[KREA_WEB_COOKIE_ENV_NAME]?.trim()
      ? {
          input: process.env[KREA_WEB_COOKIE_ENV_NAME]!,
          source: KREA_WEB_COOKIE_ENV_NAME,
        }
      : null,
    options.curlCommand
      ? { input: options.curlCommand, source: "--curl" }
      : null,
  ];

  for (const candidate of directCandidates) {
    if (!candidate) {
      continue;
    }

    const extractedCookie = extractCookieFromAuthInput(candidate.input);
    if (!extractedCookie) {
      throw new Error(
        `Could not extract a Krea Cookie header from ${candidate.source}`,
      );
    }

    return createCookieAuth(extractedCookie, candidate.source);
  }

  const clipboardText = tryReadClipboardText();
  if (clipboardText) {
    const extractedCookie = extractCookieFromAuthInput(clipboardText);
    if (extractedCookie) {
      console.log(
        "Using Krea browser auth extracted from the macOS clipboard...",
      );
      await maybePersistCookieToEnv(extractedCookie, options);
      return createCookieAuth(extractedCookie, "clipboard");
    }
  }

  if (process.stdin.isTTY && process.platform === "darwin") {
    const prompt = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      console.log("Krea browser auth is required to sync the gallery.");
      console.log(
        "Copy any Krea /api/assets, /api/assets/metadata, or /api/assets/folders request as cURL, then come back here.",
      );
      await prompt.question(
        "Once the cURL command is in your clipboard, press Enter to continue. ",
      );
    } finally {
      prompt.close();
    }

    const clipboardAfterPrompt = tryReadClipboardText();
    if (clipboardAfterPrompt) {
      const extractedCookie = extractCookieFromAuthInput(clipboardAfterPrompt);
      if (extractedCookie) {
        console.log("Using Krea browser auth extracted from the clipboard...");
        await maybePersistCookieToEnv(extractedCookie, options);
        return createCookieAuth(extractedCookie, "clipboard");
      }
    }
  }

  throw new Error(
    `Missing Krea browser auth. Copy a Krea request as cURL and rerun bun run gallery, pass --curl "$(pbpaste)", or set ${KREA_WEB_COOKIE_ENV_NAME} in .env.`,
  );
}
