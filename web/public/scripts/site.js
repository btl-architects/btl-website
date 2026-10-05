/* ==========================================================================
   btl architects — the four islands
   No framework, no router, no animation library. Vanilla, ~4 KB.
   ========================================================================== */
(function () {
  "use strict";

  var motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = motionPreference.matches;
  motionPreference.addEventListener("change", function () { reduced = motionPreference.matches; });

  function afterFirstPaint(callback) {
    requestAnimationFrame(function () { requestAnimationFrame(callback); });
  }

  /* Speculative work (neighbouring photographs, warmed projects, prefetched
     pages) waits until the opening photograph is on screen, not merely
     downloaded: between its load event and its first paint it still has to be
     decoded and drawn, and anything started in that gap competes with it on a
     slow connection. Decode, then one frame, then a task. A frame loop alone
     stalls in a background tab, so a clock ends the wait as well. */
  var openingPainted = (function () {
    var img = document.querySelector('img[fetchpriority="high"]');
    var done = false, waiting = [];
    function release() {
      if (done) return;
      done = true;
      // Later islands in this file have their own scope; they listen for this.
      document.documentElement.setAttribute("data-opening-shown", "");
      document.dispatchEvent(new Event("btl:opening-shown"));
      waiting.splice(0).forEach(function (fn) { fn(); });
    }
    if (img) {
      var shown = function () { requestAnimationFrame(function () { setTimeout(release, 0); }); };
      var ready = function () {
        img.removeEventListener("load", ready);
        img.removeEventListener("error", ready);
        if (img.decode) img.decode().then(shown, shown); else shown();
      };
      if (img.complete) ready();
      else { img.addEventListener("load", ready); img.addEventListener("error", ready); }
      setTimeout(release, 8000);
    } else release();
    return function (fn) { if (done) fn(); else waiting.push(fn); };
  })();

  /* Later project photographs are held by the build (tools/defer-rail-images.mjs)
     with their real files in data attributes, so they cannot compete with the
     opening photograph. Restore them once it is painted, or the moment the
     reader touches, clicks or types, whichever is first. The <noscript> copy
     beside each held picture exists only for a browser without scripts. */
  function undefer(root) {
    [].forEach.call(root.querySelectorAll("[data-defer]"), function (held) {
      held.removeAttribute("data-defer");
      var parts = held.tagName === "IMG" ? [held] : held.querySelectorAll("source, img");
      [].forEach.call(parts, function (el) {
        var srcset = el.getAttribute("data-srcset"), src = el.getAttribute("data-src");
        if (srcset !== null) { el.setAttribute("srcset", srcset); el.removeAttribute("data-srcset"); }
        if (src !== null) { el.setAttribute("src", src); el.removeAttribute("data-src"); }
      });
      var copy = held.nextElementSibling;
      if (copy && copy.tagName === "NOSCRIPT") copy.remove();
    });
  }
  if (document.querySelector("[data-defer]")) {
    var undeferPage = function () {
      ["pointerdown", "keydown"].forEach(function (type) { window.removeEventListener(type, undeferPage, true); });
      undefer(document);
    };
    openingPainted(undeferPage);
    ["pointerdown", "keydown"].forEach(function (type) { window.addEventListener(type, undeferPage, true); });
  }

  /* Durations from tokens.css: the card timers wait on CSS transitions. */
  function durationToken(name, fallback) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    var n = parseFloat(raw);
    if (isNaN(n)) return fallback;
    return /ms$/.test(raw) ? n : /s$/.test(raw) ? n * 1000 : n;
  }
  // Read styles after the browser's first layout rather than forcing a full
  // page style calculation inside the startup script. Until then, use the
  // existing fallbacks; controls and their handlers are available immediately.
  var DUR = { hover: 420, slow: 700 };
  afterFirstPaint(function () {
    DUR.hover = durationToken("--dur-hover", 420);
    DUR.slow = durationToken("--dur-slow", 700);
  });

  /* Freeze the rail through toolbar animations. Firefox Android compensates
     bottom-fixed boxes as its top toolbar moves the content origin. Other
     engines keep a top anchor, compensating displaced visual viewports. */
  var socialRail = document.querySelector(".landing .srail");
  if (socialRail) {
    var touchRail = window.matchMedia("(hover: none) and (pointer: coarse)");
    var railWidth = 0, railCentre = 0, railWordHeight = 0;
    var railViewport = window.visualViewport;
    var railWords = socialRail.querySelector(".srail__links");
    var bottomRail = /Android.*Firefox\//.test(navigator.userAgent);
    var railTick = false;
    function placeRail() {
      if (!touchRail.matches || (railViewport && railViewport.scale !== 1)) return;
      if (bottomRail) {
        var bottom = Math.round(railCentre - railWords.offsetHeight / 2) + "px";
        if (socialRail.style.getPropertyValue("--social-bottom") !== bottom) socialRail.style.setProperty("--social-bottom", bottom);
        if (!socialRail.hasAttribute("data-anchor-bottom")) socialRail.setAttribute("data-anchor-bottom", "");
      } else {
        var offset = railViewport ? railViewport.offsetTop : 0;
        var top = Math.round(railCentre + offset - socialRail.getBoundingClientRect().top) + "px";
        if (socialRail.style.getPropertyValue("--social-top") !== top) socialRail.style.setProperty("--social-top", top);
      }
      if (!socialRail.hasAttribute("data-pinned")) socialRail.setAttribute("data-pinned", "");
    }
    function pinRail() {
      if (!touchRail.matches) {
        socialRail.style.removeProperty("--social-top");
        socialRail.style.removeProperty("--social-bottom");
        socialRail.removeAttribute("data-anchor-bottom");
        socialRail.removeAttribute("data-pinned");
        railWidth = 0;
        return;
      }
      if (railViewport && railViewport.scale !== 1) return;
      var width = window.innerWidth;
      if (width !== railWidth) {
        railCentre = (railViewport ? railViewport.height : window.innerHeight) / 2;
        railWidth = width;
        railWordHeight = railWords.offsetHeight;
      } else if (bottomRail) return;
      placeRail();
    }
    function scheduleRail() {
      if (railTick) return;
      railTick = true;
      requestAnimationFrame(function () { railTick = false; pinRail(); });
    }
    afterFirstPaint(pinRail);
    if ("ResizeObserver" in window) new ResizeObserver(function () {
      if (railWidth && railWords.offsetHeight !== railWordHeight) {
        railWordHeight = railWords.offsetHeight;
        placeRail();
      }
    }).observe(railWords);
    window.addEventListener("resize", scheduleRail, { passive: true });
    if (railViewport && !bottomRail) {
      railViewport.addEventListener("resize", scheduleRail, {passive:true});
      railViewport.addEventListener("scroll", scheduleRail, {passive:true});
    }
    window.addEventListener("pageshow", pinRail);
    touchRail.addEventListener("change", pinRail);
  }

  /* --- 1. shared scroll entrances -----------------------------------------
   * One entrance per element, with a short stagger. Initial visible content
   * stays steady: the opening image and page title must not wait on animation.
   * Below-fold groups enter inside the reading area, not at the first pixel.
   * Both the observer and the scroll backstop use the same trigger. */
  var reveals = [].slice.call(document.querySelectorAll(".rv, .rvc, .ruled"));
  var pending = reveals.slice();
  var revealObserver;
  var revealTick = false;
  var STAGGER_MS = 75;
  var MAX_STAGGER_MS = 225;

  function reveal(el, stagger, instant) {
    if (instant) {
      el.setAttribute("data-reveal-instant", "");
      el.style.transitionDelay = "";
    }
    if (el.classList.contains("in")) return;
    if (!instant) el.style.transitionDelay = Math.min(stagger || 0, MAX_STAGGER_MS) + "ms";
    el.classList.add("in");
    if (revealObserver) revealObserver.unobserve(el);
  }
  document.addEventListener("transitionend", function (ev) {
    if (reveals.indexOf(ev.target) !== -1) ev.target.style.transitionDelay = "";
  });

  function stopReveals() {
    if (revealObserver) revealObserver.disconnect();
    window.removeEventListener("scroll", queueReveals);
    window.removeEventListener("resize", queueReveals);
  }
  function revealAll() {
    reveals.forEach(function (el) { reveal(el, 0, true); });
    pending = [];
    stopReveals();
  }
  function sweepReveals() {
    revealTick = false;
    var ready = [];
    var vh = window.innerHeight;
    // Batch geometry reads before writes, and cap the threshold by viewport
    // height: a tall card can enter without needing 25% of itself on screen.
    pending = pending.filter(function (el) {
      if (el.classList.contains("in")) return false;
      var box = el.getBoundingClientRect();
      var edge = el.hasAttribute("data-statement-reveal") ? .68 : .82;
      if (box.top < vh * edge) {
        ready.push({el: el, passed: box.bottom <= 0});
        return false;
      }
      return true;
    });
    ready.forEach(function (entry, i) { reveal(entry.el, i * STAGGER_MS, entry.passed); });
    if (!pending.length) stopReveals();
  }
  function queueReveals() {
    if (revealTick || !pending.length) return;
    revealTick = true;
    requestAnimationFrame(sweepReveals);
  }

  // Measure before claiming the hidden state, so initial content does not
  // fade out and back in. Also covers a reload at a restored scroll position.
  var initial = reveals.filter(function (el) {
    var box = el.getBoundingClientRect();
    return !el.hasAttribute("data-statement-reveal") && box.top < window.innerHeight && box.bottom > 0;
  });
  initial.forEach(function (el) { reveal(el, 0, true); });
  document.documentElement.classList.add("js");

  if (reduced || document.hidden || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    revealObserver = new IntersectionObserver(queueReveals, {threshold: 0, rootMargin: "0px 0px -18% 0px"});
    pending.forEach(function (el) { if (!el.classList.contains("in")) revealObserver.observe(el); });
    window.addEventListener("scroll", queueReveals, {passive: true});
    window.addEventListener("resize", queueReveals, {passive: true});
    afterFirstPaint(queueReveals);
    setTimeout(queueReveals, 1200);
  }
  // Background tabs, preference changes and browser history never leave
  // unreadable content. Once revealed, it stays visible on the return scroll.
  document.addEventListener("visibilitychange", function () { if (document.hidden) revealAll(); });
  motionPreference.addEventListener("change", function () { if (motionPreference.matches) revealAll(); });
  window.addEventListener("pageshow", function (ev) { if (ev.persisted) revealAll(); else queueReveals(); });
  document.addEventListener("focusin", function (ev) {
    var el = ev.target;
    while (el && el !== document.documentElement) {
      // Do not snap a card already entering when a pointer gives it focus.
      if (reveals.indexOf(el) !== -1 && !el.classList.contains("in")) reveal(el, 0, true);
      el = el.parentElement;
    }
  });

  /* --- 1b. the opening sequence --------------------------------------------
     Ambient, not navigational (R8): no arrows, no dots, no counter, and it
     stops entirely when it is off-screen so a page nobody is looking at is not
     decoding video.

     Video is fetched lazily and only when it will actually be watched. Under
     reduced motion, or on a metered connection, the poster frames alone carry
     the sequence and no video is requested. */
  var stage = document.querySelector("[data-stage-frames]");
  if (stage) {
    var sFrames = [].slice.call(stage.querySelectorAll(".stage__f"));
    /* The opening no longer captions itself, so nothing reads data-label. The
       attribute stays on each frame — it is the clip's name in the CMS. */
    var connection = navigator.connection;
    var motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var narrowStage = window.matchMedia("(max-width: 47.99rem)");
    /* No userPaused. The pause control was removed at the practice's request, so
       the only things that stop the sequence are leaving the viewport, the tab
       being hidden, and reduced motion or Save-Data — all of which sync() still
       honours. Keeping the flag with nothing able to set it would have left a
       branch that reads as a feature and can never be reached. */
    var at = 0, errorTimer = null, visible = false, generation = 0;
    /* The film starts two frames after load, i.e. after first paint: a decoder
       starting earlier held a slow device's first paint back ~2s. */
    var pageReady = false;
    function afterPaint() { afterFirstPaint(function () { pageReady = true; sync(); }); }
    if (document.readyState === "complete") afterPaint(); else window.addEventListener("load", afterPaint, { once: true });
    function stillsOnly() { return motion.matches || !!(connection && connection.saveData); }
    function source(v) { return v.getAttribute(narrowStage.matches ? "data-src-portrait" : "data-src"); }
    // Inert templates avoid constructing a media player for every clip during
    // HTML parsing. Only the current clip (and its later preload) needs one.
    function player(i) {
      var frame = sFrames[i], v = frame.querySelector("video");
      if (v) return v;
      frame.appendChild(frame.querySelector("[data-stage-video]").content.cloneNode(true));
      v = frame.querySelector("video");
      v.muted = true;
      v.loop = sFrames.length === 1;
      v.addEventListener("ended", function () { if (at === i && canPlay()) show(at + 1); });
      v.addEventListener("error", function () { failed(i); });
      v.addEventListener("emptied", function () { v.removeAttribute("data-playing"); });
      return v;
    }
    function load(i) {
      if (stillsOnly()) return;
      var v = player(i), want = source(v);
      // preload=none left the following film waiting for play() to fetch it.
      // This runs after first paint, and only prepares the next clip in order.
      v.preload = "auto";
      if (want && v.getAttribute("src") !== want) { v.src = want; v.load(); }
    }
    function pause() {
      generation++;
      clearTimeout(errorTimer); errorTimer = null;
      sFrames.forEach(function (f) { var v = f.querySelector("video"); if (v) v.pause(); });
    }
    function failed(i) {
      // A preloaded file can fail before becoming active. Apply the same still
      // fallback when revisiting it, rather than waiting for another error.
      if (at !== i || !canPlay() || sFrames.length < 2) return;
      generation++;
      clearTimeout(errorTimer);
      // A genuinely unavailable film still gets its authored fallback. Ordinary
      // buffering never reveals that film's poster between two working videos.
      revealFilm(i, false);
      errorTimer = setTimeout(function () { if (at === i && canPlay()) show(at + 1); }, 6200);
    }
    function revealFilm(i, playing) {
      if (!playing) {
        var poster = sFrames[i].querySelector("[data-stage-poster]");
        if (poster) { sFrames[i].appendChild(poster.content.cloneNode(true)); poster.remove(); }
      }
      if (playing) player(i).setAttribute("data-playing", "true");
      else { player(i).removeAttribute("data-playing"); player(i).pause(); }
      sFrames.forEach(function (f, k) {
        f.setAttribute("data-on", k === i ? "true" : "false");
        var v = f.querySelector("video");
        if (k !== i && v) v.pause();
      });
    }
    function show(i) {
      at = (i + sFrames.length) % sFrames.length;
      var next = at, ticket = ++generation;
      clearTimeout(errorTimer); errorTimer = null;
      load(at);
      var current = player(at);
      if (current.error) { failed(at); return; }
      // Keep the outgoing decoded picture until the incoming decoder presents
      // a frame. `playing` alone can fire before the browser paints that frame.
      function ready() {
        if (ticket !== generation || next !== at || !canPlay()) return;
        clearTimeout(errorTimer); errorTimer = null;
        revealFilm(next, true);
        if (sFrames.length > 1) load((next + 1) % sFrames.length);
      }
      if (current.ended) { current.removeAttribute("data-playing"); current.currentTime = 0; }
      if (current.requestVideoFrameCallback) current.requestVideoFrameCallback(ready);
      else current.addEventListener("playing", function () { afterFirstPaint(ready); }, {once:true});
      /* A presented frame is the preferred signal, but an engine may never
         present one for a video that is still transparent: Firefox on Android
         skips painting and decoding invisible video, so the callback above never
         came and the opening sat on its first still until the stall timer.
         Playback time advancing does not depend on painting. Once it has moved
         a little, reveal; the decoder then runs because the video is visible. */
      var started = current.currentTime;
      function progressed() {
        if (ticket !== generation || current.hasAttribute("data-playing")) { current.removeEventListener("timeupdate", progressed); return; }
        if (current.currentTime - started < 0.15) return;
        current.removeEventListener("timeupdate", progressed);
        ready();
      }
      current.addEventListener("timeupdate", progressed);
      current.play().catch(function () { if (ticket === generation) failed(next); });
      // A stalled network must not stop the sequence indefinitely. Retain the
      // outgoing frame while waiting, then use the ordinary error fallback.
      errorTimer = setTimeout(function () {
        if (ticket === generation) failed(next);
      }, 15000);
    }
    function canPlay() { return !stillsOnly() && visible && !document.hidden && pageReady; }
    function sync() {
      pause();
      if (stillsOnly()) {
        at = 0;
        sFrames.forEach(function (f, k) {
          f.setAttribute("data-on", k === 0 ? "true" : "false");
          var v = f.querySelector("video");
          if (v && v.hasAttribute("src")) { v.removeAttribute("src"); v.load(); }
        });
        return;
      }
      if (!canPlay()) return;
      show(at);
    }
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", sync);
    narrowStage.addEventListener("change", sync);
    if (connection && connection.addEventListener) connection.addEventListener("change", sync);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; sync(); }, {threshold:0.25}).observe(stage);
    } else { visible = true; }
    sync();
  }

  /* --- 2. header contrast -------------------------------------------------
     Reads data-ground off the section behind the header. No scroll handler. */
  var header = document.querySelector(".header");
  if (header) {
    var grounds = document.querySelectorAll("[data-ground]");
    if (grounds.length && "IntersectionObserver" in window) {
      // Measuring the header before first paint forced layout for the whole
      // homepage. Its initial contrast already comes from the page's ground.
      afterFirstPaint(function () {
        var hh = header.offsetHeight;
        var gio = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              header.setAttribute("data-over", e.target.getAttribute("data-ground"));
            }
          });
          /* Both margins must be whole pixels — offsetHeight is fractional on a
             zoomed or scaled display, and a fractional rootMargin throws, taking
             the rest of this file down with it. */
        }, { rootMargin: "-" + Math.round(hh / 2) + "px 0px -" +
                         Math.max(0, Math.round(window.innerHeight - hh)) + "px 0px" });
        grounds.forEach(function (g) { gio.observe(g); });
      });
    }
  }

  /* Pin the header once the hero is gone. */
  if (header) {
    var hero = document.querySelector(".landing");
    if (hero && "IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        header.setAttribute("data-pinned", es[0].isIntersecting ? "false" : "true");
      }, { rootMargin: "-60px 0px 0px 0px", threshold: 0 }).observe(hero);
    } else {
      header.setAttribute("data-pinned", "true");
    }
  }

  /* --- 3. mobile menu ------------------------------------------------------ */
  var menu = document.querySelector(".menu");
  /* One button. It used to be two — a "Menu" in the header and a "Close" inside
     the panel, each with its own word and its own place — so opening the menu
     swapped one control for a different one sitting somewhere else. A single
     toggle that stays put and changes state is a transition; two controls
     trading places is a substitution, and that is what felt abrupt. */
  var openBtn = document.querySelector("[data-menu-toggle]");
  var menuLabel = document.querySelector("[data-menu-label]");
  if (menu && openBtn) {
    var lastFocus = null;
    var menuFocusFrame = null;
    var menuFocusTimer = null;
    function cancelMenuFocus() {
      if (menuFocusFrame !== null) cancelAnimationFrame(menuFocusFrame);
      if (menuFocusTimer !== null) clearTimeout(menuFocusTimer);
      menuFocusFrame = menuFocusTimer = null;
    }

    var headerInner = header && header.querySelector(".header__inner");
    var primaryList = header && header.querySelector(".nav");
    var headerLogo = header && header.querySelector(".header__logo");
    var fitFrame = null;
    var wideNavigation = window.matchMedia("(min-width: 48rem)");
    function fitNavigation() {
      fitFrame = null;
      if (!headerInner || !primaryList || !headerLogo) return;
      // Measure a compact header's hidden nav without hiding its focused
      // burger. The temporary absolute list never participates in layout.
      var navHadFocus = primaryList.contains(document.activeElement);
      header.toggleAttribute("data-nav-measure", header.hasAttribute("data-compact") && wideNavigation.matches);
      if (!wideNavigation.matches) header.removeAttribute("data-compact");
      if (getComputedStyle(primaryList).display !== "none") {
        var style = getComputedStyle(headerInner);
        var available = headerInner.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        var required = primaryList.scrollWidth + headerLogo.getBoundingClientRect().width + (parseFloat(style.columnGap) || 0);
        header.toggleAttribute("data-compact", required > available + 1);
      }
      header.removeAttribute("data-nav-measure");
      if (navHadFocus && getComputedStyle(primaryList).display === "none") openBtn.focus({ preventScroll: true });
      if (menu.getAttribute("data-open") === "true" && getComputedStyle(openBtn).display === "none") close();
    }
    function queueNavigationFit() {
      if (fitFrame === null) fitFrame = requestAnimationFrame(fitNavigation);
    }
    afterFirstPaint(queueNavigationFit);
    window.addEventListener("resize", queueNavigationFit, { passive: true });
    if ("ResizeObserver" in window && headerInner && headerLogo) {
      var headerSize = new ResizeObserver(queueNavigationFit);
      headerSize.observe(headerInner);
      headerSize.observe(headerLogo);
      headerSize.observe(primaryList);
    }
    if (primaryList && "MutationObserver" in window) new MutationObserver(queueNavigationFit).observe(primaryList, { subtree: true, childList: true, characterData: true });
    if (document.fonts) document.fonts.ready.then(queueNavigationFit);

    /* Only what is actually rendered. A display:none link cannot take focus,
       so one left in the cycle makes the trap's .focus() on it silently fail
       and lets Tab out of the menu. */
    function focusables() {
      return [openBtn].concat([].slice.call(menu.querySelectorAll("a[href], button:not([disabled])"))
        .filter(function (el) { return el.getClientRects().length > 0; }));
    }
    var menuBackground = [];
    function isolateMenu(on) {
      if (on) {
        menuBackground = [].slice.call(document.querySelectorAll("main, footer, .skip, .header__logo, .header nav")).filter(function (el) { return !el.inert; });
        menuBackground.forEach(function (el) { el.inert = true; });
      } else { menuBackground.forEach(function (el) { el.inert = false; }); menuBackground = []; }
    }
    function open() {
      isolateMenu(true);
      lastFocus = document.activeElement;
      menu.setAttribute("data-open", "true");
      openBtn.setAttribute("aria-expanded", "true");
      document.documentElement.style.overflow = "hidden";
      if (menuLabel) menuLabel.textContent = "Close";
      var f = focusables();
      if (f.length > 1) {
        var until = performance.now() + 450;
        function grabMenuFocus() {
          // Called by the frame loop or the backstop timer; only one may run.
          if (menuFocusFrame !== null) cancelAnimationFrame(menuFocusFrame);
          menuFocusFrame = null;
          // WebKit can still report hidden during the first reduced-motion
          // frame. Retry visibility, while never undoing a quick Tab/Escape.
          if (menu.getAttribute("data-open") !== "true" || document.activeElement !== lastFocus) return;
          if (getComputedStyle(f[1]).visibility === "visible") {
            f[1].focus();
            if (document.activeElement === f[1]) { cancelMenuFocus(); return; }
          }
          if (performance.now() < until) menuFocusFrame = requestAnimationFrame(grabMenuFocus);
        }
        menuFocusFrame = requestAnimationFrame(grabMenuFocus);
        menuFocusTimer = setTimeout(grabMenuFocus, 400);
      }
    }

    function close() {
      cancelMenuFocus();
      isolateMenu(false);
      menu.setAttribute("data-open", "false");
      openBtn.setAttribute("aria-expanded", "false");
      document.documentElement.style.overflow = "";
      if (menuLabel) menuLabel.textContent = "Menu";
      if (lastFocus) lastFocus.focus();
    }
    // Reset before freezing in bfcache; returning to a page restores its
    // content rather than a stale navigation dialog and inert background.
    window.addEventListener("pagehide", function () {
      if (menu.getAttribute("data-open") === "true") { lastFocus = null; close(); }
    });
    openBtn.addEventListener("click", function () {
      menu.getAttribute("data-open") === "true" ? close() : open();
    });

    document.addEventListener("keydown", function (e) {
      if (menu.getAttribute("data-open") !== "true") return;
      if (e.key === "Tab" || e.key === "Escape") cancelMenuFocus();
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      /* Every step, not just the ends: Safari's own tab order skips links. */
      e.preventDefault();
      var i = f.indexOf(document.activeElement);
      var next = i < 0 ? (e.shiftKey ? f.length - 1 : 0) : (i + (e.shiftKey ? -1 : 1) + f.length) % f.length;
      f[next].focus();
    });
  }

  /* --- 4. the project index ------------------------------------------------
     Down is the archive, right is the room (P7) — but the archive is the page
     itself, not a surface laid over it. Opening a project expands its own row
     in place, so the index is never replaced, the next project stays where it
     was, and moving to it is ordinary scrolling. An earlier version put the
     project in a full-screen overlay with its own spine, which meant inventing
     a wheel gesture to move between projects; deleting the overlay deleted the
     gesture, the scroll lock and the focus trap along with it.

     Progressive by construction: every row header is a real link to a real
     project page and this only intercepts the click. With JavaScript off, or
     if a fetch fails, the browser simply navigates. The rail is lifted out of
     the project's own page on first open and cached, so an index of two
     hundred projects ships no project markup at all. */
  /* --- the rail's control row (RailNav.astro) --------------------------------
     One implementation for every rail: an open card, a project's own page, the
     Studio. The step buttons find their strip by where the row sits — inside a
     .pcard, or immediately after the [data-rail] it belongs to. */

  /* Counter and progress rule for one scroller. A passive listener on that
     strip alone — not on the page (R10 forbids that); there is no other way to
     report where a horizontal scroller has got to. Re-binding replaces the
     previous listener, and shut() removes it through st._report. */
  function railProgress(st, nav) {
    var pos = nav.querySelector("[data-pos]");
    var bar = nav.querySelector("[data-bar]");
    var total = st.querySelectorAll(".rail__f").length;
    var report = function () {
      var range = st.scrollWidth - st.clientWidth;
      /* A standalone row has nothing to do when every photograph fits. An open
         card's row stays, because it also carries the card's close cross. */
      if (nav._fits) nav.hidden = range <= 1;
      var p = range > 0 ? Math.abs(st.scrollLeft) / range : 0;
      var frac = 1 / total;
      bar.style.width = (frac * 100) + "%";
      /* Across the TRACK, not across the strip.
       *
       * This multiplied the travel by st.clientWidth — the width of the
       * scrolling photographs. The indicator does not live in the strip; it
       * lives in .railnav__bar, which is a fraction of that width. So at five
       * of seven it was asked to travel 532px inside a 530px track and sat
       * jammed against the end, while the counter beside it read 05 / 07
       * correctly because that line does its own arithmetic.
       *
       * Its width is already a percentage of the track, so its travel has to
       * be measured against the same thing. Read live rather than cached: the
       * card is resizable and the nav reflows with it. */
      var track = bar.parentNode.clientWidth;
      bar.style.transform = "translateX(" + (p * (1 - frac) * track) + "px)";
      /* The counter names the frame at the strip's start, not a share of the
         scroll: photographs differ in width, so the share read 04 with the
         third one in front of you. The last frame can never reach the start,
         so the end of the range counts as the last. */
      var frames = st.querySelectorAll(".rail__f");
      var start = st.getBoundingClientRect().left + (parseFloat(getComputedStyle(st).scrollPaddingLeft) || 0);
      var at = 0, near = Infinity;
      for (var k = 0; k < frames.length; k++) {
        var d = Math.abs(frames[k].getBoundingClientRect().left - start);
        if (d < near) { near = d; at = k; }
      }
      if (range > 0 && p > 0.995) at = frames.length - 1;
      pos.textContent = String(Math.min(total, at + 1)).padStart(2, "0") +
                        " / " + String(total).padStart(2, "0");
    };
    st.removeEventListener("scroll", st._report || function () {});
    st._report = report;
    st.addEventListener("scroll", report, { passive: true });
    report();
    return report;
  }

  /* Photographs ahead of a sideways scroll load before they are reached.
     They are lazy, and a lazy image is only asked for when it is nearly on
     screen — which on a phone, where one swipe crosses a whole frame, was too
     late: the next frame arrived blank and filled in a moment later. Each
     strip, once it is near the viewport, loads what lies within two and a
     half widths of where it is, and keeps doing so as it moves. */
  function loadAhead(st) {
    var edge = st.getBoundingClientRect().left + st.clientWidth * 2.5;
    [].forEach.call(st.querySelectorAll('img[loading="lazy"]'), function (im) {
      if (im.getBoundingClientRect().left < edge) {
        im.fetchPriority = "low";
        im.loading = "eager";
      }
    });
  }
  // Inline reading panels may overflow vertically on short screens or at
  // enlarged text sizes. A keyboard stop allows native scrolling of the copy.
  // Only a note that actually overflows becomes a stop; one that fits adds
  // nothing to scroll and would be an empty Tab on every project page.
  var readingNotes = [].slice.call(document.querySelectorAll("[data-rail] > .rail__note"));
  function noteStops() {
    readingNotes.forEach(function (note) {
      if (note.scrollHeight > note.clientHeight + 1) note.tabIndex = 0;
      else if (note !== document.activeElement) note.removeAttribute("tabindex");
    });
  }
  if (readingNotes.length) {
    afterFirstPaint(noteStops);
    window.addEventListener("resize", function () { requestAnimationFrame(noteStops); }, { passive: true });
    if (document.fonts) document.fonts.ready.then(noteStops);
    // Text size and spacing changes resize the copy without resizing the window.
    if ("ResizeObserver" in window) {
      var noteSize = new ResizeObserver(noteStops);
      readingNotes.forEach(function (note) {
        noteSize.observe(note);
        [].forEach.call(note.children, function (child) { noteSize.observe(child); });
      });
    }
  }
  function initialAhead(st) {
    openingPainted(function () { loadAhead(st); });
  }
  var aheadWatch = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { aheadWatch.unobserve(e.target); initialAhead(e.target); } });
  }, { rootMargin: "400px 0px" }) : null;
  [].forEach.call(document.querySelectorAll("[data-strip], [data-rail]"), function (st) {
    var tick = false;
    st.addEventListener("scroll", function () {
      if (tick) return; tick = true;
      requestAnimationFrame(function () { tick = false; loadAhead(st); });
    }, { passive: true });
    if (aheadWatch) aheadWatch.observe(st);
  });

  function stepRail(rail, direction) {
    if (!rail) return;
    rail._pin = false; rail._touched = true;
    var rtl = getComputedStyle(rail).direction === "rtl" ? -1 : 1;
    rail.scrollBy({ left: direction * rtl * rail.clientWidth * .7, behavior: reduced ? "auto" : "smooth" });
  }

  var browsableOverview = window.matchMedia("(max-width: 47.99rem), (max-width: 85.375rem) and (any-pointer: coarse), (hover: none) and (pointer: coarse)");
  function photographStrip(target) {
    var rail = target.closest && target.closest("[data-rail], .pcard__strip");
    // A closed card's caption covers the lower photograph area. A drag there
    // still browses the strip; a click retains the real project link.
    if (!rail && browsableOverview.matches && target.closest) {
      var caption = target.closest(".pcard:not([data-open=\"true\"]) [data-project]");
      if (caption) rail = caption.closest(".pcard").querySelector("[data-strip]");
    }
    return rail && (!rail.closest('.pcard:not([data-open="true"])') || browsableOverview.matches) ? rail : null;
  }

  /* One mouse drag for Studio, direct project pages and fetched project
     galleries. Wait for movement before capture so an ordinary click still
     opens the photograph. Touch keeps the browser's native swipe. */
  var galleryDrag = null, draggedGallery = null;
  document.addEventListener("pointerdown", function (e) {
    draggedGallery = null;
    var rail = photographStrip(e.target);
    if (!rail) return;
    rail._pin = false; rail._touched = true;
    if (e.pointerType === "touch" || e.button !== 0 || e.target.closest(".rail__note, figcaption") ||
        rail.scrollWidth <= rail.clientWidth + 1) return;
    galleryDrag = {rail: rail, pointer: e.pointerId, x: e.clientX, left: rail.scrollLeft, moved: false};
  });
  document.addEventListener("pointermove", function (e) {
    var drag = galleryDrag;
    if (!drag || e.pointerId !== drag.pointer) return;
    if (!e.buttons) { endGalleryDrag(e); return; }
    var dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      drag.rail.setAttribute("data-dragging", "");
      try { drag.rail.setPointerCapture(e.pointerId); } catch (error) {}
    }
    e.preventDefault();
    drag.rail.scrollLeft = drag.left - dx;
  });
  function endGalleryDrag(e) {
    var drag = galleryDrag;
    if (!drag || e.pointerId !== drag.pointer) return;
    galleryDrag = null;
    drag.rail.removeAttribute("data-dragging");
    if (drag.moved && e.type === "pointerup") draggedGallery = drag.rail;
    try { drag.rail.releasePointerCapture(e.pointerId); } catch (error) {}
  }
  document.addEventListener("pointerup", endGalleryDrag);
  document.addEventListener("pointercancel", endGalleryDrag);
  window.addEventListener("blur", function () {
    if (galleryDrag) endGalleryDrag({pointerId: galleryDrag.pointer, type: "pointercancel"});
  });
  document.addEventListener("dragstart", function (e) {
    if (photographStrip(e.target)) e.preventDefault(); // No native image ghost.
  });
  document.addEventListener("click", function (e) {
    var rail = draggedGallery;
    draggedGallery = null;
    var card = rail && rail.closest(".pcard");
    if (!rail || !e.detail || !(rail.contains(e.target) || card && card.contains(e.target))) return;
    e.preventDefault();
    e.stopImmediatePropagation(); // A drag never opens a viewer or closes a card.
  }, true);

  /* Keep wheel gestures native: vertical input scrolls the page, even over
     photographs. Dragging, arrows and horizontal gestures browse the strip. */

  document.addEventListener("click", function (e) {
    var button = e.target.closest("[data-gallery-step]");
    if (!button) return;
    var card = button.closest(".pcard");
    var nav = button.closest("[data-nav]");
    var rail = card ? card.querySelector("[data-strip]")
             : nav && nav.previousElementSibling && nav.previousElementSibling.matches("[data-rail]") ? nav.previousElementSibling
             : document.querySelector("[data-rail]");
    stepRail(rail, Number(button.dataset.galleryStep));
  });
  document.addEventListener("keydown", function (e) {
    var rail = e.target.closest("[data-rail]");
    if (!rail || document.querySelector('.lb[data-open="true"]') || ["ArrowLeft", "ArrowRight"].indexOf(e.key) < 0) return;
    e.preventDefault(); stepRail(rail, e.key === "ArrowRight" ? 1 : -1);
  });

  /* Standalone rails: a project's own page and the Studio. Re-measured once
     everything has loaded and on resize, since whether the photographs fit is
     a question of the window. */
  [].slice.call(document.querySelectorAll("[data-rail] + [data-nav]")).forEach(function (nav) {
    nav._fits = true;
    var report = railProgress(nav.previousElementSibling, nav);
    window.addEventListener("load", report);
    window.addEventListener("resize", report, { passive: true });
  });

  /* --- the studio's email and phone, on a computer ----------------------------
     A computer hands mailto: and tel: to another app, and when there is none —
     no calling app, mail kept in a browser tab — it drops the click without a
     word. The link highlighted on hover and then did nothing.

     So on a device with a mouse, a click copies what the link holds and a
     small tooltip over it says "Copied", then fades. The link's own words never
     change. The phone number is not dialled (there is nothing to dial with);
     the address still asks for a mail app as well, since nothing can tell
     whether one opened. Touch devices keep the ordinary behaviour — there, both
     work. Tried first and rejected: a green label beside the link, and swapping
     the link's own text for "Copied". */
  var desk = window.matchMedia("(hover: hover) and (pointer: fine)");
  var tip = null, tipTimer = null;

  function say(a, text, ms) {
    if (!tip) {
      tip = document.createElement("span");
      tip.className = "tip"; tip.setAttribute("role", "status");
      document.body.appendChild(tip);
    }
    tip.textContent = text;
    /* Placed in page coordinates, so it rides with the link if the page
       scrolls in the moment it is showing. */
    var r = a.getBoundingClientRect();
    tip.style.left = (r.left + r.width / 2 + window.scrollX) + "px";
    tip.style.top = (r.top + window.scrollY) + "px";
    tip.removeAttribute("data-show"); void tip.offsetWidth; tip.setAttribute("data-show", "");
    clearTimeout(tipTimer);
    tipTimer = setTimeout(function () { tip.removeAttribute("data-show"); }, ms);
  }

  /* The clipboard API refuses whenever the page is not focused or permission
     is withheld, and a refusal that ends in silence is the very fault this is
     here to fix. So: the API, then the older execCommand path, and if both
     fail the words are selected and the tooltip says how to copy them. */
  function legacyCopy(text) {
    var t = document.createElement("textarea");
    t.value = text; t.setAttribute("readonly", "");
    t.style.position = "fixed"; t.style.opacity = "0";
    document.body.appendChild(t); t.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (_) {}
    t.remove();
    return ok ? Promise.resolve() : Promise.reject();
  }
  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return legacyCopy(text);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"], a[href^="mailto:"]');
    if (!a || !desk.matches || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (a.getAttribute("href").indexOf("tel:") === 0) e.preventDefault();
    copy(a.textContent.trim()).then(function () { say(a, "Copied", 1400); }, function () {
      var range = document.createRange(); range.selectNodeContents(a);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
      say(a, /Mac|iP(hone|ad)/.test(navigator.platform) ? "Press ⌘C to copy" : "Press Ctrl+C to copy", 2600);
    });
  });

  /* The copy mark beside the studio's address and number (ContactLinks):
     the phone's way to take them away, since a tap on the words writes or
     dials. Same copy path and the same tooltip as the desktop click. */
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-copy]");
    if (!b) return;
    copy(b.getAttribute("data-copy")).then(function () { say(b, "Copied", 1400); }, function () {
      say(b, "Press and hold the words to copy", 2600);
    });
  });

  var pindex = document.querySelector("[data-pindex]");
  if (pindex) {
    var compactIndex = window.matchMedia("(max-width: 47.99rem), (max-width: 85.375rem) and (any-pointer: coarse)");
    var heads = [].slice.call(pindex.querySelectorAll("[data-project]"));
    var PEEK = 6;                     /* frames the card renders itself */
    var railCache = {};
    var expansionVersion = 0;
    var indexUrl = location.href;
    var onSpentEntry = !!(history.state && history.state.closedIndex === indexUrl);
    var baseTitle = document.title;

    /* Resolved to absolute NOW: pushState rewrites the document base, so a
       relative "projects/x.html" would resolve against /projects/ on the
       second open and 404. */
    var hrefBySlug = {};
    heads.forEach(function (h) {
      hrefBySlug[h.getAttribute("data-project")] = new URL(h.getAttribute("href"), location.href).href;
    });

    function absolutise(root, base) {
      root.querySelectorAll("img").forEach(function (im) {
        if (im.getAttribute("src")) im.src = new URL(im.getAttribute("src"), base).href;
        var ss = im.getAttribute("srcset");
        if (ss) {
          im.setAttribute("srcset", ss.split(",").map(function (part) {
            var bits = part.trim().split(/\s+/);
            if (!bits[0]) return part.trim();
            bits[0] = new URL(bits[0], base).href;
            return bits.join(" ");
          }).join(", "));
        }
      });
    }

    /* This page's OWN images have relative srcsets. pushState moves the
       document base, and the browser re-resolves srcset candidates against it
       whenever it re-picks one — so the index quietly started asking for
       /projects/assets/img/... and 404ing. Pin them to the real base up front. */
    absolutise(document, location.href);


    /* A kept thumbnail is drawn larger once its card opens, so it takes its
       frame's own `sizes`. Changing `sizes` on the visible image made the
       browser drop the drawn thumbnail before the larger file arrived: one or
       two blank frames as the card opened. The larger file is fetched and
       decoded off-screen first, so the visible image switches to a picture the
       browser already holds. A clock ends the wait if the network stalls. */
    function enlarge(im, sizes) {
      var picture = im.closest("picture");
      function apply() {
        if (picture) picture.querySelectorAll("source[srcset]").forEach(function (source) { source.sizes = sizes; });
        im.sizes = sizes;
      }
      var probe = (picture || im).cloneNode(true);
      var larger = probe.tagName === "IMG" ? probe : probe.querySelector("img");
      if (!larger || !larger.decode) { apply(); return; }
      larger.loading = "eager";
      larger.removeAttribute("fetchpriority");
      if (probe !== larger) probe.querySelectorAll("source[srcset]").forEach(function (source) { source.sizes = sizes; });
      larger.sizes = sizes;
      var done = false;
      function swap() { if (done) return; done = true; apply(); }
      larger.decode().then(swap, swap);
      window.setTimeout(swap, 8000);
    }

    function fetchRail(slug) {
      if (railCache[slug]) return Promise.resolve(railCache[slug]);
      return fetch(hrefBySlug[slug], { credentials: "same-origin" })
        .then(function (r) {
          if (!r.ok) throw new Error(r.status);
          return r.text();
        })
        .then(function (html) {
          var rail = new DOMParser().parseFromString(html, "text/html")
                       .querySelector("[data-rail]");
          if (!rail) throw new Error("no rail");
          /* The rail was rendered for the project's own page, so its src and
             srcset are relative to /projects/. Resolve them against the URL we
             fetched before inserting — relying on the two happening to resolve
             alike is luck, and it breaks the moment a category route nests
             one level deeper. */
          rail.querySelectorAll("img[fetchpriority]").forEach(function (im) {
            im.removeAttribute("fetchpriority");
          });
          // The project page holds its later photographs until its own first
          // one is painted. An opened card shows them at once, and DOMParser
          // (no scripting) parses each <noscript> copy into a real picture.
          undefer(rail);
          rail.querySelectorAll("noscript").forEach(function (copy) { copy.remove(); });
          absolutise(rail, hrefBySlug[slug]);
          railCache[slug] = rail;
          return rail;
        });
    }

    /* Warm the rail before it is asked for.
     *
     * Opening a project used to begin with a network round trip: click, fetch
     * the project's page, parse it, lift the rail out, insert, and only then do
     * the photographs start arriving. On a good connection that is a beat of
     * nothing happening; on a bad one it is the "takes a while to load up" that
     * made the whole interaction feel broken.
     *
     * So the page is fetched before the click. On a pointer, hovering a card is
     * the strongest possible signal of intent and buys a few hundred
     * milliseconds. Everywhere else — touch, keyboard — cards warm themselves
     * as they scroll into view, during idle time, one at a time so a phone on a
     * slow connection is never fetching four pages at once. Nothing is
     * rendered; it only fills the cache the click already reads from. */
    var warming = {};

    function warm(slug) {
      if (!slug) return Promise.resolve();
      if (warming[slug]) return warming[slug];
      if (railCache[slug]) return Promise.resolve();
      warming[slug] = fetchRail(slug).then(function (rail) {
        /* Fetching the markup is only half of it: the photographs it references
           have not been asked for yet, and the first one is what the reader
           looks at the instant the card opens. Pull that one now, off-screen,
           so it is in the browser's cache before it is inserted. The rest can
           arrive as the strip is scrolled. */
        var first = rail && rail.querySelector("img");
        if (!first) return;
        return new Promise(function (resolve) {
          var pre = new Image();
          pre.onload = pre.onerror = function () { pre.onload = pre.onerror = null; resolve(); };
          pre.fetchPriority = "low";
          if (first.getAttribute("sizes")) pre.sizes = first.getAttribute("sizes");
          if (first.getAttribute("srcset")) pre.srcset = first.getAttribute("srcset");
          pre.src = first.getAttribute("src");
          if (pre.complete) { pre.onload = pre.onerror = null; resolve(); }
        });
      }).catch(function () { delete warming[slug]; });
      /* Automatic warming runs one project at a time. A request that never
         answers must not stop the queue for good, so each step also ends on a
         clock; the request itself carries on and still fills the cache. */
      warming[slug] = Promise.race([warming[slug], new Promise(function (resolve) { setTimeout(resolve, 10000); })]);
      return warming[slug];
    }

    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); };

    [].slice.call(pindex.querySelectorAll("[data-project]")).forEach(function (h) {
      var slug = h.getAttribute("data-project");
      h.closest(".pcard").addEventListener("pointerenter", function () { warm(slug); });
      h.addEventListener("focus", function () { warm(slug); });
    });

    if ("IntersectionObserver" in window) {
      var queue = [];
      var draining = false;
      var openingShown = false;
      function drain() {
        // Idle only describes CPU availability; the opening photograph may
        // still be using a slow connection. Automatic work waits for it.
        if (draining || !queue.length || !openingShown) return;
        draining = true;
        idle(function () {
          var slug = queue.shift();
          warm(slug).then(function () {
            draining = false;
            if (queue.length) setTimeout(drain, 300);
          });
        });
      }
      openingPainted(function () { openingShown = true; drain(); });
      var warmer = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          warmer.unobserve(e.target);
          var h = e.target.querySelector("[data-project]");
          if (h) { queue.push(h.getAttribute("data-project")); drain(); }
        });
      }, { rootMargin: "200px" });
      [].slice.call(pindex.querySelectorAll(".pcard")).forEach(function (c) { warmer.observe(c); });
    }

    var openCard = null;

    function cardOf(slug) { return pindex.querySelector('[data-card="' + slug + '"]'); }

    function strip(card) { return card.querySelector("[data-strip]"); }

    /* Our own tween rather than scrollTo({behavior:"smooth"}). The native one
       cannot be relied on to finish exactly where it was aimed — it left the
       strip a few pixels short of zero, which hung the note past the edge of a
       mirrored card and clipped its text — and it ignores any attempt to
       correct the position while it is still in flight. This lands on the
       number, every time, and stops the moment the reader takes hold. */
    function settleTo(st, card, target, dur) {
      var from = st.scrollLeft, t0 = performance.now();
      if (from === target) return;
      st._anim = true;
      (function step(now) {
        if (st._touched || openCard !== card) { st._anim = false; return; }
        var k = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        st.scrollLeft = from + (target - from) * e;
        if (k < 1) requestAnimationFrame(step);
        else { st.scrollLeft = target; st._anim = false; }   /* exact, not nearly */
      })(t0);

      /* A frame loop is not a guarantee. Throttle the tab — or simply put it in
         the background while a card is open — and rAF stops, stranding the
         strip wherever the last frame left it, with the note half off the edge.
         A timer lands it on the number whatever happened to the frames. */
      window.setTimeout(function () {
        if (!st._touched && openCard === card) { st.scrollLeft = target; }
        st._anim = false;
      }, dur + 120);
    }



    /* Keep one element pinned to its place on screen while the layout moves
       under it. A single before/after measurement only works if the change is
       instant; once both the closing and the opening card animate, the height
       is in flight for the whole transition and has to be tracked. Bails out
       the moment the reader scrolls — their intent outranks ours. */
    var cancelAnchor = null;
    function anchor(card, ms) {
      if (cancelAnchor) cancelAnchor();
      var target = card.getBoundingClientRect().top;
      var until = performance.now() + ms;
      var live = true;
      // The browser can choose the footer outside .pindex as its anchor.
      // Reserving space then scrolls the page before the cards even change.
      document.documentElement.setAttribute("data-project-anchoring", "");
      function release() {
        live = false;
        window.removeEventListener("wheel", release);
        window.removeEventListener("touchstart", release);
        window.removeEventListener("keydown", release);
        document.documentElement.removeAttribute("data-project-anchoring");
        if (cancelAnchor === release) cancelAnchor = null;
      }
      cancelAnchor = release;
      window.addEventListener("wheel", release, { once: true, passive: true });
      window.addEventListener("touchstart", release, { once: true, passive: true });
      window.addEventListener("keydown", release, { once: true });
      function place() {
        if (!live) return;
        var d = card.getBoundingClientRect().top - target;
        if (Math.abs(d) > 0.5) window.scrollBy(0, d);
      }
      requestAnimationFrame(function step(now) {
        if (!live) return;
        place();
        if (now < until) requestAnimationFrame(step);
        else release();
      });
      // Reduced motion still needs a synchronous correction for instant
      // layout changes. Holding position does not animate the page.
      return place;
    }

    /* Closing is a real gesture now, not a snap. The card shrinks and its
       photographs wipe back down; the injected markup is only removed once
       that has finished, so there is something to animate. Re-opening the same
       card completes the old clean-up before starting a fresh expansion. */
    /* Closing: the card collapses and the note scrolls off the edge at the same
       time — one continuous movement, which is what this looked like when it
       read best.

       The single thing that went wrong with it was at the very end. The strip's
       scrollable range comes from the width of its photographs, and those
       narrow as the card shrinks, so the note could not be carried all the way
       out; whatever was left over landed as one abrupt jump when the clean-up
       ran. The fix is to stop the range collapsing rather than to re-stage the
       animation: the strip's height is frozen at its open value for the length
       of the close, so the photographs keep their width and the scroll can
       finish. The card still shrinks — it simply crops the strip as it goes.

       Two rewrites of this happened before that: collapsing the note's width
       animated a layout property every frame and jittered against the height
       transition, and splitting the close into two sequential phases lost the
       single continuous movement. Neither is worth repeating. */
    function shut(card, instant) {
      if (!card || card._closing) return;

      var st = strip(card);
      if (st._report) { st.removeEventListener("scroll", st._report); st._report = null; }
      if (st._correct) { st.removeEventListener("scroll", st._correct); st._correct = null; }
      st._pin = false;
      card.querySelector("[data-project]").setAttribute("aria-expanded", "false");

      function finish() {
        card._closing = false;
        card._shutting = null;
        card._finish = null;
        /* Drop the transform and delete the note in the same frame: the shift
           was exactly the space the note occupied, so the photographs do not
           move by so much as a pixel. */
        card.removeAttribute("data-closing");
        st.style.removeProperty("--close-shift");
        st.style.removeProperty("--close-dur");
        [].slice.call(st.children).forEach(function (el) {
          if (!el.classList.contains("pcard__peek")) el.remove();
        });
        var below = card.querySelector(":scope > .rail__note");
        if (below) below.remove();
        st.scrollLeft = 0;
        var nav = card.querySelector("[data-nav]");
        if (nav) nav.hidden = true;
      }

      card._finish = finish;
      var lead = st.querySelector(".rail__note");
      card.removeAttribute("data-open");
      // Navigation disappears with the collapse, not in the delayed clean-up.
      var closingNav = card.querySelector("[data-nav]");
      if (closingNav) closingNav.hidden = true;
      st.tabIndex = browsableOverview.matches ? 0 : -1;
      st.querySelectorAll('.rail__f[role="button"]').forEach(function (f) { f.tabIndex = -1; });

      if (instant || reduced || !lead) { finish(); return; }

      card._closing = true;

      /* The reader does not leave a project at its beginning. They scroll into
         it, and the card has to come back from wherever they stopped — which
         may be thousands of pixels, not the width of the note. Earlier this
         assumed a resting scroll of zero, so anyone who had actually looked
         through a project got the whole distance dumped in a single frame when
         they opened the next one.

         The displacement is therefore the note's width PLUS however far the
         strip is scrolled, and the duration grows with it so a long way back
         does not become a blur. Still one transform, still on the compositor. */
      var gap = parseFloat(getComputedStyle(st).columnGap) || 0;
      var lead_w = -(lead.getBoundingClientRect().width + gap);
      var shift = st.scrollLeft + lead_w;
      var travel = Math.abs(shift);
      var dur = Math.min(CLOSE_SLIDE_MAX, Math.max(340, 340 + travel * 0.16));

      st.style.setProperty("--close-shift", shift + "px");
      st.style.setProperty("--close-dur", Math.round(dur) + "ms");
      card.setAttribute("data-closing", "");

      card._shutting = window.setTimeout(finish, Math.round(dur) + 40);
    }

    /* Bound the sideways close slide. */
    var CLOSE_SLIDE_MAX = 640;

    var holdTimer = null;
    function holdHeight(px) {
      pindex.style.setProperty("--hold", px + "px");
      pindex.setAttribute("data-holding", "");
      if (holdTimer) clearTimeout(holdTimer);
      /* Released WHILE the anchor is still running. Letting go of the reserved
         height shortens the document, and if the reader is near the end the
         browser clamps the scroll — a small lurch right at the finish. Handing
         it back inside the anchor's window means that clamp is compensated like
         any other movement, instead of landing after everything has stopped. */
      holdTimer = window.setTimeout(function () {
        pindex.removeAttribute("data-holding");
        holdTimer = null;
      }, DUR.hover + 200);   /* the closing card's collapse, and a little */
    }

    function closeAll(push) {
      expansionVersion++;
      if (!openCard) return;
      var card = openCard;
      openCard = null;
      // Pure closes need no reserved space: near the document end it cannot
      // be compensated, and releasing it creates a final scroll clamp. The
      // card is still held under the reader while it collapses (P10); without
      // that, a phone's tall open card let scroll anchoring move the page.
      var place = anchor(card, CLOSE_SLIDE_MAX + 120);
      shut(card);
      place();
      document.title = baseTitle;
      if (push) {
        /* Closing never traverses history. history.back() made both engines
           restore the index entry's saved scroll, so the page jumped back to
           where the card was opened, and its late popstate could cancel a card
           opened straight afterwards. The project entry becomes a spent index
           entry instead; the next open reuses it and Back skips it, so history
           never grows by more than one step. */
        if (history.state && history.state.projectIndex === indexUrl) {
          history.replaceState({ closedIndex: indexUrl }, "", indexUrl);
          onSpentEntry = true;
        } else history.replaceState(history.state && history.state.closedIndex === indexUrl ? history.state : {}, "", indexUrl);
      }
    }

    function expand(slug, push) {
      var card = cardOf(slug);
      if (!card) return Promise.reject(new Error("no card"));
      if (openCard === card) { closeAll(push); return Promise.resolve(); }

      var version = ++expansionVersion;
      return fetchRail(slug).then(function (rail) {
        if (version !== expansionVersion) return;
        /* Both cards move at once — the old one shrinking, the new one growing
           — and the card under the pointer is held still for the whole of it.
           Anchoring starts BEFORE either transition so the first frame is
           already compensated. */
        /* A closing card above this one removes its height, and if the reader
           is near the end of the page there is no scroll range left to
           compensate with — the browser clamps and the card jumps hundreds of
           pixels. Hold the document at its current height for the length of the
           transition so the anchor always has somewhere to go. */
        /* The space has to be reserved BEFORE the old card collapses. The
           browser clamps scrollTop the instant the document gets shorter, so
           padding added afterwards is already too late — the position is gone.
           The closing card's current height is the upper bound on what is about
           to disappear, so reserve exactly that. */
        var prev = openCard;
        var placeCard = anchor(card, DUR.slow + 200);
        if (prev && prev !== card) holdHeight(Math.ceil(prev.getBoundingClientRect().height));
        if (prev) {
          var previousStrip = strip(prev);
          if (compactIndex.matches && previousStrip.getBoundingClientRect().bottom <= 0) {
            // A phone has already scrolled past these photographs. Finish their
            // height change now instead of laying out two galleries and scrolling
            // the whole page on every frame just to animate an unseen strip.
            previousStrip.style.transitionDuration = "0s";
            shut(prev, true);
            void previousStrip.offsetHeight;
            previousStrip.style.removeProperty("transition-duration");
          } else shut(prev);
        }

        if (card._shutting) clearTimeout(card._shutting);
        if (card._finish) card._finish();
        card._closing = false;
        var st = strip(card);

        /* The card already shows PEEK frames, so injection starts after them —
           slicing from the wrong index silently duplicated photographs. */
        var figs = [].slice.call(rail.querySelectorAll(".rail__f")).slice(PEEK);

        /* Kept thumbnails are drawn larger once open: each takes its own
           frame's `sizes` (railSizes, media.ts) or stays on the thumbnail file. */
        var railImgs = rail.querySelectorAll(".rail__f img");
        st.querySelectorAll(".pcard__peek img[srcset]").forEach(function (im, k) {
          var own = railImgs[k] && railImgs[k].getAttribute("sizes");
          if (own && im.getAttribute("sizes") !== own) enlarge(im, own);
        });

        /* Inject once. Expanding a card that is already expanded appended the
           remaining frames a second time — the last photograph appearing twice
           in the strip, and twice in the viewer. Reachable by clicking a card
           that is already open, which nothing prevents. */
        if (st.querySelector(".rail__f:not(.pcard__peek)")) figs = [];

        /* The note lands on the same side as the card's caption, so a card
           reads the same way round open as closed. The gesture is identical
           either way — the photographs never move, then the strip slides to
           reveal the text; only the direction differs, which is what makes it
           a mirror rather than a second animation.

           Phones and tablets keep the note below the strip: it stays fully
           readable without taking width from the compact photograph row. */
        var narrow = compactIndex.matches;
        var note = rail.querySelector(".rail__note");
        var noteEl = null;
        figs.forEach(function (f) { st.appendChild(f.cloneNode(true)); });

        if (note) {
          noteEl = note.cloneNode(true);
          if (narrow) card.appendChild(noteEl);
          else st.insertBefore(noteEl, st.firstChild);   /* rtl puts it on the right */
        }

        card.querySelector("[data-project]").setAttribute("aria-expanded", "true");
        openCard = card;
        st.querySelectorAll('.rail__f[role="button"]').forEach(function (f) { f.tabIndex = 0; });

        /* flush before opening, or the wipes have no closed state to start from */
        void st.offsetHeight;
        card.setAttribute("data-open", "true");
        st.tabIndex = -1; // Open photographs own the sequential keyboard stops.

        if (noteEl && !narrow) {
          var gap = parseFloat(getComputedStyle(st).columnGap) || 0;
          var offset = noteEl.getBoundingClientRect().width + gap;

          /* The note is inserted at the strip's START, which pushes the
             photographs off their place — right in an ltr card, left in an rtl
             one. Cancel it by scrolling the same distance, then ease back to
             the resting position so the text arrives under its own steam.
             An rtl strip rests at 0 and scrolls negative, so the two hands need
             the same number with opposite signs and nothing else differs.

             Setting it once is not enough: while the card is still growing the
             photographs are shorter and therefore narrower, the strip has less
             scrollable range than the note occupies, and the value clamps — the
             first image lurched ~110px. Re-assert every frame until the growth
             is done. */
          var hold = offset;
          if (reduced) {
            st.scrollLeft = 0;
          } else {
            /* Touching the strip cancels the reveal outright. An animation that
               keeps re-asserting a position while the reader is dragging is the
               worst kind of fight: they move it, it moves back. The frame
               budget is a count as well as a clock, because a throttled tab
               stretches 620ms of wall time across very few frames and the loop
               would otherwise still be running minutes later. */
            st._pin = true;
            var until = performance.now() + DUR.slow - 80, frames = 0;   /* the growth, all but its tail */
            (function pin(now) {
              if (!st._pin || openCard !== card) return;
              st.scrollLeft = hold;
              if (now < until && ++frames < 60) requestAnimationFrame(pin);
              else { st._pin = false; settleTo(st, card, 0, DUR.hover); }
            })(performance.now());

            /* The pin must end on a clock, not on frames. Throttle the tab and
               rAF all but stops: the loop then keeps re-asserting its held
               position long after it should have released, overriding the
               settle and stranding the strip with the note off the edge. */
            window.setTimeout(function () {
              if (st._pin && openCard === card) { st._pin = false; settleTo(st, card, 0, DUR.hover); }
            }, DUR.slow);
          }
        }

        /* The strip settles to a resting scroll of 0, but its photographs are
           lazy: each one that finishes loading changes the content width, and
           an rtl scroller re-anchors against that. The result drifted a few
           pixels off zero and left the note hanging past the edge with its text
           clipped. Re-assert the rest position as they land — never while the
           reveal is still running, and never once the reader has taken hold. */
        st._touched = false;

        /* A phone opened from a frame part-way along the strip keeps that frame
           where the reader left it while every frame grows, then leaves the
           strip to them. The first frame needs nothing only when the strip is
           already at rest: a swipe can stop with it still partly in view, and
           tapping it then must bring it back to the column too. */
        var chosen = card._chosen; card._chosen = null;
        if (narrow && chosen && (chosen.previousElementSibling || st.scrollLeft > 0)) {
          st._touched = true;
          var pad = parseFloat(getComputedStyle(st).scrollPaddingLeft) || 0;
          var place = function () {
            st.scrollLeft = chosen.getBoundingClientRect().left - st.getBoundingClientRect().left + st.scrollLeft - pad;
          };
          var followUntil = performance.now() + (reduced ? 0 : DUR.slow + 80);
          st._follow = true;
          (function follow(now) {
            if (!st._follow || openCard !== card) return;
            place();
            if (now < followUntil) requestAnimationFrame(follow); else st._follow = false;
          })(performance.now());
          window.setTimeout(function () { if (st._follow && openCard === card) { place(); st._follow = false; } }, DUR.slow + 120);
        }

        /* Hold the resting position while the photographs finish arriving.

           Each lazy image that lands widens the strip, and the browser
           re-anchors the scroller to preserve what is on screen. In a mirrored
           (rtl) strip the content grows leftward, so that adjustment walks the
           scroll a few pixels off zero — enough to hang the note past the edge
           and clip its text. `overflow-anchor: none` is the property for this
           and it is simply not honoured here, so the position is held directly.
           Bounded in time, abandoned the instant the reader takes hold, and it
           only ever corrects an actual deviation. */
        /* Corrected on the scroll event, not on a frame loop. Each lazy
           photograph that lands widens the strip and the browser re-anchors the
           scroller to preserve what is on screen; in a mirrored (rtl) strip the
           content grows leftward, so that walks the position a few pixels off
           zero — enough to hang the note past the edge and clip its text.
           `overflow-anchor: none` is the property for this and is not honoured
           here. A frame loop is no good either: it is throttled to nothing in a
           background tab, which is exactly when images are still arriving.
           The scroll event fires either way. */
        st._correct = function () {
          if (st._pin || st._anim || st._touched || openCard !== card) return;
          if (st.scrollLeft !== 0) st.scrollLeft = 0;
        };
        st.addEventListener("scroll", st._correct, { passive: true });

        /* Position + progress. A passive listener on this one strip — not on
           the page (R10 forbids that); there is no other way to report where a
           horizontal scroller has got to. */
        var nav = card.querySelector("[data-nav]");
        if (nav) { nav.hidden = false; railProgress(st, nav); }
        loadAhead(st);
        placeCard();

        document.title = (rail.getAttribute("data-title") || "Project") + " — btl architects";
        if (push) {
          // One in-page project entry above its originating index. Switching
          // replaces that entry; closing consumes it. URLs stay shareable.
          var state = { slug: slug, projectIndex: indexUrl };
          if (history.state && (history.state.projectIndex === indexUrl || history.state.closedIndex === indexUrl))
            history.replaceState(state, "", hrefBySlug[slug]);
          else history.pushState(state, "", hrefBySlug[slug]);
          onSpentEntry = false;
        }
      });
    }

    /* The whole card opens it, not only the caption. A photograph that looks
       clickable and is not is the least intuitive thing an index can do. The
       caption stays a real <a> underneath for keyboard, middle-click and
       no-JavaScript, but the pointer target is the entire card. */
    /* Closed strips scroll in phone/tablet layouts and on touch screens of any width. The
       note's placement follows width independently of the input. */
    var browsableIndex = browsableOverview;
    /* Scrollable strips join the keyboard order too. A wide mouse layout
       stays out, or Firefox lists every closed scroll container as a stop. */
    function strips() {
      [].slice.call(pindex.querySelectorAll("[data-strip]")).forEach(function (st) {
        var name = st.closest(".pcard").querySelector(".pcard__name");
        st.tabIndex = browsableIndex.matches && st.closest(".pcard").getAttribute("data-open") !== "true" ? 0 : -1;
        if (browsableIndex.matches) { st.setAttribute("role", "region"); st.setAttribute("aria-label", (name ? name.textContent : "Project") + " photographs"); }
        else { st.removeAttribute("role"); st.removeAttribute("aria-label"); }
      });
    }
    strips();
    browsableIndex.addEventListener("change", strips);
    // Rotation and split view can cross the tablet/desktop boundary while a
    // gallery is open. Move its note with the layout, retaining the visible
    // photograph and the current project history entry.
    compactIndex.addEventListener("change", function () {
      if (!openCard) return;
      var st = strip(openCard);
      var note = st.querySelector(".rail__note") || openCard.querySelector(":scope > .rail__note");
      if (!note) return;
      var edge = st.getBoundingClientRect().left;
      var frame = [].slice.call(st.querySelectorAll(".rail__f")).find(function (f) { return f.getBoundingClientRect().right > edge; });
      var left = frame ? frame.getBoundingClientRect().left : 0;
      st._pin = false; st._follow = false; st._touched = true;
      if (compactIndex.matches) openCard.appendChild(note);
      else st.insertBefore(note, st.firstChild);
      if (frame) st.scrollLeft += frame.getBoundingClientRect().left - left;
    });
    [].slice.call(pindex.querySelectorAll("[data-strip]")).forEach(function (st) {
      var card = st.closest(".pcard"), tick = false;
      st.addEventListener("scroll", function () {
        if (tick) return; tick = true;
        requestAnimationFrame(function () {
          tick = false;
          card.toggleAttribute("data-strip-moved", browsableIndex.matches && st.scrollLeft > 24);
        });
      }, { passive: true });
    });
    [].slice.call(pindex.querySelectorAll(".pcard")).forEach(function (card) {
      var slug = card.getAttribute("data-card");
      var downAt = null;

      card.addEventListener("pointerdown", function (ev) { downAt = [ev.clientX, ev.clientY]; });

      card.addEventListener("click", function (ev) {
        /* let the browser handle modified clicks on the real link */
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button) return;
        /* A drag along the open strip ends in a click event — not a choice.
           Only a pointer can drag, and each press is measured once. The press
           used to be kept forever, and a click from the keyboard (detail 0)
           lands at 0,0 — so after any mouse use of a card, Enter measured as a
           long drag from the old press and was handed to the browser as a full
           page load. Escape puts focus on this link, inviting exactly that. */
        var from = downAt;
        downAt = null;
        if (ev.detail !== 0 && from && Math.abs(ev.clientX - from[0]) + Math.abs(ev.clientY - from[1]) > 8) return;

        if (ev.target.closest("[data-project-close]")) { ev.preventDefault(); closeAll(true); card.querySelector("[data-project]").focus({preventScroll:true}); return; }
        var onCaption = !!(ev.target.closest && ev.target.closest("[data-project]"));
        if (card.getAttribute("data-open") === "true") {
          if (onCaption) { ev.preventDefault(); closeAll(true); }
          return;                      /* clicking a photograph inside is not a close */
        }
        ev.preventDefault();
        /* On a phone the closed strip can already be swiped, so the frame that
           was tapped is the one the reader chose; the card opens around it. */
        card._chosen = browsableIndex.matches && ev.target.closest ? ev.target.closest(".rail__f") : null;
        expand(slug, true).catch(function () { location.href = hrefBySlug[slug]; });
      });
    });

    document.addEventListener("keydown", function (ev) {
      if (!openCard || document.querySelector('.lb[data-open="true"], .menu[data-open="true"]')) return;
      if (!openCard.contains(document.activeElement) || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      var st = strip(openCard);
      if (ev.key === "Escape") {
        ev.preventDefault();
        var link = openCard.querySelector("[data-project]");
        closeAll(true);
        link.focus({ preventScroll: true });
      } else if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        st._touched = true;
        st.scrollBy({ left: (ev.key === "ArrowRight" ? 1 : -1) * (getComputedStyle(st).direction === "rtl" ? -1 : 1) * st.clientWidth * 0.7,
                      behavior: reduced ? "auto" : "smooth" });
      }
    });

    /* Native horizontal wheel gestures also outrank the automatic reveal.
       Mouse dragging is handled by the shared gallery interaction above. */
    [].slice.call(pindex.querySelectorAll("[data-strip]")).forEach(function (st) {
      st.addEventListener("wheel", function () { st._pin = false; st._touched = true; }, { passive: true });
      st.addEventListener("touchstart", function () { st._pin = false; st._follow = false; st._touched = true; }, { passive: true });
    });

    window.addEventListener("popstate", function (ev) {
      var leftSpent = onSpentEntry;
      onSpentEntry = !!(ev.state && ev.state.closedIndex === indexUrl);
      var slug = ev.state && ev.state.slug;
      if (slug) {
        if (!openCard || openCard.getAttribute("data-card") !== slug) expand(slug, false).catch(function () { location.href = hrefBySlug[slug]; });
      } else if (openCard) closeAll(false);
      /* Back from a spent entry lands on an identical index; one press should
         leave the page, as it would have before a project was viewed. */
      else if (leftSpent && !onSpentEntry) history.back();
    });

    /* A restored index document can carry project state (for example bfcache).
       A full reload at the shareable URL correctly serves the project page. */
    if (history.state && history.state.slug) expand(history.state.slug, false);
  }


  /* The navigation indicator that used to live here is gone. Each link draws
     its own underline in CSS now, which needs no measuring, no resize handling
     and no JavaScript — and matches how every other link on the site behaves. */
})();

  /* --- 4b. leaving for another page ----------------------------------------
     A tap on a link to another page used to show nothing until that page had
     arrived — a second on a phone network — so it read as a tap that missed.
     Two things now. The link answers at once: an onward link's green line
     runs out to the right, any other dims (components.css, [data-going]). And
     the page it points at is fetched ahead: onward and previous/next links as
     they come near the screen, any link on this site the moment a finger
     lands on it, so the tap usually finds the page already here. */
  (function () {
    var asked = {};
    function same(a) {
      return a && a.href && a.origin === location.origin && !a.hasAttribute("download") &&
             (!a.target || a.target === "_self") && a.pathname !== location.pathname;
    }
    function fetchAhead(a) {
      if (!same(a) || asked[a.pathname]) return;
      asked[a.pathname] = true;
      var l = document.createElement("link");
      l.rel = "prefetch"; l.href = a.pathname;
      document.head.appendChild(l);
    }
    function watchOnward() {
      if (!("IntersectionObserver" in window)) return;
      var near = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { near.unobserve(e.target); fetchAhead(e.target); } });
      }, { rootMargin: "300px 0px" });
      [].forEach.call(document.querySelectorAll("a.onward, .pager a"), function (a) { near.observe(a); });
    }
    // Speculative pages must not compete with the opening photograph. A press
    // still prefetches immediately; automatic warming follows its first paint.
    function warmOnward() {
      (window.requestIdleCallback || function (fn) { setTimeout(fn, 200); })(watchOnward);
    }
    if (document.documentElement.hasAttribute("data-opening-shown")) warmOnward();
    else document.addEventListener("btl:opening-shown", warmOnward, { once: true });
    document.addEventListener("pointerdown", function (e) {
      fetchAhead(e.target.closest && e.target.closest("a[href]"));
    }, { passive: true });
    /* Marked only once the click has finished travelling, so anything that
       takes it over — the Press card, a project card — has said so with
       preventDefault by then, wherever its listener sits. Marked any earlier,
       a Press cover that opened its card stayed dimmed behind it. */
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!same(a) || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      setTimeout(function () { if (!e.defaultPrevented) a.setAttribute("data-going", ""); }, 0);
    });
    window.addEventListener("pageshow", function () {
      [].forEach.call(document.querySelectorAll("[data-going]"), function (a) { a.removeAttribute("data-going"); });
    });
  })();

  /* --- 5. the viewer --------------------------------------------------------
     A photograph on its own, at whatever size the reader wants.

     Three input languages, one model. A mouse zooms with a click or the wheel
     and pans by simply moving (see follow); fingers zoom by pinching or a tap
     and pan by dragging; a keyboard steps
     with the arrows and zooms with + and -. They all move the same two numbers
     — a scale and an offset — so there is no separate touch mode to keep in
     step with a separate mouse mode.

     The one rule that makes zooming feel right: it anchors on the pointer, or
     on the midpoint between two fingers, never on the centre of the image. Zoom
     about the centre and the thing you were looking at slides away from you,
     which is why so many viewers feel like wrestling.

     Everything is transform-only, so nothing here touches layout. */
  (function () {
    var lb = null, stage = null, img = null, capEl = null, countEl = null;
    var prevBtn = null, nextBtn = null;
    var items = [], at = 0, lastFocus = null, scrollY = 0;
    var scale = 1, tx = 0, ty = 0, natural = { w: 0, h: 0 };
    var idleTimer = null;

    /* The candidate that fills this screen, not the largest one. The rail is
       showing a size chosen for a strip, and the viewer must show more than
       that — but it used to take the largest file in the srcset, 2800 or 4000
       pixels, for every photograph, so on a phone each swipe waited on a
       download several times bigger than the screen could show. The fitted
       size is enough until the reader zooms, and sharpen() fetches more
       detail then. */
    function bestSrc(el) {
      var ss = el.getAttribute("srcset");
      if (!ss) return el.currentSrc || el.src;
      var ratio = (+el.getAttribute("width") || el.naturalWidth || 3) / (+el.getAttribute("height") || el.naturalHeight || 2);
      var need = Math.min(window.innerWidth * 0.92, window.innerHeight * 0.88 * ratio) * (window.devicePixelRatio || 1);
      var all = ss.split(",").map(function (part) {
        var bits = part.trim().split(/\s+/);
        return { src: bits[0], w: parseInt(bits[1], 10) || 0 };
      }).filter(function (c) { return c.src; }).sort(function (x, y) { return x.w - y.w; });
      var fit = all.filter(function (c) { return c.w >= need; })[0] || all[all.length - 1];
      return fit ? fit.src : el.currentSrc || el.src;
    }

    function build() {
      lb = document.createElement("div");
      lb.className = "lb";
      lb.setAttribute("role", "dialog");
      lb.setAttribute("aria-modal", "true");
      lb.setAttribute("aria-label", "Photograph viewer");
      lb.setAttribute("data-open", "false");
      lb.setAttribute("data-idle", "false");
      lb.innerHTML =
        '<div class="lb__stage" data-stage>' +
          '<img class="lb__img" alt="" draggable="false">' +
        '</div>' +
        '<div class="lb__bar">' +
          '<span class="lb__count" data-count aria-live="polite"></span>' +
          '<button class="lb__x" type="button" data-close>Close' +
            '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
          '</button>' +
        '</div>' +
        '<button class="lb__step lb__step--prev" type="button" data-prev aria-label="Previous photograph">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M15 4L7 12l8 8"/></svg></button>' +
        '<button class="lb__step lb__step--next" type="button" data-next aria-label="Next photograph">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.25"><path d="M9 4l8 8-8 8"/></svg></button>' +
        '<p class="lb__cap" data-cap></p>';
      document.body.appendChild(lb);

      stage = lb.querySelector("[data-stage]");
      img = lb.querySelector(".lb__img");
      capEl = lb.querySelector("[data-cap]");
      countEl = lb.querySelector("[data-count]");
      prevBtn = lb.querySelector("[data-prev]");
      nextBtn = lb.querySelector("[data-next]");

      lb.querySelector("[data-close]").addEventListener("click", close);
      prevBtn.addEventListener("click", function (e) { e.stopPropagation(); step(-1); });
      nextBtn.addEventListener("click", function (e) { e.stopPropagation(); step(1); });
      wireGestures();
    }

    /* --- the transform ----------------------------------------------------- */

    /* settle: true eases to the new position (a click, a reset); "follow" is a
       short glide for a view steered continuously by the mouse or the wheel;
       false tracks exactly, for a finger, which must never lag. */
    function apply(settle) {
      img.setAttribute("data-settling", settle === "follow" ? "follow" : settle ? "true" : "false");
      img.style.transform =
        "translate(-50%, -50%) translate(" + tx + "px, " + ty + "px) scale(" + scale + ")";
      var z = scale > 1.01;
      lb.setAttribute("data-zoomed", z ? "true" : "false");
      stage.setAttribute("data-zoomed", z ? "true" : "false");
    }

    function reset(settle) { scale = 1; tx = 0; ty = 0; apply(settle); }

    /* Keep the photograph from being dragged off into the dark. The bounds are
       whatever the scaled image overhangs the stage by; below 1:1 there is
       nothing to pan and it returns to centre. */
    function clamp() {
      var r = stage.getBoundingClientRect();
      var w = natural.w * scale, h = natural.h * scale;
      var maxX = Math.max(0, (w - r.width) / 2);
      var maxY = Math.max(0, (h - r.height) / 2);
      tx = Math.min(maxX, Math.max(-maxX, tx));
      ty = Math.min(maxY, Math.max(-maxY, ty));
    }

    /* Zoom about a point, so whatever is under the pointer stays under it. */
    function zoomAt(nextScale, cx, cy, settle) {
      nextScale = Math.min(MAX_SCALE, Math.max(1, nextScale));
      var r = stage.getBoundingClientRect();
      var ox = cx - r.left - r.width / 2;
      var oy = cy - r.top - r.height / 2;
      var k = nextScale / scale;
      tx = ox - (ox - tx) * k;
      ty = oy - (oy - ty) * k;
      scale = nextScale;
      clamp();
      apply(settle || false);
      sharpen();
    }
    var MAX_SCALE = 6;

    /* With a mouse the view follows the pointer: move toward an edge of the
       screen and that edge of the photograph comes into view, with no button
       held. Dragging a zoomed photograph around with a grab cursor is how a
       phone has to do it; on a desk it made looking at a detail feel like
       moving furniture. The pointer's position across the photograph's fitted
       frame maps onto the whole pan range, so every part is reachable without
       leaving the frame — and a click zooms to the spot that was clicked,
       because the same mapping that pans the view also places it. */
    var steering = false;   /* the last pointer was a mouse */
    function follow(x, y) {
      var r = stage.getBoundingClientRect();
      var maxX = Math.max(0, (natural.w * scale - r.width) / 2);
      var maxY = Math.max(0, (natural.h * scale - r.height) / 2);
      var fx = (x - (r.left + (r.width - natural.w) / 2)) / (natural.w || 1);
      var fy = (y - (r.top + (r.height - natural.h) / 2)) / (natural.h || 1);
      fx = Math.min(1, Math.max(0, fx)); fy = Math.min(1, Math.max(0, fy));
      tx = maxX * (1 - 2 * fx);
      ty = maxY * (1 - 2 * fy);
    }

    /* How far a click zooms: to the photograph's own detail — one pixel of the
       file to one pixel of the screen — within 2x to 4x. A fixed 2.5x was too
       little for a 6000px original on an ordinary monitor and past the file's
       resolution for a small one. */
    function detailScale() {
      var full = fullWidth(img.src);
      if (!full || !natural.w) return 2.5;
      var s = full / (natural.w * (window.devicePixelRatio || 1));
      return Math.min(4, Math.max(2, s));
    }

    /* The viewer starts with a high-resolution responsive rendition. On zoom,
       fetch additional detail only when the current file cannot cover it.
       Pin the drawn size before swapping, so sharpening does not resize it. */
    function fullWidth(src) {
      var m = /-(\d+)x(\d+)\.[a-z]+(\?|$)/i.exec(src || "");
      return m ? parseInt(m[1], 10) : 0;
    }
    function loadedWidth(src) {
      var m = /[?&]w=(\d+)/.exec(src || "");
      return m ? parseInt(m[1], 10) : 0;
    }
    function sharpen() {
      if (scale <= 1.01 || !natural.w) return;
      var src = img.src, full = fullWidth(src), have = loadedWidth(src);
      if (!full || !have) return;
      /* The smallest rung that covers what this scale needs, from the fixed set
         the build pre-renders (ZOOM_LADDER, media.ts). */
      var need = natural.w * scale * (window.devicePixelRatio || 1);
      var rungs = (document.body.getAttribute("data-zoom-widths") || "").split(",").map(Number).filter(Boolean);
      var top = Math.min(full, rungs.length ? rungs[rungs.length - 1] : full);
      var fits = rungs.filter(function (w) { return w < top; }).concat([top]);
      var want = fits.filter(function (w) { return w >= need; })[0] || top;
      if (want <= have * 1.15) return;
      var next = src.replace(/([?&])w=\d+/, "$1w=" + want);
      if (src.indexOf("/assets/media/") !== -1) next = next.replace(/\/w\d+\//, "/w" + want + "/");
      var shown = items[at], pre = new Image();
      pre.onload = function () {
        if (items[at] !== shown || loadedWidth(img.src) >= want) return;   /* moved on, or already sharper */
        img.style.width = natural.w + "px"; img.style.height = natural.h + "px";
        img.src = next;
      };
      pre.src = next;
    }

    /* --- showing ----------------------------------------------------------- */

    function show(i) {
      at = (i + items.length) % items.length;
      var it = items[at];
      reset(false);
      img.style.width = ""; img.style.height = "";   /* unpin a sharpened predecessor */
      img.src = it.src;
      img.alt = it.alt || "";
      capEl.textContent = it.caption || "";
      countEl.textContent = (at + 1) + " / " + items.length;
      var many = items.length > 1;
      prevBtn.hidden = !many; nextBtn.hidden = !many;
      img.onload = function () {
        natural.w = img.clientWidth; natural.h = img.clientHeight;
      };
      if (img.complete) { natural.w = img.clientWidth; natural.h = img.clientHeight; }
      // the neighbours, two each way, so a run of swipes never waits
      if (many) {
        [1, -1, 2, -2].forEach(function (k) {
          var n = items[(at + k + items.length * 2) % items.length];
          if (n && !n._pre) { n._pre = new Image(); n._pre.src = n.src; }
        });
      }
    }

    function step(d) { if (items.length > 1) show(at + d); }

    /* --- opening and closing ------------------------------------------------ */

    var viewerBackground = [];
    function open(list, i, opener) {
      if (!lb) build();
      items = list; lastFocus = opener || document.activeElement;
      viewerBackground = [].slice.call(document.body.children).filter(function (el) { return el !== lb && !el.inert; });
      viewerBackground.forEach(function (el) { el.inert = true; });

      /* Lock the page by pinning it, not by hiding its overflow. overflow:hidden
         on <html> does nothing on iOS Safari — the page scrolls behind the
         overlay and is somewhere else entirely when you close it. */
      scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = -scrollY + "px";
      document.body.style.left = "0";
      document.body.style.right = "0";

      show(i);
      lb.setAttribute("data-chrome", "on");
      lb.style.setProperty("--lb-shade", "1");
      lb.setAttribute("data-open", "true");
      /* Focus once the panel is genuinely visible.
         The overlay starts at visibility:hidden and transitions, and you cannot
         focus something that is not visible — the call silently does nothing and
         the keyboard is left behind on the page underneath. A single rAF is too
         early: the transition has not flipped visibility yet. Wait for it, with
         a timer behind it in case the transition never fires (reduced motion,
         a backgrounded tab). */
      var target = lb.querySelector("[data-close]");
      var focused = false;
      function grab() {
        if (focused || !isOpen()) return;
        if (getComputedStyle(lb).visibility !== "visible") return;
        focused = true;
        lb.removeEventListener("transitionend", grab);
        target.focus();
      }
      lb.addEventListener("transitionend", grab);
      requestAnimationFrame(function () { requestAnimationFrame(grab); });
      setTimeout(grab, 400);
      wake();
    }

    function close() {
      lb.setAttribute("data-open", "false");
      viewerBackground.forEach(function (el) { el.inert = false; }); viewerBackground = [];
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      window.scrollTo(0, scrollY);
      if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true});
    }

    function isOpen() { return lb && lb.getAttribute("data-open") === "true"; }

    /* The chrome fades out while the photograph is being looked at, and comes
       back the moment the pointer moves. */
    function wake() {
      lb.setAttribute("data-idle", "false");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        if (isOpen()) lb.setAttribute("data-idle", "true");
      }, 2200);
    }

    /* --- gestures ----------------------------------------------------------- */

    function wireGestures() {
      var pointers = new Map();
      var startDist = 0, startScale = 1;
      var panFrom = null;
      var pressAt = null, gestured = false;   /* read by the click handler */

      /* A finger is not a mouse. A mouse clicks to zoom and clicks the dark to
         leave; on a phone those two taps were the commonest accident — a tap
         meant to see the photograph better zoomed it, and a thumb resting near
         the edge closed the viewer. Fingers get the vocabulary every phone's own
         photo app has taught them instead:

           drag sideways  the photograph follows; let go past a fifth of the
                          screen, or flick, and the next one slides in
           drag down      the photograph follows and the dark thins; let go far
                          enough and the viewer closes
           double-tap     zoom to that spot, or back out
           pinch          zoom about the fingers; drag to look around, and a
                          flick keeps gliding for a moment
           tap            on the photograph, show or hide the count, Close,
                          arrows and caption; on the dark around it, close

         The arrows and Close stay, so nothing depends on a gesture alone. */
      var touch = null;        /* the one-finger gesture in progress */
      var still = window.matchMedia("(prefers-reduced-motion: reduce)");
      var lastTap = null, tapTimer = null, glide = 0;

      function shade(k) { lb.style.setProperty("--lb-shade", String(k)); }

      function chrome(show) {
        lb.setAttribute("data-chrome", show ? "on" : "off");
      }

      /* Slide the current photograph off one side and bring its neighbour in
         from the other, the way a strip of film moves under the hand. */
      /* The incoming photograph is decoded before it slides in, so it never
         arrives as an empty frame that fills in afterwards. */
      function turn(d) {
        var w = stage.clientWidth, t0 = performance.now(), done = false;
        var next = items[(at + d + items.length) % items.length];
        tx = -d * w; ty = 0; apply(true);
        var pre = next._pre || (next._pre = new Image());
        if (!pre.src) pre.src = next.src;
        function swap() {
          if (done || !isOpen()) return; done = true;
          setTimeout(function () {
            show(at + d);
            img.setAttribute("data-settling", "false");
            tx = d * w * 0.35; img.style.opacity = "0"; apply(false);
            void img.offsetWidth;
            img.style.opacity = "";
            tx = 0; apply(true);
          }, Math.max(0, (still.matches ? 0 : 200) - (performance.now() - t0)));
        }
        (pre.decode ? pre.decode() : Promise.resolve()).then(swap, swap);
        setTimeout(swap, 1500);   /* a slow network still gets there */
      }

      function dismiss() {
        ty = stage.clientHeight * 0.6; shade(0); apply(true);
        setTimeout(function () { close(); shade(1); reset(false); }, still.matches ? 0 : 160);
      }

      function stopGlide() { if (glide) cancelAnimationFrame(glide); glide = 0; }
      function coast(vx, vy) {
        stopGlide();
        if (still.matches) return;
        var last = performance.now();
        (function frame(now) {
          var dt = Math.min(32, now - last); last = now;
          vx *= Math.pow(0.94, dt / 16); vy *= Math.pow(0.94, dt / 16);
          tx += vx * dt; ty += vy * dt;
          var bx = tx, by = ty; clamp();
          if (bx !== tx) vx = 0; if (by !== ty) vy = 0;
          apply(false);
          glide = Math.abs(vx) + Math.abs(vy) > 0.02 ? requestAnimationFrame(frame) : 0;
        })(last);
      }

      function onTap(x, y) {
        var now = performance.now();
        /* The dark around the photograph is the way back, as on every phone. */
        var r = img.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom) {
          clearTimeout(tapTimer); lastTap = null; close();
          /* The browser still sends this tap's click once the finger lifts,
             and with the viewer gone it lands on the page underneath — on a
             photograph, which opened the viewer straight back up, or on a
             link. The tap was spent closing; its click is swallowed. */
          swallowNextClick();
          return;
        }
        if (lastTap && now - lastTap.t < 300 && Math.hypot(x - lastTap.x, y - lastTap.y) < 40) {
          clearTimeout(tapTimer); lastTap = null;
          if (scale > 1.01) reset(true);
          else zoomAt(detailScale(), x, y, true);
          return;
        }
        lastTap = { t: now, x: x, y: y };
        clearTimeout(tapTimer);
        tapTimer = setTimeout(function () {
          lastTap = null;
          chrome(lb.getAttribute("data-chrome") === "off");
        }, 300);
      }

      stage.addEventListener("pointerdown", function (e) {
        stage.setPointerCapture(e.pointerId);
        steering = e.pointerType === "mouse";
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) { pressAt = { x: e.clientX, y: e.clientY }; gestured = false; }
        if (!steering) {
          stopGlide();
          if (pointers.size === 1) {
            touch = { x: e.clientX, y: e.clientY, t: performance.now(), tx: tx, ty: ty, mode: null, vx: 0, vy: 0, lx: e.clientX, ly: e.clientY, lt: performance.now() };
          } else {
            touch = null;
          }
        }
        if (pointers.size === 2) {
          gestured = true;
          var p = [...pointers.values()];
          startDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
          startScale = scale;
          panFrom = null;
          if (tx || ty) { if (scale <= 1.01) { tx = 0; ty = 0; shade(1); apply(true); } }
        } else if (steering) {
          panFrom = scale > 1.01 ? null              /* the mouse steers by moving; no drag */
                  : { x: e.clientX, y: e.clientY, tx: tx, ty: ty, swipe: true };
        }
      });

      stage.addEventListener("pointermove", function (e) {
        steering = e.pointerType === "mouse";
        if (steering) wake();
        if (steering && scale > 1.01) { follow(e.clientX, e.clientY); apply("follow"); return; }
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        if (pointers.size === 2 && startDist) {
          var p = [...pointers.values()];
          var d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
          var mid = { x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 };
          zoomAt(startScale * (d / startDist), mid.x, mid.y);
          return;
        }

        if (touch) {
          var dx = e.clientX - touch.x, dy = e.clientY - touch.y, now = performance.now();
          var dt = Math.max(1, now - touch.lt);
          touch.vx = (e.clientX - touch.lx) / dt; touch.vy = (e.clientY - touch.ly) / dt;
          touch.lx = e.clientX; touch.ly = e.clientY; touch.lt = now;
          if (!touch.mode && Math.hypot(dx, dy) > 10) {
            gestured = true;
            touch.mode = scale > 1.01 ? "pan"
                       : Math.abs(dx) > Math.abs(dy) ? (items.length > 1 ? "turn" : "none")
                       : dy > 0 ? "dismiss" : "none";
            img.setAttribute("data-settling", "false");
          }
          if (touch.mode === "pan") { tx = touch.tx + dx; ty = touch.ty + dy; clamp(); apply(false); }
          else if (touch.mode === "turn") { tx = dx; ty = 0; apply(false); }
          else if (touch.mode === "dismiss") {
            ty = Math.max(0, dy); tx = dx * 0.4; apply(false);
            shade(Math.max(0.15, 1 - ty / (stage.clientHeight * 0.55)));
          }
          return;
        }

        if (!panFrom || panFrom.swipe) return;   /* a mouse swipe is handled on release */
        tx = panFrom.tx + (e.clientX - panFrom.x); ty = panFrom.ty + (e.clientY - panFrom.y);
        clamp(); apply(false);
      });

      function release(e) {
        var was = pointers.get(e.pointerId);
        pointers.delete(e.pointerId);
        stage.removeAttribute("data-dragging");
        if (pointers.size < 2) startDist = 0;

        if (touch && was && e.pointerType !== "mouse") {
          var g = touch; touch = null;
          var dx = was.x - g.x, dy = was.y - g.y, w = stage.clientWidth;
          var recent = performance.now() - g.lt < 80;   /* a flick is a movement still under way */
          if (!g.mode && e.type === "pointerup" && Math.hypot(dx, dy) < 10) onTap(was.x, was.y);
          else if (g.mode === "turn") {
            var fling = recent && Math.abs(g.vx) > 0.45;
            if ((Math.abs(dx) > w * 0.2 || fling) && e.type === "pointerup") turn(dx < 0 ? 1 : -1);
            else { tx = 0; apply(true); }
          } else if (g.mode === "dismiss") {
            if (e.type === "pointerup" && (dy > stage.clientHeight * 0.18 || (recent && g.vy > 0.5))) dismiss();
            else { tx = 0; ty = 0; shade(1); apply(true); }
          } else if (g.mode === "pan" && recent) coast(g.vx, g.vy);
          if (pointers.size === 0 && scale < 1.02 && g.mode !== "turn" && g.mode !== "dismiss" && (tx || ty)) reset(true);
          return;
        }
        if (pointers.size === 0 && scale < 1.02 && (tx || ty) && !panFrom) reset(true);

        if (panFrom && panFrom.swipe && was) {
          var mx = was.x - panFrom.x, my = was.y - panFrom.y;
          /* A swipe only counts if it is mostly sideways and went somewhere —
             otherwise a slightly untidy click becomes an accidental page turn. */
          if (Math.abs(mx) > 60 && Math.abs(mx) > Math.abs(my) * 1.5) step(mx < 0 ? 1 : -1);
        }
        panFrom = null;
        if (scale < 1.02 && (tx || ty)) reset(true);
      }
      stage.addEventListener("pointerup", release);
      stage.addEventListener("pointercancel", release);

      /* A click on the photograph toggles between fit and a close look; a click
         on the dark around it closes, which is what every viewer has taught
         people to expect. Mouse only — fingers are handled above, on release.

         "On the photograph" is decided by where the click landed, not by its
         target. pointerdown captures the pointer to the stage, and a captured
         pointer's click is delivered to the capturing element — so the target
         was always the stage, never the image, and the magnifier cursor closed
         the viewer instead of zooming. The same capture made releasing a pan
         of a zoomed photograph close it too.

         And a click that ends a drag, a swipe or a pinch is not a click: the
         photograph was being moved, not chosen. */
      stage.addEventListener("click", function (e) {
        var from = pressAt, wasGesture = gestured;
        pressAt = null; gestured = false;
        if (!steering) return;
        if (wasGesture || (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > 8)) return;
        var r = img.getBoundingClientRect();
        var onPhoto = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (onPhoto) {
          if (scale > 1.01) reset(true);
          else { scale = detailScale(); follow(e.clientX, e.clientY); apply(true); sharpen(); }
        } else {
          close();
        }
      });

      /* Proportional to how far the wheel actually turned. Every event used to
         multiply the scale by a fixed 1.16, and a trackpad sends dozens of tiny
         events per gesture where a mouse wheel sends one large one — so the same
         small movement of two fingers shot straight to maximum zoom. A trackpad
         pinch arrives as a wheel event with ctrlKey and much smaller deltas, so
         it gets a finer rate of its own. */
      stage.addEventListener("wheel", function (e) {
        e.preventDefault();
        wake();
        steering = true;
        var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
        scale = Math.min(MAX_SCALE, Math.max(1, scale * Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.002))));
        if (scale <= 1.01) { reset("follow"); return; }
        follow(e.clientX, e.clientY); apply("follow"); sharpen();
      }, { passive: false });
    }

    /* --- keyboard ------------------------------------------------------------ */

    document.addEventListener("keydown", function (e) {
      if (!isOpen()) return;
      var r, cx, cy;
      switch (e.key) {
        case "Escape":     e.preventDefault(); close(); break;
        case "ArrowRight": e.preventDefault(); step(1); break;
        case "ArrowLeft":  e.preventDefault(); step(-1); break;
        case "+": case "=":
          e.preventDefault();
          r = stage.getBoundingClientRect();
          cx = r.left + r.width / 2; cy = r.top + r.height / 2;
          zoomAt(scale * 1.4, cx, cy); apply(true); break;
        case "-": case "_":
          e.preventDefault();
          r = stage.getBoundingClientRect();
          cx = r.left + r.width / 2; cy = r.top + r.height / 2;
          zoomAt(scale / 1.4, cx, cy); apply(true); break;
        case "0":          e.preventDefault(); reset(true); break;
        case "Tab": {
          /* Safari's native Tab policy can skip buttons, and tapping the
             photograph can leave focus on BODY. Own every step, including
             re-entry, rather than trapping only the sequence's endpoints. */
          var f = [].slice.call(lb.querySelectorAll("button:not([hidden]):not([disabled])"))
            .filter(function (button) { return button.getClientRects().length > 0; });
          if (!f.length) return;
          e.preventDefault();
          var i = f.indexOf(document.activeElement);
          var next = i < 0 ? (e.shiftKey ? f.length - 1 : 0) : (i + (e.shiftKey ? -1 : 1) + f.length) % f.length;
          f[next].focus();
          break;
        }
      }
    });

    window.addEventListener("resize", function () {
      if (!isOpen()) return;
      /* A sharpened photograph is pinned to the fitted size of the old window. */
      img.style.width = ""; img.style.height = "";
      natural.w = img.clientWidth; natural.h = img.clientHeight;
      reset(false);
    });

    /* --- what opens it -------------------------------------------------------
       Delegated, because the rails that hold these photographs are fetched and
       inserted long after this runs. Card strips are excluded: a click there
       opens the project, which is a different intention entirely. */
    /* Capture, not bubble.
     *
     * Both this and the card's own click handler run on the same click, and the
     * card's fires first because it is bound closer to the target. By the time a
     * bubbling handler here looked at the card it had already been opened, so
     * data-open read "true" and a single click on a closed card opened the card
     * AND threw the viewer up on top of it.
     *
     * The capture phase runs before any of that, while the card still holds the
     * state it had when the reader clicked — which is the state the decision
     * actually depends on. */
    // Touch activation can change the hit target before its compatibility
    // click is delivered. Consume that spent click, but release the guard on
    // the next pointerdown so a fresh intentional press always works.
    function swallowNextClick() {
      function clearSpent() {
        window.removeEventListener("click", spent, true);
        window.removeEventListener("pointerdown", clearSpent, true);
      }
      function spent(ev) { clearSpent(); ev.preventDefault(); ev.stopImmediatePropagation(); }
      window.addEventListener("click", spent, true);
      window.addEventListener("pointerdown", clearSpent, true);
      setTimeout(clearSpent, 500);
    }

    function activatePicture(e) {
      if (isOpen()) return;
      var figure = e.target.closest && e.target.closest('.rail__f[role="button"]');
      var picture = figure && figure.querySelector("img");
      if (!picture) return;

      /* A closed card's photographs are a way in to the project, not something
         to look at on their own — clicking one opens the card, and the viewer
         must stay out of the way. Once the card is open they are simply the
         project's photographs and behave like any other.

         This turns on the card's STATE, not on a class. An open card keeps its
         original six frames — still carrying .pcard__peek — and injects only
         the seventh, so excluding by class was hiding six of the seven
         photographs from the viewer and opening it on a set of one. */
      var closedCard = picture.closest('.pcard:not([data-open="true"])');
      if (closedCard) return;
      /* The container is whichever of these the photograph is actually in.
         `.pcard__strip` matters: when a rail is lifted into an open card its
         [data-rail] wrapper is discarded and the figures become direct children
         of the strip, so looking only for [data-rail] found nothing and the
         viewer never opened from inside an expanded card — which is where most
         people will meet these photographs. */
      var rail = picture.closest("[data-rail]") || picture.closest(".pcard__strip")
              || picture.closest(".rail") || picture.closest(".pj");
      if (!rail) return;

      e.preventDefault();
      var figures = [].slice.call(rail.querySelectorAll(".rail__f"));
      var list = figures.map(function (fig) {
        var im = fig.querySelector("img");
        var cap = fig.querySelector("figcaption");
        return { src: bestSrc(im), alt: im.getAttribute("alt") || "",
                 caption: cap ? cap.textContent.trim() : "" };
      });
      var i = figures.indexOf(picture.closest(".rail__f"));
      open(list, i < 0 ? 0 : i, figure);
    }
    document.addEventListener("click", activatePicture, true);
    /* Mobile browsers can withhold the compatibility click after a swipe.
       Activate a completed finger tap directly, and let clicks keep handling
       mouse/keyboard input. Movement, cancellation and a second finger cancel
       the tap; native gallery scrolling and pinching stay with the browser. */
    var picturePress = null;
    document.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "touch") return;
      var figure = e.target.closest && e.target.closest('.rail__f[role="button"]');
      picturePress = e.isPrimary && figure && !isOpen()
        ? { id: e.pointerId, figure: figure, x: e.clientX, y: e.clientY } : null;
    }, true);
    document.addEventListener("pointermove", function (e) {
      if (picturePress && e.pointerId === picturePress.id &&
          Math.hypot(e.clientX - picturePress.x, e.clientY - picturePress.y) > 8) picturePress = null;
    }, true);
    document.addEventListener("pointercancel", function () { picturePress = null; }, true);
    document.addEventListener("pointerup", function (e) {
      var press = picturePress;
      picturePress = null;
      if (press && e.pointerId === press.id && press.figure.contains(e.target) &&
          Math.hypot(e.clientX - press.x, e.clientY - press.y) <= 8) {
        activatePicture(e);
        if (isOpen()) swallowNextClick();
      }
    }, true);
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches('.rail__f[role="button"]')) activatePicture(e);
    });
  })();
