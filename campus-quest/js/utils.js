/* ============================================
   CAMPUS QUEST - UTILS.JS
   Particles, Effects, Storage, Transitions
   ============================================ */

'use strict';

/* ============================================
   LOCAL STORAGE SAVE / LOAD
   ============================================ */
const Storage = {
  KEY: 'campusQuest_save',

  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed:', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  clear() {
    localStorage.removeItem(this.KEY);
  },

  getDefault() {
    return {
      currentLevel: 1,
      completedLevels: [],
      levelStars: { 1: 0, 2: 0, 3: 0, 4: 0 },
      achievements: [],
      totalStars: 0,
      messagesCollected: 0,
      darkMode: false,
      gardenUnlocked: false,
      lastPlayed: Date.now()
    };
  }
};

/* ============================================
   PARTICLE SYSTEM
   ============================================ */
const ParticleSystem = (() => {
  const canvas = null;
  let ctx = null;
  let particles = [];
  let animId = null;

  function init() {
    const c = document.getElementById('particleCanvas');
    if (!c) return;
    c.width  = window.innerWidth;
    c.height = window.innerHeight;
    ctx = c.getContext('2d');
    window.addEventListener('resize', () => {
      c.width  = window.innerWidth;
      c.height = window.innerHeight;
    });
    loop();
  }

  function loop() {
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += p.gravity;
      p.life -= p.decay;
      p.rotation += p.rotSpeed;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else if (p.type === 'square') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.type === 'star') {
        drawStar(ctx, 0, 0, 5, p.size, p.size * 0.4);
        ctx.fillStyle = p.color;
        ctx.fill();
      } else if (p.type === 'pixel') {
        ctx.fillStyle = p.color;
        ctx.fillRect(-2, -2, 4, 4);
      } else if (p.type === 'text') {
        ctx.font = `${p.size * 2}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
      }

      ctx.restore();
    });
    animId = requestAnimationFrame(loop);
  }

  function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
      rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerR);
    ctx.closePath();
  }

  function burst(x, y, options = {}) {
    const count  = options.count  || 20;
    const colors = options.colors || ['#ffd43b','#ff8c42','#ff7eb3','#51cf66','#74c0fc','#cc5de8'];
    const type   = options.type   || 'circle';
    const emoji  = options.emoji  || null;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * (options.speed || 4);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (options.upward ? 3 : 0),
        gravity: options.gravity !== undefined ? options.gravity : 0.12,
        life: 1,
        decay: 0.015 + Math.random() * 0.02,
        size: options.size || (3 + Math.random() * 4),
        color: colors[Math.floor(Math.random() * colors.length)],
        type: emoji ? 'text' : type,
        emoji: emoji || null,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.2
      });
    }
  }

  function confetti(count = 60) {
    const colors = ['#ffd43b','#ff8c42','#ff7eb3','#51cf66','#74c0fc','#cc5de8','#ff6b6b'];
    const cx = window.innerWidth / 2;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: cx + (Math.random() - 0.5) * 300,
        y: -10,
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 4,
        gravity: 0.08,
        life: 1,
        decay: 0.008,
        size: 5 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        type: 'square',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15
      });
    }
  }

  function pixelBurst(x, y) {
    burst(x, y, { count: 30, type: 'pixel', speed: 5, size: 4 });
  }

  function starBurst(x, y) {
    burst(x, y, { count: 12, type: 'star', speed: 3, size: 8,
      colors: ['#ffd43b','#ffe566','#c9a800'] });
  }

  function hearts(x, y) {
    burst(x, y, { count: 8, emoji: '💖', size: 10, speed: 2, upward: true, gravity: 0.05 });
  }

  return { init, burst, confetti, pixelBurst, starBurst, hearts };
})();

/* ============================================
   FLOATING HEARTS
   ============================================ */
const FloatingHearts = {
  container: null,
  init() {
    this.container = document.getElementById('floatingHeartsContainer');
  },
  spawn(x, y) {
    if (!this.container) return;
    const emojis = ['💖','💕','💗','✨','⭐','🌸'];
    for (let i = 0; i < 5; i++) {
      const el = document.createElement('div');
      el.className = 'floating-heart';
      el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
      el.style.left = (x + (Math.random() - 0.5) * 60) + 'px';
      el.style.top  = (y - 20) + 'px';
      el.style.animationDelay = (i * 0.1) + 's';
      this.container.appendChild(el);
      setTimeout(() => el.remove(), 2200);
    }
  }
};

/* ============================================
   TOAST NOTIFICATIONS
   ============================================ */
const Toast = {
  container: null,
  init() {
    this.container = document.getElementById('toastContainer');
  },
  show(text, duration = 3000, emoji = '✨') {
    if (!this.container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = `${emoji} ${text}`;
    this.container.appendChild(el);
    setTimeout(() => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 350);
    }, duration);
  }
};

/* ============================================
   PAGE TRANSITIONS
   ============================================ */
const PageManager = {
  currentPage: 'home',
  pages: {},

  init() {
    document.querySelectorAll('.page').forEach(p => {
      this.pages[p.id.replace('page-', '')] = p;
    });
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(link.dataset.page);
      });
    });
  },

  navigate(name) {
    if (name === this.currentPage) return;
    const current = this.pages[this.currentPage];
    const next    = this.pages[name];
    if (!next) return;

    if (current) current.classList.remove('active');
    next.classList.add('active');
    next.classList.add('slide-in');
    setTimeout(() => next.classList.remove('slide-in'), 500);

    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.dataset.page === name);
    });

    // Close hamburger if open
    document.getElementById('navLinks')?.classList.remove('open');

    this.currentPage = name;
    window.dispatchEvent(new CustomEvent('pageChange', { detail: { page: name } }));
  }
};

/* ============================================
   DARK MODE
   ============================================ */
const DarkMode = {
  active: false,
  init(savedState = false) {
    this.active = savedState;
    this.apply();
    document.getElementById('darkModeToggle')?.addEventListener('click', () => this.toggle());
  },
  toggle() {
    this.active = !this.active;
    this.apply();
    return this.active;
  },
  apply() {
    document.body.classList.toggle('dark-mode', this.active);
    const btn = document.getElementById('darkModeToggle');
    if (btn) btn.textContent = this.active ? '☀️' : '🌙';
  }
};

/* ============================================
   TYPEWRITER EFFECT
   ============================================ */
function typewriter(element, text, speed = 40) {
  return new Promise(resolve => {
    element.innerHTML = '';
    let i = 0;
    const tick = () => {
      if (i < text.length) {
        const span = document.createElement('span');
        span.className = 'typewriter-char';
        span.style.animationDelay = '0s';
        span.textContent = text[i];
        element.appendChild(span);
        // Trigger reflow to start animation
        span.getBoundingClientRect();
        span.style.opacity = '1';
        i++;
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    };
    tick();
  });
}

/* ============================================
   CLOUD GENERATOR
   ============================================ */
function generateClouds(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const isDark = document.body.classList.contains('dark-mode');
  for (let i = 0; i < 6; i++) {
    const cloud = document.createElement('div');
    cloud.className = 'cloud';
    const w = 80 + Math.random() * 120;
    const h = w * 0.4;
    cloud.style.cssText = `
      width:${w}px; height:${h}px;
      top:${5 + Math.random() * 25}%;
      animation-duration:${20 + Math.random() * 30}s;
      animation-delay:-${Math.random() * 30}s;
      opacity:${isDark ? 0.06 : 0.5 + Math.random() * 0.3};
    `;
    container.appendChild(cloud);
  }
}

/* ============================================
   STAR GENERATOR (night mode)
   ============================================ */
function generateStars(containerId, count = 60) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star-particle';
    const size = 1 + Math.random() * 3;
    star.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random() * 100}%;
      top:${Math.random() * 60}%;
      animation-duration:${1.5 + Math.random() * 2.5}s;
      animation-delay:${Math.random() * 2}s;
    `;
    container.appendChild(star);
  }
}

/* ============================================
   RAIN GENERATOR
   ============================================ */
function generateRain(containerId, active = false) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!active) return;
  for (let i = 0; i < 40; i++) {
    const drop = document.createElement('div');
    drop.className = 'raindrop';
    const h = 8 + Math.random() * 16;
    drop.style.cssText = `
      left:${Math.random() * 100}%;
      height:${h}px;
      animation-duration:${0.6 + Math.random() * 0.8}s;
      animation-delay:${Math.random() * 1}s;
      opacity:${0.3 + Math.random() * 0.5};
    `;
    container.appendChild(drop);
  }
}

/* ============================================
   RANDOM PICKER
   ============================================ */
function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ============================================
   NUMBER FORMAT
   ============================================ */
function formatNum(n) {
  return n.toLocaleString();
}

/* ============================================
   CLAMP
   ============================================ */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/* ============================================
   DEBOUNCE
   ============================================ */
function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

/* ============================================
   ANIMATE NUMBER (count-up)
   ============================================ */
function animateNumber(el, from, to, duration = 800) {
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - start) / duration);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ============================================
   SHAKE ELEMENT
   ============================================ */
function shake(el) {
  el.style.animation = 'none';
  el.getBoundingClientRect();
  el.style.animation = 'damageFlash 0.3s ease';
  setTimeout(() => el.style.animation = '', 350);
}

// Expose to global
window.Storage        = Storage;
window.ParticleSystem = ParticleSystem;
window.FloatingHearts = FloatingHearts;
window.Toast          = Toast;
window.PageManager    = PageManager;
window.DarkMode       = DarkMode;
window.typewriter     = typewriter;
window.generateClouds = generateClouds;
window.generateStars  = generateStars;
window.generateRain   = generateRain;
window.randomFrom     = randomFrom;
window.formatNum      = formatNum;
window.clamp          = clamp;
window.debounce       = debounce;
window.animateNumber  = animateNumber;
window.shake          = shake;
