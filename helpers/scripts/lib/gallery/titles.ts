import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

import {
  buildAiTitleInput,
  extractMetadataTitle,
  formatFallbackTitle,
} from "./metadata";
import type { AiTitleCache, AiTitleExample, KreaMetadataItem } from "./shared";
import {
  AI_TITLE_MODEL,
  AiTitleCacheSchema,
  createHashValue,
  getWorkspaceCacheDir,
  loadJsonFile,
  normalizeString,
  OPENAI_API_KEY_ENV_NAME,
  writeJsonFile,
} from "./shared";

const GeneratedTitleSchema = z.object({
  title: z.string().min(1).max(80),
});

type ResolveGalleryTitleParams = {
  assetId: string;
  metadata: KreaMetadataItem | undefined;
  description: string;
  cache: AiTitleCache;
  referenceExamples: readonly AiTitleExample[];
  modelId?: string;
};

export type ResolveGalleryTitleResult = {
  title: string;
  source: "metadata" | "ai-cache" | "ai-generated" | "fallback";
};

function getAiTitleCachePath(workspaceId: string): string {
  return `${getWorkspaceCacheDir(workspaceId)}/ai-titles.json`;
}

function stripWrappingQuotes(value: string): string {
  return value.replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, "").trim();
}

function normalizeGeneratedTitle(value: string): string {
  return stripWrappingQuotes(value)
    .replace(/\s+/g, " ")
    .replace(/[.]+$/g, "")
    .trim();
}

function buildPrompt(
  assetId: string,
  referenceExamples: readonly AiTitleExample[],
  input: ReturnType<typeof buildAiTitleInput>,
): string {
  if (!input) {
    return `Asset ID: ${assetId}`;
  }

  const exampleSection = referenceExamples.length
    ? `Real titles already used on this gallery:\n${referenceExamples
        .map(
          (example, index) =>
            `${index + 1}. Context: ${example.context}\n   Title: ${example.title}`,
        )
        .join("\n")}`
    : "";

  const targetLines = [
    `Asset ID: ${assetId}`,
    input.description ? `Description: ${input.description}` : "",
    input.prompt && input.prompt !== input.description
      ? `Prompt: ${input.prompt}`
      : "",
    input.provider ? `Provider: ${input.provider}` : "",
    input.kind ? `Type: ${input.kind}` : "",
  ].filter(Boolean);

  return [
    "Write one concise, evocative gallery title for a personal website.",
    "The title should feel like a finished artwork title, not a raw prompt fragment.",
    "Prefer 2 to 6 words when possible.",
    "Avoid provider names, camera specs, direct prompt boilerplate, quotation marks, and trailing punctuation.",
    exampleSection,
    `Target asset metadata:\n${targetLines.join("\n")}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function loadAiTitleCache(workspaceId: string): AiTitleCache {
  return (
    loadJsonFile(getAiTitleCachePath(workspaceId), AiTitleCacheSchema) ?? {}
  );
}

export function saveAiTitleCache(
  workspaceId: string,
  cache: AiTitleCache,
): void {
  writeJsonFile(getAiTitleCachePath(workspaceId), cache);
}

export async function resolveGalleryTitle(
  params: ResolveGalleryTitleParams,
): Promise<ResolveGalleryTitleResult> {
  const modelId = params.modelId ?? AI_TITLE_MODEL;
  const metadataTitle = extractMetadataTitle(params.metadata);

  if (metadataTitle) {
    delete params.cache[params.assetId];
    return {
      title: metadataTitle,
      source: "metadata",
    };
  }

  const input = buildAiTitleInput(params.metadata);
  if (!input) {
    delete params.cache[params.assetId];
    return {
      title: formatFallbackTitle(params.description, params.assetId),
      source: "fallback",
    };
  }

  const fingerprint = createHashValue(JSON.stringify(input));
  const cachedTitle = params.cache[params.assetId];
  if (
    cachedTitle &&
    cachedTitle.fingerprint === fingerprint &&
    cachedTitle.model === modelId
  ) {
    return {
      title: cachedTitle.title,
      source: "ai-cache",
    };
  }

  const apiKey = process.env[OPENAI_API_KEY_ENV_NAME]?.trim();
  if (!apiKey) {
    throw new Error(
      `Missing ${OPENAI_API_KEY_ENV_NAME}. The gallery sync needs it to generate titles for assets that do not already have one in Krea.`,
    );
  }

  const response = await generateObject({
    model: openai(modelId),
    schema: GeneratedTitleSchema,
    system:
      "You name images for a personal art gallery. Return a compact title that matches the style of the provided real examples.",
    prompt: buildPrompt(params.assetId, params.referenceExamples, input),
  });

  const title = normalizeGeneratedTitle(response.object.title);
  if (!normalizeString(title)) {
    return {
      title: formatFallbackTitle(params.description, params.assetId),
      source: "fallback",
    };
  }

  params.cache[params.assetId] = {
    fingerprint,
    model: modelId,
    title,
    updatedAt: new Date().toISOString(),
  };

  return {
    title,
    source: "ai-generated",
  };
}
