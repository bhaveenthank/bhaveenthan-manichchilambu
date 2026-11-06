import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Corpus, Lang } from "./types";

interface AppState { corpus: Corpus; lang: Lang; setLang: (l: Lang) => void; go: (path: string) => void; dark: boolean; toggleTheme: () => void }
export const AppContext = createContext<AppState | null>(null);
export const useApp = () => useContext(AppContext)!;

/** t("Songs", "பாடல்கள்"), with the language kept in context so every component stays short. */
export function useT() {
  const { lang } = useApp();
  return useCallback((en: string, ta: string) => (lang === "ta" ? ta : en), [lang]);
}

export function useName() {
  const { corpus, lang } = useApp();
  return useCallback((id: string) => { const n = corpus.nodeById.get(id); return n ? n[lang] : id.replace(/_/g, " "); }, [corpus, lang]);
}

/** Hash routes, so links survive a refresh on GitHub Pages with no server rewriting. */
export function useRoute() {
  const read = () => {
    const raw = window.location.hash.replace(/^#\/?/, "");
    const [path, query] = raw.split("?");
    return { parts: path.split("/").filter(Boolean), params: new URLSearchParams(query ?? "") };
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => { setRoute(read()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const go = (path: string) => { window.location.hash = path; };
