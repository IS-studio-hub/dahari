(function () {
  "use strict";

  var root = document.getElementById("dh-contact-root");
  if (root) {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              root.classList.add("dh-contact--visible");
              io.disconnect();
            }
          });
        },
        { root: null, threshold: 0.08, rootMargin: "0px 0px -8% 0px" }
      );
      io.observe(root);
    } else {
      root.classList.add("dh-contact--visible");
    }
  }

  var heroVideo = document.querySelector(".dh-contact__hero-video");
  if (heroVideo) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
    } else {
      var playAttempt = heroVideo.play();
      if (playAttempt && typeof playAttempt.catch === "function") {
        playAttempt.catch(function () {});
      }
    }
  }

  var form = document.getElementById("dh-contact-form");
  if (!form) return;

  var alertBox = document.getElementById("dh-contact-form-alert");
  var successBox = document.getElementById("dh-contact-success");
  var submitBtn = form.querySelector('[type="submit"]');

  var fields = {
    name: form.querySelector("#dh-contact-name"),
    email: form.querySelector("#dh-contact-email"),
    phone: form.querySelector("#dh-contact-phone"),
    topic: form.querySelector("#dh-contact-topic"),
    message: form.querySelector("#dh-contact-message"),
    consent: form.querySelector("#dh-contact-consent"),
  };

  function setInvalid(el, invalid) {
    if (!el) return;
    el.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function clearErrors() {
    Object.keys(fields).forEach(function (key) {
      var el = fields[key];
      if (el && el !== fields.consent) setInvalid(el, false);
    });
    if (fields.consent) setInvalid(fields.consent, false);
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

  function validate() {
    clearErrors();
    var errs = [];

    if (!fields.name || !String(fields.name.value).trim()) {
      errs.push("נא למלא שם מלא.");
      setInvalid(fields.name, true);
    }
    if (!fields.email || !String(fields.email.value).trim()) {
      errs.push("נא למלא כתובת דוא״ל.");
      setInvalid(fields.email, true);
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(fields.email.value).trim())) {
      errs.push("נא למלא כתובת דוא״ל תקינה.");
      setInvalid(fields.email, true);
    }
    if (!fields.topic || !String(fields.topic.value).trim()) {
      errs.push("נא לבחור נושא.");
      setInvalid(fields.topic, true);
    }
    if (!fields.message || String(fields.message.value).trim().length < 10) {
      errs.push("נא לכתוב הודעה (לפחות 10 תווים).");
      setInvalid(fields.message, true);
    }
    if (!fields.consent || !fields.consent.checked) {
      errs.push("יש לאשר את הסכמתך ליצירת קשר.");
      setInvalid(fields.consent, true);
    }

    return errs;
  }

  function buildMailto() {
    var to = form.getAttribute("data-mailto") || "info@dahari.co.il";
    var name = fields.name ? String(fields.name.value).trim() : "";
    var email = fields.email ? String(fields.email.value).trim() : "";
    var phone = fields.phone ? String(fields.phone.value).trim() : "";
    var topic = fields.topic ? String(fields.topic.options[fields.topic.selectedIndex].text) : "";
    var body =
      "שם: " +
      name +
      "\n" +
      "דוא״ל: " +
      email +
      "\n" +
      "טלפון: " +
      (phone || "—") +
      "\n" +
      "נושא: " +
      topic +
      "\n\n" +
      (fields.message ? String(fields.message.value).trim() : "");
    var subject = encodeURIComponent("פנייה מהאתר — " + topic);
    return "mailto:" + to + "?subject=" + subject + "&body=" + encodeURIComponent(body);
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (successBox) successBox.hidden = true;
    var errs = validate();
    if (errs.length) {
      showAlert(errs.join(" "));
      var firstBad =
        [fields.name, fields.email, fields.topic, fields.message, fields.consent].find(function (el) {
          return el && el.getAttribute("aria-invalid") === "true";
        });
      if (firstBad && typeof firstBad.focus === "function") firstBad.focus();
      return;
    }

    var mailtoHref = buildMailto();
    var mailLink = document.getElementById("dh-contact-mailto-link");
    if (mailLink) {
      mailLink.setAttribute("href", mailtoHref);
    }

    if (successBox) {
      successBox.hidden = false;
      successBox.focus();
    }
    if (mailLink && typeof mailLink.focus === "function") {
      window.requestAnimationFrame(function () {
        mailLink.focus();
      });
    }
  });
})();
