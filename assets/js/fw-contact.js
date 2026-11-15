/*
 * Fluxwright contact forms for static sites.
 * Any <form data-fw-contact="project-id"> is sent to the Fluxwright mail relay, which emails it in that
 * project's design. Recognised fields: name, email, phone, subject, message; anything else is included
 * as extra detail. Status appears in [data-fw-status] inside the form (one is added if missing), and the
 * template classes .loading / .error-message / .sent-message are used when present.
 */
(function () {
  var RELAY = "https://mail.fluxwright.co/v1/contact";
  var started = Date.now();
  var KNOWN = { name: 1, email: 1, phone: 1, subject: 1, message: 1, website: 1, _captcha: 1, _next: 1, _subject: 1, _template: 1 };

  function show(el, on, text) {
    if (!el) return;
    if (text != null) el.textContent = text;
    el.style.display = on ? "block" : "none";
    if (on) el.classList.add("d-block"); else el.classList.remove("d-block");
  }

  function bind(form) {
    if (form.__fw) return;
    form.__fw = true;
    form.removeAttribute("action");
    form.setAttribute("novalidate", "");
    var status = form.querySelector("[data-fw-status]");
    if (!status && !form.querySelector(".sent-message")) {
      status = document.createElement("p");
      status.setAttribute("data-fw-status", "");
      status.setAttribute("role", "status");
      status.style.cssText = "margin:12px 0 0;font-size:14px;line-height:1.5;display:none";
      form.appendChild(status);
    }
    if (!form.querySelector('[name="website"]')) {
      var hp = document.createElement("input");
      hp.name = "website"; hp.tabIndex = -1; hp.autocomplete = "off"; hp.setAttribute("aria-hidden", "true");
      hp.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;opacity:0";
      form.appendChild(hp);
    }

  }

  // Capture at the document so template scripts bound to the form (e.g. php-email-form) never see it.
  document.addEventListener("submit", function (e) {
      var form = e.target;
      if (!form || !form.matches || !form.matches("form[data-fw-contact]")) return;
      bind(form);
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      var status = form.querySelector("[data-fw-status]");
      if (!form.checkValidity()) { form.reportValidity && form.reportValidity(); return; }
      var d = new FormData(form);
      var v = function (k) { return String(d.get(k) || "").trim(); };
      var fields = {};
      d.forEach(function (val, key) {
        if (!KNOWN[key] && typeof val === "string" && val.trim()) fields[key.replace(/[_-]+/g, " ").replace(/^\w/, function (c) { return c.toUpperCase(); })] = val.trim();
      });
      var loading = form.querySelector(".loading"), err = form.querySelector(".error-message"), sent = form.querySelector(".sent-message");
      var btn = form.querySelector('[type="submit"], button:not([type])');
      var label = btn ? btn.innerHTML : "";
      show(err, false); show(sent, false); show(status, false); show(loading, true);
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }

      fetch(RELAY, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          project: form.getAttribute("data-fw-contact"),
          name: v("name"), email: v("email"), phone: v("phone"), subject: v("subject"),
          message: v("message") || "(No message — they'd like you to get in touch.)",
          website: v("website"), fields: fields, page: location.href, startedAt: started,
        }),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          show(loading, false);
          if (res.ok) {
            form.reset();
            if (sent) show(sent, true); else { status.style.color = "#1f7a3a"; show(status, true, form.getAttribute("data-fw-success") || "Thanks! Your message has been sent. We'll get back to you soon."); }
          } else {
            var m = (res.j && res.j.error) || "Your message couldn't be sent. Please try again.";
            if (err) show(err, true, m); else { status.style.color = "#b3261e"; show(status, true, m); }
          }
        })
        .catch(function () {
          show(loading, false);
          var m = "Network problem. Please check your connection and try again.";
          if (err) show(err, true, m); else { status.style.color = "#b3261e"; show(status, true, m); }
        })
        .then(function () { if (btn) { btn.disabled = false; btn.innerHTML = label; } });
  }, true);

  function init() { document.querySelectorAll("form[data-fw-contact]").forEach(bind); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
