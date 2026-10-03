/* Enquiry form → Web3Forms, from the browser. Reasoning: see contact.astro. */
(function () {
  var form = document.querySelector('[data-enquiry]');
  if (!form) return;
  var button = form.querySelector('[type="submit"]');
  var status = form.querySelector('[data-enquiry-status]');
  var email = form.querySelector('[name="email"]');
  var busy = false;

  // Native validation can stop submit before this handler runs, with no
  // visible explanation on mobile. Keep native constraints as the no-JS
  // fallback; with JS, explain them in the page before contacting the provider.
  form.noValidate = true;
  function validate() {
    var fields = form.querySelectorAll('input:not([type="hidden"]), textarea');
    var invalid = null;
    fields.forEach(function (field) {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
      if (!invalid && ((!field.value.trim() && field.required) || !field.checkValidity())) invalid = field;
    });
    if (!invalid) return true;
    var label = invalid.labels[0].textContent.trim();
    var message = invalid.validity.typeMismatch ? 'Please enter a valid email address.' :
      !invalid.value.trim() ? 'Please enter your ' + label.toLowerCase() + '.' :
      'Please check your ' + label.toLowerCase() + '.';
    status.textContent = message + ' Your enquiry has not been sent.';
    invalid.setAttribute('aria-invalid', 'true');
    invalid.setAttribute('aria-describedby', status.id);
    invalid.focus();
    return false;
  }
  form.addEventListener('input', function (event) {
    event.target.removeAttribute('aria-invalid');
    event.target.removeAttribute('aria-describedby');
  });

  function reset() {
    busy = false; button.disabled = false; button.textContent = 'Send enquiry';
    form.removeAttribute('aria-busy');
  }
  function say(message) { status.textContent = message; status.focus(); }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (busy || !validate()) return;

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
