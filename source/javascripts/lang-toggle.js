// EN | JP language switch. Each link already points at the same page in the
// other language; this just carries the current #section over, so switching
// language on the Projects section lands you on the Projects section.

(function () {
  "use strict";

  var links = document.querySelectorAll("[data-lang-link]");

  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener("click", function () {
      if (window.location.hash) {
        link.hash = window.location.hash;
      }
    });
  });
})();
