/**
 * Projects Data and Rendering
 * Manages project cards and grid display for both projects page and home page
 */

(function () {
  "use strict";

  // ==================== Projects Data ====================
  const projectsData = {
    portfolio: {
      id: "portfolio",
      title: "Personal Portfolio Website",
      tagline:
        "A fully responsive portfolio showcasing web development fundamentals",
      outcome:
        "Improved Lighthouse accessibility and SEO readiness across all pages",
      tech: ["HTML5", "CSS3", "Vanilla JavaScript", "Responsive Design"],
      image: "assets/ryan-port01.png",
      featured: true,
      url: "projects/portfolio.html",
    },
    taskmate: {
      id: "taskmate",
      title: "TaskMate: Academic Task Management",
      tagline:
        "Mobile-friendly web app for consolidating academic tasks with Firebase",
      outcome:
        "Built and tested by a 9-person team to support real student workflow scenarios",
      tech: ["HTML5", "CSS3", "JavaScript", "Firebase", "Mobile-First Design"],
      image: "assets/TaskMate6.png",
      featured: true,
      url: "projects/taskmate.html",
    },
  };

  // ==================== Render Project Card ====================
  function renderProjectCard(project) {
    return `
      <article class="project-card surface">
        <div class="project-card-header">
          ${
            project.image
              ? `<div class="project-card-image">
                 <img src="${project.image}" alt="${project.title}" loading="lazy" />
               </div>`
              : `<div class="project-card-image placeholder">
                 <div class="placeholder-icon">💻</div>
               </div>`
          }
        </div>
        <div class="project-card-content">
          <h3 class="project-card-title">${project.title}</h3>
          <p class="project-card-tagline">${project.tagline}</p>
          ${project.outcome ? `<p class="project-card-outcome">${project.outcome}</p>` : ""}
          <div class="project-card-tech">
            ${project.tech.map((t) => `<span class="tech-tag">${t}</span>`).join("")}
          </div>
        </div>
        <div class="project-card-footer">
          <a
            href="${project.url}"
            class="btn btn-secondary"
          >
            View Project
          </a>
        </div>
      </article>
    `;
  }

  // ==================== Render Minimal Featured Item ====================
  function renderFeaturedProjectItem(project) {
    const compactTagline =
      project.tagline.length > 78
        ? `${project.tagline.slice(0, 75).trim()}...`
        : project.tagline;

    return `
      <article class="featured-project-item">
        <a class="featured-project-thumb" href="${project.url}" aria-label="Open ${project.title}">
          ${
            project.image
              ? `<img src="${project.image}" alt="${project.title}" loading="lazy" />`
              : `<span class="featured-project-fallback" aria-hidden="true">Project</span>`
          }
        </a>
        <div class="featured-project-body">
          <h3 class="featured-project-title">
            <a href="${project.url}">${project.title}</a>
          </h3>
          <p class="featured-project-tagline">${compactTagline}</p>
        </div>
        <a href="${project.url}" class="featured-project-cta">View</a>
      </article>
    `;
  }

  // ==================== Render Projects Grid ====================
  window.renderProjectsGrid = function (containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const { featured = false, limit = null, minimal = false } = options;

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

    if (minimal) {
      const list = projects
        .map((project) => renderFeaturedProjectItem(project))
        .join("");
      container.innerHTML = `<div class="featured-projects-list">${list}</div>`;
      return;
    }

    const grid = projects.map((project) => renderProjectCard(project)).join("");
    container.innerHTML = `<div class="projects-grid">${grid}</div>`;
  };

  // ==================== Export Projects Data ====================
  window.projectsData = projectsData;

  // ==================== Auto-render on DOM ready ====================
  document.addEventListener("DOMContentLoaded", function () {
    // Auto-render projects grid on projects.html
    const projectsGrid = document.getElementById("projects-grid");
    if (projectsGrid) {
      window.renderProjectsGrid("projects-grid");
    }

    // Auto-render featured projects on index.html
    const featuredProjectsContainer =
      document.getElementById("featured-projects");
    if (featuredProjectsContainer) {
      window.renderProjectsGrid("featured-projects", {
        featured: true,
        limit: 3,
        minimal: true,
      });
    }
  });
})();
