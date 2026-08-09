(function () {
  "use strict";

  var reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) {
    document.documentElement.classList.add("dh-legal-reduced");
    return;
  }

  var revealers = document.querySelectorAll("[data-legal-reveal]");
  if (!revealers.length) return;

  if (typeof IntersectionObserver === "undefined") {
    revealers.forEach(function (el) {
      el.classList.add("dh-legal-reveal", "is-in");
    });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var target = entry.target;
        var delayAttr = target.getAttribute("data-legal-delay");
        var delay = delayAttr ? parseInt(delayAttr, 10) : 0;
        if (!isNaN(delay) && delay > 0) {
          target.style.transitionDelay = delay + "ms";
        }
        target.classList.add("is-in");
        io.unobserve(target);
      });
    },
    {
      threshold: 0.08,
      rootMargin: "0px 0px -6% 0px",
    }
  );

  var viewportBottom = window.innerHeight * 0.94;

  revealers.forEach(function (el) {
    var rect = el.getBoundingClientRect();
    var inView = rect.top < viewportBottom && rect.bottom > 0;
    if (inView) {
      el.classList.add("dh-legal-reveal", "is-in");
      return;
    }
    el.classList.add("dh-legal-reveal");
    io.observe(el);
  });
})();
