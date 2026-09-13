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

    return `
      <nav class="navbar">
        <div class="nav-container">
          <a href="${homeHref}" class="logo" aria-label="Go to home">
            <span class="logo-name">Ryan Yarali</span>
            <span class="logo-subtitle">Computer Systems Technology</span>
          </a>

          <ul class="nav-links" id="nav-links">
            <li><a href="${homeHref}" class="nav-link">Home</a></li>
            <li><a href="${aboutHref}" class="nav-link">About</a></li>
            <li><a href="${projectsHref}" class="nav-link">Projects</a></li>
            <li><a href="${skillsHref}" class="nav-link">Skills</a></li>
            <li><a href="${learningHref}" class="nav-link">Learning</a></li>
            <li><a href="${contactHref}" class="nav-link">Contact</a></li>
          </ul>

          <!-- The theme switch lives in the palette dock, next to the colours. -->
          <div class="nav-actions">
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
