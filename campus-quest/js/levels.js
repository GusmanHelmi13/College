/* ============================================
   CAMPUS QUEST - LEVELS.JS
   Level data, items, monsters, platforms
   ============================================ */

'use strict';

const LevelData = (() => {

  /* ============================================
     SHARED HELPERS
     ============================================ */
  function platform(x, y, w, type = 'grass') {
    return { x, y, w, h: 16, type };
  }
  function item(x, y, type, id) {
    return { x, y, w: 28, h: 28, type, id, collected: false };
  }
  function monster(x, y, type, id, hp = 3) {
    return { x, y, w: 36, h: 36, type, id, hp, maxHp: hp, alive: true,
             vx: -1, patrolMin: 0, patrolMax: 0, hits: 0 };
  }
  function chest(x, y, id, keyId = null) {
    // keyId: id item kunci yang harus dikumpulkan dulu. null = bisa langsung dibuka.
    return { x, y, w: 40, h: 32, id, opened: false, keyId, locked: keyId !== null, _shake: 0 };
  }
  function portal(x, y) {
    return { x, y, w: 40, h: 60 };
  }
  function sign(x, y, text) {
    return { x, y, w: 28, h: 32, text };
  }

  /* ============================================
     LEVEL 1 — MORNING CAMPUS
     ============================================ */
  const LEVEL_1 = {
    id: 1,
    name: 'Morning Campus',
    subtitle: 'Level 1 — Mulai hari baru di kampus',
    bgClass: 'bg-morning',
    bgColors: { sky: '#87CEEB', ground: '#7BC67E', accent: '#ffd43b' },
    music: 'morning',
    width: 2800,
    height: 480,
    groundY: 400,

    platforms: [
      platform(0,   400, 400, 'grass'),
      platform(420, 340, 120, 'grass'),
      platform(580, 280, 100, 'brick'),
      platform(720, 400, 260, 'grass'),
      platform(1000,320, 140, 'grass'),
      platform(1180,400, 400, 'grass'),
      platform(1200,250, 80,  'brick'),
      platform(1620,340, 100, 'grass'),
      platform(1760,260, 120, 'brick'),
      platform(1900,400, 500, 'grass'),
      platform(2440,320, 160, 'grass'),
      platform(2640,400, 160, 'grass'),
    ],

    items: [
      item(180, 360, 'coffee',   'coffee'),
      item(600, 240, 'notebook', 'notebook'),
      item(850, 300, 'key',      'key_chest1'),   // kunci untuk chest1
      item(1220, 210,'star',     'star1'),
      item(1780, 220,'star',     'star2'),
      item(2460, 280,'star',     'star3'),
    ],

    monsters: [],

    chests: [
      chest(1040, 280, 'chest1', 'key_chest1'),   // butuh key_chest1
    ],

    signs: [
      sign(80, 368, 'Mulai perjalananmu! →'),
      sign(700, 368, '→ Menuju kampus!'),
      sign(2600, 368, 'Gerbang kampus →'),
    ],

    portal: portal(2760, 340),

    // Decorative elements
    decos: [
      { type: 'tree',   x: 300,  y: 320 },
      { type: 'tree',   x: 860,  y: 320 },
      { type: 'tree',   x: 1500, y: 320 },
      { type: 'cloud',  x: 200,  y: 80  },
      { type: 'cloud',  x: 700,  y: 60  },
      { type: 'cloud',  x: 1300, y: 90  },
      { type: 'cloud',  x: 2000, y: 70  },
      { type: 'building',x: 2200,y: 200 },
    ],

    // Events triggered at specific x positions
    triggers: [
      { id: 'coffee',   type: 'item',    itemId: 'coffee',   msg: 'level1.coffeePickup' },
      { id: 'notebook', type: 'item',    itemId: 'notebook', msg: 'level1.notebookPickup' },
      { id: 'gate',     type: 'position',x: 2680,            msg: 'level1.reachGate',    once: true },
    ],

    completeMsg: 'level1.complete',
    rewards: [
      { icon: '⭐', label: 'Confidence Star', type: 'star' },
      { icon: '☕', label: 'Energy Coffee',   type: 'coffee' }
    ],
    starsFor: { items: 3, noHurt: true, time: 120 }
  };

  /* ============================================
     LEVEL 2 — LIBRARY CHALLENGE
     ============================================ */
  const LEVEL_2 = {
    id: 2,
    name: 'Library Challenge',
    subtitle: 'Level 2 — Kumpulkan semua buku!',
    bgClass: 'bg-library',
    bgColors: { sky: '#3d2c1e', ground: '#8B7355', accent: '#74c0fc' },
    music: 'library',
    width: 2600,
    height: 480,
    groundY: 400,

    platforms: [
      platform(0,   400, 300, 'brick'),
      platform(340, 320, 100, 'brick'),
      platform(480, 240, 120, 'brick'),
      platform(640, 320, 100, 'brick'),
      platform(780, 400, 200, 'brick'),
      platform(1020,320, 140, 'brick'),
      platform(1200,240, 120, 'brick'),
      platform(1360,160, 100, 'brick'),
      platform(1500,240, 120, 'brick'),
      platform(1640,320, 100, 'brick'),
      platform(1780,400, 200, 'brick'),
      platform(2020,320, 140, 'brick'),
      platform(2200,240, 120, 'brick'),
      platform(2380,400, 220, 'brick'),
    ],

    items: [
      item(360, 280, 'book',   'book1'),
      item(500, 200, 'key',    'key_chest1'),    // kunci chest1 — SEBELUM chest di x=640
      item(560, 200, 'star',   'star1'),
      item(780, 360, 'book',   'book2'),          // buku dipindah agar star tidak tumpuk kunci
      item(1040,280, 'star',   'star2'),
      item(1380,120, 'key',    'key_chest2'),     // kunci chest2 — sebelum chest di x=1640
      item(1560, 300,'book',   'book3'),
      item(2040,280, 'star',   'star3'),
      item(2220,200, 'star',   'star4'),
    ],

    monsters: [
      { ...monster(700, 364, 'patrol', 'mon1', 2), patrolMin: 640, patrolMax: 760 },
      { ...monster(1300, 364, 'patrol', 'mon2', 2), patrolMin: 1200, patrolMax: 1420 },
      { ...monster(1900, 364, 'patrol', 'mon3', 2), patrolMin: 1780, patrolMax: 2000 },
    ],

    chests: [
      chest(640, 280, 'chest1', 'key_chest1'),
      chest(1640, 280, 'chest2', 'key_chest2'),
    ],

    signs: [
      sign(60, 368, '📚 Kumpulkan semua buku!'),
      sign(1780, 368, '→ Hampir sampai!'),
    ],

    portal: portal(2540, 340),

    decos: [
      { type: 'bookshelf', x: 100, y: 280 },
      { type: 'bookshelf', x: 900, y: 280 },
      { type: 'bookshelf', x: 1700, y: 280 },
      { type: 'lamp', x: 450, y: 300 },
      { type: 'lamp', x: 1250, y: 300 },
    ],

    triggers: [
      { id: 'book1', type: 'item', itemId: 'book1', msg: 'level2.book1Pickup' },
      { id: 'book2', type: 'item', itemId: 'book2', msg: 'level2.book2Pickup' },
    ],

    completeMsg: 'level2.complete',
    rewards: [
      { icon: '📖', label: 'Knowledge Book', type: 'book' },
      { icon: '⭐', label: 'Confidence Star', type: 'star' }
    ],
    starsFor: { items: 6, noHurt: true, time: 150 }
  };

  /* ============================================
     LEVEL 3 — ASSIGNMENT DUNGEON
     ============================================ */
  const LEVEL_3 = {
    id: 3,
    name: 'Assignment Dungeon',
    subtitle: 'Level 3 — Hadapi deadline monster!',
    bgClass: 'bg-dungeon',
    bgColors: { sky: '#1a0a2e', ground: '#2a1a4e', accent: '#cc5de8' },
    music: 'dungeon',
    width: 3000,
    height: 480,
    groundY: 400,

    platforms: [
      platform(0,   400, 200, 'brick'),
      platform(240, 340, 100, 'brick'),
      platform(380, 260, 120, 'brick'),
      platform(540, 340, 100, 'brick'),
      platform(680, 400, 200, 'brick'),
      platform(920, 320, 160, 'brick'),
      platform(1120,240, 120, 'brick'),
      platform(1280,320, 160, 'brick'),
      platform(1480,400, 200, 'brick'),
      platform(1720,320, 120, 'brick'),
      platform(1880,240, 100, 'brick'),
      platform(2020,320, 160, 'brick'),
      platform(2220,400, 200, 'brick'),
      platform(2460,320, 140, 'brick'),
      platform(2640,240, 120, 'brick'),
      platform(2800,400, 200, 'brick'),
    ],

    items: [
      item(260,  300, 'star',  'star1'),
      item(400,  220, 'key',   'key_chest1'),    // kunci chest1 di platform pertama
      item(1140, 200, 'star',  'star3'),
      item(1400, 360, 'key',   'key_chest2'),    // kunci chest2
      item(1900, 200, 'star',  'star4'),
      item(2660, 200, 'star',  'star5'),
    ],

    monsters: [
      { ...monster(550, 364, 'overthinking', 'overthinking', 4),
        patrolMin: 480, patrolMax: 660, vx: -1.2 },
      { ...monster(940, 284, 'deadline',     'deadline1',    3),
        patrolMin: 920, patrolMax: 1060, vx: -1.5 },
      { ...monster(1500, 364, 'deadline',    'deadline2',    3),
        patrolMin: 1480, patrolMax: 1660, vx: -1.5 },
      { ...monster(2240, 364, 'deadline',    'deadline3',    3),
        patrolMin: 2220, patrolMax: 2400, vx: -1.5 },
    ],

    chests: [
      chest(1300, 280, 'chest1', 'key_chest1'),
      chest(2480, 280, 'chest2', 'key_chest2'),
    ],

    signs: [
      sign(60,  368, '⚠️ Berhati-hatilah!'),
      sign(1480, 368, '→ Hampir sampai!'),
      sign(2800, 368, '→ Portal di depan!'),
    ],

    portal: portal(2960, 340),

    decos: [
      { type: 'skull', x: 320, y: 360 },
      { type: 'skull', x: 800, y: 360 },
      { type: 'skull', x: 1700, y: 360 },
      { type: 'torch', x: 200, y: 300 },
      { type: 'torch', x: 700, y: 300 },
      { type: 'torch', x: 1200, y: 300 },
      { type: 'torch', x: 1800, y: 300 },
      { type: 'torch', x: 2400, y: 300 },
    ],

    triggers: [
      { id: 'overthinking', type: 'monster', monsterId: 'overthinking', msg: 'level3.defeatOverthinking' },
      { id: 'chest1',       type: 'chest',   chestId: 'chest1',         msg: 'level3.openChest' },
    ],

    completeMsg: 'level3.complete',
    rewards: [
      { icon: '⭐', label: 'Confidence Star', type: 'star' },
      { icon: '☕', label: 'Energy Coffee',   type: 'coffee' },
      { icon: '📖', label: 'Knowledge Book', type: 'book' }
    ],
    starsFor: { items: 5, noHurt: false, time: 180 }
  };

  /* ============================================
     LEVEL 4 — EXAM CASTLE
     ============================================ */
  const LEVEL_4 = {
    id: 4,
    name: 'Exam Castle',
    subtitle: 'Level 4 — Hadapi ujian terakhir!',
    bgClass: 'bg-castle',
    bgColors: { sky: '#0d0d1a', ground: '#1a1a3e', accent: '#ffd43b' },
    music: 'castle',
    width: 3200,
    height: 480,
    groundY: 400,

    platforms: [
      platform(0,   400, 200, 'brick'),
      platform(240, 320, 120, 'brick'),
      platform(400, 240, 100, 'brick'),
      platform(540, 160, 120, 'brick'),
      platform(700, 240, 100, 'brick'),
      platform(840, 320, 140, 'brick'),
      platform(1020,400, 160, 'brick'),
      platform(1220,320, 120, 'brick'),
      platform(1380,240, 100, 'brick'),
      platform(1520,160, 120, 'brick'),
      platform(1680,240, 100, 'brick'),
      platform(1820,320, 140, 'brick'),
      platform(2000,400, 160, 'brick'),
      platform(2200,320, 120, 'brick'),
      platform(2360,240, 100, 'brick'),
      platform(2500,160, 120, 'brick'),
      platform(2660,240, 100, 'brick'),
      platform(2800,320, 200, 'brick'),
      // Boss arena
      platform(3000,380, 200, 'brick'),
    ],

    items: [
      item(260,  280, 'star', 'star1'),
      item(420,  200, 'key',  'key_chest1'),    // kunci chest1
      item(560,  120, 'star', 'star3'),
      item(900,  300, 'key',  'key_chest2'),    // kunci chest2
      item(1240, 280, 'star', 'star4'),
      item(1540, 120, 'star', 'star5'),
      item(2220, 280, 'star', 'star6'),
      item(2300, 200, 'key',  'key_chest3'),    // kunci chest3 — pindah ke x=2300 (sebelum patrol guard3 2360-2460)
      item(2520, 120, 'star', 'star7'),
    ],

    monsters: [
      { ...monster(560, 364, 'guardian', 'guard1', 3),
        patrolMin: 540, patrolMax: 640, vx: -1.5 },
      { ...monster(1400, 364, 'guardian', 'guard2', 3),
        patrolMin: 1380, patrolMax: 1480, vx: -1.5 },
      { ...monster(2380, 364, 'guardian', 'guard3', 3),
        patrolMin: 2360, patrolMax: 2460, vx: -1.5 },
      // BOSS
      { ...monster(3060, 344, 'boss', 'boss', 10),
        patrolMin: 3010, patrolMax: 3180, vx: -2,
        isBoss: true, phase: 1 },
    ],

    chests: [
      chest(860,  284, 'chest1', 'key_chest1'),
      chest(1840, 284, 'chest2', 'key_chest2'),
      chest(2820, 284, 'chest3', 'key_chest3'),
    ],

    signs: [
      sign(60,  368, '🏰 Kastil Ujian Terakhir!'),
      sign(1020, 368, '→ Terus maju!'),
      sign(2800, 368, '⚠️ BOSS di depan!'),
    ],

    portal: portal(3170, 316),

    decos: [
      { type: 'castle_bg', x: 2800, y: 0 },
      { type: 'torch', x: 200, y: 280 },
      { type: 'torch', x: 700, y: 200 },
      { type: 'torch', x: 1300, y: 280 },
      { type: 'torch', x: 1900, y: 280 },
      { type: 'torch', x: 2500, y: 200 },
      { type: 'torch', x: 2900, y: 280 },
      { type: 'flag', x: 100, y: 280 },
      { type: 'flag', x: 2950, y: 280 },
    ],

    triggers: [
      { id: 'obstacle1', type: 'position', x: 560,  msg: 'level4.passObstacle', once: true },
      { id: 'obstacle2', type: 'position', x: 1540, msg: 'level4.passObstacle', once: true },
      { id: 'boss',      type: 'monster',  monsterId: 'boss', msg: 'level4.defeatBoss' },
    ],

    completeMsg: 'level4.complete',
    rewards: [
      { icon: '🎓', label: 'Graduation Medal', type: 'medal' },
      { icon: '⭐', label: 'Confidence Star',  type: 'star' },
      { icon: '📖', label: 'Knowledge Book',   type: 'book' },
      { icon: '☕', label: 'Energy Coffee',    type: 'coffee' }
    ],
    starsFor: { items: 7, noHurt: false, time: 240 }
  };

  /* ---------- GET LEVEL ---------- */
  function get(id) {
    const map = { 1: LEVEL_1, 2: LEVEL_2, 3: LEVEL_3, 4: LEVEL_4 };
    const def = map[id];
    if (!def) return null;
    // Deep clone to reset state on each play
    return JSON.parse(JSON.stringify(def));
  }

  /* ---------- CALCULATE STARS ---------- */
  function calcStars(levelId, stats) {
    const def = { 1: LEVEL_1, 2: LEVEL_2, 3: LEVEL_3, 4: LEVEL_4 }[levelId];
    if (!def) return 1;

    let stars = 1; // base: completed

    const allItems = def.items.length;
    const itemPct  = allItems > 0 ? stats.itemsGot / allItems : 1;
    if (itemPct >= 0.8)   stars = Math.max(stars, 2);
    if (itemPct >= 1 && (!def.starsFor.noHurt || stats.noHurt))
      stars = 3;

    return clamp(stars, 1, 3);
  }

  /* ---------- RESOLVE MESSAGE KEY ---------- */
  function resolveMsg(key) {
    const parts = key.split('.');
    let obj = window.MESSAGES;
    for (const p of parts) { if (obj) obj = obj[p]; }
    return obj || key;
  }

  return { get, calcStars, resolveMsg };
})();

window.LevelData = LevelData;
