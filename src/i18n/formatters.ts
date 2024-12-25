import type { FormattersInitializer } from "typesafe-i18n";
import type { Formatters, Locales } from "./i18n-types.js";

type AtagParams = {
  href: string;
  text: string;
  openInTab?: boolean;
  class?: string | string[];
};

export const initFormatters: FormattersInitializer<Locales, Formatters> = (
  locale: Locales,
) => {
  const formatters: Formatters = {
    // add your formatter functions here
    atag: (params: AtagParams) => {
      const target = params.openInTab ? 'target="_blank"' : "";
      const classString = Array.isArray(params.class)
        ? params.class.join(" ")
        : params.class;
      const className = params.class ? `class="${classString}"` : "";
      return `<a href="${params.href}" ${target} ${className}>${params.text}</a>`;
    },
  };

  return formatters;
};
