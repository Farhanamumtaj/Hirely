import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
const ThemeContext = createContext(null);
const KEY = "hirely-theme";
function initialTheme() {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "dark" || v === "light") return v;
  } catch {}
  return "light";
}
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {}
  }, [theme]);
  const toggleTheme = useCallback(
    () => setTheme((v) => (v === "dark" ? "light" : "dark")),
    [],
  );
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);
