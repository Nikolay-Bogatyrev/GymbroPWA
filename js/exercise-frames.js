/**
 * Кадры упражнений: images/exercises/<id>/0.jpg (начало) и 1.jpg (конец движения).
 * Экран тренировки плавно переключает их через CSS.
 * Источник: Free Exercise DB (https://github.com/yuhonas/free-exercise-db), public domain.
 * Для bulgarian-split-squat, assisted-pullup и bird-dog подходящих кадров нет.
 */
const EXERCISE_FRAME_IDS = [
  'leg-press', 'hip-thrust', 'leg-curl', 'hip-abduction', 'dead-bug', 'pallof-press',
  'lat-pulldown-wide', 'dumbbell-incline-press', 'seated-cable-row', 'lateral-raise',
  'face-pull', 'dumbbell-curl', 'cable-triceps-pushdown', 'rdl-dumbbell', 'hyperextension',
  'leg-extension', 'side-plank-hip-lift', 'dumbbell-row', 'dumbbell-bench-press',
  'dumbbell-shoulder-press-neutral', 'rear-delt-fly', 'hammer-curl', 'skullcrusher',
];

// Применяем кадры к банку
(function applyFrames() {
  if (typeof window.EXERCISE_BY_ID === 'undefined') {
    console.warn('exercise-frames.js: EXERCISE_BY_ID not loaded yet');
    return;
  }
  for (const id of EXERCISE_FRAME_IDS) {
    const ex = window.EXERCISE_BY_ID[id];
    if (ex) ex.frames = [0, 1].map(n => `./images/exercises/${id}/${n}.jpg`);
  }
})();
