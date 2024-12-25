import { locales } from "@/i18n/i18n-util";
import { $lang } from "@/i18n/translation";

type Href = "" | "blog" | `blog/${string}`;

/**
 * Prepends the current locale to a given href path.
 * @param href - The href path starting with a forward slash
 * @returns A new href path with the current locale prepended
 * @example
 * // if current locale is 'en'
 * getLocalHref('/about') // returns '/en/about'
 */
export const getLocalHref = (href: `/${Href}`) => {
  const locale = $lang.get();
  return `/${locale}${href}`;
};

/**
 * Removes the locale prefix from a given path string.
 *
 * @param path - The URL path string that may contain a locale prefix
 * @returns The path string with the locale prefix removed
 *
 * @example
 * ```typescript
 * removeLocaleFromPath('/en/about') // returns '/about'
 * removeLocaleFromPath('/de/contact') // returns '/contact'
 * removeLocaleFromPath('/blog') // returns '/blog'
 * removeLocaleFromPath('de/about') // returns 'about'
 * ```
 */
export const removeLocaleFromPath = (path: string) => {
  // If the path starts with a forward slash, remove the locale prefix
  // /de/about -> /about
  if (path.startsWith("/")) {
    const localesRegex = new RegExp(`^/(${locales.join("|")})`);
    return path.replace(localesRegex, "");
  }

  // If the path does not start with a forward slash, remove the locale prefix
  // Examples: de/about -> about
  const localesRegex = new RegExp(`^(${locales.join("|")})/`);
  return path.replace(localesRegex, "");
};

/**
 * Extracts the locale from a given path string.
 *
 * @param path - The URL path string to extract the locale from
 * @returns The locale string if found in the path, or an empty string if no locale is found
 *
 * @example
 * // With leading slash
 * extractLocaleFromPath('/en/about') // returns 'en'
 *
 * // Without leading slash
 * extractLocaleFromPath('de/contact') // returns 'de'
 *
 * // No locale in path
 * extractLocaleFromPath('/about') // returns ''
 */
export const extractLocaleFromPath = (path: string) => {
  if (path.startsWith("/")) {
    const localesRegex = new RegExp(`^/(${locales.join("|")})`);
    const match = path.match(localesRegex);
    return match ? match[1] : "";
  }

  const localesRegex = new RegExp(`^(${locales.join("|")})/`);
  const match = path.match(localesRegex);
  return match ? match[1] : "";
};

/**
 * Checks if a given pathname corresponds to a blog post URL pattern.
 * The pattern should match: /locale/blog/post-slug
 * where:
 * - locale is a 2-letter language code
 * - post-slug is an alphanumeric string with hyphens
 *
 * @param pathname - The URL pathname to check
 * @returns True if the pathname matches the blog post pattern, false otherwise
 *
 * @example
 * isBlogPost('/en/blog/my-first-post') // returns true
 * isBlogPost('/en/about') // returns false
 */
export const isBlogPost = (pathname: string) => {
  // Match this format /locale/blog/post-slug
  return /^\/[a-z]{2}\/blog\/[a-z0-9-]+\/?$/.test(pathname);
};

/**
 * Extracts the post ID from a given path and combines it with the current language value
 * @param path - The full path string containing the post ID
 * @returns A string combining the current language value and the extracted post ID, formatted as "language/postId"
 * @example
 * getPostIdFromPath('/en/blog/my-first-post') // returns 'en/my-first-post'
 */
export const getPostIdFromPath = (path: string) => {
  const rawPostId = path.split("/").pop();
  return `${$lang.value}/${rawPostId}`;
};
