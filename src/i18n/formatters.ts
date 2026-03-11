import type { FormattersInitializer } from "typesafe-i18n";

import type { Formatters, Locales } from "./i18n-types.js";

type AtagParams = {
  href: string;
  text: string;
  openInTab?: boolean;
  class?: string | string[];
};

const isAtagParams = (value: unknown): value is AtagParams => {
  return typeof value === "object" && value !== null && "href" in value && "text" in value;
};

export const initFormatters: FormattersInitializer<Locales, Formatters> = (
  _locale: Locales,
) => {
  const formatters: Formatters = {
    // add your formatter functions here
    atag: (value: unknown) => {
      if (!isAtagParams(value)) {
        return "";
      }

      const target = value.openInTab ? 'target="_blank"' : "";
      const classString = Array.isArray(value.class)
        ? value.class.join(" ")
        : value.class;
      const className = value.class ? `class="${classString}"` : "";
      return `<a href="${value.href}" ${target} ${className}>${value.text}</a>`;
    },
  };

  return formatters;
};
