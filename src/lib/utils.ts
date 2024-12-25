import type { ImageMetadata } from "astro";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

/**
 * Converts a string into a non-negative numeric hash value.
 * Uses the Jenkins hash function algorithm.
 *
 * @param value - The string to be hashed
 * @returns A non-negative integer representing the hash value
 *
 * @example
 * ```typescript
 * const hash = hashStringToNumber("hello"); // Returns a consistent numeric value
 * ```
 */
export const hashStringToNumber = (value: string) => {
  let hash = 0;
  if (value.length === 0) return hash;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const getResponsiveImageProps = (image: ImageMetadata) => {
  const defaultSizes: Record<number, number> = {
    360: 240,
    720: 540,
    1600: 720,
  };

  const sizesProp = Object.entries(defaultSizes)
    .map(([key, value]) => `(max-width: ${key}px) ${value}px`)
    .join(", ");

  const widthsProp = Object.values(defaultSizes);

  return {
    widths: [...widthsProp, image.width],
    sizes: `${sizesProp}, ${image.width}px`,
  };
};
