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
const TEMPLATE_DAILY_MORNING = {
  id: 'tpl-daily-morning',
  name: 'Утренняя зарядка (улица + турник)',
  estimatedMinutes: 15,
  isMorning: true,
  items: [
    // === Разминка (динамическая) ===
    { exerciseId: 'jumping-jack',         sets: 1, timeSec: 40, priority: 'A', supersetGroup: null, restSec: 15 },
    { exerciseId: 'neck-shoulder-rolls',  sets: 1, timeSec: 30, priority: 'A', supersetGroup: null, restSec: 10 },
    { exerciseId: 'hip-circles',          sets: 1, timeSec: 30, priority: 'A', supersetGroup: null, restSec: 10 },
    { exerciseId: 'leg-swings',           sets: 1, timeSec: 30, priority: 'A', supersetGroup: null, restSec: 10 },

    // === Мобильность ===
    { exerciseId: 'worlds-greatest-stretch', sets: 1, timeSec: 40, priority: 'B', supersetGroup: null, restSec: 10 },
    { exerciseId: 'cat-cow',                 sets: 1, timeSec: 30, priority: 'B', supersetGroup: null, restSec: 10 },
    { exerciseId: 'cobra-stretch',           sets: 1, timeSec: 30, priority: 'B', supersetGroup: null, restSec: 10 },

    // === Сила (короткая) ===
    { exerciseId: 'bar-hang',           sets: 2, timeSec: 20, priority: 'B', supersetGroup: null, restSec: 30 },
    { exerciseId: 'pullup-pronated',    sets: 2, reps: 5,     priority: 'A', supersetGroup: null, restSec: 60 },
    { exerciseId: 'pushup',             sets: 2, reps: 10,    priority: 'B', supersetGroup: null, restSec: 45 },
    { exerciseId: 'squat-bodyweight',   sets: 2, reps: 15,    priority: 'B', supersetGroup: null, restSec: 30 },

    // === Заминка / растяжка ===
    { exerciseId: 'hamstring-stretch',     sets: 1, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 5 },
    { exerciseId: 'hip-flexor-stretch',    sets: 1, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 5 },
    { exerciseId: 'shoulder-pec-stretch',  sets: 1, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 5 },
    { exerciseId: 'calf-stretch',          sets: 1, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 5 },
    { exerciseId: 'child-pose',            sets: 1, timeSec: 30, priority: 'C', supersetGroup: null, restSec: 0 },
  ],
};

const DEFAULT_TEMPLATES = [TEMPLATE_BEGINNER_FB_A, TEMPLATE_BEGINNER_FB_B, PREHAB_TEMPLATE, TEMPLATE_DAILY_MORNING];

const PROGRAM_BEGINNER_FULL_BODY = {
  id: 'prog-beginner-fullbody',
  name: 'Beginner Full Body A/B (3×/нед)',
  level: 'beginner',
  active: true,
  // Mon/Wed/Fri рабочие, остальные — отдых. Чередование A/B/A → B/A/B.
  week: {
    mon: 'tpl-fullbody-a',
    tue: null,
    wed: 'tpl-fullbody-b',
    thu: null,
    fri: 'tpl-fullbody-a',
    sat: null,
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

// Инициализация: при первом запуске установить программу по умолчанию активной
function ensureDefaultProgram() {
  if (typeof Storage === 'undefined') return;
  const programs = Storage.getPrograms();
  if (!programs.find(p => p.id === PROGRAM_BEGINNER_FULL_BODY.id)) {
    Storage.upsertProgram(PROGRAM_BEGINNER_FULL_BODY);
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
