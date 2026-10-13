/**
 * Main JavaScript - Core Functionality
 * Handles navigation, smooth scrolling, and UI interactions
 */

(function () {
  "use strict";

  // ==================== Mobile Menu Toggle ====================
  const mobileToggle = document.getElementById("mobile-toggle");
  const navLinks = document.getElementById("nav-links");

  function setMenuOpen(isOpen) {
    if (!mobileToggle || !navLinks) return;
    navLinks.classList.toggle("active", isOpen);
    mobileToggle.classList.toggle("active", isOpen);
    // The markup carries aria-expanded, so it has to track the real state
    // rather than sit at "false" while the menu is open.
    mobileToggle.setAttribute("aria-expanded", String(isOpen));
  }

  function closeMobileMenu() {
    setMenuOpen(false);
  }

  function toggleMobileMenu() {
    if (!mobileToggle || !navLinks) return;
    setMenuOpen(!navLinks.classList.contains("active"));
  }

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener("click", toggleMobileMenu);

    const navItems = navLinks.querySelectorAll("a");
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        closeMobileMenu();
      });
    });

    document.addEventListener("click", (e) => {
      if (!mobileToggle.contains(e.target) && !navLinks.contains(e.target)) {
        closeMobileMenu();
      }
    });
  }

  // Mark document as JS-enabled so CSS can safely apply scroll-reveal states.
  document.documentElement.classList.add("js-ready");

  // ==================== Scroll Reveal ====================
  // ==================== Heading entrances ====================
  // When a heading is revealed, a glowing scan line sweeps across it and the
  // text appears behind it, as if the packet were being read; its eyebrow
  // decodes out of random characters (the same effect as the name in the
  // hero). The text is only wrapped in one span, never changed.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const GLYPHS = "01<>/#%&*+=ABCDEFxyz";

  function wrapScan(heading) {
    if (heading.dataset.scan) return;
    heading.dataset.scan = "1";
    const span = document.createElement("span");
    span.className = "hscan";
    while (heading.firstChild) span.appendChild(heading.firstChild);
    heading.appendChild(span);
    heading.classList.add("has-scan");
  }

  // The scan line travels the width of the text, which is only known once
  // the fonts are in.
  function measureScan(heading) {
    const span = heading.querySelector(".hscan");
    if (span) heading.style.setProperty("--scan-w", span.offsetWidth + "px");
  }

  function decodeEyebrow(el) {
    const text = el.textContent;
    const total = text.replace(/\s/g, "").length;
    if (!total) return;
    el.setAttribute("aria-label", text.trim());
    const start = performance.now();
    const duration = 520;
    (function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      let index = 0;
      let out = "";
      for (const ch of text) {
        if (/\s/.test(ch)) {
          out += ch;
          continue;
        }
        index++;
        out += p >= index / total ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(tick);
      else {
        el.textContent = text;
        el.removeAttribute("aria-label");
      }
    })(start);
  }

  const SCAN = ".section-heading.reveal h2, .project-section.reveal > h2, .page-title.reveal h1";

  function prepareHeadings() {
    if (reducedMotion) return;
    document.querySelectorAll(SCAN).forEach(wrapScan);
  }

  function show(el) {
    if (el.classList.contains("in-view")) return;
    if (!reducedMotion) el.querySelectorAll(".has-scan").forEach(measureScan);
    el.classList.add("in-view");
    if (reducedMotion) return;
    const eyebrow = el.matches(".section-heading") && el.querySelector(".eyebrow");
    if (eyebrow) decodeEyebrow(eyebrow);
  }

  function initScrollReveal() {
    prepareHeadings();
    document.querySelectorAll(".reveal-group").forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        child.classList.add("reveal");
        child.style.setProperty("--reveal-index", index);
      });
    });

    const revealElements = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window) || revealElements.length === 0) {
      revealElements.forEach(show);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            show(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );

    revealElements.forEach((el) => observer.observe(el));

    // Safety net: a very fast scroll (or a jump to an anchor) can carry an
    // element past the viewport between two observer callbacks. Anything the
    // reader has already scrolled to or past is revealed on the next frame,
    // so nothing stays invisible, while content further down still gets its
    // entrance when it arrives.
    let pending = Array.from(revealElements);
    let queued = false;
    function catchUp() {
      queued = false;
      const limit = window.innerHeight;
      pending = pending.filter((el) => {
        if (el.classList.contains("in-view")) return false;
        if (el.getBoundingClientRect().top < limit) {
          show(el);
          observer.unobserve(el);
          return false;
        }
        return true;
      });
      if (!pending.length) window.removeEventListener("scroll", onScrollCatchUp);
    }
    function onScrollCatchUp() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(catchUp);
    }
    window.addEventListener("scroll", onScrollCatchUp, { passive: true });
    window.addEventListener("load", onScrollCatchUp);
  }

  // Run after DOMContentLoaded so content injected by other scripts
  // (e.g. the project list) is present before elements are observed.
  document.addEventListener("DOMContentLoaded", initScrollReveal);

  // ==================== Layout helper ====================
  // On the home page the sections are sticky (story.js stacks them), and the
  // offsetTop of a stuck element reports where it is stuck, not where it sits
  // in the flow. This gives the flow position either way, for the nav, the
  // route and the stacking to share.
  function naturalTop(el) {
    const parent = el.parentElement;
    if (parent && getComputedStyle(el).position === "sticky") {
      let top = parent.getBoundingClientRect().top + window.scrollY;
      for (let n = parent.firstElementChild; n && n !== el; n = n.nextElementSibling) {
        top += n.offsetHeight;
      }
      return top;
    }
    return el.getBoundingClientRect().top + window.scrollY;
  }

  window.siteLayout = { top: naturalTop };

  // ==================== Active Navigation Link ====================
  // Section positions are measured when the layout changes, not on every
  // scroll frame (naturalTop reads computed style).
  const navSections = Array.from(document.querySelectorAll("header[id], section[id]"));
  let navTops = [];
  function measureNav() {
    navTops = navSections.map((s) => naturalTop(s));
  }
  window.addEventListener("load", measureNav);
  window.addEventListener("resize", measureNav, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(measureNav).observe(document.body);

  function setActiveNavLink() {
    const sections = navSections;
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');
    if (navTops.length !== sections.length) measureNav();

    let current = "";

    sections.forEach((section, i) => {
      const sectionTop = navTops[i];
      if (window.pageYOffset + window.innerHeight * 0.4 >= sectionTop) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      const isCurrent = link.getAttribute("href") === `#${current}`;
      link.classList.toggle("active", isCurrent);
      // On the home page every nav link points at this same page, so
      // aria-current marks the section in view rather than sitting on "Home".
      if (isCurrent) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  }

  // ==================== Scroll Handling ====================
  const backToTopBtn = document.getElementById("back-to-top");

  function toggleBackToTop() {
    if (!backToTopBtn) return;
    backToTopBtn.classList.toggle("visible", window.pageYOffset > 400);
  }

  // Throttle on animation frames rather than debouncing: the callback reads
  // the scroll position when it runs, so the final position after a fast
  // scroll is always reflected.
  let scrollTicking = false;

  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      setActiveNavLink();
      toggleBackToTop();
      scrollTicking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  setActiveNavLink();
  toggleBackToTop();

  // ==================== Image Fallback Handler ====================
  const profileImage = document.querySelector(".about-photo img");

  if (profileImage) {
    profileImage.addEventListener("error", function () {
      const fallback = document.createElement("div");
      fallback.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-surface-2);
        font-family: var(--font-display);
        font-size: 2rem;
        font-weight: 600;
        color: var(--color-text-subtle);
      `;
      fallback.textContent = "RY";
      fallback.setAttribute(
        "aria-label",
        "Ryan Yarali - Profile Photo Placeholder",
      );

      this.parentElement.replaceChild(fallback, this);
    });
  }

  // ==================== Back to Top Button ====================
  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }
})();
