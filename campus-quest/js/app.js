/* ============================================
   CAMPUS QUEST - APP.JS
   Main entry point — wires all modules together
   ============================================ */

'use strict';

/* ============================================
   GLOBAL APP STATE
   ============================================ */
window.AppState = {
  gameState: null,

  init() {
    // Load or create save
    const saved = Storage.load();
    this.gameState = saved || Storage.getDefault();

    // Save migration: patch save lama yang tidak punya fields baru (BUG-09/24)
    this.migrateSave(this.gameState);

    // Init subsystems
    DarkMode.init(this.gameState.darkMode || false);

    // Init subsystems
    ParticleSystem.init();
    FloatingHearts.init();
    Toast.init();
    PageManager.init();
    Achievements.init(this.gameState);
    Game.init();
    SecretGarden.build();

    // Render home UI
    this.refreshUI();

    // Loading sequence
    this.runLoadingScreen();

    // Nav hamburger
    document.getElementById('navHamburger')?.addEventListener('click', () => {
      document.getElementById('navLinks')?.classList.toggle('open');
    });

    // Home buttons
    document.getElementById('btnStartGame')?.addEventListener('click', () => {
      PageManager.navigate('game');
    });
    document.getElementById('btnContinue')?.addEventListener('click', () => {
      PageManager.navigate('game');
    });
    document.getElementById('btnResetGame')?.addEventListener('click', () => {
      if (confirm('Reset semua progress? Ini tidak bisa dibatalkan.')) {
        Storage.clear();
        this.gameState = Storage.getDefault();
        Achievements.init(this.gameState);
        this.refreshUI();
        Toast.show('Progress direset. Semangat mulai lagi! 💪', 3000, '↺');
      }
    });

    // Level cards
    document.querySelectorAll('.level-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = parseInt(card.dataset.level);
        if (card.classList.contains('locked')) {
          Toast.show('Selesaikan level sebelumnya dulu ya! 🔒', 2500, '⚠️');
          return;
        }
        if (id === 5) {
          document.getElementById('levelHub').style.display = 'none';
          document.getElementById('gameArea').style.display = 'none';
          SecretGarden.open();
          return;
        }
        // Tampilkan tutorial hanya saat pertama kali bermain
        Tutorial.showIfFirstTime(() => {
          Game.startLevel(id);
        });
      });
    });

    // Home speech bubble rotation
    this.rotateSpeechBubble();

    // Page change listener — refresh on revisit
    window.addEventListener('pageChange', e => {
      if (e.detail.page === 'home')         this.refreshUI();
      if (e.detail.page === 'achievements') Achievements.init(this.gameState);
    });

    // Dark mode save
    document.getElementById('darkModeToggle')?.addEventListener('click', () => {
      this.gameState.darkMode = DarkMode.active;
      Storage.save(this.gameState);
      generateClouds('cloudsContainer');
    });

    // Ambient effects
    generateClouds('cloudsContainer');
    generateStars('starsContainer', 50);

    // Give first-step achievement on first load
    setTimeout(() => {
      Achievements.unlock('first_step');
    }, 2000);
  },

  /* ============================================
     LOADING SCREEN
     ============================================ */
  runLoadingScreen() {
    const screen = document.getElementById('loadingScreen');
    const bar    = document.getElementById('loadingBarFill');
    const tip    = document.getElementById('loadingTip');
    if (!screen) return;

    const tips = window.MESSAGES?.loadingTips || ['Loading...'];
    let tipIdx = 0;

    const rotateTip = () => {
      if (tip) tip.textContent = tips[tipIdx % tips.length];
      tipIdx++;
    };
    rotateTip();
    const tipInterval = setInterval(rotateTip, 900);

    // Fake loading progress
    let pct = 0;
    const loadInterval = setInterval(() => {
      pct += Math.random() * 18 + 5;
      if (pct >= 100) {
        pct = 100;
        clearInterval(loadInterval);
        clearInterval(tipInterval);

        if (bar) bar.style.width = '100%';
        setTimeout(() => {
          screen.classList.add('fade-out');
          setTimeout(() => { screen.style.display = 'none'; }, 700);
        }, 400);
      }
      if (bar) bar.style.width = Math.min(pct, 100) + '%';
    }, 120);
  },

  /* ============================================
     REFRESH HOME UI
     ============================================ */
  refreshUI() {
    const gs = this.gameState;
    if (!gs) return;

    // Stats
    animateNumber(document.getElementById('statStars'),        0, gs.totalStars        || 0, 600);
    animateNumber(document.getElementById('statAchievements'), 0, Achievements.getCount(), 600);
    animateNumber(document.getElementById('statLevels'),       0, (gs.completedLevels || []).length, 600);
    animateNumber(document.getElementById('statMessages'),     0, gs.messagesCollected || 0, 600);

    // Progress bar — based on completed levels + garden
    const totalSteps  = 5;
    const completed   = (gs.completedLevels || []).length + (gs.gardenUnlocked ? 1 : 0);
    const pct         = Math.round((completed / totalSteps) * 100);

    // BUG-25: null guard semua DOM elements
    const mainFill = document.getElementById('mainProgressFill');
    const pctLabel = document.getElementById('progressPercent');
    const miniFill = document.getElementById('miniProgress');
    const miniLbl  = document.getElementById('miniProgressLabel');
    const btnCont  = document.getElementById('btnContinue');

    if (mainFill) mainFill.style.width = pct + '%';
    if (pctLabel) pctLabel.textContent  = pct + '%';
    if (miniFill) miniFill.style.width  = pct + '%';
    if (miniLbl)  miniLbl.textContent   = pct + '%';

    // Milestone markers
    document.querySelectorAll('.milestone').forEach(m => {
      const lv = parseInt(m.dataset.level);
      const reached = lv <= 4
        ? (gs.completedLevels || []).includes(lv)
        : gs.gardenUnlocked;
      m.classList.toggle('reached', !!reached);
    });

    // Continue button — BUG-25: null guard
    const hasSave = (gs.completedLevels || []).length > 0;
    if (btnCont) btnCont.style.display = hasSave ? 'inline-block' : 'none';

    // Level cards
    this.refreshLevelCards();

    // Rain if night
    const isDark = gs.darkMode;
    generateRain('rainContainer', isDark);
  },

  /* ============================================
     REFRESH LEVEL CARDS
     ============================================ */
  refreshLevelCards() {
    const gs = this.gameState;
    const completed = gs.completedLevels || [];
    const stars     = gs.levelStars     || {};

    const starStr = n => ['☆☆☆','⭐☆☆','⭐⭐☆','⭐⭐⭐'][clamp(n, 0, 3)];

    for (let i = 1; i <= 4; i++) {
      const card      = document.getElementById(`levelCard${i}`);
      const statusEl  = document.getElementById(`levelStatus${i}`);
      const starsEl   = document.getElementById(`levelStars${i}`);
      if (!card) continue;

      const isCompleted = completed.includes(i);
      const isUnlocked  = i === 1 || completed.includes(i - 1);

      card.classList.toggle('locked',    !isUnlocked);
      card.classList.toggle('completed',  isCompleted);

      if (statusEl) {
        statusEl.textContent = !isUnlocked ? '🔒' : (isCompleted ? '✓ DONE' : 'PLAY');
        statusEl.style.background = isCompleted ? 'var(--accent-green)' : (!isUnlocked ? '#666' : 'var(--accent-orange)');
      }
      if (starsEl) starsEl.textContent = starStr(stars[i] || 0);
    }

    // Garden card
    const gardenCard = document.getElementById('levelCard5');
    const gardenConn = document.getElementById('gardenConnector');

    // BUG-12: set gardenUnlocked=true+save saat semua 4 level selesai
    if (completed.length === 4 && !gs.gardenUnlocked) {
      gs.gardenUnlocked = true;
      Storage.save(gs);
    }

    if (gs.gardenUnlocked) {
      if (gardenCard) {
        gardenCard.style.display = 'block';
        gardenCard.classList.remove('locked');
        const s5 = document.getElementById('levelStatus5');
        if (s5) s5.textContent = '🌸 OPEN';
      }
      if (gardenConn) gardenConn.style.display = 'block';
    } else if (completed.length === 4) {
      // fallback teaser (harusnya tidak tercapai setelah fix di atas)
      if (gardenCard) {
        gardenCard.style.display = 'block';
        gardenCard.classList.remove('locked');
        const s5 = document.getElementById('levelStatus5');
        if (s5) s5.textContent = '🌸 UNLOCK';
      }
      if (gardenConn) gardenConn.style.display = 'block';
    }
  },

  /* ============================================
     SAVE MIGRATION — patch save lama (BUG-09/24)
     Tambah fields baru yang belum ada di save lama
     ============================================ */
  migrateSave(gs) {
    let dirty = false;
    const ensure = (key, def) => {
      if (gs[key] === undefined || gs[key] === null) {
        gs[key] = def;
        dirty = true;
      }
    };

    ensure('itemsCollected',   []);
    ensure('chestsOpened',     0);
    ensure('defeatedMonsters', []);
    ensure('achievementDates', {});
    ensure('gardenUnlocked',   false);
    ensure('totalStars',       0);
    ensure('messagesCollected', 0);
    ensure('levelStars',       { 1: 0, 2: 0, 3: 0, 4: 0 });
    ensure('completedLevels',  []);
    ensure('darkMode',         false);
    ensure('currentLevel',     1);

    // levelStars bisa ada tapi kurang key
    [1,2,3,4].forEach(i => {
      if (gs.levelStars[i] === undefined) { gs.levelStars[i] = 0; dirty = true; }
    });

    if (dirty) {
      Storage.save(gs);
      console.info('[CampusQuest] Save migrated to latest version.');
    }
  },

  /* ============================================
     SPEECH BUBBLE ROTATION
     ============================================ */
  rotateSpeechBubble() {
    const el    = document.getElementById('homeSpeechText');
    const quotes = window.MESSAGES?.homeQuotes || ['Halo!'];
    if (!el) return;

    let idx = 0;
    const rotate = () => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      setTimeout(() => {
        el.textContent = quotes[idx % quotes.length];
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        el.style.opacity   = '1';
        el.style.transform = 'translateY(0)';
        idx++;
      }, 400);
    };

    // Initial
    el.textContent = quotes[0];
    idx = 1;

    setInterval(rotate, 5000);
  }
};

/* ============================================
   START
   ============================================ */
document.addEventListener('DOMContentLoaded', () => {
  window.AppState.init();
});
