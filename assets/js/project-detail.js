/**
 * Project Detail Page
 * Dynamically loads project case studies based on URL parameter
 */

(function () {
  "use strict";

  // Project data
  const projects = {
    portfolio: {
      title: "Personal Portfolio Website",
      tagline:
        "A fully responsive portfolio showcasing web development fundamentals",
      tech: ["HTML5", "CSS3", "Vanilla JavaScript", "Responsive Design"],
      github: "https://github.com/RyanYarali/portfolio",
      demo: "/",
      problem: `
                <p>As a Computer Science student seeking internship opportunities, I needed a professional online presence that could: </p>
                <ul>
                    <li>Showcase my projects and technical skills effectively</li>
                    <li>Demonstrate strong web development fundamentals without relying on frameworks</li>
                    <li>Provide detailed case studies that show my engineering thought process</li>
                    <li>Be fast, accessible, and work flawlessly across all devices</li>
                </ul>
            `,
      requirements: `
                <ul>
                    <li>No frameworks or heavy libraries - vanilla HTML, CSS, and JavaScript only</li>
                    <li>Fully responsive design (mobile-first approach)</li>
                    <li>Dark/light theme with user preference persistence</li>
                    <li>SEO-optimized and accessibility-compliant</li>
                    <li>Fast load times and minimal JavaScript execution</li>
                    <li>Easy to deploy and maintain</li>
                </ul>
            `,
      approach: `
                <h3>Architecture & Organization</h3>
                <p>I structured the project using a modular approach: </p>
                <ul>
                    <li><strong>CSS Variables: </strong> Created a design system with custom properties for colors, spacing, typography, and transitions</li>
                    <li><strong>Separation of Concerns:</strong> Split CSS into variables, reset, typography, components, and page-specific styles</li>
                    <li><strong>JavaScript Modules:</strong> Separated functionality into theme management, form handling, and core interactions</li>
                </ul>
                
                <h3>Design System</h3>
                <p>Built a consistent design language using an 8px spacing system, semantic color tokens, and a modular scale for typography.  This ensures visual consistency and makes future updates straightforward.</p>
                
                <h3>Performance Strategy</h3>
                <ul>
                    <li>No build process required - runs directly in the browser</li>
                    <li>CSS-based animations using transforms and opacity for GPU acceleration</li>
                    <li>Debounced scroll events to minimize reflows</li>
                    <li>Intersection Observer API for lazy animations</li>
                    <li>System font stack to eliminate web font overhead</li>
                </ul>
            `,
      challenges: `
                <h3>1. Theme Switching Without Flash</h3>
                <p><strong>Challenge:</strong> Preventing a flash of unstyled content when loading the page with a saved dark mode preference. </p>
                <p><strong>Solution:</strong> Initialized theme in a separate script that runs immediately, reading from localStorage before the page renders.  Applied the theme to <code>: root</code> using data attributes.</p>
                
                <h3>2. Smooth Scroll with Fixed Navigation</h3>
                <p><strong>Challenge:</strong> CSS <code>scroll-behavior:  smooth</code> doesn't account for fixed header offset.</p>
                <p><strong>Solution:</strong> Implemented custom smooth scroll with easing function that calculates the navbar height offset, providing a polished user experience.</p>
                
                <h3>3. Mobile Menu Accessibility</h3>
                <p><strong>Challenge:</strong> Creating a mobile navigation that works with keyboard navigation and screen readers.</p>
                <p><strong>Solution:</strong> Added proper ARIA labels, ensured focus management, and implemented click-outside detection to close the menu.</p>
            `,
      learned: `
                <ul>
                    <li><strong>Design Systems:</strong> The value of establishing design tokens early - it made styling consistent and updates trivial</li>
                    <li><strong>Progressive Enhancement:</strong> Building core functionality first, then adding JavaScript enhancements</li>
                    <li><strong>CSS Architecture:</strong> How to organize CSS for maintainability without preprocessors or CSS-in-JS</li>
                    <li><strong>Performance Budgets:</strong> Understanding the performance impact of different animation and event handling approaches</li>
                    <li><strong>Accessibility Basics:</strong> Semantic HTML, proper heading hierarchy, and ARIA attributes make a significant difference</li>
                </ul>
            `,
      improvements: `
                <ul>
                    <li>Add a blog section with markdown-powered articles</li>
                    <li>Implement a service worker for offline functionality</li>
                    <li>Add micro-interactions and more sophisticated animations</li>
                    <li>Create a headless CMS integration for easier content updates</li>
                    <li>Eventually rebuild with React to showcase framework knowledge while maintaining the same design</li>
                </ul>
            `,
    },

    "task-manager": {
      title: "Task Management App",
      tagline: "Dynamic task manager with local storage persistence",
      tech: [
        "JavaScript ES6+",
        "LocalStorage API",
        "CSS Grid",
        "State Management",
      ],
      github: "https://github.com/RyanYarali/task-manager",
      problem: `
                <p>Built a task management application to practice CRUD operations, state management, and data persistence without a backend.</p>
            `,
      requirements: `
                <ul>
                    <li>Create, read, update, and delete tasks</li>
                    <li>Filter tasks by status (all, active, completed)</li>
                    <li>Persist data using localStorage</li>
                    <li>Clean, intuitive user interface</li>
                </ul>
            `,
      approach: `
                <p>Implemented a simple state management pattern using JavaScript classes.  Created a <code>TaskManager</code> class to handle all business logic, separating concerns between data manipulation and UI rendering.</p>
                <p>Used localStorage for persistence with JSON serialization, implementing a simple sync mechanism to ensure data consistency. </p>
            `,
      challenges: `
                <h3>State Synchronization</h3>
                <p>Ensuring the UI stayed in sync with the data model required careful event handling and a clear update flow.  Implemented a pub-sub pattern to notify UI components of state changes.</p>
            `,
      learned: `
                <ul>
                    <li>Object-oriented JavaScript patterns</li>
                    <li>Working with browser storage APIs</li>
                    <li>Basic state management concepts</li>
                    <li>Event delegation for dynamic content</li>
                </ul>
            `,
      improvements: `
                <ul>
                    <li>Add drag-and-drop functionality for task reordering</li>
                    <li>Implement categories and tags</li>
                    <li>Add due dates and reminders</li>
                    <li>Export tasks to CSV or JSON</li>
                </ul>
            `,
    },

    "weather-app": {
      title: "Weather Dashboard",
      tagline: "Real-time weather data using asynchronous JavaScript",
      tech: [
        "JavaScript",
        "Fetch API",
        "Async/Await",
        "REST API",
        "Geolocation",
      ],
      github: "https://github.com/RyanYarali/weather-dashboard",
      problem: `
                <p>Created a weather application to practice working with external APIs, handling asynchronous operations, and managing loading/error states.</p>
            `,
      requirements: `
                <ul>
                    <li>Fetch weather data from a public API</li>
                    <li>Display current weather and forecast</li>
                    <li>Handle geolocation and manual search</li>
                    <li>Proper error handling and loading states</li>
                </ul>
            `,
      approach: `
                <p>Used the OpenWeatherMap API with async/await for cleaner asynchronous code. Implemented error boundaries and loading spinners to improve user experience during API calls.</p>
                <p>Utilized the Geolocation API to automatically detect user location, with fallback to manual search. </p>
            `,
      challenges: `
                <h3>API Rate Limiting</h3>
                <p>Implemented request debouncing to prevent excessive API calls during search input, reducing costs and improving performance.</p>
            `,
      learned: `
                <ul>
                    <li>Working with RESTful APIs</li>
                    <li>Promises and async/await patterns</li>
                    <li>Error handling in asynchronous code</li>
                    <li>Browser Geolocation API</li>
                </ul>
            `,
      improvements: `
                <ul>
                    <li>Add hourly forecast visualization</li>
                    <li>Implement weather alerts and notifications</li>
                    <li>Add favorite locations feature</li>
                    <li>Create weather-based background themes</li>
                </ul>
            `,
    },
  };

  // Get project ID from URL parameter
  function getProjectId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("project");
  }

  // Render project detail
  function renderProject(projectId) {
    const project = projects[projectId];
    const container = document.getElementById("project-detail-content");

    if (!project || !container) {
      container.innerHTML = `
                <section class="section">
                    <div class="container">
                        <div style="text-align: center; padding: var(--spacing-4xl) 0;">
                            <h1>Project Not Found</h1>
                            <p style="margin:  var(--spacing-lg) 0;">The project you're looking for doesn't exist.</p>
                            <a href="projects. html" class="btn btn-primary">View All Projects</a>
                        </div>
                    </div>
                </section>
            `;
      return;
    }

    // Update page title
    document.title = `${project.title} | Ryan Yarali`;

    // Render content
    container.innerHTML = `
            <div class="project-header">
                <div class="container">
                    <a href="projects.html" class="back-link">← Back to Projects</a>
                    <h1>${project.title}</h1>
                    <p>${project.tagline}</p>
                    <div class="project-meta">
                        ${project.tech
                          .map((tech) => `<span class="tag">${tech}</span>`)
                          .join("")}
                    </div>
                    <div class="project-meta">
                        ${
                          project.github
                            ? `<a href="${project.github}" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">View on GitHub</a>`
                            : ""
                        }
                        ${
                          project.demo
                            ? `<a href="${project.demo}" class="btn btn-primary">Live Demo</a>`
                            : ""
                        }
                    </div>
                </div>
            </div>

            <section class="section project-detail">
                <div class="container case-study">
                    ${
                      project.problem
                        ? `
                        <div class="case-study-section">
                            <h2>🎯 Problem Statement</h2>
                            ${project.problem}
                        </div>
                    `
                        : ""
                    }

                    ${
                      project.requirements
                        ? `
                        <div class="case-study-section">
                            <h2>📋 Requirements & Constraints</h2>
                            ${project.requirements}
                        </div>
                    `
                        : ""
                    }

                    ${
                      project.approach
                        ? `
                        <div class="case-study-section">
                            <h2>💡 Approach & Technical Decisions</h2>
                            ${project.approach}
                        </div>
                    `
                        : ""
                    }

                    ${
                      project.challenges
                        ? `
                        <div class="case-study-section">
                            <h2>🚧 Challenges & Solutions</h2>
                            ${project.challenges}
                        </div>
                    `
                        : ""
                    }

                    ${
                      project.learned
                        ? `
                        <div class="case-study-section">
                            <h2>📚 What I Learned</h2>
                            ${project.learned}
                        </div>
                    `
                        : ""
                    }

                    ${
                      project.improvements
                        ? `
                        <div class="case-study-section">
                            <h2>🚀 Future Improvements</h2>
                            ${project.improvements}
                        </div>
                    `
                        : ""
                    }

                    <div style="text-align: center; margin-top: var(--spacing-3xl); padding-top: var(--spacing-3xl); border-top: 1px solid var(--color-border);">
                        <a href="projects.html" class="btn btn-secondary">View All Projects</a>
                        <a href="index.html#contact" class="btn btn-primary">Get In Touch</a>
                    </div>
                </div>
            </section>
        `;
  }

  // Initialize
  const projectId = getProjectId();
  renderProject(projectId);

  console.log(`📁 Project detail loaded:  ${projectId}`);
})();
