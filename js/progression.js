/**
 * Progression engine — авто-прогрессия по типу упражнения.
 *
 *   weighted_reps   : +stepKg если 2 успешных подхода подряд (все целевые reps)
 *                     -10% если 2 неудачных подряд (не добил низ диапазона)
 *   bodyweight_reps : +stepReps если последний раз все подходы добиты
 *                     при превышении ceiling — предложить более сложную альтернативу
 *   weighted_time   : +stepTimeSec при том же весе
 *   time_only       : +stepTimeSec
 *
 * 1RM (Epley): w * (1 + reps/30)
 */

function epley1RM(weight, reps) {
  if (!weight || !reps || reps < 1) return 0;
  return weight * (1 + reps / 30);
}

function bestSetFromHistoryEntry(entry) {
  if (!Array.isArray(entry.sets)) return null;
  let best = null;
  for (const s of entry.sets) {
    const oneRM = epley1RM(s.weight || 0, s.reps || 0);
    if (!best || oneRM > best.oneRM) {
      best = { ...s, oneRM };
    }
  }
  return best;
}

// Возвращает массив завершённых подходов по упражнению из последних N тренировок,
// сгруппированных по тренировке (новейшие первыми)
function getRecentSessionsForExercise(exerciseId, limit = 6) {
  if (typeof Storage === 'undefined') return [];
  const out = [];
  const workouts = Storage.getWorkouts();
  for (const w of workouts) {
    const sets = (w.sets || []).filter(s => s.exerciseId === exerciseId && !s.skipped);
    if (sets.length > 0) {
      out.push({ workoutId: w.id, date: w.dateISO || w.date, sets });
      if (out.length >= limit) break;
    }
  }
  return out;
}

function isAllSetsCleared(sets, targetReps) {
  return sets.length > 0 && sets.every(s => (s.reps || 0) >= targetReps);
}

/**
 * Подсказка для следующей тренировки по упражнению.
 * @param item — slot из шаблона: { exerciseId, sets, reps, timeSec, weight }
 * @returns { weight, reps, timeSec, hint } — рекомендуемые значения и подсказка
 */
function suggestNext(item) {
  const ex = (window.EXERCISE_BY_ID || {})[item.exerciseId];
  if (!ex) return { ...item, hint: null };

  const recent = getRecentSessionsForExercise(item.exerciseId, 3);

  switch (ex.type) {
    case 'weighted_reps': {
      if (recent.length === 0) return { weight: item.weight, reps: item.reps, hint: 'Стартовый вес' };
      const lastSets = recent[0].sets;
      const targetReps = item.reps;
      const lastWeight = lastSets[lastSets.length - 1]?.weight || item.weight;

      const cleared0 = isAllSetsCleared(lastSets, targetReps);
      const cleared1 = recent[1] ? isAllSetsCleared(recent[1].sets, targetReps) : false;
      if (cleared0 && cleared1) {
        return { weight: lastWeight + (ex.stepKg || 2.5), reps: targetReps, hint: `+${ex.stepKg || 2.5} кг (2 успешных подряд)` };
      }
      if (cleared0) {
        return { weight: lastWeight, reps: targetReps, hint: 'Закрепляем вес — ещё одна успешная тренировка → прогрессия' };
      }
      // не добил
      const failed1 = recent[1] ? !isAllSetsCleared(recent[1].sets, targetReps) : false;
      if (failed1) {
        const reduced = Math.max(0, Math.round((lastWeight * 0.9) / (ex.stepKg || 2.5)) * (ex.stepKg || 2.5));
        return { weight: reduced, reps: targetReps, hint: `−10% (2 неудачи подряд)` };
      }
      return { weight: lastWeight, reps: targetReps, hint: 'Не добил — повторяем тот же вес' };
    }

    case 'bodyweight_reps': {
      if (recent.length === 0) return { reps: item.reps, hint: 'Стартовое количество' };
      const lastSets = recent[0].sets;
      const targetReps = item.reps;
      const cleared = isAllSetsCleared(lastSets, targetReps);
      if (cleared) {
        const next = targetReps + (ex.stepReps || 1);
        return { reps: next, hint: `+${ex.stepReps || 1} повтор` };
      }
      return { reps: targetReps, hint: 'Не добил — повторяем тот же объём' };
    }

    case 'time_only':
    case 'weighted_time': {
      if (recent.length === 0) return { timeSec: item.timeSec, weight: item.weight, hint: 'Стартовое время' };
      const lastSets = recent[0].sets;
      const targetTime = item.timeSec;
      const lastWeight = ex.type === 'weighted_time' ? (lastSets[lastSets.length - 1]?.weight || item.weight || 0) : 0;
      const cleared = lastSets.every(s => (s.timeSec || 0) >= targetTime);
      if (cleared) {
        const next = targetTime + (ex.stepTimeSec || 5);
        return { timeSec: next, weight: lastWeight, hint: `+${ex.stepTimeSec || 5} сек` };
      }
      return { timeSec: targetTime, weight: lastWeight, hint: 'Не добил — повторяем то же время' };
    }

    default:
      return { ...item, hint: null };
  }
}

/**
 * После сохранения тренировки — обновить PR по каждому проработанному упражнению.
 * Возвращает массив {exerciseId, type, value, isNew} для упражнений с новым PR.
 */
function detectAndSavePRs(workout) {
  if (typeof Storage === 'undefined' || !Array.isArray(workout.sets)) return [];
  const setsByExercise = {};
  for (const s of workout.sets) {
    if (s.skipped) continue;
    if (!setsByExercise[s.exerciseId]) setsByExercise[s.exerciseId] = [];
    setsByExercise[s.exerciseId].push(s);
  }
  const prs = Storage.getPRs();
  const news = [];
  for (const [exerciseId, sets] of Object.entries(setsByExercise)) {
    const ex = (window.EXERCISE_BY_ID || {})[exerciseId];
    if (!ex) continue;
    let metric, value;
    if (ex.type === 'weighted_reps') {
      const best = sets.reduce((b, s) => {
        const v = epley1RM(s.weight || 0, s.reps || 0);
        return v > (b?.value || 0) ? { value: v, weight: s.weight, reps: s.reps } : b;
      }, null);
      if (!best) continue;
      metric = '1rm';
      value = best.value;
    } else if (ex.type === 'bodyweight_reps') {
      metric = 'maxReps';
      value = sets.reduce((m, s) => Math.max(m, s.reps || 0), 0);
    } else if (ex.type === 'time_only' || ex.type === 'weighted_time') {
      metric = 'maxTimeSec';
      value = sets.reduce((m, s) => Math.max(m, s.timeSec || 0), 0);
    } else {
      continue;
    }
    const prev = prs[exerciseId];
    if (!prev || value > (prev.value || 0)) {
      Storage.savePR(exerciseId, { metric, value, workoutId: workout.id, date: workout.dateISO || workout.date });
      news.push({ exerciseId, metric, value, isNew: true });
    }
  }
  return news;
}

window.Progression = {
  epley1RM,
  bestSetFromHistoryEntry,
  suggestNext,
  detectAndSavePRs,
  getRecentSessionsForExercise,
};

console.log('📦 progression.js loaded');
