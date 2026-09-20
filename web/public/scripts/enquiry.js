(function () {
  var form = document.querySelector('[data-enquiry]');
  if (!form) return;
  var button = form.querySelector('[type="submit"]');
  var status = form.querySelector('[data-enquiry-status]');
  var busy = false;
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (busy || !form.reportValidity()) return;
    busy = true; button.disabled = true; button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true'); status.textContent = 'Sending your enquiry…';
    try {
      var response = await fetch(form.action, {method:'POST',body:new URLSearchParams(new FormData(form)),headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
      var result = await response.json();
      if (response.ok && result.ok) { location.assign('/contact/thanks/'); return; }
      status.textContent = result.message || 'Your enquiry could not be sent. Please email the studio using the link on this page.';
    } catch (_) {
      status.textContent = 'Delivery could not be confirmed. Your message is still here. Please wait before trying again, or email the studio.';
    } finally {
      busy = false; button.disabled = false; button.textContent = 'Send enquiry';
      form.removeAttribute('aria-busy');
    }
    status.focus();
  });
  window.addEventListener('pageshow', function () {
    busy = false; button.disabled = false; button.textContent = 'Send enquiry'; form.removeAttribute('aria-busy');
  });
})();
