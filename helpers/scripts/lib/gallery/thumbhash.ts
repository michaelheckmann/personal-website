import * as fs from "fs";
import { rgbaToThumbHash } from "thumbhash";

import type { ThumbHashCache } from "./shared";
import { THUMBHASH_CACHE_FILE, writeJsonFile } from "./shared";

export function loadThumbHashCache(): ThumbHashCache {
  try {
    if (fs.existsSync(THUMBHASH_CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(THUMBHASH_CACHE_FILE, "utf-8"));
    }
  } catch {
    console.warn("Failed to load thumbhash cache, starting fresh");
  }

  return {};
}

export function saveThumbHashCache(cache: ThumbHashCache): void {
  writeJsonFile(THUMBHASH_CACHE_FILE, cache);
}

export async function generateThumbHash(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(buffer)
      .resize(100, 100, { fit: "inside" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const thumbhash = rgbaToThumbHash(info.width, info.height, data);
    return Buffer.from(thumbhash).toString("base64");
  } catch (error) {
    console.error(`Error generating thumbhash for ${imageUrl}:`, error);
    return "";
  }
}
