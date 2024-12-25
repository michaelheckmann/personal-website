import type { Locales } from "@/i18n/i18n-types";

export type SiteConfig = {
  lang: Locales;
  title: string;
  description: string;
  image?: string;
  translationLinks?: { lang: string; href: string }[];
};
