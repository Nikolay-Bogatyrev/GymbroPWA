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
      console.log('🚀 app-v2 ready');
    };

    base.reloadV2State = function () {
      if (!window.Storage) return;
      this.programsList = Storage.getPrograms();
      this.activeProgram = Storage.getActiveProgram();
      this.templates = (window.PROGRAMS && PROGRAMS.getAllTemplates) ? PROGRAMS.getAllTemplates() : [];
      this.todayPlanV2 = (window.PROGRAMS && PROGRAMS.getPlanForDate) ? PROGRAMS.getPlanForDate(new Date()) : null;
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

    return base;
  };

  console.log('📦 app-v2.js loaded (extends gymTracker)');
})();
