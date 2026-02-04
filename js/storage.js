/**
 * LocalStorage wrapper for GymBro
 */
const Storage = {
  KEYS: {
    WORKOUTS: 'gym_workouts',
    STATS: 'gym_stats',
    PROFILE: 'gym_profile',
    SESSION: 'gym_session',
    TEMPLATES: 'gym_templates',
  },
  
  // ===== WORKOUTS =====
  getWorkouts() {
    try {
      const data = localStorage.getItem(this.KEYS.WORKOUTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading workouts:', e);
      return [];
    }
  },
  
  saveWorkout(workout) {
    try {
      const workouts = this.getWorkouts();
      workouts.unshift(workout); // Add to beginning
      
      // Keep only last 100 workouts
      if (workouts.length > 100) {
        workouts.pop();
      }
      
      localStorage.setItem(this.KEYS.WORKOUTS, JSON.stringify(workouts));
      return true;
    } catch (e) {
      console.error('Error saving workout:', e);
      return false;
    }
  },
  
  deleteWorkout(id) {
    try {
      const workouts = this.getWorkouts().filter(w => w.id !== id);
      localStorage.setItem(this.KEYS.WORKOUTS, JSON.stringify(workouts));
      return true;
    } catch (e) {
      console.error('Error deleting workout:', e);
      return false;
    }
  },
  
  updateWorkout(workout) {
    try {
      const workouts = this.getWorkouts();
      const idx = workouts.findIndex(w => w.id === workout.id);
      if (idx === -1) return false;
      workouts[idx] = workout;
      localStorage.setItem(this.KEYS.WORKOUTS, JSON.stringify(workouts));
      return true;
    } catch (e) {
      console.error('Error updating workout:', e);
      return false;
    }
  },
  
  // ===== STATS =====
  getStats() {
    try {
      const data = localStorage.getItem(this.KEYS.STATS);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading stats:', e);
      return null;
    }
  },
  
  saveStats(stats) {
    try {
      localStorage.setItem(this.KEYS.STATS, JSON.stringify(stats));
      return true;
    } catch (e) {
      console.error('Error saving stats:', e);
      return false;
    }
  },
  
  // ===== PROFILE =====
  getProfile() {
    try {
      const data = localStorage.getItem(this.KEYS.PROFILE);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading profile:', e);
      return null;
    }
  },
  
  saveProfile(profile) {
    try {
      localStorage.setItem(this.KEYS.PROFILE, JSON.stringify(profile));
      return true;
    } catch (e) {
      console.error('Error saving profile:', e);
      return false;
    }
  },
  
  // ===== EXPORT/IMPORT =====
  exportData() {
    return {
      workouts: this.getWorkouts(),
      stats: this.getStats(),
      profile: this.getProfile(),
      exportedAt: new Date().toISOString(),
    };
  },
  
  importData(data) {
    try {
      if (data.workouts) {
        localStorage.setItem(this.KEYS.WORKOUTS, JSON.stringify(data.workouts));
      }
      if (data.stats) {
        localStorage.setItem(this.KEYS.STATS, JSON.stringify(data.stats));
      }
      if (data.profile) {
        localStorage.setItem(this.KEYS.PROFILE, JSON.stringify(data.profile));
      }
      return true;
    } catch (e) {
      console.error('Error importing data:', e);
      return false;
    }
  },
  
  // ===== SESSION (для восстановления после перезагрузки) =====
  getSession() {
    try {
      const data = localStorage.getItem(this.KEYS.SESSION);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading session:', e);
      return null;
    }
  },
  
  saveSession(session) {
    try {
      if (!session) return false;
      session.savedAt = new Date().toISOString();
      localStorage.setItem(this.KEYS.SESSION, JSON.stringify(session));
      return true;
    } catch (e) {
      console.error('Error saving session:', e);
      return false;
    }
  },
  
  clearSession() {
    try {
      localStorage.removeItem(this.KEYS.SESSION);
      return true;
    } catch (e) {
      return false;
    }
  },
  
  // ===== TEMPLATES (шаблоны тренировок) =====
  getTemplates() {
    try {
      const data = localStorage.getItem(this.KEYS.TEMPLATES);
      const custom = data ? JSON.parse(data) : null;
      const base = typeof WORKOUT_TEMPLATES !== 'undefined' ? WORKOUT_TEMPLATES : {};
      return custom && Object.keys(custom).length > 0 ? { ...base, ...custom } : base;
    } catch (e) {
      console.error('Error reading templates:', e);
      return typeof WORKOUT_TEMPLATES !== 'undefined' ? WORKOUT_TEMPLATES : {};
    }
  },
  
  saveTemplates(templates) {
    try {
      localStorage.setItem(this.KEYS.TEMPLATES, JSON.stringify(templates));
      return true;
    } catch (e) {
      console.error('Error saving templates:', e);
      return false;
    }
  },
  
  // ===== CLEAR =====
  clearAll() {
    localStorage.removeItem(this.KEYS.WORKOUTS);
    localStorage.removeItem(this.KEYS.STATS);
    localStorage.removeItem(this.KEYS.PROFILE);
    localStorage.removeItem(this.KEYS.SESSION);
    localStorage.removeItem(this.KEYS.TEMPLATES);
  }
};
