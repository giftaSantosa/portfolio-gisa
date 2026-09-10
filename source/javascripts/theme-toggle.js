// Dark/light mode toggle. Flips data-bs-theme on <html> and remembers the
// choice in localStorage so it survives a reload.
//
// Note: the theme is APPLIED by a small inline script in the <head> (see
// source/layouts/layout.erb) so it takes effect before the first paint. This
// file only wires up the button and keeps its state in sync.

(function () {
  "use strict";

  var STORAGE_KEY = "theme";
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");

  if (!toggle) return;

  // Reflect the current theme in the button's accessibility state, so screen
  // readers announce whether dark mode is on rather than just "button".
  function syncButton() {
    var isDark = root.getAttribute("data-bs-theme") === "dark";
    toggle.setAttribute("aria-pressed", String(isDark));
    toggle.setAttribute(
      "title",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
  }

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-bs-theme", next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch (e) {
      // Private browsing can block writes. The toggle still works for this
      // page view; it just will not be remembered.
    }

    syncButton();
  });

  // Follow the OS setting as it changes, but only for visitors who have never
  // made an explicit choice here — an explicit choice always wins.
  var media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", function (event) {
    var hasChoice;
    try {
      hasChoice = localStorage.getItem(STORAGE_KEY) !== null;
    } catch (e) {
      hasChoice = false;
    }

    if (!hasChoice) {
      root.setAttribute("data-bs-theme", event.matches ? "dark" : "light");
      syncButton();
    }
  });

  syncButton();
})();
