import { useHtmlLang } from "@/src/hooks/usePageTitle";

/** Side-effects that should run for every page (mounted at the router root). */
export function RootEffects() {
  useHtmlLang();
  return null;
}
