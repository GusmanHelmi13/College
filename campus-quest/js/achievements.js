/* ============================================
   CAMPUS QUEST - ACHIEVEMENTS.JS
   Growtopia-style achievement system
   ============================================ */

'use strict';

const Achievements = (() => {

  /* ---------- ACHIEVEMENT DEFINITIONS ---------- */
  const DEFS = [
    {
      id: 'first_step',
      icon: '👟',
      name: 'First Step',
      desc: 'Mulai bermain untuk pertama kalinya',
      condition: s => s.completedLevels.length >= 0,
      secret: false
    },
    {
      id: 'coffee_lover',
      icon: '☕',
      name: 'Coffee Addict',
      desc: 'Ambil Coffee Energy di Level 1',
      condition: s => (s.itemsCollected || []).includes('coffee'),
      secret: false
    },
    {
      id: 'bookworm',
      icon: '📚',
      name: 'Bookworm',
      desc: 'Kumpulkan semua buku di Library',
      condition: s => (s.itemsCollected || []).includes('book2'),
      secret: false
    },
    {
      id: 'campus_arrived',
      icon: '🏫',
      name: 'Campus Explorer',
      desc: 'Capai gerbang kampus di Level 1',
      condition: s => (s.itemsCollected || []).includes('gate'),
      secret: false
    },
    {
      id: 'dungeon_hero',
      icon: '⚔️',
      name: 'Dungeon Hero',
      desc: 'Kalahkan Overthinking di Dungeon',
      condition: s => (s.defeatedMonsters || []).includes('overthinking'),
      secret: false
    },
    {
      id: 'chest_opener',
      icon: '🎁',
      name: 'Treasure Hunter',
      desc: 'Buka peti harta untuk pertama kalinya',
      condition: s => (s.chestsOpened || 0) >= 1,
      secret: false
    },
    {
      id: 'level1_complete',
      icon: '🌅',
      name: 'Good Morning!',
      desc: 'Selesaikan Level 1 - Morning Campus',
      condition: s => s.completedLevels.includes(1),
      secret: false
    },
    {
      id: 'level2_complete',
      icon: '📖',
      name: 'Scholar',
      desc: 'Selesaikan Level 2 - Library Challenge',
      condition: s => s.completedLevels.includes(2),
      secret: false
    },
    {
      id: 'level3_complete',
      icon: '💀',
      name: 'Deadline Slayer',
      desc: 'Selesaikan Level 3 - Assignment Dungeon',
      condition: s => s.completedLevels.includes(3),
      secret: false
    },
    {
      id: 'level4_complete',
      icon: '🎓',
      name: 'Exam Champion',
      desc: 'Selesaikan Level 4 - Exam Castle',
      condition: s => s.completedLevels.includes(4),
      secret: false
    },
    {
      id: 'boss_slayer',
      icon: '👑',
      name: 'Boss Slayer',
      desc: 'Kalahkan boss terakhir di Exam Castle',
      condition: s => (s.defeatedMonsters || []).includes('boss'),
      secret: false
    },
    {
      id: 'all_levels',
      icon: '🌟',
      name: 'True Champion',
      desc: 'Selesaikan semua 4 level utama',
      condition: s =>
        s.completedLevels.includes(1) &&
        s.completedLevels.includes(2) &&
        s.completedLevels.includes(3) &&
        s.completedLevels.includes(4),
      secret: false
    },
    {
      id: 'garden_found',
      icon: '🌸',
      name: 'Secret Garden',
      desc: 'Temukan Memory Garden yang tersembunyi',
      condition: s => s.gardenUnlocked === true,
      secret: true
    },
    {
      id: 'star_collector',
      icon: '⭐',
      name: 'Star Collector',
      desc: 'Kumpulkan total 10 bintang',
      condition: s => (s.totalStars || 0) >= 10,
      secret: false
    },
    {
      id: 'perfectionist',
      icon: '💎',
      name: 'Perfectionist',
      desc: 'Raih 3 bintang di semua level',
      condition: s =>
        s.levelStars &&
        s.levelStars[1] === 3 &&
        s.levelStars[2] === 3 &&
        s.levelStars[3] === 3 &&
        s.levelStars[4] === 3,
      secret: false
    },
    {
      id: 'message_collector',
      icon: '💌',
      name: 'Message Collector',
      desc: 'Baca 10 pesan penyemangat',
      condition: s => (s.messagesCollected || 0) >= 10,
      secret: false
    }
  ];

  let unlockedIds = new Set();
  let gameState   = null;
  let popupQueue  = [];
  let isShowingPopup = false;

  /* ---------- INIT ---------- */
  function init(state) {
    gameState = state;
    unlockedIds = new Set(state.achievements || []);
    renderGrid();
    updateProgressBar();
  }

  /* ---------- CHECK ALL ---------- */
  function checkAll(state) {
    gameState = state;
    DEFS.forEach(def => {
      if (!unlockedIds.has(def.id) && def.condition(state)) {
        unlock(def.id);
      }
    });
  }

  /* ---------- UNLOCK ---------- */
  function unlock(id) {
    if (unlockedIds.has(id)) return;
    const def = DEFS.find(d => d.id === id);
    if (!def) return;

    unlockedIds.add(id);
    if (gameState) {
      gameState.achievements = [...unlockedIds];
      Storage.save(gameState);
    }

    popupQueue.push(def);
    if (!isShowingPopup) showNextPopup();
    renderGrid();
    updateProgressBar();

    // Spawn hearts
    FloatingHearts.spawn(window.innerWidth / 2, window.innerHeight / 2);
    ParticleSystem.starBurst(window.innerWidth / 2, window.innerHeight * 0.8);

    // Toast
    const msgs = window.MESSAGES?.achievementMessages;
    if (msgs && msgs[id.replace(/_/g, '')]) {
      Toast.show(msgs[id.replace(/_/g, '')], 4000, def.icon);
    }
  }

  /* ---------- POPUP QUEUE ---------- */
  function showNextPopup() {
    if (popupQueue.length === 0) { isShowingPopup = false; return; }
    isShowingPopup = true;
    const def = popupQueue.shift();
    const popup = document.getElementById('achievementPopup');
    if (!popup) return;

    document.getElementById('achPopupIcon').textContent = def.icon;
    document.getElementById('achPopupName').textContent = def.name;
    popup.style.display = 'flex';
    setTimeout(() => popup.classList.add('show'), 50);
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => {
        popup.style.display = 'none';
        showNextPopup();
      }, 600);
    }, 3200);
  }

  /* ---------- RENDER GRID ---------- */
  function renderGrid() {
    const grid = document.getElementById('achievementsGrid');
    if (!grid) return;

    const total    = DEFS.length;
    const unlocked = unlockedIds.size;
    const el_u     = document.getElementById('achUnlocked');
    const el_t     = document.getElementById('achTotal');
    if (el_u) el_u.textContent = unlocked;
    if (el_t) el_t.textContent = total;

    grid.innerHTML = DEFS.map(def => {
      const done = unlockedIds.has(def.id);
      const date = done && gameState?.achievementDates?.[def.id]
        ? new Date(gameState.achievementDates[def.id]).toLocaleDateString('id-ID')
        : '';
      return `
        <div class="ach-card ${done ? 'unlocked' : 'locked'}"
             data-id="${def.id}"
             title="${done ? def.desc : (def.secret ? '???' : def.desc)}">
          <div class="ach-icon">${done ? def.icon : (def.secret ? '🔒' : def.icon)}</div>
          <div class="ach-name">${done ? def.name : (def.secret ? '???' : def.name)}</div>
          <div class="ach-desc">${done ? def.desc : (def.secret ? 'Achievement tersembunyi' : def.desc)}</div>
          ${date ? `<div class="ach-date">✓ ${date}</div>` : ''}
        </div>`;
    }).join('');

    // Click for affirmation on unlocked
    grid.querySelectorAll('.ach-card.unlocked').forEach(card => {
      card.addEventListener('click', () => {
        const msgs = window.MESSAGES?.affirmations;
        if (msgs) Toast.show(randomFrom(msgs), 3500, '💖');
        const rect = card.getBoundingClientRect();
        ParticleSystem.starBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        FloatingHearts.spawn(rect.left + rect.width / 2, rect.top);
      });
    });
  }

  /* ---------- PROGRESS BAR ---------- */
  function updateProgressBar() {
    const fill = document.getElementById('achProgressFill');
    if (!fill) return;
    const pct = DEFS.length > 0 ? (unlockedIds.size / DEFS.length) * 100 : 0;
    fill.style.width = pct + '%';
  }

  /* ---------- GET UNLOCKED COUNT ---------- */
  function getCount() { return unlockedIds.size; }
  function getTotal()  { return DEFS.length; }

  return { init, checkAll, unlock, getCount, getTotal, DEFS };
})();

window.Achievements = Achievements;
