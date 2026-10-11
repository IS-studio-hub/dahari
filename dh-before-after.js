/* Before / After comparison slider */
(function () {
  "use strict";

  function init(root) {
    var range = root.querySelector(".dh-ba__range");
    if (!range) return;

    function set(v) {
      var n = Math.max(0, Math.min(100, Number(v)));
      root.style.setProperty("--ba-pos", n + "%");
      range.value = String(n);
      range.setAttribute("aria-valuetext", Math.round(n) + "% לפני");
    }

    function fromPointer(clientX) {
      var r = root.getBoundingClientRect();
      if (!r.width) return;
      set(((clientX - r.left) / r.width) * 100);
    }

    range.addEventListener("input", function () {
      set(range.value);
    });

    var dragging = false;
    root.addEventListener("pointerdown", function (e) {
      dragging = true;
      root.classList.add("is-dragging");
      fromPointer(e.clientX);
      if (root.setPointerCapture) {
        try { root.setPointerCapture(e.pointerId); } catch (err) {}
      }
    });
    root.addEventListener("pointermove", function (e) {
      if (dragging) fromPointer(e.clientX);
    });
    function stop() {
      dragging = false;
      root.classList.remove("is-dragging");
    }
    root.addEventListener("pointerup", stop);
    root.addEventListener("pointercancel", stop);

    set(range.value || 50);
  }

  function boot() {
    var all = document.querySelectorAll("[data-before-after]");
    for (var i = 0; i < all.length; i++) init(all[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
