/* Accessibility widget: floating button (bottom-left) on every page. Preferences persist per browser. */
(function () {
  "use strict";

  var KEY = "dh-a11y-prefs";
  var root = document.documentElement;
  var MAX_FS = 3;

  var prefs = { fs: 0, contrast: false, gray: false, links: false, font: false, still: false, spacing: false };
  try {
    var saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    for (var k in prefs) if (Object.prototype.hasOwnProperty.call(saved, k)) prefs[k] = saved[k];
  } catch (e) {}

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) {}
  }

  function apply() {
    for (var i = 1; i <= MAX_FS; i++) root.classList.toggle("dh-a11y-fs-" + i, prefs.fs === i);
    ["contrast", "gray", "links", "font", "still", "spacing"].forEach(function (n) {
      root.classList.toggle("dh-a11y-" + n, !!prefs[n]);
    });
    if (prefs.still) pauseVideos();
  }

  function pauseVideos() {
    var vids = document.querySelectorAll("video");
    for (var i = 0; i < vids.length; i++) {
      try { vids[i].pause(); } catch (e) {}
    }
  }

  // Keep videos paused while "stop animations" is on (some pages restart them automatically).
  document.addEventListener("play", function (e) {
    if (prefs.still && e.target && e.target.tagName === "VIDEO") {
      try { e.target.pause(); } catch (err) {}
    }
  }, true);

  apply();

  var ICON_PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.2a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zM4.3 7.6c2.5.6 5 .9 7.7.9s5.2-.3 7.7-.9a1 1 0 1 1 .5 1.9c-1.9.5-3.8.8-5.7.9v3.4l1.9 6.6a1 1 0 0 1-1.9.6L12.9 15h-1.8l-1.6 6a1 1 0 1 1-1.9-.6l1.9-6.6v-3.4c-1.9-.1-3.8-.4-5.7-.9a1 1 0 1 1 .5-1.9z"/></svg>';

  var OPTIONS = [
    { key: "contrast", label: "ניגודיות גבוהה", icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>' },
    { key: "gray", label: "גווני אפור", icon: '<svg viewBox="0 0 24 24"><path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z"/></svg>' },
    { key: "links", label: "הדגשת קישורים", icon: '<svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>' },
    { key: "font", label: "גופן קריא", icon: '<svg viewBox="0 0 24 24"><path d="M5 20 11 4h2l6 16"/><path d="M7.5 14h9"/></svg>' },
    { key: "spacing", label: "ריווח טקסט", icon: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>' },
    { key: "still", label: "עצירת אנימציות", icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 9v6M14 9v6"/></svg>' }
  ];

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "dh-a11y";
    wrap.setAttribute("dir", "rtl");
    wrap.setAttribute("lang", "he");

    var optsHtml = OPTIONS.map(function (o) {
      return '<li><button type="button" class="dh-a11y__opt" data-a11y-opt="' + o.key + '" aria-pressed="false">' +
        o.icon.replace("<svg ", '<svg aria-hidden="true" focusable="false" ') + "<span>" + o.label + "</span></button></li>";
    }).join("");

    wrap.innerHTML =
      '<div class="dh-a11y__panel" id="dh-a11y-panel" role="dialog" aria-modal="false" aria-labelledby="dh-a11y-title" hidden>' +
        '<div class="dh-a11y__head">' +
          '<h2 class="dh-a11y__title" id="dh-a11y-title">תפריט נגישות</h2>' +
          '<button type="button" class="dh-a11y__close" aria-label="סגירת תפריט הנגישות">&times;</button>' +
        "</div>" +
        '<div class="dh-a11y__size" role="group" aria-label="גודל טקסט">' +
          "<span>גודל טקסט</span>" +
          '<span class="dh-a11y__size-ctrls">' +
            '<button type="button" class="dh-a11y__btn" data-a11y-fs="-1" aria-label="הקטנת טקסט">א-</button>' +
            '<span class="dh-a11y__level" aria-live="polite"></span>' +
            '<button type="button" class="dh-a11y__btn" data-a11y-fs="1" aria-label="הגדלת טקסט">א+</button>' +
          "</span>" +
        "</div>" +
        '<ul class="dh-a11y__grid" role="list">' + optsHtml + "</ul>" +
        '<div class="dh-a11y__foot">' +
          '<a class="dh-a11y__link" href="accessibility.html">הצהרת נגישות</a>' +
          '<button type="button" class="dh-a11y__btn" data-a11y-reset>איפוס הגדרות</button>' +
        "</div>" +
      "</div>" +
      '<button type="button" class="dh-a11y__toggle" aria-label="פתיחת תפריט נגישות" aria-expanded="false" aria-controls="dh-a11y-panel">' + ICON_PERSON + "</button>";

    document.body.appendChild(wrap);

    var toggle = wrap.querySelector(".dh-a11y__toggle");
    var panel = wrap.querySelector(".dh-a11y__panel");
    var level = wrap.querySelector(".dh-a11y__level");
    var minus = wrap.querySelector('[data-a11y-fs="-1"]');
    var plus = wrap.querySelector('[data-a11y-fs="1"]');

    function sync() {
      level.textContent = 100 + prefs.fs * 10 + "%";
      minus.disabled = prefs.fs <= 0;
      plus.disabled = prefs.fs >= MAX_FS;
      var btns = wrap.querySelectorAll("[data-a11y-opt]");
      for (var i = 0; i < btns.length; i++) {
        btns[i].setAttribute("aria-pressed", prefs[btns[i].getAttribute("data-a11y-opt")] ? "true" : "false");
      }
    }

    function open() {
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      toggle.setAttribute("aria-label", "סגירת תפריט נגישות");
      var first = panel.querySelector("button:not([disabled])");
      if (first) first.focus();
    }

    function close(returnFocus) {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "פתיחת תפריט נגישות");
      if (returnFocus) toggle.focus();
    }

    toggle.addEventListener("click", function () {
      if (panel.hidden) open(); else close(false);
    });
    wrap.querySelector(".dh-a11y__close").addEventListener("click", function () { close(true); });

    wrap.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("button") : null;
      if (!t) return;
      if (t.hasAttribute("data-a11y-opt")) {
        var key = t.getAttribute("data-a11y-opt");
        prefs[key] = !prefs[key];
      } else if (t.hasAttribute("data-a11y-fs")) {
        prefs.fs = Math.max(0, Math.min(MAX_FS, prefs.fs + Number(t.getAttribute("data-a11y-fs"))));
      } else if (t.hasAttribute("data-a11y-reset")) {
        for (var k in prefs) prefs[k] = k === "fs" ? 0 : false;
      } else {
        return;
      }
      save();
      apply();
      sync();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) close(true);
    });

    document.addEventListener("click", function (e) {
      if (!panel.hidden && !wrap.contains(e.target)) close(false);
    });

    sync();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
