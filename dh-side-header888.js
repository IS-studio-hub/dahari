(function () {
		const component = (document.currentScript && document.currentScript.closest('.dh-side-header888')) || document.querySelector('.dh-side-header888');
		if (!component) return;
  
		const menuToggle = component.querySelector('[data-menu-toggle]');
		const menuOverlay = component.querySelector('[data-menu-overlay]');
		const menuInertTarget = component.querySelector('[data-menu-inert-target]');
		const focusableSelectors =
		  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
  
		let lastFocusedElement = null;
		let scrollY = 0;
		let outsideCloserAttached = false;

		function onDocumentPointerDown(e) {
		  if (!isMenuOpen()) return;
		  if (menuOverlay.contains(e.target) || menuToggle.contains(e.target)) return;
		  closeMenu();
		}

		function attachOutsideCloser() {
		  if (outsideCloserAttached) return;
		  outsideCloserAttached = true;
		  window.setTimeout(function () {
			document.addEventListener('pointerdown', onDocumentPointerDown, true);
		  }, 0);
		}

		function detachOutsideCloser() {
		  if (!outsideCloserAttached) return;
		  outsideCloserAttached = false;
		  document.removeEventListener('pointerdown', onDocumentPointerDown, true);
		}
  
		if (!menuToggle || !menuOverlay) return;

		var existingId = menuOverlay.id && String(menuOverlay.id).trim();
		var dialogId =
		  existingId ||
		  (typeof crypto !== 'undefined' && crypto.randomUUID
			? 'dh-menu-dialog-' + crypto.randomUUID().replace(/-/g, '').slice(0, 12)
			: 'dh-menu-dialog-' + String(Math.random()).slice(2, 14));
		menuOverlay.id = dialogId;
		menuToggle.setAttribute('aria-controls', dialogId);

		function syncCurrentNav() {
		  const norm = function (path) {
			var p = (path || '').split('?')[0].replace(/\/$/, '');
			return p || '/';
		  };
		  var cur = norm(window.location.pathname);
		  menuOverlay.querySelectorAll('a[href]').forEach(function (a) {
			try {
			  var u = new URL(a.getAttribute('href'), window.location.origin);
			  var linkPath = norm(u.pathname);
			  if (linkPath === cur) {
				a.setAttribute('aria-current', 'page');
			  } else {
				a.removeAttribute('aria-current');
			  }
			} catch (err) {
			  a.removeAttribute('aria-current');
			}
		  });
		}
		syncCurrentNav();
		window.addEventListener('popstate', syncCurrentNav);
  
		function updateToggleAccessibleName(isOpen) {
		  const openLabel = menuToggle.getAttribute('data-menu-label-open') || 'פתיחת תפריט';
		  const closeLabel = menuToggle.getAttribute('data-menu-label-close') || 'סגירת תפריט';
		  menuToggle.setAttribute('aria-label', isOpen ? closeLabel : openLabel);
		}
  
		function getFocusableElements() {
		  return Array.from(menuOverlay.querySelectorAll(focusableSelectors));
		}
  
		function setRailTabOrderExcluded(exclude) {
		  if (exclude) {
			menuToggle.setAttribute('tabindex', '-1');
		  } else {
			menuToggle.removeAttribute('tabindex');
		  }
		}
  
		function lockPageScroll() {
		  scrollY = window.scrollY ?? window.pageYOffset;
		  /* Do not use position:fixed on document.body — on iOS it flattens the compositor and
		   * backdrop-filter on the menu then samples a solid layer (body background) instead of the video. */
		  document.documentElement.style.overscrollBehavior = 'none';
		  document.body.style.overscrollBehavior = 'none';
		}
  
		function unlockPageScroll() {
		  document.documentElement.style.overscrollBehavior = '';
		  document.body.style.overscrollBehavior = '';
		  window.scrollTo(0, scrollY);
		}
  
		function openMenu() {
		  lastFocusedElement = document.activeElement;
		  if (menuInertTarget) menuInertTarget.inert = true;
		  setRailTabOrderExcluded(true);
		  lockPageScroll();
		  component.classList.add('dh-side-header888--menu-open');
		  menuOverlay.classList.add('is-active888');
		  menuOverlay.setAttribute('aria-hidden', 'false');
		  menuToggle.setAttribute('aria-expanded', 'true');
		  menuToggle.classList.add('is-active888');
		  updateToggleAccessibleName(true);
		  attachOutsideCloser();
  
		  const focusable = getFocusableElements();
		  if (focusable.length) {
			const first = focusable[0];
			if (typeof first.focus === 'function') {
			  try {
				first.focus({ preventScroll: true });
			  } catch (err) {
				first.focus();
			  }
			}
		  }
		}
  
		function closeMenu() {
		  detachOutsideCloser();
		  component.classList.remove('dh-side-header888--menu-open');
		  menuOverlay.classList.remove('is-active888');
		  menuOverlay.setAttribute('aria-hidden', 'true');
		  menuToggle.setAttribute('aria-expanded', 'false');
		  menuToggle.classList.remove('is-active888');
		  updateToggleAccessibleName(false);
		  if (menuInertTarget) menuInertTarget.inert = false;
		  setRailTabOrderExcluded(false);
		  unlockPageScroll();
  
		  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
			requestAnimationFrame(function () {
			  lastFocusedElement.focus();
			});
		  }
		}
  
		function isMenuOpen() {
		  return menuOverlay.classList.contains('is-active888');
		}

		/* Align with --overlay-motion-duration-wide + cushion (640ms + buffer). */
		var MENU_CLOSE_NAV_FALLBACK_MS = 720;

		function sameDocumentUrl(url) {
		  try {
			var parsed = new URL(url, window.location.href);
			var curPath = window.location.pathname.replace(/\/$/, '') || '/';
			var pPath = parsed.pathname.replace(/\/$/, '') || '/';
			return (
			  parsed.origin === window.location.origin &&
			  pPath === curPath &&
			  parsed.search === window.location.search &&
			  parsed.hash === window.location.hash
			);
		  } catch (err) {
			return false;
		  }
		}

		function navigateAfterMenuClose(url, options) {
		  options = options || {};
		  var targetAttr = options.target || '';
		  var hasDownload = options.hasDownload;
		  var downloadName = options.downloadName;

		  var done = false;
		  function go() {
			if (done) return;
			done = true;
			if (hasDownload) {
			  var a = document.createElement('a');
			  a.href = url;
			  if (downloadName) {
				a.download = downloadName;
			  } else {
				a.setAttribute('download', '');
			  }
			  a.rel = 'noopener noreferrer';
			  document.body.appendChild(a);
			  a.click();
			  document.body.removeChild(a);
			  return;
			}
			if (targetAttr === '_blank') {
			  window.open(url, '_blank', 'noopener,noreferrer');
			  return;
			}
			window.location.assign(url);
		  }

		  if (!isMenuOpen()) {
			go();
			return;
		  }

		  function onTransitionEnd(ev) {
			if (ev.target !== menuOverlay) return;
			if (ev.propertyName !== 'width' && ev.propertyName !== 'opacity') return;
			menuOverlay.removeEventListener('transitionend', onTransitionEnd);
			window.clearTimeout(fallbackTimer);
			go();
		  }

		  menuOverlay.addEventListener('transitionend', onTransitionEnd);
		  closeMenu();

		  var fallbackTimer = window.setTimeout(function () {
			menuOverlay.removeEventListener('transitionend', onTransitionEnd);
			go();
		  }, MENU_CLOSE_NAV_FALLBACK_MS);
		}
  
		function toggleMenu() {
		  if (isMenuOpen()) {
			closeMenu();
		  } else {
			openMenu();
		  }
		}
  
		menuToggle.addEventListener('click', toggleMenu);

		menuOverlay.addEventListener('click', function (e) {
		  if (e.target === menuOverlay) {
			closeMenu();
		  }
		});
  
		menuOverlay.querySelectorAll('a[href]').forEach(function (link) {
		  link.addEventListener('click', function (e) {
			if (e.defaultPrevented) return;
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

			var raw = link.getAttribute('href');
			if (!raw || raw === '#' || /^javascript:/i.test(String(raw).trim())) {
			  closeMenu();
			  return;
			}

			var url;
			try {
			  url = new URL(link.href, window.location.href).href;
			} catch (err) {
			  closeMenu();
			  return;
			}

			if (sameDocumentUrl(url)) {
			  e.preventDefault();
			  closeMenu();
			  return;
			}

			e.preventDefault();

			var hasDl = link.hasAttribute('download');
			navigateAfterMenuClose(url, {
			  target: link.target || '',
			  hasDownload: hasDl,
			  downloadName: hasDl ? link.getAttribute('download') || '' : null,
			});
		  });
		});
  
		document.addEventListener('keydown', function (e) {
		  if (!isMenuOpen()) return;
  
		  if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			closeMenu();
			return;
		  }
  
		  if (e.key === 'Tab') {
			const focusable = getFocusableElements();
			if (!focusable.length) return;
  
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
  
			if (e.shiftKey && document.activeElement === first) {
			  e.preventDefault();
			  last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
			  e.preventDefault();
			  first.focus();
			}
		  }
		});
	  })();

(function () {
	if (window.__dhCustomCursorScheduled) return;
	if (document.querySelector("script[data-dh-custom-cursor]")) return;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
	var cur = document.currentScript;
	if (!cur || !cur.src) return;
	window.__dhCustomCursorScheduled = true;
	try {
		var s = document.createElement("script");
		s.src = new URL("dh-custom-cursor.js?v=6", cur.src).href;
		s.defer = true;
		s.setAttribute("data-dh-custom-cursor", "1");
		document.head.appendChild(s);
	} catch (e) {
		/* ignore */
	}
})();
