/**
 * Timer module
 *  - точный таймер на performance.now() (без дрейфа на фоне)
 *  - бип через Web Audio (работает на iOS, не глушится)
 *  - vibration на конце
 *  - Wake Lock на активной тренировке
 *
 * Использование:
 *   const t = createRestTimer({ durationSec: 60, onTick: ..., onEnd: ... });
 *   t.start(); t.pause(); t.add(15); t.cancel();
 */

let _audioCtx = null;
function getAudioCtx() {
  if (_audioCtx) return _audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  _audioCtx = new Ctx();
  return _audioCtx;
}

// На iOS AudioContext должен быть «разбужен» из user gesture.
function unlockAudio() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

function beep({ freq = 880, durationMs = 150, gain = 0.15 } = {}) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    osc.start(now);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.stop(now + durationMs / 1000 + 0.02);
  } catch (e) {
    console.warn('beep failed', e);
  }
}

function vibrate(pattern) {
  if (navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (e) {}
  }
}

// ============ Wake Lock ============
let _wakeLock = null;
async function requestWakeLock() {
  try {
    if (!('wakeLock' in navigator)) return false;
    if (_wakeLock && !_wakeLock.released) return true;
    _wakeLock = await navigator.wakeLock.request('screen');
    _wakeLock.addEventListener('release', () => { /* released */ });
    return true;
  } catch (e) {
    console.warn('wake lock failed', e);
    return false;
  }
}

function releaseWakeLock() {
  if (_wakeLock) {
    try { _wakeLock.release(); } catch (e) {}
    _wakeLock = null;
  }
}

// При возврате во вкладку — переоформить wake lock
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && _wakeLock === null) {
    // не трогаем, если был явный release
  }
});

// ============ Rest Timer (drift-free) ============
function createRestTimer({ durationSec, onTick, onEnd, onWarn3 } = {}) {
  let endAt = 0;             // performance.now() ms
  let pausedAt = 0;
  let isPaused = false;
  let rafId = null;
  let warned3 = false;
  let totalSec = durationSec;

  const settings = (window.Storage && window.Storage.getSettings) ? window.Storage.getSettings() : { sound: true, vibration: true, beepFreqHz: 880 };

  function loop() {
    if (isPaused) return;
    const now = performance.now();
    const remaining = Math.max(0, (endAt - now) / 1000);
    const sec = Math.ceil(remaining);

    // предупреждение за 3 сек
    if (!warned3 && remaining <= 3 && remaining > 0.3) {
      warned3 = true;
      if (settings.sound) beep({ freq: settings.beepFreqHz - 220, durationMs: 80, gain: 0.10 });
      if (typeof onWarn3 === 'function') onWarn3();
    }

    if (typeof onTick === 'function') onTick(sec, remaining);

    if (remaining <= 0) {
      if (settings.sound) beep({ freq: settings.beepFreqHz, durationMs: 350, gain: 0.18 });
      if (settings.vibration) vibrate([200, 80, 200]);
      if (typeof onEnd === 'function') onEnd();
      return;
    }
    rafId = requestAnimationFrame(loop);
  }

  return {
    start() {
      isPaused = false;
      warned3 = false;
      endAt = performance.now() + totalSec * 1000;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    },
    pause() {
      if (isPaused) return;
      isPaused = true;
      pausedAt = performance.now();
      cancelAnimationFrame(rafId);
    },
    resume() {
      if (!isPaused) return;
      const delta = performance.now() - pausedAt;
      endAt += delta;
      isPaused = false;
      rafId = requestAnimationFrame(loop);
    },
    add(extraSec) {
      endAt += extraSec * 1000;
      totalSec += extraSec;
    },
    cancel() {
      cancelAnimationFrame(rafId);
      isPaused = false;
    },
    skip() {
      cancelAnimationFrame(rafId);
      isPaused = false;
      if (typeof onEnd === 'function') onEnd();
    },
    getRemainingSec() {
      const now = isPaused ? pausedAt : performance.now();
      return Math.max(0, Math.ceil((endAt - now) / 1000));
    },
    getTotalSec() { return totalSec; },
  };
}

window.GymTimer = {
  unlockAudio,
  beep,
  vibrate,
  requestWakeLock,
  releaseWakeLock,
  createRestTimer,
};

console.log('📦 timer.js loaded');
