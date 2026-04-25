/**
 * app-v2.js — расширение Alpine-компонента gymTracker для v2.
 *
 * Не трогаем app.js напрямую — подменяем window.gymTracker обёрткой,
 * которая возвращает старый объект + новое state/методы.
 *
 * Добавляет:
 *   - init с вызовом Storage.init() и установкой активной программы по умолчанию
 *   - экраны 'programs', 'bank'
 *   - поиск/фильтр по банку упражнений
 *   - просмотр/редактирование активной программы (MVP — только просмотр в этой итерации)
 */
(function () {
  const originalGymTracker = window.gymTracker;
  if (typeof originalGymTracker !== 'function') {
    console.error('app-v2.js: window.gymTracker not found — нарушен порядок скриптов');
    return;
  }

  // Inline SVG иконки (Lucide в динамических местах даёт дублирующиеся узлы,
  // т.к. createIcons() заменяет <i> на <svg> и Alpine теряет контроль).
  // Эти — вставляются через x-html, Alpine управляет строкой целиком.
  const ICON_PATHS = {
    'play-circle': '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
    'play':        '<polygon points="6 3 20 12 6 21 6 3"/>',
    'pause':       '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
    'x':           '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    'search':      '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    'dumbbell':    '<path d="M14.4 14.4L9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829l2.828-2.828a2 2 0 1 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829z"/>',
    'activity':    '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  };

  function makeIconSvg(name, extraClass) {
    const body = ICON_PATHS[name] || '';
    const cls = 'w-5 h-5 ' + (extraClass || '');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="${cls}">${body}</svg>`;
  }
  window.makeIconSvg = makeIconSvg;

  window.gymTracker = function gymTrackerV2() {
    const base = originalGymTracker();
    const originalInit = base.init;

    base.iconSvg = function (name, extraClass) { return makeIconSvg(name, extraClass); };

    // ===== App update / версия =====
    base.appVersion = 'v11';
    base.appBuildDate = '2026-04-25';
    base.updateAvailable = false;
    base.updateInProgress = false;

    base.forceUpdate = async function () {
      this.updateInProgress = true;
      try {
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            await reg.update();
            if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
          }
        }
        // Жёсткая перезагрузка с чисткой кеша
        if (window.caches && caches.keys) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
      } catch (e) {
        console.warn('forceUpdate:', e);
      }
      // Перезагрузка страницы без кэша
      setTimeout(() => window.location.reload(), 200);
    };

    base.applyUpdate = function () {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg && reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
          else window.location.reload();
        });
      } else {
        window.location.reload();
      }
    };

    base.dismissUpdate = function () {
      this.updateAvailable = false;
    };

    // ===== Резервная копия (Backup / Restore) =====
    base.backupStatus = '';

    base.exportData = function () {
      try {
        if (!window.Storage || !Storage.exportAll) {
          this.backupStatus = '⚠️ storage не загружен';
          return;
        }
        const data = Storage.exportAll();
        const text = JSON.stringify(data, null, 2);
        const blob = new Blob([text], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
        a.href = url;
        a.download = `gymbro-backup-${ts}.json`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        const workoutsCount = (Storage.getWorkouts() || []).length;
        this.backupStatus = `✓ Скачано: ${workoutsCount} тренировок, ${Object.keys(data.keys).length} ключей`;
        setTimeout(() => { this.backupStatus = ''; }, 6000);
      } catch (e) {
        console.error('exportData failed', e);
        this.backupStatus = '⚠️ Ошибка экспорта: ' + e.message;
      }
    };

    base.importDataFromFile = async function (event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        if (!payload || !payload.keys) {
          this.backupStatus = '⚠️ Файл не похож на бэкап GymBro';
          return;
        }
        const mode = confirm(
          `Восстановить из «${file.name}»?\n\n` +
          `OK = ОБЪЕДИНИТЬ (добавить новые тренировки/программы/трекеры; настройки перезаписать)\n` +
          `Cancel = только добавить если файл выглядит корректно`
        ) ? 'merge' : null;
        if (!mode) return;
        const res = Storage.importAll(payload, { mode });
        this.backupStatus = `✓ Импортировано: добавлено ${res.added || 0}, обновлено ${res.updated || 0}`;
        // Перечитать всё
        this.reloadV2State();
        if (typeof this.loadData === 'function') this.loadData();
        setTimeout(() => { this.backupStatus = ''; }, 8000);
      } catch (e) {
        console.error('import failed', e);
        this.backupStatus = '⚠️ Ошибка импорта: ' + e.message;
      } finally {
        event.target.value = '';
      }
    };

    base.replaceFromFile = async function (event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      if (!confirm('⚠️ ВНИМАНИЕ: режим «заменить» полностью сотрёт текущие данные и запишет содержимое файла. Продолжить?')) {
        event.target.value = '';
        return;
      }
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        if (!payload || !payload.keys) {
          this.backupStatus = '⚠️ Файл не похож на бэкап GymBro';
          return;
        }
        Storage.importAll(payload, { mode: 'replace' });
        this.backupStatus = '✓ Восстановлено из бэкапа. Перезагружаем...';
        setTimeout(() => window.location.reload(), 800);
      } catch (e) {
        console.error('replace failed', e);
        this.backupStatus = '⚠️ Ошибка: ' + e.message;
      } finally {
        event.target.value = '';
      }
    };

    base.hasV1Backup = function () {
      try { return !!localStorage.getItem('gym_backup_v1'); } catch (e) { return false; }
    };

    base.restoreFromV1Backup = function () {
      try {
        const raw = localStorage.getItem('gym_backup_v1');
        if (!raw) {
          this.backupStatus = '⚠️ Авто-бэкап v1 не найден';
          return;
        }
        const backup = JSON.parse(raw);
        if (!confirm('Восстановить данные из автоматического бэкапа v1? Текущие тренировки будут объединены со старыми.')) return;
        const keysCount = Object.keys(backup).filter(k => k !== '_backedUpAt').length;
        // Превращаем backup-формат (key → raw JSON string) в payload для importAll
        const payload = { _meta: { app: 'GymBro v1 backup' }, keys: {} };
        for (const [k, v] of Object.entries(backup)) {
          if (k === '_backedUpAt') continue;
          payload.keys[k] = typeof v === 'string' ? v : JSON.stringify(v);
        }
        const res = Storage.importAll(payload, { mode: 'merge' });
        this.backupStatus = `✓ Из v1: добавлено ${res.added || 0}, обновлено ${res.updated || 0} (из ${keysCount} ключей)`;
        this.reloadV2State();
        if (typeof this.loadData === 'function') this.loadData();
        setTimeout(() => { this.backupStatus = ''; }, 8000);
      } catch (e) {
        this.backupStatus = '⚠️ Ошибка восстановления v1: ' + e.message;
      }
    };

    // ===== Подбор шаблона тренировки (заменяет старый select-workout) =====
    base.goPickTemplate = function () {
      this.reloadV2State();
      this.page = 'pick-template';
    };

    // Возвращает уникальные шаблоны из активной программы + сегодняшний план первым
    base.getProgramTemplatesForPicker = function () {
      const out = [];
      const seen = new Set();
      // Сегодня по плану — первым
      if (this.todayPlanV2 && !this.todayPlanV2.isRest && this.todayPlanV2.template) {
        out.push({ ...this.todayPlanV2.template, _isToday: true });
        seen.add(this.todayPlanV2.template.id);
      }
      // Из активной программы — уникальные шаблоны недельной сетки
      if (this.activeProgram && this.activeProgram.week) {
        for (const dayKey of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
          const id = this.activeProgram.week[dayKey];
          if (id && !seen.has(id)) {
            const t = (window.PROGRAMS && PROGRAMS.getTemplateById) ? PROGRAMS.getTemplateById(id) : null;
            if (t) { out.push(t); seen.add(t.id); }
          }
        }
      }
      return out;
    };

    base.getOtherTemplatesForPicker = function () {
      const inProgram = new Set();
      if (this.activeProgram && this.activeProgram.week) {
        for (const dayKey of ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']) {
          const id = this.activeProgram.week[dayKey];
          if (id) inProgram.add(id);
        }
      }
      return (this.templates || []).filter(t => !inProgram.has(t.id));
    };

    // ===== Unilateral / стороны тела =====
    base.formatSideLabel = function (item) {
      if (!item || !item._side) return '';
      const kind = item._unilateral || 'side';
      const map = {
        leg:  { left: 'Левая нога', right: 'Правая нога' },
        arm:  { left: 'Левая рука', right: 'Правая рука' },
        side: { left: 'Левая сторона', right: 'Правая сторона' },
      };
      return (map[kind] || map.side)[item._side] || '';
    };

    // ===== iOS / vibration capability =====
    base.isIOS = function () {
      const ua = navigator.userAgent || '';
      return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    };

    base.isStandalonePWA = function () {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    };

    base.vibrationSupported = function () {
      // Apple WebKit имеет navigator.vibrate как undefined, поэтому простая проверка работает
      return typeof navigator.vibrate === 'function';
    };

    base.testVibration = function () {
      if (!this.vibrationSupported()) {
        alert(
          'На этом устройстве вибрация в вебе не поддерживается.\n\n' +
          (this.isIOS() ? 'iOS Safari и PWA на Home Screen не имеют доступа к Vibration API — это ограничение Apple, не зависит от настроек.\n\nИспользуй звук — он работает.' : 'Возможно браузер не поддерживает Vibration API.')
        );
        return;
      }
      try { navigator.vibrate([200, 80, 200]); } catch (e) {}
      this.backupStatus = '✓ Вибрация послана: ' + (navigator.vibrate ? 'OK' : 'нет');
      setTimeout(() => { this.backupStatus = ''; }, 3000);
    };

    base.getStorageOriginLabel = function () {
      const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
      const ua = navigator.userAgent || '';
      const isTelegram = /Telegram/.test(ua) || (window.Telegram && window.Telegram.WebApp);
      if (isTelegram) return 'Telegram WebView';
      if (isStandalone) return 'PWA на Home Screen';
      return 'Браузер';
    };

    // ====== НОВОЕ STATE ======
    base.v2Ready = false;

    // Банк
    base.bankQuery = '';
    base.bankFilterMuscle = '';
    base.bankFilterEquipment = '';
    base.bankShoulderOnly = false;
    base.bankLevel = '';
    base.bankSelectedId = null; // выбранное упражнение для детали

    // Программы
    base.programsList = [];
    base.activeProgram = null;
    base.templates = [];
    base.todayPlanV2 = null; // { date, dayKey, template, isRest, program }

    // Предустановленный выбор экрана: для Plan/Workout из программы
    base.selectedTemplateId = null;

    // Трекеры
    base.trackersList = [];
    base.trackerSelectedId = null;
    base.newTrackerForm = { name: '', type: 'daily_binary', icon: '✅' };
    base.showNewTrackerForm = false;

    // Inline YouTube player — id упражнения, для которого открыт встроенный плеер
    base.inlineVideoExerciseId = null;

    // ===== Workflow v2: Energy-pre + новая тренировка =====
    base.energyPreTemplateId = null; // шаблон, который сейчас прогоняем через energy-pre
    base.energyPre = 6;              // 1..10
    base.energyTags = {
      shoulderPain: false,
      kneePain: false,
      backPain: false,
      lowSleep: false,
      stressed: false,
      fullEnergy: false,
      lowTime: false,
    };
    base.energyAdjustments = []; // визуализация применённых правил

    // Активная сессия v2
    base.session2 = null;
    /* session2 shape:
       { templateId, programId, startedAt, energyPre, tags,
         items: [...adjusted items, добавляем поля:],
         currentItemIndex, currentSetIndex,
         sets: [{ exerciseId, setIndex, weight, reps, timeSec, timestamp, skipped?, reason? }] }
    */

    // Active set draft (то, что пользователь сейчас вводит)
    base.draftWeight = 0;
    base.draftReps = 0;
    base.draftTimeSec = 0;

    // Внутренний секундомер для time-based упражнений
    base.workTimer = { running: false, startedAt: 0, pausedSec: 0, intervalId: null };

    // Замена упражнения
    base.replaceItemIndex = null;     // индекс item в session2.items
    base.replaceSearchQuery = '';
    base.replaceShoulderOnly = false; // фильтр

    // Завершение тренировки v2
    base.moodPost2 = 7;
    base.notes2 = '';
    base.lastSavedPRs = [];

    // ====== ИНИЦИАЛИЗАЦИЯ ======
    base.init = function () {
      try {
        if (window.Storage && Storage.init) Storage.init();
        if (window.PROGRAMS && PROGRAMS.ensureDefaultProgram) PROGRAMS.ensureDefaultProgram();
      } catch (e) {
        console.error('v2 bootstrap failed', e);
      }
      originalInit.call(this);
      this.reloadV2State();
      this.v2Ready = true;

      // Unlock Web Audio при первом тапе/клике (нужно для iOS)
      const onceUnlock = () => {
        if (window.GymTimer && GymTimer.unlockAudio) GymTimer.unlockAudio();
        document.removeEventListener('click', onceUnlock);
        document.removeEventListener('touchstart', onceUnlock);
      };
      document.addEventListener('click', onceUnlock, { once: true });
      document.addEventListener('touchstart', onceUnlock, { once: true });

      // Подписываемся на событие доступного обновления SW
      const self = this;
      document.addEventListener('app-update-available', () => {
        self.updateAvailable = true;
      });

      console.log('🚀 app-v2 ready');
    };

    base.reloadV2State = function () {
      if (!window.Storage) return;
      this.programsList = Storage.getPrograms();
      this.activeProgram = Storage.getActiveProgram();
      this.templates = (window.PROGRAMS && PROGRAMS.getAllTemplates) ? PROGRAMS.getAllTemplates() : [];
      this.todayPlanV2 = (window.PROGRAMS && PROGRAMS.getPlanForDate) ? PROGRAMS.getPlanForDate(new Date()) : null;
      this.trackersList = Storage.getTrackers();
      this.settings = Storage.getSettings();
    };

    // ====== НАВИГАЦИЯ ======
    base.goPrograms = function () {
      this.reloadV2State();
      this.page = 'programs';
    };
    base.goBank = function () {
      this.bankSelectedId = null;
      this.page = 'bank';
    };

    // ====== БАНК: вспомогательные ======
    base.getAllMuscleGroups = function () {
      return (window.getMuscleGroups && getMuscleGroups()) || [];
    };
    base.getAllEquipment = function () {
      return (window.getEquipmentTypes && getEquipmentTypes()) || [];
    };
    base.filteredBank = function () {
      if (!window.searchExercises) return [];
      return searchExercises({
        query: this.bankQuery,
        muscle: this.bankFilterMuscle || null,
        equipment: this.bankFilterEquipment || null,
        shoulderFriendlyOnly: !!this.bankShoulderOnly,
        level: this.bankLevel || null,
      });
    };
    base.selectBankExercise = function (id) {
      this.bankSelectedId = id;
    };
    base.getSelectedExercise = function () {
      if (!this.bankSelectedId) return null;
      return (window.Storage && Storage.getExerciseMerged) ? Storage.getExerciseMerged(this.bankSelectedId) : null;
    };
    base.getExerciseVideoUrlV2 = function (ex) {
      if (!ex) return '';
      return (window.getExerciseVideoUrl && getExerciseVideoUrl(ex)) || '';
    };

    // Извлечение video ID из любого формата YouTube URL
    base.extractYouTubeId = function (url) {
      if (!url || typeof url !== 'string') return null;
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /[?&]v=([a-zA-Z0-9_-]{11})/,
      ];
      for (const re of patterns) {
        const m = url.match(re);
        if (m) return m[1];
      }
      return null;
    };

    // Embed URL (для iframe) или null если URL — это search-страница
    base.getExerciseEmbedUrl = function (ex) {
      if (!ex) return null;
      const userUrl = ex.videoUrl;
      if (!userUrl) return null; // если есть только search-link — embed не делаем
      const id = this.extractYouTubeId(userUrl);
      if (!id) return null;
      return 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1';
    };

    // Поисковый URL — на случай если embed недоступен
    base.getExerciseSearchUrl = function (ex) {
      if (!ex) return '';
      if (ex.videoSearchQuery) {
        return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(ex.videoSearchQuery);
      }
      return '';
    };

    base.toggleInlineVideo = function (exerciseId) {
      this.inlineVideoExerciseId = (this.inlineVideoExerciseId === exerciseId) ? null : exerciseId;
    };

    base.closeInlineVideo = function () {
      this.inlineVideoExerciseId = null;
    };

    base.isInlineVideoOpen = function (exerciseId) {
      return this.inlineVideoExerciseId === exerciseId;
    };

    // ============ Workflow v2: переходы ============
    base.includePrehab = false; // чекбокс «добавить prehab плеч в начало»

    base.openEnergyPre = function (templateId) {
      this.energyPreTemplateId = templateId;
      this.energyPre = 6;
      this.energyTags = {
        shoulderPain: false, kneePain: false, backPain: false,
        lowSleep: false, stressed: false, fullEnergy: false, lowTime: false,
      };
      // Авто-включаем prehab если шаблон содержит верх тела (по умолчанию true для основных тренировок,
      // false для утренней зарядки и самого prehab)
      const t = (window.PROGRAMS && PROGRAMS.getTemplateById) ? PROGRAMS.getTemplateById(templateId) : null;
      const isPrehabTpl = t && (t.isPrehab || templateId === (window.PROGRAMS && PROGRAMS.PREHAB_TEMPLATE_ID));
      const isMorningTpl = t && (t.isMorning || templateId === (window.PROGRAMS && PROGRAMS.MORNING_TEMPLATE_ID));
      this.includePrehab = !isPrehabTpl && !isMorningTpl;
      this.energyAdjustments = [];
      this.recomputeEnergyPreview();
      this.page = 'energy-pre';
    };

    // При включении тэга shoulderPain — авто-включаем prehab
    base.onTagChange = function (key, value) {
      this.energyTags[key] = value;
      if (key === 'shoulderPain' && value) this.includePrehab = true;
      this.recomputeEnergyPreview();
    };

    base.recomputeEnergyPreview = function () {
      const t = (window.PROGRAMS && PROGRAMS.getTemplateById) ? PROGRAMS.getTemplateById(this.energyPreTemplateId) : null;
      if (!t || !window.EnergyRules) {
        this.energyAdjustments = [];
        return;
      }
      const res = EnergyRules.applyEnergyRules({
        items: t.items.map(i => ({ ...i })),
        energy: this.energyPre,
        tags: this.energyTags,
      });
      this.energyAdjustments = res.adjustments;
    };

    base.startWorkoutFromEnergy = function () {
      const t = (window.PROGRAMS && PROGRAMS.getTemplateById) ? PROGRAMS.getTemplateById(this.energyPreTemplateId) : null;
      if (!t) return;

      // Базовые items + опционально prehab в начало
      let baseItems = t.items.map(i => ({ ...i }));
      if (this.includePrehab && window.PROGRAMS && PROGRAMS.PREHAB_TEMPLATE) {
        const prehabItems = PROGRAMS.PREHAB_TEMPLATE.items.map(i => ({ ...i, _isPrehab: true }));
        baseItems = prehabItems.concat(baseItems);
      }

      const adjusted = window.EnergyRules
        ? EnergyRules.applyEnergyRules({
            items: baseItems,
            energy: this.energyPre,
            tags: this.energyTags,
          })
        : { items: baseItems, adjustments: [] };

      // Применяем подсказки прогрессии (если есть история)
      let itemsWithSuggestions = adjusted.items.map(it => {
        if (!window.Progression) return it;
        const sug = Progression.suggestNext(it);
        return {
          ...it,
          weight: (sug && typeof sug.weight === 'number') ? sug.weight : it.weight,
          reps: (sug && typeof sug.reps === 'number') ? sug.reps : it.reps,
          timeSec: (sug && typeof sug.timeSec === 'number') ? sug.timeSec : it.timeSec,
          _hint: sug?.hint || null,
        };
      });

      // Удвоение односторонних упражнений (unilateral): одна сторона за другой
      const expanded = [];
      for (const it of itemsWithSuggestions) {
        const ex = (window.EXERCISE_BY_ID || {})[it.exerciseId];
        if (ex && ex.unilateral) {
          expanded.push({ ...it, _side: 'left',  _unilateral: ex.unilateral });
          expanded.push({ ...it, _side: 'right', _unilateral: ex.unilateral });
        } else {
          expanded.push(it);
        }
      }
      itemsWithSuggestions = expanded;

      this.session2 = {
        templateId: this.energyPreTemplateId,
        templateName: t.name,
        programId: this.activeProgram?.id || null,
        startedAt: new Date().toISOString(),
        energyPre: this.energyPre,
        tags: { ...this.energyTags },
        adjustments: adjusted.adjustments,
        items: itemsWithSuggestions,
        currentItemIndex: 0,
        currentSetIndex: 0, // 0..(item.sets-1)
        sets: [],
      };
      this.loadDraftFromCurrentItem();
      this.page = 'workout-v2';

      // unlock audio для будущего таймера
      if (window.GymTimer && window.GymTimer.unlockAudio) window.GymTimer.unlockAudio();
      if (this.settings && this.settings.wakeLockOnWorkout !== false) {
        if (window.GymTimer && window.GymTimer.requestWakeLock) window.GymTimer.requestWakeLock();
      }
    };

    // ============ Workflow v2: текущее упражнение ============
    base.currentItem2 = function () {
      if (!this.session2) return null;
      return this.session2.items[this.session2.currentItemIndex] || null;
    };

    base.currentExercise2 = function () {
      const it = this.currentItem2();
      if (!it) return null;
      return (window.Storage && Storage.getExerciseMerged) ? Storage.getExerciseMerged(it.exerciseId) : null;
    };

    base.currentExerciseType2 = function () {
      const ex = this.currentExercise2();
      return ex ? ex.type : 'weighted_reps';
    };

    base.loadDraftFromCurrentItem = function () {
      const it = this.currentItem2();
      if (!it) return;
      this.draftWeight = typeof it.weight === 'number' ? it.weight : 0;
      this.draftReps = typeof it.reps === 'number' ? it.reps : 0;
      this.draftTimeSec = typeof it.timeSec === 'number' ? it.timeSec : 0;
      this._workTimerStarted = false;
      this._workTimerCompleted = false;
      this.stopWorkTimer();
    };

    base.totalSetsForCurrentItem = function () {
      const it = this.currentItem2();
      return it ? (it.sets || 0) : 0;
    };

    base.completedSetsForCurrentItem = function () {
      if (!this.session2) return 0;
      const idx = this.session2.currentItemIndex;
      return this.session2.sets.filter(s => s.itemIndex === idx && !s.skipped).length;
    };

    // ============ Запись подхода ============
    base.recordSet2 = function () {
      if (!this.session2) return;
      const it = this.currentItem2();
      const ex = this.currentExercise2();
      if (!it || !ex) return;

      const setRecord = {
        itemIndex: this.session2.currentItemIndex,
        setIndex: this.session2.currentSetIndex,
        exerciseId: it.exerciseId,
        exerciseName: ex.name,
        timestamp: new Date().toISOString(),
      };
      if (it._side) setRecord.side = it._side;
      if (ex.type === 'weighted_reps') {
        setRecord.weight = Number(this.draftWeight) || 0;
        setRecord.reps = Number(this.draftReps) || 0;
      } else if (ex.type === 'bodyweight_reps') {
        setRecord.reps = Number(this.draftReps) || 0;
      } else if (ex.type === 'time_only' || ex.type === 'weighted_time') {
        // draftTimeSec идёт вниз от target к 0 — считаем фактически простоянное время
        const target = Number(it.timeSec) || 0;
        let heldSec;
        if (this._workTimerCompleted) {
          heldSec = target; // дошли до 0 — засчитываем target полностью
        } else if (this._workTimerStarted) {
          heldSec = Math.max(0, target - Number(this.draftTimeSec || 0));
        } else {
          heldSec = target; // таймер не запускали — считаем что выполнил (ввёл вручную или сразу записал)
        }
        setRecord.timeSec = heldSec;
        if (ex.type === 'weighted_time') setRecord.weight = Number(this.draftWeight) || 0;
      } else {
        setRecord.reps = Number(this.draftReps) || 0;
      }
      this.session2.sets.push(setRecord);

      // Двигаем счётчик подхода
      const total = this.totalSetsForCurrentItem();
      const done = this.completedSetsForCurrentItem();
      if (done >= total) {
        // Этот item закончен → отдых на следующее упражнение
        this.startRestV2('exercise');
      } else {
        // Ещё подходы остались → отдых между подходами
        this.session2.currentSetIndex++;
        this.startRestV2('set');
      }
    };

    base.skipSetOrItem = function () {
      if (!this.session2) return;
      this.session2.sets.push({
        itemIndex: this.session2.currentItemIndex,
        setIndex: this.session2.currentSetIndex,
        exerciseId: this.currentItem2().exerciseId,
        exerciseName: this.currentExercise2()?.name || '',
        timestamp: new Date().toISOString(),
        skipped: true,
        reason: 'manual',
      });
      // Перейти к следующему упражнению
      this.advanceToNextItem();
    };

    base.advanceToNextItem = function () {
      if (!this.session2) return;
      const next = this.session2.currentItemIndex + 1;
      if (next >= this.session2.items.length) {
        // Тренировка завершена
        this.stopWorkTimer();
        this.moodPost2 = 7;
        this.notes2 = '';
        this.page = 'workout-complete-v2';
      } else {
        this.session2.currentItemIndex = next;
        this.session2.currentSetIndex = 0;
        this.loadDraftFromCurrentItem();
        this.page = 'workout-v2';
      }
    };

    // ============ Отдых v2 (Web Audio + Vibration + drift-free) ============
    base.restRemaining2 = 0;
    base.restType2 = 'set';
    base.restTotal2 = 0;
    base._restController = null;

    base.startRestV2 = function (type) {
      this.stopRestV2();
      const it = this.currentItem2();
      const settings = (window.Storage && Storage.getSettings) ? Storage.getSettings() : { defaultRestSetSec: 60, defaultRestExerciseSec: 120 };
      const sec = type === 'exercise'
        ? (it?.restSec ? Math.max(it.restSec, settings.defaultRestExerciseSec) : settings.defaultRestExerciseSec)
        : (it?.restSec || settings.defaultRestSetSec);
      this.restRemaining2 = sec;
      this.restTotal2 = sec;
      this.restType2 = type;
      this.page = 'rest-v2';

      const self = this;
      if (window.GymTimer && GymTimer.createRestTimer) {
        // Бип старта — короткий низкий
        if (settings.sound !== false) {
          GymTimer.beep({ freq: (settings.beepFreqHz || 880) - 220, durationMs: 80, gain: 0.10 });
        }
        this._restController = GymTimer.createRestTimer({
          durationSec: sec,
          onTick: (s) => {
            self.restRemaining2 = s;
            self.restTotal2 = self._restController ? self._restController.getTotalSec() : sec;
          },
          onWarn3: () => {
            // визуальный пульс — отрабатывается классом, ничего не нужно
          },
          onEnd: () => {
            self._restController = null;
            self.endRestV2();
          },
        });
        this._restController.start();
      } else {
        // Fallback на setInterval (если timer.js не загружен)
        this._restController = { _i: setInterval(() => {
          self.restRemaining2--;
          if (self.restRemaining2 <= 0) {
            clearInterval(self._restController._i);
            self._restController = null;
            self.endRestV2();
          }
        }, 1000), cancel() { clearInterval(this._i); }, add(s) { /* no-op */ } };
      }
    };

    base.stopRestV2 = function () {
      if (this._restController) {
        try { this._restController.cancel(); } catch (e) {}
        this._restController = null;
      }
    };

    base.skipRestV2 = function () {
      this.stopRestV2();
      this.endRestV2();
    };

    base.addRestSec = function (delta) {
      if (this._restController && this._restController.add) {
        this._restController.add(delta);
        // обновим визуально сразу
        if (this._restController.getRemainingSec) {
          this.restRemaining2 = this._restController.getRemainingSec();
          this.restTotal2 = this._restController.getTotalSec();
        }
      } else {
        this.restRemaining2 = Math.max(1, this.restRemaining2 + delta);
      }
    };

    base.restProgressPct = function () {
      if (!this.restTotal2) return 0;
      return Math.max(0, Math.min(100, ((this.restTotal2 - this.restRemaining2) / this.restTotal2) * 100));
    };

    base.endRestV2 = function () {
      if (this.restType2 === 'exercise') {
        this.advanceToNextItem();
      } else {
        this.page = 'workout-v2';
      }
    };

    // ============ НАСТРОЙКИ ============
    base.settings = { sound: true, vibration: true, defaultRestSetSec: 60, defaultRestExerciseSec: 120, beepFreqHz: 880, wakeLockOnWorkout: true };
    base.loadSettings = function () {
      if (window.Storage && Storage.getSettings) {
        this.settings = Storage.getSettings();
      }
    };
    base.saveSettings = function () {
      if (window.Storage && Storage.saveSettings) {
        Storage.saveSettings({ ...this.settings });
      }
    };
    base.testBeep = function () {
      if (window.GymTimer) {
        GymTimer.unlockAudio();
        GymTimer.beep({ freq: this.settings.beepFreqHz || 880, durationMs: 350, gain: 0.18 });
        if (this.settings.vibration) GymTimer.vibrate([200, 80, 200]);
      }
    };
    base.goSettings = function () {
      this.loadSettings();
      this.page = 'settings';
    };

    // Unlock audio при первом тапе на body — нужно для iOS
    base.unlockAudioOnce = function () {
      if (window.GymTimer && GymTimer.unlockAudio) GymTimer.unlockAudio();
    };

    // ============ Time-only / weighted_time секундомер (countdown от target к 0) ============
    // draftTimeSec показывает СКОЛЬКО ОСТАЛОСЬ (идёт вниз). Изначально = item.timeSec (target).
    // При записи подхода фактически простоянное время = targetTime - draftTimeSec.
    // Если таймер ни разу не запускался (_workTimerStarted = false) — считаем что выполнил target полностью.

    base.startWorkTimer = function () {
      this.stopWorkTimer();
      const self = this;
      const settings = (window.Storage && Storage.getSettings) ? Storage.getSettings() : { sound: true, vibration: true, beepFreqHz: 880 };

      // Бип старта
      if (settings.sound !== false && window.GymTimer) {
        GymTimer.beep({ freq: (settings.beepFreqHz || 880) - 220, durationMs: 80, gain: 0.10 });
      }

      this.workTimer.running = true;
      this._workTimerStarted = true;

      // Запускаем с текущего значения draftTimeSec (может быть неполный target после паузы)
      const startVal = Math.max(0, Number(this.draftTimeSec) || 0);
      const t0 = performance.now();
      let warned3 = false;

      this.workTimer.intervalId = setInterval(() => {
        const elapsed = (performance.now() - t0) / 1000;
        const remaining = Math.max(0, startVal - elapsed);

        self.draftTimeSec = Math.ceil(remaining);

        // Предупреждение за 3 сек до конца
        if (!warned3 && remaining <= 3 && remaining > 0.3) {
          warned3 = true;
          if (settings.sound !== false && window.GymTimer) {
            GymTimer.beep({ freq: (settings.beepFreqHz || 880) - 220, durationMs: 80, gain: 0.10 });
          }
        }

        // Конец
        if (remaining <= 0) {
          self.stopWorkTimer();
          self.draftTimeSec = 0;
          self._workTimerCompleted = true;
          if (settings.sound !== false && window.GymTimer) {
            GymTimer.beep({ freq: settings.beepFreqHz || 880, durationMs: 350, gain: 0.18 });
          }
          if (settings.vibration !== false && window.GymTimer) {
            GymTimer.vibrate([200, 80, 200]);
          }
        }
      }, 250);
    };

    base.stopWorkTimer = function () {
      if (this.workTimer.intervalId) clearInterval(this.workTimer.intervalId);
      this.workTimer.intervalId = null;
      this.workTimer.running = false;
    };

    base.toggleWorkTimer = function () {
      if (this.workTimer.running) this.stopWorkTimer();
      else this.startWorkTimer();
    };

    base.resetDraftTime = function () {
      this.stopWorkTimer();
      const it = this.currentItem2();
      // Сбрасываем на исходное целевое время упражнения
      this.draftTimeSec = it && typeof it.timeSec === 'number' ? it.timeSec : 0;
      this._workTimerStarted = false;
      this._workTimerCompleted = false;
    };

    // ============ Замена упражнения ============
    base.openReplaceForCurrent = function () {
      this.replaceItemIndex = this.session2 ? this.session2.currentItemIndex : null;
      this.replaceSearchQuery = '';
      this.replaceShoulderOnly = !!(this.session2 && this.session2.tags && this.session2.tags.shoulderPain);
      this.page = 'replace-exercise';
    };

    base.cancelReplace = function () {
      this.replaceItemIndex = null;
      this.page = 'workout-v2';
    };

    base.getReplaceCandidates = function () {
      if (!window.searchExercises) return [];
      const item = this.session2?.items[this.replaceItemIndex];
      const ex = item ? (window.EXERCISE_BY_ID || {})[item.exerciseId] : null;
      // База кандидатов: альтернативы упражнения + результаты поиска
      const altIds = ex?.alts || [];
      const altList = altIds
        .map(id => (window.EXERCISE_BY_ID || {})[id])
        .filter(Boolean);
      const searched = searchExercises({
        query: this.replaceSearchQuery,
        shoulderFriendlyOnly: this.replaceShoulderOnly,
      });
      // Уникализируем, alts наверх
      const seen = new Set();
      const out = [];
      for (const e of altList) {
        if (!seen.has(e.id)) { seen.add(e.id); out.push({ ...e, _alt: true }); }
      }
      for (const e of searched) {
        if (e.id === item?.exerciseId) continue;
        if (!seen.has(e.id)) { seen.add(e.id); out.push(e); }
      }
      return out.slice(0, 50);
    };

    base.confirmReplace = function (newExerciseId) {
      if (!this.session2 || this.replaceItemIndex == null) return;
      const it = this.session2.items[this.replaceItemIndex];
      const fromId = it.exerciseId;
      it._swappedFrom = fromId;
      it.exerciseId = newExerciseId;
      // Сбросим draft для нового упражнения
      const newEx = (window.EXERCISE_BY_ID || {})[newExerciseId];
      if (newEx) {
        // Если стартового веса нет, оставляем как было; reps/time подхватят из item
        if (newEx.type === 'time_only' || newEx.type === 'weighted_time') {
          if (!it.timeSec) it.timeSec = 30;
        }
      }
      this.replaceItemIndex = null;
      this.loadDraftFromCurrentItem();
      this.page = 'workout-v2';
    };

    // ============ Завершение тренировки v2 ============
    base.finishWorkout2 = function () {
      if (!this.session2) return;
      const workout = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        dateISO: new Date().toISOString(),
        startedAt: this.session2.startedAt,
        templateId: this.session2.templateId,
        programId: this.session2.programId,
        type: 'strength_v2',
        name: this.session2.templateName || 'Тренировка',
        energyPre: this.session2.energyPre,
        tags: this.session2.tags,
        adjustments: this.session2.adjustments,
        sets: this.session2.sets,
        moodPost: this.moodPost2,
        mood: this.moodPost2,
        notes: this.notes2,
      };

      if (window.Storage && Storage.saveWorkout) {
        Storage.saveWorkout(workout);
      }

      // PRs
      this.lastSavedPRs = [];
      if (window.Progression && Progression.detectAndSavePRs) {
        this.lastSavedPRs = Progression.detectAndSavePRs(workout);
      }

      // Стрик/неделя
      if (typeof this.recalculateStreak === 'function') this.recalculateStreak();
      if (typeof this.getWeekStart === 'function') this.stats.weekStart = this.getWeekStart();
      if (typeof this.recalculateWeekStats === 'function') this.recalculateWeekStats();
      if (window.Storage && Storage.saveStats) Storage.saveStats(this.stats);
      if (typeof this.loadData === 'function') this.loadData();

      // Сброс
      this.session2 = null;
      this.energyAdjustments = [];
      this.energyPreTemplateId = null;

      // Wake lock release
      if (window.GymTimer && window.GymTimer.releaseWakeLock) window.GymTimer.releaseWakeLock();

      this.page = 'dashboard';
    };

    base.cancelSession2 = function () {
      if (!confirm('Прервать тренировку без сохранения?')) return;
      this.stopWorkTimer();
      this.stopRestV2();
      if (window.GymTimer && window.GymTimer.releaseWakeLock) window.GymTimer.releaseWakeLock();
      this.session2 = null;
      this.energyAdjustments = [];
      this.energyPreTemplateId = null;
      this.page = 'dashboard';
    };

    // ============ Хелперы для UI ============
    base.formatRest = function (sec) {
      const s = Math.max(0, Math.floor(sec));
      const m = Math.floor(s / 60);
      const r = s % 60;
      return m > 0 ? (m + ':' + String(r).padStart(2, '0')) : String(r);
    };

    // ============ Прогресс (графики 1RM / тоннаж) ============
    base.progressExerciseId = null;

    base.goProgress = function () {
      this.progressExerciseId = null;
      this.page = 'progress';
    };

    base.openProgressExercise = function (id) {
      this.progressExerciseId = id;
    };

    base.getExercisesWithHistory = function () {
      if (!window.Storage) return [];
      const ws = Storage.getWorkouts();
      const ids = new Set();
      for (const w of ws) {
        if (!Array.isArray(w.sets)) continue;
        for (const s of w.sets) if (!s.skipped && s.exerciseId) ids.add(s.exerciseId);
      }
      const out = [];
      for (const id of ids) {
        const ex = (window.EXERCISE_BY_ID || {})[id];
        if (!ex) continue;
        const sessions = this.getExerciseSessionData(id);
        out.push({
          id,
          name: ex.name,
          type: ex.type,
          sessionsCount: sessions.length,
          last: sessions[sessions.length - 1] || null,
        });
      }
      return out.sort((a, b) => (b.last?.ts || 0) - (a.last?.ts || 0));
    };

    // По каждой тренировке, где упражнение встречалось, вернуть summary
    base.getExerciseSessionData = function (id) {
      if (!window.Storage) return [];
      const ws = Storage.getWorkouts();
      const out = [];
      for (const w of ws) {
        if (!Array.isArray(w.sets)) continue;
        const sets = w.sets.filter(s => s.exerciseId === id && !s.skipped);
        if (sets.length === 0) continue;
        let best1RM = 0, bestReps = 0, bestTime = 0, tonnage = 0;
        for (const s of sets) {
          const wgt = Number(s.weight) || 0;
          const reps = Number(s.reps) || 0;
          const t = Number(s.timeSec) || 0;
          if (reps > 0) {
            tonnage += wgt * reps;
            if (wgt > 0) {
              const oneRM = (window.Progression && window.Progression.epley1RM) ? window.Progression.epley1RM(wgt, reps) : wgt * (1 + reps / 30);
              if (oneRM > best1RM) best1RM = oneRM;
            }
            if (reps > bestReps) bestReps = reps;
          }
          if (t > bestTime) bestTime = t;
        }
        const d = new Date(w.dateISO || w.date || w.startedAt || Date.now());
        out.push({
          workoutId: w.id,
          ts: d.getTime(),
          date: d,
          dateShort: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
          setsCount: sets.length,
          best1RM: Math.round(best1RM * 10) / 10,
          tonnage: Math.round(tonnage),
          bestReps,
          bestTime,
        });
      }
      return out.sort((a, b) => a.ts - b.ts);
    };

    // Возвращает SVG path-string для линейного графика по указанному полю
    base.buildChart = function (data, field) {
      if (!data || data.length === 0) return { points: '', pathD: '', minY: 0, maxY: 0, ticks: [] };
      const W = 300, H = 120;
      const values = data.map(d => Number(d[field]) || 0);
      const minY = Math.min(0, Math.min(...values));
      const maxY = Math.max(...values);
      const rangeY = (maxY - minY) || 1;
      const stepX = data.length > 1 ? W / (data.length - 1) : 0;
      const pts = data.map((d, i) => {
        const x = i * stepX;
        const y = H - ((d[field] - minY) / rangeY) * (H - 10) - 5;
        return { x, y, raw: d };
      });
      const pointsStr = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const pathD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
      // Ticks: первое и последнее значение + max
      const maxIdx = values.indexOf(maxY);
      const ticks = [
        { x: pts[0].x, y: pts[0].y, label: values[0].toString(), align: 'start' },
        { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, label: values[values.length - 1].toString(), align: 'end' },
      ];
      if (maxIdx !== 0 && maxIdx !== values.length - 1) {
        ticks.push({ x: pts[maxIdx].x, y: pts[maxIdx].y, label: values[maxIdx].toString(), align: 'middle' });
      }
      return { points: pointsStr, pathD, minY, maxY, ticks, W, H, pts };
    };

    base.getProgressExercise = function () {
      if (!this.progressExerciseId) return null;
      return (window.Storage && Storage.getExerciseMerged) ? Storage.getExerciseMerged(this.progressExerciseId) : null;
    };

    base.getProgressPR = function () {
      if (!this.progressExerciseId || !window.Storage) return null;
      const prs = Storage.getPRs();
      return prs[this.progressExerciseId] || null;
    };

    // ============ Labels ============
    base.energyTagsLabels = {
      shoulderPain: '🤕 Плечо',
      kneePain: '🤕 Колено',
      backPain: '🤕 Спина',
      lowSleep: '😴 Мало сна',
      stressed: '😣 Стресс',
      fullEnergy: '⚡ Полон сил',
      lowTime: '⏱ Мало времени',
    };
    base.formatExerciseType = function (type) {
      const map = {
        weighted_reps: 'вес × повторения',
        bodyweight_reps: 'только повторения',
        weighted_time: 'вес × секунды',
        time_only: 'только секунды',
        distance_time: 'дистанция / время',
      };
      return map[type] || type;
    };
    base.formatEquipment = function (eq) {
      const map = {
        barbell: 'Штанга',
        dumbbell: 'Гантели',
        machine: 'Тренажёр',
        cable: 'Блок',
        bodyweight: 'Своё тело',
        band: 'Резинка',
      };
      return map[eq] || eq;
    };
    base.formatMuscle = function (m) {
      const map = {
        chest: 'Грудь', back: 'Спина', lats: 'Широчайшие', mid_back: 'Середина спины',
        traps: 'Трапеции', lower_back: 'Низ спины', quads: 'Квадрицепс', hamstrings: 'Бицепс бедра',
        glutes: 'Ягодицы', calves: 'Икры', front_delt: 'Пер. дельта', side_delt: 'Ср. дельта',
        rear_delt: 'Задн. дельта', triceps: 'Трицепс', biceps: 'Бицепс', forearms: 'Предплечье',
        core: 'Корпус', obliques: 'Косые', hip_flexors: 'Сгибатели бедра',
        rotator_cuff: 'Ротаторы плеча', rhomboids: 'Ромбовидные',
      };
      return map[m] || m;
    };
    base.saveExerciseVideoOverride = function (id, url) {
      if (!window.Storage) return;
      Storage.setExerciseOverride(id, { videoUrl: url });
      // применяем сразу
      const ex = (window.EXERCISE_BY_ID || {})[id];
      if (ex) ex.videoUrl = url;
      console.log('video override saved for', id);
    };

    // ====== ПРОГРАММЫ ======
    base.getTemplateNameById = function (id) {
      const t = (window.PROGRAMS && PROGRAMS.getTemplateById) ? PROGRAMS.getTemplateById(id) : null;
      return t ? t.name : '—';
    };
    base.getTemplateMinutesById = function (id) {
      const t = (window.PROGRAMS && PROGRAMS.getTemplateById) ? PROGRAMS.getTemplateById(id) : null;
      return t ? (t.estimatedMinutes || 0) : 0;
    };
    base.getProgramWeekDays = function (program) {
      if (!program) return [];
      const keys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      const labels = { mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс' };
      return keys.map(k => ({
        key: k,
        label: labels[k],
        templateId: program.week[k] || null,
      }));
    };
    base.setProgramActive = function (programId) {
      if (!window.Storage) return;
      Storage.setActiveProgramId(programId);
      this.reloadV2State();
    };

    // Открыть детали шаблона
    base.openTemplate = function (templateId) {
      this.selectedTemplateId = templateId;
      this.page = 'template-view';
    };

    base.getSelectedTemplate = function () {
      if (!this.selectedTemplateId) return null;
      return (window.PROGRAMS && PROGRAMS.getTemplateById) ? PROGRAMS.getTemplateById(this.selectedTemplateId) : null;
    };

    base.getTemplateItemExercise = function (item) {
      if (!item) return null;
      return (window.Storage && Storage.getExerciseMerged) ? Storage.getExerciseMerged(item.exerciseId) : null;
    };

    // Подсказка следующего веса/повторений для slot шаблона (progression)
    base.getSuggestionForItem = function (item) {
      if (!window.Progression) return null;
      return Progression.suggestNext(item);
    };

    // ====== ТРЕКЕРЫ ======
    base.goTrackers = function () {
      this.reloadV2State();
      this.trackerSelectedId = null;
      this.page = 'trackers';
    };

    base.openTracker = function (id) {
      this.trackerSelectedId = id;
    };

    base.getSelectedTracker = function () {
      if (!this.trackerSelectedId) return null;
      return this.trackersList.find(t => t.id === this.trackerSelectedId) || null;
    };

    base.createTrackerFromForm = function () {
      if (!window.Trackers || !window.Storage) return;
      const name = (this.newTrackerForm.name || '').trim();
      if (!name) return;
      const t = Trackers.createTracker({
        name,
        type: this.newTrackerForm.type || 'daily_binary',
        icon: this.newTrackerForm.icon || '✅',
      });
      Storage.upsertTracker(t);
      this.newTrackerForm = { name: '', type: 'daily_binary', icon: '✅' };
      this.showNewTrackerForm = false;
      this.reloadV2State();
    };

    base.markTrackerToday = function (id, amount) {
      if (!window.Trackers || !window.Storage) return;
      const t = this.trackersList.find(x => x.id === id);
      if (!t) return;
      Trackers.markToday(t, amount != null ? amount : true);
      Storage.upsertTracker(t);
      this.reloadV2State();
      if (this.trackerSelectedId === id) {
        // Перечитываем выбранный
        this.trackerSelectedId = id;
      }
    };

    base.incrementTracker = function (id, delta) {
      if (!window.Trackers || !window.Storage) return;
      const t = this.trackersList.find(x => x.id === id);
      if (!t || t.type !== 'daily_count') return;
      const key = Trackers.todayKey();
      const cur = (t.entries[key] || 0) + delta;
      if (cur <= 0) delete t.entries[key];
      else t.entries[key] = cur;
      Storage.upsertTracker(t);
      this.reloadV2State();
    };

    base.deleteTrackerConfirm = function (id) {
      if (!confirm('Удалить трекер и всю его историю?')) return;
      if (!window.Storage) return;
      Storage.deleteTracker(id);
      if (this.trackerSelectedId === id) this.trackerSelectedId = null;
      this.reloadV2State();
    };

    base.getTrackerStreak = function (t) {
      return (window.Trackers && Trackers.getCurrentStreak(t)) || 0;
    };
    base.getTrackerBest = function (t) {
      return (window.Trackers && Trackers.getBestStreak(t)) || 0;
    };
    base.getTrackerTotal = function (t) {
      return (window.Trackers && Trackers.getTotalDays(t)) || 0;
    };
    base.getTrackerTotalCount = function (t) {
      return (window.Trackers && Trackers.getTotalCount(t)) || 0;
    };
    base.getTrackerBadges = function (t) {
      return (window.Trackers && Trackers.getEarnedBadges(t)) || [];
    };
    base.getTrackerNextBadge = function (t) {
      return (window.Trackers && Trackers.getNextBadge(t)) || null;
    };
    base.getTrackerYearGrid = function (t) {
      return (window.Trackers && Trackers.getYearGrid(t)) || [];
    };
    base.getTrackerTodayValue = function (t) {
      if (!window.Trackers) return null;
      const key = Trackers.todayKey();
      return t.entries[key] || null;
    };
    base.isTrackerDoneToday = function (t) {
      if (!t) return false;
      const key = (window.Trackers && Trackers.todayKey()) || '';
      return !!t.entries[key];
    };

    return base;
  };

  console.log('📦 app-v2.js loaded (extends gymTracker)');
})();
