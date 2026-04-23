/**
 * Карта YouTube-ссылок для упражнений из EXERCISE_BANK.
 * Заполняется по мере поиска. Если ссылки нет — UI откроет YouTube-поиск
 * по videoSearchQuery (см. getExerciseVideoUrl в exercise-bank.js).
 *
 * Формат: { exerciseId: 'https://www.youtube.com/watch?v=...' }
 */
const EXERCISE_VIDEO_URLS = {
  // CHEST
  'dumbbell-press-neutral': 'https://www.youtube.com/watch?v=fZuQpjhaR_M',
  'barbell-bench-press': 'https://www.youtube.com/watch?v=Pp8rHcFVIYg',
  'dumbbell-bench-press': 'https://www.youtube.com/watch?v=5Y3VZsLb1Ys',
  'barbell-incline-press-low': 'https://www.youtube.com/watch?v=U_N0Pjohh9I',
  'dumbbell-incline-press': 'https://www.youtube.com/watch?v=IP4oeKh1Sd4',
  'floor-press-dumbbell': 'https://www.youtube.com/watch?v=uUGDRwge4F8',
  'landmine-press': 'https://www.youtube.com/watch?v=TY_zsi0kOyI',
  'machine-chest-press': 'https://www.youtube.com/watch?v=pLofEAcfsO8',
  'pec-deck': 'https://www.youtube.com/watch?v=JYmszQs-mRs',
  'dumbbell-fly': 'https://www.youtube.com/watch?v=Nhvz9EzdJ4U',
  'cable-crossover-high': 'https://www.youtube.com/watch?v=hhruLxo9yZU',
  'cable-crossover-low': 'https://www.youtube.com/watch?v=ua6cX6lz9JI',
  'pushup': 'https://www.youtube.com/watch?v=IODxDxX7oi4',
  // BACK / LEGS / SHOULDERS / ARMS / CORE — продолжается ниже по мере поиска
};

// Применяем ссылки к банку: проставляем videoUrl у тех упражнений, для которых нашли видео
(function applyVideos() {
  if (typeof window.EXERCISE_BANK === 'undefined') {
    console.warn('exercise-videos.js: EXERCISE_BANK not loaded yet');
    return;
  }
  let applied = 0;
  for (const ex of window.EXERCISE_BANK) {
    const url = EXERCISE_VIDEO_URLS[ex.id];
    if (url) {
      ex.videoUrl = url;
      applied++;
    }
  }
  console.log('📺 exercise-videos.js: applied', applied, '/', window.EXERCISE_BANK.length, 'video URLs');
})();

window.EXERCISE_VIDEO_URLS = EXERCISE_VIDEO_URLS;
