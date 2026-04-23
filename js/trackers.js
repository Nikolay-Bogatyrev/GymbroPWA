/**
 * Trackers — геймификация ежедневных привычек.
 *
 * Tracker:
 *   { id, name, type: 'daily_binary'|'daily_count', icon?, createdAt,
 *     entries: { 'YYYY-MM-DD': true|number } }
 *
 * Используется для подтягиваний, зарядки, растяжки, прогулок и т.п.
 * Карта года + стрик + бейджи (7/30/100/365).
 */

const BADGE_THRESHOLDS = [7, 30, 100, 365, 730];

function ymd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey() {
  return ymd(new Date());
}

function createTracker({ name, type = 'daily_binary', icon = '✅' }) {
  return {
    id: 'trk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name,
    type,
    icon,
    createdAt: new Date().toISOString(),
    entries: {},
  };
}

function markToday(tracker, value = true) {
  const key = todayKey();
  if (tracker.type === 'daily_count') {
    tracker.entries[key] = (tracker.entries[key] || 0) + (typeof value === 'number' ? value : 1);
  } else {
    tracker.entries[key] = !tracker.entries[key];
    if (!tracker.entries[key]) delete tracker.entries[key];
  }
  return tracker;
}

function setEntry(tracker, dateKey, value) {
  if (value == null || value === false || value === 0) {
    delete tracker.entries[dateKey];
  } else {
    tracker.entries[dateKey] = value;
  }
  return tracker;
}

function getCurrentStreak(tracker) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365 * 3; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    if (tracker.entries[key]) streak++;
    else if (i === 0) {
      // сегодня нет — начинаем со вчера
      continue;
    } else break;
  }
  return streak;
}

function getBestStreak(tracker) {
  const dates = Object.keys(tracker.entries).sort();
  if (dates.length === 0) return 0;
  let best = 1, current = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const cur = new Date(dates[i]);
    const diffDays = Math.round((cur - prev) / 86400000);
    if (diffDays === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }
  return best;
}

function getTotalDays(tracker) {
  return Object.keys(tracker.entries).length;
}

function getTotalCount(tracker) {
  if (tracker.type !== 'daily_count') return 0;
  return Object.values(tracker.entries).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
}

function getEarnedBadges(tracker) {
  const total = getTotalDays(tracker);
  return BADGE_THRESHOLDS.filter(t => total >= t);
}

function getNextBadge(tracker) {
  const total = getTotalDays(tracker);
  return BADGE_THRESHOLDS.find(t => total < t) || null;
}

/**
 * Возвращает массив 365 ячеек для карты года.
 * Каждая: { dateKey, value, intensity (0..4), inFuture, isToday }
 */
function getYearGrid(tracker, endDate = new Date()) {
  const cells = [];
  const today = ymd(new Date());
  for (let i = 364; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    const key = ymd(d);
    const value = tracker.entries[key];
    let intensity = 0;
    if (value) {
      if (tracker.type === 'daily_count') {
        const v = Number(value) || 0;
        intensity = v >= 50 ? 4 : v >= 20 ? 3 : v >= 10 ? 2 : v > 0 ? 1 : 0;
      } else {
        intensity = 3;
      }
    }
    cells.push({
      dateKey: key,
      value: value || null,
      intensity,
      isToday: key === today,
      weekday: d.getDay(),
    });
  }
  return cells;
}

window.Trackers = {
  BADGE_THRESHOLDS,
  ymd,
  todayKey,
  createTracker,
  markToday,
  setEntry,
  getCurrentStreak,
  getBestStreak,
  getTotalDays,
  getTotalCount,
  getEarnedBadges,
  getNextBadge,
  getYearGrid,
};

console.log('📦 trackers.js loaded');
