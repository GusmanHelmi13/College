/* ============================================
   CAMPUS QUEST - GAME.JS
   Canvas game engine: movement, physics,
   collision, rendering — all 4 levels
   ============================================ */

'use strict';

const Game = (() => {

  /* ---------- STATE ---------- */
  let canvas, ctx;
  let level      = null;    // current level data
  let levelId    = 0;
  let running    = false;
  let paused     = false;
  let animId     = null;
  let lastTime   = 0;
  let completeLock = false; // prevent double-trigger on portal

  /* ---------- CAMERA ---------- */
  const cam = { x: 0, y: 0 };

  /* ---------- PLAYER ---------- */
  const player = {
    x: 80, y: 320,
    w: 26, h: 40,
    vx: 0, vy: 0,
    speed: 3.5,
    jumpForce: -11,
    onGround: false,
    facing: 1,           // 1=right, -1=left
    hp: 5, maxHp: 5,
    invincible: 0,       // frames of invincibility after hit
    state: 'idle',       // idle | walk | jump | hurt | celebrate
    walkFrame: 0,
    walkTimer: 0,
    hurtTimer: 0,
  };

  /* ---------- STATS (for star calculation) ---------- */
  const stats = {
    itemsGot: 0,
    noHurt:   true,
    startTime: 0,
    elapsedSec: 0,
  };

  /* ---------- INPUT ---------- */
  const keys = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, Space: false, ' ': false };
  let jumpHeld = false;

  /* ---------- TRIGGERED EVENTS ---------- */
  const firedTriggers = new Set();
  let pendingMessage  = null;
  let messageActive   = false;

  /* ---------- KEY INVENTORY ---------- */
  // Set of key item IDs yang sudah dikumpulkan player di level ini
  const collectedKeys = new Set();

  /* ---------- CONSTANTS ---------- */
  const GRAVITY      = 0.55;
  const TILE         = 16;
  const STAR_COLORS  = ['#ffd43b','#ff8c42','#ff7eb3','#51cf66','#74c0fc'];

  /* ============================================
     INIT
     ============================================ */
  function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Input — keyboard
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    // Mobile controls — robust touch handling
    bindMobileControls();

    // HUD buttons
    document.getElementById('btnPause')?.addEventListener('click', togglePause);
    document.getElementById('btnResume')?.addEventListener('click', togglePause);
    document.getElementById('btnBackHub')?.addEventListener('click', () => stopLevel(true));
    document.getElementById('btnHubFromPause')?.addEventListener('click', () => stopLevel(true));
    document.getElementById('btnHomeFromPause')?.addEventListener('click', () => {
      stopLevel(true);
      PageManager.navigate('home');
    });
    document.getElementById('btnNextLevel')?.addEventListener('click', goNextLevel);
    document.getElementById('btnBackToHub')?.addEventListener('click', () => stopLevel(true));
    document.getElementById('messageClose')?.addEventListener('click', closeMessage);

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
  }

  function resizeCanvas() {
    if (!canvas) return;
    const wrapper = canvas.parentElement;
    if (!wrapper) return;

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
                       || window.innerWidth <= 768;

    const maxW = Math.min(wrapper.clientWidth, 960);
    canvas.width = maxW;

    // Controls adalah absolute overlay → canvas boleh full height game-area
    // Sisakan sedikit space bawah agar bisa lihat area bawah tetap terbaca
    if (isTouchDevice) {
      const hudH   = 44;
      const safeBot = 30; // agar konten bawah tidak tertutup penuh joystick
      const availH = Math.max(
        (wrapper.clientHeight || window.innerHeight * 0.75) - hudH - safeBot,
        200
      );
      canvas.height = Math.min(availH, Math.round(maxW * 0.65));
    } else {
      canvas.height = Math.round(maxW * 0.5);
    }

    if (ctx) ctx.imageSmoothingEnabled = false;
  }

  /* ============================================
     MOBILE CONTROLS — Virtual Analog Joystick
     ============================================ */
  function bindMobileControls() {

    // ── JOYSTICK ─────────────────────────────
    const zone  = document.getElementById('joystickZone');
    const knob  = document.getElementById('joystickKnob');
    if (!zone || !knob) return;

    const RADIUS      = 32;   // px — maksimum jarak knob dari center
    const DEADZONE    = 0.18; // 0–1: rasio gerak minimum sebelum input terdaftar
    const HORIZ_BIAS  = 1.4;  // knob lebih sensitif horisontal (game 2D side-scroller)

    let joyActive  = false;
    let joyId      = -1;      // pointerId yang sedang memegang joystick
    let centerX    = 0;
    let centerY    = 0;
    let knobDX     = 0;       // offset knob saat ini
    let knobDY     = 0;

    /* Hitung ulang center setiap kali zone berubah posisi */
    function getZoneCenter() {
      const r = zone.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    /* Pindahkan knob ke posisi (dx, dy) relatif dari center */
    function moveKnob(dx, dy) {
      // Clamp dalam radius lingkaran
      const dist  = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist > RADIUS ? RADIUS / dist : 1;
      knobDX = dx * ratio;
      knobDY = dy * ratio;

      knob.style.transform =
        `translate(calc(-50% + ${knobDX}px), calc(-50% + ${knobDY}px))`;

      // Normalised -1 … +1
      const nx = knobDX / RADIUS * HORIZ_BIAS;
      const ny = knobDY / RADIUS;

      // Update key state
      const leftActive  = nx < -DEADZONE;
      const rightActive = nx >  DEADZONE;

      keys.ArrowLeft  = leftActive;
      keys.ArrowRight = rightActive;

      // Arah visual
      zone.classList.toggle('dir-left',  leftActive);
      zone.classList.toggle('dir-right', rightActive);

      // Kecepatan player proporsional dengan seberapa jauh knob ditarik
      // (dikirim lewat key saja; game.js sudah pakai player.speed konstan,
      //  tapi kita simpan nilai analog untuk masa depan)
      const analogX = clamp(nx, -1, 1);
    }

    /* Reset knob ke tengah */
    function resetKnob() {
      knobDX = 0; knobDY = 0;
      knob.style.transition = 'transform 0.12s cubic-bezier(0.34,1.56,0.64,1)';
      knob.style.transform  = 'translate(-50%, -50%)';
      setTimeout(() => { knob.style.transition = ''; }, 150);

      keys.ArrowLeft  = false;
      keys.ArrowRight = false;
      zone.classList.remove('active', 'dir-left', 'dir-right');
    }

    /* ── pointer events pada zone ── */
    zone.addEventListener('pointerdown', e => {
      if (joyActive) return;   // sudah ada jari lain
      e.preventDefault();
      zone.setPointerCapture(e.pointerId);
      joyActive = true;
      joyId     = e.pointerId;

      const c = getZoneCenter();
      centerX = c.x; centerY = c.y;

      zone.classList.add('active');
      knob.style.transition = '';

      moveKnob(e.clientX - centerX, e.clientY - centerY);
    }, { passive: false });

    zone.addEventListener('pointermove', e => {
      if (!joyActive || e.pointerId !== joyId) return;
      e.preventDefault();
      moveKnob(e.clientX - centerX, e.clientY - centerY);
    }, { passive: false });

    const endJoy = e => {
      if (!joyActive || e.pointerId !== joyId) return;
      joyActive = false;
      joyId     = -1;
      resetKnob();
    };
    zone.addEventListener('pointerup',     endJoy);
    zone.addEventListener('pointercancel', endJoy);
    zone.addEventListener('pointerleave',  endJoy);
    window.addEventListener('pointerup',   endJoy);

    // ── ACTION BUTTONS (Jump & Act) ──────────
    const ACTION_MAP = {
      btnJump: { key: 'ArrowUp', onDown: () => { if (running && !paused && !messageActive) attemptJump(); } },
      btnAct:  { key: 'Space',   onDown: () => { if (running && !paused && !messageActive) attemptAttack(); } },
    };

    Object.entries(ACTION_MAP).forEach(([btnId, cfg]) => {
      const el = document.getElementById(btnId);
      if (!el) return;

      el.addEventListener('pointerdown', e => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.classList.add('pressed');
        keys[cfg.key] = true;
        cfg.onDown();
      }, { passive: false });

      const endBtn = e => {
        e.preventDefault();
        el.classList.remove('pressed');
        keys[cfg.key] = false;
      };
      el.addEventListener('pointerup',     endBtn, { passive: false });
      el.addEventListener('pointercancel', endBtn);
      el.addEventListener('pointerleave',  endBtn);
    });

    // Safety: kalau semua jari terangkat, reset semua key
    window.addEventListener('pointerup', () => {
      if (!joyActive) {
        keys.ArrowLeft  = false;
        keys.ArrowRight = false;
      }
    });
  }

  /* pressBtn / releaseBtn tidak dipakai lagi untuk D-pad,
     tapi dipertahankan karena dipanggil dari nowhere lain */
  function pressBtn(btnId, cfg) {
    document.getElementById(btnId)?.classList.add('pressed');
    if (!running || paused || messageActive) return;
    keys[cfg.key] = true;
    if (cfg.onDown) cfg.onDown();
  }
  function releaseBtn(btnId, cfg) {
    keys[cfg.key] = false;
    document.getElementById(btnId)?.classList.remove('pressed');
  }

  /* ============================================
     START / STOP LEVEL
     ============================================ */
  function startLevel(id) {
    levelId = id;
    level   = LevelData.get(id);
    if (!level) return;

    // Reset player
    player.x = 80; player.y = level.groundY - player.h;
    player.vx = 0; player.vy = 0;
    player.hp = player.maxHp;
    player.state = 'idle';
    player.invincible = 0;
    player.facing = 1;

    // Reset stats
    stats.itemsGot    = 0;
    stats.noHurt      = true;
    stats.startTime   = Date.now();
    stats.elapsedSec  = 0;

    firedTriggers.clear();
    collectedKeys.clear();
    pendingMessage = null;
    messageActive  = false;
    paused = false;
    completeLock = false;

    cam.x = 0;
    cam.y = 0;

    // Update HUD
    updateHUD();

    // Show canvas, hide hub
    document.getElementById('levelHub').style.display  = 'none';
    document.getElementById('gameArea').style.display  = 'block';
    document.getElementById('levelCompleteOverlay').style.display = 'none';
    document.getElementById('pauseOverlay').style.display         = 'none';
    document.getElementById('messagePopup').style.display         = 'none';

    // Update level name in HUD
    document.getElementById('hudLevelName').textContent = `LV.${id} ${level.name}`;

    resizeCanvas();

    running = true;
    lastTime = performance.now();
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  function stopLevel(showHub = false) {
    running = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }

    document.getElementById('gameArea').style.display        = 'none';
    document.getElementById('levelCompleteOverlay').style.display = 'none';
    document.getElementById('pauseOverlay').style.display         = 'none';
    document.getElementById('messagePopup').style.display         = 'none';

    if (showHub) {
      document.getElementById('levelHub').style.display = 'block';
    }
  }

  /* ============================================
     MAIN LOOP
     ============================================ */
  function loop(ts) {
    if (!running) return;
    animId = requestAnimationFrame(loop);

    const dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    if (!paused && !messageActive) {
      update(dt);
    }
    render();
  }

  /* ============================================
     UPDATE
     ============================================ */
  function update(dt) {
    updatePlayer(dt);
    updateMonsters(dt);
    checkItemCollisions();
    checkChestCollisions();
    checkPortal();
    checkTriggers();
    updateCamera();
    updateHUD();
    stats.elapsedSec = (Date.now() - stats.startTime) / 1000;

    // Timer for invincibility
    if (player.invincible > 0) player.invincible--;
    if (player.hurtTimer  > 0) {
      player.hurtTimer--;
      if (player.hurtTimer === 0) player.state = 'idle';
    }
    if (lockedHintCooldown > 0) lockedHintCooldown--;
  }

  /* ---------- PLAYER UPDATE ---------- */
  function updatePlayer(dt) {
    // Horizontal
    if (keys.ArrowLeft) {
      player.vx    = -player.speed;
      player.facing = -1;
    } else if (keys.ArrowRight) {
      player.vx    = player.speed;
      player.facing = 1;
    } else {
      player.vx *= 0.7; // friction
    }

    // Jump
    if ((keys.ArrowUp) && player.onGround && !jumpHeld) {
      player.vy = player.jumpForce;
      player.onGround = false;
      jumpHeld = true;
      player.state = 'jump';
      ParticleSystem.pixelBurst(player.x + player.w / 2, player.y + player.h);
    }
    if (!keys.ArrowUp) jumpHeld = false;

    // Gravity
    player.vy += GRAVITY;
    player.vy  = clamp(player.vy, -20, 18);

    // Move X
    player.x += player.vx;
    player.x  = clamp(player.x, 0, level.width - player.w);
    resolveXCollisions();

    // Move Y
    player.y += player.vy;
    player.onGround = false;
    resolveYCollisions();

    // Fall into pit
    if (player.y > level.groundY + 80) {
      hurtPlayer(1);
      player.x = Math.max(0, cam.x + 60);
      player.y = level.groundY - player.h;
      player.vy = 0;
    }

    // State
    if (player.hurtTimer > 0) {
      player.state = 'hurt';
    } else if (!player.onGround) {
      player.state = 'jump';
    } else if (Math.abs(player.vx) > 0.3) {
      player.state = 'walk';
      player.walkTimer++;
      if (player.walkTimer % 10 === 0) player.walkFrame = (player.walkFrame + 1) % 4;
    } else {
      player.state = 'idle';
    }
  }

  /* ---------- RESOLVE COLLISIONS ---------- */
  function resolveXCollisions() {
    if (!level) return;
    const platforms = [...level.platforms];
    for (const p of platforms) {
      if (rectOverlap(player, p)) {
        if (player.vx > 0) player.x = p.x - player.w;
        else if (player.vx < 0) player.x = p.x + p.w;
        player.vx = 0;
      }
    }
  }

  function resolveYCollisions() {
    if (!level) return;
    const platforms = [...level.platforms];
    // Add ground
    platforms.push({ x: 0, y: level.groundY, w: level.width, h: 200 });

    for (const p of platforms) {
      if (rectOverlap(player, p)) {
        if (player.vy > 0) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        } else if (player.vy < 0) {
          player.y = p.y + p.h;
          player.vy = 0;
        }
      }
    }
  }

  /* ---------- MONSTERS ---------- */
  function updateMonsters(dt) {
    if (!level) return;
    level.monsters.forEach(m => {
      if (!m.alive) return;
      m.x += m.vx;
      if (m.x <= m.patrolMin) { m.x = m.patrolMin; m.vx = Math.abs(m.vx); }
      if (m.x >= m.patrolMax) { m.x = m.patrolMax; m.vx = -Math.abs(m.vx); }

      // Hit player
      if (player.invincible === 0 && rectOverlap(player, m)) {
        hurtPlayer(1);
      }
    });
  }

  /* ---------- ITEMS ---------- */
  function checkItemCollisions() {
    if (!level) return;
    level.items.forEach(it => {
      if (it.collected) return;
      if (rectOverlap(player, { x: it.x, y: it.y, w: it.w, h: it.h })) {
        collectItem(it);
      }
    });
  }

  function collectItem(it) {
    it.collected = true;
    stats.itemsGot++;

    // --- KUNCI: masukkan ke inventory dan unlock chest yang membutuhkan ---
    if (it.type === 'key') {
      collectedKeys.add(it.id);
      // Unlock semua chest yang menunggu kunci ini
      level.chests.forEach(ch => {
        if (ch.keyId === it.id && ch.locked) {
          ch.locked = false;
          // Efek kilat singkat di posisi chest
          ParticleSystem.burst(
            ch.x + ch.w / 2 - cam.x, ch.y - cam.y,
            { count: 16, type: 'star', speed: 3, size: 7,
              colors: ['#ffd43b', '#ffe566', '#c9a800'] }
          );
          Toast.show('🔑 Kunci ditemukan! Peti terbuka!', 2500, '🔓');
        }
      });
      // Partikel kunci
      ParticleSystem.burst(
        it.x + it.w / 2 - cam.x, it.y - cam.y,
        { count: 20, type: 'star', speed: 4, size: 8,
          colors: ['#ffd43b','#ff8c42','#ffe566'] }
      );
      FloatingHearts.spawn(it.x - cam.x + it.w / 2, it.y - cam.y);
      updateHUD();
      // Pesan kunci
      scheduleMesage('🔑 Kunci ditemukan! Sekarang kamu bisa membuka peti di depan!');
      return;
    }

    // --- ITEM BIASA ---
    ParticleSystem.starBurst(it.x + it.w / 2 - cam.x, it.y - cam.y);
    FloatingHearts.spawn(it.x - cam.x + it.w / 2, it.y - cam.y);

    // Update inventory global
    const gState = window.AppState?.gameState;
    if (gState) {
      if (!gState.itemsCollected) gState.itemsCollected = [];
      if (!gState.itemsCollected.includes(it.id)) gState.itemsCollected.push(it.id);
    }

    Toast.show(randomFrom(window.MESSAGES?.affirmations || ['Great!']), 2500, '✨');
    updateHUD();

    // Trigger pesan
    const trig = level.triggers?.find(t => t.type === 'item' && t.itemId === it.id);
    if (trig && !firedTriggers.has(trig.id)) {
      firedTriggers.add(trig.id);
      scheduleMesage(LevelData.resolveMsg(trig.msg));
    }
  }

  /* ---------- CHESTS ---------- */
  function checkChestCollisions() {
    if (!level) return;
    level.chests.forEach(ch => {
      if (ch.opened) return;
      const dist = Math.abs((player.x + player.w / 2) - (ch.x + ch.w / 2));
      if (dist < 48 && player.y + player.h > ch.y && player.y < ch.y + ch.h) {
        if (keys.Space || keys[' ']) {
          if (ch.locked) {
            // Peti masih terkunci — tunjukkan hint
            showLockedChestHint(ch);
          } else {
            openChest(ch);
          }
        }
      }
    });
  }

  // Cooldown agar hint tidak spam setiap frame
  let lockedHintCooldown = 0;
  function showLockedChestHint(ch) {
    if (lockedHintCooldown > 0) return;
    lockedHintCooldown = 90; // ~1.5 detik @ 60fps
    // Shake effect pada chest
    ch._shake = 12;
    Toast.show('🔒 Peti terkunci! Temukan kunci 🔑 terlebih dahulu.', 2200, '🔒');
    ParticleSystem.burst(
      ch.x + ch.w / 2 - cam.x, ch.y + ch.h / 2 - cam.y,
      { count: 8, type: 'pixel', speed: 2, size: 4,
        colors: ['#ff6b6b','#ff4444'] }
    );
  }

  function openChest(ch) {
    if (ch.opened) return;
    ch.opened = true;

    ParticleSystem.confetti(50);
    FloatingHearts.spawn(ch.x - cam.x + ch.w / 2, ch.y - cam.y);

    const gState = window.AppState?.gameState;
    if (gState) {
      gState.chestsOpened = (gState.chestsOpened || 0) + 1;
    }

    const trig = level.triggers?.find(t => t.type === 'chest' && t.chestId === ch.id);
    const msg  = trig ? LevelData.resolveMsg(trig.msg) : randomFrom(window.MESSAGES?.affirmations || ['💖']);
    scheduleMesage(msg);
    updateHUD();
  }

  /* ---------- PORTAL ---------- */
  function checkPortal() {
    if (!level?.portal || completeLock) return;
    const p = level.portal;
    if (rectOverlap(player, { x: p.x, y: p.y, w: p.w, h: p.h })) {
      completeLock = true;
      completeLevel();
    }
  }

  /* ---------- TRIGGERS ---------- */
  function checkTriggers() {
    if (!level?.triggers) return;
    level.triggers.forEach(t => {
      if (firedTriggers.has(t.id)) return;
      if (t.type === 'position') {
        if (player.x >= t.x) {
          firedTriggers.add(t.id);
          scheduleMesage(LevelData.resolveMsg(t.msg));

          // Mark gate
          const gState = window.AppState?.gameState;
          if (gState && !gState.itemsCollected) gState.itemsCollected = [];
          if (gState && t.id === 'gate') gState.itemsCollected.push('gate');
        }
      }
      if (t.type === 'monster') {
        const m = level.monsters.find(m => m.id === t.monsterId);
        if (m && !m.alive && !firedTriggers.has(t.id)) {
          firedTriggers.add(t.id);
          scheduleMesage(LevelData.resolveMsg(t.msg));
        }
      }
    });
  }

  /* ---------- HURT PLAYER ---------- */
  function hurtPlayer(dmg) {
    if (player.invincible > 0) return;
    player.hp = Math.max(0, player.hp - dmg);
    player.invincible = 90;
    player.hurtTimer  = 20;
    stats.noHurt = false;

    ParticleSystem.burst(
      player.x + player.w / 2 - cam.x,
      player.y + player.h / 2 - cam.y,
      { count: 10, colors: ['#ff6b6b','#ff4444'], speed: 3, size: 4 }
    );

    updateHUD();
    if (player.hp <= 0) gameOver();
  }

  /* ---------- ATTACK / JUMP ON MONSTER ---------- */
  function attemptAttack() {
    if (!level) return;
    level.monsters.forEach(m => {
      if (!m.alive) return;
      const dist = Math.abs((player.x + player.w / 2) - (m.x + m.w / 2));
      if (dist < 50 && Math.abs(player.y - m.y) < 60) {
        hitMonster(m);
      }
    });
  }

  function attemptJump() {
    if (player.onGround) {
      player.vy = player.jumpForce;
      player.onGround = false;
      jumpHeld = true;
    }
    // Stomp on monster
    if (!level) return;
    level.monsters.forEach(m => {
      if (!m.alive) return;
      if (
        player.vy > 0 &&
        rectOverlap(player, { x: m.x, y: m.y, w: m.w, h: m.h }) &&
        player.y + player.h < m.y + m.h / 2
      ) {
        hitMonster(m);
        player.vy = player.jumpForce * 0.6;
      }
    });
  }

  function hitMonster(m) {
    m.hp--;
    m.hits++;
    ParticleSystem.pixelBurst(m.x - cam.x + m.w / 2, m.y - cam.y);

    if (m.hp <= 0) {
      m.alive = false;
      stats.itemsGot++;
      ParticleSystem.confetti(30);
      FloatingHearts.spawn(m.x - cam.x + m.w / 2, m.y - cam.y);
      Toast.show('💪 Monster dikalahkan!', 2000, '⚔️');
    }
  }

  /* ---------- CAMERA ---------- */
  function updateCamera() {
    if (!level || !canvas) return;
    const target = player.x - canvas.width * 0.35;
    cam.x += (target - cam.x) * 0.1;
    cam.x  = clamp(cam.x, 0, level.width - canvas.width);
  }

  /* ---------- HUD ---------- */
  function updateHUD() {
    // HP bar
    const hpFill = document.getElementById('hpFill');
    if (hpFill) {
      hpFill.style.width = (player.hp / player.maxHp * 100) + '%';
      hpFill.style.background = player.hp <= 2
        ? 'linear-gradient(90deg,#ff6b6b,#ff4444)'
        : 'linear-gradient(90deg,#51cf66,#94d82d)';
    }

    // Score
    const scoreEl = document.getElementById('hudScore');
    if (scoreEl) scoreEl.textContent = stats.itemsGot;

    // Inventory — item biasa + kunci yang dipegang
    const inv = document.getElementById('hudItems');
    if (inv && level) {
      const collected = level.items.filter(i => i.collected);
      const icons = { coffee:'☕', notebook:'📓', book:'📚', star:'⭐', key:'🔑' };

      inv.innerHTML = collected.slice(0, 5).map(i => {
        const isKey = i.type === 'key';
        // Cek apakah kunci ini sudah dipakai (chest yang pakai kunci ini sudah unlocked)
        const keyUsed = isKey && level.chests.some(ch => ch.keyId === i.id && !ch.locked);
        return `<div class="hud-item ${isKey ? 'hud-item-key' : ''} ${keyUsed ? 'hud-item-used' : ''}"
                     title="${isKey ? (keyUsed ? 'Kunci sudah dipakai' : 'Kunci: belum dipakai') : i.type}">
                  ${icons[i.type] || '✨'}
                </div>`;
      }).join('');
    }
  }

  /* ---------- MESSAGES ---------- */
  function scheduleMesage(text) {
    pendingMessage = text;
    if (!messageActive) showMessage();
  }

  function showMessage() {
    if (!pendingMessage) return;
    messageActive = true;
    const popup = document.getElementById('messagePopup');
    const text  = document.getElementById('messageText');
    if (!popup || !text) return;
    text.textContent = pendingMessage;
    pendingMessage = null;
    popup.style.display = 'flex';

    const gState = window.AppState?.gameState;
    if (gState) {
      gState.messagesCollected = (gState.messagesCollected || 0) + 1;
    }
    ParticleSystem.hearts(window.innerWidth / 2, window.innerHeight / 2);

    Achievements.checkAll(window.AppState?.gameState || {});
  }

  function closeMessage() {
    messageActive = false;
    document.getElementById('messagePopup').style.display = 'none';
    if (pendingMessage) showMessage();
  }

  /* ---------- GAME OVER ---------- */
  function gameOver() {
    paused = true;
    Toast.show('Jangan menyerah! Coba lagi ya 💪', 3000, '💖');
    setTimeout(() => {
      if (levelId) startLevel(levelId);
    }, 2000);
  }

  /* ---------- COMPLETE LEVEL ---------- */
  function completeLevel() {
    running = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }

    const starCount = LevelData.calcStars(levelId, stats);

    // Update game state
    const gState = window.AppState?.gameState;
    if (gState) {
      if (!gState.completedLevels.includes(levelId)) {
        gState.completedLevels.push(levelId);
      }
      const prev = gState.levelStars[levelId] || 0;
      if (starCount > prev) gState.levelStars[levelId] = starCount;
      gState.totalStars = Object.values(gState.levelStars).reduce((a,b) => a+b, 0);
      gState.currentLevel = Math.min(5, levelId + 1);

      // Check garden unlock
      if (gState.completedLevels.includes(1) &&
          gState.completedLevels.includes(2) &&
          gState.completedLevels.includes(3) &&
          gState.completedLevels.includes(4)) {
        gState.gardenUnlocked = true;
      }

      Storage.save(gState);
    }

    Achievements.checkAll(gState || {});
    ParticleSystem.confetti(80);

    // Show overlay
    const overlay  = document.getElementById('levelCompleteOverlay');
    const starsEl  = document.getElementById('completeStars');
    const msgEl    = document.getElementById('completeMessage');
    const rewardsEl= document.getElementById('completeRewards');

    starsEl.textContent = ['☆☆☆','⭐☆☆','⭐⭐☆','⭐⭐⭐'][starCount];
    msgEl.textContent   = LevelData.resolveMsg(level.completeMsg);

    rewardsEl.innerHTML = (level.rewards || []).map(r =>
      `<div class="reward-item">
        <span class="reward-${r.type}-icon">${r.icon}</span>
        <span class="reward-label">${r.label}</span>
      </div>`
    ).join('');

    overlay.style.display = 'flex';

    // Next level button logic
    const btnNext = document.getElementById('btnNextLevel');
    if (btnNext) {
      if (levelId >= 4) {
        btnNext.textContent = '🌸 Memory Garden';
        btnNext.onclick = () => {
          stopLevel(false);
          SecretGarden.open();
        };
      } else {
        btnNext.textContent = 'Next Level ▶';
        btnNext.onclick = goNextLevel;
      }
    }

    window.AppState?.refreshUI();
  }

  function goNextLevel() {
    document.getElementById('levelCompleteOverlay').style.display = 'none';
    const next = levelId + 1;
    if (next <= 4) {
      startLevel(next);
    } else {
      stopLevel(true);
    }
  }

  /* ---------- PAUSE ---------- */
  function togglePause() {
    paused = !paused;
    const overlay = document.getElementById('pauseOverlay');
    if (overlay) overlay.style.display = paused ? 'flex' : 'none';
  }

  /* ============================================
     RENDER
     ============================================ */
  function render() {
    if (!ctx || !canvas || !level) return;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    const bg   = level.bgColors;
    grad.addColorStop(0, bg.sky);
    grad.addColorStop(0.7, bg.sky);
    grad.addColorStop(1, bg.ground || '#7BC67E');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(-Math.round(cam.x), -Math.round(cam.y));

    drawDecorations();
    drawPlatforms();
    drawItems();
    drawChests();
    drawMonsters();
    drawPortal();
    drawSigns();
    drawPlayer();

    ctx.restore();
  }

  /* ---------- DRAW: PLATFORMS ---------- */
  function drawPlatforms() {
    // Ground
    ctx.fillStyle = level.bgColors.ground || '#7BC67E';
    ctx.fillRect(0, level.groundY, level.width, 200);

    // Ground top line
    ctx.fillStyle = '#94d98a';
    ctx.fillRect(0, level.groundY, level.width, 4);

    // Platform tiles
    level.platforms.forEach(p => {
      const isDark = level.id >= 3;
      const colors = {
        grass: ['#7BC67E','#94d98a','#6ab56e'],
        brick: isDark ? ['#4a2c6e','#6b3a9e','#3a1e50'] : ['#c8603a','#e07050','#a04030'],
      };
      const c = colors[p.type] || colors.grass;

      ctx.fillStyle = c[0];
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = c[1];
      ctx.fillRect(p.x, p.y, p.w, 3);
      ctx.fillStyle = c[2];
      ctx.fillRect(p.x, p.y + p.h - 3, p.w, 3);

      // Brick pattern
      if (p.type === 'brick') {
        ctx.fillStyle = c[2];
        for (let bx = p.x; bx < p.x + p.w; bx += 16) {
          ctx.fillRect(bx, p.y, 1, p.h);
        }
      }
    });
  }

  /* ---------- DRAW: ITEMS ---------- */
  function drawItems() {
    const t = Date.now() / 600;
    level.items.forEach(it => {
      if (it.collected) return;
      const floatY = Math.sin(t + it.x * 0.01) * 3;

      ctx.save();
      ctx.translate(it.x + it.w / 2, it.y + it.h / 2 + floatY);

      if (it.type === 'key') {
        // ===== KUNCI — pixel art golden key =====
        const pulse = 0.9 + Math.sin(t * 2 + it.x * 0.05) * 0.12;
        ctx.scale(pulse, pulse);

        // Glow aura
        const grd = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
        grd.addColorStop(0, 'rgba(255,212,59,0.55)');
        grd.addColorStop(1, 'rgba(255,212,59,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();

        // Gagang kunci (lingkaran)
        ctx.strokeStyle = '#c9a800'; ctx.lineWidth = 3;
        ctx.fillStyle   = '#ffd43b';
        ctx.beginPath(); ctx.arc(-4, -2, 7, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Lubang gagang
        ctx.fillStyle = '#8B6914';
        ctx.beginPath(); ctx.arc(-4, -2, 2.5, 0, Math.PI * 2); ctx.fill();

        // Batang kunci
        ctx.strokeStyle = '#c9a800'; ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(2, -2); ctx.lineTo(12, -2); ctx.stroke();

        // Gigi kunci
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(8,  -2); ctx.lineTo(8,  3);  ctx.stroke();
        ctx.beginPath(); ctx.moveTo(11, -2); ctx.lineTo(11, 2);  ctx.stroke();

        // Label kecil
        ctx.fillStyle = '#ffd43b';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🔑', 0, 18);

      } else {
        // ===== ITEM BIASA =====
        ctx.shadowColor = level.bgColors.accent;
        ctx.shadowBlur  = 12;
        ctx.font = '20px serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        const icons = { coffee:'☕', notebook:'📓', book:'📚', star:'⭐' };
        ctx.fillText(icons[it.type] || '✨', 0, 0);
      }

      ctx.restore();
    });
  }

  /* ---------- DRAW: CHESTS ---------- */
  function drawChests() {
    const t = Date.now() / 400;
    level.chests.forEach(ch => {

      // Shake efek saat dicoba buka tapi terkunci
      if (ch._shake > 0) {
        ch._shake--;
      }
      const shakeX = ch._shake > 0 ? Math.sin(ch._shake * 1.8) * 3 : 0;
      const bobY   = ch.opened ? 0 : Math.sin(t + ch.x * 0.01) * 2;

      ctx.save();
      ctx.translate(ch.x + ch.w / 2 + shakeX, ch.y + ch.h / 2 + bobY);

      if (ch.opened) {
        // ===== PETI TERBUKA =====
        ctx.fillStyle   = '#a07800';
        ctx.strokeStyle = '#5c4a00'; ctx.lineWidth = 2;
        roundRect(ctx, -ch.w/2, -ch.h/2, ch.w, ch.h, 4);
        ctx.fill(); ctx.stroke();
        // Lid terangkat
        ctx.fillStyle = '#c9a800';
        ctx.save();
        ctx.translate(0, -ch.h/2 - 4);
        ctx.rotate(-0.6);
        roundRect(ctx, -ch.w/2, -6, ch.w, 10, 3);
        ctx.fill(); ctx.stroke();
        ctx.restore();
        // Isi berkilau
        ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✨', 0, 2);

      } else if (ch.locked) {
        // ===== PETI TERKUNCI =====
        const redPulse = 0.85 + Math.sin(t * 2) * 0.15;

        // Aura merah
        ctx.shadowColor = `rgba(255,60,60,${redPulse * 0.5})`;
        ctx.shadowBlur  = 14;

        // Badan peti — merah tua
        ctx.fillStyle   = `rgba(160,40,40,${0.8 + redPulse * 0.2})`;
        ctx.strokeStyle = '#8B0000'; ctx.lineWidth = 2;
        roundRect(ctx, -ch.w/2, -ch.h/2, ch.w, ch.h, 4);
        ctx.fill(); ctx.stroke();

        // Lid — merah lebih terang
        ctx.shadowBlur = 0;
        ctx.fillStyle  = `rgba(200,60,60,${0.85 + redPulse * 0.15})`;
        roundRect(ctx, -ch.w/2, -ch.h/2, ch.w, ch.h / 2.5, 4);
        ctx.fill(); ctx.stroke();

        // Strip logam
        ctx.fillStyle = '#8B6914'; ctx.fillRect(-2, -ch.h/2, 4, ch.h);
        ctx.fillRect(-ch.w/2, -4, ch.w, 4);

        // Gembok di tengah
        ctx.shadowColor = 'rgba(255,200,0,0.8)';
        ctx.shadowBlur  = 8;
        ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🔒', 0, 3);

        // Tanda tanya berkedip: "butuh kunci!"
        const qAlpha = (Math.sin(t * 3) + 1) / 2;
        ctx.shadowBlur = 0;
        ctx.globalAlpha = qAlpha * 0.9 + 0.1;
        ctx.fillStyle = '#ffd43b';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('🔑?', 0, -ch.h / 2 - 12);
        ctx.globalAlpha = 1;

      } else {
        // ===== PETI BISA DIBUKA (kunci sudah ada) =====
        const goldPulse = 0.9 + Math.sin(t * 2.5) * 0.1;

        // Aura emas berdenyut
        ctx.shadowColor = `rgba(255,212,59,${goldPulse * 0.6})`;
        ctx.shadowBlur  = 16 * goldPulse;

        ctx.fillStyle   = `rgb(${Math.round(180 + 21*goldPulse)},${Math.round(140+18*goldPulse)},0)`;
        ctx.strokeStyle = '#5c4a00'; ctx.lineWidth = 2;
        roundRect(ctx, -ch.w/2, -ch.h/2, ch.w, ch.h, 4);
        ctx.fill(); ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle  = `rgb(${Math.round(210+45*goldPulse)},${Math.round(168+36*goldPulse)},0)`;
        roundRect(ctx, -ch.w/2, -ch.h/2, ch.w, ch.h / 2.5, 4);
        ctx.fill(); ctx.stroke();

        ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🔓', 0, 3);

        // Label "BUKA!" berkedip
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px sans-serif';
        ctx.globalAlpha = (Math.sin(t * 4) + 1) / 2 * 0.9 + 0.1;
        ctx.fillText('BUKA!', 0, -ch.h / 2 - 11);
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    });
  }

  /* ---------- DRAW: MONSTERS ---------- */
  function drawMonsters() {
    const t = Date.now() / 300;
    level.monsters.forEach(m => {
      if (!m.alive) return;
      const bobY = Math.sin(t + m.x * 0.01) * 3;
      const icons = {
        overthinking: '😵‍💫',
        deadline:     '⏰',
        guardian:     '🛡️',
        patrol:       '👾',
        boss:         '👹'
      };
      const emoji = icons[m.type] || '👾';
      const size  = m.isBoss ? 40 : 28;

      ctx.save();
      ctx.translate(m.x + m.w / 2, m.y + m.h / 2 + bobY);
      if (m.vx > 0) ctx.scale(-1, 1);

      // Shadow
      ctx.fillStyle   = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(0, m.h / 2, m.w / 2.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // HP bar
      const barW = m.w;
      ctx.fillStyle = '#333';
      ctx.fillRect(-barW / 2, -m.h / 2 - 8, barW, 5);
      ctx.fillStyle = m.hp > m.maxHp / 2 ? '#51cf66' : '#ff6b6b';
      ctx.fillRect(-barW / 2, -m.h / 2 - 8, barW * (m.hp / m.maxHp), 5);

      ctx.font = `${size}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 0, 0);

      ctx.restore();
    });
  }

  /* ---------- DRAW: PORTAL ---------- */
  function drawPortal() {
    if (!level.portal) return;
    const p = level.portal;
    const t = Date.now() / 800;

    ctx.save();
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);

    // Outer ring
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, p.w / 2);
    grad.addColorStop(0, '#cc5de8');
    grad.addColorStop(0.5, '#9775fa80');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Spinning star
    ctx.rotate(t);
    ctx.font = '18px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText('✦', 0, 0);

    ctx.restore();
  }

  /* ---------- DRAW: SIGNS ---------- */
  function drawSigns() {
    if (!level.signs) return;
    level.signs.forEach(s => {
      ctx.save();
      // Post
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(s.x + 10, s.y, 5, 32);

      // Board
      ctx.fillStyle = '#c9a800';
      ctx.strokeStyle = '#8B6914';
      ctx.lineWidth = 2;
      roundRect(ctx, s.x, s.y, s.w, 20, 3);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#5c4a00';
      ctx.font = '7px "Press Start 2P", monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(s.text.substring(0, 14), s.x + s.w / 2, s.y + 10);

      ctx.restore();
    });
  }

  /* ---------- DRAW: DECORATIONS ---------- */
  function drawDecorations() {
    if (!level.decos) return;
    level.decos.forEach(d => {
      ctx.save();
      ctx.translate(d.x, d.y);

      switch (d.type) {
        case 'tree':
          drawTree(ctx);
          break;
        case 'cloud':
          drawCloud(ctx, d.x);
          break;
        case 'building':
          drawBuilding(ctx);
          break;
        case 'bookshelf':
          drawBookshelf(ctx);
          break;
        case 'torch':
          drawTorch(ctx);
          break;
        case 'skull':
          ctx.font = '20px serif'; ctx.textAlign = 'center';
          ctx.fillText('💀', 0, 0);
          break;
        case 'flag':
          drawFlag(ctx);
          break;
        case 'lamp':
          ctx.font = '20px serif'; ctx.textAlign = 'center';
          ctx.fillText('🪔', 0, 0);
          break;
        default: break;
      }
      ctx.restore();
    });
  }

  function drawTree(ctx) {
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-5, 0, 10, 30);
    ctx.fillStyle = '#51a045';
    ctx.beginPath();
    ctx.moveTo(0, -50); ctx.lineTo(-22, 0); ctx.lineTo(22, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#42904e';
    ctx.beginPath();
    ctx.moveTo(0, -65); ctx.lineTo(-16, -20); ctx.lineTo(16, -20);
    ctx.closePath(); ctx.fill();
  }

  function drawCloud(ctx, xOff) {
    const t = Date.now() / 4000 + xOff * 0.001;
    ctx.save();
    ctx.translate(Math.sin(t) * 8, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-18, -5, 22, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(16, -4, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBuilding(ctx) {
    ctx.fillStyle = '#c4a882';
    ctx.fillRect(-60, -160, 120, 160);
    ctx.fillStyle = '#a08060';
    for (let r = 0; r < 4; r++)
      for (let c = 0; c < 3; c++) {
        ctx.fillStyle = Math.random() > 0.7 ? '#ffd43b' : '#7a6040';
        ctx.fillRect(-50 + c * 38, -140 + r * 40, 24, 28);
      }
  }

  function drawBookshelf(ctx) {
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-30, -60, 60, 60);
    ctx.fillStyle = '#5c4a00';
    for (let s = 0; s < 3; s++)
      ctx.fillRect(-30, -60 + s * 20, 60, 3);
    const cols = ['#e05090','#4dabf7','#51cf66','#ffd43b','#cc5de8'];
    for (let b = 0; b < 5; b++) {
      ctx.fillStyle = cols[b];
      ctx.fillRect(-26 + b * 11, -55, 8, 17);
    }
  }

  function drawTorch(ctx) {
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-3, 0, 6, 20);
    ctx.fillStyle = '#ff8c42';
    ctx.beginPath();
    ctx.moveTo(0, -16); ctx.lineTo(-6, 0); ctx.lineTo(6, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd43b';
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(-3, 0); ctx.lineTo(3, 0);
    ctx.closePath(); ctx.fill();
  }

  function drawFlag(ctx) {
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(-2, -80, 4, 80);
    ctx.fillStyle = '#ff7eb3';
    ctx.fillRect(2, -78, 30, 18);
    ctx.fillStyle = '#ff44aa';
    ctx.font = '10px serif'; ctx.textAlign = 'center';
    ctx.fillText('🌸', 17, -62);
  }

  /* ---------- DRAW: PLAYER ---------- */
  function drawPlayer() {
    const px = Math.round(player.x);
    const py = Math.round(player.y);
    const t  = Date.now();

    ctx.save();
    ctx.translate(px + player.w / 2, py + player.h / 2);

    // Flip
    if (player.facing < 0) ctx.scale(-1, 1);

    // Invincibility flicker
    if (player.invincible > 0 && Math.floor(player.invincible / 4) % 2 === 0) {
      ctx.globalAlpha = 0.35;
    }

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, player.h / 2, player.w * 0.45, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body offset for animations
    let bodyY = 0;
    if (player.state === 'idle') bodyY = Math.sin(t / 600) * 1.5;
    if (player.state === 'walk') bodyY = Math.sin(t / 150) * 2;
    if (player.state === 'jump') bodyY = -4;

    ctx.translate(0, bodyY);

    // === HAIR ===
    ctx.fillStyle = '#5c3317';
    roundRect(ctx, -10, -22, 20, 10, 3);
    ctx.fill();
    // Hair strand
    ctx.fillRect(-12, -18, 4, 8);
    ctx.fillRect(9,   -18, 4, 8);

    // === HEAD ===
    ctx.fillStyle = '#f5c5a3';
    roundRect(ctx, -9, -14, 18, 16, 5);
    ctx.fill();

    // === EYES ===
    ctx.fillStyle = '#1a1a1a';
    // Happy eyes by default
    if (player.state === 'hurt') {
      ctx.fillText('×', -5, -7);
      ctx.fillText('×', 3, -7);
    } else {
      ctx.beginPath(); ctx.arc(-5, -7, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(3,  -7, 2.5, 0, Math.PI * 2); ctx.fill();
      // Eye shine
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-4, -8, 1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4,  -8, 1, 0, Math.PI * 2); ctx.fill();
    }

    // === BLUSH ===
    ctx.fillStyle = 'rgba(255,100,150,0.35)';
    ctx.beginPath(); ctx.ellipse(-7, -4, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(7,  -4, 4, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // === SMILE ===
    if (player.state !== 'hurt') {
      ctx.strokeStyle = '#c05080'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, -3, 4, 0.1, Math.PI - 0.1); ctx.stroke();
    }

    // === BODY (shirt) ===
    ctx.fillStyle = '#ff7eb3';
    roundRect(ctx, -9, 2, 18, 14, 3);
    ctx.fill();
    // Shirt detail
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(-6, 4, 5, 3);

    // === SKIRT ===
    ctx.fillStyle = '#9b59b6';
    ctx.beginPath();
    ctx.moveTo(-10, 14);
    ctx.lineTo(-13, 22);
    ctx.lineTo(13, 22);
    ctx.lineTo(10, 14);
    ctx.closePath();
    ctx.fill();

    // === LEGS ===
    const legOffset = player.state === 'walk' ? Math.sin(t / 150) * 3 : 0;
    ctx.fillStyle = '#f5c5a3';
    ctx.fillRect(-7, 22, 5, 10 + legOffset);
    ctx.fillRect(2,  22, 5, 10 - legOffset);

    // === SHOES ===
    ctx.fillStyle = '#5c3317';
    ctx.fillRect(-8, 30 + legOffset, 7, 5);
    ctx.fillRect(2,  30 - legOffset, 7, 5);

    // === ARMS ===
    const armSwing = player.state === 'walk' ? Math.sin(t / 150) * 6 : 0;
    ctx.fillStyle = '#ff7eb3';
    ctx.save();
    ctx.translate(-10, 5);
    ctx.rotate((-0.3 + armSwing * 0.04) * Math.PI);
    ctx.fillRect(-2, 0, 4, 10);
    ctx.restore();
    ctx.save();
    ctx.translate(10, 5);
    ctx.rotate((0.3 - armSwing * 0.04) * Math.PI);
    ctx.fillRect(-2, 0, 4, 10);
    ctx.restore();

    // === BACKPACK ===
    ctx.fillStyle = '#74c0fc';
    roundRect(ctx, 8, -2, 10, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#4dabf7';
    ctx.fillRect(9, -1, 8, 2);

    ctx.restore();
  }

  /* ============================================
     HELPERS
     ============================================ */
  function rectOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---------- INPUT HANDLERS ---------- */
  function onKeyDown(e) {
    // Map spacebar to 'Space' key
    const key = e.key === ' ' ? 'Space' : e.key;
    if (keys.hasOwnProperty(key)) keys[key] = true;

    if (e.key === 'ArrowUp' || e.key === ' ') e.preventDefault();
    if (e.key === 'ArrowUp')   attemptJump();
    if (e.key === ' ')         attemptAttack();
    if (e.key === 'Escape')    togglePause();
    if (e.key === 'Enter' && messageActive) closeMessage();
  }

  function onKeyUp(e) {
    const key = e.key === ' ' ? 'Space' : e.key;
    if (keys.hasOwnProperty(key)) keys[key] = false;
  }

  /* ---------- PUBLIC API ---------- */
  return { init, startLevel, stopLevel, togglePause };
})();

window.Game = Game;
