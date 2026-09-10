// Scroll behaviour, all built on IntersectionObserver — no scroll-event
// listeners, no animation library.
//
//   1. Highlights the nav link for whichever section is currently on screen.
//   2. Fades elements in as they scroll into view.
//   3. Adds a border to the navbar once the page is scrolled.
//   4. Closes the mobile menu after a link is tapped.

(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  // --- 1. Active nav link ---------------------------------------------------

  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll("[data-nav-link]")
  );

  // Map each section id to its nav link, skipping links whose section is
  // missing so a typo in data/site.yml cannot throw.
  var linkFor = {};
  var sections = [];

  navLinks.forEach(function (link) {
    var id = link.getAttribute("href").replace("#", "");
    var section = document.getElementById(id);
    if (section) {
      linkFor[id] = link;
      sections.push(section);
    }
  });

  function setActive(id) {
    navLinks.forEach(function (link) {
      link.classList.toggle("is-active", link === linkFor[id]);
      // aria-current tells assistive tech which section you are viewing.
      if (link === linkFor[id]) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  if (sections.length && "IntersectionObserver" in window) {
    // The band runs from just under the navbar to 55% up from the bottom, so
    // the "current" section is the one occupying the upper middle of the
    // screen — which is what a reader perceives as the section they are in.
    var navObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActive(entry.target.id);
          }
        });
      },
      { rootMargin: "-70px 0px -55% 0px", threshold: 0 }
    );

    sections.forEach(function (section) {
      navObserver.observe(section);
    });

    // The last section is often too short to ever fill the observer band, so
    // it would never light up. Catch the true bottom of the page directly.
    window.addEventListener(
      "scroll",
      function () {
        var atBottom =
          window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 2;
        if (atBottom) {
          setActive(sections[sections.length - 1].id);
        }
      },
      { passive: true }
    );
  }

  // --- 2. Scroll entrance animations ---------------------------------------

  var revealables = document.querySelectorAll("[data-reveal]");

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    // Show everything immediately rather than animating.
    revealables.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry, index) {
          if (!entry.isIntersecting) return;

          // Stagger items that appear together so a grid cascades in rather
          // than snapping as one block. Capped so nothing feels sluggish.
          var delay = Math.min(index * 70, 350);
          setTimeout(function () {
            entry.target.classList.add("is-visible");
          }, delay);

          // Reveal once, then stop watching — this is an entrance, not a
          // state that should reverse when you scroll back up.
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.08 }
    );

    revealables.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  // --- 3. Navbar border once scrolled -------------------------------------

  var nav = document.querySelector(".site-nav");
  var sentinel = document.getElementById("hero");

  if (nav && sentinel && "IntersectionObserver" in window) {
    // Watch a sliver at the top of the page: once it scrolls out of view, the
    // page has moved and the navbar earns its border.
    var navBorderObserver = new IntersectionObserver(
      function (entries) {
        nav.classList.toggle("is-scrolled", !entries[0].isIntersecting);
      },
      { rootMargin: "0px 0px -100% 0px", threshold: 0 }
    );
    navBorderObserver.observe(sentinel);
  }

  // --- 4. Close the mobile menu after tapping a link -----------------------

  var collapse = document.getElementById("nav-links");

  if (collapse) {
    navLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        // bootstrap is loaded from the CDN before this file; guard anyway so a
        // blocked CDN degrades to a working page rather than a console error.
        if (
          window.bootstrap &&
          collapse.classList.contains("show")
        ) {
          window.bootstrap.Collapse.getOrCreateInstance(collapse).hide();
        }
      });
    });
  }
})();
