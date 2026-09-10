/**
 * Projects Data and Rendering
 * Manages the editorial project list shown on the home page and projects page.
 */

(function () {
  "use strict";

  // ==================== Projects Data ====================
  const projectsData = {
    taskmate: {
      id: "taskmate",
      title: "TaskMate",
      tagline:
        "A mobile-friendly task manager built so students stop losing deadlines across five different apps.",
      outcome:
        "Shipped end-to-end with Firebase auth and Firestore, then tested by a 9-person class team against real course workloads.",
      tech: ["HTML5", "CSS3", "JavaScript", "Firebase"],
      image: "assets/TaskMate6.png",
      featured: true,
      url: "projects/taskmate.html",
    },
    portfolio: {
      id: "portfolio",
      title: "This Portfolio",
      tagline:
        "A framework-free personal site with its own CSS design system, light and dark themes, and a small amount of scroll behaviour.",
      outcome:
        "Built from a blank stylesheet — design tokens, theming, and layout written by hand rather than pulled from a template.",
      tech: ["HTML5", "CSS3", "Vanilla JavaScript"],
      image: "assets/ryan-port01.png",
      featured: true,
      url: "projects/portfolio.html",
    },
  };

  // ==================== Render Project Row ====================
  function renderProjectRow(project, index) {
    const num = String(index + 1).padStart(2, "0");

    return `
      <article class="project-row">
        <a class="project-row-media" href="${project.url}" aria-label="Open ${project.title} case study">
          <img src="${project.image}" alt="${project.title} interface screenshot" loading="lazy" />
        </a>
        <div class="project-row-body">
          <span class="project-row-index">${num}</span>
          <h3 class="project-row-title"><a href="${project.url}">${project.title}</a></h3>
          <p class="project-row-tagline">${project.tagline}</p>
          ${project.outcome ? `<p class="project-row-outcome">${project.outcome}</p>` : ""}
          <div class="project-row-tech">
            ${project.tech.map((t) => `<span class="tech-tag">${t}</span>`).join("")}
          </div>
          <a href="${project.url}" class="project-row-cta">
            View case study
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      </article>
    `;
  }

  // ==================== Render Projects List ====================
  window.renderProjectsGrid = function (containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { featured = false, limit = null } = options;

    let projects = Object.values(projectsData);

    if (featured) {
      projects = projects.filter((p) => p.featured);
    }

    if (limit) {
      projects = projects.slice(0, limit);
    }

    if (projects.length === 0) {
      container.innerHTML =
        '<p class="text-center">No projects available yet.</p>';
      return;
    }

    const rows = projects
      .map((project, index) => renderProjectRow(project, index))
      .join("");

    container.innerHTML = `<div class="project-rows reveal-group">${rows}</div>`;
  };

  window.projectsData = projectsData;

  document.addEventListener("DOMContentLoaded", function () {
    const projectsGrid = document.getElementById("projects-grid");
    if (projectsGrid) {
      window.renderProjectsGrid("projects-grid");
    }

    const featuredProjectsContainer =
      document.getElementById("featured-projects");
    if (featuredProjectsContainer) {
      window.renderProjectsGrid("featured-projects", { featured: true });
    }
  });
})();
