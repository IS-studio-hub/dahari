(function () {
  "use strict";

  var reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced) {
    document.documentElement.classList.add("dh-arch-reduced");
    return;
  }

  var revealers = document.querySelectorAll("[data-arch-reveal]");
  if (!revealers.length) return;

  if (typeof IntersectionObserver === "undefined") {
    revealers.forEach(function (el) {
      el.classList.add("dh-arch-reveal", "is-in");
    });
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var target = entry.target;
        var delayAttr = target.getAttribute("data-arch-delay");
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
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealers.forEach(function (el) {
    el.classList.add("dh-arch-reveal");
    io.observe(el);
  });
})();
