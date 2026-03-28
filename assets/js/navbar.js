/**
 * Reusable Navbar Component
 * Renders shared navigation markup on all pages.
 */

(function () {
  "use strict";

  function detectContext() {
    const path = window.location.pathname.replace(/\\/g, "/");

    if (path.endsWith("/") || path.endsWith("/index.html")) {
      return "home";
    }

    if (path.includes("/projects/")) {
      return "project";
    }

    return "root";
  }

  function buildNavbar(context) {
    const isHome = context === "home";
    const base = context === "project" ? "../" : "";

    const homeHref = isHome ? "#hero" : `${base}index.html`;
    const aboutHref = isHome ? "#about" : `${base}index.html#about`;
    const skillsHref = isHome ? "#skills" : `${base}index.html#skills`;
    const projectsHref = isHome ? "#projects" : `${base}projects.html`;
    const learningHref = isHome ? "#learning" : `${base}index.html#learning`;
    const contactHref = isHome ? "#contact" : `${base}index.html#contact`;

    const logoText = isHome
      ? '<span class="logo-text"><span class="logo-typing"></span></span>'
      : '<span class="logo-text"><span class="logo-typing-static">Ryan Yarali</span></span>';

    return `
      <nav class="navbar">
        <div class="nav-container">
          <a href="${homeHref}" class="logo">
            ${logoText}
            <span class="logo-subtitle">Portfolio</span>
          </a>

          <ul class="nav-links" id="nav-links">
            <li><a href="${aboutHref}" class="nav-link">About</a></li>
            <li><a href="${skillsHref}" class="nav-link">Skills</a></li>
            <li><a href="${projectsHref}" class="nav-link">Projects</a></li>
            <li><a href="${learningHref}" class="nav-link">Learning</a></li>
            <li><a href="${contactHref}" class="nav-link">Contact</a></li>
          </ul>

          <div class="nav-actions">
            <button
              class="theme-toggle"
              id="theme-toggle"
              aria-label="Toggle dark and light mode"
              title="Switch theme (follows system preference)"
            >
              <svg
                class="sun-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <svg
                class="moon-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </button>
            <button class="mobile-toggle" id="mobile-toggle" aria-label="Toggle menu">
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </nav>
    `;
  }

  const mount = document.getElementById("site-navbar");
  if (!mount) return;

  const context = mount.getAttribute("data-nav-context") || detectContext();
  mount.innerHTML = buildNavbar(context);
})();
