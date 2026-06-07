(() => {
  "use strict";

  var videos = document.querySelectorAll("video.dh-logistics-item__video");
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
