/**
 * Programs & Templates
 *
 * Program (программа на неделю):
 *   { id, name, active, level, week: { mon|tue|wed|thu|fri|sat|sun: templateId|null } }
 *
 * Template (план тренировки на день):
 *   {
 *     id, name, estimatedMinutes,
 *     items: [{
 *       exerciseId,
 *       sets,
 *       reps,            // для weighted_reps / bodyweight_reps
 *       timeSec,         // для time_only / weighted_time
 *       priority: 'A'|'B'|'C',
 *       supersetGroup: null | 'a' | 'b' | ...   // упражнения с одной буквой = суперсет
 *       restSec,         // опционально, переопределяет дефолт упражнения
 *       weight,          // стартовый вес
 *     }]
 *   }
 */

const TEMPLATE_BEGINNER_FB_A = {
  id: 'tpl-fullbody-a',
  name: 'Full Body A — Lower + Push',
  estimatedMinutes: 50,
  items: [
    { exerciseId: 'goblet-squat',           sets: 3, reps: 8,  priority: 'A', supersetGroup: null, restSec: 120, weight: 12 },
    { exerciseId: 'dumbbell-press-neutral', sets: 3, reps: 10, priority: 'A', supersetGroup: null, restSec: 120, weight: 10 },
    { exerciseId: 'rdl-dumbbell',           sets: 3, reps: 10, priority: 'B', supersetGroup: null, restSec: 90,  weight: 12 },
    { exerciseId: 'seated-cable-row',       sets: 3, reps: 10, priority: 'B', supersetGroup: null, restSec: 90,  weight: 25 },
    { exerciseId: 'dumbbell-fly',           sets: 2, reps: 12, priority: 'C', supersetGroup: 'a',  restSec: 45,  weight: 6 },
    { exerciseId: 'face-pull',              sets: 2, reps: 15, priority: 'C', supersetGroup: 'a',  restSec: 60,  weight: 10 },
    { exerciseId: 'plank',                  sets: 3, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 45 },
  ],
};

const TEMPLATE_BEGINNER_FB_B = {
  id: 'tpl-fullbody-b',
  name: 'Full Body B — Hinge + Pull',
  estimatedMinutes: 50,
  items: [
    { exerciseId: 'rdl-barbell',                     sets: 3, reps: 8,  priority: 'A', supersetGroup: null, restSec: 150, weight: 30 },
    { exerciseId: 'lat-pulldown-neutral',            sets: 3, reps: 10, priority: 'A', supersetGroup: null, restSec: 120, weight: 35 },
    { exerciseId: 'machine-chest-press',             sets: 3, reps: 10, priority: 'B', supersetGroup: null, restSec: 90,  weight: 25 },
    { exerciseId: 'dumbbell-lunge',                  sets: 3, reps: 10, priority: 'B', supersetGroup: null, restSec: 90,  weight: 8 },
    { exerciseId: 'dumbbell-curl',                   sets: 2, reps: 12, priority: 'C', supersetGroup: 'a',  restSec: 45,  weight: 6 },
    { exerciseId: 'cable-triceps-pushdown',          sets: 2, reps: 12, priority: 'C', supersetGroup: 'a',  restSec: 45,  weight: 15 },
    { exerciseId: 'side-plank',                      sets: 2, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 45 },
  ],
};

const TEMPLATE_BEGINNER_FB_C = {
  id: 'tpl-fullbody-c',
  name: 'Full Body C — Compound Mix',
  estimatedMinutes: 50,
  items: [
    // Quad-доминант (compound, тренажёр — безопасно для новичка)
    { exerciseId: 'leg-press',                       sets: 3, reps: 8,  priority: 'A', supersetGroup: null, restSec: 120, weight: 60 },
    // Вертикальный жим, нейтральный хват — безопасно для плеча
    { exerciseId: 'dumbbell-shoulder-press-neutral', sets: 3, reps: 8,  priority: 'A', supersetGroup: null, restSec: 120, weight: 8 },
    // Тяга гантели одной рукой — unilateral, удвоится в потоке
    { exerciseId: 'dumbbell-row',                    sets: 3, reps: 10, priority: 'B', supersetGroup: null, restSec: 90,  weight: 10 },
    // Hip thrust — основной для ягодиц, не повторяется в A/B
    { exerciseId: 'hip-thrust',                      sets: 3, reps: 10, priority: 'B', supersetGroup: null, restSec: 90,  weight: 30 },
    // Молотки + разгибания трицепса (суперсет для рук)
    { exerciseId: 'hammer-curl',                     sets: 2, reps: 12, priority: 'C', supersetGroup: 'a',  restSec: 45,  weight: 6 },
    { exerciseId: 'cable-triceps-pushdown',          sets: 2, reps: 12, priority: 'C', supersetGroup: 'a',  restSec: 45,  weight: 15 },
    // Анти-ротация для core
    { exerciseId: 'pallof-press',                    sets: 2, reps: 12, priority: 'C', supersetGroup: null, restSec: 45,  weight: 15 },
  ],
};

const PREHAB_TEMPLATE = {
  id: 'tpl-prehab',
  name: 'Prehab плеч (5 мин)',
  estimatedMinutes: 5,
  isPrehab: true,
  items: [
    { exerciseId: 'band-pull-apart',         sets: 2, reps: 15, priority: 'A', supersetGroup: 'a', restSec: 30 },
    { exerciseId: 'face-pull',               sets: 2, reps: 12, priority: 'A', supersetGroup: 'a', restSec: 30, weight: 10 },
    { exerciseId: 'external-rotation-band',  sets: 2, reps: 12, priority: 'A', supersetGroup: null, restSec: 30 },
  ],
};

// ============ УТРЕННЯЯ ЗАРЯДКА (улица + турник) ============
// Правила отдыха:
//   • разминка / мобильность / растяжки между собой — 10 сек
//   • силовые подходы между собой — 60 сек
//   • переход с силового на растяжку — 30 сек (или 0 если вкатываешься плавно)
//   • последнее упражнение — 0 (закончил, можно идти)
const TEMPLATE_DAILY_MORNING = {
  id: 'tpl-daily-morning',
  name: 'Утренняя зарядка (улица + турник)',
  estimatedMinutes: 18,
  isMorning: true,
  items: [
    // === Разминка (динамическая) — 10 сек ===
    { exerciseId: 'jumping-jack',         sets: 1, timeSec: 40, priority: 'A', supersetGroup: null, restSec: 10 },
    { exerciseId: 'neck-shoulder-rolls',  sets: 1, timeSec: 30, priority: 'A', supersetGroup: null, restSec: 10 },
    { exerciseId: 'hip-circles',          sets: 1, timeSec: 30, priority: 'A', supersetGroup: null, restSec: 10 },
    { exerciseId: 'leg-swings',           sets: 1, timeSec: 30, priority: 'A', supersetGroup: null, restSec: 10 },

    // === Мобильность — 10 сек ===
    { exerciseId: 'worlds-greatest-stretch', sets: 1, timeSec: 40, priority: 'B', supersetGroup: null, restSec: 10 },
    { exerciseId: 'cat-cow',                 sets: 1, timeSec: 30, priority: 'B', supersetGroup: null, restSec: 10 },
    { exerciseId: 'cobra-stretch',           sets: 1, timeSec: 30, priority: 'B', supersetGroup: null, restSec: 10 },

    // === Ягодицы + тазовое дно (силовые) — 60 сек между подходами ===
    { exerciseId: 'glute-bridge',         sets: 2, reps: 15,    priority: 'B', supersetGroup: null, restSec: 60 },
    { exerciseId: 'bird-dog',             sets: 2, reps: 8,     priority: 'B', supersetGroup: null, restSec: 60 },
    { exerciseId: 'donkey-kick',          sets: 2, reps: 12,    priority: 'B', supersetGroup: null, restSec: 60 },
    { exerciseId: 'kegel',                sets: 2, timeSec: 30, priority: 'B', supersetGroup: null, restSec: 60 },

    // === Сила (короткая) — 60 сек, последнее перед растяжкой 30 сек ===
    { exerciseId: 'bar-hang',           sets: 2, timeSec: 20, priority: 'B', supersetGroup: null, restSec: 60 },
    { exerciseId: 'pullup-pronated',    sets: 2, reps: 5,     priority: 'A', supersetGroup: null, restSec: 60 },
    { exerciseId: 'pushup',             sets: 2, reps: 10,    priority: 'B', supersetGroup: null, restSec: 60 },
    { exerciseId: 'squat-bodyweight',   sets: 2, reps: 15,    priority: 'B', supersetGroup: null, restSec: 30 },

    // === Заминка / растяжка — 10 сек, последнее 0 ===
    { exerciseId: 'hamstring-stretch',     sets: 1, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 10 },
    { exerciseId: 'hip-flexor-stretch',    sets: 1, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 10 },
    { exerciseId: 'shoulder-pec-stretch',  sets: 1, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 10 },
    { exerciseId: 'calf-stretch',          sets: 1, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 10 },
    { exerciseId: 'child-pose',            sets: 1, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 0 },
  ],
};

// ============ ЦЕЛЕВОЙ БЛОК: ЯГОДИЦЫ И ТАЗОВОЕ ДНО (8 мин) ============
// Самостоятельный мини-комплекс. Можно делать без разминки/растяжки —
// дополнение к основной тренировке или вечерний короткий блок.
const TEMPLATE_GLUTE_PELVIC = {
  id: 'tpl-glute-pelvic',
  name: 'Ягодицы + тазовое дно (8 мин)',
  estimatedMinutes: 8,
  isPelvicTargeted: true,
  items: [
    // Все силовые — 60 сек между подходами; последнее 0 (закончил)
    { exerciseId: 'glute-bridge',             sets: 3, reps: 15,    priority: 'A', supersetGroup: null, restSec: 60 },
    { exerciseId: 'single-leg-glute-bridge',  sets: 2, reps: 10,    priority: 'A', supersetGroup: null, restSec: 60 },
    { exerciseId: 'donkey-kick',              sets: 2, reps: 12,    priority: 'B', supersetGroup: null, restSec: 60 },
    { exerciseId: 'frog-pump',                sets: 2, reps: 15,    priority: 'B', supersetGroup: null, restSec: 60 },
    { exerciseId: 'bird-dog',                 sets: 2, reps: 8,     priority: 'B', supersetGroup: null, restSec: 60 },
    { exerciseId: 'kegel',                    sets: 3, timeSec: 30, priority: 'A', supersetGroup: null, restSec: 0 },
  ],
};

const DEFAULT_TEMPLATES = [
  TEMPLATE_BEGINNER_FB_A,
  TEMPLATE_BEGINNER_FB_B,
  TEMPLATE_BEGINNER_FB_C,
  PREHAB_TEMPLATE,
  TEMPLATE_DAILY_MORNING,
  TEMPLATE_GLUTE_PELVIC,
];

const PROGRAM_BEGINNER_FULL_BODY = {
  id: 'prog-beginner-fullbody',
  name: 'Beginner Full Body A/B/C (вт/чт/сб)',
  level: 'beginner',
  active: true,
  // 3 тренировки в неделю: вт/чт/сб. Каждая — отдельный шаблон.
  week: {
    mon: null,
    tue: 'tpl-fullbody-a',
    wed: null,
    thu: 'tpl-fullbody-b',
    fri: null,
    sat: 'tpl-fullbody-c',
    sun: null,
  },
};

const TEMPLATES_BY_ID = Object.fromEntries(DEFAULT_TEMPLATES.map(t => [t.id, t]));

function getTemplateById(id) {
  return TEMPLATES_BY_ID[id] || null;
}

function getAllTemplates() {
  return DEFAULT_TEMPLATES.slice();
}

// Возвращает дневной план для конкретной даты по активной программе
function getPlanForDate(date = new Date()) {
  if (typeof Storage === 'undefined') return null;
  const program = Storage.getActiveProgram();
  if (!program) return null;
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const key = dayKeys[date.getDay()];
  const templateId = program.week[key];
  if (!templateId) return { date, dayKey: key, program, template: null, isRest: true };
  const template = getTemplateById(templateId);
  return { date, dayKey: key, program, template, isRest: false };
}

// Инициализация: при первом запуске установить программу по умолчанию активной.
// При обновлении кода — синхронизируем недельную сетку и имя дефолтной программы
// с актуальным значением (чтобы новые шаблоны/расписание появлялись у пользователя
// без ручного действия).
function ensureDefaultProgram() {
  if (typeof Storage === 'undefined') return;
  const programs = Storage.getPrograms();
  const existing = programs.find(p => p.id === PROGRAM_BEGINNER_FULL_BODY.id);
  if (!existing) {
    Storage.upsertProgram(PROGRAM_BEGINNER_FULL_BODY);
  } else {
    // Обновляем сетку и имя; level/active оставляем как было если есть
    existing.week = { ...PROGRAM_BEGINNER_FULL_BODY.week };
    existing.name = PROGRAM_BEGINNER_FULL_BODY.name;
    Storage.upsertProgram(existing);
  }
  if (!Storage.getActiveProgramId()) {
    Storage.setActiveProgramId(PROGRAM_BEGINNER_FULL_BODY.id);
  }
}

// id шаблона prehab — для автоматической вставки перед основной тренировкой
const PREHAB_TEMPLATE_ID = 'tpl-prehab';
const MORNING_TEMPLATE_ID = 'tpl-daily-morning';

window.PROGRAMS = {
  ensureDefaultProgram,
  getTemplateById,
  getAllTemplates,
  getPlanForDate,
  DEFAULT_TEMPLATES,
  PROGRAM_BEGINNER_FULL_BODY,
  PREHAB_TEMPLATE,
  PREHAB_TEMPLATE_ID,
  MORNING_TEMPLATE_ID,
};

console.log('📦 programs.js loaded');
