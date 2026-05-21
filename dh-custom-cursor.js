(function () {
  "use strict";

  if (window.__dhCustomCursorLoaded) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  window.__dhCustomCursorLoaded = true;

  const root = document.documentElement;
  const HOVER =
    'a[href],button:not([disabled]),[role="button"]:not([disabled]),[role="link"],[role="tab"]:not([disabled]),[role="menuitem"]:not([aria-disabled="true"]),input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[data-menu-toggle],[data-desk-prev],[data-desk-next],[data-mobile-prev],[data-mobile-next],.dh-carousel__link,.dh-carousel__desk-arrow,.dh-carousel__mobile-arrow,label[for],.wqf-skip-link,.wqf-main a[href],.wqf-main button:not([disabled])';

  const el = document.createElement("div");
  el.id = "dh-site-cursor";
  el.setAttribute("aria-hidden", "true");
  const invertRing = document.createElement("span");
  invertRing.className = "dh-site-cursor__invert-ring";
  el.appendChild(invertRing);
  document.body.appendChild(el);
  root.classList.add("dh-custom-cursor--on");

  let mx = window.innerWidth * 0.5;
  let my = window.innerHeight * 0.5;
  let cx = mx;
  let cy = my;
  let raf = 0;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function frame() {
    cx = lerp(cx, mx, 0.2);
    cy = lerp(cy, my, 0.2);
    el.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
    raf = window.requestAnimationFrame(frame);
  }

  function onMove(ev) {
    mx = ev.clientX;
    my = ev.clientY;
    const hit = ev.target && ev.target.closest ? ev.target.closest(HOVER) : null;
    el.classList.toggle("dh-site-cursor--link", !!hit);
  }

  function setHidden(hidden) {
    el.classList.toggle("dh-site-cursor--hidden", !!hidden);
  }

  function setPressed(pressed) {
    el.classList.toggle("dh-site-cursor--press", !!pressed);
  }

  function setState(x, y, isLink) {
    if (typeof x === "number") mx = x;
    if (typeof y === "number") my = y;
    if (typeof isLink === "boolean") {
      el.classList.toggle("dh-site-cursor--link", isLink);
    }
    setHidden(false);
  }

  window.__dhCustomCursorBridge = {
    setState: setState,
    setHidden: setHidden,
    setPressed: setPressed,
  };

  window.addEventListener(
    "mousemove",
    function (e) {
      onMove(e);
    },
    { passive: true }
  );

  window.addEventListener("mousedown", function () {
    setPressed(true);
  });
  window.addEventListener("mouseup", function () {
    setPressed(false);
  });

  document.documentElement.addEventListener("mouseleave", function () {
    setHidden(true);
  });
  document.documentElement.addEventListener("mouseenter", function () {
    setHidden(false);
  });

  el.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
  raf = window.requestAnimationFrame(frame);

  window.addEventListener(
    "beforeunload",
    function () {
      window.cancelAnimationFrame(raf);
      if (window.__dhCustomCursorBridge) {
        delete window.__dhCustomCursorBridge;
      }
    },
    { once: true }
  );
})();
