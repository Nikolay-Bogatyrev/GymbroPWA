/**
 * GymBro - Main Alpine.js Component
 */
function gymTracker() {
  return {
    // ===== STATE =====
    page: 'dashboard',
    
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
      weekStart: null, // ISO date of Monday (YYYY-MM-DD) for weekly reset
    },
    
    // Workouts data
    workouts: WORKOUT_TEMPLATES, // from data.js
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
      return this.currentWorkout?.exercises[this.currentExerciseIndex];
    },
    
    get currentExerciseSets() {
      return this.sets.filter(s => s.exerciseIndex === this.currentExerciseIndex);
    },
    
    get workoutList() {
      const w = this.workouts || {};
      return Object.keys(w).map(key => ({ key, workout: w[key] }));
    },
    
    // ===== INIT =====
    init() {
      // Load data from localStorage
      this.loadData();
      
      // Load profile from localStorage
      const savedProfile = Storage.getProfile();
      if (savedProfile) {
        this.profile = { ...this.profile, ...savedProfile };
      }
      
      // Calculate HR zones based on age
      this.calculateHRZones();
      
      console.log('GymBro initialized');
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
    
    selectWorkout(key) {
      const workout = this.workouts?.[key];
      if (!workout?.exercises?.length) return;
      
      this.currentWorkout = { ...workout, key };
      this.currentExerciseIndex = 0;
      this.sets = [];
      this.selectedAlt = null;
      this.showAlternatives = false;
      
      const firstEx = this.currentWorkout.exercises[0];
      this.currentWeight = firstEx.lastWeight ?? 20;
      this.currentReps = typeof firstEx.reps === 'number' ? firstEx.reps : 12;
      
      this.page = 'workout';
    },
    
    recordSet() {
      // Save the set
      this.sets.push({
        exerciseIndex: this.currentExerciseIndex,
        exerciseId: this.currentExercise.id,
        exerciseName: this.selectedAlt || this.currentExercise.name,
        weight: this.currentWeight,
        reps: this.currentReps,
        timestamp: new Date().toISOString(),
      });
      
      // Check if all sets completed for this exercise
      const targetSets = this.currentExercise.sets;
      if (this.currentExerciseSets.length >= targetSets) {
        this.nextExercise();
      }
    },
    
    nextExercise() {
      if (this.currentExerciseIndex < this.currentWorkout.exercises.length - 1) {
        this.currentExerciseIndex++;
        this.selectedAlt = null;
        this.showAlternatives = false;
        
        // Load next exercise defaults (?? for 0 in planks)
        const nextEx = this.currentExercise;
        this.currentWeight = nextEx.lastWeight ?? this.currentWeight;
        this.currentReps = typeof nextEx.reps === 'number' ? nextEx.reps : 12;
      } else {
        // All exercises done, go to cardio
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
        this.currentWeight = prevEx.lastWeight ?? this.currentWeight;
        this.currentReps = typeof prevEx.reps === 'number' ? prevEx.reps : 12;
      }
    },
    
    saveWorkout() {
      // Create workout record
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
        mood: this.moodPost, // for display
      };
      
      // Save to storage
      Storage.saveWorkout(workout);
      
      // Update stats
      this.updateStats(workout);
      
      // Reset state
      this.currentWorkout = null;
      this.currentExerciseIndex = 0;
      this.sets = [];
      this.moodPost = 7;
      this.moodDay = 7;
      this.notes = '';
      this.isCardioOnly = false;
      
      // Reload recent workouts
      this.loadData();
      
      // Go to dashboard
      this.page = 'dashboard';
    },
    
    updateStats(workout) {
      const monday = this.getWeekStart();
      this.stats.weekStart = monday;
      this.stats.weekCompleted = Math.min(7, this.stats.weekCompleted + 1);
      
      // Update cardio minutes
      if (workout.cardio?.duration) {
        this.stats.cardioMinutes += workout.cardio.duration;
      }
      
      // Update average mood
      const allWorkouts = Storage.getWorkouts();
      if (allWorkouts.length > 0) {
        const totalMood = allWorkouts.reduce((sum, w) => sum + (w.moodPost || 7), 0);
        this.stats.avgMood = totalMood / allWorkouts.length;
      }
      
      // Save stats
      Storage.saveStats(this.stats);
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
    
    loadData() {
      // Load stats
      const savedStats = Storage.getStats();
      if (savedStats) {
        this.stats = { ...this.stats, ...savedStats };
      }
      
      // Reset week stats if new week started
      const currentWeekStart = this.getWeekStart();
      if (this.stats.weekStart && this.stats.weekStart !== currentWeekStart) {
        this.stats.weekCompleted = 0;
        this.stats.cardioMinutes = 0;
        this.stats.weekStart = currentWeekStart;
        this.recalculateWeekStats();
        Storage.saveStats(this.stats);
      }
      
      // Load recent workouts
      this.recentWorkouts = Storage.getWorkouts().slice(0, 5);
      
      // Load last weights for exercises
      this.loadLastWeights();
    },
    
    recalculateWeekStats() {
      const start = new Date(this.stats.weekStart + 'T00:00:00');
      const end = new Date(start.getTime() + 7 * 86400000);
      const workouts = Storage.getWorkouts();
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
      const workouts = Storage.getWorkouts();
      
      // Update lastWeight for each exercise based on history
      Object.keys(this.workouts).forEach(workoutKey => {
        this.workouts[workoutKey].exercises.forEach(exercise => {
          // Find last set for this exercise
          for (const workout of workouts) {
            const lastSet = workout.sets?.find(s => s.exerciseId === exercise.id);
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
      if (mood >= 8) return '😊';
      if (mood >= 5) return '😐';
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
      return EXERCISE_ICONS[iconName] || EXERCISE_ICONS.dumbbell;
    },
  };
}
