/* ==================================================================
   PINELOOP — site behaviour.
   Loaded with defer on every page. No dependencies, no build step.
   ================================================================== */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---- legacy hash routes -------------------------------------------------
     The first version of this site was a single page with hash routing
     (#/platform, #/processes, ...). Anything already linked or bookmarked with
     one of those is forwarded to the real URL. Safe to delete once the old
     links are gone from the wild. */
  (function () {
    var LEGACY = {
      '#/': '/', '#/platform': '/platform/', '#/processes': '/processes/',
      '#/deploy': '/deploy/', '#/contact': '/contact/'
    };
    var target = LEGACY[window.location.hash];
    if (target && window.location.pathname === '/') {
      window.location.replace(target);
    }
  })();

  /* ---- mobile navigation -------------------------------------------------- */
  var nav = document.getElementById('primaryNav');
  var navToggle = document.getElementById('navToggle');

  function closeNav() {
    if (!nav || !navToggle) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.textContent = 'Menu';
  }

  if (navToggle && nav) {
    navToggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.textContent = open ? 'Close' : 'Menu';
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* ---- header rule appears once the page has moved ------------------------ */
  var head = document.getElementById('siteHead');
  if (head) {
    var stuck = false;
    window.addEventListener('scroll', function () {
      var now = window.pageYOffset > 6;
      if (now !== stuck) { head.classList.toggle('is-stuck', now); stuck = now; }
    }, { passive: true });
  }

  /* ---- section reveals ---------------------------------------------------- */
  var revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced.matches) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); ro.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    for (var i = 0; i < revealables.length; i++) ro.observe(revealables[i]);
  } else {
    for (var j = 0; j < revealables.length; j++) revealables[j].classList.add('is-in');
  }

  /* ---- the one moment of motion: the cleared route draws itself ----------- */
  var traces = document.querySelectorAll('.trace-anim');
  for (var t = 0; t < traces.length; t++) {
    (function (path) {
      var len = 0;
      try { len = path.getTotalLength(); } catch (e) { len = 0; }
      if (!len || reduced.matches) {
        path.style.strokeDasharray = 'none';
        path.style.strokeDashoffset = '0';
        return;
      }
      path.style.strokeDasharray = len + ' ' + len;
      path.style.strokeDashoffset = len;
      window.requestAnimationFrame(function () {
        window.setTimeout(function () {
          path.style.transition = 'stroke-dashoffset 1800ms cubic-bezier(.22,.61,.36,1)';
          path.style.strokeDashoffset = '0';
        }, 280);
      });
    })(traces[t]);
  }

  /* ---- discovery call form ------------------------------------------------
     Validates, then posts url-encoded data to the form's own action. That
     contract is what Netlify Forms, Formspree, Basin and a plain endpoint all
     accept, so switching provider is a change to the action attribute only. */
  var form = document.getElementById('contactForm');
  if (!form) return;

  var doc = document.getElementById('formDoc');
  var confirmEl = document.getElementById('formConfirm');
  var failEl = document.getElementById('formFail');
  var submitBtn = document.getElementById('formSubmit');
  var FIELDS = ['name', 'company', 'email', 'message'];

  function setError(id, on) {
    var f = document.getElementById('f-' + id), input = document.getElementById('in-' + id);
    f.classList.toggle('has-error', on);
    input.setAttribute('aria-invalid', on ? 'true' : 'false');
    if (on) input.setAttribute('aria-describedby', 'e-' + id);
    else input.removeAttribute('aria-describedby');
  }

  function busy(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.textContent = on ? 'Sending' : 'Request a call';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var firstBad = null;
    FIELDS.forEach(function (id) {
      var input = document.getElementById('in-' + id),
          value = input.value.trim(),
          bad = value === '';
      if (id === 'email' && !bad) bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
      setError(id, bad);
      if (bad && !firstBad) firstBad = input;
    });
    if (firstBad) { firstBad.focus(); return; }

    if (failEl) failEl.hidden = true;
    busy(true);

    var body = new URLSearchParams(new FormData(form)).toString();

    fetch(form.getAttribute('action') || window.location.pathname, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: body
    })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        doc.hidden = true;
        if (confirmEl) { confirmEl.hidden = false; confirmEl.focus(); }
      })
      .catch(function () {
        busy(false);
        if (failEl) { failEl.hidden = false; failEl.focus(); }
      });
  });

  FIELDS.forEach(function (id) {
    document.getElementById('in-' + id).addEventListener('input', function () {
      if (document.getElementById('f-' + id).classList.contains('has-error')) setError(id, false);
    });
  });
})();
