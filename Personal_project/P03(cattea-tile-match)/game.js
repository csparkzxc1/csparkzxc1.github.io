// Cattea Clone — Triple Tile Match
// Week 1 integrated build: StageLoader + ProgressManager + Analytics.

(function () {
  'use strict';

  const { StageLoader, ProgressManager, Analytics } = (window.Cattea || {});
  if (!StageLoader || !ProgressManager || !Analytics) {
    throw new Error('game-integration.js must load before game.js');
  }

  // ---------- Config ----------
  const TILE_SIZE = 52;
  const SLOT_COUNT = 7;
  const TILE_KINDS = [
    { type: 'cat',    emoji: '🐱' },
    { type: 'fish',   emoji: '🐟' },
    { type: 'donut',  emoji: '🍩' },
    { type: 'milk',   emoji: '🥛' },
    { type: 'yarn',   emoji: '🧶' },
    { type: 'paw',    emoji: '🐾' },
    { type: 'bell',   emoji: '🔔' },
    { type: 'star',   emoji: '⭐' },
    { type: 'heart',  emoji: '💖' },
    { type: 'crown',  emoji: '👑' },
  ];

  // ---------- State ----------
  const state = {
    stageId: 1,
    stage: null,         // current stage config
    mode: 'normal',      // 'normal' | 'timeattack'
    timeLimit: 0,
    startTime: 0,
    timerHandle: null,
    score: 0,
    tiles: [],
    tray: [],
    history: [],
    busy: false,
    gameOver: false,
    boosters: { undo: 3, magnet: 2, shuffle: 2 },
    lastBoosterUsed: null,
  };

  // ---------- Elements ----------
  const appEl = document.getElementById('app');
  const stageSelectEl = document.getElementById('stage-select');
  const stageGridEl = document.getElementById('stage-grid');
  const ssCleared = document.getElementById('ss-cleared');
  const ssTotal = document.getElementById('ss-total');
  const ssScore = document.getElementById('ss-score');
  const ssUndo = document.getElementById('ss-undo');
  const ssMagnet = document.getElementById('ss-magnet');
  const ssShuffle = document.getElementById('ss-shuffle');
  const btnReset = document.getElementById('btn-reset');
  const btnBack = document.getElementById('btn-back');

  const boardEl = document.getElementById('board');
  const slotEls = Array.from(document.querySelectorAll('.slot'));
  const levelEl = document.getElementById('level');
  const scoreEl = document.getElementById('score');
  const remainingEl = document.getElementById('remaining');
  const remLabelEl = document.getElementById('rem-label');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayMsg = document.getElementById('overlay-msg');
  const overlayPrimary = document.getElementById('overlay-primary');
  const overlaySecondary = document.getElementById('overlay-secondary');
  const btnUndo = document.getElementById('btn-undo');
  const btnMagnet = document.getElementById('btn-magnet');
  const btnShuffle = document.getElementById('btn-shuffle');
  const countUndo = document.getElementById('count-undo');
  const countMagnet = document.getElementById('count-magnet');
  const countShuffle = document.getElementById('count-shuffle');

  // ---------- Utilities ----------
  const rand = (n) => Math.floor(Math.random() * n);
  const shuffleArr = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  let tileIdCounter = 0;

  function genTile(type, emoji, x, y, layer) {
    return { id: ++tileIdCounter, type, emoji, x, y, layer, el: null, inTray: false, cleared: false };
  }

  function boardRect() { return boardEl.getBoundingClientRect(); }

  function randomInBoard(layer) {
    const r = boardRect();
    const pad = 10;
    const jitter = layer * 8;
    const maxX = Math.max(pad, r.width - TILE_SIZE - pad);
    const maxY = Math.max(pad, r.height - TILE_SIZE - pad);
    const x = pad + Math.random() * (maxX - pad);
    const y = pad + Math.random() * (maxY - pad);
    return {
      x: x + (layer ? rand(jitter) - jitter / 2 : 0),
      y: y + (layer ? rand(jitter) - jitter / 2 : 0),
    };
  }

  // ---------- Boot ----------
  async function boot() {
    Analytics.init({ debug: true });
    ProgressManager.load();
    await StageLoader.load();
    const total = StageLoader.count();
    ssTotal.textContent = String(total);
    syncBoostersFromProgress();
    renderStageSelect();
    showStageSelect();
  }

  function syncBoostersFromProgress() {
    const d = ProgressManager.get();
    state.boosters = Object.assign({ undo: 3, magnet: 2, shuffle: 2 }, d.boosters);
  }

  function persistBoosters() {
    ProgressManager.setBoosters(state.boosters);
  }

  // ---------- Stage Select ----------
  function showStageSelect() {
    stopTimer();
    stageSelectEl.classList.remove('hidden');
    appEl.classList.add('hidden');
    renderStageSelect();
  }

  function showGame() {
    stageSelectEl.classList.add('hidden');
    appEl.classList.remove('hidden');
  }

  function renderStageSelect() {
    const d = ProgressManager.get();
    ssCleared.textContent = String(d.highestCleared);
    ssScore.textContent = String(d.totalScore);
    ssUndo.textContent = String(d.boosters.undo || 0);
    ssMagnet.textContent = String(d.boosters.magnet || 0);
    ssShuffle.textContent = String(d.boosters.shuffle || 0);

    stageGridEl.innerHTML = '';
    StageLoader.all().forEach((s) => {
      const unlocked = ProgressManager.isUnlocked(s.id);
      const cleared = s.id <= d.highestCleared;
      const isCurrent = unlocked && !cleared && s.id === (d.highestCleared + 1);
      const stars = d.stageStars[s.id] || 0;

      const card = document.createElement('button');
      card.className = 'stage-card';
      if (!unlocked) card.classList.add('locked');
      if (cleared) card.classList.add('cleared');
      if (isCurrent) card.classList.add('current');
      if (s.tag) card.classList.add(s.tag);
      card.setAttribute('role', 'listitem');
      card.setAttribute('aria-label', `Stage ${s.id} ${s.label}`);

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = String(s.id);

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = s.tag === 'timeattack' ? '⏱ TIME'
                       : s.tag === 'spike' ? '⚡ HARD'
                       : s.tag === 'relief' ? '🌿 EASY'
                       : s.tag === 'milestone' ? '🏆 BONUS'
                       : (s.tag || 'normal').toUpperCase();

      const starsEl = document.createElement('span');
      starsEl.className = 'stars';
      starsEl.textContent = stars > 0 ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';

      card.appendChild(num);
      card.appendChild(tag);
      card.appendChild(starsEl);

      if (unlocked) {
        card.addEventListener('click', () => startStage(s.id));
      }
      stageGridEl.appendChild(card);
    });
  }

  function startStage(id) {
    const stage = StageLoader.getStage(id);
    if (!stage) return;
    state.stageId = id;
    state.stage = stage;
    state.mode = stage.mode || 'normal';
    state.timeLimit = stage.timeLimit || 0;
    state.score = 0;
    ProgressManager.setCurrentStage(id);
    showGame();
    buildLevel();
    Analytics.stageStart(id, state.mode);
    startTimer();
  }

  // ---------- Level generation ----------
  function buildLevel() {
    state.tiles.forEach((t) => t.el && t.el.remove());
    state.tiles = [];
    state.tray = [];
    state.history = [];
    state.gameOver = false;
    state.busy = false;
    state.startTime = Date.now();

    const cfg = state.stage;
    const kinds = shuffleArr([...TILE_KINDS]).slice(0, Math.min(cfg.types, TILE_KINDS.length));

    const tilesToMake = [];
    kinds.forEach((k) => {
      for (let i = 0; i < cfg.sets; i++) {
        for (let j = 0; j < 3; j++) tilesToMake.push(k);
      }
    });
    shuffleArr(tilesToMake);

    const layers = Math.max(1, cfg.layers);
    const perLayer = Math.ceil(tilesToMake.length / layers);
    tilesToMake.forEach((k, i) => {
      const layer = Math.min(layers - 1, Math.floor(i / perLayer));
      const { x, y } = randomInBoard(layer);
      state.tiles.push(genTile(k.type, k.emoji, x, y, layer));
    });

    renderAll();
    updateHud();
    updateBlockers();
  }

  // ---------- Rendering ----------
  function renderAll() {
    slotEls.forEach((s) => { s.classList.remove('filled', 'warn'); s.textContent = ''; });
    state.tiles.forEach((t) => {
      if (t.cleared) return;
      if (!t.el) {
        const el = document.createElement('div');
        el.className = 'tile';
        el.textContent = t.emoji;
        el.dataset.id = String(t.id);
        el.style.width = TILE_SIZE + 'px';
        el.style.height = TILE_SIZE + 'px';
        el.addEventListener('click', () => onTileClick(t.id));
        boardEl.appendChild(el);
        t.el = el;
      }
      t.el.style.left = t.x + 'px';
      t.el.style.top = t.y + 'px';
      t.el.style.zIndex = String(10 + t.layer);
    });
    renderTray();
  }

  function renderTray() {
    slotEls.forEach((slot, i) => {
      slot.textContent = '';
      slot.classList.remove('filled');
      const tileId = state.tray[i];
      if (tileId != null) {
        const t = findTile(tileId);
        if (t) { slot.textContent = t.emoji; slot.classList.add('filled'); }
      }
    });
    const near = state.tray.length >= SLOT_COUNT - 1;
    slotEls.forEach((s) => s.classList.toggle('warn', near && !s.classList.contains('filled')));
  }

  function updateHud() {
    levelEl.textContent = String(state.stageId);
    scoreEl.textContent = String(state.score);

    if (state.mode === 'timeattack') {
      remLabelEl.textContent = 'TIME';
      const left = Math.max(0, state.timeLimit - Math.floor((Date.now() - state.startTime) / 1000));
      remainingEl.textContent = String(left);
      remainingEl.classList.toggle('timer', true);
      remainingEl.classList.toggle('warn', left <= 20 && left > 10);
      remainingEl.classList.toggle('danger', left <= 10);
    } else {
      remLabelEl.textContent = 'TILES';
      remainingEl.textContent = String(state.tiles.filter((t) => !t.cleared && !t.inTray).length);
      remainingEl.classList.remove('timer', 'warn', 'danger');
    }

    countUndo.textContent = state.boosters.undo;
    countMagnet.textContent = state.boosters.magnet;
    countShuffle.textContent = state.boosters.shuffle;
    btnUndo.disabled = state.boosters.undo <= 0 || state.history.length === 0 || state.busy;
    btnMagnet.disabled = state.boosters.magnet <= 0 || state.tray.length < 3 || state.busy;
    btnShuffle.disabled = state.boosters.shuffle <= 0 || state.busy;
  }

  // ---------- Blocking ----------
  function tilesOverlap(a, b) {
    return !(a.x + TILE_SIZE <= b.x || b.x + TILE_SIZE <= a.x ||
             a.y + TILE_SIZE <= b.y || b.y + TILE_SIZE <= a.y);
  }

  function isBlocked(tile) {
    if (tile.cleared || tile.inTray) return false;
    return state.tiles.some((o) =>
      o !== tile && !o.cleared && !o.inTray &&
      o.layer > tile.layer && tilesOverlap(o, tile));
  }

  function updateBlockers() {
    state.tiles.forEach((t) => {
      if (t.cleared || t.inTray || !t.el) return;
      t.el.classList.toggle('blocked', isBlocked(t));
    });
  }

  function findTile(id) { return state.tiles.find((t) => t.id === id); }

  // ---------- Interaction ----------
  function snapshot() {
    state.history.push({
      tiles: state.tiles.map((t) => ({ id: t.id, x: t.x, y: t.y, layer: t.layer, inTray: t.inTray, cleared: t.cleared })),
      tray: [...state.tray],
      score: state.score,
    });
    if (state.history.length > 20) state.history.shift();
  }

  function onTileClick(id) {
    if (state.busy || state.gameOver) return;
    const tile = findTile(id);
    if (!tile || tile.cleared || tile.inTray) return;
    if (isBlocked(tile)) return;
    if (state.tray.length >= SLOT_COUNT) return;
    snapshot();
    moveTileToTray(tile);
  }

  function moveTileToTray(tile) {
    state.busy = true;
    tile.inTray = true;

    const insertIdx = computeInsertIndex(tile.type);
    state.tray.splice(insertIdx, 0, tile.id);

    const slotEl = slotEls[insertIdx];
    const slotRect = slotEl.getBoundingClientRect();
    const boardR = boardRect();
    const targetX = slotRect.left - boardR.left + (slotRect.width - TILE_SIZE) / 2;
    const targetY = slotRect.top - boardR.top + (slotRect.height - TILE_SIZE) / 2;

    tile.el.classList.add('flying');
    tile.el.style.left = targetX + 'px';
    tile.el.style.top = targetY + 'px';
    tile.el.style.zIndex = '999';

    setTimeout(() => {
      if (tile.el) tile.el.remove();
      tile.el = null;
      renderTray();
      updateBlockers();
      updateHud();
      checkMatches();
    }, 320);
  }

  function computeInsertIndex(type) {
    for (let i = state.tray.length - 1; i >= 0; i--) {
      const t = findTile(state.tray[i]);
      if (t && t.type === type) return i + 1;
    }
    return state.tray.length;
  }

  function checkMatches() {
    const typeCounts = {};
    state.tray.forEach((id) => {
      const t = findTile(id);
      if (t) typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });

    let cleared = false;
    for (const type in typeCounts) {
      if (typeCounts[type] >= 3) {
        const ids = state.tray.filter((id) => findTile(id)?.type === type).slice(0, 3);
        clearTrayTiles(ids);
        cleared = true;
        break;
      }
    }
    if (!cleared) { state.busy = false; finishMoveCheck(); }
  }

  function clearTrayTiles(ids) {
    ids.forEach((id) => {
      const slotIdx = state.tray.indexOf(id);
      if (slotIdx >= 0) {
        const slotEl = slotEls[slotIdx];
        slotEl.classList.add('filled');
        const pop = document.createElement('div');
        pop.className = 'tile popping';
        pop.textContent = findTile(id)?.emoji || '';
        pop.style.position = 'absolute';
        pop.style.inset = '0';
        pop.style.width = '100%';
        pop.style.height = '100%';
        pop.style.fontSize = '28px';
        pop.style.display = 'flex';
        pop.style.alignItems = 'center';
        pop.style.justifyContent = 'center';
        pop.style.borderRadius = '10px';
        pop.style.background = '#fff';
        slotEl.appendChild(pop);
      }
    });

    setTimeout(() => {
      ids.forEach((id) => {
        const t = findTile(id);
        if (t) t.cleared = true;
      });
      state.tray = state.tray.filter((id) => !ids.includes(id));
      state.score += 30;
      renderTray();
      updateHud();
      checkMatches();
    }, 360);
  }

  function finishMoveCheck() {
    const remaining = state.tiles.filter((t) => !t.cleared && !t.inTray).length;
    const trayCount = state.tray.length;

    if (remaining === 0 && trayCount === 0) { win(); return; }
    if (trayCount >= SLOT_COUNT) {
      const counts = {};
      state.tray.forEach((id) => {
        const t = findTile(id);
        if (t) counts[t.type] = (counts[t.type] || 0) + 1;
      });
      const hasTriple = Object.values(counts).some((c) => c >= 3);
      if (!hasTriple) { lose('tray_full'); return; }
    }
    updateHud();
  }

  // ---------- Timer (timeattack) ----------
  function startTimer() {
    stopTimer();
    if (state.mode !== 'timeattack') return;
    state.timerHandle = setInterval(() => {
      if (state.gameOver) { stopTimer(); return; }
      const left = Math.max(0, state.timeLimit - Math.floor((Date.now() - state.startTime) / 1000));
      updateHud();
      if (left <= 0) { stopTimer(); lose('timeout'); }
    }, 250);
  }

  function stopTimer() {
    if (state.timerHandle) { clearInterval(state.timerHandle); state.timerHandle = null; }
  }

  // ---------- Win / Lose ----------
  function computeStars(timeSec) {
    const par = state.stage.par || 60;
    if (timeSec <= par * 0.75) return 3;
    if (timeSec <= par * 1.25) return 2;
    return 1;
  }

  function win() {
    state.gameOver = true;
    stopTimer();
    const timeSec = Math.floor((Date.now() - state.startTime) / 1000);
    const stars = computeStars(timeSec);
    const bonus = 100 + state.stageId * 20 + stars * 50;
    state.score += bonus;

    ProgressManager.recordClear(state.stageId, state.score, stars);
    if (state.stage.reward) {
      ProgressManager.addBoosters(state.stage.reward);
      syncBoostersFromProgress();
    } else {
      persistBoosters();
    }

    Analytics.stageClear(state.stageId, state.score, timeSec, stars);
    updateHud();

    const isLast = state.stageId >= StageLoader.count();
    const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    overlayTitle.textContent = isLast ? '🏆 All 30 Cleared!' : `⭐ Stage ${state.stageId} Clear`;
    const rewardMsg = state.stage.reward
      ? ` · +${Object.entries(state.stage.reward).map(([k, v]) => `${v} ${k}`).join(' / ')}`
      : '';
    overlayMsg.textContent = `${starStr} · Score ${state.score} · ${timeSec}s${rewardMsg}`;
    overlayPrimary.textContent = isLast ? 'Stage Select' : 'Next';
    overlaySecondary.textContent = 'Stage Select';
    overlayPrimary.onclick = () => {
      overlay.classList.add('hidden');
      if (isLast) showStageSelect();
      else startStage(state.stageId + 1);
    };
    overlaySecondary.onclick = () => { overlay.classList.add('hidden'); showStageSelect(); };
    overlay.classList.remove('hidden');
  }

  function lose(reason) {
    if (state.gameOver) return;
    state.gameOver = true;
    stopTimer();
    const timeSec = Math.floor((Date.now() - state.startTime) / 1000);
    Analytics.stageFail(state.stageId, reason || 'unknown', timeSec);
    persistBoosters();
    updateHud();
    overlayTitle.textContent = reason === 'timeout' ? '⏱ Time Up!' : '💔 Tray Full';
    overlayMsg.textContent = reason === 'timeout'
      ? 'Beat the clock next time!'
      : 'No 3-match available. Try again!';
    overlayPrimary.textContent = 'Retry';
    overlaySecondary.textContent = 'Stage Select';
    overlayPrimary.onclick = () => { overlay.classList.add('hidden'); startStage(state.stageId); };
    overlaySecondary.onclick = () => { overlay.classList.add('hidden'); showStageSelect(); };
    overlay.classList.remove('hidden');
  }

  // ---------- Boosters ----------
  function useUndo() {
    if (state.boosters.undo <= 0 || state.history.length === 0 || state.busy) return;
    const snap = state.history.pop();
    state.boosters.undo--;
    Analytics.boosterUse(state.stageId, 'undo');

    snap.tiles.forEach((s) => {
      const t = findTile(s.id);
      if (!t) return;
      t.x = s.x; t.y = s.y; t.layer = s.layer;
      t.inTray = s.inTray; t.cleared = s.cleared;
    });
    state.tray = [...snap.tray];
    state.score = snap.score;

    state.tiles.forEach((t) => { if (t.el) { t.el.remove(); t.el = null; } });
    renderAll();
    updateBlockers();
    updateHud();
    persistBoosters();
  }

  function useMagnet() {
    if (state.boosters.magnet <= 0 || state.tray.length < 3 || state.busy) return;
    snapshot();
    state.boosters.magnet--;
    Analytics.boosterUse(state.stageId, 'magnet');

    const returned = state.tray.splice(-3, 3);
    returned.forEach((id) => {
      const t = findTile(id);
      if (!t) return;
      t.inTray = false;
      const { x, y } = randomInBoard(t.layer);
      t.x = x; t.y = y;
      if (!t.el) {
        const el = document.createElement('div');
        el.className = 'tile';
        el.textContent = t.emoji;
        el.style.width = TILE_SIZE + 'px';
        el.style.height = TILE_SIZE + 'px';
        el.addEventListener('click', () => onTileClick(t.id));
        boardEl.appendChild(el);
        t.el = el;
      }
      t.el.style.left = t.x + 'px';
      t.el.style.top = t.y + 'px';
      t.el.style.zIndex = String(10 + t.layer);
    });
    renderTray();
    updateBlockers();
    updateHud();
    persistBoosters();
  }

  function useShuffle() {
    if (state.boosters.shuffle <= 0 || state.busy) return;
    snapshot();
    state.boosters.shuffle--;
    Analytics.boosterUse(state.stageId, 'shuffle');

    const active = state.tiles.filter((t) => !t.cleared && !t.inTray);
    active.forEach((t) => {
      const { x, y } = randomInBoard(t.layer);
      t.x = x; t.y = y;
      if (t.el) {
        t.el.style.left = t.x + 'px';
        t.el.style.top = t.y + 'px';
      }
    });
    updateBlockers();
    updateHud();
    persistBoosters();
  }

  // ---------- Wiring ----------
  btnUndo.addEventListener('click', useUndo);
  btnMagnet.addEventListener('click', useMagnet);
  btnShuffle.addEventListener('click', useShuffle);

  btnBack.addEventListener('click', () => {
    if (!state.gameOver && state.tiles.length > 0) {
      Analytics.stageFail(state.stageId, 'quit', Math.floor((Date.now() - state.startTime) / 1000));
    }
    persistBoosters();
    showStageSelect();
  });

  btnReset.addEventListener('click', () => {
    if (confirm('Reset all progress?')) {
      ProgressManager.reset();
      syncBoostersFromProgress();
      renderStageSelect();
    }
  });

  window.addEventListener('resize', () => {
    const r = boardRect();
    state.tiles.forEach((t) => {
      if (t.cleared || t.inTray || !t.el) return;
      t.x = Math.min(t.x, r.width - TILE_SIZE - 4);
      t.y = Math.min(t.y, r.height - TILE_SIZE - 4);
      t.el.style.left = t.x + 'px';
      t.el.style.top = t.y + 'px';
    });
    updateBlockers();
  });

  // Kick off
  boot().catch((err) => {
    console.error('[Cattea] boot failed', err);
    overlayTitle.textContent = 'Failed to load';
    overlayMsg.textContent = err.message || String(err);
    overlay.classList.remove('hidden');
  });
})();
