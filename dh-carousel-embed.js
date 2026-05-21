(function () {
  "use strict";

  const root =
    (document.currentScript && document.currentScript.closest(".dh-carousel-embed")) ||
    document.querySelector(".dh-carousel-embed");
  if (!root) return;

  /**
   * Match normal `<img src>` resolution: relative to the document (or `data-media-base` on the embed).
   * @param {string} rel
   */
  function resolveMediaUrl(rel) {
    const s = String(rel || "").trim();
    if (!s || /^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) return s;
    try {
      const override = root.getAttribute("data-media-base");
      const base = (override && override.trim()) || document.baseURI || window.location.href;
      return new URL(s, base).href;
    } catch (e) {
      return s;
    }
  }

  function setVh() {
    const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    root.style.setProperty("--vh", `${0.01 * h}px`);
  }
  setVh();
  window.addEventListener("resize", setVh);
  window.addEventListener("orientationchange", setVh);
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", setVh);
  }

  /**
   * Carousel cards (no עמוד הבית / home card). `href` is a flat `.html` in the site folder.
   * Override list in assets/carousel-slides.json.
   */
  const DEFAULT_SLIDES = [
    { href: "logistics.html", src: "assets/Homepagevids/logistics.mp4", titleHe: "לוגיסטיקה", titleEn: "Logistics" },
    { href: "offices.html", src: "assets/Homepagevids/office.mp4", titleHe: "משרדים", titleEn: "Offices" },
    { href: "residences.html", src: "assets/Homepagevids/residences.mp4", titleHe: "מגורים", titleEn: "Residences" },
    { href: "commerce.html", src: "assets/Homepagevids/commercial.mp4", titleHe: "נדל״ן מסחרי", titleEn: "Commercial" },
    { href: "about.html", src: "assets/Homepagevids/%D7%90%D7%95%D7%93%D7%95%D7%AA%20V3.mp4", titleHe: "אודות", titleEn: "About" },
    { href: "contact.html", src: "assets/Homepagevids/b%20Copy%2004.mp4", titleHe: "יצירת קשר", titleEn: "Contact" },
  ];

  function escAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  function escHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * @param {unknown} data
   * @returns {{ href: string; src: string; titleHe: string; titleEn: string }[] | null}
   */
  function normalizeSlides(data) {
    if (!Array.isArray(data) || !data.length) return null;
    const out = [];
    for (let i = 0; i < data.length && i < 24; i++) {
      const row = data[i];
      if (!row || typeof row !== "object") continue;
      const src = row.src;
      if (typeof src !== "string" || !src.trim()) continue;
      out.push({
        href: typeof row.href === "string" && row.href ? row.href : "#",
        src: src.trim(),
        titleHe: typeof row.titleHe === "string" ? row.titleHe : "",
        titleEn: typeof row.titleEn === "string" ? row.titleEn : "",
      });
    }
    return out.length ? out : null;
  }

  function getAssetBaseHref() {
    const raw = root.getAttribute("data-media-base");
    if (raw && String(raw).trim()) {
      try {
        const t = String(raw).trim();
        return new URL(t.endsWith("/") ? t : t + "/", document.baseURI).href;
      } catch (e) {
        /* fall through */
      }
    }
    try {
      return new URL("./", document.baseURI).href;
    } catch (e) {
      return document.baseURI || window.location.href;
    }
  }

  function localPathBasename(pathname) {
    const segs = String(pathname || "").split("/").filter(Boolean);
    return segs.length ? segs[segs.length - 1] : "";
  }

  function normalizePathname(path) {
    let p = String(path || "").split("?")[0].replace(/\/index\.html?$/i, "");
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p === "" ? "/" : p;
  }

  function slideBasenameFromHref(href) {
    const s = String(href || "").trim();
    if (!s || s === "#") return "";
    try {
      const u = new URL(s, document.baseURI || window.location.href);
      return localPathBasename(u.pathname).toLowerCase();
    } catch (e) {
      return localPathBasename(s).toLowerCase();
    }
  }

  /**
   * @param {{ href: string }[]} slides
   * @param {string} locationPathname
   */
  function findSlideIndexForPath(slides, locationPathname) {
    const locBn = localPathBasename(locationPathname).toLowerCase();
    const normalized = normalizePathname(locationPathname);
    const isHome =
      normalized === "/" || locBn === "" || /^index\.html?$/i.test(locBn);

    for (let i = 0; i < slides.length; i++) {
      const raw = String(slides[i].href || "").trim();
      const sb = slideBasenameFromHref(raw);
      const rawL = raw.toLowerCase();
      if (isHome && (rawL === "index.html" || raw === "/" || sb === "index.html")) return i;
      if (!isHome && sb && locBn && sb === locBn) return i;
    }
    for (let i = 0; i < slides.length; i++) {
      const raw = String(slides[i].href || "").trim();
      try {
        const pSlide = normalizePathname(new URL(raw, "https://example.invalid").pathname);
        if (pSlide === normalized) return i;
      } catch (e) {
        /* ignore */
      }
    }
    return 0;
  }

  /**
   * @param {{ href: string }[]} slides
   * @param {string} hrefOrBasename e.g. "about.html"
   * @returns {number} index or -1
   */
  function findSlideIndexByHref(slides, hrefOrBasename) {
    const want = slideBasenameFromHref(hrefOrBasename);
    if (!want) return -1;
    for (let i = 0; i < slides.length; i++) {
      if (slideBasenameFromHref(slides[i].href) === want) return i;
    }
    return -1;
  }

  async function resolveSlides() {
    let slidesUrl = "assets/carousel-slides.json";
    try {
      slidesUrl = new URL("assets/carousel-slides.json", getAssetBaseHref()).href;
    } catch (e) {
      /* keep relative */
    }
    try {
      const res = await fetch(slidesUrl, { cache: "no-store" });
      if (res.ok) {
        const parsed = await res.json();
        const norm = normalizeSlides(parsed);
        if (norm) return norm;
      }
    } catch (e) {
      /* file:// or missing file — use defaults */
    }
    return DEFAULT_SLIDES;
  }

  const EDGE_HTML = ["right", "left", "top", "bottom"]
    .map(
      (side) =>
        `<span class="dh-carousel__card-edge dh-carousel__card-edge--${side}" aria-hidden="true"></span>`
    )
    .join("");

  class LocalVideos {
    /**
     * @param {HTMLElement} rootEl
     * @param {Carousel} carousel
     */
    constructor(rootEl, carousel) {
      this.root = rootEl;
      this.c = carousel;
      this._primary = 0;
      /** @type {{ el: HTMLVideoElement }[]} */
      this.items = [];
      this.tickInterval = null;
      this._onVisibilityChange = null;
      /** @type {IntersectionObserver | null} */
      this._io = null;
      /** @type {(() => void) | null} */
      this._unlock = null;
      /** @type {(() => void) | null} */
      this._docUnlock = null;
    }

    /**
     * Browsers often reject play() until there is enough buffered data (and may ignore
     * the autoplay attribute when many videos exist). Retry on readiness and briefly after.
     * @param {HTMLVideoElement} el
     */
    primePlay(el) {
      if (!el) return;
      el.muted = true;
      el.defaultMuted = true;
      const run = () => {
        void el.play().catch(() => {});
      };
      run();
      if (el.readyState < 2) {
        const evts = ["loadedmetadata", "loadeddata", "canplay", "canplaythrough"];
        for (let e = 0; e < evts.length; e++) {
          el.addEventListener(evts[e], run, { once: true });
        }
      }
      window.setTimeout(run, 60);
      window.setTimeout(run, 180);
      window.setTimeout(run, 520);
      window.setTimeout(run, 1200);
    }

    init() {
      const els = Array.from(this.root.querySelectorAll("video.dh-carousel__video"));
      this.items = els.map((el) => ({ el }));
      els.forEach((el, idx) => {
        el.muted = true;
        el.defaultMuted = true;
        el.playsInline = true;
        el.setAttribute("playsinline", "");
        el.setAttribute("webkit-playsinline", "");
        el.loop = true;
        el.preload = "auto";
        el.disablePictureInPicture = true;
        el.setAttribute("disablepictureinpicture", "");
        el.setAttribute("data-slide-index", String(idx));
        let retriedDecode = false;
        el.addEventListener("error", function () {
          if (retriedDecode) return;
          retriedDecode = true;
          try {
            el.load();
          } catch (e) {}
          window.setTimeout(function () {
            void el.play().catch(function () {});
          }, 80);
        });
      });

      this._onVisibilityChange = () => {
        if (document.hidden) {
          if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
          }
        } else {
          this.ensurePlayback();
          this.restartTickLoop();
        }
      };
      document.addEventListener("visibilitychange", this._onVisibilityChange);

      const initial =
        this.c && this.c.isMobile
          ? typeof this.c.currentMobileIndex === "number"
            ? this.c.currentMobileIndex
            : 0
          : this.c && typeof this.c.getFrontItemIndex === "function"
            ? this.c.getFrontItemIndex()
            : 0;
      this.setPrimaryIndex(initial);
      this.restartTickLoop();

      const ioTarget = this.root.querySelector("[data-carousel-container]") || this.root;
      if ("IntersectionObserver" in window) {
        this._io = new IntersectionObserver(
          (entries) => {
            for (let k = 0; k < entries.length; k++) {
              if (entries[k].isIntersecting) {
                this.ensurePlayback();
                break;
              }
            }
          },
          { root: null, rootMargin: "0px", threshold: [0, 0.05, 0.2] }
        );
        this._io.observe(ioTarget);
      }

      this._unlock = () => {
        this.ensurePlayback();
        if (this._unlock) {
          this.root.removeEventListener("pointerdown", this._unlock);
          this.root.removeEventListener("touchstart", this._unlock);
          this._unlock = null;
        }
      };
      this.root.addEventListener("pointerdown", this._unlock, { passive: true });
      this.root.addEventListener("touchstart", this._unlock, { passive: true });

      this._docUnlock = () => {
        this.ensurePlayback();
        this.items.forEach(({ el }) => this.primePlay(el));
      };
      document.addEventListener("touchend", this._docUnlock, { capture: true, passive: true, once: true });
      document.addEventListener("click", this._docUnlock, { capture: true, passive: true, once: true });
    }

    restartTickLoop() {
      if (this.tickInterval) {
        clearInterval(this.tickInterval);
        this.tickInterval = null;
      }
      if (document.hidden) return;
      const ms = this.c && this.c.liteDevice ? 8000 : 6000;
      this.tickInterval = setInterval(() => this.ensurePlayback(), ms);
    }

    /**
     * Tracks the front card for unlock / tick helpers; every clip stays playing in a loop.
     * @param {number} index
     */
    setPrimaryIndex(index) {
      if (!this.items.length) return;
      const n = this.items.length;
      const i = Math.max(0, Math.min(index | 0, n - 1));
      this._primary = i;

      this.items.forEach(({ el }) => {
        el.preload = "auto";
      });

      requestAnimationFrame(() => {
        this.items.forEach(({ el }) => {
          if (el.error) {
            try {
              el.load();
            } catch (e) {}
            this.primePlay(el);
            return;
          }
          if (el.networkState === 0) {
            try {
              el.load();
            } catch (e) {}
            this.primePlay(el);
            return;
          }
          if (el.paused) this.primePlay(el);
        });
        this.ensurePlayback();
      });
    }

    ensurePlayback() {
      if (!this.items.length) return;
      this.items.forEach(({ el }) => {
        if (!el.paused) return;
        void el.play().catch(() => {});
        window.setTimeout(() => void el.play().catch(() => {}), 100);
      });
    }

    destroy() {
      document.removeEventListener("visibilitychange", this._onVisibilityChange);
      if (this._io) {
        this._io.disconnect();
        this._io = null;
      }
      if (this._unlock) {
        this.root.removeEventListener("pointerdown", this._unlock);
        this.root.removeEventListener("touchstart", this._unlock);
        this._unlock = null;
      }
      if (this._docUnlock) {
        document.removeEventListener("touchend", this._docUnlock, true);
        document.removeEventListener("click", this._docUnlock, true);
        this._docUnlock = null;
      }
      if (this.tickInterval) {
        clearInterval(this.tickInterval);
        this.tickInterval = null;
      }
      this.items.forEach(({ el }) => {
        try {
          el.pause();
        } catch (e) {}
      });
      this.items = [];
    }
  }

  class Carousel {
    /**
     * @param {HTMLElement} rootEl
     * @param {number} [initialFrontIndex]
     */
    constructor(rootEl, initialFrontIndex) {
      this.root = rootEl;
      this.container = rootEl.querySelector("[data-carousel-container]");
      this.carousel = rootEl.querySelector("[data-carousel-stage]");
      this.items = Array.from(rootEl.querySelectorAll(".dh-carousel__item"));
      this.itemCount = this.items.length;
      this.prevBtn = rootEl.querySelector("[data-mobile-prev]");
      this.nextBtn = rootEl.querySelector("[data-mobile-next]");
      this.deskPrevBtn = rootEl.querySelector("[data-desk-prev]");
      this.deskNextBtn = rootEl.querySelector("[data-desk-next]");
      this.mobileTitle = rootEl.querySelector(".dh-carousel__mobile-title");
      if (!this.container || !this.carousel || !this.itemCount) return;

      this.mediaQuery = window.matchMedia("(max-width: 1023px)");
      this.isMobile = this.mediaQuery.matches;
      this.liteDevice = (function () {
        try {
          const cores = navigator.hardwareConcurrency;
          if (typeof cores === "number" && cores > 0 && cores <= 2) return true;
          const mem = navigator.deviceMemory;
          if (typeof mem === "number" && mem > 0 && mem <= 2) return true;
          const conn = navigator.connection;
          if (conn && conn.saveData) return true;
        } catch (e) {}
        return false;
      })();
      if (this.isMobile || this.liteDevice) {
        rootEl.classList.add("dh-carousel-embed--lite");
      }

      this.videos = new LocalVideos(rootEl, this);
      this.angleStep = 360 / this.itemCount;
      var cs = getComputedStyle(this.root);
      function readDim(prop, fb) {
        var v = parseFloat(cs.getPropertyValue(prop).trim());
        return Number.isFinite(v) && v > 0 ? v : fb;
      }
      var fbSize = readDim("--card-size", 200);
      var card = Math.max(readDim("--card-width", fbSize), readDim("--card-height", fbSize));
      var step = Math.PI / this.itemCount;
      this.radius = Math.round((card / 2 / Math.sin(step)) * 2);
      const i0 = Math.max(0, Math.min(Number(initialFrontIndex) || 0, Math.max(0, this.itemCount - 1)));
      const startRot = i0 * this.angleStep;
      this.rotation = startRot;
      this.rotationX = 0;
      this.mouseOffsetRotation = 0;
      this.targetRotationX = 0;
      this.smoothTargetRotation = startRot;
      this.smoothTargetRotationX = 0;
      this.followSpeed = 0.11;
      this.mouseSensitivity = 0.4;
      this.mouseSensitivityY = 0.3;
      this.lastFrameTime = performance.now();
      this.baseRotation = startRot;
      this.isMouseOver = false;
      this.lastContainerUpdate = 0;
      this.animationFrame = null;
      this._wheelListenerOpts = { passive: false, capture: true };
      this._hoverRaf = null;
      this._pendingHoverEvent = null;
      this.wheelAccumulator = 0;
      /** Pixel-mode wheel gain (deltaMode 0). Higher = faster spin per scroll. */
      this.wheelPixelScale = 0.32;
      /** Line / page wheel scaling (deltaMode 1 / 2). */
      this.wheelLineScale = 22;
      this.wheelPageScale = 180;
      /** Accumulator magnitude needed for one card step (lower = more responsive). */
      this.wheelStepThreshold = 68;
      this.currentMobileIndex = i0;
      this._lastPrimaryFront = -1;
      this.liveRegion = rootEl.querySelector("#dh-carousel-live");
      this.reduceMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.reduceMotion = this.reduceMotionMq.matches;
      if (this.reduceMotion) {
        rootEl.classList.add("dh-carousel-embed--reduce-motion");
      }
      this._reduceMotionListener = () => {
        this.reduceMotion = this.reduceMotionMq.matches;
        rootEl.classList.toggle("dh-carousel-embed--reduce-motion", this.reduceMotion);
      };
      if (this.reduceMotionMq.addEventListener) {
        this.reduceMotionMq.addEventListener("change", this._reduceMotionListener);
      } else if (this.reduceMotionMq.addListener) {
        this.reduceMotionMq.addListener(this._reduceMotionListener);
      }

      this.items.forEach((item) => {
        if (!this.isMobile) {
          item.style.position = "absolute";
          item.style.transformStyle = "preserve-3d";
        }
      });
      this.init();
    }

    init() {
      this.bind();
      this.updateCarousel();
      this.videos.init();
      this._lastPrimaryFront = -1;
      this.updateCarousel();
      this.videos.ensurePlayback();
      this._videoLoadKick = () => {
        if (!this.videos) return;
        this.videos.ensurePlayback();
        const front = this.isMobile ? this.currentMobileIndex : this.getFrontItemIndex();
        this.videos.setPrimaryIndex(front);
      };
      if (document.readyState === "complete") {
        window.setTimeout(this._videoLoadKick, 0);
      } else {
        window.addEventListener("load", this._videoLoadKick, { once: true });
      }
      if (this.isMobile && this.container) {
        if (history.scrollRestoration) {
          history.scrollRestoration = "manual";
        }
        this.scrollToCard(this.currentMobileIndex, false);
        requestAnimationFrame(() => this.scrollToCard(this.currentMobileIndex, false));
        setTimeout(() => this.scrollToCard(this.currentMobileIndex, false), 100);
        window.addEventListener(
          "load",
          (this._loadHandler = () => this.scrollToCard(this.currentMobileIndex, false))
        );
      }
      this.updateMobileTitle();
    }

    announceFromIndex(index) {
      if (!this.liveRegion) return;
      const item = this.items[index];
      if (!item) return;
      const title = item.getAttribute("data-slide-title") || "";
      if (!title) return;
      this.liveRegion.textContent = "";
      window.requestAnimationFrame(() => {
        this.liveRegion.textContent = `נבחר: ${title}`;
      });
    }

    updateCenter() {
      const r = this.container.getBoundingClientRect();
      this.centerX = r.left + r.width / 2;
      this.centerY = r.top + r.height / 2;
    }

    updateMobileTitle() {
      if (!this.mobileTitle || !this.items.length) return;
      const item = this.items[this.currentMobileIndex];
      if (!item) return;
      const titleEl = item.querySelector(".dh-carousel__title");
      if (titleEl) {
        this.mobileTitle.textContent = titleEl.textContent.trim();
      }
    }

    /**
     * Home-page floor ellipses (`index-layout.css`): translate/scale from stage pitch (`rotationX`)
     * so the shadow tracks tilt like a contact projection (desktop only).
     */
    syncGroundShadowTilt() {
      if (!this.root) return;
      if (this.isMobile || this.reduceMotion) {
        this.root.style.setProperty("--dh-carousel-shadow-wide-tx", "0px");
        this.root.style.setProperty("--dh-carousel-shadow-wide-ty", "0px");
        this.root.style.setProperty("--dh-carousel-shadow-wide-sx", "1");
        this.root.style.setProperty("--dh-carousel-shadow-wide-sy", "1");
        this.root.style.setProperty("--dh-carousel-shadow-core-tx", "0px");
        this.root.style.setProperty("--dh-carousel-shadow-core-ty", "0px");
        this.root.style.setProperty("--dh-carousel-shadow-core-sx", "1");
        this.root.style.setProperty("--dh-carousel-shadow-core-sy", "1");
        return;
      }
      const rx = Math.max(-30, Math.min(30, Number(this.rotationX) || 0));
      const absRx = Math.abs(rx);
      const pitchRad = (rx * Math.PI) / 180;
      const cosP = Math.cos(pitchRad);
      const normStretch = 1 / Math.max(0.55, Math.abs(cosP));
      const stretchBlend = Math.min(0.1, (normStretch - 1) * 0.15);

      const tyWidePx = rx * 0.62;
      const tyCorePx = rx * 0.55;
      const txWidePx = rx * 0.098;
      const txCorePx = rx * 0.081;

      const sxWide = Math.max(0.94, Math.min(1.065, 1 - rx * 0.00188));
      const sxCore = Math.max(0.93, Math.min(1.07, 1 - rx * 0.0021));
      const syWide = Math.min(1.1, 1 + stretchBlend + absRx * 0.0037);
      const syCore = Math.min(1.12, 1 + stretchBlend * 1.07 + absRx * 0.0046);

      this.root.style.setProperty("--dh-carousel-shadow-wide-tx", `${txWidePx}px`);
      this.root.style.setProperty("--dh-carousel-shadow-wide-ty", `${tyWidePx}px`);
      this.root.style.setProperty("--dh-carousel-shadow-wide-sx", String(sxWide));
      this.root.style.setProperty("--dh-carousel-shadow-wide-sy", String(syWide));
      this.root.style.setProperty("--dh-carousel-shadow-core-tx", `${txCorePx}px`);
      this.root.style.setProperty("--dh-carousel-shadow-core-ty", `${tyCorePx}px`);
      this.root.style.setProperty("--dh-carousel-shadow-core-sx", String(sxCore));
      this.root.style.setProperty("--dh-carousel-shadow-core-sy", String(syCore));
    }

    scrollToCard(index, smooth) {
      if (!this.isMobile || !this.items.length) return;
      const i = Math.max(0, Math.min(index, this.itemCount - 1));
      const left = this.items[i].offsetLeft;
      this.currentMobileIndex = i;
      this.container.scrollTo({
        left: Math.round(left),
        behavior: smooth ? "smooth" : "auto",
      });
      requestAnimationFrame(() => {
        this.updateMobileActive();
        this.updateMobileNav();
        this.updateMobileTitle();
      });
    }

    updateMobileNav() {
      if (!this.isMobile) return;
      if (this.prevBtn) {
        this.prevBtn.disabled = this.currentMobileIndex <= 0;
      }
      if (this.nextBtn) {
        this.nextBtn.disabled = this.currentMobileIndex >= this.itemCount - 1;
      }
    }

    updateMobileActive() {
      if (!this.isMobile) return;
      const prevIndex = this.currentMobileIndex;
      const mid = this.container.scrollLeft + this.container.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      this.items.forEach((item, idx) => {
        const d = Math.abs(mid - (item.offsetLeft + item.offsetWidth / 2));
        if (d < bestDist) {
          bestDist = d;
          best = idx;
        }
      });
      this.currentMobileIndex = best;
      this.items.forEach((item, idx) => {
        item.classList.toggle("is-active", idx === best);
      });
      this.updateMobileTitle();
      this.updateMobileNav();
      if (this.videos && prevIndex !== best) {
        this.videos.setPrimaryIndex(best);
      }
      if (prevIndex !== best) {
        this.announceFromIndex(best);
      }
    }

    goToPrevMobile() {
      if (this.isMobile) {
        this.scrollToCard(this.currentMobileIndex - 1, true);
      }
    }

    goToNextMobile() {
      if (this.isMobile) {
        this.scrollToCard(this.currentMobileIndex + 1, true);
      }
    }

    bind() {
      this._processHoverEvent = (ev) => {
        if (this.isMobile || this.reduceMotion) return;
        const bounds = this.container.getBoundingClientRect();
        const x = ev.clientX;
        const y = ev.clientY;
        if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
          if (!this.isMouseOver) {
            this.isMouseOver = true;
            this.updateCenter();
          }
          this.trackMouse(ev);
          this.items.forEach((item) => {
            const link = item.querySelector(".dh-carousel__link");
            if (!link) return;
            const br = link.getBoundingClientRect();
            if (x >= br.left && x <= br.right && y >= br.top && y <= br.bottom) {
              link.classList.add("is-hovered");
              const px = ((x - br.left) / br.width) * 100;
              const py = ((y - br.top) / br.height) * 100;
              link.style.setProperty("--shine-x", px + "%");
              link.style.setProperty("--shine-y", py + "%");
              link.style.setProperty("--tilt-x", 0.3 * (50 - py) + "deg");
              link.style.setProperty("--tilt-y", 0.3 * (px - 50) + "deg");
            } else {
              link.classList.remove("is-hovered");
              link.style.setProperty("--tilt-x", "0deg");
              link.style.setProperty("--tilt-y", "0deg");
            }
          });
        } else {
          this.isMouseOver = false;
          this.mouseOffsetRotation = 0;
          this.items.forEach((item) => {
            const link = item.querySelector(".dh-carousel__link");
            if (!link) return;
            link.classList.remove("is-hovered");
            link.style.setProperty("--tilt-x", "0deg");
            link.style.setProperty("--tilt-y", "0deg");
          });
        }
      };

      this._hoverHandler = (ev) => {
        if (this.isMobile) return;
        this._pendingHoverEvent = ev;
        if (this._hoverRaf == null) {
          this._hoverRaf = requestAnimationFrame(() => {
            this._hoverRaf = null;
            const pending = this._pendingHoverEvent;
            if (pending) this._processHoverEvent(pending);
          });
        }
      };
      document.addEventListener("mousemove", this._hoverHandler);

      this._mqChangeHandler = () => {
        if (this._resizeHandler) this._resizeHandler();
      };
      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener("change", this._mqChangeHandler);
      } else if (this.mediaQuery.addListener) {
        this.mediaQuery.addListener(this._mqChangeHandler);
      }

      this._resizeTimer = null;
      this._resizeHandler = () => {
        clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
          const mobile = this.mediaQuery.matches;
          if (mobile !== this.isMobile) {
            this.isMobile = mobile;
            this.items.forEach((item) => {
              const link = item.querySelector(".dh-carousel__link");
              if (this.isMobile) {
                item.style.position = "";
                item.style.transform = "";
                item.style.transformStyle = "";
                item.style.zIndex = "";
                if (link) {
                  link.style.transform = "";
                  link.style.willChange = "";
                  link.style.transition = "";
                }
              } else {
                item.style.position = "absolute";
                item.style.transformStyle = "preserve-3d";
              }
            });
            this.carousel.style.transform = this.isMobile ? "none" : "";
            if (this.videos) {
              this.videos.setPrimaryIndex(
                this.isMobile ? this.currentMobileIndex : this.getFrontItemIndex()
              );
            }
          }
          setVh();
          this.updateCarousel();
          if (this.videos) this.videos.ensurePlayback();
          if (this.isMobile) {
            setTimeout(() => {
              this.scrollToCard(this.currentMobileIndex, false);
              this.updateMobileNav();
              this.updateMobileTitle();
            }, 50);
          }
          this.updateCenter();
          if (this.videos) this.videos.restartTickLoop();
        }, 120);
      };
      window.addEventListener("resize", this._resizeHandler);

      let scrollRaf = 0;
      this.container.addEventListener(
        "scroll",
        () => {
          if (!this.isMobile) return;
          cancelAnimationFrame(scrollRaf);
          scrollRaf = requestAnimationFrame(() => this.updateMobileActive());
        },
        { passive: true }
      );

      this.container.addEventListener("mouseenter", () => {
        if (!this.isMobile) {
          this.isMouseOver = true;
          this.updateCenter();
          this.videos.ensurePlayback();
        }
      });
      this.container.addEventListener("mousemove", (ev) => {
        if (!this.isMobile) this.trackMouse(ev);
      });
      this.container.addEventListener("mouseleave", () => {
        if (this.isMobile) return;
        this.isMouseOver = false;
        this.mouseOffsetRotation = 0;
        this.items.forEach((item) => {
          const link = item.querySelector(".dh-carousel__link");
          if (!link) return;
          link.classList.remove("is-hovered");
          link.style.setProperty("--tilt-x", "0deg");
          link.style.setProperty("--tilt-y", "0deg");
        });
      });

      this.items.forEach((item) => {
        const wrap = item.querySelector(".dh-carousel__video-wrap");
        if (!wrap) return;
        wrap.addEventListener("mousedown", () => {
          wrap.classList.add("is-clicking");
          setTimeout(() => wrap.classList.remove("is-clicking"), 100);
        });
      });

      this._wheelHandler = (ev) => this.onWheel(ev);
      window.addEventListener("wheel", this._wheelHandler, this._wheelListenerOpts);

      this.container.addEventListener(
        "keydown",
        (ev) => {
          if (this.isMobile) {
            if (ev.key === "ArrowLeft") {
              ev.preventDefault();
              this.goToNextMobile();
            } else if (ev.key === "ArrowRight") {
              ev.preventDefault();
              this.goToPrevMobile();
            }
          } else {
            if (ev.key === "ArrowLeft") {
              ev.preventDefault();
              this.rotateBy(-1);
            } else if (ev.key === "ArrowRight") {
              ev.preventDefault();
              this.rotateBy(1);
            }
          }
        },
        true
      );

      if (this.prevBtn) {
        this._prevClickHandler = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this.goToPrevMobile();
        };
        this.prevBtn.addEventListener("click", this._prevClickHandler);
      }
      if (this.nextBtn) {
        this._nextClickHandler = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this.goToNextMobile();
        };
        this.nextBtn.addEventListener("click", this._nextClickHandler);
      }
      if (this.deskPrevBtn) {
        this._deskPrevClickHandler = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!this.isMobile) this.rotateBy(-1);
        };
        this.deskPrevBtn.addEventListener("click", this._deskPrevClickHandler);
      }
      if (this.deskNextBtn) {
        this._deskNextClickHandler = (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          if (!this.isMobile) this.rotateBy(1);
        };
        this.deskNextBtn.addEventListener("click", this._deskNextClickHandler);
      }

      this.updateCenter();
      this.animate();
      this.updateMobileNav();
      this.updateMobileTitle();
    }

    trackMouse(ev) {
      if (this.reduceMotion) return;
      const now = performance.now();
      if (!this.lastContainerUpdate || now - this.lastContainerUpdate > 100) {
        this.updateCenter();
        this.lastContainerUpdate = now;
      }
      const bounds = this.container.getBoundingClientRect();
      const dx = ev.clientX - this.centerX;
      const dy = ev.clientY - this.centerY;
      this.mouseOffsetRotation =
        90 * Math.max(-1, Math.min(1, dx / (bounds.width / 2))) * this.mouseSensitivity;
      this.targetRotationX =
        90 * -Math.max(-1, Math.min(1, dy / (bounds.height / 2))) * this.mouseSensitivityY;
    }

    animate() {
      if (this.isMobile) {
        this.animationFrame = null;
        return;
      }
      if (this.reduceMotion) {
        this.rotation = this.baseRotation;
        this.rotationX = 0;
        this.smoothTargetRotation = this.baseRotation;
        this.smoothTargetRotationX = 0;
        this.mouseOffsetRotation = 0;
        this.updateCarousel();
        this.animationFrame = null;
        return;
      }
      const now = performance.now();
      const dt = Math.min((now - this.lastFrameTime) / 16.67, 2);
      this.lastFrameTime = now;
      if (this.isMouseOver) {
        const target = this.baseRotation + this.mouseOffsetRotation;
        this.smoothTargetRotation += (target - this.smoothTargetRotation) * (1 - Math.pow(0.85, dt));
        this.rotation += (this.smoothTargetRotation - this.rotation) * (1 - Math.pow(1 - this.followSpeed, dt));
        this.smoothTargetRotationX +=
          (this.targetRotationX - this.smoothTargetRotationX) * (1 - Math.pow(0.85, dt));
        this.rotationX +=
          (this.smoothTargetRotationX - this.rotationX) * (1 - Math.pow(1 - this.followSpeed, dt));
      } else {
        this.rotation +=
          (this.baseRotation - this.rotation) * (1 - Math.pow(1 - 2.15 * this.followSpeed, dt));
        this.smoothTargetRotation +=
          (this.baseRotation - this.smoothTargetRotation) * (1 - Math.pow(0.85, dt));
        this.smoothTargetRotationX += (0 - this.smoothTargetRotationX) * (1 - Math.pow(0.85, dt));
        this.rotationX +=
          (this.smoothTargetRotationX - this.rotationX) * (1 - Math.pow(1 - this.followSpeed, dt));
      }
      this.updateCarousel();
      this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    onWheel(ev) {
      if (!this.carousel || this.isMobile) return;
      const active = document.activeElement;
      const focusIn =
        active === this.container || active === this.deskPrevBtn || active === this.deskNextBtn;
      let inside = false;
      if (typeof ev.clientX === "number" && typeof ev.clientY === "number") {
        const r = this.container.getBoundingClientRect();
        inside =
          ev.clientY >= r.top && ev.clientY <= r.bottom && ev.clientX >= r.left && ev.clientX <= r.right;
      }
      if (!focusIn && !inside) return;
      ev.preventDefault();
      let delta;
      if (ev.deltaMode === 1) delta = this.wheelLineScale * ev.deltaY;
      else if (ev.deltaMode === 2) delta = this.wheelPageScale * ev.deltaY;
      else delta = this.wheelPixelScale * ev.deltaY;
      this.wheelAccumulator += delta;
      const th = this.wheelStepThreshold;
      let stepped = false;
      while (Math.abs(this.wheelAccumulator) >= th) {
        if (this.wheelAccumulator > 0) {
          this.baseRotation += this.angleStep;
          this.wheelAccumulator -= th;
        } else {
          this.baseRotation -= this.angleStep;
          this.wheelAccumulator += th;
        }
        stepped = true;
      }
      if (stepped) {
        this.smoothTargetRotation = this.baseRotation;
        this.carousel.style.transition = "none";
        this.items.forEach((item) => {
          const link = item.querySelector(".dh-carousel__link");
          if (link) link.style.transition = "none";
        });
        this.updateCarousel();
        this.announceFromIndex(this.getFrontItemIndex());
      }
      clearTimeout(this._wheelTimeout);
      this._wheelTimeout = setTimeout(() => {
        this.wheelAccumulator = 0;
      }, 220);
    }

    rotateBy(dir) {
      if (this.isMobile) return;
      this.wheelAccumulator = 0;
      this.baseRotation += dir * this.angleStep;
      this.updateCarousel();
      this.announceFromIndex(this.getFrontItemIndex());
    }

    getFrontItemIndex() {
      let best = 0;
      let bestAngle = Infinity;
      this.items.forEach((_, idx) => {
        let ang = ((idx * this.angleStep - this.rotation) % 360) + 360;
        ang %= 360;
        if (ang > 180) ang -= 360;
        const a = Math.abs(ang);
        if (a < bestAngle) {
          bestAngle = a;
          best = idx;
        }
      });
      return best;
    }

    updateCarousel() {
      if (!this.carousel) return;
      if (this.isMobile) {
        this.carousel.style.transform = "none";
        this.items.forEach((item) => {
          item.style.transform = "";
          item.style.zIndex = "";
          const link = item.querySelector(".dh-carousel__link");
          if (link) {
            link.style.transform = "";
            link.style.willChange = "";
          }
        });
        this.syncGroundShadowTilt();
        return;
      }
      this.carousel.style.transform = `translateZ(0) rotateX(${this.rotationX}deg) rotateY(${this.rotation}deg)`;
      this.items.forEach((item, idx) => {
        const base = idx * this.angleStep;
        let ang = ((base - this.rotation) % 360) + 360;
        ang %= 360;
        if (ang > 180) ang -= 360;
        const abs = Math.abs(ang);
        const z = abs <= 30 ? 1000 : abs <= 90 ? 750 : abs <= 150 ? 250 : 0;
        item.style.transform = `rotateY(${base}deg) translateZ(${this.radius}px)`;
        item.style.zIndex = String(z);
        const link = item.querySelector(".dh-carousel__link");
        if (link) {
          link.style.willChange = "transform";
          link.style.transformOrigin = "center center";
          link.style.transition = "transform .3s cubic-bezier(.22,.61,.36,1)";
        }
      });
      if (this.videos) {
        const front = this.getFrontItemIndex();
        if (front !== this._lastPrimaryFront) {
          this._lastPrimaryFront = front;
          this.videos.setPrimaryIndex(front);
        }
      }
      this.syncGroundShadowTilt();
    }

    destroy() {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      if (this._hoverRaf != null) {
        cancelAnimationFrame(this._hoverRaf);
        this._hoverRaf = null;
      }
      clearTimeout(this._wheelTimeout);
      clearTimeout(this._resizeTimer);
      if (this.mediaQuery.removeEventListener) {
        this.mediaQuery.removeEventListener("change", this._mqChangeHandler);
      } else if (this.mediaQuery.removeListener && this._mqChangeHandler) {
        this.mediaQuery.removeListener(this._mqChangeHandler);
      }
      if (this._hoverHandler) {
        document.removeEventListener("mousemove", this._hoverHandler);
      }
      if (this._resizeHandler) {
        window.removeEventListener("resize", this._resizeHandler);
      }
      if (this._loadHandler) {
        window.removeEventListener("load", this._loadHandler);
      }
      if (this._videoLoadKick) {
        window.removeEventListener("load", this._videoLoadKick);
        this._videoLoadKick = null;
      }
      if (this.prevBtn && this._prevClickHandler) {
        this.prevBtn.removeEventListener("click", this._prevClickHandler);
      }
      if (this.nextBtn && this._nextClickHandler) {
        this.nextBtn.removeEventListener("click", this._nextClickHandler);
      }
      if (this.deskPrevBtn && this._deskPrevClickHandler) {
        this.deskPrevBtn.removeEventListener("click", this._deskPrevClickHandler);
      }
      if (this.deskNextBtn && this._deskNextClickHandler) {
        this.deskNextBtn.removeEventListener("click", this._deskNextClickHandler);
      }
      if (this._wheelHandler) {
        window.removeEventListener("wheel", this._wheelHandler, this._wheelListenerOpts);
      }
      if (this._reduceMotionListener && this.reduceMotionMq) {
        if (this.reduceMotionMq.removeEventListener) {
          this.reduceMotionMq.removeEventListener("change", this._reduceMotionListener);
        } else if (this.reduceMotionMq.removeListener) {
          this.reduceMotionMq.removeListener(this._reduceMotionListener);
        }
      }
      if (this.videos) {
        this.videos.destroy();
      }
    }
  }

  let runner = null;
  let bootstrapAttempts = 0;
  let bootstrapping = false;

  function destroyRunner() {
    if (runner && runner.destroy) {
      runner.destroy();
    }
    runner = null;
  }

  /**
   * @param {{ href: string; src: string; titleHe: string; titleEn: string }[]} slides
   */
  function buildStageMarkup(slides) {
    return slides
      .map((slide, index) => {
        const label = `${slide.titleHe} (${slide.titleEn || "Dahari"}) — וידאו ללא שמע`;
        return (
          `<div class="dh-carousel__item" data-index="${index}" data-slide-title="${escAttr(slide.titleHe)}">` +
          `<a href="${escAttr(slide.href)}" class="dh-carousel__link dh-carousel__media" aria-label="${escAttr(label)}">` +
          `<span class="dh-carousel__card-back" aria-hidden="true"></span>` +
          EDGE_HTML +
          `<div class="dh-carousel__card-front">` +
          `<span class="dh-carousel__shine" aria-hidden="true"></span>` +
          `<div class="dh-carousel__video-wrap" aria-hidden="true">` +
          `<video class="dh-carousel__video" muted="" playsinline="" webkit-playsinline="" loop="" preload="auto" disablepictureinpicture="" data-slide-index="${index}" src="${escAttr(resolveMediaUrl(slide.src))}"></video>` +
          `</div>` +
          `<span class="dh-carousel__title" aria-hidden="true">${escHtml(slide.titleHe)}</span>` +
          `</div></a></div>`
        );
      })
      .join("");
  }

  async function bootstrap() {
    if (bootstrapping) return;
    bootstrapping = true;
    try {
      const slides = await resolveSlides();
      const carouselRoot = root.querySelector(".dh-carousel");
      if (!carouselRoot) {
        bootstrapping = false;
        if (++bootstrapAttempts < 10) {
          setTimeout(function () {
            void bootstrap();
          }, 150);
        }
        return;
      }
      const stage = carouselRoot.querySelector("[data-carousel-stage]");
      if (!stage) {
        bootstrapping = false;
        if (++bootstrapAttempts < 10) {
          setTimeout(function () {
            void bootstrap();
          }, 150);
        }
        return;
      }
      destroyRunner();
      stage.innerHTML = buildStageMarkup(slides);
      root.querySelectorAll("[data-desk-prev],[data-mobile-prev]").forEach((btn) => {
        if (!btn.firstElementChild) {
          btn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14.5 5L7.5 12L14.5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
        }
      });
      root.querySelectorAll("[data-desk-next],[data-mobile-next]").forEach((btn) => {
        if (!btn.firstElementChild) {
          btn.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9.5 5L16.5 12L9.5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
        }
      });
      let initialFront = findSlideIndexForPath(slides, window.location.pathname);
      const initialHrefAttr = root.getAttribute("data-carousel-initial-href");
      if (initialHrefAttr && String(initialHrefAttr).trim()) {
        const idx = findSlideIndexByHref(slides, String(initialHrefAttr).trim());
        if (idx >= 0) initialFront = idx;
      }
      runner = new Carousel(root, initialFront);
      if (!runner.carousel && ++bootstrapAttempts < 10) {
        bootstrapping = false;
        setTimeout(function () {
          void bootstrap();
        }, 400);
        return;
      }
      bootstrapAttempts = 0;
      bootstrapping = false;
    } catch (err) {
      bootstrapping = false;
      if (++bootstrapAttempts < 10) {
        setTimeout(function () {
          void bootstrap();
        }, 400);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      function () {
        void bootstrap();
      },
      { once: true }
    );
  } else {
    setTimeout(function () {
      void bootstrap();
    }, 150);
  }

  window.addEventListener("pageshow", function (ev) {
    setVh();
    if (ev.persisted) {
      destroyRunner();
      setVh();
      root.querySelectorAll(".dh-carousel__link").forEach((link) => {
        link.classList.remove("is-hovered");
        link.style.removeProperty("--tilt-x");
        link.style.removeProperty("--tilt-y");
        link.style.removeProperty("--shine-x");
        link.style.removeProperty("--shine-y");
      });
      root.querySelectorAll(".dh-carousel__video-wrap").forEach((wrap) => {
        wrap.classList.remove("is-clicking");
      });
      setTimeout(function () {
        void bootstrap();
      }, 60);
    } else if (runner) {
      setTimeout(function () {
        if (runner && runner.videos) runner.videos.ensurePlayback();
      }, 120);
    } else {
      setTimeout(function () {
        void bootstrap();
      }, 60);
    }
  });

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) {
      setVh();
      if (runner && runner.videos) {
        setTimeout(function () {
          runner.videos.ensurePlayback();
        }, 120);
      }
    }
  });

  window.addEventListener("beforeunload", destroyRunner);
})();
