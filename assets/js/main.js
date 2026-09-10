/**
 * Main JavaScript - Core Functionality
 * Handles navigation, smooth scrolling, and UI interactions
 */

(function () {
  "use strict";

  // ==================== Mobile Menu Toggle ====================
  const mobileToggle = document.getElementById("mobile-toggle");
  const navLinks = document.getElementById("nav-links");

  function closeMobileMenu() {
    if (mobileToggle) mobileToggle.classList.remove("active");
    if (navLinks) navLinks.classList.remove("active");
  }

  function toggleMobileMenu() {
    if (!mobileToggle || !navLinks) return;
    const isOpen = navLinks.classList.toggle("active");
    mobileToggle.classList.toggle("active", isOpen);
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

    // Safety net: a very fast scroll (or flick gesture) can skip the frame
    // where an element crosses the intersection threshold. Nothing should
    // stay permanently invisible, so force-reveal anything left behind.
    setTimeout(() => {
      revealElements.forEach((el) => el.classList.add("in-view"));
      observer.disconnect();
    }, 2500);
  }

  // Run after DOMContentLoaded so content injected by other scripts
  // (e.g. the project list) is present before elements are observed.
  document.addEventListener("DOMContentLoaded", initScrollReveal);

  // ==================== Active Navigation Link ====================
  function setActiveNavLink() {
    const sections = document.querySelectorAll("header[id], section[id]");
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

    let current = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      if (window.pageYOffset >= sectionTop - 120) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("active");
      }
    });
  }

  // ==================== Performance: Debounce Function ====================
  function debounce(func, wait = 20, immediate = true) {
    let timeout;
    return function () {
      const context = this,
        args = arguments;
      const later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  const debouncedActiveLink = debounce(setActiveNavLink);

  window.addEventListener("scroll", debouncedActiveLink, { passive: true });
  setActiveNavLink();

  // ==================== Image Fallback Handler ====================
  const profileImage = document.querySelector(".hero-image-placeholder img");

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
        font-family: var(--font-mono);
        font-size: 2rem;
        font-weight: 700;
        color: var(--color-accent);
        letter-spacing: 0.04em;
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
  const backToTopBtn = document.getElementById("back-to-top");

  if (backToTopBtn) {
    function toggleBackToTop() {
      if (window.pageYOffset > 400) {
        backToTopBtn.classList.add("visible");
      } else {
        backToTopBtn.classList.remove("visible");
      }
    }

    window.addEventListener("scroll", debounce(toggleBackToTop, 100), {
      passive: true,
    });

    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }
})();
