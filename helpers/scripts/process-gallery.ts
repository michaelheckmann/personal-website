import * as fs from "fs";
import * as path from "path";
import { rgbaToThumbHash } from "thumbhash";
import { z } from "zod";

const FEED_BASE_URL =
  "https://www.krea.ai/api/feed?user=michaelheckmann&approvalStatus=all&itemOffset=";

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

// Input schema for the raw feed data
const JobDataSchema = z.object({
  type: z.string().optional(),
  input_params: z
    .object({
      prompt: z.string().optional(),
      provider: z.string().optional(),
    })
    .passthrough()
    .optional(),
});

const InputEntrySchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  width: z.number(),
  height: z.number(),
  job_data: JobDataSchema.optional(),
  metadata: z.object({
    type: z.string().optional(),
    description: z.string().optional(),
    input_params: z.record(z.string(), z.unknown()).optional(),
    generation_job_id: z.string().optional(),
  }),
  image_url: z.string().url(),
});

const InputItemSchema = z.object({
  id: z.string(),
  author: z.string().optional(),
  metadata: z.object({
    title: z.string(),
    description: z.string(),
  }),
  created_at: z.string().optional(),
  owner: z.unknown().optional(),
  like_count: z.number().optional(),
  view_count: z.number().optional(),
  liked: z.boolean().optional(),
  style_info: z.unknown().optional(),
  entries: z.array(InputEntrySchema),
  approved: z.unknown().optional(),
  styles: z.array(z.unknown()).optional(),
});

const InputSchema = z.array(InputItemSchema);

// Output schema - simplified to only necessary fields
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
  console.log("Fetching gallery data from Krea API...");

  // Fetch all pages of feed data
  const allInputData: z.infer<typeof InputItemSchema>[] = [];
  let offset = 0;

  while (true) {
    const url = `${FEED_BASE_URL}${offset}`;
    console.log(`Fetching page at offset ${offset}...`);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch feed: ${response.statusText}`);
      process.exit(1);
    }

    const rawData = await response.json();

    // Validate input
    const parseResult = InputSchema.safeParse(rawData);
    if (!parseResult.success) {
      console.error("Invalid input data:", parseResult.error.format());
      process.exit(1);
    }

    const pageData = parseResult.data;

    // Stop if we get an empty page
    if (pageData.length === 0) {
      console.log("Reached end of feed");
      break;
    }

    allInputData.push(...pageData);
    offset += pageData.length;
  }

  console.log(`Found ${allInputData.length} total items to process`);

  // Load thumbhash cache
  const cache = loadCache();
  let cacheHits = 0;
  let cacheMisses = 0;
  let skippedVideos = 0;

  // Transform and generate thumbhashes
  const outputData: OutputItem[] = [];

  for (const item of allInputData) {
    console.log(`Processing: ${item.metadata.title}`);

    // Only take the first entry
    const entry = item.entries[0];
    if (!entry) {
      console.log(`  No entries found, skipping`);
      continue;
    }

    // Skip video entries
    if (isVideoUrl(entry.image_url)) {
      console.log(`  Skipping video entry: ${entry.id}`);
      skippedVideos++;
      continue;
    }

    // Skip duplicate entries
    if (outputData.some((output) => output.id === entry.id)) {
      console.log(`  Skipping duplicate entry: ${entry.id}`);
      continue;
    }

    let thumbhash: string;

    if (cache[entry.id]) {
      thumbhash = cache[entry.id];
      cacheHits++;
      console.log(`  Using cached thumbhash for entry: ${entry.id}`);
    } else {
      console.log(`  Generating thumbhash for entry: ${entry.id}`);
      thumbhash = await generateThumbHash(entry.image_url);
      cache[entry.id] = thumbhash;
      cacheMisses++;
    }

    // Get description from job_data.input_params.prompt
    const description = entry.job_data?.input_params?.prompt ?? "";

    // Get provider from job_data.input_params.provider
    const provider = entry.job_data?.input_params?.provider ?? "";

    outputData.push({
      id: entry.id,
      title: item.metadata.title,
      width: entry.width,
      height: entry.height,
      description,
      provider,
      image_url: entry.image_url,
      thumbhash,
    });
  }

  // Save updated cache
  saveCache(cache);

  // Write output file
  const outputPath = new URL("../../src/assets/gallery.json", import.meta.url)
    .pathname;
  await Bun.write(outputPath, JSON.stringify(outputData, null, 2));
  console.log(`\nOutput written to: ${outputPath}`);
  console.log(
    `Processed ${outputData.length} items (${cacheHits} cached, ${cacheMisses} generated, ${skippedVideos} videos skipped)`,
  );
}

// Main execution
processGalleryData();
