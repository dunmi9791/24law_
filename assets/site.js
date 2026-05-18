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
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }) : null;

  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el => {
    if (io) io.observe(el); else el.classList.add('in');
  });

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
      if (status) status.textContent = 'Thank you — we\u2019ll be in touch.';
      input.value = '';
    });
  });

  // -------- Contact form validation --------
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
      if (ok) {
        if (status) status.textContent = 'Thank you. A member of our team will be in touch within one business day.';
        form.reset();
      } else if (status) {
        status.textContent = 'Please correct the highlighted fields.';
      }
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
      current = idx;
      var s = slides[current];
      s.style.animation = 'none';
      s.offsetHeight;
      s.style.animation = '';
      s.classList.add('active');
      dots[current].classList.add('active');
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

})();
