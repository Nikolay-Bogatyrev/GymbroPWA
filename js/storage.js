/**
 * Storage v2 — единый слой доступа к localStorage с версионированием схемы.
 *
 * Ключи:
 *   gym_schema_version — текущая версия схемы (число)
 *   gym_backup_v1      — бэкап старых данных (на случай отката)
 *   gym_settings       — настройки приложения
 *   gym_programs       — массив программ
 *   gym_active_program — id активной программы
 *   gym_workouts       — лог тренировок
 *   gym_session        — текущая активная сессия (auto-save)
 *   gym_trackers       — пользовательские трекеры (геймификация)
 *   gym_prs            — personal records (1RM по упражнениям)
 *   gym_stats          — агрегированная статистика
 *   gym_exercise_overrides — пользовательские override полей упражнений (videoUrl и т.п.)
 */

const SCHEMA_VERSION = 2;

const KEYS = {
  schemaVersion: 'gym_schema_version',
  backupV1: 'gym_backup_v1',
  settings: 'gym_settings',
  programs: 'gym_programs',
  activeProgram: 'gym_active_program',
  workouts: 'gym_workouts',
  session: 'gym_session',
  trackers: 'gym_trackers',
  prs: 'gym_prs',
  stats: 'gym_stats',
  exerciseOverrides: 'gym_exercise_overrides',
};

const DEFAULT_SETTINGS = {
  sound: true,
  vibration: true,
  defaultRestSetSec: 60,
  defaultRestExerciseSec: 120,
  beepFreqHz: 880,
  wakeLockOnWorkout: true,
  weightUnit: 'kg',
};

// ============ INTERNAL HELPERS ============

function safeParse(json, fallback) {
  if (json == null) return fallback;
  try {
    return JSON.parse(json);
  } catch (e) {
    console.warn('storage: JSON parse failed, returning fallback', e);
    return fallback;
  }
}

function safeGet(key, fallback) {
  try {
    return safeParse(localStorage.getItem(key), fallback);
  } catch (e) {
    console.warn('storage: getItem failed', key, e);
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error('storage: setItem failed', key, e);
    return false;
  }
}

// ============ MIGRATION ============

function getCurrentSchemaVersion() {
  const raw = localStorage.getItem(KEYS.schemaVersion);
  return raw ? parseInt(raw, 10) || 0 : 0;
}

function setSchemaVersion(v) {
  localStorage.setItem(KEYS.schemaVersion, String(v));
}

function backupV1IfNeeded() {
  if (localStorage.getItem(KEYS.backupV1)) return; // уже бэкапилось
  const v1Keys = ['gym_workouts', 'gym_stats', 'gym_profile', 'gym_session', 'gym_templates', 'gym_inactive'];
  const backup = {};
  let hasAny = false;
  for (const k of v1Keys) {
    const raw = localStorage.getItem(k);
    if (raw != null) {
      backup[k] = raw;
      hasAny = true;
    }
  }
  if (hasAny) {
    backup._backedUpAt = new Date().toISOString();
    safeSet(KEYS.backupV1, backup);
    console.log('💾 storage: v1 data backed up to', KEYS.backupV1);
  }
}

function migrateToV2() {
  console.log('🔄 storage: migrating to v2 (clean start)…');
  backupV1IfNeeded();
  // Чистый старт: удаляем v1-ключи
  const v1Keys = ['gym_workouts', 'gym_stats', 'gym_profile', 'gym_session', 'gym_templates', 'gym_inactive'];
  for (const k of v1Keys) {
    localStorage.removeItem(k);
  }
  setSchemaVersion(2);
  console.log('✅ storage: migration to v2 complete');
}

function ensureSchema() {
  const v = getCurrentSchemaVersion();
  if (v < 2) {
    migrateToV2();
  }
}

// ============ SETTINGS ============

function getSettings() {
  return { ...DEFAULT_SETTINGS, ...safeGet(KEYS.settings, {}) };
}

function saveSettings(patch) {
  const next = { ...getSettings(), ...patch };
  safeSet(KEYS.settings, next);
  return next;
}

// ============ PROGRAMS ============

function getPrograms() {
  return safeGet(KEYS.programs, []);
}

function savePrograms(programs) {
  safeSet(KEYS.programs, programs);
}

function getActiveProgramId() {
  const raw = localStorage.getItem(KEYS.activeProgram);
  return raw || null;
}

function setActiveProgramId(id) {
  if (id == null) {
    localStorage.removeItem(KEYS.activeProgram);
  } else {
    localStorage.setItem(KEYS.activeProgram, id);
  }
}

function getActiveProgram() {
  const id = getActiveProgramId();
  if (!id) return null;
  return getPrograms().find(p => p.id === id) || null;
}

function upsertProgram(program) {
  const list = getPrograms();
  const i = list.findIndex(p => p.id === program.id);
  if (i >= 0) list[i] = program;
  else list.push(program);
  savePrograms(list);
}

function deleteProgram(id) {
  savePrograms(getPrograms().filter(p => p.id !== id));
  if (getActiveProgramId() === id) setActiveProgramId(null);
}

// ============ WORKOUTS LOG ============

function getWorkouts() {
  return safeGet(KEYS.workouts, []);
}

function saveWorkout(workout) {
  const list = getWorkouts();
  list.unshift(workout);
  // ограничиваем размер истории
  const trimmed = list.slice(0, 500);
  safeSet(KEYS.workouts, trimmed);
}

function updateWorkout(workout) {
  const list = getWorkouts();
  const i = list.findIndex(w => w.id === workout.id);
  if (i >= 0) {
    list[i] = workout;
    safeSet(KEYS.workouts, list);
  }
}

function deleteWorkout(id) {
  safeSet(KEYS.workouts, getWorkouts().filter(w => w.id !== id));
}

// Все подходы по конкретному упражнению (по exerciseId), новейшие первыми
function getExerciseHistory(exerciseId, limit = 50) {
  const out = [];
  for (const w of getWorkouts()) {
    if (!Array.isArray(w.sets)) continue;
    for (const s of w.sets) {
      if (s.exerciseId === exerciseId) {
        out.push({ ...s, workoutId: w.id, workoutDate: w.dateISO || w.date });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

// ============ SESSION (in-flight workout) ============

function getSession() {
  return safeGet(KEYS.session, null);
}

function saveSession(session) {
  const stamped = { ...session, savedAt: new Date().toISOString() };
  safeSet(KEYS.session, stamped);
}

function clearSession() {
  localStorage.removeItem(KEYS.session);
}

// ============ TRACKERS (gamification) ============

function getTrackers() {
  return safeGet(KEYS.trackers, []);
}

function saveTrackers(trackers) {
  safeSet(KEYS.trackers, trackers);
}

function upsertTracker(tracker) {
  const list = getTrackers();
  const i = list.findIndex(t => t.id === tracker.id);
  if (i >= 0) list[i] = tracker;
  else list.push(tracker);
  saveTrackers(list);
}

function deleteTracker(id) {
  saveTrackers(getTrackers().filter(t => t.id !== id));
}

// ============ PRs ============

function getPRs() {
  return safeGet(KEYS.prs, {}); // { [exerciseId]: { value, units, date, workoutId } }
}

function savePR(exerciseId, pr) {
  const all = getPRs();
  all[exerciseId] = { ...pr, updatedAt: new Date().toISOString() };
  safeSet(KEYS.prs, all);
}

// ============ STATS ============

function getStats() {
  return safeGet(KEYS.stats, {
    streak: 0,
    weekCompleted: 0,
    weekStart: null,
    cardioMinutes: 0,
    avgMood: null,
  });
}

function saveStats(stats) {
  safeSet(KEYS.stats, stats);
}

// ============ EXERCISE OVERRIDES (videoUrl и пр.) ============

function getExerciseOverrides() {
  return safeGet(KEYS.exerciseOverrides, {});
}

function setExerciseOverride(exerciseId, patch) {
  const all = getExerciseOverrides();
  all[exerciseId] = { ...(all[exerciseId] || {}), ...patch };
  safeSet(KEYS.exerciseOverrides, all);
}

// Возвращает упражнение из банка, наложив сверху пользовательские overrides
function getExerciseMerged(exerciseId) {
  const base = (window.EXERCISE_BY_ID || {})[exerciseId];
  if (!base) return null;
  const ov = getExerciseOverrides()[exerciseId];
  return ov ? { ...base, ...ov } : base;
}

// ============ ROOT ============

function init() {
  ensureSchema();
  console.log('📦 storage v' + SCHEMA_VERSION + ' ready');
}

const Storage = {
  init,
  KEYS,
  SCHEMA_VERSION,
  // settings
  getSettings, saveSettings,
  // programs
  getPrograms, savePrograms,
  getActiveProgramId, setActiveProgramId, getActiveProgram,
  upsertProgram, deleteProgram,
  // workouts
  getWorkouts, saveWorkout, updateWorkout, deleteWorkout,
  getExerciseHistory,
  // session
  getSession, saveSession, clearSession,
  // trackers
  getTrackers, saveTrackers, upsertTracker, deleteTracker,
  // PRs
  getPRs, savePR,
  // stats
  getStats, saveStats,
  // exercise overrides
  getExerciseOverrides, setExerciseOverride, getExerciseMerged,
};

window.Storage = Storage;
console.log('📦 storage.js loaded');
