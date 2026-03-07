import * as fs from "fs";
import * as path from "path";
import { createInterface } from "readline/promises";
import { rgbaToThumbHash } from "thumbhash";
import { z } from "zod";

import { CURATED_GALLERY_ASSET_IDS } from "./gallery-curated-assets";

const KREA_ASSETS_URL = "https://api.krea.ai/assets";
const KREA_API_TOKEN_ENV_NAME = "KREA_API_TOKEN";
const CURATED_ASSET_FILE_PATH = "helpers/scripts/gallery-curated-assets.ts";
const PAGE_SIZE = 1000;
const curatedAssetIds: string[] = [...CURATED_GALLERY_ASSET_IDS];

const CACHE_DIR = path.join(import.meta.dir, "../../.cache");
const CACHE_FILE = path.join(CACHE_DIR, "thumbhash-cache.json");

type ThumbHashCache = Record<string, string>;

function loadCache(): ThumbHashCache {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    }
  } catch (error) {
    console.warn("Failed to load cache, starting fresh");
  }
  return {};
}

function saveCache(cache: ThumbHashCache): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

const AssetSchema = z.object({
  id: z.string(),
  image_url: z.string().url(),
  uploaded_at: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  size_bytes: z.number().nullable().optional(),
  mime_type: z.string().nullable().optional(),
  description: z
    .string()
    .nullish()
    .transform((value) => value ?? ""),
  metadata: z.unknown().optional(),
});

const ListAssetsResponseSchema = z.object({
  items: z.array(AssetSchema),
  nextCursor: z.string().nullable(),
});

type KreaAsset = z.infer<typeof AssetSchema>;

type OutputItem = {
  id: string;
  title: string;
  width: number;
  height: number;
  description: string;
  provider: string;
  image_url: string;
  thumbhash: string;
};

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".avi", ".mkv"];

function isVideoUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => urlLower.includes(ext));
}

function isImageAsset(asset: KreaAsset): boolean {
  const mimeType = asset.mime_type?.toLowerCase().trim();
  if (mimeType) {
    return mimeType.startsWith("image/");
  }
  return !isVideoUrl(asset.image_url);
}

function normalizeString(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function getStringAtPath(
  value: unknown,
  pathSegments: readonly string[],
): string | undefined {
  let current: unknown = value;

  for (const pathSegment of pathSegments) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[pathSegment];
  }

  if (typeof current !== "string") {
    return undefined;
  }

  const normalized = normalizeString(current);
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

function findMetadataString(
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

function formatFallbackTitle(description: string, assetId: string): string {
  const normalizedDescription = description.replace(/\s+/g, " ").trim();

  if (!normalizedDescription) {
    return `Asset ${assetId.slice(0, 8)}`;
  }

  if (normalizedDescription.length <= 60) {
    return normalizedDescription;
  }

  return `${normalizedDescription.slice(0, 57).trimEnd()}...`;
}

function extractDescription(asset: KreaAsset): string {
  const assetDescription = normalizeString(asset.description);
  if (assetDescription) {
    return assetDescription;
  }

  return (
    findMetadataString(
      asset.metadata,
      [
        ["description"],
        ["prompt"],
        ["input_params", "prompt"],
        ["job_data", "input_params", "prompt"],
      ],
      ["description", "prompt"],
    ) ?? ""
  );
}

function extractTitle(asset: KreaAsset, description: string): string {
  const title = findMetadataString(
    asset.metadata,
    [["title"], ["name"], ["asset", "title"], ["source", "title"]],
    ["title", "name"],
  );

  if (title) {
    return title;
  }

  console.warn(`Missing title for ${asset.id}, using a fallback title`);
  return formatFallbackTitle(description, asset.id);
}

function extractProvider(asset: KreaAsset): string {
  return (
    findMetadataString(
      asset.metadata,
      [
        ["provider"],
        ["input_params", "provider"],
        ["job_data", "input_params", "provider"],
        ["generation", "provider"],
        ["model", "provider"],
      ],
      ["provider"],
    ) ?? ""
  );
}

function validateCuratedAssetIds(): void {
  const seenIds = new Set<string>();
  const duplicateIds: string[] = [];

  for (const assetId of curatedAssetIds) {
    if (seenIds.has(assetId)) {
      duplicateIds.push(assetId);
      continue;
    }

    seenIds.add(assetId);
  }

  if (duplicateIds.length > 0) {
    throw new Error(
      `Duplicate asset IDs found in ${CURATED_ASSET_FILE_PATH}: ${duplicateIds.join(", ")}`,
    );
  }
}

function getApiToken(): string {
  const apiToken = process.env[KREA_API_TOKEN_ENV_NAME]?.trim();

  if (!apiToken) {
    throw new Error(
      `Missing ${KREA_API_TOKEN_ENV_NAME}. Create a token in Krea settings and export it before running this script.`,
    );
  }

  return apiToken;
}

async function confirmCuratedAssetListIsUpToDate(): Promise<void> {
  if (process.argv.includes("--yes") || process.argv.includes("-y")) {
    return;
  }

  if (!process.stdin.isTTY) {
    return;
  }

  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const answer = await prompt.question(
      `Curated gallery asset IDs live in ${CURATED_ASSET_FILE_PATH}.\nIs that list up to date before syncing? [y/N] `,
    );

    const normalizedAnswer = answer.trim().toLowerCase();
    if (normalizedAnswer === "y" || normalizedAnswer === "yes") {
      return;
    }

    throw new Error(
      `Sync aborted. Update ${CURATED_ASSET_FILE_PATH} and rerun when it matches the assets you want on the site.`,
    );
  } finally {
    prompt.close();
  }
}

async function fetchCuratedAssets(
  apiToken: string,
): Promise<Map<string, KreaAsset>> {
  const remainingAssetIds = new Set(curatedAssetIds);
  const assetsById = new Map<string, KreaAsset>();
  let nextCursor: string | null = null;
  let pageCount = 0;

  do {
    const requestUrl = new URL(KREA_ASSETS_URL);
    requestUrl.searchParams.set("limit", String(PAGE_SIZE));
    if (nextCursor) {
      requestUrl.searchParams.set("cursor", nextCursor);
    }

    pageCount++;
    console.log(`Fetching Krea assets page ${pageCount}...`);

    const response = await fetch(requestUrl, {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (response.status === 401) {
      throw new Error(
        `Krea API rejected ${KREA_API_TOKEN_ENV_NAME}. Check that the token is valid for the correct workspace.`,
      );
    }

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Krea assets: ${response.status} ${response.statusText}`,
      );
    }

    const rawData = await response.json();
    const parseResult = ListAssetsResponseSchema.safeParse(rawData);
    if (!parseResult.success) {
      throw new Error(
        `Krea assets response did not match the expected shape: ${parseResult.error.message}`,
      );
    }

    const pageData = parseResult.data;

    for (const asset of pageData.items) {
      if (!remainingAssetIds.has(asset.id)) {
        continue;
      }

      assetsById.set(asset.id, asset);
      remainingAssetIds.delete(asset.id);
    }

    nextCursor = pageData.nextCursor;
  } while (nextCursor && remainingAssetIds.size > 0);

  console.log(
    `Matched ${assetsById.size}/${curatedAssetIds.length} curated assets after ${pageCount} page(s)`,
  );

  if (remainingAssetIds.size > 0) {
    throw new Error(
      `Some curated asset IDs were not returned by the Krea API: ${Array.from(remainingAssetIds).join(", ")}`,
    );
  }

  return assetsById;
}

async function generateThumbHash(imageUrl: string): Promise<string> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Use sharp to resize and get raw pixel data
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(buffer)
      .resize(100, 100, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert to thumbhash
    const thumbhash = rgbaToThumbHash(info.width, info.height, data);

    // Convert to base64 for storage
    return Buffer.from(thumbhash).toString("base64");
  } catch (error) {
    console.error(`Error generating thumbhash for ${imageUrl}:`, error);
    return "";
  }
}

async function processGalleryData(): Promise<void> {
  validateCuratedAssetIds();
  await confirmCuratedAssetListIsUpToDate();

  if (curatedAssetIds.length === 0) {
    const outputPath = new URL("../../src/assets/gallery.json", import.meta.url)
      .pathname;
    await Bun.write(outputPath, JSON.stringify([], null, 2));
    console.log(`Output written to: ${outputPath}`);
    console.log("No curated asset IDs configured, wrote an empty gallery file");
    return;
  }

  console.log("Fetching curated gallery data from the official Krea API...");

  const apiToken = getApiToken();
  const assetsById = await fetchCuratedAssets(apiToken);

  const cache = loadCache();
  let cacheHits = 0;
  let cacheMisses = 0;

  const outputData: OutputItem[] = [];

  for (const assetId of curatedAssetIds) {
    const asset = assetsById.get(assetId);
    if (!asset) {
      throw new Error(`Missing asset ${assetId} after API sync`);
    }

    if (!isImageAsset(asset)) {
      throw new Error(
        `Curated asset ${asset.id} is not an image. The current gallery pipeline only supports images.`,
      );
    }

    if (asset.width == null || asset.height == null) {
      throw new Error(
        `Curated asset ${asset.id} is missing width or height, which the website needs for layout.`,
      );
    }

    const description = extractDescription(asset);
    const title = extractTitle(asset, description);
    const provider = extractProvider(asset);

    console.log(`Processing: ${title}`);

    let thumbhash: string;

    if (cache[asset.id]) {
      thumbhash = cache[asset.id];
      cacheHits++;
      console.log(`  Using cached thumbhash for asset: ${asset.id}`);
    } else {
      console.log(`  Generating thumbhash for asset: ${asset.id}`);
      thumbhash = await generateThumbHash(asset.image_url);
      cache[asset.id] = thumbhash;
      cacheMisses++;
    }

    outputData.push({
      id: asset.id,
      title,
      width: asset.width,
      height: asset.height,
      description,
      provider,
      image_url: asset.image_url,
      thumbhash,
    });
  }

  saveCache(cache);

  const outputPath = new URL("../../src/assets/gallery.json", import.meta.url)
    .pathname;
  await Bun.write(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`\nOutput written to: ${outputPath}`);
  console.log(
    `Processed ${outputData.length} items (${cacheHits} cached, ${cacheMisses} generated)`,
  );
}

processGalleryData().catch((error) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown error while processing gallery data", error);
  }

  process.exit(1);
});
