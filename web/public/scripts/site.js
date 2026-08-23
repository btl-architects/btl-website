/* ==========================================================================
   btl architects — the four islands
   No framework, no router, no animation library. Vanilla, ~4 KB.
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- 1. scroll reveals -------------------------------------------------- */
  /* A clip-path left on an element forces it into its own composited layer,
     and a layer whose height is fractional (card heights come from vh)
     rasterises its bottom edge at partial coverage — a smeared, lighter band
     across the full width of the card, gaps included. Once a reveal has
     finished, the clip has done its job and must be taken off entirely. */
  document.addEventListener("transitionend", function (ev) {
    if (ev.propertyName === "clip-path" && ev.target.classList.contains("rvc")) {
      ev.target.style.clipPath = "none";
    }
  });

  /* Claim the reveals. Until this line runs, the stylesheet leaves everything
     visible — so a parse error, a blocked script or an old browser costs the
     animation and nothing else. */
  document.documentElement.classList.add("js");

  var reveals = document.querySelectorAll(".rv, .rvc, .line--draw");
  function revealAll() {
    reveals.forEach(function (el) {
      el.classList.add("in");
      if (el.classList.contains("rvc")) el.style.clipPath = "none";
    });
  }
  /* A reveal that starts hidden must have a way out that does not depend on the
     observer. IntersectionObserver does not report anything while the document
     is hidden, so a page opened in a background tab — or restored from one —
     would sit there blank until it happened to be scrolled. */
  if (reduced || document.hidden || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    document.addEventListener("visibilitychange", function once() {
      if (document.hidden) { revealAll(); document.removeEventListener("visibilitychange", once); }
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { threshold: 0.25, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });

    /* A backstop that follows the reader, not a one-shot timer.
     *
     * The first version of this ran once, 1200ms after load, and revealed
     * whatever was on screen at that instant. On the home page that is never
     * the work: Selected Work sits below a full-height opening film, so it was
     * still below the fold when the timer fired and went on depending entirely
     * on the observer. If the observer is slow, throttled or silent, the cards
     * stay clipped while their photographs quietly finish loading behind them —
     * which is exactly what "still taking a long time to load" looks like from
     * the outside.
     *
     * So the check runs on scroll as well, rAF-throttled, and detaches itself
     * the moment everything has been revealed. It costs nothing once the page
     * has been read and it cannot leave content hidden below the fold. */
    var pending = [].slice.call(reveals);
    var ticking = false;

    function sweep() {
      ticking = false;
      var vh = window.innerHeight;
      pending = pending.filter(function (el) {
        if (el.classList.contains("in")) return false;
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) {
          el.classList.add("in");
          if (el.classList.contains("rvc")) el.style.clipPath = "none";
          return false;
        }
        return true;
      });
      if (!pending.length) {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(sweep);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    setTimeout(sweep, 1200);
  }

  /* --- 1b. the opening sequence --------------------------------------------
     Ambient, not navigational (R8): no arrows, no dots, no counter, and it
     stops entirely when it is off-screen so a page nobody is looking at is not
     decoding video.

     Video is fetched lazily and only when it will actually be watched. Under
     reduced motion, or on a metered connection, the poster frames alone carry
     the sequence and not a byte of video is requested — the encodes are 5 MB,
     which is a real cost to put on someone's phone plan without asking. */
  var stage = document.querySelector("[data-stage-frames]");
  if (stage) {
    var sFrames = [].slice.call(stage.querySelectorAll(".stage__f"));
    var sLabel = stage.querySelector("[data-stage-label]");
    var saveData = (navigator.connection || {}).saveData === true;
    var stillsOnly = reduced || saveData;
    var at = 0, timer = null, preloadNext = null;

    var narrowStage = window.matchMedia("(max-width: 47.99rem)");

    /* the sources live on the <video>, not the <figure> around it */
    function source(v) {
      return narrowStage.matches ? v.getAttribute("data-src-portrait")
                                 : v.getAttribute("data-src");
    }

    function load(i) {
      if (stillsOnly) return;
      var f = sFrames[i];
      if (!f) return;
      var v = f.querySelector("video");
      var want = source(v);
      if (!want || v.getAttribute("src") === want) return;
      v.setAttribute("src", want);
      v.load();
    }

    function show(i) {
      at = (i + sFrames.length) % sFrames.length;
      sFrames.forEach(function (f, k) {
        var on = k === at;
        f.setAttribute("data-on", on ? "true" : "false");
        var v = f.querySelector("video");
        if (!v) return;
        if (on && !stillsOnly) { load(k); var pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else if (!on) { try { v.pause(); } catch (e) {} }
      });
      if (sLabel) {
        sLabel.setAttribute("data-fading", "true");
        window.setTimeout(function () {
          sLabel.textContent = sFrames[at].getAttribute("data-label") || "";
          sLabel.removeAttribute("data-fading");
        }, 220);
      }
      /* The next clip is fetched PART-WAY through this one, not alongside it.
         Preloading immediately meant an arriving visitor paid for the whole
         sequence at once — 5.5 MB before they had watched six seconds of it.
         Three seconds in, the current frame is playing and there is still time
         to have the next one ready before it is wanted. */
      window.clearTimeout(preloadNext);
      preloadNext = window.setTimeout(function () {
        load((at + 1) % sFrames.length);
      }, 3000);
    }

    function play() {
      if (timer) return;
      timer = window.setInterval(function () { show(at + 1); }, 6200);
    }
    function pause() {
      window.clearInterval(timer); timer = null;
      window.clearTimeout(preloadNext); preloadNext = null;
    }

    show(0);
    if (sFrames.length > 1) {
      if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (es) {
          es.forEach(function (en) { en.isIntersecting ? play() : pause(); });
        }, { threshold: 0.25 }).observe(stage);
      } else {
        play();
      }
    }
    /* a change of orientation changes which encode is the right one */
    (narrowStage.addEventListener ? narrowStage.addEventListener.bind(narrowStage, "change")
                                  : narrowStage.addListener.bind(narrowStage))(function () {
      sFrames.forEach(function (f, k) { if (k === at) load(k); });
    });
  }

  /* --- 2. header contrast -------------------------------------------------
     Reads data-ground off the section behind the header. No scroll handler. */
  var header = document.querySelector(".header");
  if (header) {
    var grounds = document.querySelectorAll("[data-ground]");
    if (grounds.length && "IntersectionObserver" in window) {
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
  var openBtn = document.querySelector("[data-menu-open]");
  var closeBtn = document.querySelector("[data-menu-close]");
  if (menu && openBtn) {
    var lastFocus = null;

    function focusables() {
      return menu.querySelectorAll("a[href], button:not([disabled])");
    }
    function open() {
      lastFocus = document.activeElement;
      menu.setAttribute("data-open", "true");
      openBtn.setAttribute("aria-expanded", "true");
      document.documentElement.style.overflow = "hidden";
      var f = focusables();
      if (f.length) f[0].focus();
    }
    function close() {
      menu.setAttribute("data-open", "false");
      openBtn.setAttribute("aria-expanded", "false");
      document.documentElement.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (menu.getAttribute("data-open") !== "true") return;
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
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
  var pindex = document.querySelector("[data-pindex]");
  if (pindex) {
    var heads = [].slice.call(pindex.querySelectorAll("[data-project]"));
    var PEEK = 6;                     /* frames the card renders itself */
    var railCache = {};
    var openRow = null;
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
      card.removeAttribute("data-open");      /* the card starts collapsing now */

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
      var dur = Math.min(640, Math.max(340, 340 + travel * 0.16));

      st.style.setProperty("--close-shift", shift + "px");
      st.style.setProperty("--close-dur", Math.round(dur) + "ms");
      card.setAttribute("data-closing", "");

      card._shutting = window.setTimeout(finish, Math.round(dur) + 40);
    }

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
      }, 620);
    }

    function closeAll(push) {
      if (!openCard) return;
      var card = openCard;
      openCard = null;
      holdHeight(Math.ceil(card.getBoundingClientRect().height));   /* reserve first */
      shut(card);
      anchor(card, 760);
      document.title = baseTitle;
      if (push) history.pushState({}, "", indexUrl);
    }

    function expand(slug, push) {
      var card = cardOf(slug);
      if (!card) return Promise.reject(new Error("no card"));
      if (openCard === card) { closeAll(push); return Promise.resolve(); }

      return fetchRail(slug).then(function (rail) {
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
        anchor(card, 900);
        if (prev) shut(prev);                   /* P4: one open at a time */

        if (card._shutting) { clearTimeout(card._shutting); card._shutting = null; }
        card._closing = false;
        var st = strip(card);

        /* The card already shows PEEK frames, so injection starts after them —
           slicing from the wrong index silently duplicated photographs. */
        var figs = [].slice.call(rail.querySelectorAll(".rail__f")).slice(PEEK);

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
            var until = performance.now() + 620, frames = 0;
            (function pin(now) {
              if (!st._pin || openCard !== card) return;
              st.scrollLeft = hold;
              if (now < until && ++frames < 60) requestAnimationFrame(pin);
              else { st._pin = false; settleTo(st, card, 0, 420); }
            })(performance.now());

            /* The pin must end on a clock, not on frames. Throttle the tab and
               rAF all but stops: the loop then keeps re-asserting its held
               position long after it should have released, overriding the
               settle and stranding the strip with the note off the edge. */
            window.setTimeout(function () {
              if (st._pin && openCard === card) { st._pin = false; settleTo(st, card, 0, 420); }
            }, 700);
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
        if (nav) {
          nav.hidden = false;
          var pos = nav.querySelector("[data-pos]");
          var bar = nav.querySelector("[data-bar]");
          var total = st.querySelectorAll(".rail__f").length;
          var report = function () {
            var range = st.scrollWidth - st.clientWidth;
            var p = range > 0 ? Math.abs(st.scrollLeft) / range : 0;
            var frac = 1 / total;
            bar.style.width = (frac * 100) + "%";
            bar.style.transform = "translateX(" + (p * (1 - frac) * st.clientWidth) + "px)";
            pos.textContent = String(Math.min(total, Math.round(p * (total - 1)) + 1)).padStart(2, "0") +
                              " / " + String(total).padStart(2, "0");
          };
          st.removeEventListener("scroll", st._report || function () {});
          st._report = report;
          st.addEventListener("scroll", report, { passive: true });
          report();
        }

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
        /* a drag along the open strip ends in a click event — not a choice */
        if (downAt && Math.abs(ev.clientX - downAt[0]) + Math.abs(ev.clientY - downAt[1]) > 8) return;

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
      if (!openCard) return;
      var st = strip(openCard);
      if (ev.key === "Escape") {
        ev.preventDefault();
        var link = openCard.querySelector("[data-project]");
        closeAll(true);
        link.focus({ preventScroll: true });
      } else if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        ev.preventDefault();
        st._touched = true;
        st.scrollBy({ left: (ev.key === "ArrowRight" ? 1 : -1) * st.clientWidth * 0.7,
                      behavior: reduced ? "auto" : "smooth" });
      }
    });

    /* Drag to pan an open strip. On a desktop the only other way across it is
       shift+wheel, which nobody discovers; on touch the browser already does
       this natively, so pointer events from a finger are left alone. The 8px
       threshold in the click handler is what stops a drag ending in an open or
       a close. */
    [].slice.call(pindex.querySelectorAll("[data-strip]")).forEach(function (st) {
      var down = null;
      st.addEventListener("pointerdown", function (ev) {
        st._pin = false; st._touched = true;   /* the reader outranks the reveal */
        if (ev.pointerType === "touch" || ev.button) return;
        if (st.closest(".pcard").getAttribute("data-open") !== "true") return;
        down = { x: ev.clientX, left: st.scrollLeft };
      });
      st.addEventListener("pointermove", function (ev) {
        if (!down) return;
        var dx = ev.clientX - down.x;
        if (!st.hasAttribute("data-dragging") && Math.abs(dx) < 4) return;
        if (!st.hasAttribute("data-dragging")) {
          st.setAttribute("data-dragging", "");
          /* Capture is an optimisation, not a requirement: it throws whenever
             the pointer is no longer active, and an unguarded throw here aborts
             the rest of the handler and kills the drag outright. */
          try { st.setPointerCapture(ev.pointerId); } catch (e) {}
        }
        ev.preventDefault();
        st.scrollLeft = down.left - dx;
      });
      function end(ev) {
        if (!down) return;
        down = null;
        if (st.hasAttribute("data-dragging")) {
          st.removeAttribute("data-dragging");
          try { st.releasePointerCapture(ev.pointerId); } catch (e) {}
        }
      }
      st.addEventListener("wheel", function () { st._pin = false; st._touched = true; }, { passive: true });
      st.addEventListener("touchstart", function () { st._pin = false; st._touched = true; }, { passive: true });
      st.addEventListener("pointerup", end);
      st.addEventListener("pointercancel", end);
    });

    window.addEventListener("popstate", function (ev) {
      var slug = ev.state && ev.state.slug;
      if (slug) expand(slug, false);
      else closeAll(false);
    });

    /* Landing on /projects/<slug> with the index in history: open it directly. */
    if (history.state && history.state.slug) expand(history.state.slug, false);
  }


  /* --- 6. navigation indicator + scroll spy --------------------------------
     One element slides between items. Because there is only ever one, two lines
     cannot be lit at the same time, and moving between tabs reads as a single
     object travelling rather than one fading out while another fades in. */
  var nav = document.querySelector(".nav");
  var ind = document.querySelector(".nav__ind");
  if (nav && ind) {
    var navLinks = [].slice.call(nav.querySelectorAll(".nav__link"));
    var pinnedLink = nav.querySelector('.nav__link[aria-current="page"]');
    var first = true;

    function place(link, show) {
      if (!link) { ind.setAttribute("data-on", "false"); return; }
      ind.style.width = link.offsetWidth + "px";
      ind.style.transform = "translateX(" + link.offsetLeft + "px)";
      ind.setAttribute("data-on", show ? "true" : "false");
      if (first && show) {
        /* the first appearance draws in place instead of sliding from 0 */
        ind.setAttribute("data-first", "true");
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { ind.removeAttribute("data-first"); });
        });
        first = false;
      }
    }
    function settleToPinned() { place(pinnedLink, !!pinnedLink); }

    navLinks.forEach(function (a) {
      a.addEventListener("pointerenter", function () { place(a, true); });
      a.addEventListener("focus", function () { place(a, true); });
    });
    nav.addEventListener("pointerleave", settleToPinned);
    nav.addEventListener("focusout", function (ev) {
      if (!nav.contains(ev.relatedTarget)) settleToPinned();
    });
    window.addEventListener("resize", settleToPinned);

    /* There is no scroll spy. The nav marks the page you are on, not the
       section you happen to be level with — a marker that moves while you
       scroll makes the nav look like it is navigating when it is not. */

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(settleToPinned);
    }
    settleToPinned();
  }

})();
