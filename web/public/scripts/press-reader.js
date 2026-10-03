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

    // On a phone the reader is a card (components.css); a finger pulls it down
    // by its top edge — the handle and the bar — to put it away. A short pull
    // springs back; far enough, or a flick, closes it. Taps on the bar's
    // buttons are untouched: nothing moves until the finger has.
    var pull = null;
    dialog.addEventListener("pointerdown", function (ev) {
      if (ev.pointerType === "mouse" || outsideDown) return;
      var top = dialog.getBoundingClientRect().top, bar = dialog.querySelector(".press-reader__bar");
      if (ev.clientY > bar.getBoundingClientRect().bottom || ev.clientY < top) return;
      pull = {id: ev.pointerId, y: ev.clientY, dy: 0, t: performance.now(), v: 0, moving: false};
    });
    dialog.addEventListener("pointermove", function (ev) {
      if (!pull || ev.pointerId !== pull.id) return;
      var dy = Math.max(0, ev.clientY - pull.y), now = performance.now();
      if (!pull.moving && dy < 8) return;
      if (!pull.moving) { pull.moving = true; dialog.setPointerCapture(ev.pointerId); dialog.style.transition = "none"; }
      pull.v = (dy - pull.dy) / Math.max(1, now - pull.t); pull.dy = dy; pull.t = now;
      dialog.style.transform = "translateY(" + dy + "px)";
    });
    function letGo(ev) {
      if (!pull || ev.pointerId !== pull.id) return;
      var p = pull; pull = null;
      if (!p.moving) return;
      dialog.style.transition = "transform 240ms cubic-bezier(.2,.7,.2,1)";
      if (ev.type === "pointerup" && (p.dy > dialog.clientHeight * 0.22 || p.v > 0.6)) {
        dialog.style.transform = "translateY(100%)";
        setTimeout(function () { dismiss(); dialog.style.transform = ""; dialog.style.transition = ""; }, 240);
      } else {
        dialog.style.transform = "";
        setTimeout(function () { dialog.style.transition = ""; }, 240);
      }
    }
    dialog.addEventListener("pointerup", letGo);
    dialog.addEventListener("pointercancel", letGo);
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

  function dismiss() {
    close();
    if (history.state && history.state.btlPressReader) {
      historyPending = true;
      history.back();
    }
  }

  window.addEventListener("popstate", function () {
    historyPending = false;
    close();
    restoreHistoryScroll();
  });
  window.addEventListener("pagehide", close);
  window.addEventListener("pageshow", restoreHistoryScroll);

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
    // Focus goes to Close either way; its ring is drawn only for a keyboard
    // (a click with no pointer behind it has detail 0). After a tap it framed
    // the X in a bright box the reader had not asked for.
    closeButton.focus({preventScroll: true, focusVisible: ev.detail === 0});
    // Same URL: BTL stays in place. Back dismisses the reader; Forward never
    // replays a stale article or introduces an external navigation.
    history.pushState(Object.assign({}, history.state, {btlPressReader: true}), "", location.href);
    controller = new AbortController();
    var request = controller;
    fetch(destination.href, {signal: request.signal}).then(function (response) {
      if (!response.ok) throw new Error("article unavailable");
      if (new URL(response.url).origin !== location.origin) throw new Error("external redirect");
      return response.text();
    }).then(function (html) {
      if (!dialog.open || request.signal.aborted) return;
      var article = new DOMParser().parseFromString(html, "text/html").querySelector("[data-article-content]");
      if (!article) throw new Error("article missing");
      // The fetched markup is our own statically rendered, escaped CMS content.
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
