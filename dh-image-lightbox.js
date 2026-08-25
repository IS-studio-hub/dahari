(() => {
  "use strict";

  var EXCLUDE =
    ".dh-corner-logo img, .wqf-slide-meta-icon, .dh-side-header888__menu-social888 img, " +
    "img[src*='Icons/'], img[src*='favicon'], img[src$='.svg'], " +
    /* Portfolio / listing cards - lightbox is for content images only */
    ".wqf-logo-img, .wqf-slide img, .wqf-slide-card img, " +
    ".dh-logistics-item__also-like-media img, .dh-logistics-item__also-like-card img, " +
    ".dh-lightbox img, .dh-lightbox video";

  var IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|bmp)(\?|#|$)/i;

  var root = null;
  var imgEl = null;
  var videoEl = null;
  var closeBtn = null;
  var lastFocus = null;
  var sourceVideo = null;
  var open = false;

  function ensure() {
    if (root) return;
    root = document.createElement("div");
    root.className = "dh-lightbox";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "תצוגת מדיה");
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

    videoEl = document.createElement("video");
    videoEl.className = "dh-lightbox__video";
    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.loop = true;
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.setAttribute("playsinline", "");
    videoEl.setAttribute("webkit-playsinline", "");
    videoEl.setAttribute("muted", "");
    videoEl.setAttribute("loop", "");
    videoEl.setAttribute("autoplay", "");
    videoEl.setAttribute("disablepictureinpicture", "");
    videoEl.setAttribute("controlslist", "nodownload nofullscreen noremoteplayback");
    videoEl.controls = false;
    videoEl.preload = "auto";
    videoEl.hidden = true;

    root.appendChild(closeBtn);
    root.appendChild(imgEl);
    root.appendChild(videoEl);
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
      // Page link (also-like, etc.) - do not lightbox
      if (/\.html?(\?|#|$)/i.test(href) || href === "#" || href.startsWith("mailto:")) {
        return null;
      }
    }
    return img.currentSrc || img.getAttribute("src") || null;
  }

  function showShell() {
    root.hidden = false;
    root.classList.add("is-open");
    document.body.classList.add("dh-lightbox-open");
    open = true;
    closeBtn.focus({ preventScroll: true });
  }

  function prepareVideo(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    video.controls = false;
    video.removeAttribute("controls");
    var playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(function () {});
    }
  }

  function clearVideo() {
    if (!videoEl) return;
    videoEl.pause();
    videoEl.removeAttribute("src");
    videoEl.load();
    videoEl.hidden = true;
  }

  function openImageLightbox(src, alt) {
    if (!src) return;
    ensure();
    lastFocus = document.activeElement;
    sourceVideo = null;
    clearVideo();
    imgEl.hidden = false;
    imgEl.src = src;
    imgEl.alt = alt || "";
    showShell();
  }

  function openVideoLightbox(video) {
    if (!video) return;
    var src = video.currentSrc || video.getAttribute("src") || "";
    if (!src) return;
    ensure();
    lastFocus = document.activeElement;
    sourceVideo = video;
    try {
      video.pause();
    } catch (_) {}
    imgEl.hidden = true;
    imgEl.removeAttribute("src");
    imgEl.alt = "";
    videoEl.hidden = false;
    if (videoEl.getAttribute("src") !== src) {
      videoEl.src = src;
    }
    try {
      if (!isNaN(video.currentTime)) videoEl.currentTime = video.currentTime;
    } catch (_) {}
    prepareVideo(videoEl);
    showShell();
  }

  function closeLightbox() {
    if (!open || !root) return;
    open = false;
    root.classList.remove("is-open");
    document.body.classList.remove("dh-lightbox-open");
    if (videoEl) videoEl.pause();
    if (sourceVideo) {
      try {
        if (videoEl && !isNaN(videoEl.currentTime)) {
          sourceVideo.currentTime = videoEl.currentTime;
        }
        sourceVideo.play();
      } catch (_) {}
      sourceVideo = null;
    }
    window.setTimeout(function () {
      if (open) return;
      root.hidden = true;
      imgEl.removeAttribute("src");
      imgEl.alt = "";
      imgEl.hidden = false;
      clearVideo();
    }, 220);
    if (lastFocus && typeof lastFocus.focus === "function") {
      try {
        lastFocus.focus({ preventScroll: true });
      } catch (_) {}
    }
    lastFocus = null;
  }

  function isProductVideo(video) {
    if (!video) return false;
    if (video.closest(".dh-lightbox")) return false;
    return !!(
      video.closest(".dh-logistics-item") ||
      document.documentElement.classList.contains("dh-page-property-item")
    );
  }

  document.addEventListener(
    "click",
    function (e) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      var video = e.target && e.target.closest ? e.target.closest("video") : null;
      if (video && isProductVideo(video)) {
        e.preventDefault();
        e.stopPropagation();
        openVideoLightbox(video);
        return;
      }

      var img = e.target && e.target.closest ? e.target.closest("img") : null;
      if (!img || isExcluded(img)) return;

      var src = resolveSrc(img);
      if (!src) return;
      if (!IMAGE_EXT.test(src) && !src.startsWith("data:image")) return;

      e.preventDefault();
      e.stopPropagation();
      openImageLightbox(src, img.getAttribute("alt") || "");
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
