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
  function initScrollReveal() {
    document.querySelectorAll(".reveal-group").forEach((group) => {
      Array.from(group.children).forEach((child, index) => {
        child.classList.add("reveal");
        child.style.setProperty("--reveal-index", index);
      });
    });

    const revealElements = document.querySelectorAll(".reveal");

    if (!("IntersectionObserver" in window) || revealElements.length === 0) {
      revealElements.forEach((el) => el.classList.add("in-view"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
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
          el.classList.add("in-view");
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
  // spine and the stacking to share.
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
  function setActiveNavLink() {
    const sections = document.querySelectorAll("header[id], section[id]");
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

    let current = "";

    sections.forEach((section) => {
      const sectionTop = naturalTop(section);
      // The same line the route spine uses, so the two always agree.
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
