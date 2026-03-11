import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

export const KREA_ASSETS_URL = "https://www.krea.ai/api/assets";
export const KREA_METADATA_URL = "https://www.krea.ai/api/assets/metadata";
export const KREA_FOLDERS_URL = "https://www.krea.ai/api/assets/folders";
export const KREA_WEB_COOKIE_ENV_NAME = "KREA_WEB_COOKIE";
export const OPENAI_API_KEY_ENV_NAME = "OPENAI_API_KEY";
export const GALLERY_FOLDER_NAME = "Gallery";
export const PAGE_SIZE = 3000;
export const AI_TITLE_MODEL = "gpt-5-mini";

const REPO_ROOT = path.join(import.meta.dir, "../../../../");

export const CACHE_DIR = path.join(REPO_ROOT, ".cache");
export const GALLERY_CACHE_ROOT = path.join(CACHE_DIR, "krea-gallery");
export const THUMBHASH_CACHE_FILE = path.join(
  CACHE_DIR,
  "thumbhash-cache.json",
);
export const ENV_FILE = path.join(REPO_ROOT, ".env");
export const OUTPUT_PATH = path.join(REPO_ROOT, "src/assets/gallery.json");
export const GALLERY_ORDER_PATH = path.join(
  REPO_ROOT,
  "src/assets/gallery-order.json",
);

export const HELP_TEXT = `Sync the website gallery from Krea using browser cookie auth.

Examples:
  bun run gallery
  bun run gallery --refresh
  bun run gallery --curl "$(pbpaste)"
  bun run gallery --persist-order
  KREA_WEB_COOKIE="cookie=value; ..." bun run gallery

Auth sources:
  1. --cookie
  2. ${KREA_WEB_COOKIE_ENV_NAME} from .env or the shell
  3. --curl with a copied Krea cURL command
  4. macOS clipboard if it contains a copied Krea cURL command

Order workflow:
  1. Edit src/assets/gallery.json to preview a new order quickly
  2. Run bun run gallery --persist-order
  3. Future syncs will reuse the saved order from src/assets/gallery-order.json

On macOS, the easiest sync flow is:
  1. In Krea, open DevTools -> Network
  2. Copy any /api/assets, /api/assets/metadata, or /api/assets/folders request as cURL
  3. Run bun run gallery
`;

export type CliOptions = {
  refresh: boolean;
  skipPrompts: boolean;
  showHelp: boolean;
  persistOrder: boolean;
  curlCommand?: string;
  cookieHeader?: string;
};

export type CookieAuth = {
  cookieHeader: string;
  workspaceId: string;
  source: string;
};

export type ThumbHashCache = Record<string, string>;

export type CacheStats = {
  networkRequests: number;
  cachedPages: number;
};

export type EndpointName = "assets" | "metadata" | "folders";

export const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  asset_ids: z.array(z.string()).default([]),
  is_team_shared: z.boolean().optional(),
});

export const FoldersResponseSchema = z.object({
  folders: z.array(FolderSchema),
});

export const AssetSchema = z.object({
  id: z.string(),
  image_url: z.string().url(),
  uploaded_at: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  mime_type: z.string().nullish(),
  size_bytes: z.number().nullable().optional(),
});

export const AssetsResponseSchema = z.object({
  items: z.array(AssetSchema),
  nextCursor: z.string().nullable(),
});

export const MetadataItemSchema = z
  .object({
    description: z.string().nullish(),
    type: z.string().optional(),
    title: z.string().optional(),
    name: z.string().optional(),
    prompt: z.string().optional(),
    provider: z.string().optional(),
    input_params: z
      .object({
        prompt: z.string().optional(),
        provider: z.string().optional(),
      })
      .passthrough()
      .optional(),
    generation_job_id: z.string().optional(),
    generation_job_type: z.string().optional(),
  })
  .passthrough();

export const MetadataResponseSchema = z.object({
  items: z.record(z.string(), MetadataItemSchema),
  nextCursor: z.string().nullable(),
});

export const CachedAssetIndexSchema = z.object({
  updatedAt: z.string(),
  byId: z.record(z.string(), AssetSchema),
});

export const CachedMetadataIndexSchema = z.object({
  updatedAt: z.string(),
  byId: z.record(z.string(), MetadataItemSchema),
});

export const OutputItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  width: z.number(),
  height: z.number(),
  description: z.string(),
  provider: z.string(),
  image_url: z.string(),
  thumbhash: z.string(),
});

export const ExistingGallerySchema = z.array(OutputItemSchema);

export const GalleryOrderItemSchema = z.object({
  id: z.string(),
  title: z.string(),
});

export const GalleryOrderFileSchema = z.object({
  version: z.literal(1),
  updatedAt: z.string(),
  items: z.array(GalleryOrderItemSchema),
});

export const AiTitleCacheEntrySchema = z.object({
  fingerprint: z.string(),
  model: z.string(),
  title: z.string(),
  updatedAt: z.string(),
});

export const AiTitleCacheSchema = z.record(z.string(), AiTitleCacheEntrySchema);

export type KreaFolder = z.infer<typeof FolderSchema>;
export type KreaAsset = z.infer<typeof AssetSchema>;
export type KreaMetadataItem = z.infer<typeof MetadataItemSchema>;
export type OutputItem = z.infer<typeof OutputItemSchema>;
export type ExistingGalleryItem = z.infer<typeof OutputItemSchema>;
export type GalleryOrderFile = z.infer<typeof GalleryOrderFileSchema>;
export type AiTitleCache = z.infer<typeof AiTitleCacheSchema>;

export type AiTitleInput = {
  description: string;
  prompt: string;
  provider: string;
  kind: string;
};

export type AiTitleExample = {
  assetId: string;
  title: string;
  context: string;
};

export function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function normalizeString(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function loadJsonFile<T>(
  filePath: string,
  schema: z.ZodType<T>,
): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const rawData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const data =
      rawData && typeof rawData === "object" && "data" in rawData
        ? rawData.data
        : rawData;

    const parseResult = schema.safeParse(data);
    if (parseResult.success) {
      return parseResult.data;
    }

    console.warn(`Ignoring invalid cache file at ${filePath}`);
  } catch {
    console.warn(`Ignoring unreadable cache file at ${filePath}`);
  }

  return null;
}

export function writeJsonFile(filePath: string, data: unknown): void {
  ensureDirectory(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function createHashValue(value: string, length?: number): string {
  const hash = createHash("sha256").update(value).digest("hex");
  return length ? hash.slice(0, length) : hash;
}

export function getWorkspaceCacheDir(workspaceId: string): string {
  return path.join(GALLERY_CACHE_ROOT, workspaceId);
}

export function uniqueIds(assetIds: readonly string[]): string[] {
  const seenIds = new Set<string>();
  const orderedAssetIds: string[] = [];

  for (const assetId of assetIds) {
    if (!assetId || seenIds.has(assetId)) {
      continue;
    }

    seenIds.add(assetId);
    orderedAssetIds.push(assetId);
  }

  return orderedAssetIds;
}
