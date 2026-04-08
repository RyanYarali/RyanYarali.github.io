/**
 * Theme Toggle - Dark/Light Mode with System Preference
 * Starts with system preference, allows manual toggle, and persists user choice
 */

(function () {
  "use strict";

  const STORAGE_KEY = "portfolio-theme-override";
  const themeToggle = document.getElementById("theme-toggle");

  // Get initial theme from user override or system preference
  function getInitialTheme() {
    const storedTheme = localStorage.getItem(STORAGE_KEY);

    if (storedTheme) {
      return storedTheme;
    }

    // Check system preference
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }

    return "light";
  }

  function updateToggleA11y(theme) {
    if (!themeToggle) return;

    const isDark = theme === "dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light theme" : "Switch to dark theme",
    );
    themeToggle.setAttribute(
      "title",
      isDark ? "Switch to light theme" : "Switch to dark theme",
    );
  }

  // Apply theme to document
  function applyTheme(theme, { persist = false } = {}) {
    document.documentElement.setAttribute("data-theme", theme);
    updateToggleA11y(theme);

    if (persist) {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }

  // Toggle theme
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme, { persist: true });
  }

  // Initialize theme
  const storedTheme = localStorage.getItem(STORAGE_KEY);
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme, { persist: Boolean(storedTheme) });

  // Add event listener to toggle button
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Listen for system theme changes (only if user hasn't manually set preference)
  if (window.matchMedia) {
    const darkModePreference = window.matchMedia(
      "(prefers-color-scheme: dark)",
    );
    darkModePreference.addEventListener("change", (e) => {
      // Only apply system change if user hasn't set a manual preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  }
})();
