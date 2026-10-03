(function () {
  function initWQFPortfolioGsap(root) {
    if (root.dataset.wqfGsap === "1") return;
    root.dataset.wqfGsap = "1";

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);

      const portfolio = root.querySelector("#portfolio");
      if (portfolio) {
        gsap.from(portfolio, {
          opacity: 0,
          y: 80,
          duration: 1.2,
          ease: "power4.inOut",
          scrollTrigger: {
            trigger: root.querySelector(".wqf-section"),
            start: "top 60%",
          },
        });
      }

      const splitEl = root.querySelector(".js-split-reveal");
      if (splitEl && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const sourceNodes = Array.from(splitEl.childNodes);
        const ariaText = splitEl.textContent.trim().replace(/\s+/g, " ");
        splitEl.textContent = "";
        splitEl.setAttribute("aria-label", ariaText);
        splitEl.setAttribute("role", "text");

        const inners = [];

        sourceNodes.forEach(function (node) {
          if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent.trim();
            if (!text) return;

            Array.from(text).forEach(function (char) {
              const wrap = document.createElement("span");
              wrap.className = "wqf-word-wrap";
              wrap.setAttribute("aria-hidden", "true");

              const outer = document.createElement("span");
              outer.className = "wqf-word";

              const inner = document.createElement("span");
              inner.className = "wqf-word-inner";
              inner.textContent = char === " " ? "\u00a0" : char;

              outer.appendChild(inner);
              wrap.appendChild(outer);
              splitEl.appendChild(wrap);
              inners.push(inner);
            });
            return;
          }

          if (node.nodeName === "BR") {
            splitEl.appendChild(document.createElement("br"));
          }
        });

        gsap.from(inners, {
          yPercent: -120,
          opacity: 0,
          duration: 0.55,
          stagger: 0.035,
          ease: "power3.out",
          delay: 0.15,
          onComplete: function () {
            splitEl.classList.add("wqf-split-reveal--settled");
            inners.forEach(function (inner, i) {
              gsap.to(inner, {
                y: gsap.utils.random(1.2, 2.4),
                duration: gsap.utils.random(2.4, 3.6),
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
                delay: i * 0.028,
              });
            });
          },
        });
      }
    }
  }

  function initWQFPortfolioSlider(root) {
    if (root.dataset.wqfSliderSetup === "1") return;
    root.dataset.wqfSliderSetup = "1";

    const sliderEl = root.querySelector(".js-wqf-slider");
    const prevBtn = root.querySelector(".js-wqf-prev");
    const nextBtn = root.querySelector(".js-wqf-next");
    const currentEl = root.querySelector(".js-wqf-current");

    if (!sliderEl || !window.Swiper) return;

    const pad = function (num) {
      return String(num).padStart(2, "0");
    };

    /* Slider needs room for heading + card + arrows; shorter windows (e.g. 175–200% zoom) get the stacked grid */
    const mqDesktop = window.matchMedia("(min-width: 900px) and (min-height: 560px)");
    const MIN_FIT = 0.6;
    const isRtl = document.documentElement.getAttribute("dir") === "rtl";

    function clearWrapperHeightLock() {
      root._wqfWrapperMinLock = 0;
      const wrapper = sliderEl.querySelector(".swiper-wrapper");
      if (wrapper) wrapper.style.minHeight = "";
    }

    /** Keeps .swiper-wrapper height stable so nav arrows do not shift when slide widths/heights change. */
    function applyWrapperHeightLock(swiperInstance) {
      if (!mqDesktop.matches || !swiperInstance) return;
      const wrapper = sliderEl.querySelector(".swiper-wrapper");
      if (!wrapper) return;

      function run() {
        var maxH = 0;
        sliderEl.querySelectorAll(".swiper-slide").forEach(function (slide) {
          maxH = Math.max(maxH, slide.offsetHeight);
        });
        if (!maxH) return;
        root._wqfWrapperMinLock = Math.max(root._wqfWrapperMinLock || 0, maxH);
        wrapper.style.minHeight = root._wqfWrapperMinLock + "px";
      }

      requestAnimationFrame(function () {
        requestAnimationFrame(run);
      });
    }

    /**
     * Short windows: the content column scrolls (index-layout.css), so a vertical wheel must scroll it.
     * Only lock the slider to horizontal wheel/trackpad gestures while the column actually overflows.
     */
    function syncWheelAxis(swiperInstance) {
      if (!swiperInstance || !swiperInstance.params || !swiperInstance.params.mousewheel) return;
      const scroller = root.closest(".dh-side-header888__content888");
      swiperInstance.params.mousewheel.forceToAxis =
        !!scroller && scroller.scrollHeight > scroller.clientHeight + 1;
    }

    /**
     * Short windows / browser zoom: shrink every card as a whole (width, photo and card text together, so it
     * stays a scaled copy of the 100% card) until heading + cards + arrows fit. CSS reads --wqf-fit.
     */
    function fitSliderToHeight(swiperInstance) {
      const scroller = root.closest(".dh-side-header888__content888");
      if (!swiperInstance || !scroller) return;

      root.classList.add("wqf-fitting");
      root.style.setProperty("--wqf-fit", "1");
      clearWrapperHeightLock();
      swiperInstance.update();

      /* Height of the tallest card when it is the active one (longer texts), so navigating never overflows */
      function tallestActiveCard() {
        let tallest = 0;
        sliderEl.querySelectorAll(".swiper-slide").forEach(function (slide) {
          const wasActive = slide.classList.contains("swiper-slide-active");
          if (!wasActive) slide.classList.add("swiper-slide-active");
          const card = slide.querySelector(".wqf-slide-card");
          if (card) tallest = Math.max(tallest, card.offsetHeight);
          if (!wasActive) slide.classList.remove("swiper-slide-active");
        });
        return tallest;
      }

      const section = root.querySelector(".wqf-section") || root;
      let fit = 1;
      for (let i = 0; i < 5 && fit > MIN_FIT; i++) {
        const card =
          sliderEl.querySelector(".swiper-slide-active .wqf-slide-card") || sliderEl.querySelector(".wqf-slide-card");
        const cardH = card ? card.offsetHeight : 0;
        if (!cardH) break;
        // Signed: negative = spare room (scrollHeight can't show that), plus headroom for the tallest card
        const contentBottom =
          section.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top + scroller.scrollTop;
        const over = contentBottom - scroller.clientHeight + Math.max(0, tallestActiveCard() - cardH);
        if (over <= 0) break;
        // The whole card scales with --wqf-fit; re-measure in case rounding leaves a few px over
        fit = Math.max(MIN_FIT, (fit * Math.max(0, cardH - over - 8)) / cardH);
        root.style.setProperty("--wqf-fit", fit.toFixed(4));
        swiperInstance.update();
      }

      void root.offsetWidth;
      root.classList.remove("wqf-fitting");
    }

    function updateNav(swiperInstance) {
      if (currentEl) currentEl.textContent = pad(swiperInstance.activeIndex + 1);
      if (prevBtn) prevBtn.disabled = swiperInstance.isBeginning;
      if (nextBtn) nextBtn.disabled = swiperInstance.isEnd;
    }

    function swiperOptions() {
      const slideEls = sliderEl.querySelectorAll(".swiper-slide");
      const slideCount = slideEls.length;
      const initialSlide = slideCount > 1 ? Math.floor((slideCount - 1) / 2) : 0;

      return {
        rtl: isRtl,
        centeredSlides: true,
        initialSlide: initialSlide,
        slidesPerView: "auto",
        speed: 500,
        slideToClickedSlide: true,
        observer: true,
        observeParents: true,
        keyboard: {
          enabled: true,
          onlyInViewport: true,
        },
        mousewheel: {
          enabled: true,
          forceToAxis: false,
          releaseOnEdges: true,
          sensitivity: 1,
        },
        breakpoints: {
          0: {
            longSwipesRatio: 0.15,
            longSwipesMs: 250,
            threshold: 3,
            resistanceRatio: 0.5,
            touchRatio: 1.2,
          },
          768: {
            longSwipesRatio: 0.15,
            longSwipesMs: 250,
            threshold: 3,
            resistanceRatio: 0.2,
            touchRatio: 1.1,
          },
        },
        on: {
          afterInit: function (s) {
            requestAnimationFrame(function () {
              s.update();
              fitSliderToHeight(s);
              applyWrapperHeightLock(s);
              requestAnimationFrame(function () {
                syncWheelAxis(s);
              });
            });
            updateNav(s);
          },
          slideChange: function (s) {
            updateNav(s);
          },
          transitionEnd: function (s) {
            requestAnimationFrame(function () {
              s.update();
              applyWrapperHeightLock(s);
            });
          },
        },
      };
    }

    function setupSliderMode() {
      const desktop = mqDesktop.matches;

      if (desktop) {
        root.classList.remove("wqf-portfolio--mobile-stack");
        if (!root._wqfSwiper) {
          root._wqfSwiper = new Swiper(sliderEl, swiperOptions());
        } else {
          root._wqfSwiper.enable();
          root._wqfSwiper.update();
          updateNav(root._wqfSwiper);
          fitSliderToHeight(root._wqfSwiper);
          applyWrapperHeightLock(root._wqfSwiper);
        }
      } else {
        root.classList.add("wqf-portfolio--mobile-stack");
        root.style.removeProperty("--wqf-fit");
        clearWrapperHeightLock();
        if (root._wqfSwiper) {
          root._wqfSwiper.destroy(true, true);
          root._wqfSwiper = null;
        }
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        if (root._wqfSwiper) root._wqfSwiper.slidePrev();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        if (root._wqfSwiper) root._wqfSwiper.slideNext();
      });
    }

    setupSliderMode();

    window.addEventListener("load", function () {
      if (root._wqfSwiper) {
        fitSliderToHeight(root._wqfSwiper);
        applyWrapperHeightLock(root._wqfSwiper);
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            syncWheelAxis(root._wqfSwiper);
          });
        });
      }
    });

    mqDesktop.addEventListener("change", setupSliderMode);

    let resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        clearWrapperHeightLock();
        setupSliderMode();
        if (mqDesktop.matches && root._wqfSwiper) {
          applyWrapperHeightLock(root._wqfSwiper);
          syncWheelAxis(root._wqfSwiper);
        }
      }, 150);
    });
  }

  function initWQFPortfolio() {
    const root = document.querySelector("#wqf-portfolio-root");
    if (!root) return;
    initWQFPortfolioGsap(root);
    initWQFPortfolioSlider(root);
    initWQFPortfolioCardLinks(root);
  }

  function initWQFPortfolioCardLinks(root) {
    if (root.dataset.wqfCardLinks === "1") return;
    root.dataset.wqfCardLinks = "1";

    function isCardClickable(card) {
      if (!card) return false;
      if (root.classList.contains("wqf-portfolio--mobile-stack")) return true;
      const slide = card.closest(".wqf-slide");
      return !!(slide && slide.classList.contains("swiper-slide-active"));
    }

    root.addEventListener("click", function (ev) {
      if (ev.defaultPrevented) return;
      if (ev.target.closest(".wqf-btn")) return;
      if (ev.target.closest(".wqf-area-tag")) return;

      const card = ev.target.closest(".wqf-slide-card");
      if (!card || !root.contains(card)) return;
      if (!isCardClickable(card)) return;

      const link = card.querySelector(".wqf-btn[href]");
      if (!link) return;

      var href = link.getAttribute("href") || "";
      var target = link.getAttribute("target");
      if (target === "_parent" && window.top && window.top !== window) {
        try {
          window.top.location.href = new URL(href, window.location.href).href;
        } catch (err) {
          link.click();
        }
        return;
      }

      link.click();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWQFPortfolio);
  } else {
    initWQFPortfolio();
  }
})();
