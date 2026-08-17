/* ============================================
   CAMPUS QUEST - TUTORIAL.JS
   Tutorial overlay sebelum game dimulai
   ============================================ */

'use strict';

const Tutorial = (() => {

  const TOTAL_SLIDES = 5;
  let current     = 0;
  let animTimers  = [];  // clearable animation interval handles
  let onDone      = null; // callback saat tutorial selesai

  /* ============================================
     SHOW — tampilkan tutorial
     callback: function dipanggil saat Done/Skip
     ============================================ */
  function show(callback) {
    onDone = callback || (() => {});

    const overlay = document.getElementById('tutorialOverlay');
    if (!overlay) { onDone(); return; }

    current = 0;
    overlay.style.display = 'flex';
    goSlide(0, 'none');

    document.getElementById('tutNext').addEventListener('click', onNext);
    document.getElementById('tutSkip').addEventListener('click', onSkip);
  }

  /* ============================================
     HIDE
     ============================================ */
  function hide() {
    stopAnims();
    const overlay = document.getElementById('tutorialOverlay');
    if (!overlay) return;

    overlay.style.animation = 'tutFadeIn 0.25s ease reverse forwards';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.style.animation = '';
    }, 260);
  }

  /* ============================================
     NAVIGATION
     ============================================ */
  function onNext() {
    if (current < TOTAL_SLIDES - 1) {
      goSlide(current + 1, 'next');
    } else {
      // Done
      hide();
      if (onDone) onDone();
    }
  }

  function onSkip() {
    hide();
    if (onDone) onDone();
  }

  /* ============================================
     GO TO SLIDE
     ============================================ */
  function goSlide(idx, dir) {
    stopAnims();

    // Update slide visibility
    document.querySelectorAll('.tut-slide').forEach((s, i) => {
      s.classList.toggle('active', i === idx);
    });

    // Update dots
    document.querySelectorAll('.tut-dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });

    // Update Next button
    const btnNext = document.getElementById('tutNext');
    if (btnNext) {
      if (idx === TOTAL_SLIDES - 1) {
        btnNext.textContent = '🎮 Mulai!';
        btnNext.classList.add('finish');
      } else {
        btnNext.textContent = 'Next ▶';
        btnNext.classList.remove('finish');
      }
    }

    current = idx;

    // Jalankan animasi slide aktif
    startSlideAnim(idx);
  }

  /* ============================================
     SLIDE ANIMATIONS
     ============================================ */
  function startSlideAnim(idx) {
    switch (idx) {
      case 0: animJoystick();  break;
      case 1: animJumpBtn();   break;
      case 2: animActBtn();    break;
      case 3: animKeyChest();  break;
      case 4: animReady();     break;
    }
  }

  /* Slide 0 — Joystick gerak kiri-kanan */
  function animJoystick() {
    const knob = document.getElementById('tutKnob');
    if (!knob) return;

    const RADIUS = 18;
    let phase = 0;
    const t = setInterval(() => {
      phase += 0.06;
      // Gerakan sinusoidal kiri-kanan
      const dx = Math.sin(phase) * RADIUS;
      const dy = Math.sin(phase * 0.3) * 4; // sedikit naik-turun
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

      // Warna ring sesuai arah
      const zone = knob.closest('.tut-joy-ring');
      if (zone) {
        zone.style.borderColor = dx < -4
          ? 'rgba(255,212,59,0.7)'
          : dx > 4
          ? 'rgba(116,192,252,0.7)'
          : 'rgba(255,255,255,0.25)';
      }
    }, 16);
    animTimers.push(t);
  }

  /* Slide 1 — Jump button ketuk animasi */
  function animJumpBtn() {
    const btn = document.getElementById('tutJumpDemo');
    if (!btn) return;

    let down = false;
    const t = setInterval(() => {
      down = !down;
      if (down) {
        btn.style.transform  = 'scale(0.9) translateY(4px)';
        btn.style.boxShadow  = '0 1px 0 #1864ab, 0 0 8px rgba(116,192,252,0.3)';
      } else {
        btn.style.transform  = '';
        btn.style.boxShadow  = '';
      }
    }, 700);
    animTimers.push(t);
  }

  /* Slide 2 — ACT button ketuk animasi */
  function animActBtn() {
    const btn = document.getElementById('tutActDemo');
    if (!btn) return;

    let down = false;
    const t = setInterval(() => {
      down = !down;
      if (down) {
        btn.style.transform  = 'scale(0.9) translateY(4px)';
        btn.style.boxShadow  = '0 1px 0 #c05800, 0 0 8px rgba(255,140,66,0.3)';
      } else {
        btn.style.transform  = '';
        btn.style.boxShadow  = '';
      }
    }, 700);
    animTimers.push(t);
  }

  /* Slide 3 — Key → Chest sequence */
  function animKeyChest() {
    const key   = document.getElementById('tutKeyAnim');
    const chest = document.getElementById('tutChestAnim');
    if (!key || !chest) return;

    // Step 1: kunci bergerak → peti berubah
    let step = 0;
    const seq = () => {
      if (step === 0) {
        // Kunci "bergerak" ke peti
        key.style.transform = 'scale(1.3) translateX(10px)';
        key.style.filter    = 'drop-shadow(0 0 8px #ffd43b)';
      } else if (step === 1) {
        key.style.transform = '';
        key.style.filter    = '';
        // Peti unlock
        chest.textContent = '🔓';
        chest.style.transform = 'scale(1.3)';
        chest.style.filter    = 'drop-shadow(0 0 10px #51cf66)';
      } else if (step === 2) {
        chest.style.transform = '';
        chest.style.filter    = '';
        // Peti terbuka
        chest.textContent = '✨';
      } else if (step === 3) {
        // Reset
        chest.textContent = '🔒';
        chest.style.transform = '';
        chest.style.filter    = '';
        step = -1;
      }
      step++;
    };

    seq();
    const t = setInterval(seq, 900);
    animTimers.push(t);
  }

  /* Slide 4 — Karakter bounce + stars */
  function animReady() {
    const stars = document.querySelector('.tut-stars-float');
    if (!stars) return;
    // CSS animation handles it, no JS needed
    // Just spawn a tiny particle burst
    if (window.ParticleSystem) {
      const card = document.querySelector('.tutorial-card');
      if (card) {
        const r = card.getBoundingClientRect();
        ParticleSystem.burst(
          r.left + r.width / 2, r.top + r.height * 0.4,
          { count: 16, type: 'star', speed: 3, size: 7,
            colors: ['#ffd43b','#ff7eb3','#74c0fc','#51cf66'] }
        );
      }
    }
  }

  /* ============================================
     STOP ALL ANIMATIONS
     ============================================ */
  function stopAnims() {
    animTimers.forEach(t => clearInterval(t));
    animTimers = [];

    // Reset knob
    const knob = document.getElementById('tutKnob');
    if (knob) {
      knob.style.transform = 'translate(-50%, -50%)';
      const ring = knob.closest('.tut-joy-ring');
      if (ring) ring.style.borderColor = '';
    }
    // Reset chest
    const chest = document.getElementById('tutChestAnim');
    if (chest) {
      chest.textContent = '🔒';
      chest.style.transform = ''; chest.style.filter = '';
    }
    const key = document.getElementById('tutKeyAnim');
    if (key) { key.style.transform = ''; key.style.filter = ''; }
    // Reset buttons
    const jump = document.getElementById('tutJumpDemo');
    if (jump) { jump.style.transform = ''; jump.style.boxShadow = ''; }
    const act = document.getElementById('tutActDemo');
    if (act) { act.style.transform = ''; act.style.boxShadow = ''; }
  }

  /* ============================================
     CHECK — apakah perlu tampilkan tutorial
     Hanya muncul sekali, disimpan di localStorage
     Bisa paksa tampil dengan Tutorial.show()
     ============================================ */
  function showIfFirstTime(callback) {
    const seen = localStorage.getItem('campusQuest_tutorialSeen');
    if (seen) {
      // Sudah pernah lihat — langsung lanjut
      if (callback) callback();
    } else {
      localStorage.setItem('campusQuest_tutorialSeen', '1');
      show(callback);
    }
  }

  /* ---------- PUBLIC ---------- */
  return { show, showIfFirstTime, hide };
})();

window.Tutorial = Tutorial;
