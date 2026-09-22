/* Enquiry form → Web3Forms, from the browser. Reasoning: see contact.astro. */
(function () {
  var form = document.querySelector('[data-enquiry]');
  if (!form) return;
  var button = form.querySelector('[type="submit"]');
  var status = form.querySelector('[data-enquiry-status]');
  var email = form.querySelector('[name="email"]');
  var busy = false;

  function reset() {
    busy = false; button.disabled = false; button.textContent = 'Send enquiry';
    form.removeAttribute('aria-busy');
  }
  function say(message) { status.textContent = message; status.focus(); }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;

    // No key (preview, branch, local build): say so, contact no one.
    if (!form.elements.access_key.value) {
      say('The form is not available on this copy of the site. Please email the studio using the link on this page.');
      return;
    }

    busy = true; button.disabled = true; button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true'); status.textContent = 'Sending your enquiry…';

    var data = Object.fromEntries(new FormData(form));
    data.subject = 'Enquiry from ' + (data.name || 'the website') + ' — btldesigns.in';
    data.replyto = email.value;

    try {
      var response = await fetch(form.action, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(15000),
      });
      var result = await response.json();
      if (response.ok && result.success === true) { location.assign('/contact/thanks/'); return; }
      // Web3Forms' own words are specific; keep them.
      say((result && result.message ? result.message + ' ' : '') +
          'Your message has not been sent and is still here. You can try again, or email the studio.');
    } catch (_) {
      say('Delivery could not be confirmed. Your message is still here. Please wait a moment before trying again, or email the studio.');
    } finally {
      reset();
    }
  });

  window.addEventListener('pageshow', reset);
})();
