import type {
  AiTitleExample,
  AiTitleInput,
  ExistingGalleryItem,
  KreaAsset,
  KreaMetadataItem,
} from "./shared";
import { normalizeString } from "./shared";

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi", ".mkv"];

function getStringAtPath(
  value: unknown,
  pathSegments: readonly string[],
): string | undefined {
  let currentValue: unknown = value;

  for (const pathSegment of pathSegments) {
    if (
      !currentValue ||
      typeof currentValue !== "object" ||
      Array.isArray(currentValue)
    ) {
      return undefined;
    }

    currentValue = (currentValue as Record<string, unknown>)[pathSegment];
  }

  if (typeof currentValue !== "string") {
    return undefined;
  }

  const normalized = normalizeString(currentValue);
  return normalized || undefined;
}

function findFirstStringByKeys(
  value: unknown,
  candidateKeys: readonly string[],
  depth = 0,
): string | undefined {
  if (depth > 5 || !value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringByKeys(item, candidateKeys, depth + 1);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  if (typeof value !== "object") {
    return undefined;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (candidateKeys.includes(key) && typeof nestedValue === "string") {
      const normalized = normalizeString(nestedValue);
      if (normalized) {
        return normalized;
      }
    }
  }

  for (const nestedValue of Object.values(value)) {
    const found = findFirstStringByKeys(nestedValue, candidateKeys, depth + 1);
    if (found) {
      return found;
    }
  }

  return undefined;
}

export function findMetadataString(
  metadata: unknown,
  candidatePaths: readonly (readonly string[])[],
  candidateKeys: readonly string[],
): string | undefined {
  for (const candidatePath of candidatePaths) {
    const found = getStringAtPath(metadata, candidatePath);
    if (found) {
      return found;
    }
  }

  return findFirstStringByKeys(metadata, candidateKeys);
}

export function isImageAsset(asset: KreaAsset): boolean {
  const mimeType = normalizeString(asset.mime_type ?? undefined).toLowerCase();
  if (mimeType) {
    return mimeType.startsWith("image/");
  }

  const normalizedUrl = asset.image_url.toLowerCase();
  return !VIDEO_EXTENSIONS.some((extension) =>
    normalizedUrl.includes(extension),
  );
}

export function extractMetadataTitle(
  metadata: KreaMetadataItem | undefined,
): string | undefined {
  return findMetadataString(metadata, [["title"], ["name"]], ["title", "name"]);
}

export function extractMetadataDescription(
  metadata: KreaMetadataItem | undefined,
): string | undefined {
  return findMetadataString(
    metadata,
    [["description"], ["prompt"], ["input_params", "prompt"]],
    ["description", "prompt"],
  );
}

export function extractMetadataPrompt(
  metadata: KreaMetadataItem | undefined,
): string | undefined {
  return findMetadataString(
    metadata,
    [["prompt"], ["input_params", "prompt"]],
    ["prompt"],
  );
}

export function extractMetadataProvider(
  metadata: KreaMetadataItem | undefined,
): string | undefined {
  return findMetadataString(
    metadata,
    [["provider"], ["input_params", "provider"]],
    ["provider"],
  );
}

export function extractDescription(
  metadata: KreaMetadataItem | undefined,
  fallbackItem: ExistingGalleryItem | undefined,
): string {
  return (
    extractMetadataDescription(metadata) || fallbackItem?.description || ""
  );
}

export function extractProvider(
  metadata: KreaMetadataItem | undefined,
  fallbackItem: ExistingGalleryItem | undefined,
): string {
  return extractMetadataProvider(metadata) || fallbackItem?.provider || "";
}

export function formatFallbackTitle(
  description: string,
  assetId: string,
): string {
  const normalizedDescription = description.replace(/\s+/g, " ").trim();

  if (!normalizedDescription) {
    return `Asset ${assetId.slice(0, 8)}`;
  }

  if (normalizedDescription.length <= 60) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 57).trimEnd()}...`;
}

export function buildAiTitleInput(
  metadata: KreaMetadataItem | undefined,
): AiTitleInput | null {
  const description = extractMetadataDescription(metadata) || "";
  const prompt = extractMetadataPrompt(metadata) || "";
  const provider = extractMetadataProvider(metadata) || "";
  const kind =
    normalizeString(metadata?.generation_job_type) ||
    normalizeString(metadata?.type);

  if (!description && !prompt) {
    return null;
  }

  return {
    description,
    prompt,
    provider,
    kind,
  };
}

function normalizeForComparison(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function isHighQualityReferenceTitle(
  title: string,
  input: AiTitleInput,
): boolean {
  const normalizedTitle = normalizeString(title);
  if (!normalizedTitle) {
    return false;
  }

  if (
    normalizedTitle.endsWith("...") ||
    normalizedTitle.length > 60 ||
    normalizedTitle.includes(":") ||
    !/[A-Z]/.test(normalizedTitle)
  ) {
    return false;
  }

  const words = normalizedTitle.split(/\s+/);
  if (words.length > 8) {
    return false;
  }

  const sourceTexts = [input.description, input.prompt]
    .map(normalizeForComparison)
    .filter(Boolean);
  const comparableTitle = normalizeForComparison(normalizedTitle);

  return !sourceTexts.some(
    (sourceText) =>
      sourceText === comparableTitle ||
      (normalizedTitle.length >= 18 && sourceText.startsWith(comparableTitle)),
  );
}

function buildExampleContext(input: AiTitleInput): string {
  const parts = [input.description];

  if (input.prompt && input.prompt !== input.description) {
    parts.push(input.prompt);
  }

  if (input.provider) {
    parts.push(`provider: ${input.provider}`);
  }

  const joined = parts.filter(Boolean).join(" | ");
  if (joined.length <= 220) {
    return joined;
  }

  return `${joined.slice(0, 217).trimEnd()}...`;
}

export function collectRealTitleExamples(
  assetIds: readonly string[],
  metadataById: Record<string, KreaMetadataItem>,
): AiTitleExample[] {
  const strongMatches: AiTitleExample[] = [];
  const fallbackMatches: AiTitleExample[] = [];
  const seenTitles = new Set<string>();

  for (const assetId of assetIds) {
    const metadata = metadataById[assetId];
    const title = extractMetadataTitle(metadata);
    const input = buildAiTitleInput(metadata);

    if (!title || !input) {
      continue;
    }

    const dedupeKey = normalizeForComparison(title);
    if (!dedupeKey || seenTitles.has(dedupeKey)) {
      continue;
    }

    const example: AiTitleExample = {
      assetId,
      title: normalizeString(title),
      context: buildExampleContext(input),
    };

    if (!example.context) {
      continue;
    }

    seenTitles.add(dedupeKey);

    if (isHighQualityReferenceTitle(title, input)) {
      strongMatches.push(example);
    } else {
      fallbackMatches.push(example);
    }
  }

  const orderedExamples =
    strongMatches.length >= 4
      ? strongMatches
      : [...strongMatches, ...fallbackMatches];

  return orderedExamples.slice(0, 8);
}
