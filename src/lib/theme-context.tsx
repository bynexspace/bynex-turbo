import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Theme = "neon" | "cloud";
const KEY = "bynex.theme";

const ThemeCtx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: "neon",
  setTheme: () => {},
  toggle: () => {},
});

function apply(t: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("theme-neon", "theme-cloud");
  root.classList.add(`theme-${t}`);
  root.style.colorScheme = t === "neon" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("neon");

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && (localStorage.getItem(KEY) as Theme)) || "neon";
    setThemeState(saved);
    apply(saved);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    apply(t);
    try { localStorage.setItem(KEY, t); } catch {}
  };

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === "neon" ? "cloud" : "neon") }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
