/**
 * Contact Form Handler
 * Client-side validation and submission
 */

(function () {
  "use strict";

  const form = document.getElementById("contact-form");
  const formStatus = document.getElementById("form-status");

  if (!form) return;

  // Form field validators
  const validators = {
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

    subject: (value) => {
      if (!value) return "Please select a subject";
      return null;
    },

    message: (value) => {
      if (!value.trim()) return "Message is required";
      if (value.trim().length < 10)
        return "Message must be at least 10 characters";
      return null;
    },
  };

  // Display error message
  function showError(fieldName, message) {
    const errorElement = document.getElementById(`${fieldName}-error`);
    const inputElement = document.getElementById(fieldName);

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
    const inputElement = document.getElementById(fieldName);

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

  // Validate all fields
  function validateForm() {
    let isValid = true;

    Object.keys(validators).forEach((fieldName) => {
      const field = document.getElementById(fieldName);
      if (field) {
        const fieldValid = validateField(fieldName, field.value);
        if (!fieldValid) isValid = false;
      }
    });

    return isValid;
  }

  // Show form status
  function showStatus(type, message) {
    formStatus.className = `form-status ${type}`;
    formStatus.textContent = message;

    // Auto-hide success message after 5 seconds
    if (type === "success") {
      setTimeout(() => {
        formStatus.className = "form-status";
        formStatus.textContent = "";
      }, 5000);
    }
  }

  // Add real-time validation on blur
  Object.keys(validators).forEach((fieldName) => {
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

    try {
      // Submit to Formspree (or your chosen service)
      const formData = new FormData(form);
      const response = await fetch(form.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        showStatus(
          "success",
          "Thank you!  Your message has been sent successfully.  I'll get back to you soon."
        );
        form.reset();
      } else {
        throw new Error("Form submission failed");
      }
    } catch (error) {
      console.error("Form submission error:", error);
      showStatus(
        "error",
        "Oops! There was a problem sending your message. Please try again or email me directly."
      );
    } finally {
      // Re-enable submit button
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  });

  console.log("📧 Contact form initialized");
})();
