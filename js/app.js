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
    
    // Profile
    profile: {
      name: 'Николай',
      age: 36,
      maxHR: 184,
      fatBurnLow: 110,
      fatBurnHigh: 138,
      intervalLow: 147,
      intervalHigh: 166,
    },
    
    // Stats
    stats: {
      streak: 12,
      weekCompleted: 5,
      weekTotal: 7,
      cardioMinutes: 245,
      avgMood: 7.8,
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
      
      // Загрузка данных тренировок
      this.workouts = getWorkoutTemplates();
      
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
        // Глубокое копирование (DATA_FLOW: JSON.parse/stringify)
        this.currentWorkout = JSON.parse(JSON.stringify({
          ...this.workouts[key],
          key: key
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
        exerciseName: this.selectedAlt || this.currentExercise.name,
        weight: this.currentWeight,
        reps: this.currentReps,
        timestamp: new Date().toISOString(),
      });
      
      // Проверка завершения всех сетов
      const targetSets = this.currentExercise.sets || 3;
      if (this.currentExerciseSets.length >= targetSets) {
        console.log('✓ All sets complete, moving to next exercise');
        this.nextExercise();
      }
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
          const totalMood = allWorkouts.reduce((sum, w) => sum + (w.moodPost || 7), 0);
          this.stats.avgMood = totalMood / allWorkouts.length;
        }
      }
      
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
      
      console.log('  recent workouts:', this.recentWorkouts.length);
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
  };
}

// Экспорт для отладки
window.gymTracker = gymTracker;
console.log('📦 app.js loaded');
