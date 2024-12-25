// @ts-expect-error -- we need this particular import path to get the types to work
import type { GetFieldType } from "@types/lodash/index";
import get from "lodash.get";
import { atom } from "nanostores";

import type { Locales, TranslationFunctions } from "./i18n-types";
import { i18nObject } from "./i18n-util";
import { loadLocale } from "./i18n-util.sync";

type IsAny<T> = unknown extends T
  ? [keyof T] extends [never]
    ? false
    : true
  : false;

type ExcludeArrayKeys<T> =
  T extends ArrayLike<any> ? Exclude<keyof T, keyof any[]> : keyof T;

export type PathImpl<T, Key extends keyof T> = Key extends string
  ? IsAny<T[Key]> extends true
    ? never
    : T[Key] extends Record<string, any>
      ?
          | `${Key}.${PathImpl<T[Key], ExcludeArrayKeys<T[Key]>> & string}`
          | `${Key}.${ExcludeArrayKeys<T[Key]> & string}`
      : never
  : never;

type PathImpl2<T> = PathImpl<T, keyof T> | keyof T;

export type Path<T> = keyof T extends string
  ? PathImpl2<T> extends infer P
    ? P extends string | keyof T
      ? P
      : keyof T
    : keyof T
  : never;

export const $lang = atom<Locales>("en");

export const getTranslation = <T extends Path<TranslationFunctions>>(
  path: T,
): GetFieldType<TranslationFunctions, T> => {
  return get(i18nObject($lang.get()), path as Parameters<typeof get>[1]);
};

export const setLanguage = (lang: Locales) => {
  loadLocale(lang);
  $lang.set(lang);
};
