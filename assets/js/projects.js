/**
 * Projects data and rendering
 * ---------------------------
 * Renders the work section as an accordion: one line per project, opened by a
 * tap. A tap is the entire interaction, so touch and mouse get the same thing,
 * and four projects fit in the height a single old-style card used to take.
 */

(function () {
  "use strict";

  // ==================== Projects data ====================

  var projectsData = {
    nooklook: {
      id: "nooklook",
      title: "Nook Look",
      kind: "Client",
      year: "2026",
      status: "Live",
      tagline:
        "The full web presence for a Coquitlam portrait studio: four priced service lines, a booking pipeline, a filterable gallery, and local SEO. Built and launched solo.",
      outcome:
        "The client asked for WordPress, then asked for things WordPress does not do. Custom content types, hand-written structured data, and managed code snippets closed the gap with no recurring plugin cost.",
      tech: ["WordPress", "Pods", "PHP", "Custom CSS/JS", "Local SEO"],
      image: "assets/nl-hero.jpg",
      featured: true,
      url: "projects/nooklook.html",
      linkLabel: "Read the case study",
      live: "https://nooklook.ca",
    },

    vancobab: {
      id: "vancobab",
      title: "Vanco Bab",
      kind: "Client",
      year: "2026",
      status: "Live",
      tagline:
        "A five-page site for a Persian kebab food truck in Vancouver: the truck menu, catering packages, and an order builder customers use before they reach the window.",
      outcome:
        "The order builder is plain JavaScript with no backend and no payment step. It totals a customer's picks and hands them a summary to read at the counter, which is what a food truck actually needs. Catering pages re-point the brand accent from red to gold through a single data attribute, so one stylesheet carries two moods.",
      tech: ["HTML5", "CSS3", "Vanilla JavaScript", "SEO"],
      featured: true,
      external: "https://vancobab.ca",
      linkLabel: "Visit the site",
    },

    termeh: {
      id: "termeh",
      title: "Termeh Cafe & Restaurant",
      kind: "Client",
      year: "2026",
      status: "Coming soon",
      tagline:
        "A bilingual restaurant site in English and Farsi, with a password-protected admin panel so the owner changes the menu, prices, hours, and reservations without touching code.",
      outcome:
        "React 19 on the front, Node, Express, and SQLite on the back. Role-based admin accounts, a reservation pipeline with email confirmations, photo uploads, and per-page SEO metadata. Launching once the domain is live.",
      tech: ["React 19", "Vite", "Node.js", "Express", "SQLite", "i18n"],
      featured: true,
      note: "Launching soon",
    },

    taskmate: {
      id: "taskmate",
      title: "TaskMate",
      kind: "Coursework",
      year: "2025",
      status: "Shipped",
      tagline:
        "A mobile-friendly task manager built so students stop losing deadlines across five different apps.",
      outcome:
        "Shipped end-to-end with Firebase auth and Firestore, then tested by a 9-person class team against real course workloads.",
      tech: ["HTML5", "CSS3", "JavaScript", "Firebase"],
      image: "assets/TaskMate6.jpg",
      featured: true,
      url: "projects/taskmate.html",
      linkLabel: "Read the case study",
    },
  };

  // ==================== Markup ====================

  var ARROW =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[ch];
    });
  }

  function media(project) {
    if (project.image) {
      return (
        '<img src="' +
        project.image +
        '" alt="' +
        escapeHtml(project.title) +
        ' interface screenshot" loading="lazy" decoding="async" />'
      );
    }
    // No screenshot yet: a deterministic drawing seeded by the project key,
    // coloured from the live palette.
    return '<canvas data-art="' + project.id + '" aria-hidden="true"></canvas>';
  }

  function links(project) {
    var out = [];

    if (project.url) {
      out.push(
        '<a class="project-accordion-link" href="' +
          project.url +
          '">' +
          escapeHtml(project.linkLabel || "Read more") +
          ARROW +
          "</a>",
      );
    }

    var external = project.external || project.live;
    if (external) {
      out.push(
        '<a class="project-accordion-link" href="' +
          external +
          '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(project.url ? "Visit the site" : project.linkLabel || "Visit the site") +
          ARROW +
          "</a>",
      );
    }

    if (project.note) {
      out.push(
        '<span class="project-accordion-note">' +
          escapeHtml(project.note) +
          "</span>",
      );
    }

    return out.join("");
  }

  function renderItem(project, index) {
    var num = String(index + 1).padStart(2, "0");
    var panelId = "project-panel-" + project.id;
    var statusKey = project.status === "Live" ? "live" : "other";
    var mediaTag = project.url || project.external || project.live;
    var mediaHref = project.url || project.external || project.live;

    var mediaBlock = mediaTag
      ? '<a class="project-accordion-media" href="' +
        mediaHref +
        '"' +
        (project.url ? "" : ' target="_blank" rel="noopener noreferrer"') +
        ' aria-label="Open ' +
        escapeHtml(project.title) +
        '">' +
        media(project) +
        "</a>"
      : '<div class="project-accordion-media">' + media(project) + "</div>";

    return (
      '<div class="project-accordion-item">' +
      '<button class="project-accordion-head" type="button" aria-expanded="false" aria-controls="' +
      panelId +
      '">' +
      '<span class="project-accordion-num">' +
      num +
      "</span>" +
      '<span class="project-accordion-name">' +
      '<span class="project-accordion-title">' +
      escapeHtml(project.title) +
      "</span>" +
      '<span class="project-accordion-kind">' +
      escapeHtml(project.kind) +
      " &middot; " +
      escapeHtml(project.year) +
      "</span>" +
      "</span>" +
      '<span class="project-accordion-right">' +
      '<span class="project-status" data-status="' +
      statusKey +
      '">' +
      escapeHtml(project.status) +
      "</span>" +
      '<span class="project-accordion-sign" aria-hidden="true"></span>' +
      "</span>" +
      "</button>" +
      '<div class="project-accordion-panel" id="' +
      panelId +
      '">' +
      '<div class="project-accordion-panel-inner">' +
      mediaBlock +
      '<div class="project-accordion-copy">' +
      "<p>" +
      escapeHtml(project.tagline) +
      "</p>" +
      (project.outcome ? "<p>" + escapeHtml(project.outcome) + "</p>" : "") +
      '<div class="project-accordion-tech">' +
      project.tech
        .map(function (t) {
          return "<span>" + escapeHtml(t) + "</span>";
        })
        .join("") +
      "</div>" +
      '<div class="project-accordion-links">' +
      links(project) +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  // ==================== Render ====================

  window.renderProjectsGrid = function (containerId, options) {
    options = options || {};

    var container = document.getElementById(containerId);
    if (!container) return;

    var projects = Object.keys(projectsData).map(function (key) {
      return projectsData[key];
    });

    if (options.featured) {
      projects = projects.filter(function (p) {
        return p.featured;
      });
    }

    if (options.limit) {
      projects = projects.slice(0, options.limit);
    }

    if (!projects.length) {
      container.innerHTML = '<p class="text-center">No projects available yet.</p>';
      return;
    }

    container.innerHTML =
      '<div class="project-accordion reveal">' +
      projects.map(renderItem).join("") +
      "</div>";
  };

  window.projectsData = projectsData;

  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("projects-grid")) {
      window.renderProjectsGrid("projects-grid");
    }
    if (document.getElementById("featured-projects")) {
      window.renderProjectsGrid("featured-projects", { featured: true });
    }
  });
})();
