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
        function renderItem(item) {
          if (item.type === "video") {
            return (
              '<li role="listitem"><video class="dh-logistics-item__gallery-video" muted loop autoplay playsinline ' +
              'preload="metadata" disablepictureinpicture controlslist="nodownload nofullscreen noremoteplayback" src="' +
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
        }

        if (media && media.length) {
          galleryGrid.innerHTML = media.map(renderItem).join("");
          bindGalleryVideos();
          return;
        }
        if (!images.length) return;
        galleryGrid.innerHTML = images
          .map(function (src) {
            return renderItem({ type: "image", src: src });
          })
          .join("");
        bindGalleryVideos();
      })
      .catch(function () {
        bindGalleryVideos();
      });
  } else {
    bindGalleryVideos();
  }

  function bindGalleryVideos() {
    var videos = document.querySelectorAll(
      "video.dh-logistics-item__video, video.dh-logistics-item__gallery-video"
    );
    if (!videos.length) return;

    function tryPlay(video) {
      if (!video) return;
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.controls = false;
      video.removeAttribute("controls");
      video.setAttribute("muted", "");
      video.setAttribute("loop", "");
      video.setAttribute("playsinline", "");
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
      alertBox.classList.remove("dh-logistics-item__inquiry-alert--ok");
    }
  }

  function showAlert(msg, ok) {
    if (!alertBox) return;
    alertBox.textContent = msg;
    alertBox.hidden = false;
    alertBox.classList.toggle("dh-logistics-item__inquiry-alert--ok", !!ok);
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

  function inquiryTo() {
    return attr("data-mailto") || "shamrikin@gmail.com";
  }

  function inquiryBody(customerEmail) {
    return (
      "פנייה חדשה מהאתר - מעוניין/ת בנכס\n\n" +
      "דוא״ל הלקוח/ה: " +
      customerEmail +
      "\n\n" +
      "פרטי הנכס:\n" +
      productDetailLines()
    );
  }

  function inquiryPayload(customerEmail) {
    var productTitle = attr("data-product-title");
    return {
      _subject: "פנייה לגבי נכס - " + productTitle,
      _template: "table",
      _captcha: "false",
      _replyto: customerEmail,
      email: customerEmail,
      property: productTitle,
      category: attr("data-product-category"),
      page: productPageUrl(),
      message: inquiryBody(customerEmail),
    };
  }

  var toastTimer = 0;

  function showSentToast() {
    var toast = document.getElementById("dh-inquiry-toast");
    if (!toast) {
      toast = document.createElement("p");
      toast.id = "dh-inquiry-toast";
      toast.className = "dh-inquiry-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = "האימייל נישלח";
    toast.classList.add("is-on");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-on");
    }, 3000);
  }

  function postInquiryInBackground(customerEmail) {
    var payload = inquiryPayload(customerEmail);
    var to = encodeURIComponent(inquiryTo());

    fetch("https://formsubmit.co/ajax/" + to, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function () {});

    var iframe = document.getElementById("dh-inquiry-frame");
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "dh-inquiry-frame";
      iframe.name = "dh-inquiry-frame";
      iframe.title = "inquiry";
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.cssText =
        "position:absolute;width:0;height:0;border:0;overflow:hidden;visibility:hidden";
      document.body.appendChild(iframe);
    }

    var ghost = document.createElement("form");
    ghost.action = "https://formsubmit.co/" + to;
    ghost.method = "POST";
    ghost.target = "dh-inquiry-frame";
    ghost.acceptCharset = "UTF-8";
    ghost.style.display = "none";
    Object.keys(payload).forEach(function (key) {
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = payload[key];
      ghost.appendChild(input);
    });
    document.body.appendChild(ghost);
    ghost.submit();
    window.setTimeout(function () {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
    }, 4000);
  }

  function sendInquiry(customerEmail) {
    showSentToast();
    form.reset();
    setInvalid(false);
    postInquiryInBackground(customerEmail);
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();

    var customerEmail = validateEmail();
    if (!customerEmail) return;

    sendInquiry(customerEmail);
  });
})();
