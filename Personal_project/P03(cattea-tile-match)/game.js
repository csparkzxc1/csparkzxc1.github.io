// Cattea Clone — Triple Tile Match Prototype
// Web MVP with layered tile stack + 7-slot tray + boosters.

(function () {
  'use strict';

  // ---------- Config ----------
  const TILE_SIZE = 52;
  const SLOT_COUNT = 7;
  const LEVELS = [
    { types: 4,  sets: 4,  layers: 2, label: 1 },
    { types: 5,  sets: 5,  layers: 2, label: 2 },
    { types: 6,  sets: 6,  layers: 3, label: 3 },
    { types: 7,  sets: 7,  layers: 3, label: 4 },
    { types: 8,  sets: 8,  layers: 4, label: 5 },
  ];
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
    levelIdx: 0,
    score: 0,
    tiles: [],        // { id, type, emoji, x, y, layer, el, inTray, cleared }
    tray: [],         // tile ids (in order)
    history: [],      // snapshots for undo
    busy: false,
    gameOver: false,
    boosters: { undo: 3, magnet: 2, shuffle: 2 },
  };

  // ---------- Elements ----------
  const boardEl = document.getElementById('board');
  const trayEl = document.querySelector('.tray');
  const slotEls = Array.from(document.querySelectorAll('.slot'));
  const levelEl = document.getElementById('level');
  const scoreEl = document.getElementById('score');
  const remainingEl = document.getElementById('remaining');
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
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = rand(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  let tileIdCounter = 0;

  function genTile(type, emoji, x, y, layer) {
    return {
      id: ++tileIdCounter,
      type,
      emoji,
      x, y, layer,
      el: null,
      inTray: false,
      cleared: false,
    };
  }

  function boardRect() {
    return boardEl.getBoundingClientRect();
  }

  function randomInBoard(layer) {
    const r = boardRect();
    // Inset padding so tiles don't clip edges
    const pad = 10;
    const jitter = layer * 8; // small offset per layer for readability
    const maxX = Math.max(pad, r.width - TILE_SIZE - pad);
    const maxY = Math.max(pad, r.height - TILE_SIZE - pad);
    const x = pad + Math.random() * (maxX - pad);
    const y = pad + Math.random() * (maxY - pad);
    return { x: x + (layer ? rand(jitter) - jitter / 2 : 0), y: y + (layer ? rand(jitter) - jitter / 2 : 0) };
  }

  // ---------- Level generation ----------
  function buildLevel() {
    // Clear prior tiles
    state.tiles.forEach((t) => t.el && t.el.remove());
    state.tiles = [];
    state.tray = [];
    state.history = [];
    state.gameOver = false;
    state.busy = false;

    const cfg = LEVELS[state.levelIdx] || LEVELS[LEVELS.length - 1];
    const kinds = shuffle([...TILE_KINDS]).slice(0, cfg.types);

    // Each type needs multiples of 3 (sets of 3)
    const tilesToMake = [];
    kinds.forEach((k) => {
      for (let i = 0; i < cfg.sets; i++) {
        for (let j = 0; j < 3; j++) {
          tilesToMake.push(k);
        }
      }
    });
    shuffle(tilesToMake);

    // Distribute across layers (higher layers sit on top)
    const perLayer = Math.ceil(tilesToMake.length / cfg.layers);
    tilesToMake.forEach((k, i) => {
      const layer = Math.min(cfg.layers - 1, Math.floor(i / perLayer));
      const { x, y } = randomInBoard(layer);
      const tile = genTile(k.type, k.emoji, x, y, layer);
      state.tiles.push(tile);
    });

    renderAll();
    updateHud();
    updateBlockers();
  }

  // ---------- Rendering ----------
  function renderAll() {
    // Clear stale slot contents
    slotEls.forEach((s) => {
      s.classList.remove('filled', 'warn');
      s.textContent = '';
    });
    // Render tiles
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
        if (t) {
          slot.textContent = t.emoji;
          slot.classList.add('filled');
        }
      }
    });
    // Warn state when tray is near full
    const near = state.tray.length >= SLOT_COUNT - 1;
    slotEls.forEach((s) => s.classList.toggle('warn', near && !s.classList.contains('filled')));
  }

  function updateHud() {
    levelEl.textContent = String(LEVELS[state.levelIdx]?.label ?? state.levelIdx + 1);
    scoreEl.textContent = String(state.score);
    remainingEl.textContent = String(state.tiles.filter((t) => !t.cleared && !t.inTray).length);
    countUndo.textContent = state.boosters.undo;
    countMagnet.textContent = state.boosters.magnet;
    countShuffle.textContent = state.boosters.shuffle;
    btnUndo.disabled = state.boosters.undo <= 0 || state.history.length === 0 || state.busy;
    btnMagnet.disabled = state.boosters.magnet <= 0 || state.tray.length < 3 || state.busy;
    btnShuffle.disabled = state.boosters.shuffle <= 0 || state.busy;
  }

  // ---------- Blocking logic ----------
  function tilesOverlap(a, b) {
    return !(a.x + TILE_SIZE <= b.x ||
             b.x + TILE_SIZE <= a.x ||
             a.y + TILE_SIZE <= b.y ||
             b.y + TILE_SIZE <= a.y);
  }

  function isBlocked(tile) {
    if (tile.cleared || tile.inTray) return false;
    return state.tiles.some((o) =>
      o !== tile && !o.cleared && !o.inTray &&
      o.layer > tile.layer && tilesOverlap(o, tile)
    );
  }

  function updateBlockers() {
    state.tiles.forEach((t) => {
      if (t.cleared || t.inTray || !t.el) return;
      t.el.classList.toggle('blocked', isBlocked(t));
    });
  }

  function findTile(id) {
    return state.tiles.find((t) => t.id === id);
  }

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

    // Determine target slot index: cluster same types together
    const insertIdx = computeInsertIndex(tile.type);
    state.tray.splice(insertIdx, 0, tile.id);

    // Flight animation
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
    // Find last index of same type; insert right after it.
    for (let i = state.tray.length - 1; i >= 0; i--) {
      const t = findTile(state.tray[i]);
      if (t && t.type === type) return i + 1;
    }
    return state.tray.length;
  }

  function checkMatches() {
    // Group consecutive same-type triples and clear them
    const typeCounts = {};
    state.tray.forEach((id) => {
      const t = findTile(id);
      if (!t) return;
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1;
    });

    let cleared = false;
    for (const type in typeCounts) {
      if (typeCounts[type] >= 3) {
        const ids = state.tray.filter((id) => findTile(id)?.type === type).slice(0, 3);
        clearTrayTiles(ids);
        cleared = true;
        break; // handle one match per cycle, chain via re-check
      }
    }

    if (!cleared) {
      state.busy = false;
      finishMoveCheck();
    }
  }

  function clearTrayTiles(ids) {
    // Pop animation in slots
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
      // Chain: check again (handles collateral same-type shifts)
      checkMatches();
    }, 360);
  }

  function finishMoveCheck() {
    // Win: all tiles cleared
    const remaining = state.tiles.filter((t) => !t.cleared && !t.inTray).length;
    const trayCount = state.tray.length;

    if (remaining === 0 && trayCount === 0) {
      win();
      return;
    }
    // Lose: tray full and no match reducible
    if (trayCount >= SLOT_COUNT) {
      const counts = {};
      state.tray.forEach((id) => {
        const t = findTile(id);
        if (t) counts[t.type] = (counts[t.type] || 0) + 1;
      });
      const hasTriple = Object.values(counts).some((c) => c >= 3);
      if (!hasTriple) {
        lose();
        return;
      }
    }
    updateHud();
  }

  // ---------- Win / Lose ----------
  function win() {
    state.gameOver = true;
    state.score += 100 + (LEVELS[state.levelIdx]?.label ?? 1) * 25;
    updateHud();
    const isLast = state.levelIdx >= LEVELS.length - 1;
    overlayTitle.textContent = isLast ? '🎉 All Cleared!' : '⭐ Stage Clear!';
    overlayMsg.textContent = isLast
      ? `Final score: ${state.score}`
      : `Score: ${state.score} · Bonus +${100 + (LEVELS[state.levelIdx]?.label ?? 1) * 25}`;
    overlayPrimary.textContent = isLast ? 'Play Again' : 'Next Level';
    overlaySecondary.textContent = 'Retry';
    overlayPrimary.onclick = () => {
      overlay.classList.add('hidden');
      if (isLast) {
        state.levelIdx = 0;
        state.score = 0;
        state.boosters = { undo: 3, magnet: 2, shuffle: 2 };
      } else {
        state.levelIdx++;
        state.boosters.undo += 1;
      }
      buildLevel();
    };
    overlaySecondary.onclick = () => {
      overlay.classList.add('hidden');
      buildLevel();
    };
    overlay.classList.remove('hidden');
  }

  function lose() {
    state.gameOver = true;
    updateHud();
    overlayTitle.textContent = '💔 Tray Full';
    overlayMsg.textContent = 'No 3-match available. Try again!';
    overlayPrimary.textContent = 'Retry';
    overlaySecondary.textContent = 'Restart';
    overlayPrimary.onclick = () => {
      overlay.classList.add('hidden');
      buildLevel();
    };
    overlaySecondary.onclick = () => {
      overlay.classList.add('hidden');
      state.levelIdx = 0;
      state.score = 0;
      state.boosters = { undo: 3, magnet: 2, shuffle: 2 };
      buildLevel();
    };
    overlay.classList.remove('hidden');
  }

  // ---------- Boosters ----------
  function useUndo() {
    if (state.boosters.undo <= 0 || state.history.length === 0 || state.busy) return;
    const snap = state.history.pop();
    state.boosters.undo--;

    // Restore tile states
    snap.tiles.forEach((s) => {
      const t = findTile(s.id);
      if (!t) return;
      t.x = s.x; t.y = s.y; t.layer = s.layer;
      t.inTray = s.inTray; t.cleared = s.cleared;
    });
    state.tray = [...snap.tray];
    state.score = snap.score;

    // Rebuild visuals
    state.tiles.forEach((t) => {
      if (t.el) { t.el.remove(); t.el = null; }
    });
    renderAll();
    updateBlockers();
    updateHud();
  }

  function useMagnet() {
    if (state.boosters.magnet <= 0 || state.tray.length < 3 || state.busy) return;
    snapshot();
    state.boosters.magnet--;

    // Return the last 3 tray tiles to the board at random positions
    const returned = state.tray.splice(-3, 3);
    returned.forEach((id) => {
      const t = findTile(id);
      if (!t) return;
      t.inTray = false;
      const { x, y } = randomInBoard(t.layer);
      t.x = x; t.y = y;
      // Recreate element
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
  }

  function useShuffle() {
    if (state.boosters.shuffle <= 0 || state.busy) return;
    snapshot();
    state.boosters.shuffle--;

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
  }

  // ---------- Wiring ----------
  btnUndo.addEventListener('click', useUndo);
  btnMagnet.addEventListener('click', useMagnet);
  btnShuffle.addEventListener('click', useShuffle);

  window.addEventListener('resize', () => {
    // Clamp tiles inside new board bounds
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
  buildLevel();
})();
