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

  // ==================== Render Projects Grid ====================
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
      });
    }
  });
})();
