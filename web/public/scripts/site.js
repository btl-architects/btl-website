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
    var at = 0, errorTimer = null, preloadNext = null, visible = false;
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
      v.addEventListener("playing", function () { v.setAttribute("data-playing", "true"); });
      v.addEventListener("emptied", function () { v.removeAttribute("data-playing"); });
      return v;
    }
    function load(i) {
      if (stillsOnly()) return;
      var v = player(i), want = source(v);
      if (want && v.getAttribute("src") !== want) { v.src = want; v.load(); }
    }
    function pause() {
      clearTimeout(errorTimer); clearTimeout(preloadNext); errorTimer = preloadNext = null;
      sFrames.forEach(function (f) { var v = f.querySelector("video"); if (v) v.pause(); });
    }
    function failed(i) {
      // A preloaded file can fail before becoming active. Apply the same still
      // fallback when revisiting it, rather than waiting for another error.
      if (at !== i || !canPlay() || sFrames.length < 2) return;
      clearTimeout(errorTimer);
      errorTimer = setTimeout(function () { if (at === i && canPlay()) show(at + 1); }, 6200);
    }
    function show(i) {
      at = (i + sFrames.length) % sFrames.length;
      sFrames.forEach(function (f, k) {
        f.setAttribute("data-on", k === at ? "true" : "false");
        var v = f.querySelector("video");
        if (k !== at && v) v.pause();
      });
      clearTimeout(errorTimer); errorTimer = null;
      load(at);
      var current = player(at);
      if (current.error) { failed(at); return; }
      if (current.ended) current.currentTime = 0;
      current.play().catch(function () {});
      clearTimeout(preloadNext);
      preloadNext = setTimeout(function () { load((at + 1) % sFrames.length); }, 3000);
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
      if (f.length > 1) menuFocusFrame = requestAnimationFrame(function () {
        menuFocusFrame = null;
        // A quick Tab or Escape must not be undone by deferred initial focus.
        if (menu.getAttribute("data-open") === "true" && document.activeElement === lastFocus) f[1].focus();
      });
    }
    function close() {
      if (menuFocusFrame !== null) { cancelAnimationFrame(menuFocusFrame); menuFocusFrame = null; }
      isolateMenu(false);
      menu.setAttribute("data-open", "false");
      openBtn.setAttribute("aria-expanded", "false");
      document.documentElement.style.overflow = "";
      if (menuLabel) menuLabel.textContent = "Menu";
      if (lastFocus) lastFocus.focus();
    }
    window.addEventListener("resize", function () { if (menu.getAttribute("data-open") === "true" && getComputedStyle(openBtn).display === "none") close(); });
    openBtn.addEventListener("click", function () {
      menu.getAttribute("data-open") === "true" ? close() : open();
    });

    document.addEventListener("keydown", function (e) {
      if (menu.getAttribute("data-open") !== "true") return;
      if ((e.key === "Tab" || e.key === "Escape") && menuFocusFrame !== null) {
        cancelAnimationFrame(menuFocusFrame); menuFocusFrame = null;
      }
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
      pos.textContent = String(Math.min(total, Math.round(p * (total - 1)) + 1)).padStart(2, "0") +
                        " / " + String(total).padStart(2, "0");
    };
    st.removeEventListener("scroll", st._report || function () {});
    st._report = report;
    st.addEventListener("scroll", report, { passive: true });
    report();
    return report;
  }

  function stepRail(rail, direction) {
    if (!rail) return;
    rail._pin = false; rail._touched = true;
    var rtl = getComputedStyle(rail).direction === "rtl" ? -1 : 1;
    rail.scrollBy({ left: direction * rtl * rail.clientWidth * .7, behavior: reduced ? "auto" : "smooth" });
  }

  function photographStrip(target) {
    var rail = target.closest && target.closest("[data-rail], .pcard__strip");
    return rail && !rail.closest('.pcard:not([data-open="true"])') ? rail : null;
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
    if (!rail || !e.detail || !rail.contains(e.target)) return;
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

  var pindex = document.querySelector("[data-pindex]");
  if (pindex) {
    var heads = [].slice.call(pindex.querySelectorAll("[data-project]"));
    var PEEK = 6;                     /* frames the card renders itself */
    var railCache = {};
    var expansionVersion = 0;
    var indexUrl = location.href;
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
      if (!slug || railCache[slug] || warming[slug]) return;
      warming[slug] = true;
      fetchRail(slug).then(function (rail) {
        /* Fetching the markup is only half of it: the photographs it references
           have not been asked for yet, and the first one is what the reader
           looks at the instant the card opens. Pull that one now, off-screen,
           so it is in the browser's cache before it is inserted. The rest can
           arrive as the strip is scrolled. */
        var first = rail && rail.querySelector("img");
        if (!first) return;
        var pre = new Image();
        if (first.getAttribute("sizes")) pre.sizes = first.getAttribute("sizes");
        if (first.getAttribute("srcset")) pre.srcset = first.getAttribute("srcset");
        pre.src = first.getAttribute("src");
      }).catch(function () { warming[slug] = false; });
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
      function drain() {
        if (draining || !queue.length) return;
        draining = true;
        idle(function () {
          var slug = queue.shift();
          warm(slug);
          draining = false;
          if (queue.length) setTimeout(drain, 300);
        });
      }
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
    function anchor(card, ms) {
      if (reduced) return;
      var target = card.getBoundingClientRect().top;
      var until = performance.now() + ms;
      var live = true;
      function release() { live = false; }
      window.addEventListener("wheel", release, { once: true, passive: true });
      window.addEventListener("touchstart", release, { once: true, passive: true });
      window.addEventListener("keydown", release, { once: true });
      (function step(now) {
        if (!live) return;
        var d = card.getBoundingClientRect().top - target;
        if (Math.abs(d) > 0.5) window.scrollBy(0, d);
        if (now < until) requestAnimationFrame(step);
        else {
          window.removeEventListener("wheel", release);
          window.removeEventListener("touchstart", release);
          window.removeEventListener("keydown", release);
        }
      })(performance.now());
    }

    /* Closing is a real gesture now, not a snap. The card shrinks and its
       photographs wipe back down; the injected markup is only removed once
       that has finished, so there is something to animate. Re-opening the same
       card cancels the pending clean-up rather than racing it. */
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

      var lead = st.querySelector(".rail__note");
      card.removeAttribute("data-open");
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

    /* Longest close slide (shut); the close anchor must outlast it. */
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
      holdHeight(Math.ceil(card.getBoundingClientRect().height));   /* reserve first */
      shut(card);
      anchor(card, CLOSE_SLIDE_MAX + 120);   /* the slide back, its clean-up, and a little */
      document.title = baseTitle;
      if (push) history.pushState({}, "", indexUrl);
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
        if (prev && prev !== card) holdHeight(Math.ceil(prev.getBoundingClientRect().height));
        anchor(card, DUR.slow + 200);   /* the card's growth, and a little */
        if (prev) shut(prev);                   /* P4: one open at a time */

        if (card._shutting) { clearTimeout(card._shutting); card._shutting = null; }
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
          if (own) im.sizes = own;
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

           On a phone the note leaves the strip entirely: a 20rem panel inside a
           375px scroller leaves a sliver of photograph and reads as a mistake,
           so there it stacks underneath in normal flow. */
        var narrow = window.matchMedia("(max-width: 51.99rem)").matches;
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

        document.title = (rail.getAttribute("data-title") || "Project") + " — btl architects";
        if (push) history.pushState({ slug: slug }, "", hrefBySlug[slug]);
      });
    }

    /* The whole card opens it, not only the caption. A photograph that looks
       clickable and is not is the least intuitive thing an index can do. The
       caption stays a real <a> underneath for keyboard, middle-click and
       no-JavaScript, but the pointer target is the entire card. */
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
      st.addEventListener("touchstart", function () { st._pin = false; st._touched = true; }, { passive: true });
    });

    window.addEventListener("popstate", function (ev) {
      var slug = ev.state && ev.state.slug;
      if (slug) {
        if (!openCard || openCard.getAttribute("data-card") !== slug) expand(slug, false).catch(function () { location.href = hrefBySlug[slug]; });
      } else closeAll(false);
    });

    /* Landing on /projects/<slug> with the index in history: open it directly. */
    if (history.state && history.state.slug) expand(history.state.slug, false);
  }


  /* The navigation indicator that used to live here is gone. Each link draws
     its own underline in CSS now, which needs no measuring, no resize handling
     and no JavaScript — and matches how every other link on the site behaves. */
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

    /* The largest candidate in the srcset: the rail is showing a size chosen to
       fit a strip, and the whole point of opening this is to see more than
       that. */
    function bestSrc(el) {
      var ss = el.getAttribute("srcset");
      if (!ss) return el.currentSrc || el.src;
      var best = null, bestW = -1;
      ss.split(",").forEach(function (part) {
        var bits = part.trim().split(/\s+/);
        var w = parseInt(bits[1], 10);
        if (bits[0] && w > bestW) { bestW = w; best = bits[0]; }
      });
      return best || el.currentSrc || el.src;
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
      // the neighbours, so stepping is instant
      if (many) {
        [items[(at + 1) % items.length], items[(at - 1 + items.length) % items.length]]
          .forEach(function (n) { var p = new Image(); p.src = n.src; });
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

      stage.addEventListener("pointerdown", function (e) {
        stage.setPointerCapture(e.pointerId);
        steering = e.pointerType === "mouse";
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) { pressAt = { x: e.clientX, y: e.clientY }; gestured = false; }
        if (pointers.size === 2) {
          gestured = true;
          var p = [...pointers.values()];
          startDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
          startScale = scale;
          panFrom = null;
        } else if (scale > 1.01 && e.pointerType === "mouse") {
          panFrom = null;                   /* the mouse steers by moving; no drag */
        } else if (scale > 1.01) {
          panFrom = { x: e.clientX, y: e.clientY, tx: tx, ty: ty };
          stage.setAttribute("data-dragging", "true");
        } else {
          panFrom = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, swipe: true };
        }
      });

      stage.addEventListener("pointermove", function (e) {
        wake();
        steering = e.pointerType === "mouse";
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
        if (!panFrom) return;
        var dx = e.clientX - panFrom.x, dy = e.clientY - panFrom.y;
        if (panFrom.swipe) return;          // handled on release
        tx = panFrom.tx + dx; ty = panFrom.ty + dy;
        clamp(); apply(false);
      });

      function release(e) {
        var was = pointers.get(e.pointerId);
        pointers.delete(e.pointerId);
        stage.removeAttribute("data-dragging");
        if (pointers.size < 2) startDist = 0;

        if (panFrom && panFrom.swipe && was) {
          var dx = was.x - panFrom.x, dy = was.y - panFrom.y;
          /* A swipe only counts if it is mostly sideways and went somewhere —
             otherwise a slightly untidy tap becomes an accidental page turn. */
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
        }
        panFrom = null;
        if (scale < 1.02 && (tx || ty)) reset(true);
      }
      stage.addEventListener("pointerup", release);
      stage.addEventListener("pointercancel", release);

      /* A click on the photograph toggles between fit and a close look; a click
         on the dark around it closes, which is what every viewer has taught
         people to expect.

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
        if (wasGesture || (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > 8)) return;
        var r = img.getBoundingClientRect();
        var onPhoto = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (onPhoto) {
          if (scale > 1.01) reset(true);
          else if (steering) { scale = detailScale(); follow(e.clientX, e.clientY); apply(true); sharpen(); }
          else zoomAt(detailScale(), e.clientX, e.clientY, true);
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
          /* Focus stays inside while it is open. */
          var f = lb.querySelectorAll("button:not([hidden])");
          if (!f.length) return;
          var first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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
    function activatePicture(e) {
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
    document.addEventListener("keydown", function (e) {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches('.rail__f[role="button"]')) activatePicture(e);
    });
  })();
