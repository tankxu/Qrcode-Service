import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/**
 * Sets `document.title` from a translation key (and optional interpolation).
 * Re-applies on locale change.
 */
export function usePageTitle(i18nKey: string, options?: Record<string, unknown>) {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.title = t(i18nKey, options);
  }, [t, i18n.resolvedLanguage, i18nKey, JSON.stringify(options ?? {})]);
}

/**
 * Keeps `<html lang>` in sync with the active i18n locale.
 * Mount once near the root.
 */
export function useHtmlLang() {
  const { i18n } = useTranslation();
  useEffect(() => {
    const lang = i18n.resolvedLanguage || i18n.language || "en";
    document.documentElement.setAttribute("lang", lang);
  }, [i18n.resolvedLanguage, i18n.language]);
}
