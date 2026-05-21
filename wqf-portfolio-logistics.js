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
        const raw = splitEl.textContent.trim();
        const words = raw.split(/\s+/);
        splitEl.textContent = "";

        words.forEach(function (word, i) {
          const wrap = document.createElement("span");
          wrap.className = "wqf-word-wrap";

          const outer = document.createElement("span");
          outer.className = "wqf-word";

          const inner = document.createElement("span");
          inner.className = "wqf-word-inner";
          inner.textContent = word + (i < words.length - 1 ? "\u00a0" : "");

          outer.appendChild(inner);
          wrap.appendChild(outer);
          splitEl.appendChild(wrap);
        });

        const inners = splitEl.querySelectorAll(".wqf-word-inner");
        gsap.from(inners, {
          yPercent: 110,
          duration: 1.4,
          stagger: 0.08,
          ease: "expo.out",
          scrollTrigger: {
            trigger: splitEl,
            start: "top 70%",
          },
          onComplete: function () {
            ScrollTrigger.refresh();
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

    const mqDesktop = window.matchMedia("(min-width: 768px)");
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
              applyWrapperHeightLock(s);
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
          applyWrapperHeightLock(root._wqfSwiper);
        }
      } else {
        root.classList.add("wqf-portfolio--mobile-stack");
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
      if (root._wqfSwiper) applyWrapperHeightLock(root._wqfSwiper);
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
