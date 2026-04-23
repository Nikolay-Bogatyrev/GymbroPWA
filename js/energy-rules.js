/**
 * Energy & Pain rules — корректирует план тренировки под текущее состояние.
 *
 * input:
 *   energy: 1..10
 *   tags:   { shoulderPain, kneePain, backPain, lowSleep, stressed, fullEnergy, lowTime }
 * output:
 *   adjustedItems — копия items с изменёнными reps/weight/restSec
 *   adjustments   — список применённых правил для UI ("вес ×0.85", "пропущено: жим штанги")
 */

const PAIN_TO_MUSCLES = {
  shoulderPain: { unsafeFn: ex => ex.shoulderFriendly === false },
  kneePain:     { unsafeFn: ex => (ex.muscles || []).some(m => ['quads', 'hamstrings'].includes(m)) && ex.equipment === 'barbell' },
  backPain:     { unsafeFn: ex => (ex.muscles || []).includes('lower_back') && ex.equipment === 'barbell' },
};

function tryFindAlt(ex, painTags) {
  if (!ex || !Array.isArray(ex.alts)) return null;
  for (const altId of ex.alts) {
    const alt = (window.EXERCISE_BY_ID || {})[altId];
    if (!alt) continue;
    let safe = true;
    for (const [tag, rule] of Object.entries(PAIN_TO_MUSCLES)) {
      if (painTags[tag] && rule.unsafeFn(alt)) { safe = false; break; }
    }
    if (safe) return alt;
  }
  return null;
}

function applyEnergyRules({ items, energy = 6, tags = {} }) {
  const adjustments = [];
  let adjusted = items.map(it => ({ ...it }));

  // 1) Pain swaps: заменяем небезопасные упражнения на альтернативы
  adjusted = adjusted.map(it => {
    const ex = (window.EXERCISE_BY_ID || {})[it.exerciseId];
    if (!ex) return it;
    for (const [tag, rule] of Object.entries(PAIN_TO_MUSCLES)) {
      if (tags[tag] && rule.unsafeFn(ex)) {
        const alt = tryFindAlt(ex, tags);
        if (alt) {
          adjustments.push({ kind: 'swap', from: ex.name, to: alt.name, reason: tag });
          return { ...it, exerciseId: alt.id, _swappedFrom: ex.id };
        } else {
          adjustments.push({ kind: 'skip', from: ex.name, reason: tag });
          return { ...it, _skipped: true };
        }
      }
    }
    return it;
  });

  // Удаляем пропущенные
  adjusted = adjusted.filter(it => !it._skipped);

  // 2) Low time: оставляем только A
  if (tags.lowTime) {
    const before = adjusted.length;
    adjusted = adjusted.filter(it => it.priority === 'A');
    if (adjusted.length < before) {
      adjustments.push({ kind: 'note', text: `Мало времени → оставлены только A-упражнения (${adjusted.length} из ${before})` });
    }
  }

  // 3) Energy-based scaling
  if (energy >= 8 && !tags.lowTime) {
    // High energy: добавляем подход на A
    adjusted = adjusted.map(it => it.priority === 'A' ? { ...it, sets: (it.sets || 0) + 1 } : it);
    adjustments.push({ kind: 'note', text: 'Высокая энергия → +1 подход на A-упражнения' });
  } else if (energy >= 5 && energy <= 7) {
    // нейтрально
  } else if (energy === 3 || energy === 4) {
    adjusted = adjusted.map(it => {
      const next = { ...it };
      if (typeof next.weight === 'number' && next.weight > 0) {
        next.weight = Math.round((next.weight * 0.85) * 4) / 4; // округление до 0.25
      }
      if (typeof next.reps === 'number' && next.reps > 0) {
        next.reps = Math.max(1, Math.round(next.reps * 0.8));
      }
      next.restSec = (next.restSec || 60) + 30;
      return next;
    });
    adjustments.push({ kind: 'note', text: 'Низкая энергия → вес ×0.85, повторения −20%, отдых +30 сек' });
  } else if (energy <= 2) {
    adjustments.push({ kind: 'recommend-deload', text: 'Очень мало сил → лучше отдых, лёгкое кардио или растяжка' });
  }

  // 4) Sleep / stress флаги: лёгкое смягчение
  if ((tags.lowSleep || tags.stressed) && energy > 4) {
    adjusted = adjusted.map(it => {
      const next = { ...it };
      if (typeof next.weight === 'number' && next.weight > 0) {
        next.weight = Math.round((next.weight * 0.95) * 4) / 4;
      }
      return next;
    });
    adjustments.push({ kind: 'note', text: 'Мало сна / стресс → вес −5%' });
  }

  return { items: adjusted, adjustments };
}

window.EnergyRules = {
  applyEnergyRules,
  PAIN_TO_MUSCLES,
};

console.log('📦 energy-rules.js loaded');
