/**
 * Contact Form Handler
 * What it's about (a job, one of the packages, or something else), add-ons
 * with a running estimate, client-side validation, and submission to the
 * site's own Worker (worker/index.js) behind Cloudflare Turnstile.
 */

(function () {
  "use strict";

  const form = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");

  if (!form) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const addonGroup = document.getElementById("addon-group");
  const message = document.getElementById("message");

  function topic() {
    const picked = form.querySelector('input[name="topic"]:checked');
    return picked ? picked.value : "";
  }

  // Form field validators
  const validators = {
    topic: () => (topic() ? null : "Pick what your message is about"),

    name: (value) => {
      if (!value.trim()) return "Name is required";
      if (value.trim().length < 2) return "Name must be at least 2 characters";
      return null;
    },

    email: (value) => {
      if (!value.trim()) return "Email is required";
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) return "Please enter a valid email address";
      return null;
    },

    message: (value) => {
      if (!value.trim()) return "Message is required";
      if (value.trim().length < 10)
        return "Message must be at least 10 characters";
      return null;
    },
  };

  // The element that carries aria-invalid: the input, or the topic fieldset.
  function fieldElement(fieldName) {
    return fieldName === "topic"
      ? document.getElementById("topic-group")
      : document.getElementById(fieldName);
  }

  // Display error message
  function showError(fieldName, message) {
    const errorElement = document.getElementById(`${fieldName}-error`);
    const inputElement = fieldElement(fieldName);

    if (errorElement) {
      errorElement.textContent = message;
    }

    if (inputElement) {
      inputElement.setAttribute("aria-invalid", "true");
    }
  }

  // Clear error message
  function clearError(fieldName) {
    const errorElement = document.getElementById(`${fieldName}-error`);
    const inputElement = fieldElement(fieldName);

    if (errorElement) {
      errorElement.textContent = "";
    }

    if (inputElement) {
      inputElement.removeAttribute("aria-invalid");
    }
  }

  // Validate single field
  function validateField(fieldName, value) {
    const validator = validators[fieldName];
    if (!validator) return true;

    const error = validator(value);

    if (error) {
      showError(fieldName, error);
      return false;
    } else {
      clearError(fieldName);
      return true;
    }
  }

  // Validate all fields; focus the first one that's wrong.
  function validateForm() {
    let firstBad = null;

    Object.keys(validators).forEach((fieldName) => {
      const field = document.getElementById(fieldName);
      const fieldValid = validateField(fieldName, field ? field.value : "");
      if (!fieldValid && !firstBad) firstBad = fieldName;
    });

    if (firstBad) {
      const el =
        firstBad === "topic" ? form.querySelector('input[name="topic"]') : document.getElementById(firstBad);
      if (el) el.focus();
    }
    return !firstBad;
  }

  // ==================== Packages and add-ons ====================
  // Picking a package shows the add-ons and the estimate under them. The
  // figures come from data attributes on the inputs, which match the prices
  // in the pricing section.

  const HINTS = {
    hiring: "The role, the team, and how to reach you...",
    portfolio: "Who it's for, links to your résumé or LinkedIn, and when you'd like it...",
    business: "Your business, the pages you need, and any sites you like...",
    custom: "What it should do, who uses it, and your timeline...",
    other: "Your message...",
  };

  const money = (n) => "$" + Math.round(n).toLocaleString("en-CA");
  const totalEl = document.getElementById("estimate-total");
  const monthlyEl = document.getElementById("estimate-monthly");
  let shown = 0;
  let tick = 0;

  function estimate() {
    const picked = form.querySelector('input[name="topic"]:checked');
    const base = picked && picked.dataset.from ? Number(picked.dataset.from) : 0;
    let extras = 0;
    let percent = 0;
    let monthly = 0;
    form.querySelectorAll('input[name="addons"]:checked').forEach((box) => {
      extras += Number(box.dataset.price || 0);
      percent += Number(box.dataset.percent || 0);
      monthly += Number(box.dataset.monthly || 0);
    });
    return { total: (base + extras) * (1 + percent / 100), monthly };
  }

  // The total counts up or down to its new value.
  function renderEstimate() {
    if (!totalEl) return;
    const next = estimate();
    if (monthlyEl) monthlyEl.textContent = next.monthly ? ` + ${money(next.monthly)}/mo` : "";
    cancelAnimationFrame(tick);
    if (reducedMotion || !shown) {
      shown = next.total;
      totalEl.textContent = money(shown);
      return;
    }
    const from = shown;
    const started = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - started) / 420);
      shown = from + (next.total - from) * (1 - Math.pow(1 - t, 3));
      totalEl.textContent = money(shown);
      if (t < 1) tick = requestAnimationFrame(step);
    };
    tick = requestAnimationFrame(step);
  }

  function onTopic() {
    const value = topic();
    const isPackage = ["portfolio", "business", "custom"].includes(value);
    if (addonGroup) {
      addonGroup.hidden = !isPackage;
      // Add-ons that only fit one package hide (and drop) for the others.
      addonGroup.querySelectorAll("[data-only]").forEach((chip) => {
        const fits = chip.dataset.only === value;
        chip.hidden = !fits;
        if (!fits) chip.querySelector("input").checked = false;
      });
    }
    if (message) message.placeholder = HINTS[value] || HINTS.other;
    renderEstimate();
  }

  form.querySelectorAll('input[name="topic"]').forEach((radio) => {
    radio.addEventListener("change", () => {
      clearError("topic");
      onTopic();
    });
  });
  form.querySelectorAll('input[name="addons"]').forEach((box) => {
    box.addEventListener("change", renderEstimate);
  });

  // "Start a portfolio" and the other package buttons pick that package on
  // the way down to the form.
  document.querySelectorAll("[data-pick]").forEach((link) => {
    link.addEventListener("click", () => {
      const radio = form.querySelector(`input[name="topic"][value="${link.dataset.pick}"]`);
      if (!radio) return;
      radio.checked = true;
      clearError("topic");
      onTopic();
    });
  });

  // A browser that restores the form on back/forward keeps the choices.
  onTopic();

  // ==================== Turnstile ====================
  // Cloudflare's bot check loads the first time the form comes near the
  // screen or takes focus, so it costs nothing on a visit that never gets
  // here. It renders invisibly unless Cloudflare decides it needs a click.

  const box = document.getElementById("turnstile");
  let widget = null;
  let loading = null;

  function loadTurnstile() {
    if (!box || loading) return loading;
    loading = new Promise((resolve, reject) => {
      window.onTurnstileLoad = () => {
        widget = window.turnstile.render(box, {
          sitekey: box.dataset.sitekey,
          appearance: "interaction-only",
          theme: document.documentElement.dataset.theme === "dark" ? "dark" : "light",
          action: "contact",
        });
        resolve();
      };
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=onTurnstileLoad";
      s.async = true;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return loading;
  }

  // The token, waiting up to 10 seconds for the check to finish.
  async function turnstileToken() {
    if (!box) return "";
    await loadTurnstile();
    for (let i = 0; i < 40; i++) {
      const token = window.turnstile.getResponse(widget);
      if (token) return token;
      await new Promise((r) => setTimeout(r, 250));
    }
    return "";
  }

  if (box) {
    form.addEventListener("focusin", loadTurnstile, { once: true });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            loadTurnstile();
          }
        },
        { rootMargin: "600px 0px" },
      );
      io.observe(form);
    }
  }

  // ==================== Send trace ====================
  // The request drawn as a packet travelling from the sender to the inbox:
  // it loops while the request is in flight, lands when it succeeds, and
  // drops when it fails. The log line underneath shows the real host, status
  // and round-trip time of the request. Both are aria-hidden; the status
  // message below is what assistive technology announces.
  const sendTrace = document.getElementById("send-trace");
  const sendLog = document.getElementById("send-log");

  function trace(state, log, detail) {
    // Ping (ping.js) carries the message along the route; he hears about
    // the request through these events.
    document.dispatchEvent(
      new CustomEvent("contact:" + (state === "done" ? "sent" : state), { detail: detail || {} }),
    );
    if (!sendTrace) return;
    sendTrace.classList.remove("is-sending", "is-done", "is-failed");
    // Restart the landing animation when a second message is sent.
    void sendTrace.offsetWidth;
    sendTrace.classList.add("is-" + state);
    if (sendLog) {
      sendLog.textContent = log || "";
      sendLog.classList.toggle("is-failed", state === "failed");
    }
  }

  // Show form status
  function showStatus(type, message) {
    formStatus.className = `form-status ${type}`;
    formStatus.textContent = message;
  }

  // Add real-time validation on blur
  ["name", "email", "message"].forEach((fieldName) => {
    const field = document.getElementById(fieldName);
    if (field) {
      field.addEventListener("blur", () => {
        validateField(fieldName, field.value);
      });

      // Clear error on input
      field.addEventListener("input", () => {
        if (field.getAttribute("aria-invalid") === "true") {
          clearError(fieldName);
        }
      });
    }
  });

  // Handle form submission
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      showStatus("error", "Please fix the errors above before submitting.");
      return;
    }

    // Disable submit button
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    showStatus("", "");
    trace("sending");

    const endpoint = new URL(form.action, location.href);
    const host = endpoint.host;
    const started = performance.now();

    try {
      const data = new FormData(form);
      const payload = {
        topic: topic(),
        addons: data.getAll("addons"),
        name: data.get("name"),
        email: data.get("email"),
        message: data.get("message"),
        website: data.get("website"),
        token: await turnstileToken(),
      };
      // A stalled connection gives up after 15 seconds instead of leaving
      // the button disabled (and Ping holding the envelope) for good.
      const controller = "AbortController" in window ? new AbortController() : null;
      const timeout = controller ? setTimeout(() => controller.abort(), 15000) : 0;
      const response = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: controller ? controller.signal : undefined,
      });
      clearTimeout(timeout);
      const ms = Math.round(performance.now() - started);
      const result = await response.json().catch(() => ({}));

      if (response.ok && result.ok) {
        trace(
          "done",
          `POST ${host} · ${response.status}${response.statusText ? " " + response.statusText : response.status === 200 ? " OK" : ""} · ${ms} ms`,
          { status: response.status, ms },
        );
        const first = String(payload.name).trim().split(/\s+/)[0];
        showStatus(
          "success",
          `Thanks, ${first}! Your message is in my inbox, and a confirmation is on its way to ${payload.email}.`,
        );
        form.reset();
        onTopic();
      } else {
        trace("failed", `POST ${host} · ${response.status} · ${ms} ms`, { status: response.status, ms });
        if (result.field && validators[result.field]) {
          showError(result.field, result.error);
          showStatus("error", "Please fix the errors above before submitting.");
        } else {
          showStatus(
            "error",
            result.error || "Message didn't send. Please try again, or email ryan@ryanyarali.com.",
          );
        }
      }
    } catch (error) {
      console.error("Form submission error:", error);
      if (sendTrace && !sendTrace.classList.contains("is-failed")) {
        trace("failed", `POST ${host} · no response`);
      }
      showStatus(
        "error",
        "Message didn't send. Please try again, or email ryan@ryanyarali.com.",
      );
    } finally {
      // Re-enable submit button; a Turnstile token is good for one send.
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
      if (widget !== null) window.turnstile.reset(widget);
    }
  });
})();
