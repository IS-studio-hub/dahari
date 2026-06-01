(() => {
  "use strict";

  const arrowIcon = `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M8.47 12 15.53 4.94 17 6.41 11.41 12 17 17.59 15.53 19.06z"></path>
    </svg>
  `;

  const tksNavIcon = `
    <svg viewBox="0 0 45 44" aria-hidden="true" focusable="false">
      <rect width="45" height="44" rx="9" fill="#51b04c"></rect>
      <g fill="#ffffff">
        <rect x="24" y="13" width="3" height="3" rx="0.5"></rect>
        <rect x="21" y="16" width="3" height="3" rx="0.5"></rect>
        <rect x="18" y="19" width="3" height="3" rx="0.5"></rect>
        <rect x="21" y="22" width="3" height="3" rx="0.5"></rect>
        <rect x="24" y="25" width="3" height="3" rx="0.5"></rect>
      </g>
    </svg>
  `;

  function buildTrustCard(link, slideIndex, slideCount) {
    if (link.dataset.tksBuilt === "1") return;
    link.dataset.tksBuilt = "1";

    const nameNode = link.querySelector(".dh-logistics-item__related-name");
    const imageNode = link.querySelector(".dh-logistics-item__related-media img");
    const name = nameNode ? nameNode.textContent.trim() : "";
    const href = link.getAttribute("href") || "#";

    link.classList.add("trust-leaders__card");
    link.innerHTML = "";

    const left = document.createElement("div");
    left.className = "trust-leaders__left-col";

    const head = document.createElement("div");
    head.className = "trust-leaders__left-col-head";

    const numWrap = document.createElement("div");
    numWrap.className = "trust-leaders__num-nav-wrap";

    const numNav = document.createElement("div");
    numNav.className = "slider__num-nav";
    numNav.innerHTML =
      '<span class="slider__num-slide">' +
      String(slideIndex + 1).padStart(2, "0") +
      '</span><span class="slider__num-slash">/</span><span class="slider__total-slide">' +
      String(slideCount).padStart(2, "0") +
      "</span>";
    numWrap.appendChild(numNav);

    const headline = document.createElement("h4");
    headline.className = "trust-leaders__headline";
    headline.setAttribute("dir", "rtl");
    headline.setAttribute("aria-label", name);
    const headlineInner = document.createElement("span");
    headlineInner.className = "trust-leaders__headline-inner";
    headlineInner.textContent = name;
    headline.appendChild(headlineInner);

    const quote = document.createElement("p");
    quote.className = "trust-leaders__quote";
    quote.setAttribute("dir", "rtl");
    quote.textContent =
      "הפרויקט " +
      name +
      " משקף תכנון מוקפד, חשיבה מסחרית ותוצאה מדויקת שמתחברת לחוויית משתמש איכותית.";

    head.appendChild(numWrap);
    head.appendChild(headline);
    head.appendChild(quote);

    left.appendChild(head);

    const right = document.createElement("div");
    right.className = "trust-leaders__right-col";

    const rightInner = document.createElement("div");
    rightInner.className = "trust-leaders__right-inner";

    const imgWrap = document.createElement("div");
    imgWrap.className = "trust-leaders__img-wrap";
    if (imageNode) {
      const img = imageNode.cloneNode(true);
      img.removeAttribute("width");
      img.removeAttribute("height");
      img.classList.add("trust-leaders__photo");
      imgWrap.appendChild(img);
    }

    const personName = document.createElement("h5");
    personName.className = "trust-leaders__name";
    personName.setAttribute("dir", "rtl");
    personName.textContent = name;

    rightInner.appendChild(imgWrap);
    rightInner.appendChild(personName);
    right.appendChild(rightInner);

    link.appendChild(right);
    link.appendChild(left);
    link.setAttribute("href", href);
    link.setAttribute("aria-label", "מעבר לעמוד הפרויקט — " + name);
  }

  function initRelatedCarousel(section) {
    const grid = section.querySelector(".dh-logistics-item__related-grid");
    if (!grid) return;

    const slides = Array.from(grid.children);
    if (!slides.length) return;

    const slideCount = slides.length;
    slides.forEach((slide, idx) => {
      slide.classList.add("cards-slider__slide");
      const link = slide.querySelector(".dh-logistics-item__related-card");
      if (link) buildTrustCard(link, idx, slideCount);
    });

    const shell = document.createElement("div");
    shell.className = "dh-logistics-item__cards-slider";

    const bg = document.createElement("div");
    bg.className = "dh-logistics-item__related-bg";
    bg.setAttribute("aria-hidden", "true");

    grid.parentNode.insertBefore(shell, grid);
    shell.appendChild(bg);
    shell.appendChild(grid);

    let index = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchActive = false;

    let prevBtn = null;
    let nextBtn = null;

    const updateCounters = () => {
      slides.forEach((slide, idx) => {
        const num = slide.querySelector(".slider__num-slide");
        if (num) num.textContent = String(index + 1).padStart(2, "0");
      });
    };

    const updateStates = () => {
      slides.forEach((slide, idx) => {
        slide.classList.remove("is-active", "is-next", "is-next-next", "is-old");
        const diff = idx - index;
        if (diff === 0) {
          slide.classList.add("is-active");
          slide.classList.remove("is-reveal");
          void slide.offsetWidth;
          slide.classList.add("is-reveal");
        } else if (diff === 1) {
          slide.classList.add("is-next");
        } else if (diff === 2) {
          slide.classList.add("is-next-next");
        } else if (diff < 0) {
          slide.classList.add("is-old");
        }
      });
      updateCounters();
      if (prevBtn) prevBtn.disabled = index <= 0;
      if (nextBtn) nextBtn.disabled = index >= slideCount - 1;
    };

    const goTo = (nextIndex) => {
      index = Math.max(0, Math.min(slideCount - 1, nextIndex));
      updateStates();
    };

    if (slideCount > 1) {
      const nav = document.createElement("div");
      nav.className = "cards-slider__nav";

      prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "slider__button-prev";
      prevBtn.setAttribute("aria-label", "פרויקט קודם");
      prevBtn.innerHTML = tksNavIcon;

      nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "slider__button-next";
      nextBtn.setAttribute("aria-label", "פרויקט הבא");
      nextBtn.innerHTML = tksNavIcon;

      nav.appendChild(prevBtn);
      nav.appendChild(nextBtn);
      shell.appendChild(nav);

      prevBtn.addEventListener("click", () => goTo(index - 1));
      nextBtn.addEventListener("click", () => goTo(index + 1));

      shell.addEventListener(
        "touchstart",
        (event) => {
          if (!event.touches.length) return;
          touchActive = true;
          touchStartX = event.touches[0].clientX;
          touchStartY = event.touches[0].clientY;
        },
        { passive: true }
      );

      shell.addEventListener(
        "touchend",
        (event) => {
          if (!touchActive || !event.changedTouches.length) return;
          touchActive = false;
          const deltaX = event.changedTouches[0].clientX - touchStartX;
          const deltaY = event.changedTouches[0].clientY - touchStartY;
          if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY)) return;
          if (deltaX < 0) goTo(index + 1);
          else goTo(index - 1);
        },
        { passive: true }
      );

      section.setAttribute("tabindex", "0");
      section.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          goTo(index + 1);
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          goTo(index - 1);
        }
      });
    }

    goTo(0);
  }

  document.querySelectorAll(".dh-logistics-item__related").forEach((section) => {
    initRelatedCarousel(section);
  });
})();

(() => {
  "use strict";

  var videos = document.querySelectorAll("video.dh-logistics-item__video");
  if (!videos.length) return;

  function tryPlay(video) {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    var playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(function () {});
    }
  }

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          tryPlay(en.target);
        });
      },
      { root: null, threshold: 0.15, rootMargin: "0px" }
    );
    videos.forEach(function (v) {
      io.observe(v);
    });
  } else {
    videos.forEach(tryPlay);
  }

  requestAnimationFrame(function () {
    videos.forEach(function (v) {
      var r = v.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        tryPlay(v);
      }
    });
  });
})();
