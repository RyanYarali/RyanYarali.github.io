/**
 * Main JavaScript - Core Functionality
 * Handles navigation, smooth scrolling, and UI interactions
 */

(function () {
  "use strict";

  // ==================== Mobile Menu Toggle ====================
  const mobileToggle = document.getElementById("mobile-toggle");
  const navLinks = document.getElementById("nav-links");

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener("click", function () {
      this.classList.toggle("active");
      navLinks.classList.toggle("active");
    });

    // Close mobile menu when clicking on a link
    const navItems = navLinks.querySelectorAll("a");
    navItems.forEach((item) => {
      item.addEventListener("click", () => {
        mobileToggle.classList.remove("active");
        navLinks.classList.remove("active");
      });
    });

    // Close mobile menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!mobileToggle.contains(e.target) && !navLinks.contains(e.target)) {
        mobileToggle.classList.remove("active");
        navLinks.classList.remove("active");
      }
    });
  }

  // Mark document as JS-enabled so CSS can safely apply scroll-reveal states.
  document.documentElement.classList.add("js-ready");

  // ==================== Intersection Observer for Animations ====================
  const animateElements = document.querySelectorAll(".skill-category");

  if ("IntersectionObserver" in window) {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver(function (entries) {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("fade-in");
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    animateElements.forEach((el) => {
      observer.observe(el);
    });
  } else {
    animateElements.forEach((el) => {
      el.classList.add("fade-in");
    });
  }

  // ==================== Active Navigation Link ====================
  function setActiveNavLink() {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

    let current = "";

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.pageYOffset >= sectionTop - 100) {
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

  // ==================== Performance:  Debounce Function ====================
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

  // Apply debounce to scroll events
  const debouncedActiveLink = debounce(setActiveNavLink);

  window.addEventListener("scroll", debouncedActiveLink, { passive: true });

  // ==================== Image Fallback Handler ====================
  const profileImage = document.querySelector(".hero-image-placeholder img");

  if (profileImage) {
    profileImage.addEventListener("error", function () {
      // Create fallback placeholder
      const fallback = document.createElement("div");
      fallback.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, rgba(129, 140, 248, 0.2), rgba(244, 114, 182, 0.2));
        border-radius: 50%;
        font-size: 6rem;
      `;
      fallback.textContent = "👨‍💻";
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
    // Show/hide button on scroll
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

    // Scroll to top when clicked
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  // ==================== Typing Animation ====================
  function typeWriter(element, text, speed = 100) {
    let i = 0;
    element.textContent = "";

    function type() {
      if (i < text.length) {
        element.textContent += text.charAt(i);
        i++;
        setTimeout(type, speed);
      }
    }

    type();
  }

  // Delay typing animations to let site load first
  setTimeout(() => {
    // Hero title typing
    const typingName = document.getElementById("typing-name");
    if (typingName) {
      typeWriter(typingName, "Ryan Yarali", 150);
    }

    // Logo typing
    const logoTyping = document.querySelector(".logo-typing");
    if (logoTyping) {
      typeWriter(logoTyping, "Ryan Yarali", 150);
    }
  }, 500);
})();
