(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Year in footer
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Theme handling
  const html = document.documentElement;
  const key = 'theme-preference';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  function setTheme(theme) {
    if (theme === 'dark' || theme === 'light') {
      html.setAttribute('data-theme', theme);
    } else {
      html.setAttribute('data-theme', prefersDark.matches ? 'dark' : 'light');
    }
  }

  function initTheme() {
    let saved = localStorage.getItem(key);
    // Migrate old 'auto' or empty preference to dark to keep consistent dark aesthetic on mobile
    if (!saved || saved === 'auto') {
      saved = 'dark';
      localStorage.setItem(key, 'dark');
    }
    setTheme(saved);
    prefersDark.addEventListener('change', () => {
      // We no longer auto-switch; user would need a toggle in future.
    });
  }

  function toggleTheme() {
    const current = html.getAttribute('data-theme');
    if (current === 'light') {
      localStorage.setItem(key, 'dark');
      setTheme('dark');
    } else if (current === 'dark') {
      localStorage.setItem(key, 'light');
      setTheme('light');
    } else {
      // auto -> dark
      localStorage.setItem(key, 'dark');
      setTheme('dark');
    }
  }

  initTheme();

  const toggleBtn = $('#theme-toggle');
  if (toggleBtn) toggleBtn.addEventListener('click', toggleTheme);

  // Set default glow shape to a subtle 'aura'
  try { if (!document.documentElement.hasAttribute('data-glow-shape')) { document.documentElement.setAttribute('data-glow-shape', 'aura'); } } catch (_) { }

  // Projects rendering
  async function loadProjects() {
    const grid = $('#projects-grid');
    if (!grid) return;

    try {
      const res = await fetch('data/projects.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load projects');
      const projects = await res.json();
      renderProjects(projects, grid);
    } catch (err) {
      grid.innerHTML = `<p style="color:var(--muted)">Couldn't load projects right now. Check back later or visit my <a href=\"https://github.com/\" target=\"_blank\" rel=\"noopener\">GitHub</a>.</p>`;
      console.error(err);
    }
  }

  function renderProjects(projects, grid) {
    if (!Array.isArray(projects) || projects.length === 0) {
      grid.innerHTML = '<p style="color:var(--muted)">No projects added yet.</p>';
      return;
    }
    grid.innerHTML = projects.map(p => cardHTML(p)).join('');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[m]));
  }

  function cardHTML(p) {
    const title = esc(p.title || 'Untitled');
    const desc = esc(p.description || '');
    const tech = Array.isArray(p.tech) ? p.tech : [];
    const gh = p.source ? `<a class=\"btn-icon icon-link\" href=\"${esc(p.source)}\" target=\"_blank\" rel=\"noopener\" aria-label=\"GitHub repository: ${title}\" title=\"GitHub\"><svg class=\"icon\" viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" aria-hidden=\"true\" focusable=\"false\"><path fill=\"currentColor\" d=\"M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.61-4.04-1.61a3.18 3.18 0 0 0-1.34-1.76c-1.1-.75.09-.74.09-.74a2.5 2.5 0 0 1 1.82 1.22 2.54 2.54 0 0 0 3.47 1 2.54 2.54 0 0 1 .76-1.6c-2.66-.3-5.46-1.33-5.46-5.9a4.63 4.63 0 0 1 1.23-3.22 4.3 4.3 0 0 1 .12-3.18s1-.32 3.3 1.23a11.4 11.4 0 0 1 6 0c2.28-1.55 3.28-1.23 3.28-1.23.44 1 .47 2.14.1 3.18a4.63 4.63 0 0 1 1.23 3.22c0 4.6-2.8 5.6-5.47 5.9a2.84 2.84 0 0 1 .81 2.2v3.27c0 .32.21.7.83.58A12 12 0 0 0 12 .5z\"/></svg></a>` : '';

    return `
      <article class="card project-card proj-reveal">
        <h3>${title}</h3>
        ${desc ? `<p>${desc}</p>` : ''}
        ${tech.length ? `<ul class="tags">${tech.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
        ${gh ? `<div class="cta">${gh}</div>` : ''}
      </article>
    `;
  }

  loadProjects();

  // Initialize project card effects after the grid is populated
  function initProjectEffects() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    // Scroll-in reveal with stagger
    try {
      const cards = Array.from(grid.querySelectorAll('.proj-reveal'));
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const el = entry.target;
              el.classList.add('in');
              io.unobserve(el);
            }
          });
        }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

        cards.forEach((el, i) => {
          // stagger via inline transition-delay
          el.style.transitionDelay = `${Math.min(300, i * 60)}ms`;
          io.observe(el);
        });
      } else {
        cards.forEach((el) => el.classList.add('in'));
      }
    } catch (_) { }

    // Subtle 3D tilt on hover (desktop, motion-allowed)
    try {
      const isCoarse = window.matchMedia('(pointer: coarse)').matches;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (isCoarse || reduce) return;

      const maxTilt = 6; // degrees
      let raf = null, lastCard = null, rx = 0, ry = 0;

      const apply = (card, x, y) => {
        const rect = card.getBoundingClientRect();
        const nx = (x - rect.left) / rect.width;  // 0..1
        const ny = (y - rect.top) / rect.height; // 0..1
        ry = (nx - 0.5) * (maxTilt * 2);
        rx = (0.5 - ny) * (maxTilt * 2);
        if (!raf) {
          raf = requestAnimationFrame(() => {
            card.style.setProperty('--rx', rx + 'deg');
            card.style.setProperty('--ry', ry + 'deg');
            raf = null;
          });
        }
      };

      const reset = (card) => {
        if (!card) return;
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      };

      const onMove = (e) => {
        const card = e.target.closest('.project-card');
        if (!card) return;
        if (lastCard && lastCard !== card) reset(lastCard);
        lastCard = card;
        apply(card, e.clientX, e.clientY);
      };

      const onLeave = (e) => {
        const card = e.target.closest('.project-card');
        if (card) reset(card);
      };

      grid.addEventListener('pointermove', onMove, { passive: true });
      grid.addEventListener('pointerleave', onLeave, { passive: true });
    } catch (_) { }
  }

  // Re-run effects after projects load by listening to DOM changes or call after rendering
  document.addEventListener('DOMContentLoaded', () => initProjectEffects());
  // Fallback: try again after a tick in case projects load later
  setTimeout(initProjectEffects, 600);

  // Scroll spy for in-page nav (Home/About/Projects)
  function initScrollSpy() {
    const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
    if (!links.length) return;
    const sections = links
      .map(a => a.getAttribute('href').slice(1))
      .map(id => document.getElementById(id))
      .filter(Boolean);

    const linkFor = (id) => links.find(a => a.getAttribute('href') === '#' + id);
    const setActive = (id) => {
      links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
    };

    let currentId = '';
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          if (id && id !== currentId) {
            currentId = id; setActive(id);
          }
        }
      });
    }, { rootMargin: '-40% 0px -50% 0px', threshold: 0.01 });

    sections.forEach(sec => io.observe(sec));

    // Initialize active state based on hash or first visible section
    const initId = (location.hash && location.hash.slice(1)) || (sections[0] && sections[0].id) || '';
    if (initId) setActive(initId);

    window.addEventListener('hashchange', () => {
      const id = location.hash.slice(1);
      if (id) setActive(id);
    });
  }

  document.addEventListener('DOMContentLoaded', initScrollSpy);

  // Typewriter animation for hero tagline
  (function initTypewriter() {
    const el = document.getElementById('typewriter');
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Customize your phrases here
    const phrases = [
      "AI • ML • Code • Coffee",
      "Teaching machines to think",
      "Curious about intelligence — human or artificial",
      "Turning data noise into meaning",
      "Experiment. Fail. Iterate. Learn.",
    ];
    if (reduceMotion) { el.textContent = phrases[0]; return; }

    let i = 0, j = 0, deleting = false;
    const typeDelay = 55;       // ms per character
    const holdDelay = 1200;     // pause when a word completes
    const deleteDelay = 35;     // ms per character when deleting

    function tick() {
      const word = phrases[i % phrases.length];
      if (!deleting) {
        j++;
        el.textContent = word.slice(0, j);
        if (j === word.length) {
          deleting = true;
          setTimeout(tick, holdDelay);
          return;
        }
        setTimeout(tick, typeDelay);
      } else {
        j--;
        el.textContent = word.slice(0, Math.max(0, j));
        if (j === 0) {
          deleting = false; i++;
          setTimeout(tick, 300);
          return;
        }
        setTimeout(tick, deleteDelay);
      }
    }
    // Start with the initial existing text if present
    el.textContent = '';
    tick();
  })();

  // Mark document ready to trigger CSS entrance animations
  try { requestAnimationFrame(() => document.documentElement.classList.add('ready')); } catch (_) {
    document.documentElement.classList.add('ready');
  }

  // Subtle interactive spotlight with eased motion, adaptive intensity/size, and idle fade (desktop only)
  try {
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isCoarse) {
      const root = document.documentElement;
      // Current and target spot positions in %
      let x = 50, y = 50, tx = 50, ty = 50;
      // Track speed to drive intensity/size
      let lastMoveTime = performance.now();
      let lastPx = window.innerWidth * 0.5;
      let lastPy = window.innerHeight * 0.5;
      let idleTimer;
      let animRaf;

      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const lerp = (a, b, t) => a + (b - a) * t;

      function setGloss(alpha, sizePxX, sizePxY) {
        if (Number.isFinite(alpha)) root.style.setProperty('--gloss-opacity', String(alpha));
        if (Number.isFinite(sizePxX) && Number.isFinite(sizePxY)) {
          root.style.setProperty('--gloss-size', `${Math.round(sizePxX)}px ${Math.round(sizePxY)}px`);
        }
      }

      function animate() {
        // Ease with a gentle spring-like approach
        x = lerp(x, tx, 0.12);
        y = lerp(y, ty, 0.12);
        root.style.setProperty('--spot-x', x.toFixed(2) + '%');
        root.style.setProperty('--spot-y', y.toFixed(2) + '%');

        // Continue while we still have distance to cover
        if (Math.abs(x - tx) > 0.05 || Math.abs(y - ty) > 0.05) {
          animRaf = requestAnimationFrame(animate);
        } else {
          animRaf = null;
        }
      }

      function onMove(e) {
        const cx = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? window.innerWidth * 0.5;
        const cy = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? window.innerHeight * 0.5;
        const now = performance.now();
        const dt = Math.max(1, now - lastMoveTime);
        const dx = cx - lastPx;
        const dy = cy - lastPy;
        const speed = Math.hypot(dx, dy) / dt; // px per ms

        // Map speed to gloss intensity and size (subtle aura)
        // Lower peak for subtlety; larger base for softer falloff
        // Lower brightness overall (base + scale), clamp to a softer range
        const alpha = clamp(0.08 + clamp(speed, 0, 1.2) * 0.10, 0.06, 0.20);
        // Base size ~560x420, scale with speed 1.0..1.5
        const scale = 1.0 + clamp(speed, 0, 1.2) * 0.5;
        const baseX = 560, baseY = 420;

        if (!reduce) setGloss(alpha, baseX * scale, baseY * scale);

        // Update targets
        tx = clamp((cx / window.innerWidth) * 100, 0, 100);
        ty = clamp((cy / window.innerHeight) * 100, 0, 100);
        if (!animRaf) animRaf = requestAnimationFrame(animate);

        // Pulse via class for additional pop
        if (!reduce) {
          root.classList.add('gloss-active');
          clearTimeout(idleTimer);
          idleTimer = setTimeout(() => root.classList.remove('gloss-active'), 130);
        }

        // Reset idle fade timer
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          // Calm state when idle: lower alpha and slightly reduce size
          if (!reduce) setGloss(0.08, baseX * 0.95, baseY * 0.95);
        }, 1400);

        lastMoveTime = now;
        lastPx = cx; lastPy = cy;
      }

      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('resize', () => {
        root.style.setProperty('--spot-x', '50%');
        root.style.setProperty('--spot-y', '50%');
      });
      window.addEventListener('blur', () => {
        root.style.setProperty('--spot-x', '50%');
        root.style.setProperty('--spot-y', '50%');
        if (!reduce) setGloss(0.12, 380, 250);
      });
    }
  } catch (_) {
    // If anything fails, we silently keep a static centered glow.
  }

  // 3D tilt and shine for profile photo
  try {
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isCoarse && !reduce) {
      const frame = document.querySelector('.about-photo');
      if (frame) {
        const maxTilt = 8; // degrees
        let raf = null;
        let rx = 0, ry = 0, mx = '50%', my = '50%';

        const update = () => {
          frame.style.setProperty('--rx', rx + 'deg');
          frame.style.setProperty('--ry', ry + 'deg');
          frame.style.setProperty('--mx', mx);
          frame.style.setProperty('--my', my);
          raf = null;
        };

        frame.addEventListener('pointermove', (e) => {
          const rect = frame.getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width;   // 0..1
          const y = (e.clientY - rect.top) / rect.height;  // 0..1
          ry = (x - 0.5) * (maxTilt * 2);
          rx = (0.5 - y) * (maxTilt * 2);
          mx = Math.round(x * 100) + '%';
          my = Math.round(y * 100) + '%';
          if (!raf) raf = requestAnimationFrame(update);
        }, { passive: true });

        frame.addEventListener('pointerleave', () => {
          rx = 0; ry = 0; mx = '50%'; my = '50%';
          if (!raf) raf = requestAnimationFrame(update);
        });
      }
    }
  } catch (_) { /* ignore */ }

  // Subtle starfield / nebula effect (canvas), respects reduced motion
  (function initStarfield() {
    try {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const canvas = document.createElement('canvas');
      canvas.className = 'starfield';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d', { alpha: true });

      let w = 0, h = 0, dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      let stars = [];
      let animId = null;

      function resize() {
        w = window.innerWidth; h = window.innerHeight;
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        seed();
        draw(0); // immediate draw
      }

      function rand(min, max) { return Math.random() * (max - min) + min; }

      function seed() {
        const area = w * h;
        // Density tuned for subtlety; scale slightly with area
        const count = Math.round(120 + Math.min(180, area / 18000));
        stars = new Array(count).fill(0).map(() => {
          // mix of white, purple, teal
          const huePick = Math.random();
          let color;
          if (huePick < 0.65) color = { r: 235, g: 238, b: 255 }; // soft white
          else if (huePick < 0.85) color = { r: 172, g: 146, b: 255 }; // purple tint
          else color = { r: 140, g: 255, b: 230 }; // teal tint

          return {
            x: rand(0, w),
            y: rand(0, h),
            r: Math.random() < 0.85 ? rand(0.4, 1.2) : rand(1.3, 2.0),
            base: rand(0.35, 0.8), // base alpha
            tw: rand(0.6, 1.4),    // twinkle frequency
            ph: rand(0, Math.PI * 2), // phase
            vx: rand(-0.015, -0.005), // slow left drift
            vy: rand(-0.004, 0.004),  // gentle vertical drift
            color
          };
        });
      }

      let last = performance.now();
      function draw(now) {
        const dt = Math.min(50, now - last);
        last = now;

        ctx.clearRect(0, 0, w, h);

        // faint nebula wash to enhance cosmic mood (very subtle)
        const g = ctx.createRadialGradient(
          w * 0.65, h * 0.25, 0,
          w * 0.65, h * 0.25, Math.max(w, h) * 0.8
        );
        g.addColorStop(0, 'rgba(124, 92, 255, 0.05)');
        g.addColorStop(1, 'rgba(124, 92, 255, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < stars.length; i++) {
          const s = stars[i];
          if (!reduce) {
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            // wrap
            if (s.x < -2) s.x = w + 2;
            if (s.x > w + 2) s.x = -2;
            if (s.y < -2) s.y = h + 2;
            if (s.y > h + 2) s.y = -2;
          }
          const a = s.base * (reduce ? 1 : (0.65 + 0.35 * Math.sin(now * 0.001 * s.tw + s.ph)));
          ctx.fillStyle = `rgba(${s.color.r}, ${s.color.g}, ${s.color.b}, ${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fill();
        }

        if (!reduce) animId = requestAnimationFrame(draw);
      }

      window.addEventListener('resize', resize);
      resize();
      if (!reduce) animId = requestAnimationFrame(draw);

      // On visibility change, pause to save battery
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { if (animId) cancelAnimationFrame(animId); animId = null; }
        else if (!reduce && !animId) { last = performance.now(); animId = requestAnimationFrame(draw); }
      });
    } catch (_) { /* ignore starfield failures */ }
  })();

  // GLIMMER: inject sparkles into .glimmer-layer
  (function initGlimmer() {
    try {
      const host = document.querySelector('.glimmer-layer');
      if (!host) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const count = reduce ? 40 : 85;
      const frag = document.createDocumentFragment();
      const w = host.offsetWidth || host.parentElement.offsetWidth || window.innerWidth;
      const h = host.offsetHeight || 220; // hero approximate height
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span');
        const x = Math.random() * 100; // percentage
        const y = Math.random() * 100;
        const delay = (Math.random() * 6).toFixed(2); // seconds
        const dur = (4 + Math.random() * 4).toFixed(2);
        s.style.left = x + '%';
        s.style.top = y + '%';
        s.style.animationDelay = delay + 's';
        s.style.animationDuration = dur + 's';
        // occasional larger sparkle
        if (Math.random() < 0.12) {
          s.style.width = '4px';
          s.style.height = '4px';
          s.style.boxShadow = '0 0 10px rgba(255,255,255,.75)';
        }
        frag.appendChild(s);
      }
      host.appendChild(frag);
    } catch (_) { }
  })();

  // Global glimmer layer sparkles
  (function initGlobalGlimmer() {
    try {
      const layer = document.querySelector('.bg-glimmer-layer');
      if (!layer) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const total = reduce ? 70 : 140;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < total; i++) {
        const s = document.createElement('span');
        const x = Math.random() * 100; // %
        const y = Math.random() * 100; // %
        s.style.left = x + '%';
        s.style.top = y + '%';
        s.style.animationDelay = (Math.random() * 10).toFixed(2) + 's';
        s.style.animationDuration = (6 + Math.random() * 6).toFixed(2) + 's';
        if (Math.random() < 0.10) { // occasional larger sparkle
          s.style.width = '4px';
          s.style.height = '4px';
          s.style.boxShadow = '0 0 10px rgba(255,255,255,.8)';
        }
        frag.appendChild(s);
      }
      layer.appendChild(frag);
    } catch (_) {}
  })();
})();
