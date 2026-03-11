import { resolveCookieAuth } from "./lib/gallery/auth";
import { parseArgs } from "./lib/gallery/cli";
import {
  fetchGalleryAssetIds,
  resolveAssetsForIds,
  resolveMetadataForIds,
} from "./lib/gallery/krea";
import {
  collectRealTitleExamples,
  extractDescription,
  extractProvider,
  isImageAsset,
} from "./lib/gallery/metadata";
import {
  applyPersistedGalleryOrder,
  loadPersistedGalleryOrder,
  persistGalleryOrderFromCurrentOutput,
} from "./lib/gallery/order";
import {
  AI_TITLE_MODEL,
  CACHE_DIR,
  ensureDirectory,
  ExistingGallerySchema,
  GALLERY_CACHE_ROOT,
  GALLERY_FOLDER_NAME,
  GALLERY_ORDER_PATH,
  HELP_TEXT,
  loadJsonFile,
  OUTPUT_PATH,
  writeJsonFile,
  type ExistingGalleryItem,
  type OutputItem,
} from "./lib/gallery/shared";
import {
  generateThumbHash,
  loadThumbHashCache,
  saveThumbHashCache,
} from "./lib/gallery/thumbhash";
import {
  loadAiTitleCache,
  resolveGalleryTitle,
  saveAiTitleCache,
} from "./lib/gallery/titles";

function loadExistingGalleryById(): Map<string, ExistingGalleryItem> {
  const existingGallery = loadJsonFile(OUTPUT_PATH, ExistingGallerySchema);
  if (!existingGallery) {
    return new Map();
  }

  return new Map(existingGallery.map((item) => [item.id, item]));
}

async function processGalleryData(): Promise<void> {
  const options = parseArgs();

  if (options.showHelp) {
    console.log(HELP_TEXT);
    return;
  }

  if (options.persistOrder) {
    const result = persistGalleryOrderFromCurrentOutput();
    console.log(
      `Saved custom gallery order for ${result.itemCount} item(s) to ${result.filePath}`,
    );
    return;
  }

  ensureDirectory(CACHE_DIR);
  ensureDirectory(GALLERY_CACHE_ROOT);

  const existingGalleryById = loadExistingGalleryById();
  const auth = await resolveCookieAuth(options);

  console.log(`Using Krea auth from ${auth.source}`);

  const defaultAssetIds = await fetchGalleryAssetIds(auth, options);
  if (defaultAssetIds.length === 0) {
    writeJsonFile(OUTPUT_PATH, []);
    console.log(`Output written to: ${OUTPUT_PATH}`);
    console.log(`The ${GALLERY_FOLDER_NAME} folder is empty`);
    return;
  }

  const savedOrder = loadPersistedGalleryOrder();
  const orderResult = applyPersistedGalleryOrder(defaultAssetIds, savedOrder);
  if (savedOrder) {
    console.log(
      `Applying saved gallery order from ${GALLERY_ORDER_PATH} (${orderResult.appliedEntries} matched, ${orderResult.ignoredEntries} stale ignored)`,
    );
  }

  const galleryAssetIds = orderResult.orderedIds;

  console.log(
    `Found ${galleryAssetIds.length} asset(s) in the ${GALLERY_FOLDER_NAME} folder`,
  );

  const { assetsById, stats: assetStats } = await resolveAssetsForIds(
    auth,
    galleryAssetIds,
    options,
  );
  const { metadataById, stats: metadataStats } = await resolveMetadataForIds(
    auth,
    galleryAssetIds,
    options,
  );

  const titleExamples = collectRealTitleExamples(galleryAssetIds, metadataById);
  if (titleExamples.length > 0) {
    console.log(
      `Using ${titleExamples.length} real gallery title example(s) for AI title generation`,
    );
  }

  const aiTitleCache = loadAiTitleCache(auth.workspaceId);
  let aiTitleCacheHits = 0;
  let aiTitlesGenerated = 0;
  let fallbackTitlesUsed = 0;

  const thumbhashCache = loadThumbHashCache();
  let thumbhashCacheHits = 0;
  let thumbhashCacheMisses = 0;

  const outputData: OutputItem[] = [];

  for (const assetId of galleryAssetIds) {
    const asset = assetsById.get(assetId);
    if (!asset) {
      throw new Error(`Missing asset ${assetId} after Krea asset sync`);
    }

    if (!isImageAsset(asset)) {
      throw new Error(
        `Gallery asset ${asset.id} is not an image. The website gallery still only supports images.`,
      );
    }

    if (asset.width == null || asset.height == null) {
      throw new Error(
        `Gallery asset ${asset.id} is missing width or height, which the website needs for layout.`,
      );
    }

    const metadata = metadataById[asset.id];
    const fallbackItem = existingGalleryById.get(asset.id);
    const description = extractDescription(metadata, fallbackItem);
    const provider = extractProvider(metadata, fallbackItem);
    const titleResult = await resolveGalleryTitle({
      assetId: asset.id,
      metadata,
      description,
      cache: aiTitleCache,
      modelId: AI_TITLE_MODEL,
      referenceExamples: titleExamples.filter(
        (example) => example.assetId !== asset.id,
      ),
    });
    const title = titleResult.title;

    if (titleResult.source === "ai-cache") {
      aiTitleCacheHits++;
    } else if (titleResult.source === "ai-generated") {
      aiTitlesGenerated++;
    } else if (titleResult.source === "fallback") {
      fallbackTitlesUsed++;
    }

    console.log(`Processing: ${title}`);

    let thumbhash = thumbhashCache[asset.id];
    if (thumbhash) {
      thumbhashCacheHits++;
      console.log(`  Using cached thumbhash for asset: ${asset.id}`);
    } else {
      console.log(`  Generating thumbhash for asset: ${asset.id}`);
      thumbhash = await generateThumbHash(asset.image_url);
      thumbhashCache[asset.id] = thumbhash;
      thumbhashCacheMisses++;
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

  saveAiTitleCache(auth.workspaceId, aiTitleCache);
  saveThumbHashCache(thumbhashCache);
  writeJsonFile(OUTPUT_PATH, outputData);

  console.log(`\nOutput written to: ${OUTPUT_PATH}`);
  console.log(
    `Assets: ${assetStats.networkRequests} network page(s), ${assetStats.cachedPages} cached page(s)`,
  );
  console.log(
    `Metadata: ${metadataStats.networkRequests} network page(s), ${metadataStats.cachedPages} cached page(s)`,
  );
  console.log(
    `Titles: ${aiTitleCacheHits} cached AI, ${aiTitlesGenerated} generated, ${fallbackTitlesUsed} fallback`,
  );
  console.log(
    `Thumbhashes: ${thumbhashCacheHits} cached, ${thumbhashCacheMisses} generated`,
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
