/**
 * Theme Toggle - Dark/Light Mode
 * Persists user preference in localStorage
 */

(function () {
  "use strict";

  const STORAGE_KEY = "portfolio-theme";
  const themeToggle = document.getElementById("theme-toggle");

  // Get initial theme from localStorage or system preference
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

  // Apply theme to document
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  // Toggle theme
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    applyTheme(newTheme);
  }

  // Initialize theme
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);

  // Add event listener to toggle button
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    mediaQuery.addEventListener("change", (e) => {
      // Only apply if user hasn't manually set a preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        applyTheme(e.matches ? "dark" : "light");
      }
    });
  }

  // Add keyboard shortcut (Ctrl/Cmd + Shift + D)
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
      e.preventDefault();
      toggleTheme();
    }
  });

  console.log(`🎨 Theme initialized:  ${initialTheme}`);
})();
