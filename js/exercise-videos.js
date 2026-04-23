/**
 * Карта YouTube-ссылок для упражнений из EXERCISE_BANK.
 * Если ссылки нет — UI откроет YouTube-поиск по videoSearchQuery.
 * Пользователь может заменить любую ссылку через Банк → деталь → «Своё видео».
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
  'dip-chest': 'https://www.youtube.com/watch?v=J3WYrjNDLI4',

  // BACK
  'pullup-pronated': 'https://www.youtube.com/watch?v=Y3dxtfzZZ-c',
  'pullup-supinated': 'https://www.youtube.com/watch?v=seL1fLIRWd0',
  'lat-pulldown-wide': 'https://www.youtube.com/watch?v=83Y3CFcgnkQ',
  'lat-pulldown-neutral': 'https://www.youtube.com/watch?v=KgZqDuNx7rI',
  'seated-cable-row': 'https://www.youtube.com/watch?v=vwHG9Jfu4sw',
  'barbell-row': 'https://www.youtube.com/watch?v=YcK7pyFXmWk',
  'dumbbell-row': 'https://www.youtube.com/watch?v=dFzUjzfih7k',
  't-bar-row': 'https://www.youtube.com/watch?v=rvbjGSQ2tVE',
  'dumbbell-shrug': 'https://www.youtube.com/watch?v=qvvJUKq7_sU',
  'hyperextension': 'https://www.youtube.com/watch?v=qw1fAjGNFOY',
  'dumbbell-pullover': 'https://www.youtube.com/watch?v=tpLnfSQJ0gg',

  // LEGS
  'back-squat': 'https://www.youtube.com/watch?v=irA7MTz96ho',
  'goblet-squat': 'https://www.youtube.com/watch?v=BR4tlEE_A98',
  'leg-press': 'https://www.youtube.com/watch?v=ETOAyWM6i6A',
  'bulgarian-split-squat': 'https://www.youtube.com/watch?v=DeCnHqrN22U',
  'dumbbell-lunge': 'https://www.youtube.com/watch?v=I_rMQRrwseI',
  'rdl-barbell': 'https://www.youtube.com/watch?v=8-Ss0IrmCNo',
  'rdl-dumbbell': 'https://www.youtube.com/watch?v=aa57T45iFSE',
  'deadlift-conventional': 'https://www.youtube.com/watch?v=GxsLrTzyGUU',
  'deadlift-sumo': 'https://www.youtube.com/watch?v=XsrD5y8EIKU',
  'leg-curl': 'https://www.youtube.com/watch?v=3gZm9wGTsEo',
  'leg-extension': 'https://www.youtube.com/watch?v=hdpz7kKCHvE',
  'calf-raise-standing': 'https://www.youtube.com/watch?v=97NbelB5yvQ',
  'hip-thrust': 'https://www.youtube.com/watch?v=Zp26q4BY5HE',

  // SHOULDERS
  'dumbbell-shoulder-press-neutral': 'https://www.youtube.com/watch?v=1WOecdL8nrI',
  'ohp-barbell': 'https://www.youtube.com/watch?v=bMksDb5a3P0',
  'arnold-press': 'https://www.youtube.com/watch?v=6Z15_WdXmVw',
  'lateral-raise': 'https://www.youtube.com/watch?v=Y29xKcze8Ik',
  'rear-delt-fly': 'https://www.youtube.com/watch?v=pOvCrUhW1Nw',
  'face-pull': 'https://www.youtube.com/watch?v=eTCBSFlCJ_s',
  'band-pull-apart': 'https://www.youtube.com/watch?v=D-3bRfprMGI',
  'external-rotation-band': 'https://www.youtube.com/watch?v=ybNV36DoRfY',

  // ARMS
  'dumbbell-curl': 'https://www.youtube.com/watch?v=6DeLZ6cbgWQ',
  'barbell-curl': 'https://www.youtube.com/watch?v=QZEqB6wUPxQ',
  'hammer-curl': 'https://www.youtube.com/watch?v=Tvvq8KpzyMY',
  'skullcrusher': 'https://www.youtube.com/watch?v=tj81tVq3wLo',
  'cable-triceps-pushdown': 'https://www.youtube.com/watch?v=_w-HpW70nSQ',
  'dip-triceps': 'https://www.youtube.com/watch?v=J3WYrjNDLI4',

  // CORE
  'plank': 'https://www.youtube.com/watch?v=A2b2EmIg0dA',
  'side-plank': 'https://www.youtube.com/watch?v=iNbH7_edNI8',
  'crunch': 'https://www.youtube.com/watch?v=tnZNcIqhGb0',
  'hanging-leg-raise': 'https://www.youtube.com/watch?v=rbOJSK07AGA',
  'pallof-press': 'https://www.youtube.com/watch?v=SsQWYNxlYsQ',
  'bicycle-crunch': 'https://www.youtube.com/watch?v=1we3bh9uhqY',
};

// Применяем ссылки к банку
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
