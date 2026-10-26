(() => {
  "use strict";

  var cards = document.querySelector(".dh-logistics-item__also-like-card, .wqf-logo-img");
  if (!cards) return;

  fetch("assets/project-cards.json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("cards");
      return res.json();
    })
    .then(function (map) {
      document.querySelectorAll(".dh-logistics-item__also-like-card").forEach(function (link) {
        apply(map, link.getAttribute("href"), link.querySelector("img"));
      });
      document.querySelectorAll(".wqf-slide").forEach(function (slide) {
        var link = slide.querySelector("a.wqf-btn[href], a.wqf-area-tag[href]");
        if (!link) return;
        apply(map, link.getAttribute("href"), slide.querySelector("img.wqf-logo-img"));
      });
    })
    .catch(function () {});

  function apply(map, href, img) {
    if (!href || !img) return;
    var key = href.split("/").pop().split("?")[0];
    var card = map[key];
    if (!card || !card.src) return;
    if (img.getAttribute("src") !== card.src) img.src = card.src;
    if (card.alt) img.alt = card.alt;
  }
})();
