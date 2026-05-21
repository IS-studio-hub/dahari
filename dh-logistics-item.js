(() => {
  "use strict";

  const sections = document.querySelectorAll(".dh-logistics-item__related");
  if (!sections.length) return;

  const icon = `
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path d="M8.47 12 15.53 4.94 17 6.41 11.41 12 17 17.59 15.53 19.06z"></path>
    </svg>
  `;
  const quoteIcon = `
    <svg viewBox="0 0 50 38" aria-hidden="true" focusable="false">
      <path d="M38.33,36.17c6.41,0,11.61-5.2,11.61-11.61,0-4.59-2.7-8.46-6.56-10.33-1.08-.52-.98-1.04-.59-1.79,1.36-2.65,2.65-5.34,3.21-7.03,1.59-4.81-3.98-6.5-7.66-3.8-4.02,2.94-11.61,11.74-11.61,22.95,0,6.41,5.2,11.61,11.61,11.61Z"></path>
      <path d="M11.61,36.17c6.41,0,11.61-5.2,11.61-11.61,0-4.59-2.7-8.46-6.56-10.33-1.08-.52-.98-1.04-.59-1.79,1.36-2.65,2.65-5.34,3.21-7.03,1.59-4.81-3.98-6.5-7.66-3.8C7.59,4.56,0,13.35,0,24.56c0,6.41,5.2,11.61,11.61,11.61Z"></path>
    </svg>
  `;

  sections.forEach((section) => {
    const grid = section.querySelector(".dh-logistics-item__related-grid");
    if (!grid) return;

    const cards = Array.from(grid.children);
    if (cards.length < 2) return;

    cards.forEach((li) => {
      const link = li.querySelector(".dh-logistics-item__related-card");
      if (!link) return;
      if (link.querySelector(".dh-logistics-item__testimonial-inner")) return;
      const nameNode = link.querySelector(".dh-logistics-item__related-name");
      const imageNode = link.querySelector(".dh-logistics-item__related-media img");
      const name = nameNode ? nameNode.textContent.trim() : "";

      const inner = document.createElement("div");
      inner.className = "dh-logistics-item__testimonial-inner";

      const quoteStart = document.createElement("span");
      quoteStart.className = "dh-logistics-item__testimonial-quote";
      quoteStart.innerHTML = quoteIcon;

      const text = document.createElement("p");
      text.className = "dh-logistics-item__testimonial-text";
      text.textContent = "הפרויקט " + name + " משקף תכנון מוקפד, חשיבה מסחרית ותוצאה מדויקת שמתחברת לחוויית משתמש איכותית.";

      const meta = document.createElement("span");
      meta.className = "dh-logistics-item__testimonial-meta";

      const avatar = document.createElement("span");
      avatar.className = "dh-logistics-item__testimonial-avatar";
      if (imageNode) {
        const avatarImg = imageNode.cloneNode(true);
        avatarImg.removeAttribute("width");
        avatarImg.removeAttribute("height");
        avatar.appendChild(avatarImg);
      }

      const author = document.createElement("span");
      author.className = "dh-logistics-item__testimonial-name";
      author.textContent = name;

      meta.appendChild(avatar);
      meta.appendChild(author);

      const action = document.createElement("span");
      action.className = "dh-logistics-item__testimonial-action";
      action.textContent = "לצפייה בפרויקט";

      const quoteEnd = document.createElement("span");
      quoteEnd.className = "dh-logistics-item__testimonial-quote dh-logistics-item__testimonial-quote--end";
      quoteEnd.innerHTML = quoteIcon;

      inner.appendChild(quoteStart);
      inner.appendChild(text);
      inner.appendChild(meta);
      inner.appendChild(action);
      inner.appendChild(quoteEnd);
      link.appendChild(inner);
    });

    const carousel = document.createElement("div");
    carousel.className = "dh-logistics-item__related-carousel";
    grid.parentNode.insertBefore(carousel, grid);
    carousel.appendChild(grid);

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "dh-logistics-item__related-arrow dh-logistics-item__related-arrow--prev";
    prevBtn.setAttribute("aria-label", "גלילה לפרויקט הבא");
    prevBtn.innerHTML = icon;
    prevBtn.style.transform = "rotate(180deg)";

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "dh-logistics-item__related-arrow dh-logistics-item__related-arrow--next";
    nextBtn.setAttribute("aria-label", "גלילה לפרויקט הקודם");
    nextBtn.innerHTML = icon;

    carousel.appendChild(prevBtn);
    carousel.appendChild(nextBtn);

    const dots = document.createElement("div");
    dots.className = "dh-logistics-item__related-dots";
    section.appendChild(dots);

    const count = document.createElement("p");
    count.className = "dh-logistics-item__related-count";
    section.appendChild(count);

    const slideCount = cards.length;
    const dotCount = Math.min(4, slideCount);
    const dotButtons = Array.from({ length: dotCount }, (_, idx) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "dh-logistics-item__related-dot";
      dot.setAttribute("aria-label", "מעבר לשקופית " + (idx + 1));
      dot.setAttribute("aria-current", idx === 0 ? "true" : "false");
      dots.appendChild(dot);
      return dot;
    });

    const maxScroll = () => Math.max(0, grid.scrollWidth - grid.clientWidth);
    const toPhysical = (idx) => {
      const target = cards[Math.max(0, Math.min(slideCount - 1, idx))];
      if (!target) return;
      grid.scrollTo({ left: Math.min(maxScroll(), target.offsetLeft), behavior: "smooth" });
    };
    const activePhysical = () => {
      let best = 0;
      let delta = Number.POSITIVE_INFINITY;
      const x = grid.scrollLeft;
      cards.forEach((card, idx) => {
        const d = Math.abs(card.offsetLeft - x);
        if (d < delta) {
          delta = d;
          best = idx;
        }
      });
      return best;
    };
    const activeLogical = () => slideCount - 1 - activePhysical();
    const toLogical = (idx) => {
      const logical = Math.max(0, Math.min(slideCount - 1, idx));
      toPhysical(slideCount - 1 - logical);
    };
    const dotToLogical = (dotIdx) => {
      if (dotCount <= 1) return 0;
      return Math.round((dotIdx / (dotCount - 1)) * (slideCount - 1));
    };
    const logicalToDot = (logicalIdx) => {
      if (slideCount <= 1) return 0;
      return Math.round((logicalIdx / (slideCount - 1)) * (dotCount - 1));
    };

    const updateButtons = () => {
      const page = activeLogical();
      const dotPage = logicalToDot(page);
      prevBtn.disabled = page >= slideCount - 1;
      nextBtn.disabled = page <= 0;
      dotButtons.forEach((dot, idx) => {
        dot.setAttribute("aria-current", idx === dotPage ? "true" : "false");
      });
      count.textContent = (page + 1) + " / " + slideCount;
    };

    prevBtn.addEventListener("click", () => {
      toLogical(activeLogical() + 1);
    });

    nextBtn.addEventListener("click", () => {
      toLogical(activeLogical() - 1);
    });

    dotButtons.forEach((dot, idx) => {
      dot.addEventListener("click", () => {
        toLogical(dotToLogical(idx));
      });
    });

    grid.addEventListener("scroll", updateButtons, { passive: true });
    window.addEventListener("resize", updateButtons);
    requestAnimationFrame(() => {
      toLogical(0);
      updateButtons();
    });
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
