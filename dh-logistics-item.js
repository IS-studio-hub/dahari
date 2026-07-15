(() => {
  "use strict";

  var galleryGrid = document.querySelector("[data-contentstorage-gallery]");
  if (galleryGrid) {
    var rel = galleryGrid.getAttribute("data-contentstorage-gallery") || "";
    var manifestUrl =
      rel
        .split("/")
        .map(function (part) {
          return encodeURIComponent(part);
        })
        .join("/") + "/manifest.json";

    fetch(manifestUrl)
      .then(function (res) {
        if (!res.ok) throw new Error("manifest");
        return res.json();
      })
      .then(function (data) {
        var media = data && Array.isArray(data.media) ? data.media : null;
        var images = data && Array.isArray(data.images) ? data.images : [];
        if (media && media.length) {
          var videos = media.filter(function (item) {
            return item.type === "video";
          });
          var onlyImages = media.filter(function (item) {
            return item.type !== "video";
          });
          // Images first so the page stays usable; videos load on demand.
          galleryGrid.innerHTML = onlyImages
            .concat(videos)
            .map(function (item) {
              if (item.type === "video") {
                return (
                  '<li role="listitem"><video class="dh-logistics-item__gallery-video" controls playsinline ' +
                  'preload="none" src="' +
                  item.src +
                  '"></video></li>'
                );
              }
              return (
                '<li role="listitem"><img alt="" decoding="async" height="600" loading="lazy" ' +
                'referrerpolicy="no-referrer" src="' +
                item.src +
                '" width="960"/></li>'
              );
            })
            .join("");
          return;
        }
        if (!images.length) return;
        galleryGrid.innerHTML = images
          .map(function (src) {
            return (
              '<li role="listitem"><img alt="" decoding="async" height="600" loading="lazy" ' +
              'referrerpolicy="no-referrer" src="' +
              src +
              '" width="960"/></li>'
            );
          })
          .join("");
      })
      .catch(function () {});
  }

  var videos = document.querySelectorAll(
    "video.dh-logistics-item__video, video.dh-logistics-item__gallery-video"
  );
  if (videos.length) {
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
  }

  var form = document.getElementById("dh-item-inquiry-form");
  if (!form) return;

  var alertBox = document.getElementById("dh-item-inquiry-alert");
  var emailField = form.querySelector("#dh-item-inquiry-email");

  function setInvalid(invalid) {
    if (!emailField) return;
    emailField.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function clearErrors() {
    setInvalid(false);
    if (alertBox) {
      alertBox.textContent = "";
      alertBox.hidden = true;
    }
  }

  function showAlert(msg) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.hidden = false;
    alertBox.focus();
  }

  function validateEmail() {
    clearErrors();
    var emailVal = emailField ? String(emailField.value).trim() : "";

    if (!emailVal) {
      showAlert("נא למלא כתובת דוא״ל.");
      setInvalid(true);
      if (emailField) emailField.focus();
      return "";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      showAlert("נא למלא כתובת דוא״ל תקינה.");
      setInvalid(true);
      if (emailField) emailField.focus();
      return "";
    }

    return emailVal;
  }

  function attr(name) {
    return (form.getAttribute(name) || "").trim();
  }

  function productPageUrl() {
    var rel = attr("data-product-url");
    if (!rel) return window.location.href;
    try {
      return new URL(rel, window.location.href).href;
    } catch (e) {
      return rel;
    }
  }

  function productDetailLines() {
    var lines = [
      "שם הנכס: " + attr("data-product-title"),
      "קטגוריה: " + attr("data-product-category"),
      "סוג: " + attr("data-product-tagline"),
      "כתובת: " + attr("data-product-address"),
    ];

    if (attr("data-product-floor")) {
      lines.push("קומה: " + attr("data-product-floor"));
    }
    if (attr("data-product-built")) {
      lines.push("שטח בנוי: " + attr("data-product-built"));
    }
    if (attr("data-product-plot")) {
      lines.push("גודל שטח: " + attr("data-product-plot"));
    }

    lines.push("עמוד: " + productPageUrl());
    return lines.join("\n");
  }

  function buildMailto(customerEmail) {
    var to = attr("data-mailto") || "info@dahari.co.il";
    var productTitle = attr("data-product-title");
    var body =
      "פנייה חדשה מהאתר — מעוניין/ת בנכס\n\n" +
      "דוא״ל הלקוח/ה: " +
      customerEmail +
      "\n\n" +
      "פרטי הנכס:\n" +
      productDetailLines();

    var subject = "פנייה לגבי נכס — " + productTitle;
    return "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();

    var customerEmail = validateEmail();
    if (!customerEmail) return;

    window.location.href = buildMailto(customerEmail);
  });
})();
