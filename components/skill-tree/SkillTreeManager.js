/**
 * SkillTreeManager - Manages persistent score tracking and skill unlocks
 * Integrates with existing score submission system without breaking it
 */

class SkillTreeManager {
  constructor() {
    this.skillTreeData = {};
    this.totalScore = 0;
    this.enemiesDefeated = 0;
    this.unlockedSkills = new Set();
    this.selectedDefender = 'CHOG';
    this.activeSkills = new Map();
    
    // Initialize skill data with logging
    this.initializeSkillData();
    
    // Clear old data or load fresh on startup
    this.clearOldData();
    
    // Listen for enemy defeated events
    if (typeof window !== 'undefined') {
      window.addEventListener('enemyDefeated', this.handleEnemyDefeated.bind(this));
      window.addEventListener('scoreUpdate', this.handleScoreUpdate.bind(this));
    }
  }

  initializeSkillData() {
    this.skillTreeData = this.initializeSkillTreeData();
    console.log('[SKILL TREE] Initialized skill data:', this.skillTreeData);
    console.log('[SKILL TREE] Available defenders:', Object.keys(this.skillTreeData));
  }

  initializeSkillTreeData() {
    return {
      CHOG: {
        name: 'CHOG',
        description: 'Wind-based defender with area control abilities',
        tiers: {
          1: {
            scoreRange: [500, 750],
            skills: [
              {
                id: 'chog_wind_gust',
                name: 'Wind Gust',
                description: 'Pushes back enemies in a small area',
                scoreRequired: 500,
                enemiesRequired: 50,
                unlocked: false
              },
              {
                id: 'chog_air_shield',
                name: 'Air Shield',
                description: 'Creates a protective barrier that deflects projectiles',
                scoreRequired: 750,
                enemiesRequired: 75,
                unlocked: false
              }
            ]
          },
          2: {
            scoreRange: [2500, 3750],
            skills: [
              {
                id: 'chog_tornado',
                name: 'Tornado',
                description: 'Creates a moving tornado that damages multiple enemies',
                scoreRequired: 2500,
                enemiesRequired: 250,
                unlocked: false
              },
              {
                id: 'chog_wind_mastery',
                name: 'Wind Mastery',
                description: 'Increases wind-based attack speed and range',
                scoreRequired: 3750,
                enemiesRequired: 375,
                unlocked: false
              }
            ]
          },
          3: {
            scoreRange: [7500, 10000],
            skills: [
              {
                id: 'chog_hurricane',
                name: 'Hurricane',
                description: 'Massive area attack that devastates the battlefield',
                scoreRequired: 7500,
                enemiesRequired: 750,
                unlocked: false
              },
              {
                id: 'chog_storm_lord',
                name: 'Storm Lord',
                description: 'Ultimate wind mastery with continuous area damage',
                scoreRequired: 10000,
                enemiesRequired: 1000,
                unlocked: false
              }
            ]
          }
        }
      },
      MOLANDAK: {
        name: 'MOLANDAK',
        description: 'Ice-based defender with crowd control and slowing abilities',
        tiers: {
          1: {
            scoreRange: [1000, 1500],
            skills: [
              {
                id: 'molandak_frost_aura',
                name: 'Frost Aura',
                description: 'Slows enemies in surrounding area',
                scoreRequired: 1000,
                enemiesRequired: 100,
                unlocked: false
              },
              {
                id: 'molandak_ice_shard',
                name: 'Ice Shard',
                description: 'Piercing ice projectile that hits multiple enemies',
                scoreRequired: 1500,
                enemiesRequired: 150,
                unlocked: false
              }
            ]
          },
          2: {
            scoreRange: [5000, 6250],
            skills: [
              {
                id: 'molandak_blizzard',
                name: 'Blizzard',
                description: 'Area-of-effect ice storm that slows and damages',
                scoreRequired: 5000,
                enemiesRequired: 500,
                unlocked: false
              },
              {
                id: 'molandak_ice_wall',
                name: 'Ice Wall',
                description: 'Creates temporary barriers to redirect enemy paths',
                scoreRequired: 6250,
                enemiesRequired: 625,
                unlocked: false
              }
            ]
          },
          3: {
            scoreRange: [8750, 11250],
            skills: [
              {
                id: 'molandak_absolute_zero',
                name: 'Absolute Zero',
                description: 'Freezes all enemies on screen temporarily',
                scoreRequired: 8750,
                enemiesRequired: 875,
                unlocked: false
              },
              {
                id: 'molandak_ice_lord',
                name: 'Ice Lord',
                description: 'Master of ice with enhanced freeze duration and damage',
                scoreRequired: 11250,
                enemiesRequired: 1125,
                unlocked: false
              }
            ]
          }
        }
      },
      MOYAKI: {
        name: 'MOYAKI',
        description: 'Fire-based defender with high damage and explosive abilities',
        tiers: {
          1: {
            scoreRange: [1500, 2250],
            skills: [
              {
                id: 'moyaki_flame_burst',
                name: 'Flame Burst',
                description: 'Explosive fire attack with splash damage',
                scoreRequired: 1500,
                enemiesRequired: 150,
                unlocked: false
              },
              {
                id: 'moyaki_fire_trail',
                name: 'Fire Trail',
                description: 'Leaves burning ground that damages enemies over time',
                scoreRequired: 2250,
                enemiesRequired: 225,
                unlocked: false
              }
            ]
          },
          2: {
            scoreRange: [6250, 8750],
            skills: [
              {
                id: 'moyaki_multi_strike',
                name: 'Multi-Strike',
                description: 'Fires multiple projectiles in different directions',
                scoreRequired: 6250,
                enemiesRequired: 625,
                unlocked: false
              },
              {
                id: 'moyaki_inferno',
                name: 'Inferno',
                description: 'Creates a large area of continuous fire damage',
                scoreRequired: 8750,
                enemiesRequired: 875,
                unlocked: false
              }
            ]
          },
          3: {
            scoreRange: [10000, 12000],
            skills: [
              {
                id: 'moyaki_meteor_strike',
                name: 'Meteor Strike',
                description: 'Devastating area attack from above',
                scoreRequired: 10000,
                enemiesRequired: 1000,
                unlocked: false
              },
              {
                id: 'moyaki_fire_lord',
                name: 'Fire Lord',
                description: 'Ultimate fire mastery with chain explosions',
                scoreRequired: 12000,
                enemiesRequired: 1200,
                unlocked: false
              }
            ]
          }
        }
      },
      KEON: {
        name: 'KEON',
        description: 'Strategic defender with tactical abilities and support skills',
        tiers: {
          1: {
            scoreRange: [2000, 3000],
            skills: [
              {
                id: 'keon_tactical_analysis',
                name: 'Tactical Analysis',
                description: 'Reveals enemy weaknesses and increases damage',
                scoreRequired: 2000,
                enemiesRequired: 200,
                unlocked: false
              },
              {
                id: 'keon_precision_strike',
                name: 'Precision Strike',
                description: 'High-accuracy attack that ignores armor',
                scoreRequired: 3000,
                enemiesRequired: 300,
                unlocked: false
              }
            ]
          },
          2: {
            scoreRange: [7500, 8750],
            skills: [
              {
                id: 'keon_battle_coordination',
                name: 'Battle Coordination',
                description: 'Boosts all nearby defenders attack speed and damage',
                scoreRequired: 7500,
                enemiesRequired: 750,
                unlocked: false
              },
              {
                id: 'keon_strategic_positioning',
                name: 'Strategic Positioning',
                description: 'Allows repositioning of defenders during battle',
                scoreRequired: 8750,
                enemiesRequired: 875,
                unlocked: false
              }
            ]
          },
          3: {
            scoreRange: [10000, 12000],
            skills: [
              {
                id: 'keon_master_tactician',
                name: 'Master Tactician',
                description: 'Ultimate strategic ability affecting entire battlefield',
                scoreRequired: 10000,
                enemiesRequired: 1000,
                unlocked: false
              },
              {
                id: 'keon_war_lord',
                name: 'War Lord',
                description: 'Supreme commander with battlefield-wide effects',
                scoreRequired: 12000,
                enemiesRequired: 1200,
                unlocked: false
              }
            ]
          }
        }
      }
    };
  }

  // Handle enemy defeated events (10 points per enemy)
  handleEnemyDefeated(event) {
    this.enemiesDefeated++;
    this.totalScore += 10; // 10 points per enemy as specified
    this.checkSkillUnlocks();
    this.saveProgress();
    
    // Dispatch update event for UI
    this.dispatchProgressUpdate();
  }

  // Method called directly from game when enemy is defeated
  onEnemyDefeated(enemyType, currentScore) {
    this.enemiesDefeated++;
    // Use the higher of current total score or the passed score
    this.totalScore = Math.max(this.totalScore, currentScore || this.totalScore);
    this.checkSkillUnlocks();
    this.saveProgress();
    
    // Dispatch update event for UI
    this.dispatchProgressUpdate();
  }

  // Handle score updates from other sources
  handleScoreUpdate(event) {
    if (event.detail && typeof event.detail.score === 'number') {
      this.totalScore = Math.max(this.totalScore, event.detail.score);
      this.checkSkillUnlocks();
      this.saveProgress();
      this.dispatchProgressUpdate();
    }
  }

  // Check if any skills can be unlocked
  checkSkillUnlocks() {
    let newUnlocks = false;
    
    Object.values(this.skillTreeData).forEach(defender => {
      Object.values(defender.tiers).forEach(tier => {
        tier.skills.forEach(skill => {
          if (!skill.unlocked && 
              this.totalScore >= skill.scoreRequired && 
              this.enemiesDefeated >= skill.enemiesRequired) {
            skill.unlocked = true;
            this.unlockedSkills.add(skill.id);
            newUnlocks = true;
            
            // Dispatch skill unlock event
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('skillUnlocked', {
                detail: { skill, defender: defender.name }
              }));
            }
          }
        });
      });
    });
    
    if (newUnlocks) {
      this.saveProgress();
    }
  }

  // Unlock a skill (called when player clicks unlock button)
  unlockSkill(skillId) {
    const skill = this.findSkillById(skillId);
    if (skill && skill.unlocked && !this.unlockedSkills.has(skillId)) {
      this.unlockedSkills.add(skillId);
      this.saveProgress();
      return true;
    }
    return false;
  }

  // Activate a skill for the current defender
  activateSkill(skillId, defenderId = null) {
    const defender = defenderId || this.selectedDefender;
    if (!this.activeSkills.has(defender)) {
      this.activeSkills.set(defender, new Set());
    }
    
    if (this.unlockedSkills.has(skillId)) {
      this.activeSkills.get(defender).add(skillId);
      this.saveProgress();
      
      // Dispatch skill activation event for game integration
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('skillActivated', {
          detail: { skillId, defender }
        }));
      }
      return true;
    }
    return false;
  }

  // Deactivate a skill
  deactivateSkill(skillId, defenderId = null) {
    const defender = defenderId || this.selectedDefender;
    if (this.activeSkills.has(defender)) {
      this.activeSkills.get(defender).delete(skillId);
      this.saveProgress();
      
      // Dispatch skill deactivation event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('skillDeactivated', {
          detail: { skillId, defender }
        }));
      }
      return true;
    }
    return false;
  }

  // Get active skills for a defender
  getActiveSkills(defenderId = null) {
    const defender = defenderId || this.selectedDefender;
    return this.activeSkills.get(defender) || new Set();
  }

  // Find skill by ID across all defenders
  findSkillById(skillId) {
    for (const defender of Object.values(this.skillTreeData)) {
      for (const tier of Object.values(defender.tiers)) {
        const skill = tier.skills.find(s => s.id === skillId);
        if (skill) return skill;
      }
    }
    return null;
  }

  // Get progress data for UI
  getProgressData() {
    return {
      totalScore: this.totalScore,
      enemiesDefeated: this.enemiesDefeated,
      unlockedSkills: Array.from(this.unlockedSkills),
      selectedDefender: this.selectedDefender,
      activeSkills: Object.fromEntries(this.activeSkills)
    };
  }

  // Set selected defender
  setSelectedDefender(defenderId) {
    if (this.skillTreeData[defenderId]) {
      this.selectedDefender = defenderId;
      this.saveProgress();
      this.dispatchProgressUpdate();
    }
  }

  // Save progress to localStorage
  saveProgress() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const progressData = {
          totalScore: this.totalScore,
          enemiesDefeated: this.enemiesDefeated,
          unlockedSkills: Array.from(this.unlockedSkills),
          selectedDefender: this.selectedDefender,
          activeSkills: Object.fromEntries(this.activeSkills),
          lastSaved: Date.now() // Add timestamp
        };
        localStorage.setItem('mondefense_skill_progress', JSON.stringify(progressData));
        console.log('[SKILL TREE] Progress saved:', progressData);
      } catch (error) {
        console.warn('Failed to save skill tree progress:', error);
      }
    }
  }

  // Load progress from localStorage
  loadProgress() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('mondefense_skill_progress');
        if (saved) {
          const progressData = JSON.parse(saved);
          this.totalScore = progressData.totalScore || 0;
          this.enemiesDefeated = progressData.enemiesDefeated || 0;
          this.unlockedSkills = new Set(progressData.unlockedSkills || []);
          this.selectedDefender = progressData.selectedDefender || 'CHOG';
          this.activeSkills = new Map(Object.entries(progressData.activeSkills || {}));
          
          // Update skill unlock status based on loaded data
          this.updateSkillUnlockStatus();
        }
      } catch (error) {
        console.warn('Failed to load skill tree progress:', error);
      }
    }
  }

  // Update skill unlock status based on current progress
  updateSkillUnlockStatus() {
    Object.values(this.skillTreeData).forEach(defender => {
      Object.values(defender.tiers).forEach(tier => {
        tier.skills.forEach(skill => {
          if (this.totalScore >= skill.scoreRequired && 
              this.enemiesDefeated >= skill.enemiesRequired) {
            skill.unlocked = true;
          }
        });
      });
    });
  }

  // Dispatch progress update event for UI
  dispatchProgressUpdate() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('skillTreeProgressUpdate', {
        detail: this.getProgressData()
      }));
    }
  }

  // Get skill tree data for a specific defender
  getDefenderSkills(defenderId) {
    return this.skillTreeData[defenderId] || null;
  }

  // Alias method for compatibility with SkillDefender
  getDefenderData(defenderId) {
    return this.getDefenderSkills(defenderId);
  }

  // Get all defenders
  getAllDefenders() {
    return Object.keys(this.skillTreeData);
  }

  // Reset progress (for testing or new game+)
  resetProgress() {
    this.totalScore = 0;
    this.enemiesDefeated = 0;
    this.unlockedSkills.clear();
    this.activeSkills.clear();
    this.selectedDefender = 'CHOG';
    
    // Reset skill unlock status
    Object.values(this.skillTreeData).forEach(defender => {
      Object.values(defender.tiers).forEach(tier => {
        tier.skills.forEach(skill => {
          skill.unlocked = false;
        });
      });
    });
    
    // Clear localStorage completely
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('mondefense_skill_progress');
    }
    
    this.saveProgress();
    this.dispatchProgressUpdate();
    console.log('[SKILL TREE] Progress reset and localStorage cleared');
  }

  // Clear old data and start fresh (called on game start)
  clearOldData() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('mondefense_skill_progress');
      if (saved) {
        try {
          const progressData = JSON.parse(saved);
          const lastSaved = progressData.lastSaved || 0;
          const now = Date.now();
          const hoursSinceLastSave = (now - lastSaved) / (1000 * 60 * 60);
          
          // If data is older than 1 hour, reset it
          if (hoursSinceLastSave > 1) {
            console.log('[SKILL TREE] Clearing old data (older than 1 hour)');
            this.resetProgress();
            return;
          }
        } catch (error) {
          console.warn('[SKILL TREE] Error parsing saved data, resetting:', error);
          this.resetProgress();
          return;
        }
      }
    }
    
    // Load normally if data is recent
    this.loadProgress();
  }

  // Get all unlocked skills for a defender
  getUnlockedSkills(defenderId) {
    const unlockedSkills = [];
    const defender = this.skillTreeData[defenderId];
    if (!defender) return unlockedSkills;
    
    for (const tier of Object.values(defender.tiers)) {
      for (const skill of tier.skills) {
        if (skill.unlocked) {
          unlockedSkills.push(skill.id);
        }
      }
    }
    return unlockedSkills;
  }

  // Check if a skill is unlocked
  isSkillUnlocked(defenderId, skillId) {
    const defender = this.skillTreeData[defenderId];
    if (!defender) return false;
    
    for (const tier of Object.values(defender.tiers)) {
      const skill = tier.skills.find(s => s.id === skillId);
      if (skill) {
        return skill.unlocked || false;
      }
    }
    return false;
  }

  // Check if a skill can be unlocked (requirements met)
  canUnlockSkill(defenderId, skillId) {
    const defender = this.skillTreeData[defenderId];
    if (!defender) return false;
    
    for (const tier of Object.values(defender.tiers)) {
      const skill = tier.skills.find(s => s.id === skillId);
      if (skill) {
        // Already unlocked
        if (skill.unlocked) return false;
        
        // Check requirements
        const hasScore = this.totalScore >= skill.scoreRequired;
        const hasEnemies = this.enemiesDefeated >= skill.enemiesRequired;
        
        return hasScore && hasEnemies;
      }
    }
    return false;
  }

  // Unlock a skill
  unlockSkill(defenderId, skillId) {
    const defender = this.skillTreeData[defenderId];
    if (!defender) return false;
    
    for (const tier of Object.values(defender.tiers)) {
      const skill = tier.skills.find(s => s.id === skillId);
      if (skill && this.canUnlockSkill(defenderId, skillId)) {
        skill.unlocked = true;
        this.unlockedSkills.add(`${defenderId}_${skillId}`);
        this.saveProgress();
        this.dispatchProgressUpdate();
        return true;
      }
    }
    return false;
  }
}

// Export for use in other modules
export default SkillTreeManager;