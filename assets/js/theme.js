/**
 * Theme: light/dark with system preference
 * ----------------------------------------
 * Starts from the system setting, allows a manual override, and persists it.
 *
 * The toggle button lives in the palette dock, which palette.js builds on
 * DOMContentLoaded, so this script cannot bind to it directly at parse time.
 * It listens on the document instead and exposes window.siteTheme, which means
 * the control can move anywhere in the markup without touching this file.
 */

(function () {
  "use strict";

  var STORAGE_KEY = "portfolio-theme-override";

  function systemTheme() {
    return window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") || systemTheme();
  }

  function updateToggleA11y(theme) {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    var isDark = theme === "dark";
    var label = isDark ? "Switch to light theme" : "Switch to dark theme";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute("aria-label", label);
    toggle.setAttribute("title", label);
  }

  function applyTheme(theme, options) {
    document.documentElement.setAttribute("data-theme", theme);
    updateToggleA11y(theme);

    if (options && options.persist) {
      try {
        localStorage.setItem(STORAGE_KEY, theme);
      } catch (e) {}
    }
  }

  function toggleTheme() {
    applyTheme(current() === "dark" ? "light" : "dark", { persist: true });
  }

  var storedTheme = null;
  try {
    storedTheme = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}

  applyTheme(storedTheme || systemTheme(), { persist: Boolean(storedTheme) });

  // Delegated, so the button can be rendered at any point after this runs.
  document.addEventListener("click", function (e) {
    var hit = e.target.closest && e.target.closest("#theme-toggle");
    if (hit) toggleTheme();
  });

  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", function (e) {
        var override = null;
        try {
          override = localStorage.getItem(STORAGE_KEY);
        } catch (err) {}
        if (!override) applyTheme(e.matches ? "dark" : "light");
      });
  }

  window.siteTheme = {
    toggle: toggleTheme,
    apply: applyTheme,
    current: current,
    syncControl: updateToggleA11y,
  };
})();
