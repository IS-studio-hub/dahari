(() => {
  "use strict";

  var EXCLUDE =
    ".dh-corner-logo img, .wqf-slide-meta-icon, .dh-side-header888__menu-social888 img, " +
    "img[src*='Icons/'], img[src*='favicon'], img[src$='.svg'], " +
    /* Portfolio / listing cards — lightbox is for content images only */
    ".wqf-logo-img, .wqf-slide img, .wqf-slide-card img, " +
    ".dh-logistics-item__also-like-media img, .dh-logistics-item__also-like-card img, " +
    ".dh-lightbox img";

  var IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp)(\?|#|$)/i;

  var root = null;
  var imgEl = null;
  var closeBtn = null;
  var lastFocus = null;
  var open = false;

  function ensure() {
    if (root) return;
    root = document.createElement("div");
    root.className = "dh-lightbox";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "תצוגת תמונה");
    root.hidden = true;

    closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "dh-lightbox__close";
    closeBtn.setAttribute("aria-label", "סגירה");
    closeBtn.innerHTML =
      '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<path d="M6 6l12 12M18 6L6 18"/></svg>';

    imgEl = document.createElement("img");
    imgEl.className = "dh-lightbox__img";
    imgEl.alt = "";
    imgEl.decoding = "async";

    root.appendChild(closeBtn);
    root.appendChild(imgEl);
    document.body.appendChild(root);

    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeLightbox();
    });
    root.addEventListener("click", function (e) {
      if (e.target === root) closeLightbox();
    });
  }

  function isExcluded(el) {
    return !!(el && el.matches && el.matches(EXCLUDE));
  }

  function resolveSrc(img) {
    var link = img.closest("a[href]");
    if (link) {
      var href = link.getAttribute("href") || "";
      if (IMAGE_EXT.test(href)) return href;
      // Page link (also-like, etc.) — do not lightbox
      if (/\.html?(\?|#|$)/i.test(href) || href === "#" || href.startsWith("mailto:")) {
        return null;
      }
    }
    return img.currentSrc || img.getAttribute("src") || null;
  }

  function openLightbox(src, alt) {
    if (!src) return;
    ensure();
    lastFocus = document.activeElement;
    imgEl.src = src;
    imgEl.alt = alt || "";
    root.hidden = false;
    root.classList.add("is-open");
    document.body.classList.add("dh-lightbox-open");
    open = true;
    closeBtn.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!open || !root) return;
    open = false;
    root.classList.remove("is-open");
    document.body.classList.remove("dh-lightbox-open");
    window.setTimeout(function () {
      if (open) return;
      root.hidden = true;
      imgEl.removeAttribute("src");
      imgEl.alt = "";
    }, 220);
    if (lastFocus && typeof lastFocus.focus === "function") {
      try {
        lastFocus.focus({ preventScroll: true });
      } catch (_) {}
    }
    lastFocus = null;
  }

  document.addEventListener(
    "click",
    function (e) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var img = e.target && e.target.closest ? e.target.closest("img") : null;
      if (!img || isExcluded(img)) return;

      var src = resolveSrc(img);
      if (!src) return;
      if (!IMAGE_EXT.test(src) && !src.startsWith("data:image")) return;

      e.preventDefault();
      e.stopPropagation();
      openLightbox(src, img.getAttribute("alt") || "");
    },
    true
  );

  document.addEventListener("keydown", function (e) {
    if (!open) return;
    if (e.key === "Escape" || e.key === "Esc") {
      e.preventDefault();
      closeLightbox();
    }
  });
})();
