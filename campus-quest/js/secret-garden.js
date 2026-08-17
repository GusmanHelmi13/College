/* ============================================
   CAMPUS QUEST - SECRET-GARDEN.JS
   Memory Garden — kado berisi foto + pesan
   ============================================ */

'use strict';

const SecretGarden = (() => {

  /* ============================================
     DATA — foto & pesan di dalam kado
     Tambah foto: isi field `img` dengan path
     relatif dari folder campus-quest/
     ============================================ */
  const GIFT_SLIDES = [
    {
      img:     'assets/WhatsApp Image 2026-08-17 at 20.23.53.jpeg',
      caption: '',
      message: 'Hai Bocil. 🌸\nKalau kamu buka ini, berarti kamu sudah melewati banyak hal.\nAku bangga sama kamu.'
    },
    // ── Tambah foto di sini ──────────────────
    // {
    //   img:     'assets/foto2.jpg',
    //   caption: 'Label foto',
    //   message: 'Pesan untuk foto ini...'
    // },
    // ────────────────────────────────────────
  ];

  /* Pesan penutup — muncul setelah semua slide */
  const CLOSING_MSGS = [
    'Kalau suatu hari kuliah terasa berat, semoga tempat kecil ini bisa ngingetin kalau kamu nggak sendirian.',
    'Nggak semua orang bisa bertahan sejauh yang kamu lakukan sekarang.',
    'Aku harap kamu tetap bangga sama dirimu sendiri.',
    'Karena aku lihat betapa kerasnya kamu berusaha setiap hari. 🌸'
  ];

  /* ============================================
     STATE
     ============================================ */
  let gardenEl  = null;
  let opened    = false;
  let animId    = null;
  let fireflies = [];
  let petals    = [];
  let canvas    = null;
  let ctx       = null;
  let slideIdx  = 0;       // slide yang sedang aktif

  /* ============================================
     BUILD DOM
     ============================================ */
  function build() {
    if (document.getElementById('secretGarden')) return;

    const el = document.createElement('div');
    el.id        = 'secretGarden';
    el.className = 'secret-garden-page';
    el.innerHTML = `
      <canvas id="gardenCanvas"
        style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;"></canvas>
      <div class="garden-sky" style="z-index:0;"></div>
      <div class="garden-stars" id="gardenStars" style="z-index:2;pointer-events:none;"></div>
      <div class="garden-lights" id="gardenLights" style="z-index:3;">
        <div class="garden-light-string"></div>
      </div>
      <div class="garden-trees" id="gardenTrees" style="z-index:2;pointer-events:none;"></div>

      <!-- Tombol kembali -->
      <button class="btn-secondary pixel-btn garden-back-btn" id="gardenBackBtn"
              style="z-index:10;">← Kembali</button>

      <!-- Kado floating di tengah -->
      <div class="garden-gift-area" id="gardenGiftArea" style="z-index:8;">
        <span class="garden-gift-box" id="gardenGift"
              role="button" tabindex="0" aria-label="Buka hadiah">🎁</span>
        <span class="garden-gift-label" id="gardenGiftLabel">Tap untuk membuka ✨</span>
      </div>

      <!-- ── SLIDESHOW KADO ─────────────────── -->
      <div class="gd-slideshow" id="gdSlideshow" style="display:none;">

        <!-- Overlay background -->
        <div class="gd-bg" id="gdBg"></div>

        <!-- Card slide -->
        <div class="gd-card" id="gdCard">

          <!-- Foto polaroid -->
          <div class="gd-polaroid" id="gdPolaroid">
            <div class="gd-photo-wrap" id="gdPhotoWrap">
              <!-- diisi JS -->
            </div>
            <div class="gd-photo-caption" id="gdPhotoCaption"></div>
          </div>

          <!-- Pesan typewriter -->
          <div class="gd-message-bubble">
            <span class="gd-message-icon">💌</span>
            <p class="gd-message-text" id="gdMsgText"></p>
          </div>

          <!-- Navigasi slide -->
          <div class="gd-nav">
            <button class="gd-nav-btn" id="gdPrevBtn" aria-label="Sebelumnya">◀</button>
            <div class="gd-dots" id="gdDots"></div>
            <button class="gd-nav-btn" id="gdNextBtn" aria-label="Selanjutnya">▶</button>
          </div>
        </div>

        <!-- Pesan penutup (setelah semua slide) -->
        <div class="gd-closing" id="gdClosing" style="display:none;">
          <div class="gd-closing-confetti">🌸 ✨ 💖 ✨ 🌸</div>
          <div class="gd-closing-lines" id="gdClosingLines"></div>
          <button class="btn-primary pixel-btn" id="gdClosingClose">💖 Simpan di Hati</button>
        </div>

      </div><!-- /.gd-slideshow -->
    `;

    document.body.appendChild(el);
    gardenEl = el;

    document.getElementById('gardenBackBtn').addEventListener('click', close);
    document.getElementById('gardenGift').addEventListener('click', openGift);
    document.getElementById('gardenGift').addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') openGift();
    });
    document.getElementById('gdPrevBtn').addEventListener('click', () => goSlide(-1));
    document.getElementById('gdNextBtn').addEventListener('click', () => goSlide(+1));
    document.getElementById('gdClosingClose').addEventListener('click', closeSlideshow);
  }

  /* ============================================
     OPEN GARDEN
     ============================================ */
  function open() {
    build();
    gardenEl = document.getElementById('secretGarden');
    if (!gardenEl) return;

    gardenEl.style.display = 'block';
    opened = true;
    slideIdx = 0;

    // Reset kado
    const gift      = document.getElementById('gardenGift');
    const giftLabel = document.getElementById('gardenGiftLabel');
    if (gift) {
      delete gift.dataset.opened;
      gift.style.cssText  = '';
      gift.textContent    = '🎁';
      gift.style.display  = 'block';
    }
    if (giftLabel) giftLabel.style.display = 'block';
    document.getElementById('gdSlideshow').style.display = 'none';
    document.getElementById('gdClosing').style.display   = 'none';

    // Canvas
    canvas = document.getElementById('gardenCanvas');
    if (canvas) {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx = canvas.getContext('2d');
      window.addEventListener('resize', onResize);
    }

    generateGardenStars();
    generateLights();
    generateTrees();
    spawnFireflies();
    spawnPetals();

    // Fade in
    gardenEl.style.opacity    = '0';
    gardenEl.style.transition = 'opacity 1.2s ease';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      gardenEl.style.opacity = '1';
    }));

    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(gardenLoop);

    // Achievement
    const gState = window.AppState?.gameState;
    if (gState) {
      gState.gardenUnlocked = true;
      Storage.save(gState);
      Achievements.checkAll(gState);
    }

    Toast.show('🌸 Memory Garden terbuka!', 3500, '✨');
  }

  /* ============================================
     CLOSE GARDEN
     ============================================ */
  function close() {
    if (!gardenEl) return;
    gardenEl.style.opacity = '0';
    setTimeout(() => {
      gardenEl.style.display = 'none';
      opened = false;
      if (animId) { cancelAnimationFrame(animId); animId = null; }
      window.removeEventListener('resize', onResize);
      document.getElementById('levelHub').style.display = 'block';
      document.getElementById('gameArea').style.display = 'none';
      PageManager.navigate('game');
      window.AppState?.refreshUI();
    }, 700);
  }

  function onResize() {
    if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  }

  /* ============================================
     OPEN GIFT — animasi kado lalu buka slideshow
     ============================================ */
  function openGift() {
    const gift      = document.getElementById('gardenGift');
    const giftLabel = document.getElementById('gardenGiftLabel');
    if (!gift || gift.dataset.opened) return;
    gift.dataset.opened = '1';

    // Shake cepat
    gift.style.animation = 'gardenGiftFloat 0.08s ease infinite';

    setTimeout(() => {
      // Ledakan partikel
      ParticleSystem.confetti(90);
      ParticleSystem.burst(
        window.innerWidth / 2, window.innerHeight / 2,
        { count: 45, type: 'star', speed: 7, size: 11,
          colors: ['#ffd43b','#ff7eb3','#ff8c42','#cc5de8','#51cf66','#74c0fc'] }
      );

      // Cahaya emas di canvas
      if (ctx) {
        const W = canvas.width, H = canvas.height;
        const grd = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H));
        grd.addColorStop(0,   'rgba(255,215,0,0.65)');
        grd.addColorStop(0.35,'rgba(255,180,0,0.3)');
        grd.addColorStop(1,   'transparent');
        ctx.save(); ctx.fillStyle = grd; ctx.fillRect(0,0,W,H); ctx.restore();
      }

      // Hilangkan kado
      gift.style.transition = 'transform 0.55s ease, opacity 0.55s ease';
      gift.style.transform  = 'scale(2.2) rotate(360deg)';
      gift.style.opacity    = '0';
      if (giftLabel) giftLabel.style.display = 'none';

      setTimeout(() => {
        gift.style.display = 'none';
        showSlideshow();
      }, 600);

    }, 550);
  }

  /* ============================================
     SLIDESHOW
     ============================================ */
  function showSlideshow() {
    const ss = document.getElementById('gdSlideshow');
    if (!ss) return;

    // Bangun dots
    buildDots();

    ss.style.display  = 'flex';
    ss.style.opacity  = '0';
    ss.style.transition = 'opacity 0.6s ease';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      ss.style.opacity = '1';
      renderSlide(0, 'none');
    }));
  }

  function buildDots() {
    const dots = document.getElementById('gdDots');
    if (!dots) return;
    dots.innerHTML = GIFT_SLIDES.map((_, i) =>
      `<span class="gd-dot ${i === 0 ? 'active' : ''}" data-i="${i}"></span>`
    ).join('');
    dots.querySelectorAll('.gd-dot').forEach(d => {
      d.addEventListener('click', () => goSlide(parseInt(d.dataset.i) - slideIdx));
    });
  }

  function renderSlide(idx, direction) {
    if (idx < 0 || idx >= GIFT_SLIDES.length) return;
    slideIdx = idx;
    const slide = GIFT_SLIDES[idx];

    // ── Foto ──
    const photoWrap   = document.getElementById('gdPhotoWrap');
    const photoCaption= document.getElementById('gdPhotoCaption');
    const card        = document.getElementById('gdCard');

    // Animasi keluar
    card.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    const exitDir = direction === 'next' ? '-40px' : '40px';
    card.style.opacity   = '0';
    card.style.transform = `translateX(${exitDir}) scale(0.97)`;

    setTimeout(() => {
      // Render konten
      if (slide.img) {
        const encoded = slide.img.split('/').map(s => encodeURIComponent(s)).join('/');
        photoWrap.innerHTML = `
          <img src="${encoded}" alt="${slide.caption || 'Foto'}"
               style="width:100%;height:100%;object-fit:cover;border-radius:4px;"
               loading="eager"
               onerror="this.replaceWith(Object.assign(document.createElement('span'),
                          {textContent:'📷', style:'font-size:4rem;display:flex;align-items:center;justify-content:center;width:100%;height:100%;'}))">`;
      } else {
        photoWrap.innerHTML = `<span style="font-size:4rem;display:flex;align-items:center;
                                justify-content:center;width:100%;height:100%;">📷</span>`;
      }
      photoCaption.textContent = slide.caption || '';

      // Masuk dari arah berlawanan
      const enterDir = direction === 'next' ? '40px' : '-40px';
      card.style.transform = `translateX(${enterDir}) scale(0.97)`;
      card.style.transition = 'none';
      card.getBoundingClientRect(); // force reflow

      card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      card.style.opacity    = '1';
      card.style.transform  = 'translateX(0) scale(1)';

      // Update dots
      document.querySelectorAll('.gd-dot').forEach((d, i) => {
        d.classList.toggle('active', i === idx);
      });

      // Nav buttons
      document.getElementById('gdPrevBtn').style.opacity = idx === 0 ? '0.3' : '1';
      document.getElementById('gdNextBtn').textContent   =
        idx === GIFT_SLIDES.length - 1 ? '✦' : '▶';

      // Typewriter pesan
      typewriterMsg(document.getElementById('gdMsgText'), slide.message || '');

    }, 270);
  }

  function typewriterMsg(el, text) {
    if (!el) return;
    el.textContent = '';
    // Ubah \n jadi baris baru setelah typewriter selesai per baris
    const lines = text.split('\n');
    let lineIdx = 0, charIdx = 0;

    function tick() {
      if (lineIdx >= lines.length) return;
      const line = lines[lineIdx];
      if (charIdx < line.length) {
        el.innerHTML = lines.slice(0, lineIdx).map(l => `${l}<br>`).join('')
                     + line.substring(0, charIdx + 1);
        charIdx++;
        setTimeout(tick, 28);
      } else {
        lineIdx++; charIdx = 0;
        if (lineIdx < lines.length) setTimeout(tick, 120);
      }
    }
    tick();
  }

  function goSlide(delta) {
    const next = slideIdx + delta;
    if (next < 0) return;
    if (next >= GIFT_SLIDES.length) {
      // Sudah habis semua slide → tampilkan pesan penutup
      showClosing();
      return;
    }
    renderSlide(next, delta > 0 ? 'next' : 'prev');
  }

  /* ============================================
     PESAN PENUTUP
     ============================================ */
  function showClosing() {
    const ss      = document.getElementById('gdSlideshow');
    const card    = document.getElementById('gdCard');
    const closing = document.getElementById('gdClosing');
    const lines   = document.getElementById('gdClosingLines');
    if (!closing || !lines) return;

    // Sembunyikan card
    card.style.transition = 'opacity 0.3s ease';
    card.style.opacity    = '0';
    setTimeout(() => {
      card.style.display = 'none';

      const msgs = window.MESSAGES?.garden || CLOSING_MSGS;
      lines.innerHTML = msgs.map((m, i) =>
        `<p class="garden-msg-line" id="closingLine${i}"
            style="transition-delay:${i * 0.55}s">${m}</p>`
      ).join('');

      closing.style.display  = 'flex';
      closing.style.opacity  = '0';
      closing.style.transition = 'opacity 0.5s ease';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        closing.style.opacity = '1';
        msgs.forEach((_, i) => {
          setTimeout(() => {
            document.getElementById(`closingLine${i}`)?.classList.add('visible');
            if (i === msgs.length - 1) {
              setTimeout(() => {
                FloatingHearts.spawn(window.innerWidth / 2, window.innerHeight / 2);
                ParticleSystem.starBurst(window.innerWidth / 2, window.innerHeight * 0.75);
                ParticleSystem.confetti(50);
              }, 500);
            }
          }, i * 620 + 150);
        });
      }));
    }, 320);
  }

  function closeSlideshow() {
    const ss = document.getElementById('gdSlideshow');
    if (!ss) return;
    ss.style.opacity = '0';
    setTimeout(() => {
      ss.style.display = 'none';
      // Restore card untuk kali berikutnya
      const card = document.getElementById('gdCard');
      if (card) { card.style.display = ''; card.style.opacity = ''; }
    }, 500);
  }

  /* ============================================
     AMBIENT — stars, lights, trees, fireflies, petals
     ============================================ */
  function generateGardenStars() {
    const c = document.getElementById('gardenStars');
    if (!c) return;
    c.innerHTML = '';
    for (let i = 0; i < 80; i++) {
      const s = document.createElement('div');
      s.className = 'garden-star';
      const sz = 1 + Math.random() * 3;
      s.style.cssText = `width:${sz}px;height:${sz}px;
        left:${Math.random()*100}%;top:${Math.random()*55}%;
        animation-duration:${1.5+Math.random()*3}s;animation-delay:${Math.random()*2}s;`;
      c.appendChild(s);
    }
  }

  function generateLights() {
    const c = document.getElementById('gardenLights');
    if (!c) return;
    c.querySelectorAll('.garden-lamp').forEach(e => e.remove());
    const colors = ['#ff7eb3','#ffd43b','#74c0fc','#51cf66','#cc5de8','#ff8c42'];
    const count  = Math.floor(window.innerWidth / 60) + 2;
    for (let i = 0; i < count; i++) {
      const lamp = document.createElement('div');
      lamp.className = 'garden-lamp';
      const col = colors[i % colors.length];
      lamp.style.cssText = `background:${col};color:${col};
        left:${(i/(count-1))*100}%;position:absolute;top:0;width:12px;height:16px;`;
      c.appendChild(lamp);
    }
  }

  function generateTrees() {
    const c = document.getElementById('gardenTrees');
    if (!c) return;
    c.innerHTML = '';
    const W = window.innerWidth;
    [
      { x: W*0.05, trunkH:110, cW:90,  cH:80  },
      { x: W*0.17, trunkH:140, cW:120, cH:100 },
      { x: W*0.78, trunkH:140, cW:120, cH:100 },
      { x: W*0.92, trunkH:110, cW:90,  cH:80  },
    ].forEach(cfg => {
      const tree   = document.createElement('div');
      tree.className = 'sakura-tree';
      tree.style.cssText = `left:${cfg.x}px;position:absolute;bottom:0;`;
      const canopy = document.createElement('div');
      canopy.className = 'tree-canopy';
      canopy.style.cssText = `width:${cfg.cW}px;height:${cfg.cH}px;margin-left:-${(cfg.cW-20)/2}px;`;
      const trunk  = document.createElement('div');
      trunk.className = 'tree-trunk';
      trunk.style.cssText = `width:20px;height:${cfg.trunkH}px;`;
      tree.appendChild(canopy);
      tree.appendChild(trunk);
      c.appendChild(tree);
    });
  }

  function spawnFireflies() {
    fireflies = [];
    const W = window.innerWidth, H = window.innerHeight;
    for (let i = 0; i < 28; i++) fireflies.push({
      x: Math.random()*W, y: H*0.3+Math.random()*H*0.5,
      vx:(Math.random()-0.5)*0.8, vy:(Math.random()-0.5)*0.8,
      life:Math.random(), phase:Math.random()*Math.PI*2, size:2+Math.random()*2
    });
  }

  function spawnPetals() {
    petals = [];
    for (let i = 0; i < 32; i++) petals.push(newPetal(true));
  }

  function newPetal(randomY = false) {
    const W = window.innerWidth, H = window.innerHeight;
    return {
      x:Math.random()*W, y:randomY?Math.random()*H:-20,
      vx:(Math.random()-0.5)*1.2, vy:0.4+Math.random()*0.8,
      rot:Math.random()*Math.PI*2, rotV:(Math.random()-0.5)*0.06,
      alpha:0.4+Math.random()*0.6, size:4+Math.random()*6
    };
  }

  function gardenLoop() {
    if (!opened || !ctx) { animId = null; return; }
    animId = requestAnimationFrame(gardenLoop);
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const t = Date.now() / 1000;

    // Fireflies
    fireflies.forEach(f => {
      f.x += f.vx + Math.sin(t + f.phase) * 0.4;
      f.y += f.vy + Math.cos(t + f.phase*1.3) * 0.3;
      f.life = (Math.sin(t*1.5 + f.phase) + 1) / 2;
      if (f.x < -10) f.x = W+10; if (f.x > W+10) f.x = -10;
      if (f.y < H*0.2) f.vy = Math.abs(f.vy);
      if (f.y > H*0.95) f.vy = -Math.abs(f.vy);
      ctx.save();
      ctx.globalAlpha = f.life * 0.9;
      const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size*4);
      grd.addColorStop(0, 'rgba(180,255,80,1)');
      grd.addColorStop(0.3, 'rgba(100,255,50,0.6)');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(f.x, f.y, f.size*4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(220,255,120,1)';
      ctx.beginPath(); ctx.arc(f.x, f.y, f.size*0.7, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });

    // Petals
    petals.forEach((p, i) => {
      p.x += p.vx + Math.sin(t*0.5+i)*0.3;
      p.y += p.vy; p.rot += p.rotV;
      if (p.y > H+20) { petals[i] = newPetal(false); return; }
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = 'rgba(255,182,193,0.85)';
      ctx.beginPath(); ctx.ellipse(0, 0, p.size*0.7, p.size*1.2, 0, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,220,230,0.5)';
      ctx.beginPath(); ctx.ellipse(0, -p.size*0.2, p.size*0.3, p.size*0.6, 0, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  /* ---------- PUBLIC ---------- */
  return { open, close, build };
})();

window.SecretGarden = SecretGarden;
