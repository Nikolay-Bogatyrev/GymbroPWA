/**
 * GymBro PWA - Main Application
 * 
 * ВАЖНО: Этот файл должен загружаться ПОСЛЕ:
 * - js/data.js (WORKOUT_TEMPLATES)
 * - js/storage.js (Storage)
 * - icons/exercises.js (EXERCISE_ICONS)
 */

// ============================================
// FALLBACK DATA (если data.js не загрузился)
// ============================================
const WORKOUT_TEMPLATES_FALLBACK = {
  tuesday: {
    name: 'Upper Body',
    emoji: '💪',
    gradient: 'bg-gradient-to-r from-blue-500 to-blue-600',
    cardio: 30,
    exercises: [
      { id: 'lat_pulldown', name: 'Тяга верхнего блока', sets: 3, reps: 12, icon: 'lat_pulldown', lastWeight: 45, alts: ['Подтягивания'] },
      { id: 'shoulder_press', name: 'Жим от плеч', sets: 3, reps: 12, icon: 'shoulder_press', lastWeight: 10, alts: [] },
      { id: 'cable_row', name: 'Тяга горизонтального блока', sets: 3, reps: 12, icon: 'cable_row', lastWeight: 40, alts: [] },
      { id: 'dumbbell_press', name: 'Жим гантелей', sets: 3, reps: 10, icon: 'dumbbell_press', lastWeight: 12, alts: [] },
      { id: 'bicep_curl', name: 'Подъём на бицепс', sets: 3, reps: 12, icon: 'bicep_curl', lastWeight: 10, alts: [] },
    ]
  },
  thursday: {
    name: 'Lower Body',
    emoji: '🦵',
    gradient: 'bg-gradient-to-r from-green-500 to-green-600',
    cardio: 20,
    exercises: [
      { id: 'leg_press', name: 'Жим ногами', sets: 3, reps: 15, icon: 'leg_press', lastWeight: 100, alts: [] },
      { id: 'romanian_deadlift', name: 'Румынская тяга', sets: 3, reps: 12, icon: 'romanian_deadlift', lastWeight: 16, alts: [] },
      { id: 'leg_extension', name: 'Разгибания ног', sets: 3, reps: 15, icon: 'leg_extension', lastWeight: 35, alts: [] },
      { id: 'leg_curl', name: 'Сгибания ног', sets: 3, reps: 15, icon: 'leg_curl', lastWeight: 30, alts: [] },
    ]
  },
  saturday: {
    name: 'Full Body + Core',
    emoji: '🔥',
    gradient: 'bg-gradient-to-r from-orange-500 to-red-500',
    cardio: 30,
    exercises: [
      { id: 'pull_up', name: 'Подтягивания', sets: 3, reps: 10, icon: 'pull_up', lastWeight: -30, alts: [] },
      { id: 'squat', name: 'Приседания', sets: 3, reps: 12, icon: 'squat', lastWeight: 40, alts: [] },
      { id: 'plank', name: 'Планка', sets: 3, reps: '45 сек', icon: 'plank', lastWeight: 0, alts: [] },
    ]
  }
};

// Безопасное получение шаблонов
function getWorkoutTemplates() {
  if (typeof WORKOUT_TEMPLATES !== 'undefined' && WORKOUT_TEMPLATES && Object.keys(WORKOUT_TEMPLATES).length > 0) {
    console.log('✓ WORKOUT_TEMPLATES loaded from data.js');
    return WORKOUT_TEMPLATES;
  }
  console.warn('⚠️ WORKOUT_TEMPLATES not found, using fallback');
  return WORKOUT_TEMPLATES_FALLBACK;
}

// Безопасное получение иконок (глобальная функция)
function getExerciseIconSafe(iconName) {
  if (typeof EXERCISE_ICONS !== 'undefined' && EXERCISE_ICONS && EXERCISE_ICONS[iconName]) {
    return EXERCISE_ICONS[iconName];
  }
  // Fallback иконка
  return `<svg viewBox="0 0 64 64" class="w-full h-full">
    <rect x="8" y="26" width="48" height="12" fill="white" rx="2"/>
    <rect x="4" y="22" width="8" height="20" fill="white" rx="2"/>
    <rect x="52" y="22" width="8" height="20" fill="white" rx="2"/>
  </svg>`;
}

// ============================================
// MAIN ALPINE COMPONENT
// ============================================
function gymTracker() {
  return {
    // ===== STATE =====
    page: 'dashboard',
    isReady: false,
    
    // Profile (дефолты; можно отредактировать в «Настройках»)
    profile: {
      name: 'Ты',
      age: 30,
      maxHR: 190,
      fatBurnLow: 114,
      fatBurnHigh: 142,
      intervalLow: 152,
      intervalHigh: 171,
    },

    // Stats (ноль на старте; реальные числа подтянутся из Storage)
    stats: {
      streak: 0,
      weekCompleted: 0,
      weekTotal: 7,
      cardioMinutes: 0,
      avgMood: null,
      weekStart: null,
    },
    
    // Workouts - будет заполнено в init()
    workouts: {},
    workoutList: [], // Массив для итерации
    currentWorkout: null,
    currentExerciseIndex: 0,
    
    // Exercise state
    sets: [],
    currentWeight: 20,
    currentReps: 12,
    showAlternatives: false,
    selectedAlt: null,
    
    // Cardio
    isCardioOnly: false,
    cardioData: {
      type: 'treadmill',
      duration: 30,
      podcast: '',
    },
    cardioTypes: [
      { id: 'treadmill', name: 'Дорожка', icon: 'treadmill' },
      { id: 'bike', name: 'Велосипед', icon: 'bike' },
      { id: 'stepper', name: 'Степпер', icon: 'stepper' },
    ],
    
    // Mood
    moodPost: 7,
    moodDay: 7,
    notes: '',
    
    // Recent workouts
    recentWorkouts: [],
    
    // Edit saved workout
    editingWorkout: null,
    
    // Manage exercises (templates)
    managingWorkoutKey: null,
    editingExerciseIndex: -1,
    exerciseForm: { name: '', sets: 3, reps: 12, icon: 'dumbbell', videoUrl: '', alts: [] },
    
    // Rest timer
    restTimer: { secondsLeft: 0, type: 'set', intervalId: null },
    
    // Plan workout (экран перед стартом)
    planWorkoutKey: null,
    inactiveVersion: 0,
    
    // Drag and drop state
    dragState: { dragging: null, over: null },
    
    // Video modal
    videoModalOpen: false,
    videoModalUrl: '',
    
    // ===== COMPUTED =====
    get currentExercise() {
      if (!this.currentWorkout || !this.currentWorkout.exercises) {
        return null;
      }
      return this.currentWorkout.exercises[this.currentExerciseIndex] || null;
    },
    
    get currentExerciseSets() {
      return this.sets.filter(s => s.exerciseIndex === this.currentExerciseIndex);
    },
    
    // ===== INIT =====
    init() {
      console.log('🚀 GymBro initializing...');
      
      // Проверка зависимостей
      const checks = {
        'WORKOUT_TEMPLATES': typeof WORKOUT_TEMPLATES !== 'undefined',
        'EXERCISE_ICONS': typeof EXERCISE_ICONS !== 'undefined',
        'Storage': typeof Storage !== 'undefined'
      };
      console.table(checks);
      Object.entries(checks).forEach(([name, loaded]) => {
        if (!loaded) {
          console.error(`❌ ${name} не загружен! Проверь порядок скриптов.`);
        }
      });
      
      // Загрузка данных тренировок (Storage.getTemplates переопределяет data.js)
      this.workouts = (typeof Storage !== 'undefined' && Storage.getTemplates)
        ? Storage.getTemplates()
        : getWorkoutTemplates();
      
      // Создаём массив для итерации в шаблоне
      this.workoutList = Object.entries(this.workouts).map(([key, value]) => ({
        key,
        ...value
      }));
      
      console.log('📋 workoutList:', this.workoutList.map(w => w.name));
      
      // Загрузка сохранённых данных
      this.loadData();
      
      // Загрузка профиля из localStorage
      if (typeof Storage !== 'undefined' && typeof Storage.getProfile === 'function') {
        const savedProfile = Storage.getProfile();
        if (savedProfile) {
          this.profile = { ...this.profile, ...savedProfile };
        }
      }
      
      // Расчёт пульсовых зон
      this.calculateHRZones();
      
      // Очистка сессии при выходе из тренировки
      if (this.$watch) {
        this.$watch('page', (value) => {
          if ((value === 'dashboard' || value === 'select-workout') && typeof Storage !== 'undefined' && Storage.clearSession) {
            Storage.clearSession();
          }
        });
      }
      
      // Сохранение сессии при закрытии/перезагрузке
      window.addEventListener('beforeunload', () => this.saveSession());
      
      // Обработка навигации браузера (предотвращение использования кнопок назад/вперед)
      window.addEventListener('popstate', (event) => {
        // Предотвращаем навигацию назад/вперед, остаёмся на текущей странице
        if (this.page !== 'dashboard' && this.page !== 'select-workout') {
          history.pushState(null, '', window.location.href);
        }
      });
      
      // Инициализация history state для предотвращения навигации назад
      history.replaceState(null, '', window.location.href);
      
      this.isReady = true;
      console.log('✅ GymBro ready!');
    },
    
    // ===== METHODS =====
    calculateHRZones() {
      const maxHR = 220 - this.profile.age;
      this.profile.maxHR = maxHR;
      this.profile.fatBurnLow = Math.round(maxHR * 0.6);
      this.profile.fatBurnHigh = Math.round(maxHR * 0.75);
      this.profile.intervalLow = Math.round(maxHR * 0.8);
      this.profile.intervalHigh = Math.round(maxHR * 0.9);
    },
    
    getTodayPlan() {
      const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
      const today = new Date().getDay();
      const dayName = days[today];
      
      const plans = {
        0: 'Отдых',
        1: 'Кардио 45-60 мин',
        2: 'Upper Body',
        3: 'Кардио 45-60 мин',
        4: 'Lower Body',
        5: 'Кардио 45-60 мин',
        6: 'Full Body + Core',
      };
      
      return `Сегодня: ${dayName} — ${plans[today]}`;
    },
    
    // ========================================
    // SELECT WORKOUT - ИСПРАВЛЕННАЯ ВЕРСИЯ
    // ========================================
    selectWorkout(key) {
      console.log('📌 selectWorkout called with:', key);
      
      // Проверка 1: workouts существует
      if (!this.workouts || Object.keys(this.workouts).length === 0) {
        console.error('❌ workouts is empty or undefined');
        alert('Ошибка: данные тренировок не загружены. Обновите страницу.');
        return;
      }
      
      // Проверка 2: ключ существует
      if (!this.workouts[key]) {
        console.error('❌ Workout not found for key:', key);
        console.log('Available keys:', Object.keys(this.workouts));
        alert('Тренировка не найдена: ' + key);
        return;
      }
      
      try {
        const inactive = (typeof Storage !== 'undefined' && Storage.getInactive) ? Storage.getInactive() : {};
        const inactiveIds = inactive[key] || [];
        let exercises = (this.workouts[key].exercises || []).filter(ex => !inactiveIds.includes(ex.id));
        if (exercises.length === 0) exercises = this.workouts[key].exercises || [];
        this.currentWorkout = JSON.parse(JSON.stringify({
          ...this.workouts[key],
          key: key,
          exercises
        }));
        
        console.log('✓ currentWorkout set:', this.currentWorkout.name);
        console.log('  exercises:', this.currentWorkout.exercises.length);
        
        // Сброс состояния
        this.currentExerciseIndex = 0;
        this.sets = [];
        this.selectedAlt = null;
        this.showAlternatives = false;
        
        // Установка начальных значений
        const firstEx = this.currentWorkout.exercises[0];
        if (firstEx) {
          this.currentWeight = firstEx.lastWeight ?? 20;
          this.currentReps = typeof firstEx.reps === 'number' ? firstEx.reps : 12;
          console.log('  first exercise:', firstEx.name);
          console.log('  weight:', this.currentWeight, 'reps:', this.currentReps);
        }
        
        // Переключение страницы
        console.log('🔄 Switching to workout page...');
        this.page = 'workout';
        this.saveSession();
        console.log('✓ page =', this.page);
        
      } catch (error) {
        console.error('❌ selectWorkout error:', error);
        alert('Ошибка при выборе тренировки: ' + error.message);
      }
    },
    
    recordSet() {
      if (!this.currentExercise) {
        console.error('No current exercise');
        return;
      }
      
      console.log('📝 Recording set:', this.currentWeight, 'kg ×', this.currentReps);
      
      this.sets.push({
        exerciseIndex: this.currentExerciseIndex,
        exerciseId: this.currentExercise.id,
        exerciseName: (this.selectedAlt?.name || this.selectedAlt) || this.currentExercise.name,
        weight: this.currentWeight,
        reps: this.currentReps,
        timestamp: new Date().toISOString(),
      });
      this.saveSession();
      
      const targetSets = this.currentExercise.sets || 3;
      if (this.currentExerciseSets.length >= targetSets) {
        this.startRest(120, 'exercise');
      } else {
        this.startRest(60, 'set');
      }
    },
    
    startRest(seconds, type) {
      if (this.restTimer.intervalId) clearInterval(this.restTimer.intervalId);
      this.restTimer.secondsLeft = seconds;
      this.restTimer.type = type;
      this.page = 'rest';
      this.saveSession();
      this.restTimer.intervalId = setInterval(() => {
        this.restTimer.secondsLeft--;
        if (this.restTimer.secondsLeft <= 0) {
          clearInterval(this.restTimer.intervalId);
          this.restTimer.intervalId = null;
          this.endRest();
        }
      }, 1000);
    },
    
    endRest() {
      if (this.restTimer.intervalId) {
        clearInterval(this.restTimer.intervalId);
        this.restTimer.intervalId = null;
      }
      if (this.restTimer.type === 'exercise') {
        this.nextExercise();
      }
      this.page = 'workout';
      this.saveSession();
    },
    
    nextExercise() {
      if (!this.currentWorkout) return;
      
      const totalExercises = this.currentWorkout.exercises.length;
      
      if (this.currentExerciseIndex < totalExercises - 1) {
        this.currentExerciseIndex++;
        this.selectedAlt = null;
        this.showAlternatives = false;
        
        const nextEx = this.currentExercise;
        if (nextEx) {
          this.currentWeight = nextEx.lastWeight ?? this.currentWeight;
          this.currentReps = typeof nextEx.reps === 'number' ? nextEx.reps : 12;
        }
        
        console.log('➡️ Next exercise:', this.currentExerciseIndex + 1, '/', totalExercises);
      } else {
        // Все упражнения выполнены → кардио
        console.log('🏃 All exercises done, going to cardio');
        this.isCardioOnly = false;
        this.cardioData.duration = this.currentWorkout.cardio || 30;
        this.page = 'cardio';
        this.saveSession();
      }
    },
    
    prevExercise() {
      if (this.currentExerciseIndex > 0) {
        this.currentExerciseIndex--;
        this.selectedAlt = null;
        this.showAlternatives = false;
        
        const prevEx = this.currentExercise;
        if (prevEx) {
          this.currentWeight = prevEx.lastWeight ?? this.currentWeight;
          this.currentReps = typeof prevEx.reps === 'number' ? prevEx.reps : 12;
        }
        
        console.log('⬅️ Previous exercise:', this.currentExerciseIndex + 1);
      }
    },
    
    saveWorkout() {
      console.log('💾 Saving workout...');
      
      const workout = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        dateISO: new Date().toISOString(),
        type: this.currentWorkout?.key || 'cardio',
        name: this.currentWorkout?.name || 'Кардио',
        sets: [...this.sets],
        cardio: { ...this.cardioData },
        moodPost: this.moodPost,
        moodDay: this.moodDay,
        notes: this.notes,
        mood: this.moodPost,
      };
      
      // Сохранение
      if (typeof Storage !== 'undefined' && Storage.saveWorkout) {
        Storage.saveWorkout(workout);
        this.updateStats(workout);
      } else {
        console.warn('Storage not available, workout not saved');
      }
      
      if (typeof Storage !== 'undefined' && Storage.clearSession) {
        Storage.clearSession();
      }
      
      // Сброс состояния
      this.currentWorkout = null;
      this.currentExerciseIndex = 0;
      this.sets = [];
      this.moodPost = 7;
      this.moodDay = 7;
      this.notes = '';
      this.isCardioOnly = false;
      
      // Перезагрузка данных
      this.loadData();
      
      // Возврат на главную
      this.page = 'dashboard';
      
      console.log('✅ Workout saved!');
    },
    
    updateStats(workout) {
      this.stats.weekStart = this.getWeekStart();
      this.stats.weekCompleted = Math.min(7, this.stats.weekCompleted + 1);
      
      if (workout.cardio?.duration) {
        this.stats.cardioMinutes += workout.cardio.duration;
      }
      
      // Обновление среднего настроения
      if (typeof Storage !== 'undefined' && Storage.getWorkouts) {
        const allWorkouts = Storage.getWorkouts();
        if (allWorkouts.length > 0) {
          const totalMood = allWorkouts.reduce((sum, w) => {
            const mood = Number(w.moodPost) || Number(w.mood) || 7;
            return sum + mood;
          }, 0);
          this.stats.avgMood = totalMood / allWorkouts.length;
        }
      }
      
      this.recalculateStreak();
      if (typeof Storage !== 'undefined' && Storage.saveStats) {
        Storage.saveStats(this.stats);
      }
    },
    
    loadData() {
      console.log('📂 Loading data...');
      
      if (typeof Storage === 'undefined') {
        console.warn('Storage not available');
        return;
      }
      
      // Загрузка статистики
      const savedStats = Storage.getStats ? Storage.getStats() : null;
      if (savedStats) {
        this.stats = { ...this.stats, ...savedStats };
      }
      
      // Сброс недели при смене календарной недели
      const currentWeekStart = this.getWeekStart();
      if (this.stats.weekStart && this.stats.weekStart !== currentWeekStart) {
        this.stats.weekCompleted = 0;
        this.stats.cardioMinutes = 0;
        this.stats.weekStart = currentWeekStart;
        this.recalculateWeekStats();
        if (typeof Storage !== 'undefined' && Storage.saveStats) {
          Storage.saveStats(this.stats);
        }
      }
      
      // Загрузка последних тренировок
      const workouts = Storage.getWorkouts ? Storage.getWorkouts() : [];
      this.recentWorkouts = workouts.slice(0, 5);
      
      // Обновление lastWeight из истории
      this.loadLastWeights();
      
      // Пересчёт стрика
      this.recalculateStreak();
      
      // Восстановление сессии после перезагрузки
      this.restoreSession();
      
      console.log('  recent workouts:', this.recentWorkouts.length);
    },
    
    saveSession() {
      if (typeof Storage === 'undefined' || !Storage.saveSession) return;
      const p = this.page;
      if (p !== 'workout' && p !== 'cardio' && p !== 'complete' && p !== 'rest') return;
      Storage.saveSession({
        page: p,
        currentWorkout: this.currentWorkout ? JSON.parse(JSON.stringify(this.currentWorkout)) : null,
        currentExerciseIndex: this.currentExerciseIndex,
        sets: [...this.sets],
        cardioData: { ...this.cardioData },
        moodPost: this.moodPost,
        moodDay: this.moodDay,
        notes: this.notes,
        isCardioOnly: this.isCardioOnly,
      });
    },
    
    restoreSession() {
      if (typeof Storage === 'undefined' || !Storage.getSession) return;
      const s = Storage.getSession();
      if (!s || !s.savedAt) return;
      const savedAt = new Date(s.savedAt);
      const hours = (Date.now() - savedAt) / 3600000;
      if (hours > 24) {
        Storage.clearSession();
        return;
      }
      this.page = (s.page === 'rest' ? 'workout' : s.page) || 'dashboard';
      if (s.currentWorkout) this.currentWorkout = s.currentWorkout;
      this.currentExerciseIndex = s.currentExerciseIndex ?? 0;
      this.sets = s.sets || [];
      this.cardioData = s.cardioData ? { ...s.cardioData } : this.cardioData;
      this.moodPost = s.moodPost ?? 7;
      this.moodDay = s.moodDay ?? 7;
      this.notes = s.notes || '';
      this.isCardioOnly = s.isCardioOnly ?? false;
      const ex = this.currentWorkout?.exercises?.[this.currentExerciseIndex];
      if (ex) {
        this.currentWeight = ex.lastWeight ?? 20;
        this.currentReps = typeof ex.reps === 'number' ? ex.reps : 12;
      }
      console.log('  session restored to:', this.page);
    },
    
    getWeekStart() {
      const d = new Date();
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const monday = new Date(d.getTime() + diff * 86400000);
      const y = monday.getFullYear();
      const m = String(monday.getMonth() + 1).padStart(2, '0');
      const dayNum = String(monday.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayNum}`;
    },
    
    recalculateWeekStats() {
      const start = new Date(this.stats.weekStart + 'T00:00:00');
      const end = new Date(start.getTime() + 7 * 86400000);
      const workouts = Storage.getWorkouts ? Storage.getWorkouts() : [];
      let completed = 0;
      let cardioMins = 0;
      for (const w of workouts) {
        const wDate = new Date(w.dateISO || w.date);
        if (wDate >= start && wDate < end) {
          completed++;
          cardioMins += w.cardio?.duration || 0;
        }
      }
      this.stats.weekCompleted = Math.min(7, completed);
      this.stats.cardioMinutes = cardioMins;
    },
    
    getWeekDaysStatus() {
      const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
      const todayIndex = (new Date().getDay() + 6) % 7;
      const weekStart = this.getWeekStart();
      const start = new Date(weekStart + 'T00:00:00');
      const workouts = Storage.getWorkouts ? Storage.getWorkouts() : [];
      const completedByDay = new Set();
      for (const w of workouts) {
        const wDate = new Date(w.dateISO || w.date);
        if (wDate >= start && wDate < new Date(start.getTime() + 7 * 86400000)) {
          const dayIndex = (wDate.getDay() + 6) % 7;
          completedByDay.add(dayIndex);
        }
      }
      return days.map((dayName, index) => {
        const d = new Date(start.getTime() + index * 86400000);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        return {
          dayName,
          dateStr,
          completed: completedByDay.has(index),
          isFuture: index > todayIndex,
          isToday: index === todayIndex,
          canMark: index <= todayIndex,
        };
      });
    },
    
    recalculateStreak() {
      const workouts = Storage.getWorkouts ? Storage.getWorkouts() : [];
      const workoutDates = new Set();
      for (const w of workouts) {
        const d = new Date(w.dateISO || w.date);
        const s = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        workoutDates.add(s);
      }
      const today = new Date();
      let streak = 0;
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (workoutDates.has(dateStr)) {
          streak++;
        } else {
          break;
        }
      }
      this.stats.streak = streak;
    },
    
    markDayAsWorkout(day) {
      if (!day.canMark || typeof Storage === 'undefined' || !Storage.saveWorkout) return;
      const d = new Date(day.dateStr + 'T12:00:00');
      const workout = {
        id: Date.now(),
        date: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
        dateISO: d.toISOString(),
        type: 'walk',
        name: 'Прогулка',
        sets: [],
        cardio: { type: 'treadmill', duration: 60, podcast: '' },
        moodPost: 7,
        moodDay: 7,
        notes: 'Отмечено вручную',
        mood: 7,
      };
      Storage.saveWorkout(workout);
      this.recalculateStreak();
      this.stats.weekStart = this.getWeekStart();
      this.recalculateWeekStats();
      if (typeof Storage !== 'undefined' && Storage.saveStats) {
        Storage.saveStats(this.stats);
      }
      const workouts = Storage.getWorkouts ? Storage.getWorkouts() : [];
      this.recentWorkouts = workouts.slice(0, 5);
    },
    
    loadLastWeights() {
      const workouts = Storage.getWorkouts ? Storage.getWorkouts() : [];
      if (!this.workouts || !Object.keys(this.workouts).length) return;
      
      Object.keys(this.workouts).forEach(workoutKey => {
        const workoutTemplate = this.workouts[workoutKey];
        if (!workoutTemplate?.exercises) return;
        
        workoutTemplate.exercises.forEach(exercise => {
          for (const w of workouts) {
            const lastSet = w.sets?.find(s => s.exerciseId === exercise.id);
            if (lastSet) {
              exercise.lastWeight = lastSet.weight;
              break;
            }
          }
        });
      });
    },
    
    // ===== HELPERS =====
    getMoodEmoji(mood) {
      const m = parseInt(mood) || 5;
      if (m >= 8) return '😊';
      if (m >= 5) return '😐';
      return '😔';
    },
    
    getWorkoutTypeColor(type) {
      const colors = {
        tuesday: 'bg-blue-500/30',
        thursday: 'bg-green-500/30',
        saturday: 'bg-orange-500/30',
        cardio: 'bg-purple-500/30',
      };
      return colors[type] || 'bg-gray-500/30';
    },
    
    getExerciseIcon(iconName) {
      return getExerciseIconSafe(iconName);
    },
    
    isExerciseInactive(workoutKey, exerciseId) {
      const inactive = (typeof Storage !== 'undefined' && Storage.getInactive) ? Storage.getInactive() : {};
      return (inactive[workoutKey] || []).includes(exerciseId);
    },
    
    toggleExerciseInactive(workoutKey, exerciseId) {
      if (typeof Storage !== 'undefined' && Storage.toggleInactive) {
        Storage.toggleInactive(workoutKey, exerciseId);
        this.inactiveVersion = (this.inactiveVersion || 0) + 1;
      }
    },
    
    startWorkoutFromPlan() {
      if (this.planWorkoutKey) {
        this.selectWorkout(this.planWorkoutKey);
      }
    },
    
    getVideoEmbedUrl(url) {
      if (!url || typeof url !== 'string') return '';
      const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return m ? 'https://www.youtube.com/embed/' + m[1] : '';
    },
    
    getCurrentVideoUrl() {
      const alt = this.selectedAlt;
      if (alt?.videoUrl) return alt.videoUrl;
      return this.currentExercise?.videoUrl || '';
    },
    
    openVideoModal() {
      const url = this.getCurrentVideoUrl();
      if (!url) return;
      const embed = this.getVideoEmbedUrl(url);
      if (embed) {
        this.videoModalUrl = embed;
        this.videoModalOpen = true;
      }
    },
    
    closeVideoModal() {
      this.videoModalOpen = false;
      this.videoModalUrl = '';
    },
    
    deleteWorkout(id) {
      if (!confirm('Удалить эту тренировку?')) return;
      if (typeof Storage !== 'undefined' && Storage.deleteWorkout) {
        Storage.deleteWorkout(id);
        this.loadData();
      }
    },
    
    editWorkout(workout) {
      this.editingWorkout = JSON.parse(JSON.stringify(workout));
      this.page = 'edit-workout';
    },
    
    openManageExercises() {
      this.managingWorkoutKey = null;
      this.editingExerciseIndex = -1;
      this.page = 'manage-exercises';
    },
    
    selectWorkoutToManage(key) {
      this.managingWorkoutKey = key;
      this.editingExerciseIndex = -1;
    },
    
    backToWorkoutList() {
      this.managingWorkoutKey = null;
      this.editingExerciseIndex = -1;
    },
    
    getIconKeys() {
      return typeof EXERCISE_ICONS !== 'undefined' ? Object.keys(EXERCISE_ICONS) : ['dumbbell'];
    },
    
    startAddExercise() {
      this.exerciseForm = { name: '', sets: 3, reps: 12, icon: 'dumbbell', videoUrl: '', alts: [] };
      this.editingExerciseIndex = -2;
    },
    
    addAltExercise() {
      this.exerciseForm.alts = this.exerciseForm.alts || [];
      this.exerciseForm.alts.push({ name: '', forWhat: '', videoUrl: '' });
    },
    
    removeAltExercise(i) {
      this.exerciseForm.alts.splice(i, 1);
    },
    
    startEditExercise(index) {
      const ex = this.workouts[this.managingWorkoutKey]?.exercises?.[index];
      if (!ex) return;
      const alts = Array.isArray(ex.alts) ? ex.alts.map(a => typeof a === 'string' ? { name: a, forWhat: '', videoUrl: '' } : { name: a.name || '', forWhat: a.forWhat || '', videoUrl: a.videoUrl || '' }) : [];
      this.exerciseForm = {
        name: ex.name,
        sets: ex.sets ?? 3,
        reps: ex.reps ?? 12,
        icon: ex.icon || 'dumbbell',
        videoUrl: ex.videoUrl || '',
        alts,
      };
      this.editingExerciseIndex = index;
    },
    
    saveExercise() {
      if (!this.managingWorkoutKey || !this.workouts[this.managingWorkoutKey]) return;
      const alts = (this.exerciseForm.alts || [])
        .map(a => ({ name: (a.name || '').trim(), forWhat: (a.forWhat || '').trim(), videoUrl: (a.videoUrl || '').trim() }))
        .filter(a => a.name);
      const ex = {
        id: this.editingExerciseIndex >= 0
          ? this.workouts[this.managingWorkoutKey].exercises[this.editingExerciseIndex].id
          : 'ex_' + Date.now(),
        name: this.exerciseForm.name || 'Упражнение',
        sets: this.exerciseForm.sets || 3,
        reps: this.exerciseForm.reps || 12,
        icon: this.exerciseForm.icon || 'dumbbell',
        videoUrl: (this.exerciseForm.videoUrl || '').trim(),
        lastWeight: this.editingExerciseIndex >= 0
          ? (this.workouts[this.managingWorkoutKey].exercises[this.editingExerciseIndex].lastWeight ?? 20)
          : 20,
        alts,
      };
      const exercises = [...(this.workouts[this.managingWorkoutKey].exercises || [])];
      if (this.editingExerciseIndex >= 0) {
        exercises[this.editingExerciseIndex] = ex;
      } else {
        exercises.push(ex);
      }
      this.workouts[this.managingWorkoutKey] = { ...this.workouts[this.managingWorkoutKey], exercises };
      this.workoutList = Object.entries(this.workouts).map(([k, v]) => ({ key: k, ...v }));
      if (typeof Storage !== 'undefined' && Storage.saveTemplates) {
        Storage.saveTemplates(this.workouts);
      }
      this.editingExerciseIndex = -1;
    },
    
    deleteExerciseFromTemplate(index) {
      if (!this.managingWorkoutKey || !confirm('Удалить упражнение?')) return;
      const exercises = [...(this.workouts[this.managingWorkoutKey].exercises || [])];
      exercises.splice(index, 1);
      this.workouts[this.managingWorkoutKey] = { ...this.workouts[this.managingWorkoutKey], exercises };
      this.workoutList = Object.entries(this.workouts).map(([k, v]) => ({ key: k, ...v }));
      if (typeof Storage !== 'undefined' && Storage.saveTemplates) {
        Storage.saveTemplates(this.workouts);
      }
      this.editingExerciseIndex = -1;
    },
    
    // Drag and drop methods
    onDragStart(event, index) {
      this.dragState.dragging = index;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    },
    
    onDragOver(event, index) {
      event.preventDefault();
      this.dragState.over = index;
    },
    
    onDragEnd() {
      this.dragState = { dragging: null, over: null };
    },
    
    onDrop(event, targetIndex, context) {
      event.preventDefault();
      const sourceIndex = parseInt(event.dataTransfer.getData('text/plain'));
      
      if (sourceIndex === targetIndex) {
        this.dragState = { dragging: null, over: null };
        return;
      }
      
      // Context: 'plan' for workout-plan screen, 'manage' for manage-exercises screen
      if (context === 'plan' && this.planWorkoutKey) {
        const exercises = [...(this.workouts[this.planWorkoutKey]?.exercises || [])];
        const [moved] = exercises.splice(sourceIndex, 1);
        exercises.splice(targetIndex, 0, moved);
        this.workouts[this.planWorkoutKey] = { ...this.workouts[this.planWorkoutKey], exercises };
        
        // Save templates if it's a template
        if (typeof Storage !== 'undefined' && Storage.saveTemplates) {
          Storage.saveTemplates(this.workouts);
        }
      } else if (context === 'manage' && this.managingWorkoutKey) {
        const exercises = [...(this.workouts[this.managingWorkoutKey]?.exercises || [])];
        const [moved] = exercises.splice(sourceIndex, 1);
        exercises.splice(targetIndex, 0, moved);
        this.workouts[this.managingWorkoutKey] = { ...this.workouts[this.managingWorkoutKey], exercises };
        this.workoutList = Object.entries(this.workouts).map(([k, v]) => ({ key: k, ...v }));
        
        if (typeof Storage !== 'undefined' && Storage.saveTemplates) {
          Storage.saveTemplates(this.workouts);
        }
      }
      
      this.dragState = { dragging: null, over: null };
    },
    
    saveEditedWorkout() {
      if (!this.editingWorkout) return;
      this.editingWorkout.mood = this.editingWorkout.moodPost ?? this.editingWorkout.mood ?? 7;
      this.editingWorkout.moodDay = this.editingWorkout.moodDay ?? 7;
      if (typeof Storage !== 'undefined' && Storage.updateWorkout) {
        Storage.updateWorkout(this.editingWorkout);
      }
      this.stats.weekStart = this.getWeekStart();
      this.recalculateWeekStats();
      if (typeof Storage !== 'undefined' && Storage.saveStats) {
        Storage.saveStats(this.stats);
      }
      this.editingWorkout = null;
      this.loadData();
      this.page = 'dashboard';
    },
  };
}

// Экспорт для отладки
window.gymTracker = gymTracker;
console.log('📦 app.js loaded');
