import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import zh from "./locales/zh.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import vi from "./locales/vi.json";
import de from "./locales/de.json";
import fr from "./locales/fr.json";

export const SUPPORTED_LOCALES = [
  { code: "en", label: "English" },
  { code: "zh", label: "简体中文" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]["code"];

export const LOCALE_COOKIE = "qr_locale";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      ja: { translation: ja },
      ko: { translation: ko },
      vi: { translation: vi },
      de: { translation: de },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LOCALES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      order: ["cookie", "localStorage", "navigator"],
      caches: ["cookie", "localStorage"],
      lookupCookie: LOCALE_COOKIE,
      lookupLocalStorage: LOCALE_COOKIE,
      cookieMinutes: 60 * 24 * 365, // 1 year
      cookieOptions: { path: "/", sameSite: "lax" },
      // Normalize anything we read (cookie / localStorage / navigator)
      // to one of our 7 single-segment codes.
      convertDetectedLanguage: (lng: string) => {
        const lower = (lng || "").toLowerCase();
        if (lower.startsWith("zh")) return "zh";
        if (lower.startsWith("ja")) return "ja";
        if (lower.startsWith("ko")) return "ko";
        if (lower.startsWith("vi")) return "vi";
        if (lower.startsWith("de")) return "de";
        if (lower.startsWith("fr")) return "fr";
        return "en";
      },
    },
  });

export default i18n;
