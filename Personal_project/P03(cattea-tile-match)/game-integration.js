// Cattea — Week 1 Integration Modules
// Exposes window.Cattea = { StageLoader, ProgressManager, Analytics }.
// Load this BEFORE game.js.

(function (w) {
  'use strict';

  // =====================================================================
  // StageLoader — fetches stages.json, serves per-stage config.
  // =====================================================================
  const StageLoader = {
    _stages: null,
    _promise: null,

    load(url) {
      if (this._stages) return Promise.resolve(this._stages);
      if (this._promise) return this._promise;
      const target = url || (w.CATTEA_STAGES_URL || 'stages.json');

      this._promise = fetch(target, { cache: 'no-cache' })
        .then((r) => {
          if (!r.ok) throw new Error('stages.json HTTP ' + r.status);
          return r.json();
        })
        .then((json) => {
          this._stages = Array.isArray(json) ? json : json.stages;
          if (!Array.isArray(this._stages)) throw new Error('stages.json shape invalid');
          return this._stages;
        })
        .catch((err) => {
          console.warn('[StageLoader] load failed, using fallback.', err);
          this._stages = (w.CATTEA_STAGES_FALLBACK || []).slice();
          return this._stages;
        });
      return this._promise;
    },

    getStage(id) {
      return (this._stages || []).find((s) => s.id === id) || null;
    },

    count() { return (this._stages || []).length; },
    all() { return (this._stages || []).slice(); },
  };

  // =====================================================================
  // ProgressManager — localStorage-backed save/load, schema v1.
  // =====================================================================
  const STORAGE_KEY = 'cattea:progress:v1';
  const DEFAULTS = {
    schemaVersion: 1,
    currentStage: 1,
    highestCleared: 0,
    totalScore: 0,
    stageScores: {},
    stageStars: {},
    boosters: { undo: 3, magnet: 2, shuffle: 2 },
    firstPlayAt: null,
    lastPlayAt: null,
    plays: 0,
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  const ProgressManager = {
    _data: null,

    _read() {
      try {
        const raw = w.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.schemaVersion !== 1) return null;
        return parsed;
      } catch { return null; }
    },

    _write() {
      try { w.localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data)); }
      catch (e) { console.warn('[ProgressManager] save failed', e); }
    },

    load() {
      const stored = this._read();
      this._data = stored ? Object.assign(clone(DEFAULTS), stored) : clone(DEFAULTS);
      if (!this._data.firstPlayAt) this._data.firstPlayAt = Date.now();
      this._data.lastPlayAt = Date.now();
      this._data.plays = (this._data.plays || 0) + 1;
      this._write();
      return this._data;
    },

    get() { return this._data || this.load(); },

    setCurrentStage(id) {
      const d = this.get();
      d.currentStage = Math.max(1, id | 0);
      this._write();
    },

    recordClear(stageId, score, stars) {
      const d = this.get();
      stars = Math.max(1, Math.min(3, stars | 0 || 1));
      d.highestCleared = Math.max(d.highestCleared, stageId);
      d.currentStage = Math.max(d.currentStage, stageId + 1);
      d.totalScore += score | 0;
      d.stageScores[stageId] = Math.max(d.stageScores[stageId] || 0, score | 0);
      d.stageStars[stageId] = Math.max(d.stageStars[stageId] || 0, stars);
      this._write();
    },

    isUnlocked(stageId) {
      return stageId <= (this.get().highestCleared + 1);
    },

    addBoosters(pack) {
      if (!pack) return;
      const d = this.get();
      Object.keys(pack).forEach((k) => {
        d.boosters[k] = (d.boosters[k] || 0) + (pack[k] | 0);
      });
      this._write();
    },

    setBoosters(pack) {
      const d = this.get();
      d.boosters = Object.assign({}, d.boosters, pack || {});
      this._write();
    },

    useBooster(type) {
      const d = this.get();
      if ((d.boosters[type] || 0) <= 0) return false;
      d.boosters[type] -= 1;
      this._write();
      return true;
    },

    reset() {
      this._data = Object.assign(clone(DEFAULTS), { firstPlayAt: Date.now(), lastPlayAt: Date.now(), plays: 1 });
      this._write();
      return this._data;
    },
  };

  // =====================================================================
  // Analytics — GA4 wrapper with pre-init queue + debug echo.
  // =====================================================================
  const Analytics = {
    _queue: [],
    _ready: false,
    _debug: false,

    init(options) {
      this._debug = !!(options && options.debug);
      const tryReady = () => {
        if (typeof w.gtag === 'function') {
          this._ready = true;
          this._flush();
          return true;
        }
        return false;
      };
      if (tryReady()) return;
      const id = setInterval(() => { if (tryReady()) clearInterval(id); }, 400);
      setTimeout(() => clearInterval(id), 12000);
    },

    _flush() {
      while (this._queue.length) {
        const [name, params] = this._queue.shift();
        w.gtag('event', name, params);
      }
    },

    _emit(name, params) {
      params = params || {};
      if (this._debug) console.log('[GA4]', name, params);
      if (this._ready && typeof w.gtag === 'function') {
        w.gtag('event', name, params);
      } else {
        this._queue.push([name, params]);
      }
    },

    // --- Canonical events ---
    stageStart(stageId, mode) {
      this._emit('stage_start', { stage_id: stageId, mode: mode || 'normal' });
    },

    stageClear(stageId, score, timeSec, stars) {
      this._emit('stage_clear', {
        stage_id: stageId,
        score: score | 0,
        time_sec: Math.max(0, Math.round(timeSec || 0)),
        stars: stars | 0 || 1,
      });
    },

    stageFail(stageId, reason, timeSec) {
      this._emit('stage_fail', {
        stage_id: stageId,
        reason: reason || 'unknown',
        time_sec: Math.max(0, Math.round(timeSec || 0)),
      });
    },

    boosterUse(stageId, type) {
      this._emit('booster_use', { stage_id: stageId, booster: type });
    },
  };

  w.Cattea = w.Cattea || {};
  w.Cattea.StageLoader = StageLoader;
  w.Cattea.ProgressManager = ProgressManager;
  w.Cattea.Analytics = Analytics;
})(window);
