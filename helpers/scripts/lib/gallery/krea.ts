import * as path from "path";
import { z } from "zod";

import type {
  CacheStats,
  CliOptions,
  CookieAuth,
  EndpointName,
  KreaAsset,
  KreaMetadataItem,
} from "./shared";
import {
  AssetsResponseSchema,
  CachedAssetIndexSchema,
  CachedMetadataIndexSchema,
  createHashValue,
  FoldersResponseSchema,
  GALLERY_FOLDER_NAME,
  getWorkspaceCacheDir,
  KREA_ASSETS_URL,
  KREA_FOLDERS_URL,
  KREA_METADATA_URL,
  loadJsonFile,
  MetadataItemSchema,
  MetadataResponseSchema,
  PAGE_SIZE,
  uniqueIds,
  writeJsonFile,
} from "./shared";

function getEndpointCacheDir(
  workspaceId: string,
  endpointName: EndpointName,
): string {
  return path.join(getWorkspaceCacheDir(workspaceId), endpointName);
}

function getPaginatedPageCachePath(
  workspaceId: string,
  endpointName: "assets" | "metadata",
  cursor: string | null,
): string {
  const fileName = cursor
    ? `cursor-${createHashValue(cursor, 16)}.json`
    : "head.json";
  return path.join(
    getEndpointCacheDir(workspaceId, endpointName),
    "pages",
    fileName,
  );
}

function getLatestResponseCachePath(
  workspaceId: string,
  endpointName: EndpointName,
): string {
  return path.join(
    getEndpointCacheDir(workspaceId, endpointName),
    "latest.json",
  );
}

function getIndexCachePath(
  workspaceId: string,
  endpointName: "assets" | "metadata",
): string {
  return path.join(
    getEndpointCacheDir(workspaceId, endpointName),
    "index.json",
  );
}

function saveCachedResponse(
  filePath: string,
  requestUrl: string,
  data: unknown,
): void {
  writeJsonFile(filePath, {
    requestUrl,
    fetchedAt: new Date().toISOString(),
    data,
  });
}

function loadAssetIndex(workspaceId: string): Record<string, KreaAsset> {
  const cachedIndex = loadJsonFile(
    getIndexCachePath(workspaceId, "assets"),
    CachedAssetIndexSchema,
  );

  return cachedIndex?.byId ?? {};
}

function saveAssetIndex(
  workspaceId: string,
  byId: Record<string, KreaAsset>,
): void {
  writeJsonFile(getIndexCachePath(workspaceId, "assets"), {
    updatedAt: new Date().toISOString(),
    byId,
  });
}

function loadMetadataIndex(
  workspaceId: string,
): Record<string, KreaMetadataItem> {
  const cachedIndex = loadJsonFile(
    getIndexCachePath(workspaceId, "metadata"),
    CachedMetadataIndexSchema,
  );

  return cachedIndex?.byId ?? {};
}

function saveMetadataIndex(
  workspaceId: string,
  byId: Record<string, KreaMetadataItem>,
): void {
  writeJsonFile(getIndexCachePath(workspaceId, "metadata"), {
    updatedAt: new Date().toISOString(),
    byId,
  });
}

function buildKreaHeaders(auth: CookieAuth): Record<string, string> {
  return {
    Accept: "application/json",
    Cookie: auth.cookieHeader,
    Referer: "https://www.krea.ai/assets",
  };
}

function buildRequestUrl(baseUrl: string, cursor: string | null): string {
  const requestUrl = new URL(baseUrl);
  requestUrl.searchParams.set("limit", String(PAGE_SIZE));
  if (cursor) {
    requestUrl.searchParams.set("cursor", cursor);
  }

  return requestUrl.toString();
}

async function fetchJsonFromKrea<T>(
  auth: CookieAuth,
  requestUrl: string,
  schema: z.ZodType<T>,
  responseLabel: string,
): Promise<T> {
  const response = await fetch(requestUrl, {
    headers: buildKreaHeaders(auth),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      `Krea rejected the browser cookie while fetching ${responseLabel}. Copy a fresh cURL request from Krea and rerun the script.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${responseLabel}: ${response.status} ${response.statusText}`,
    );
  }

  const rawData = await response.json();
  const parseResult = schema.safeParse(rawData);
  if (!parseResult.success) {
    throw new Error(
      `Unexpected Krea response while fetching ${responseLabel}: ${parseResult.error.message}`,
    );
  }

  return parseResult.data;
}

export async function fetchGalleryAssetIds(
  auth: CookieAuth,
  options: CliOptions,
): Promise<string[]> {
  const cachePath = getLatestResponseCachePath(auth.workspaceId, "folders");

  try {
    console.log("Fetching Krea folders...");
    const response = await fetchJsonFromKrea(
      auth,
      KREA_FOLDERS_URL,
      FoldersResponseSchema,
      "folder list",
    );
    saveCachedResponse(cachePath, KREA_FOLDERS_URL, response);

    const galleryFolder = response.folders.find(
      (folder) => folder.name === GALLERY_FOLDER_NAME,
    );
    if (!galleryFolder) {
      const folderNames = response.folders
        .map((folder) => folder.name)
        .join(", ");
      throw new Error(
        `Could not find a folder named ${GALLERY_FOLDER_NAME}. Available folders: ${folderNames || "none"}`,
      );
    }

    return uniqueIds(galleryFolder.asset_ids);
  } catch (error) {
    if (options.refresh) {
      throw error;
    }

    const cachedResponse = loadJsonFile(cachePath, FoldersResponseSchema);
    if (!cachedResponse) {
      throw error;
    }

    console.warn("Falling back to the cached Krea folders response");
    const galleryFolder = cachedResponse.folders.find(
      (folder) => folder.name === GALLERY_FOLDER_NAME,
    );
    if (!galleryFolder) {
      throw error;
    }

    return uniqueIds(galleryFolder.asset_ids);
  }
}

export async function resolveAssetsForIds(
  auth: CookieAuth,
  assetIds: readonly string[],
  options: CliOptions,
): Promise<{ assetsById: Map<string, KreaAsset>; stats: CacheStats }> {
  const assetIndex = loadAssetIndex(auth.workspaceId);
  const unresolvedAssetIds = new Set(
    assetIds.filter((assetId) => options.refresh || !assetIndex[assetId]),
  );
  const stats: CacheStats = {
    networkRequests: 0,
    cachedPages: 0,
  };

  let cursor: string | null = null;
  let firstPage = true;

  while (unresolvedAssetIds.size > 0) {
    const requestUrl = buildRequestUrl(KREA_ASSETS_URL, cursor);
    const cachePath = getPaginatedPageCachePath(
      auth.workspaceId,
      "assets",
      cursor,
    );
    let pageData: z.infer<typeof AssetsResponseSchema> | null = null;

    if (!firstPage && !options.refresh) {
      pageData = loadJsonFile(cachePath, AssetsResponseSchema);
      if (pageData) {
        stats.cachedPages++;
      }
    }

    if (!pageData) {
      console.log(
        `Fetching Krea assets${cursor ? ` after cursor ${cursor}` : ""}...`,
      );
      pageData = await fetchJsonFromKrea(
        auth,
        requestUrl,
        AssetsResponseSchema,
        "assets page",
      );
      saveCachedResponse(cachePath, requestUrl, pageData);
      stats.networkRequests++;
    }

    for (const asset of pageData.items) {
      assetIndex[asset.id] = asset;
      unresolvedAssetIds.delete(asset.id);
    }

    if (!pageData.nextCursor) {
      break;
    }

    cursor = pageData.nextCursor;
    firstPage = false;
  }

  saveAssetIndex(auth.workspaceId, assetIndex);

  if (unresolvedAssetIds.size > 0) {
    throw new Error(
      `Some Gallery assets were not found in the Krea assets feed: ${Array.from(unresolvedAssetIds).join(", ")}`,
    );
  }

  const assetsById = new Map<string, KreaAsset>();
  for (const assetId of assetIds) {
    const asset = assetIndex[assetId];
    if (!asset) {
      throw new Error(`Missing asset ${assetId} after Krea asset sync`);
    }

    assetsById.set(assetId, asset);
  }

  return { assetsById, stats };
}

export async function resolveMetadataForIds(
  auth: CookieAuth,
  assetIds: readonly string[],
  options: CliOptions,
): Promise<{
  metadataById: Record<string, KreaMetadataItem>;
  stats: CacheStats;
}> {
  const metadataIndex = loadMetadataIndex(auth.workspaceId);
  const unresolvedAssetIds = new Set(
    assetIds.filter((assetId) => options.refresh || !metadataIndex[assetId]),
  );
  const stats: CacheStats = {
    networkRequests: 0,
    cachedPages: 0,
  };

  let cursor: string | null = null;
  let firstPage = true;

  while (unresolvedAssetIds.size > 0) {
    const requestUrl = buildRequestUrl(KREA_METADATA_URL, cursor);
    const cachePath = getPaginatedPageCachePath(
      auth.workspaceId,
      "metadata",
      cursor,
    );
    let pageData: z.infer<typeof MetadataResponseSchema> | null = null;

    if (!firstPage && !options.refresh) {
      pageData = loadJsonFile(cachePath, MetadataResponseSchema);
      if (pageData) {
        stats.cachedPages++;
      }
    }

    if (!pageData) {
      console.log(
        `Fetching Krea metadata${cursor ? ` after cursor ${cursor}` : ""}...`,
      );
      pageData = await fetchJsonFromKrea(
        auth,
        requestUrl,
        MetadataResponseSchema,
        "metadata page",
      );
      saveCachedResponse(cachePath, requestUrl, pageData);
      stats.networkRequests++;
    }

    for (const [assetId, metadata] of Object.entries(pageData.items)) {
      metadataIndex[assetId] = MetadataItemSchema.parse(metadata);
      unresolvedAssetIds.delete(assetId);
    }

    if (!pageData.nextCursor) {
      break;
    }

    cursor = pageData.nextCursor;
    firstPage = false;
  }

  saveMetadataIndex(auth.workspaceId, metadataIndex);

  if (unresolvedAssetIds.size > 0) {
    console.warn(
      `Metadata was not returned for some Gallery assets. The script will fall back to existing gallery data where possible: ${Array.from(unresolvedAssetIds).join(", ")}`,
    );
  }

  return { metadataById: metadataIndex, stats };
}
