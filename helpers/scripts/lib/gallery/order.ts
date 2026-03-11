import type { GalleryOrderFile } from "./shared";
import {
  ExistingGallerySchema,
  GALLERY_ORDER_PATH,
  GalleryOrderFileSchema,
  loadJsonFile,
  normalizeString,
  OUTPUT_PATH,
  uniqueIds,
  writeJsonFile,
} from "./shared";

export type AppliedGalleryOrder = {
  orderedIds: string[];
  appliedEntries: number;
  ignoredEntries: number;
};

function getDuplicateIds(assetIds: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const assetId of assetIds) {
    if (seen.has(assetId)) {
      duplicates.add(assetId);
      continue;
    }

    seen.add(assetId);
  }

  return Array.from(duplicates);
}

export function loadPersistedGalleryOrder(): GalleryOrderFile | null {
  return loadJsonFile(GALLERY_ORDER_PATH, GalleryOrderFileSchema);
}

export function applyPersistedGalleryOrder(
  assetIds: readonly string[],
  orderFile: GalleryOrderFile | null,
): AppliedGalleryOrder {
  const currentIds = uniqueIds(assetIds);
  if (!orderFile) {
    return {
      orderedIds: currentIds,
      appliedEntries: 0,
      ignoredEntries: 0,
    };
  }

  const currentIdSet = new Set(currentIds);
  const seenIds = new Set<string>();
  const orderedIds: string[] = [];
  let appliedEntries = 0;
  let ignoredEntries = 0;

  for (const item of orderFile.items) {
    if (!currentIdSet.has(item.id) || seenIds.has(item.id)) {
      ignoredEntries++;
      continue;
    }

    orderedIds.push(item.id);
    seenIds.add(item.id);
    appliedEntries++;
  }

  for (const assetId of currentIds) {
    if (seenIds.has(assetId)) {
      continue;
    }

    orderedIds.push(assetId);
  }

  return {
    orderedIds,
    appliedEntries,
    ignoredEntries,
  };
}

export function persistGalleryOrderFromCurrentOutput(): {
  itemCount: number;
  filePath: string;
} {
  const galleryItems = loadJsonFile(OUTPUT_PATH, ExistingGallerySchema);
  if (!galleryItems) {
    throw new Error(
      "Cannot persist gallery order because src/assets/gallery.json is missing or invalid.",
    );
  }

  const duplicateIds = getDuplicateIds(galleryItems.map((item) => item.id));
  if (duplicateIds.length > 0) {
    throw new Error(
      `Cannot persist gallery order because gallery.json contains duplicate IDs: ${duplicateIds.join(", ")}`,
    );
  }

  writeJsonFile(GALLERY_ORDER_PATH, {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: galleryItems.map((item) => ({
      id: item.id,
      title: normalizeString(item.title) || item.id,
    })),
  });

  return {
    itemCount: galleryItems.length,
    filePath: GALLERY_ORDER_PATH,
  };
}
