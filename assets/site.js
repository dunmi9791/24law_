/* 24 Law — site behaviors: mobile menu, scroll reveals, form validation, simple filters */
(function () {
  'use strict';

  // -------- Mobile menu --------
  const toggle = document.querySelector('[data-menu-toggle]');
  const drawer = document.querySelector('[data-mobile-drawer]');
  if (toggle && drawer) {
    toggle.addEventListener('click', () => {
      const open = drawer.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      drawer.classList.remove('open');
      toggle.classList.remove('open');
      document.body.style.overflow = '';
    }));
  }

  // -------- Scroll reveal --------
  const io = ('IntersectionObserver' in window) ? new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' }) : null;

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
    if (io) io.observe(el); else el.classList.add('in');
  });

  // -------- Odoo CRM via Lambda proxy --------
  var ODOO_PROXY = 'https://do6jhb37y2beepxpnrc7rrzwqe0ecmqo.lambda-url.us-east-2.on.aws';

  function odooCreateLead(payload) {
    return fetch(ODOO_PROXY + '/api/odoo/crm-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  // -------- Newsletter (footer) --------
  document.querySelectorAll('[data-newsletter]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const status = form.querySelector('[data-status]');
      if (!input.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        if (status) status.textContent = 'Please enter a valid email.';
        input.focus();
        return;
      }
      var email = input.value.trim();
      if (status) status.textContent = 'Subscribing…';

      fetch(ODOO_PROXY + '/api/odoo/mailing-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: email, email: email })
      })
        .then(function () {
          if (status) status.textContent = 'Thank you — we\u2019ll be in touch.';
          input.value = '';
        })
        .catch(function () {
          if (status) status.textContent = 'Thank you — we\u2019ll be in touch.';
          input.value = '';
        });
    });
  });

  // -------- Contact form validation + Odoo submission --------
  document.querySelectorAll('[data-contact-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let ok = true;
      form.querySelectorAll('[data-required]').forEach(field => {
        const input = field.querySelector('input, textarea, select');
        const msg = field.querySelector('.err-msg');
        if (!input.value.trim()) {
          field.classList.add('error');
          if (msg) msg.textContent = 'Required.';
          ok = false;
        } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
          field.classList.add('error');
          if (msg) msg.textContent = 'Please enter a valid email.';
          ok = false;
        } else {
          field.classList.remove('error');
          if (msg) msg.textContent = '';
        }
      });
      const status = form.querySelector('[data-form-status]');
      if (!ok) {
        if (status) status.textContent = 'Please correct the highlighted fields.';
        return;
      }

      const btn = form.querySelector('button[type="submit"]');
      if (btn) btn.disabled = true;

      const f = form.elements;
      const name = (f.name && f.name.value || '').trim();
      const org = (f.organisation && f.organisation.value || '').trim();
      const email = (f.email && f.email.value || '').trim();
      const phone = (f.phone && f.phone.value || '').trim();
      const position = (f.position && f.position.value || '').trim();
      const jurisdiction = (f.jurisdiction && f.jurisdiction.value || '').trim();
      const matterType = (f.matter_type && f.matter_type.value || '').trim();
      const urgency = (f.urgency && f.urgency.value || '').trim();
      const contactMethod = (f.contact_method && f.contact_method.value || '').trim();
      const message = (f.message && f.message.value || '').trim();

      var desc = 'Message: ' + message +
        '\nPosition: ' + (position || 'Not provided') +
        '\nJurisdiction: ' + (jurisdiction || 'Not provided') +
        '\nUrgency: ' + (urgency || 'Not provided') +
        '\nPreferred contact: ' + (contactMethod || 'Not provided');

      if (status) status.textContent = 'Submitting…';

      odooCreateLead({
        name: (matterType && matterType !== 'Select a matter type' ? matterType : 'General Enquiry') + ' — ' + name,
        contact_name: name,
        email_from: email,
        phone: phone,
        partner_name: org || '',
        description: desc,
        type: 'opportunity'
      })
        .then(function (res) {
          if (btn) btn.disabled = false;
          if (status) status.textContent = 'Thank you. A member of our team will be in touch within one business day.';
          form.reset();
        })
        .catch(function () {
          if (btn) btn.disabled = false;
          if (status) status.textContent = 'Thank you. A member of our team will be in touch within one business day.';
          form.reset();
        });
    });
    form.querySelectorAll('[data-required] input, [data-required] textarea').forEach(el => {
      el.addEventListener('input', () => {
        const f = el.closest('[data-required]');
        f.classList.remove('error');
        const m = f.querySelector('.err-msg');
        if (m) m.textContent = '';
      });
    });
  });

  // -------- Filters (Our People / Practice Areas) --------
  document.querySelectorAll('[data-filter-group]').forEach(group => {
    const targets = document.querySelectorAll(group.dataset.filterTarget);
    const search = document.querySelector(group.dataset.filterSearch || '');
    let activeCat = 'all';

    function apply() {
      const q = (search && search.value || '').trim().toLowerCase();
      targets.forEach(t => {
        const cats = (t.dataset.cats || '').toLowerCase();
        const text = t.textContent.toLowerCase();
        const matchCat = activeCat === 'all' || cats.split(',').map(s => s.trim()).includes(activeCat);
        const matchQ = !q || text.includes(q);
        t.style.display = (matchCat && matchQ) ? '' : 'none';
      });
      const empty = document.querySelector(group.dataset.filterEmpty || '');
      if (empty) {
        const visible = [...targets].some(t => t.style.display !== 'none');
        empty.style.display = visible ? 'none' : '';
      }
    }

    group.querySelectorAll('[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCat = btn.dataset.filter;
        apply();
      });
    });
    if (search) search.addEventListener('input', apply);
  });

  // -------- Hero carousel --------
  const carousel = document.querySelector('[data-hero-carousel]');
  if (carousel) {
    const slides = carousel.querySelectorAll('.hero-slide');
    const dots = carousel.querySelectorAll('.hero-dot');
    const imgSlides = carousel.querySelectorAll('.hero-img');
    const progressBar = carousel.querySelector('.hero-progress-bar');
    const INTERVAL = 5000;
    let current = 0;
    let timer = null;
    let elapsed = 0;
    let rafId = null;
    let lastTick = 0;

    function goTo(idx) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      if (imgSlides[current]) imgSlides[current].classList.remove('active');
      current = idx;
      var s = slides[current];
      s.style.animation = 'none';
      s.offsetHeight;
      s.style.animation = '';
      s.classList.add('active');
      dots[current].classList.add('active');
      if (imgSlides[current]) imgSlides[current].classList.add('active');
      elapsed = 0;
      lastTick = performance.now();
    }

    function tick(now) {
      elapsed += now - lastTick;
      lastTick = now;
      if (progressBar) progressBar.style.width = Math.min((elapsed / INTERVAL) * 100, 100) + '%';
      if (elapsed >= INTERVAL) {
        goTo((current + 1) % slides.length);
      }
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      lastTick = performance.now();
      rafId = requestAnimationFrame(tick);
    }

    function stop() {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    }

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        stop();
        goTo(parseInt(dot.dataset.dot, 10));
        start();
      });
    });

    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', () => { lastTick = performance.now(); start(); });

    start();
  }

  // -------- Tweaks panel (accent color) --------
  // tiny custom panel — no React needed
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "#B8935A"
  }/*EDITMODE-END*/;

  let panel, panelOpen = false;

  function applyTweaks(t) {
    document.documentElement.style.setProperty('--accent', t.accent);
    document.documentElement.style.setProperty('--brass', t.accent);
    // derive deeper variant
    document.documentElement.style.setProperty('--brass-deep', t.accent);
  }
  applyTweaks(TWEAK_DEFAULTS);

  function makePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed; right: 18px; bottom: 18px; z-index: 200;
      background: var(--paper); color: var(--ink);
      border: 1px solid var(--rule-strong);
      border-radius: 6px;
      padding: 18px 20px 16px;
      width: 260px;
      box-shadow: 0 12px 40px rgba(14,27,51,.18);
      font-family: var(--sans); font-size: 13px;
      display: none;
    `;
    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <div style="font-family:var(--display);font-size:18px;font-weight:500;">Tweaks</div>
        <button data-tweak-close style="width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;color:var(--ink-mute);">✕</button>
      </div>
      <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-mute);margin-bottom:10px;">Accent color</div>
      <div data-tweak-swatches style="display:flex;gap:10px;flex-wrap:wrap;"></div>
    `;
    document.body.appendChild(panel);

    const swatches = [
      { name: 'Brass',  c: '#B8935A' },
      { name: 'Forest', c: '#1B3A2F' },
      { name: 'Ink',    c: '#0E1B33' },
      { name: 'Brick',  c: '#9A4A3A' }
    ];
    const swatchWrap = panel.querySelector('[data-tweak-swatches]');
    swatches.forEach(s => {
      const b = document.createElement('button');
      b.title = s.name;
      b.style.cssText = `
        width: 36px; height: 36px; border-radius: 999px;
        border: 1px solid var(--rule-strong);
        background: ${s.c};
        cursor: pointer; transition: transform .2s ease, box-shadow .2s ease;
      `;
      b.addEventListener('click', () => {
        applyTweaks({ accent: s.c });
        if (window.parent) window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { accent: s.c } }, '*');
        swatchWrap.querySelectorAll('button').forEach(x => x.style.boxShadow = '');
        b.style.boxShadow = '0 0 0 2px var(--paper), 0 0 0 3px var(--ink)';
      });
      swatchWrap.appendChild(b);
    });

    panel.querySelector('[data-tweak-close]').addEventListener('click', () => {
      panel.style.display = 'none';
      panelOpen = false;
      if (window.parent) window.parent.postMessage({ type: '__edit_mode_dismissed' }, '*');
    });
    return panel;
  }

  window.addEventListener('message', (e) => {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === '__activate_edit_mode') {
      makePanel().style.display = 'block';
      panelOpen = true;
    } else if (e.data.type === '__deactivate_edit_mode' && panel) {
      panel.style.display = 'none';
      panelOpen = false;
    }
  });

  if (window.parent) {
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
  }

  // -------- Capability document request modal --------
  (function initCapModal() {
    var overlay = document.querySelector('[data-cap-overlay]');
    if (!overlay) return;

    var modal = overlay.querySelector('[data-cap-modal]');
    var form = overlay.querySelector('[data-cap-form]');
    var formView = overlay.querySelector('[data-cap-form-view]');
    var successView = overlay.querySelector('[data-cap-success-view]');
    var docNameEl = overlay.querySelector('[data-cap-doc-name]');
    var docInput = overlay.querySelector('[data-cap-doc-input]');
    var statusEl = overlay.querySelector('[data-cap-status]');
    var submitBtn = overlay.querySelector('[data-cap-submit]');
    var downloadLink = overlay.querySelector('[data-cap-download-link]');

    var DOC_FILES = {
      'strategic-mandates-profile': 'assets/docs/strategic-mandates-profile.pdf',
      'public-revenue-recovery': 'assets/docs/public-revenue-recovery.pdf',
      'energy-infrastructure': 'assets/docs/energy-infrastructure.pdf',
      'nigeria-uk-counsel': 'assets/docs/nigeria-uk-counsel.pdf'
    };

    var currentDoc = '';

    function openModal(docSlug, docTitle) {
      currentDoc = docSlug;
      docNameEl.textContent = docTitle;
      docInput.value = docSlug;
      formView.style.display = '';
      successView.style.display = 'none';
      statusEl.textContent = '';
      statusEl.className = 'cap-modal-status';
      form.reset();
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      var firstInput = form.querySelector('input[name="name"]');
      if (firstInput) setTimeout(function() { firstInput.focus(); }, 100);
    }

    function closeModal() {
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-cap-doc]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        openModal(btn.dataset.capDoc, btn.dataset.capTitle);
      });
    });

    overlay.querySelector('[data-cap-close]').addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) closeModal();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });

    function sendToOdoo(data) {
      return odooCreateLead({
        name: 'Capability Document Request: ' + data.document,
        contact_name: data.name,
        email_from: data.email,
        partner_name: data.organisation || '',
        description: 'Document requested: ' + data.document + '\nName: ' + data.name + '\nEmail: ' + data.email + '\nOrganisation: ' + (data.organisation || 'Not provided'),
        type: 'opportunity',
        tag_ids: [],
        source_id: false
      });
    }

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[data-required]').forEach(function(field) {
        var input = field.querySelector('input');
        var msg = field.querySelector('.err-msg');
        if (!input.value.trim()) {
          field.classList.add('error');
          if (msg) msg.textContent = 'Required.';
          ok = false;
        } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
          field.classList.add('error');
          if (msg) msg.textContent = 'Please enter a valid email.';
          ok = false;
        } else {
          field.classList.remove('error');
          if (msg) msg.textContent = '';
        }
      });

      if (!ok) {
        statusEl.textContent = 'Please correct the highlighted fields.';
        statusEl.className = 'cap-modal-status error';
        return;
      }

      var data = {
        name: form.querySelector('[name="name"]').value.trim(),
        email: form.querySelector('[name="email"]').value.trim(),
        organisation: form.querySelector('[name="organisation"]').value.trim(),
        document: currentDoc
      };

      submitBtn.disabled = true;
      submitBtn.querySelector('span').textContent = 'Submitting…';
      statusEl.textContent = '';
      statusEl.className = 'cap-modal-status';

      sendToOdoo(data)
        .then(function(res) {
          if (!res.ok) throw new Error('CRM error');
          showSuccess();
        })
        .catch(function() {
          showSuccess();
        });
    });

    function showSuccess() {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Request Document';
      formView.style.display = 'none';
      successView.style.display = '';
      var filePath = DOC_FILES[currentDoc] || '#';
      downloadLink.href = filePath;
    }

    form.querySelectorAll('[data-required] input').forEach(function(el) {
      el.addEventListener('input', function() {
        var f = el.closest('[data-required]');
        f.classList.remove('error');
        var m = f.querySelector('.err-msg');
        if (m) m.textContent = '';
      });
    });
  })();

  // -------- Practice areas hero carousel --------
  (function initPACarousel() {
    var container = document.getElementById('paSlides');
    if (!container) return;

    var NAVY = '#0B1733';
    var NAVY_DEEP = '#060E22';
    var NAVY_MID = '#142853';
    var GOLD = '#C8A55B';
    var GOLD_LIGHT = '#E2C282';
    var CREAM = '#F5F1E8';

    var areas = [
      { num: '01', name: 'Alternative Dispute Resolution', svg: adrSvg },
      { num: '02', name: 'Anti-Corruption & Bribery', svg: antiCorrSvg },
      { num: '03', name: 'Aviation', svg: aviationSvg },
      { num: '04', name: 'Banking & Finance', svg: bankingSvg },
      { num: '05', name: 'Business Immigration', svg: immigrationSvg },
      { num: '06', name: 'Commercial Real Estate', svg: realEstateSvg },
      { num: '07', name: 'Commercial Transactions', svg: transactionsSvg },
      { num: '08', name: 'Construction', svg: constructionSvg },
      { num: '09', name: 'Employment & Labour', svg: employmentSvg },
      { num: '10', name: 'Energy', svg: energySvg },
      { num: '11', name: 'Government Relations', svg: governmentSvg },
      { num: '12', name: 'Intellectual Property', svg: ipSvg },
      { num: '13', name: 'Litigation', svg: litigationSvg },
      { num: '14', name: 'Regulatory', svg: regulatorySvg },
      { num: '15', name: 'Taxation', svg: taxationSvg },
      { num: '16', name: 'Wills & Estates', svg: willsSvg },
    ];

    // Build SVG generators
    function bgDefs() {
      return '<defs>' +
        '<radialGradient id="rgl" cx="65%" cy="35%" r="65%">' +
          '<stop offset="0%" stop-color="' + NAVY_MID + '" stop-opacity="0.9"/>' +
          '<stop offset="100%" stop-color="' + NAVY_DEEP + '" stop-opacity="1"/>' +
        '</radialGradient>' +
        '<pattern id="grid" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">' +
          '<path d="M 80 0 L 0 0 0 80" fill="none" stroke="' + GOLD + '" stroke-width="0.5" opacity="0.06"/>' +
        '</pattern>' +
      '</defs>' +
      '<rect width="1920" height="1080" fill="url(#rgl)"/>' +
      '<rect width="1920" height="1080" fill="url(#grid)"/>';
    }
    function wrap(inner) {
      return '<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" style="display:block;width:100%;height:100%;">' + bgDefs() + inner + '</svg>';
    }

    function adrSvg() {
      return wrap(
        '<g transform="translate(960 480)">' +
          '<circle r="260" fill="none" stroke="' + GOLD + '" stroke-width="3" opacity="0.4"/>' +
          '<circle r="180" fill="none" stroke="' + GOLD + '" stroke-width="2" opacity="0.3"/>' +
          '<circle r="100" fill="none" stroke="' + GOLD + '" stroke-width="1.5" opacity="0.2"/>' +
          '<line x1="-300" y1="0" x2="300" y2="0" stroke="' + CREAM + '" stroke-width="2" opacity="0.3"/>' +
          '<circle cx="-200" cy="0" r="50" fill="' + CREAM + '" opacity="0.9"/>' +
          '<circle cx="200" cy="0" r="50" fill="' + GOLD + '" opacity="0.9"/>' +
          '<circle cx="0" cy="0" r="40" fill="' + CREAM + '" opacity="0.7"/>' +
          '<path d="M -60 -80 Q 0 -140 60 -80" fill="none" stroke="' + GOLD + '" stroke-width="3"/>' +
          '<text x="0" y="10" text-anchor="middle" font-family="serif" font-size="32" font-weight="700" fill="' + NAVY + '">ADR</text>' +
        '</g>'
      );
    }

    function antiCorrSvg() {
      return wrap(
        '<g transform="translate(960 480)">' +
          '<path d="M 0 -280 L 220 -220 L 220 60 Q 220 200 0 300 Q -220 200 -220 60 L -220 -220 Z" fill="' + NAVY_MID + '" stroke="' + GOLD + '" stroke-width="4"/>' +
          '<path d="M 0 -240 L 180 -190 L 180 50 Q 180 170 0 260 Q -180 170 -180 50 L -180 -190 Z" fill="none" stroke="' + GOLD + '" stroke-width="1.5" opacity="0.5"/>' +
          '<line x1="-80" y1="40" x2="-30" y2="90" stroke="' + CREAM + '" stroke-width="12" stroke-linecap="round"/>' +
          '<line x1="-30" y1="90" x2="100" y2="-50" stroke="' + CREAM + '" stroke-width="12" stroke-linecap="round"/>' +
        '</g>'
      );
    }

    function aviationSvg() {
      return wrap(
        '<g opacity="0.18" stroke="' + GOLD + '" stroke-width="1.5" fill="none">' +
          '<ellipse cx="960" cy="540" rx="900" ry="200"/>' +
          '<ellipse cx="960" cy="540" rx="700" ry="160"/>' +
          '<ellipse cx="960" cy="540" rx="500" ry="120"/>' +
        '</g>' +
        '<path d="M 100 800 Q 960 100 1820 800" fill="none" stroke="' + GOLD + '" stroke-width="3" opacity="0.7"/>' +
        '<g transform="translate(1200 400) rotate(10)">' +
          '<path d="M -90 0 L 30 -8 L 70 -3 L 70 3 L 30 8 L -90 0 L -50 -25 L -30 -25 L -10 -5 L -10 5 L -30 25 L -50 25 Z" fill="' + CREAM + '" stroke="' + GOLD + '" stroke-width="1.5"/>' +
        '</g>'
      );
    }

    function bankingSvg() {
      var cols = '';
      [340,540,740,940,1140,1340,1540].forEach(function(x) {
        cols += '<rect x="' + (x-25) + '" y="400" width="50" height="380" fill="' + CREAM + '"/>' +
                '<rect x="' + (x-35) + '" y="385" width="70" height="15" fill="' + CREAM + '"/>';
      });
      return wrap(
        '<rect x="240" y="780" width="1400" height="40" fill="' + CREAM + '" opacity="0.9"/>' +
        '<polygon points="200,400 1680,400 1640,360 240,360" fill="' + CREAM + '" opacity="0.9"/>' +
        '<polygon points="940,200 200,400 1680,400" fill="' + CREAM + '" opacity="0.95"/>' +
        cols +
        '<g transform="translate(1620 880)" opacity="0.9">' +
          '<path d="M 0 0 L 50 -30 L 100 -20 L 150 -70 L 200 -50 L 250 -110" fill="none" stroke="' + GOLD + '" stroke-width="4"/>' +
          '<circle cx="250" cy="-110" r="8" fill="' + GOLD + '"/>' +
        '</g>' +
        '<g transform="translate(280 880)">' +
          '<circle r="38" fill="' + GOLD + '"/>' +
          '<text x="0" y="14" text-anchor="middle" font-family="serif" font-size="48" font-weight="700" fill="' + NAVY + '">$</text>' +
        '</g>'
      );
    }

    function immigrationSvg() {
      return wrap(
        '<g transform="translate(1300 540)">' +
          '<circle r="280" fill="' + NAVY_MID + '" stroke="' + GOLD + '" stroke-width="2"/>' +
          '<ellipse cx="0" cy="0" rx="280" ry="90" fill="none" stroke="' + GOLD + '" stroke-width="1.2" opacity="0.6"/>' +
          '<ellipse cx="0" cy="0" rx="90" ry="280" fill="none" stroke="' + GOLD + '" stroke-width="1.2" opacity="0.4"/>' +
          '<line x1="-280" y1="0" x2="280" y2="0" stroke="' + GOLD + '" stroke-width="1.2" opacity="0.6"/>' +
          '<path d="M -130 -100 Q -80 -120 -40 -90 Q -60 -50 -110 -60 Z" fill="' + GOLD + '" opacity="0.7"/>' +
          '<path d="M 30 -40 Q 90 -60 140 -20 Q 110 30 50 20 Z" fill="' + GOLD + '" opacity="0.7"/>' +
        '</g>' +
        '<g transform="translate(520 560) rotate(-8)">' +
          '<rect x="-180" y="-240" width="360" height="480" rx="14" fill="' + NAVY_DEEP + '" stroke="' + GOLD + '" stroke-width="3"/>' +
          '<circle cx="0" cy="-40" r="70" fill="none" stroke="' + GOLD + '" stroke-width="3"/>' +
          '<text x="0" y="120" text-anchor="middle" font-family="serif" font-size="36" font-weight="600" fill="' + CREAM + '" letter-spacing="6">PASSPORT</text>' +
        '</g>'
      );
    }

    function realEstateSvg() {
      var bldgs = '';
      [[220,180,540],[420,220,720],[660,200,620],[880,260,820],[1160,180,560],[1360,240,700],[1620,160,480]].forEach(function(b) {
        bldgs += '<rect x="' + b[0] + '" y="' + (900-b[2]) + '" width="' + b[1] + '" height="' + b[2] + '" fill="' + CREAM + '" opacity="0.92"/>';
      });
      return wrap(bldgs + '<rect x="0" y="898" width="1920" height="4" fill="' + GOLD + '" opacity="0.6"/>');
    }

    function transactionsSvg() {
      return wrap(
        '<g transform="translate(960 540)">' +
          '<rect x="-500" y="-50" width="320" height="100" rx="20" fill="' + CREAM + '" opacity="0.9"/>' +
          '<rect x="180" y="-50" width="320" height="100" rx="20" fill="' + GOLD + '" opacity="0.9"/>' +
          '<ellipse cx="0" cy="0" rx="100" ry="40" fill="' + CREAM + '"/>' +
          '<path d="M -90 -20 Q 0 -50 90 -20" stroke="' + GOLD + '" stroke-width="3" fill="none"/>' +
        '</g>' +
        '<g transform="translate(960 260)">' +
          '<rect x="-90" y="-110" width="180" height="220" rx="8" fill="' + CREAM + '"/>' +
          '<rect x="-70" y="-90" width="140" height="3" fill="' + NAVY + '"/>' +
          '<rect x="-70" y="-70" width="100" height="2" fill="' + NAVY + '" opacity="0.5"/>' +
          '<rect x="-70" y="-55" width="120" height="2" fill="' + NAVY + '" opacity="0.5"/>' +
          '<path d="M -50 60 Q -30 40 -10 60 Q 10 80 30 50 Q 50 30 70 60" stroke="' + GOLD + '" stroke-width="2.5" fill="none"/>' +
        '</g>'
      );
    }

    function constructionSvg() {
      var scaff = '';
      [0,1,2,3,4].forEach(function(i) {
        scaff += '<line x1="1080" y1="' + (420+i*110) + '" x2="1620" y2="' + (420+i*110) + '" stroke="' + GOLD + '" stroke-width="2" opacity="0.7"/>';
      });
      return wrap(
        '<rect x="1100" y="400" width="500" height="500" fill="' + CREAM + '" opacity="0.88"/>' +
        scaff +
        '<rect x="395" y="180" width="20" height="720" fill="' + CREAM + '"/>' +
        '<rect x="-50" y="180" width="900" height="14" fill="' + CREAM + '"/>' +
        '<path d="M -50 180 L 405 100 L 850 180" stroke="' + CREAM + '" stroke-width="3" fill="none"/>' +
        '<rect x="-50" y="170" width="80" height="40" fill="' + GOLD + '"/>' +
        '<line x1="700" y1="194" x2="700" y2="550" stroke="' + CREAM + '" stroke-width="2"/>' +
        '<rect x="650" y="550" width="100" height="60" fill="' + GOLD + '"/>' +
        '<rect x="0" y="898" width="1920" height="4" fill="' + GOLD + '" opacity="0.6"/>'
      );
    }

    function employmentSvg() {
      var figs = '';
      [[360,GOLD],[600,CREAM],[840,GOLD],[1080,CREAM],[1320,GOLD],[1560,CREAM]].forEach(function(f) {
        figs += '<g transform="translate(' + f[0] + ' 660)">' +
          '<circle cx="0" cy="-110" r="40" fill="' + f[1] + '"/>' +
          '<path d="M -60 -50 Q -60 -75 0 -75 Q 60 -75 60 -50 L 60 80 L -60 80 Z" fill="' + f[1] + '"/>' +
          '<rect x="60" y="20" width="50" height="40" fill="' + NAVY_DEEP + '" stroke="' + f[1] + '" stroke-width="2"/>' +
        '</g>';
      });
      return wrap(figs + '<line x1="280" y1="800" x2="1640" y2="800" stroke="' + GOLD + '" stroke-width="2" stroke-dasharray="12 12" opacity="0.6"/>');
    }

    function energySvg() {
      var pylons = '';
      [300,750,1200,1650].forEach(function(x) {
        pylons += '<g transform="translate(' + x + ' 200)">' +
          '<line x1="0" y1="0" x2="0" y2="700" stroke="' + CREAM + '" stroke-width="3"/>' +
          '<polygon points="-60,200 0,150 60,200 60,500 -60,500" fill="none" stroke="' + CREAM + '" stroke-width="2"/>' +
          '<line x1="-80" y1="240" x2="80" y2="240" stroke="' + CREAM + '" stroke-width="2"/>' +
          '<line x1="-100" y1="290" x2="100" y2="290" stroke="' + CREAM + '" stroke-width="2"/>' +
        '</g>';
      });
      return wrap(pylons +
        '<g transform="translate(960 540)">' +
          '<path d="M -60 -200 L 40 -40 L -10 -40 L 60 200 L -50 30 L 5 30 Z" fill="' + GOLD + '" stroke="' + GOLD_LIGHT + '" stroke-width="3"/>' +
        '</g>' +
        '<rect x="0" y="900" width="1920" height="180" fill="' + NAVY_DEEP + '"/>'
      );
    }

    function governmentSvg() {
      var cols = '';
      [-340,-240,-140,-40,60,160,260,340].forEach(function(x) {
        cols += '<rect x="' + (x-15) + '" y="50" width="30" height="200" fill="' + CREAM + '"/>' +
                '<rect x="' + (x-22) + '" y="45" width="44" height="10" fill="' + GOLD + '"/>';
      });
      return wrap(
        '<g transform="translate(960 540)">' +
          '<rect x="-500" y="200" width="1000" height="120" fill="' + CREAM + '"/>' +
          '<rect x="-540" y="280" width="1080" height="60" fill="' + CREAM + '" opacity="0.9"/>' +
          '<rect x="-400" y="50" width="800" height="200" fill="' + CREAM + '" opacity="0.95"/>' +
          cols +
          '<polygon points="-440,50 440,50 0,-50" fill="' + CREAM + '" opacity="0.98"/>' +
          '<path d="M -160 -50 Q -120 -200 0 -210 Q 120 -200 160 -50 Z" fill="' + CREAM + '"/>' +
          '<rect x="-20" y="-260" width="40" height="50" fill="' + CREAM + '"/>' +
          '<circle cx="0" cy="-270" r="14" fill="' + GOLD + '"/>' +
        '</g>' +
        '<rect x="0" y="900" width="1920" height="4" fill="' + GOLD + '" opacity="0.6"/>'
      );
    }

    function ipSvg() {
      var rays = '';
      for (var i = 0; i < 12; i++) {
        var angle = (i * 30) * Math.PI / 180;
        var r1 = 240, r2 = 320;
        rays += '<line x1="' + (960+r1*Math.cos(angle)) + '" y1="' + (540+r1*Math.sin(angle)) + '" x2="' + (960+r2*Math.cos(angle)) + '" y2="' + (540+r2*Math.sin(angle)) + '" stroke="' + GOLD + '" stroke-width="3"/>';
      }
      return wrap(
        '<g transform="translate(960 540)">' +
          '<path d="M 0 -200 Q -130 -200 -130 -80 Q -130 0 -60 60 L -60 140 L 60 140 L 60 60 Q 130 0 130 -80 Q 130 -200 0 -200 Z" fill="' + GOLD + '" opacity="0.25" stroke="' + GOLD + '" stroke-width="3"/>' +
          '<path d="M -50 0 Q -25 -80 0 -40 Q 25 0 50 -60" stroke="' + GOLD_LIGHT + '" stroke-width="4" fill="none"/>' +
          '<rect x="-60" y="140" width="120" height="20" fill="' + CREAM + '"/>' +
          '<rect x="-50" y="160" width="100" height="14" fill="' + CREAM + '" opacity="0.8"/>' +
          '<rect x="-40" y="174" width="80" height="14" fill="' + CREAM + '" opacity="0.6"/>' +
        '</g>' + rays
      );
    }

    function litigationSvg() {
      return wrap(
        '<g transform="translate(560 540)">' +
          '<rect x="-8" y="-200" width="16" height="400" fill="' + CREAM + '"/>' +
          '<rect x="-80" y="190" width="160" height="20" fill="' + CREAM + '"/>' +
          '<line x1="-280" y1="-180" x2="280" y2="-180" stroke="' + CREAM + '" stroke-width="6"/>' +
          '<line x1="-220" y1="-180" x2="-220" y2="-100" stroke="' + CREAM + '" stroke-width="2"/>' +
          '<line x1="220" y1="-180" x2="220" y2="-100" stroke="' + CREAM + '" stroke-width="2"/>' +
          '<path d="M -120 -180 Q -220 -100 -320 -180 L -320 -90 Q -220 -50 -120 -90 Z" fill="' + GOLD + '"/>' +
          '<path d="M 120 -180 Q 220 -100 320 -180 L 320 -90 Q 220 -50 120 -90 Z" fill="' + GOLD + '"/>' +
        '</g>' +
        '<g transform="translate(1360 540) rotate(20)">' +
          '<rect x="-40" y="-280" width="80" height="160" rx="8" fill="' + CREAM + '"/>' +
          '<rect x="-50" y="-300" width="100" height="20" fill="' + GOLD + '"/>' +
          '<rect x="-50" y="-120" width="100" height="20" fill="' + GOLD + '"/>' +
          '<rect x="-12" y="-100" width="24" height="320" fill="' + CREAM + '"/>' +
        '</g>'
      );
    }

    function regulatorySvg() {
      return wrap(
        '<g transform="translate(620 540)">' +
          '<path d="M 0 -300 L 240 -240 L 240 60 Q 240 220 0 320 Q -240 220 -240 60 L -240 -240 Z" fill="' + NAVY_MID + '" stroke="' + GOLD + '" stroke-width="4"/>' +
          '<path d="M -90 0 L -20 80 L 110 -80" stroke="' + GOLD + '" stroke-width="14" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</g>' +
        '<g transform="translate(1340 540)">' +
          '<rect x="-180" y="-260" width="360" height="520" rx="14" fill="' + CREAM + '"/>' +
          '<rect x="-180" y="-260" width="360" height="60" fill="' + GOLD + '"/>' +
        '</g>'
      );
    }

    function taxationSvg() {
      var lines = '';
      for (var i = 0; i < 6; i++) {
        lines += '<rect x="-140" y="' + (-180+i*60) + '" width="160" height="6" fill="' + NAVY + '" opacity="0.5"/>' +
                 '<rect x="60" y="' + (-180+i*60) + '" width="80" height="6" fill="' + NAVY + '" opacity="0.7"/>';
      }
      return wrap(
        '<g transform="translate(560 540) rotate(-6)">' +
          '<path d="M -180 -340 L 180 -340 L 180 320 L 160 340 L 140 320 L 120 340 L 100 320 L 80 340 L 60 320 L 40 340 L 20 320 L 0 340 L -20 320 L -40 340 L -60 320 L -80 340 L -100 320 L -120 340 L -140 320 L -160 340 L -180 320 Z" fill="' + CREAM + '"/>' +
          '<text x="0" y="-280" text-anchor="middle" font-family="serif" font-size="32" font-weight="700" fill="' + NAVY + '" letter-spacing="3">INVOICE</text>' +
          lines +
        '</g>' +
        '<g transform="translate(1280 540)">' +
          '<circle r="280" fill="' + GOLD + '"/>' +
          '<text x="0" y="100" text-anchor="middle" font-family="serif" font-size="380" font-weight="700" fill="' + NAVY + '">%</text>' +
        '</g>'
      );
    }

    function willsSvg() {
      return wrap(
        '<g transform="translate(700 540) rotate(-4)">' +
          '<rect x="-260" y="-340" width="520" height="680" fill="' + CREAM + '"/>' +
          '<text x="0" y="-260" text-anchor="middle" font-family="serif" font-style="italic" font-size="56" font-weight="600" fill="' + NAVY + '">Last Will</text>' +
          '<text x="0" y="-200" text-anchor="middle" font-family="serif" font-size="24" fill="' + NAVY + '" letter-spacing="4">AND TESTAMENT</text>' +
          '<line x1="-180" y1="-160" x2="180" y2="-160" stroke="' + GOLD + '" stroke-width="2"/>' +
          '<line x1="-200" y1="200" x2="100" y2="200" stroke="' + NAVY + '" stroke-width="2"/>' +
          '<circle cx="160" cy="240" r="50" fill="' + GOLD + '"/>' +
          '<text x="160" y="252" text-anchor="middle" font-family="serif" font-size="36" font-weight="700" fill="' + NAVY + '">24</text>' +
        '</g>' +
        '<g transform="translate(1480 540)">' +
          '<circle cx="0" cy="-160" r="22" fill="' + GOLD + '"/>' +
          '<circle cx="60" cy="-160" r="22" fill="' + CREAM + '"/>' +
          '<line x1="30" y1="-138" x2="30" y2="-80" stroke="' + GOLD + '" stroke-width="3"/>' +
          '<line x1="-50" y1="-80" x2="110" y2="-80" stroke="' + GOLD + '" stroke-width="3"/>' +
          '<circle cx="-50" cy="-20" r="18" fill="' + CREAM + '"/>' +
          '<circle cx="30" cy="-20" r="18" fill="' + GOLD + '"/>' +
          '<circle cx="110" cy="-20" r="18" fill="' + CREAM + '"/>' +
        '</g>'
      );
    }

    // Build slides
    areas.forEach(function(area, i) {
      var slide = document.createElement('div');
      slide.className = 'pa-slide' + (i === 0 ? ' active' : '');
      slide.innerHTML = area.svg();
      container.appendChild(slide);
    });

    // Build dots
    var dotsContainer = document.getElementById('paDots');
    areas.forEach(function(_, i) {
      var dot = document.createElement('span');
      dot.className = 'pa-carousel-dot' + (i === 0 ? ' active' : '');
      dotsContainer.appendChild(dot);
    });

    var numEl = document.getElementById('paNum');
    var nameEl = document.getElementById('paName');
    var slides = container.querySelectorAll('.pa-slide');
    var dots = dotsContainer.querySelectorAll('.pa-carousel-dot');
    var current = 0;
    var INTERVAL = 3000;

    function goTo(idx) {
      slides[current].classList.remove('active');
      dots[current].classList.remove('active');
      current = idx;
      slides[current].classList.add('active');
      dots[current].classList.add('active');
      numEl.textContent = areas[current].num;
      nameEl.textContent = areas[current].name;
    }

    var timer = setInterval(function() {
      goTo((current + 1) % areas.length);
    }, INTERVAL);

    // Pause on hover
    var carouselEl = container.closest('.pa-hero-carousel');
    if (carouselEl) {
      carouselEl.addEventListener('mouseenter', function() { clearInterval(timer); });
      carouselEl.addEventListener('mouseleave', function() {
        timer = setInterval(function() { goTo((current + 1) % areas.length); }, INTERVAL);
      });
    }
  })();

})();
