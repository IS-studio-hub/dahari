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
    { href: "offices.html", src: "assets/Homepagevids/office.mp4", titleHe: "פרוייקטים בהקמה", titleEn: "Under construction" },
    { href: "residences.html", src: "assets/Homepagevids/residences.mp4", titleHe: "התחדשות עירונית", titleEn: "Urban renewal" },
    { href: "commerce.html", src: "assets/Homepagevids/commercial.mp4", titleHe: "נדל״ן מסחרי", titleEn: "Commercial" },
    { href: "about.html", src: "assets/Homepagevids/%D7%90%D7%95%D7%93%D7%95%D7%AA%20V3.mp4", titleHe: "אודות", titleEn: "About" },
    { href: "contact.html", src: "assets/Homepagevids/contact.mp4", titleHe: "יצירת קשר", titleEn: "Contact" },
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
      const res = await fetch(slidesUrl, { cache: "force-cache" });
      if (res.ok) {
        const parsed = await res.json();
        const norm = normalizeSlides(parsed);
        if (norm) return norm;
      }
    } catch (e) {
      /* file:// or missing file - use defaults */
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
      /** After first user-driven card change, attach/play immediately (no idle defer). */
      this._userNavigated = false;
      /** @type {Map<string, string>} remote URL → object URL */
      this._blobByRemote = new Map();
      /** @type {Set<string>} */
      this._blobFetching = new Set();
      /** @type {Map<HTMLVideoElement, string>} element → object URL currently attached */
      this._blobUrls = new Map();
    }

    /**
     * Residences + contact hitch on native HTML loop on desktop; use dual-layer swap.
     * @param {HTMLVideoElement} el
     */
    needsSeamless(el) {
      if (!el) return false;
      if (el.dataset.dhSeamless === "1") return true;
      const remote =
        el.getAttribute("data-remote-src") ||
        el.getAttribute("data-src") ||
        el.getAttribute("src") ||
        "";
      return /(?:^|[\\/])(residences|contact)\.mp4(?:$|\?)/i.test(remote);
    }

    /**
     * @param {{ el: HTMLVideoElement, twin?: HTMLVideoElement|null, active?: HTMLVideoElement }} item
     * @returns {HTMLVideoElement[]}
     */
    pairOf(item) {
      if (!item) return [];
      return item.twin ? [item.el, item.twin] : [item.el];
    }

    /**
     * @param {HTMLVideoElement} el
     */
    applyLoopAttrs(el) {
      if (!el) return;
      el.muted = true;
      el.defaultMuted = true;
      if (this.needsSeamless(el)) {
        el.loop = false;
        el.removeAttribute("loop");
        el.dataset.dhSeamless = "1";
      } else {
        el.loop = true;
        el.setAttribute("loop", "");
      }
    }

    /**
     * Create a standby twin so we can swap layers before EOF (no seek hitch).
     * @param {{ el: HTMLVideoElement, twin?: HTMLVideoElement|null, active?: HTMLVideoElement, _swapping?: boolean }} item
     */
    ensureSeamlessTwin(item) {
      if (!item || !item.el || item.twin || !this.needsSeamless(item.el)) return;
      const wrap = item.el.closest(".dh-carousel__video-wrap") || item.el.parentElement;
      if (!wrap) return;
      const twin = /** @type {HTMLVideoElement} */ (item.el.cloneNode(false));
      twin.removeAttribute("id");
      twin.classList.add("dh-carousel__video--twin");
      twin.classList.add("is-layer-standby");
      twin.classList.remove("is-layer-active");
      twin.muted = true;
      twin.defaultMuted = true;
      twin.playsInline = true;
      twin.loop = false;
      twin.removeAttribute("loop");
      twin.preload = "auto";
      twin.dataset.dhSeamless = "1";
      twin.setAttribute("aria-hidden", "true");
      wrap.appendChild(twin);
      item.twin = twin;
      item.active = item.el;
      item.el.classList.add("is-layer-active");
      item.el.classList.remove("is-layer-standby");
      item.el.loop = false;
      item.el.removeAttribute("loop");
      item.el.dataset.dhSeamless = "1";

      const onNearEnd = (vid) => {
        if (item.active !== vid || item._swapping) return;
        const d = vid.duration;
        if (!d || !isFinite(d) || d < 0.5 || vid.paused) return;
        // Swap ~4 frames early so the outgoing layer never hits ended/waiting.
        if (vid.currentTime < d - 0.16) return;
        this.swapSeamless(item);
      };
      item.el.addEventListener("timeupdate", () => onNearEnd(item.el));
      twin.addEventListener("timeupdate", () => onNearEnd(twin));
      // Keep standby warm at t≈0 whenever the active clip is playing.
      item.el.addEventListener("playing", () => this.primeStandby(item));
      twin.addEventListener("playing", () => this.primeStandby(item));
    }

    /**
     * @param {{ el: HTMLVideoElement, twin?: HTMLVideoElement|null, active?: HTMLVideoElement }} item
     */
    primeStandby(item) {
      if (!item || !item.twin || !item.active) return;
      const standby = item.active === item.el ? item.twin : item.el;
      const active = item.active;
      const src = active.currentSrc || active.getAttribute("src") || "";
      if (!src) return;
      if ((standby.currentSrc || standby.getAttribute("src") || "") !== src) {
        standby.src = src;
        standby.dataset.dhBlob = active.dataset.dhBlob || "0";
        try {
          standby.load();
        } catch (e) {}
      }
      try {
        if (standby.currentTime > 0.05) standby.currentTime = 0.001;
      } catch (e) {}
      // Decode first frame without showing/playing over the active layer.
      if (standby.paused && standby.readyState < 2) {
        void standby.play().then(() => {
          if (item.active !== standby) {
            try {
              standby.pause();
              standby.currentTime = 0.001;
            } catch (e) {}
          }
        }).catch(() => {});
      }
    }

    /**
     * Instant layer swap — visible clip is never seeked at the loop point.
     * @param {{ el: HTMLVideoElement, twin?: HTMLVideoElement|null, active?: HTMLVideoElement, _swapping?: boolean }} item
     */
    swapSeamless(item) {
      if (!item || !item.twin || item._swapping) return;
      const from = item.active || item.el;
      const to = from === item.el ? item.twin : item.el;
      item._swapping = true;
      const src = from.currentSrc || from.getAttribute("src") || "";
      if (src && (to.currentSrc || to.getAttribute("src") || "") !== src) {
        to.src = src;
        to.dataset.dhBlob = from.dataset.dhBlob || "0";
      }
      try {
        to.currentTime = 0.001;
      } catch (e) {}
      to.muted = true;
      void to.play().catch(() => {});
      to.classList.add("is-layer-active");
      to.classList.remove("is-layer-standby");
      from.classList.add("is-layer-standby");
      from.classList.remove("is-layer-active");
      item.active = to;
      window.requestAnimationFrame(() => {
        try {
          from.pause();
          from.currentTime = 0.001;
        } catch (e) {}
        item._swapping = false;
      });
    }

    /**
     * Browsers often reject play() until there is enough buffered data (and may ignore
     * the autoplay attribute when many videos exist). Retry on readiness and briefly after.
     * @param {HTMLVideoElement} el
     */
    primePlay(el) {
      if (!el) return;
      this.applyLoopAttrs(el);
      const item = this.items.find((it) => it.el === el || it.twin === el);
      if (item) this.ensureSeamlessTwin(item);
      const target = item && item.active ? item.active : el;
      this.applyLoopAttrs(target);
      const run = () => {
        if (target.ended) {
          try {
            target.currentTime = 0.001;
          } catch (e) {}
        }
        void target.play().catch(() => {});
        if (item) this.primeStandby(item);
      };
      run();
      if (target.readyState < 2) {
        const evts = ["loadedmetadata", "loadeddata", "canplay", "canplaythrough"];
        for (let e = 0; e < evts.length; e++) {
          target.addEventListener(evts[e], run, { once: true });
        }
      }
      window.setTimeout(run, 60);
      window.setTimeout(run, 180);
      window.setTimeout(run, 520);
      window.setTimeout(run, 1200);
    }

    /**
     * Prefetch a remote MP4 into memory. Does not touch the <video> until ensureSrc/applyBlob.
     * @param {string} remote
     * @returns {Promise<string|null>} object URL
     */
    prefetchBlob(remote) {
      const url = String(remote || "").trim();
      if (!url || url.startsWith("blob:")) return Promise.resolve(null);
      if (this._blobByRemote.has(url)) return Promise.resolve(this._blobByRemote.get(url) || null);
      if (this._blobFetching.has(url)) {
        return new Promise((resolve) => {
          const start = performance.now();
          const tick = () => {
            if (this._blobByRemote.has(url)) {
              resolve(this._blobByRemote.get(url) || null);
              return;
            }
            if (performance.now() - start > 12000) {
              resolve(null);
              return;
            }
            window.setTimeout(tick, 80);
          };
          tick();
        });
      }
      this._blobFetching.add(url);
      return fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error("fetch failed");
          return res.blob();
        })
        .then((blob) => {
          const obj = URL.createObjectURL(blob);
          this._blobByRemote.set(url, obj);
          this._blobFetching.delete(url);
          return obj;
        })
        .catch(() => {
          this._blobFetching.delete(url);
          return null;
        });
    }

    /**
     * If a memory blob is ready for this element, point src at it (seamless native loop).
     * @param {HTMLVideoElement} el
     */
    applyBlobIfReady(el) {
      if (!el || el.dataset.dhBlob === "1") return false;
      const remote =
        el.getAttribute("data-remote-src") ||
        el.getAttribute("data-src") ||
        (!String(el.currentSrc || el.src || "").startsWith("blob:")
          ? el.currentSrc || el.getAttribute("src") || ""
          : "");
      if (!remote || !this._blobByRemote.has(remote)) return false;
      const obj = this._blobByRemote.get(remote);
      if (!obj) return false;
      const item = this.items.find((it) => it.el === el || it.twin === el);
      const wasPlaying = item
        ? !!(item.active && !item.active.paused)
        : !el.paused;
      const t = (item && item.active ? item.active.currentTime : el.currentTime) || 0;
      const targets = item ? this.pairOf(item) : [el];
      targets.forEach((node) => {
        node.setAttribute("data-remote-src", remote);
        this.applyLoopAttrs(node);
        node.src = obj;
        node.removeAttribute("data-src");
        node.dataset.dhBlob = "1";
        this._blobUrls.set(node, obj);
        try {
          node.load();
        } catch (e) {}
      });
      if (item) this.ensureSeamlessTwin(item);
      const active = item && item.active ? item.active : el;
      const resume = () => {
        try {
          if (t > 0.05 && t < (active.duration || Infinity) - 0.25) active.currentTime = t;
        } catch (e) {}
        if (wasPlaying) this.primePlay(item ? item.el : el);
        if (item) this.primeStandby(item);
      };
      active.addEventListener("loadeddata", resume, { once: true });
      window.setTimeout(resume, 40);
      return true;
    }

    /**
     * Prefetch all carousel clips (desktop needs neighbors looping smoothly too).
     */
    prefetchAllBlobs() {
      this.items.forEach(({ el }) => {
        const remote = el.getAttribute("data-src") || el.getAttribute("data-remote-src");
        if (!remote) return;
        void this.prefetchBlob(remote).then((obj) => {
          if (!obj) return;
          // Apply when this clip is already attached / active.
          const idx = parseInt(el.getAttribute("data-slide-index") || "-1", 10);
          const n = this.items.length;
          const i = this._primary;
          const mobile = !!(this.c && this.c.isMobile);
          const near = mobile
            ? idx === i
            : idx === i || idx === (i - 1 + n) % n || idx === (i + 1) % n;
          if (near) {
            this.applyBlobIfReady(el);
            this.primePlay(el);
          }
        });
      });
    }

    init() {
      const els = Array.from(
        this.root.querySelectorAll("video.dh-carousel__video:not(.dh-carousel__video--twin)")
      );
      this.items = els.map((el) => ({ el, twin: null, active: el, _swapping: false }));
      this.items.forEach((item, idx) => {
        const el = item.el;
        el.muted = true;
        el.defaultMuted = true;
        el.playsInline = true;
        el.setAttribute("playsinline", "");
        el.setAttribute("webkit-playsinline", "");
        this.applyLoopAttrs(el);
        el.preload = "none";
        el.disablePictureInPicture = true;
        el.setAttribute("disablepictureinpicture", "");
        el.setAttribute("data-slide-index", String(idx));
        if (this.needsSeamless(el)) {
          // Twin swap handles looping — avoid native ended/seek hitch.
          el.addEventListener("ended", () => {
            if (item.twin) this.swapSeamless(item);
            else {
              try {
                el.currentTime = 0.001;
              } catch (e) {}
              void el.play().catch(() => {});
            }
          });
        } else {
          // Memory-buffered clips: wrap a few frames before EOF.
          let wrapping = false;
          el.addEventListener("timeupdate", () => {
            if (el.dataset.dhBlob !== "1" || wrapping) return;
            const d = el.duration;
            if (!d || !isFinite(d) || d < 0.5 || el.paused) return;
            if (el.currentTime < d - 0.1) return;
            wrapping = true;
            try {
              el.currentTime = 0.001;
            } catch (e) {}
            if (el.paused) void el.play().catch(() => {});
            window.setTimeout(() => {
              wrapping = false;
            }, 120);
          });
          el.addEventListener("ended", () => {
            el.loop = true;
            try {
              el.currentTime = 0.001;
            } catch (e) {}
            const kick = () => void el.play().catch(() => {});
            el.addEventListener("seeked", kick, { once: true });
            kick();
            window.setTimeout(kick, 60);
            window.setTimeout(kick, 200);
          });
        }
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
      // Desktop shows side cards; prefetch all short clips so neighbor loops stay smooth.
      window.setTimeout(() => this.prefetchAllBlobs(), 200);
      if (typeof window.requestIdleCallback === "function") {
        window.requestIdleCallback(() => this.prefetchAllBlobs(), { timeout: 2500 });
      }

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
      };
      document.addEventListener("touchend", this._docUnlock, { capture: true, passive: true, once: true });
      document.addEventListener("click", this._docUnlock, { capture: true, passive: true, once: true });
    }

    /**
     * Attach src from data-src only when the clip is needed (cuts initial payload).
     * @param {HTMLVideoElement} el
     */
    ensureSrc(el) {
      if (!el) return;
      if (el.getAttribute("src") && el.dataset.dhBlob === "1") {
        const item = this.items.find((it) => it.el === el || it.twin === el);
        if (item) {
          this.ensureSeamlessTwin(item);
          this.primeStandby(item);
        }
        return;
      }
      const pending =
        el.getAttribute("data-src") ||
        el.getAttribute("data-remote-src") ||
        (!String(el.currentSrc || "").startsWith("blob:") ? el.getAttribute("src") : "");
      if (!pending && el.getAttribute("src")) return;
      if (!pending) return;
      el.setAttribute("data-remote-src", pending);
      this.applyLoopAttrs(el);
      el.muted = true;
      el.defaultMuted = true;
      el.setAttribute("muted", "");
      el.setAttribute("autoplay", "");
      el.playsInline = true;
      el.setAttribute("playsinline", "");
      el.setAttribute("webkit-playsinline", "");
      const blobUrl = this._blobByRemote.get(pending);
      if (blobUrl) {
        el.src = blobUrl;
        el.dataset.dhBlob = "1";
        this._blobUrls.set(el, blobUrl);
      } else if (!el.getAttribute("src")) {
        el.src = pending;
        el.dataset.dhBlob = el.dataset.dhBlob || "0";
        // Kick prefetch so the next loop / revisit uses memory.
        void this.prefetchBlob(pending).then(() => {
          if (this.applyBlobIfReady(el)) this.primePlay(el);
        });
      } else {
        // Already streaming from network — upgrade to blob when ready (desktop neighbors).
        void this.prefetchBlob(pending).then(() => {
          if (this.applyBlobIfReady(el)) this.primePlay(el);
        });
        return;
      }
      el.removeAttribute("data-src");
      try {
        el.load();
      } catch (e) {}
      const item = this.items.find((it) => it.el === el || it.twin === el);
      if (item) {
        this.ensureSeamlessTwin(item);
        this.primeStandby(item);
      }
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
     * Load + play the front card (and nearest neighbors on desktop). Pause the rest.
     * @param {number} index
     * @param {{ fromUser?: boolean }} [opts]
     */
    setPrimaryIndex(index, opts) {
      if (!this.items.length) return;
      const n = this.items.length;
      const i = Math.max(0, Math.min(index | 0, n - 1));
      const fromUser = !!(opts && opts.fromUser);
      if (fromUser) this._userNavigated = true;
      this._primary = i;

      const mobile = !!(this.c && this.c.isMobile);
      const near = mobile
        ? new Set([i])
        : new Set([i, (i - 1 + n) % n, (i + 1) % n]);

      this.items.forEach((item, idx) => {
        const el = item.el;
        if (near.has(idx)) {
          const attach = () => {
            this.ensureSrc(el);
            this.ensureSeamlessTwin(item);
            this.pairOf(item).forEach((node) => {
              node.preload = "auto";
            });
            this.primePlay(el);
            this.applyBlobIfReady(el);
          };
          // First paint only: briefly defer the initial mobile LCP card.
          // After the user scrolls/rotates, attach + play immediately.
          const deferInitial =
            mobile &&
            idx === i &&
            !el.getAttribute("src") &&
            !this._userNavigated &&
            !fromUser;
          if (deferInitial) {
            el.preload = "none";
            if (typeof window.requestIdleCallback === "function") {
              window.requestIdleCallback(attach, { timeout: 900 });
            } else {
              window.setTimeout(attach, 220);
            }
          } else {
            attach();
          }
        } else {
          this.pairOf(item).forEach((node) => {
            node.preload = "none";
            try {
              node.pause();
            } catch (e) {}
          });
        }
      });

      requestAnimationFrame(() => {
        this.items.forEach((item, idx) => {
          if (!near.has(idx)) return;
          if (!item.el.getAttribute("src")) this.ensureSrc(item.el);
          if (item.el.error) {
            try {
              item.el.load();
            } catch (e) {}
          }
          this.primePlay(item.el);
        });
        this.ensurePlayback();
      });
      // Extra kick after decode starts (esp. after scroll-to-card).
      window.setTimeout(() => this.ensurePlayback(), 160);
      window.setTimeout(() => this.ensurePlayback(), 480);
    }

    ensurePlayback() {
      if (!this.items.length) return;
      const n = this.items.length;
      const i = this._primary;
      const mobile = !!(this.c && this.c.isMobile);
      const near = mobile
        ? new Set([i])
        : new Set([i, (i - 1 + n) % n, (i + 1) % n]);
      this.items.forEach((item, idx) => {
        const el = item.el;
        if (!near.has(idx)) {
          this.pairOf(item).forEach((node) => {
            if (!node.paused) {
              try {
                node.pause();
              } catch (e) {}
            }
          });
          return;
        }
        if (!el.getAttribute("src")) {
          // Always attach the active/near clip so scroll-to-card can autoplay.
          this.ensureSrc(el);
        }
        this.ensureSeamlessTwin(item);
        const active = item.active || el;
        active.muted = true;
        active.defaultMuted = true;
        this.applyLoopAttrs(active);
        active.setAttribute("autoplay", "");
        if (active.ended) {
          try {
            active.currentTime = 0.001;
          } catch (e) {}
        }
        if (!active.paused && !active.ended) {
          this.primeStandby(item);
          return;
        }
        this.primePlay(el);
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
      this.items.forEach((item) => {
        this.pairOf(item).forEach((el) => {
          try {
            el.pause();
          } catch (e) {}
        });
      });
      if (this._blobUrls) {
        this._blobUrls.clear();
      }
      if (this._blobByRemote) {
        this._blobByRemote.forEach((url) => {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {}
        });
        this._blobByRemote.clear();
      }
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
      if (this.videos) {
        if (prevIndex !== best) {
          this.videos.setPrimaryIndex(best, { fromUser: true });
        } else {
          this.videos.ensurePlayback();
        }
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
      this.container.addEventListener(
        "scrollend",
        () => {
          if (!this.isMobile) return;
          this.updateMobileActive();
          if (this.videos) this.videos.ensurePlayback();
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
          this.videos.setPrimaryIndex(front, { fromUser: true });
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
  function posterForVideoSrc(src) {
    const s = String(src || "");
    const clean = s.split("?")[0];
    const file = clean.split("/").pop() || "";
    if (!file.toLowerCase().endsWith(".mp4")) return "";
    const base = file.replace(/\.mp4$/i, "");
    try {
      return new URL(
        "assets/Homepagevids/posters/" + decodeURIComponent(base) + ".webp",
        getAssetBaseHref()
      ).href;
    } catch (e) {
      return "assets/Homepagevids/posters/" + base + ".webp";
    }
  }

  function buildStageMarkup(slides) {
    return slides
      .map((slide, index) => {
        const label = `${slide.titleHe} (${slide.titleEn || "Dahari"}) - וידאו ללא שמע`;
        const mediaUrl = resolveMediaUrl(slide.src);
        const posterUrl = posterForVideoSrc(slide.src);
        const posterAttr = posterUrl ? ` poster="${escAttr(posterUrl)}"` : "";
        return (
          `<div class="dh-carousel__item" data-index="${index}" data-slide-title="${escAttr(slide.titleHe)}">` +
          `<a href="${escAttr(slide.href)}" class="dh-carousel__link dh-carousel__media" aria-label="${escAttr(label)}">` +
          `<span class="dh-carousel__card-back" aria-hidden="true"></span>` +
          EDGE_HTML +
          `<div class="dh-carousel__card-front">` +
          `<span class="dh-carousel__shine" aria-hidden="true"></span>` +
          `<div class="dh-carousel__video-wrap" aria-hidden="true">` +
          `<video class="dh-carousel__video" muted="" autoplay="" playsinline="" webkit-playsinline="" loop="" preload="none" disablepictureinpicture="" data-slide-index="${index}" data-src="${escAttr(mediaUrl)}"${posterAttr}></video>` +
          `</div>` +
          `<span class="dh-carousel__title" aria-hidden="true">${escHtml(slide.titleHe)}</span>` +
          `</div></a></div>`
        );
      })
      .join("");
  }

  function mountCarousel(slides) {
    const carouselRoot = root.querySelector(".dh-carousel");
    if (!carouselRoot) return false;
    const stage = carouselRoot.querySelector("[data-carousel-stage]");
    if (!stage) return false;
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
    return !!(runner && runner.carousel);
  }

  async function bootstrap() {
    if (bootstrapping) return;
    bootstrapping = true;
    try {
      // Paint immediately with defaults (critical for mobile LCP) - JSON can refine later.
      if (!mountCarousel(DEFAULT_SLIDES)) {
        bootstrapping = false;
        if (++bootstrapAttempts < 10) {
          setTimeout(function () {
            void bootstrap();
          }, 150);
        }
        return;
      }
      bootstrapAttempts = 0;
      bootstrapping = false;

      try {
        const remote = await resolveSlides();
        if (
          remote &&
          remote.length &&
          JSON.stringify(remote) !== JSON.stringify(DEFAULT_SLIDES)
        ) {
          mountCarousel(remote);
        }
      } catch (e) {
        /* keep defaults */
      }
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
