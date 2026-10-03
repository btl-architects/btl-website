/* Press is progressive: the links still lead to readable pages without JS. */
(function () {
  "use strict";
  if (!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) return;

  var dialog = null, content, label, original, closeButton;
  var opener = null, controller = null, savedScroll = 0, savedStyle = null;
  var historyPending = false;
  var scrollRestoration = null;

  function restoreHistoryScroll() {
    requestAnimationFrame(function () {
      if (dialog && dialog.open || historyPending || scrollRestoration === null) return;
      history.scrollRestoration = scrollRestoration;
      scrollRestoration = null;
    });
  }

  function loadFrames(root) {
    root.querySelectorAll("[data-article-frame]").forEach(function (frame) {
      if (!frame.src) frame.src = frame.getAttribute("data-article-frame");
    });
  }
  // A direct article page is also the fallback for modified/new-tab clicks.
  loadFrames(document);

  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "press-reader";
    dialog.setAttribute("aria-label", "Press reader");
    dialog.innerHTML = '<div class="press-reader__bar">' +
      '<span class="press-reader__label"></span>' +
      '<a class="press-reader__original" target="_blank" rel="noopener noreferrer" aria-label="Open original">' +
      '<span class="press-reader__original-text">Open original</span><span aria-hidden="true">↗</span></a>' +
      '<button class="press-reader__close" type="button" aria-label="Close article"><span class="press-reader__close-text">Close</span><svg class="press-reader__close-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.2"/></svg></button>' +
      '</div><div class="press-reader__content" tabindex="0" role="region" aria-label="Article content"></div>';
    document.body.appendChild(dialog);
    content = dialog.querySelector(".press-reader__content");
    label = dialog.querySelector(".press-reader__label");
    original = dialog.querySelector(".press-reader__original");
    closeButton = dialog.querySelector(".press-reader__close");
    closeButton.addEventListener("click", dismiss);
    dialog.addEventListener("cancel", function (ev) {ev.preventDefault(); dismiss();});
    dialog.addEventListener("keydown", function (ev) {
      if (ev.key !== "Tab") return;
      // Native modal inertness protects the page, but Tab can still leave the
      // dialog for browser chrome. Keep the parent controls in a clear cycle;
      // navigation inside a publisher's frame stays with the publisher.
      var controls = [].slice.call(dialog.querySelectorAll('a[href], button, iframe, [tabindex="0"]'))
        .filter(function (el) {return !el.hidden && !el.disabled && el.getClientRects().length;});
      var at = controls.indexOf(document.activeElement);
      ev.preventDefault();
      controls[(at + (ev.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
    });
    // Require both pointer ends outside, so dragging across the panel to select
    // text does not accidentally dismiss the article.
    var outsideDown = false;
    function outside(ev) {
      var r = dialog.getBoundingClientRect();
      return ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom;
    }
    dialog.addEventListener("pointerdown", function (ev) {outsideDown = outside(ev);});
    dialog.addEventListener("click", function (ev) {if (outsideDown && outside(ev)) dismiss(); outsideDown = false;});

    // On a phone the reader is a card with two resting heights, the way a
    // phone's own maps and music cards work (components.css). It opens part
    // way — a look at the article: headline, picture, the start of the text —
    // and there nothing scrolls, so a thumb swiping down anywhere on it puts it
    // away. Swiping up, or tapping it, raises it to read in full; there the
    // article scrolls, and pulling down from the bar, or from an article back
    // at its top, lowers it again, or puts it away if pulled far or flicked.
    // A tap outside the card closes it from either height.
    var pull = null;
    dialog.addEventListener("touchstart", function (ev) {
      if (!sheet() || ev.touches.length !== 1 || outside(ev.touches[0])) { pull = null; return; }
      var t = ev.touches[0];
      pull = {y: t.clientY, x: t.clientX, dy: 0, v: 0, t: performance.now(), moving: false,
              inBar: !content.contains(ev.target), tap: true};
    }, {passive: true});
    dialog.addEventListener("touchmove", function (ev) {
      if (!pull) return;
      var t = ev.touches[0], now = performance.now(), dy = t.clientY - pull.y;
      if (Math.hypot(t.clientX - pull.x, dy) > 8) pull.tap = false;
      if (!pull.moving) {
        if (Math.abs(dy) < 6 || Math.abs(t.clientX - pull.x) > Math.abs(dy)) return;
        var full = dialog.getAttribute("data-detent") === "full";
        // Raised, the article scrolls: only a downward pull from the bar or
        // from the article's top moves the card.
        if (full && !(dy > 0 && (pull.inBar || content.scrollTop <= 0))) { pull.y = t.clientY; return; }
        pull.moving = true; pull.y = t.clientY; dy = 0;
        dialog.setAttribute("data-pulling", "");
      }
      ev.preventDefault();
      var base = rest(), y = base + dy;
      if (y < 0) y = y / 3;                       // resistance past fully raised
      pull.v = (dy - pull.dy) / Math.max(1, now - pull.t); pull.dy = dy; pull.t = now;
      dialog.style.transform = "translateY(" + y + "px)";
      dialog.style.setProperty("--pull", String(Math.max(0, Math.min(1, (y - peekOffset()) / (dialog.clientHeight * 0.5)))));
    }, {passive: false});
    function letGo(ev) {
      var p = pull; pull = null;
      if (!p) return;
      if (!p.moving) {
        // A tap on the lowered card raises it — unless it was on a link or a
        // control, which keep their own meaning.
        if (p.tap && ev.type === "touchend" && dialog.getAttribute("data-detent") === "peek" &&
            !(ev.target.closest && ev.target.closest("a, button"))) { ev.preventDefault(); settle("full"); }
        return;
      }
      dialog.removeAttribute("data-pulling");
      var flick = performance.now() - p.t < 90 ? p.v : 0, vh = window.innerHeight;
      var full = dialog.getAttribute("data-detent") === "full";
      if (ev.type !== "touchend") { settle(full ? "full" : "peek"); return; }
      if (full) {
        if (p.dy > vh * 0.45 || flick > 1.2) dismiss();
        else if (p.dy > vh * 0.1 || flick > 0.4) settle("peek");
        else settle("full");
      } else {
        if (p.dy < -vh * 0.08 || flick < -0.4) settle("full");
        else if (p.dy > vh * 0.1 || flick > 0.4) dismiss();
        else settle("peek");
      }
    }
    dialog.addEventListener("touchend", letGo);
    dialog.addEventListener("touchcancel", letGo);
    // A keyboard reaching the article needs it raised to scroll it.
    content.addEventListener("focus", function () { if (sheet()) settle("full"); });
  }

  // The two resting heights of the phone card, as offsets from fully raised.
  // Touch only. The lowered card is a look that a finger raises or swipes
  // away; with a mouse there is no swipe, and it sat half-way, cut off and
  // unscrollable. A mouse, even in a narrow window, gets the card raised.
  function sheet() {
    return window.matchMedia("(max-width: 47.99rem) and (hover: none) and (pointer: coarse)").matches;
  }
  function peekOffset() { return Math.max(0, dialog.clientHeight - window.innerHeight * 0.62); }
  function rest() { return dialog.getAttribute("data-detent") === "full" ? 0 : peekOffset(); }
  function settle(detent) {
    dialog.setAttribute("data-detent", detent);
    dialog.style.transform = "translateY(" + rest() + "px)";
    dialog.style.removeProperty("--pull");
  }

  function close() {
    if (!dialog || !dialog.open) return;
    if (controller) controller.abort();
    dialog.close();
    // Removing the frame stops its media/scripts and network activity.
    content.replaceChildren();
    Object.keys(savedStyle).forEach(function (name) {document.body.style[name] = savedStyle[name];});
    window.scrollTo({top: savedScroll, left: 0, behavior: "instant"});
    if (opener && opener.isConnected) opener.focus({preventScroll: true});
    opener = null;
    restoreHistoryScroll();
  }

  // On a phone the card slides away before it closes; elsewhere, and for a
  // reader who has asked for less motion, it simply closes.
  var leaving = false;
  function dismiss() {
    if (leaving || !dialog || !dialog.open) return;
    var slide = window.matchMedia("(max-width: 47.99rem)").matches &&
                !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function done() {
      leaving = false;
      dialog.removeAttribute("data-leaving");
      dialog.removeAttribute("data-detent");
      dialog.style.transform = ""; dialog.style.removeProperty("--pull");
      close();
      if (history.state && history.state.btlPressReader) {
        historyPending = true;
        history.back();
      }
    }
    if (!slide) { done(); return; }
    leaving = true;
    dialog.removeAttribute("data-pulling");
    dialog.setAttribute("data-leaving", "");
    dialog.style.transform = "translateY(calc(100% + 2rem))";
    setTimeout(done, 260);
  }

  window.addEventListener("popstate", function () {
    historyPending = false;
    close();
    restoreHistoryScroll();
  });
  window.addEventListener("pagehide", close);
  window.addEventListener("pageshow", restoreHistoryScroll);

  // Articles are fetched before they are asked for: as their covers come
  // near the screen, and the moment a finger lands on one. Opening one then
  // shows it at once instead of a line saying it is on its way.
  var articles = {};
  function load(href) {
    if (!articles[href]) {
      articles[href] = fetch(href).then(function (response) {
        if (!response.ok) throw new Error("article unavailable");
        if (new URL(response.url).origin !== location.origin) throw new Error("external redirect");
        return response.text();
      }).then(function (html) {
        var article = new DOMParser().parseFromString(html, "text/html").querySelector("[data-article-content]");
        if (!article) throw new Error("article missing");
        var image = article.querySelector(".press-article__image img");
        if (image && image.currentSrc !== undefined) { var pre = new Image(); pre.srcset = image.getAttribute("srcset") || ""; pre.sizes = image.getAttribute("sizes") || ""; pre.src = image.getAttribute("src"); }
        return article;
      });
      articles[href].catch(function () { delete articles[href]; });
    }
    return articles[href];
  }
  function ahead(link) {
    if (!link) return;
    var url = new URL(link.href, location.href);
    if (url.origin === location.origin) load(url.href);
  }
  if ("IntersectionObserver" in window) {
    var near = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { near.unobserve(e.target); ahead(e.target); } });
    }, {rootMargin: "400px 0px"});
    document.querySelectorAll("a[data-article]").forEach(function (a) { near.observe(a); });
  }
  document.addEventListener("pointerdown", function (ev) {
    ahead(ev.target.closest && ev.target.closest("a[data-article]"));
  }, {passive: true});

  document.addEventListener("click", function (ev) {
    var link = ev.target.closest && ev.target.closest("a[data-article]");
    if (!link || ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    var destination = new URL(link.href);
    if (destination.origin !== location.origin) return;
    ev.preventDefault();
    if (historyPending || dialog && dialog.open) return;
    if (!dialog) build();
    opener = link;
    label.textContent = link.getAttribute("data-publication") || "Press";
    var source = link.getAttribute("data-original");
    original.hidden = !source;
    if (source) original.href = source; else original.removeAttribute("href");
    content.textContent = "";
    var status = document.createElement("p");
    status.className = "press-reader__status";
    status.setAttribute("role", "status");
    status.textContent = "Opening article…";
    content.appendChild(status);
    content.setAttribute("aria-busy", "true");
    savedScroll = window.scrollY;
    // Pinning the body makes the browser record scroll 0 in its history entry.
    // Keep restoration manual through popstate, then restore the prior policy
    // after the traversal so it cannot undo the reader's saved page position.
    if (scrollRestoration === null) scrollRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    savedStyle = {};
    ["position", "top", "left", "right", "width"].forEach(function (name) {savedStyle[name] = document.body.style[name];});
    document.body.style.position = "fixed";
    document.body.style.top = -savedScroll + "px";
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    dialog.showModal();
    if (sheet()) {
      // Rises from below the screen to the lowered height.
      dialog.setAttribute("data-detent", "peek");
      dialog.setAttribute("data-pulling", "");
      dialog.style.transform = "translateY(100%)";
      void dialog.offsetHeight;
      dialog.removeAttribute("data-pulling");
      settle("peek");
    }
    // Focus goes to Close either way; its ring is drawn only for a keyboard
    // (a click with no pointer behind it has detail 0). After a tap it framed
    // the X in a bright box the reader had not asked for.
    closeButton.focus({preventScroll: true, focusVisible: ev.detail === 0});
    // Same URL: BTL stays in place. Back dismisses the reader; Forward never
    // replays a stale article or introduces an external navigation.
    history.pushState(Object.assign({}, history.state, {btlPressReader: true}), "", location.href);
    controller = new AbortController();
    var request = controller;
    load(destination.href).then(function (cached) {
      if (!dialog.open || request.signal.aborted) return;
      // The fetched markup is our own statically rendered, escaped CMS content.
      // A copy, so the cached original can open again.
      var article = cached.cloneNode(true);
      content.replaceChildren(article);
      content.scrollTop = 0;
      content.setAttribute("aria-busy", "false");
      var image = article.querySelector(".press-article__image img");
      if (image) {image.loading = "eager"; image.fetchPriority = "auto";}
      loadFrames(article);
    }).catch(function (error) {
      if (error.name === "AbortError" || !dialog.open || request.signal.aborted) return;
      content.setAttribute("aria-busy", "false");
      status.textContent = "The article couldn’t be loaded. You can open its page directly.";
      var fallback = document.createElement("a");
      fallback.href = destination.href;
      fallback.textContent = "Open article page";
      status.appendChild(document.createElement("br"));
      status.appendChild(fallback);
    });
  });
})();
