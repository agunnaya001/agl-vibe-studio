import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeMode = "dark" | "light";

interface ThemeContextType {
  theme: ThemeMode;
  isLight: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  isLight: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

const THEME_STORAGE_KEY = "agl_theme";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        if (saved === "light" || saved === "dark") {
          return saved;
        }
      } catch (err) {
        console.warn("Could not load theme from localStorage:", err);
      }
    }
    return "dark";
  });

  const applyTheme = (mode: ThemeMode) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;

    if (mode === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
      body.classList.add("light");
      body.classList.remove("dark");
      root.setAttribute("data-theme", "light");
      root.style.colorScheme = "light";
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
      body.classList.remove("light");
      body.classList.add("dark");
      root.setAttribute("data-theme", "dark");
      root.style.colorScheme = "dark";
    }
  };

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (err) {
      console.warn("Could not save theme to localStorage:", err);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isLight: theme === "light",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
