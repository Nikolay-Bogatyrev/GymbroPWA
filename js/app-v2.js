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

  window.gymTracker = function gymTrackerV2() {
    const base = originalGymTracker();
    const originalInit = base.init;

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
    base.openEnergyPre = function (templateId) {
      this.energyPreTemplateId = templateId;
      this.energyPre = 6;
      this.energyTags = {
        shoulderPain: false, kneePain: false, backPain: false,
        lowSleep: false, stressed: false, fullEnergy: false, lowTime: false,
      };
      this.energyAdjustments = [];
      this.recomputeEnergyPreview();
      this.page = 'energy-pre';
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
      const adjusted = window.EnergyRules
        ? EnergyRules.applyEnergyRules({
            items: t.items.map(i => ({ ...i })),
            energy: this.energyPre,
            tags: this.energyTags,
          })
        : { items: t.items.slice(), adjustments: [] };

      // Применяем подсказки прогрессии (если есть история)
      const itemsWithSuggestions = adjusted.items.map(it => {
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
      if (ex.type === 'weighted_reps') {
        setRecord.weight = Number(this.draftWeight) || 0;
        setRecord.reps = Number(this.draftReps) || 0;
      } else if (ex.type === 'bodyweight_reps') {
        setRecord.reps = Number(this.draftReps) || 0;
      } else if (ex.type === 'time_only') {
        setRecord.timeSec = Number(this.draftTimeSec) || 0;
      } else if (ex.type === 'weighted_time') {
        setRecord.weight = Number(this.draftWeight) || 0;
        setRecord.timeSec = Number(this.draftTimeSec) || 0;
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

    // ============ Time-only / weighted_time секундомер для draft ============
    base.startWorkTimer = function () {
      this.stopWorkTimer();
      const self = this;
      this.workTimer.running = true;
      this.workTimer.startedAt = performance.now();
      const baseSec = Number(this.draftTimeSec) || 0;
      this.workTimer.intervalId = setInterval(() => {
        const elapsed = (performance.now() - self.workTimer.startedAt) / 1000;
        self.draftTimeSec = Math.round(baseSec + elapsed);
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
      this.draftTimeSec = 0;
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
