'use client';

import Defense from './Defense.js';

export default class SkillDefender extends Defense {
  constructor(scene, type, x, y, skillTreeManager, skinKey = null) {
    super(scene, type, x, y, skinKey);
    
    this.skillTreeManager = skillTreeManager;
    this.activeSkills = new Set();
    this.skillCooldowns = new Map();
    this.skillEffects = new Map();
    
    // Initialize defender-specific skills
    this.initializeSkills();
    
    // Apply any unlocked skills
    this.applyUnlockedSkills();
  }
  
  initializeSkills() {
    // Check if skillTreeManager is available
    if (!this.skillTreeManager || typeof this.skillTreeManager.getDefenderData !== 'function') {
      console.warn('SkillTreeManager not available, skipping skill initialization');
      return;
    }
    
    console.log(`[SKILL DEBUG] Initializing skills for ${this.type.toUpperCase()}`);
    
    // Get unlocked skills for this defender type
    const defenderData = this.skillTreeManager.getDefenderData(this.type.toUpperCase());
    if (!defenderData) {
      console.warn(`[SKILL DEBUG] No defender data found for ${this.type.toUpperCase()}`);
      return;
    }
    
    // Get activated skills from skillTreeManager (not just unlocked ones)
    const activatedSkills = this.skillTreeManager.getActiveSkills(this.type.toUpperCase());
    console.log(`[SKILL DEBUG] Activated skills for ${this.type.toUpperCase()}:`, Array.from(activatedSkills));
    
    // Also check for unlocked skills that should be auto-activated
    Object.values(defenderData.tiers).forEach(tier => {
      tier.skills.forEach(skill => {
        if (skill.unlocked) {
          console.log(`[SKILL DEBUG] Found unlocked skill: ${skill.id}`);
          this.activeSkills.add(skill.id);
          this.skillCooldowns.set(skill.id, 0);
        }
      });
    });
    
    // Add activated skills from skillTreeManager
    activatedSkills.forEach(skillId => {
      console.log(`[SKILL DEBUG] Adding activated skill: ${skillId}`);
      this.activeSkills.add(skillId);
      this.skillCooldowns.set(skillId, 0);
    });
    
    console.log(`[SKILL DEBUG] Final active skills for ${this.type.toUpperCase()}:`, Array.from(this.activeSkills));
  }
  
  applyUnlockedSkills() {
    // Apply passive skills immediately
    this.activeSkills.forEach(skillId => {
      this.applySkillEffect(skillId);
    });
  }
  
  applySkillEffect(skillId) {
    const skillData = this.getSkillData(skillId);
    if (!skillData) return;
    
    switch (skillId) {
      // CHOG Skills
      case 'chog_wind_gust':
        this.range *= 1.25;
        this.addKnockbackEffect();
        break;
      case 'chog_sharp_eyes':
        this.damage *= 1.2;
        this.addCriticalHitChance(0.15);
        break;
      case 'chog_thorn_barrier':
        this.addThornBarrierAbility();
        break;
      case 'chog_dual_target':
        this.addDualTargetAbility();
        break;
      case 'chog_natures_wrath':
        this.addNaturesWrathUltimate();
        break;
      case 'chog_poison_spores':
        this.addPoisonSporesUltimate();
        break;
        
      // MOLANDAK Skills
      case 'molandak_frost_aura':
        this.addFrostAura();
        break;
      case 'molandak_ice_shards':
        this.addIceShardEffect();
        break;
      case 'molandak_glacial_armor':
        this.addGlacialArmor();
        break;
      case 'molandak_freeze_blast':
        this.addFreezeBlastAbility();
        break;
      case 'molandak_blizzard':
        this.addBlizzardUltimate();
        break;
      case 'molandak_permafrost':
        this.addPermafrostUltimate();
        break;
        
      // MOYAKI Skills
      case 'moyaki_flame_burst':
        this.addFlameBurstEffect();
        break;
      case 'moyaki_fire_trail':
        this.addFireTrailEffect();
        break;
      case 'moyaki_multi_strike':
        this.addMultiStrikeAbility();
        break;
      case 'moyaki_inferno':
        this.addInfernoAbility();
        break;
      case 'moyaki_meteor_strike':
        this.addMeteorStrikeUltimate();
        break;
      case 'moyaki_fire_lord':
        this.addFireLordUltimate();
        break;
        
      // KEON Skills
      case 'keon_tactical_analysis':
        this.addTacticalAnalysis();
        break;
      case 'keon_precision_strike':
        this.addPrecisionStrike();
        break;
      case 'keon_battle_stance':
        this.addBattleStance();
        break;
      case 'keon_weakness_exploit':
        this.addWeaknessExploit();
        break;
      case 'keon_legendary_presence':
        this.addLegendaryPresenceUltimate();
        break;
      case 'keon_master_of_arms':
        this.addMasterOfArmsUltimate();
        break;
    }
  }
  
  getSkillData(skillId) {
    const defenderType = skillId.split('_')[0].toUpperCase();
    const defenderData = this.skillTreeManager.getDefenderData(defenderType);
    if (!defenderData) return null;
    
    for (const tier of Object.values(defenderData.tiers)) {
      const skill = tier.skills.find(s => s.id === skillId);
      if (skill) return skill;
    }
    return null;
  }
  
  // CHOG Skill Implementations
  addKnockbackEffect() {
    this.knockbackPower = 50;
    this.originalAttack = this.attack.bind(this);
    this.attack = (enemy) => {
      const result = this.originalAttack(enemy);
      if (result && this.type === 'chog' && enemy.type === 'bird') {
        this.applyKnockback(enemy);
      }
      return result;
    };
  }
  
  applyKnockback(enemy) {
    if (!enemy.sprite || !enemy.sprite.body) return;
    
    const knockbackX = (enemy.x - this.x) * 0.5;
    const knockbackY = (enemy.y - this.y) * 0.5;
    
    enemy.sprite.body.setVelocity(knockbackX, knockbackY);
    
    // Reset velocity after a short time
    this.scene.time.delayedCall(200, () => {
      if (enemy.sprite && enemy.sprite.body) {
        enemy.sprite.body.setVelocity(0, 0);
      }
    });
  }
  
  addCriticalHitChance(chance) {
    this.criticalChance = chance;
    this.originalApplyDamage = this.applyDamageToEnemy.bind(this);
    this.applyDamageToEnemy = (enemy, damage) => {
      let finalDamage = damage;
      if (Math.random() < this.criticalChance) {
        finalDamage *= 2;
        this.showCriticalHit(enemy);
      }
      return this.originalApplyDamage(enemy, finalDamage);
    };
  }
  
  showCriticalHit(enemy) {
    this.showDamageText(enemy, 'CRITICAL!', 0xFFD700);
  }
  
  addThornBarrierAbility() {
    this.thornBarrierCooldown = 15000; // 15 seconds
    this.thornBarrierDuration = 8000; // 8 seconds
    this.thornBarrierActive = false;
  }
  
  activateThornBarrier() {
    if (this.thornBarrierActive || this.isSkillOnCooldown('thorn_barrier')) return;
    
    this.thornBarrierActive = true;
    this.setSkillCooldown('thorn_barrier', this.thornBarrierCooldown);
    
    // Create visual barrier
    const barrier = this.scene.add.circle(this.x, this.y, 80, 0x00FF00, 0.3);
    barrier.setStrokeStyle(3, 0x228B22);
    
    // Damage enemies that touch the barrier
    const barrierInterval = setInterval(() => {
      if (!this.thornBarrierActive) {
        clearInterval(barrierInterval);
        return;
      }
      
      const nearbyEnemies = this.getEnemiesInRange(80);
      nearbyEnemies.forEach(enemy => {
        this.applyDamageToEnemy(enemy, this.damage * 0.3);
      });
    }, 500);
    
    // Remove barrier after duration
    this.scene.time.delayedCall(this.thornBarrierDuration, () => {
      this.thornBarrierActive = false;
      barrier.destroy();
      clearInterval(barrierInterval);
    });
  }
  
  addDualTargetAbility() {
    this.canDualTarget = true;
    this.originalAttackNearestEnemy = this.attackNearestEnemy.bind(this);
    this.attackNearestEnemy = (forceAttack = false) => {
      const result = this.originalAttackNearestEnemy(forceAttack);
      
      if (result && this.canDualTarget) {
        // Find second target
        const enemies = this.getEnemiesInRange(this.range);
        const secondTarget = enemies.find(e => e !== this.lastTarget);
        if (secondTarget) {
          this.scene.time.delayedCall(200, () => {
            this.launchProjectile(secondTarget, 'nature');
          });
        }
      }
      
      return result;
    };
  }
  
  // MOLANDAK Skill Implementations
  addFrostAura() {
    this.frostAuraRadius = 100;
    this.frostSlowEffect = 0.3; // 30% slow
    
    // Create visual aura and store reference for cleanup
    this.frostAuraVisual = this.scene.add.circle(this.x, this.y, this.frostAuraRadius, 0x87CEEB, 0.1);
    this.frostAuraVisual.setStrokeStyle(2, 0x4682B4);
    this.frostAuraVisual.setDepth(99); // Below defense but above ground
    
    // Apply slow effect to enemies in range
    this.frostAuraInterval = setInterval(() => {
      if (!this.active || !this.frostAuraVisual) {
        this.cleanupFrostAura();
        return;
      }
      
      const nearbyEnemies = this.getEnemiesInRange(this.frostAuraRadius);
      nearbyEnemies.forEach(enemy => {
        if (!enemy.frostSlowed) {
          enemy.frostSlowed = true;
          enemy.originalSpeed = enemy.speed;
          enemy.speed *= (1 - this.frostSlowEffect);
          
          // Remove slow after leaving aura
          this.scene.time.delayedCall(1000, () => {
            if (enemy.frostSlowed) {
              enemy.speed = enemy.originalSpeed;
              enemy.frostSlowed = false;
            }
          });
        }
      });
    }, 500);
  }

  cleanupFrostAura() {
    if (this.frostAuraInterval) {
      clearInterval(this.frostAuraInterval);
      this.frostAuraInterval = null;
    }
    if (this.frostAuraVisual) {
      this.frostAuraVisual.destroy();
      this.frostAuraVisual = null;
    }
  }
  
  addIceShardEffect() {
    this.iceShardChance = 0.25; // 25% chance
    this.originalLaunchProjectile = this.launchProjectile.bind(this);
    this.launchProjectile = (enemy, projectileType) => {
      const result = this.originalLaunchProjectile(enemy, projectileType);
      
      if (Math.random() < this.iceShardChance) {
        // Launch additional ice shards
        const nearbyEnemies = this.getEnemiesInRange(this.range);
        const additionalTargets = nearbyEnemies.filter(e => e !== enemy).slice(0, 2);
        
        additionalTargets.forEach((target, index) => {
          this.scene.time.delayedCall(100 * (index + 1), () => {
            this.originalLaunchProjectile(target, 'ice');
          });
        });
      }
      
      return result;
    };
  }
  
  // MOYAKI Skill Implementations
  addFlameBurstEffect() {
    this.flameBurstRadius = 60;
    this.originalAttack = this.attack.bind(this);
    this.attack = (enemy) => {
      const result = this.originalAttack(enemy);
      if (result) {
        // Create explosion at enemy location
        this.performAreaAttack(enemy.x, enemy.y, this.flameBurstRadius, this.damage * 0.5, 'fire');
      }
      return result;
    };
  }
  
  addFireTrailEffect() {
    this.fireTrailDuration = 3000; // 3 seconds
    this.fireTrailDamage = this.damage * 0.2;
    
    this.originalLaunchProjectile = this.launchProjectile.bind(this);
    this.launchProjectile = (enemy, projectileType) => {
      const result = this.originalLaunchProjectile(enemy, projectileType);
      
      // Create fire trail at impact location
      if (enemy) {
        const fireTrail = this.scene.add.circle(enemy.x, enemy.y, 30, 0xFF4500, 0.4);
        fireTrail.setStrokeStyle(2, 0xFF0000);
        
        const trailInterval = setInterval(() => {
          const nearbyEnemies = this.scene.enemies.filter(e => {
            const distance = Phaser.Math.Distance.Between(e.x, e.y, fireTrail.x, fireTrail.y);
            return distance <= 30;
          });
          
          nearbyEnemies.forEach(e => {
            this.applyDamageToEnemy(e, this.fireTrailDamage);
          });
        }, 500);
        
        this.scene.time.delayedCall(this.fireTrailDuration, () => {
          clearInterval(trailInterval);
          fireTrail.destroy();
        });
      }
      
      return result;
    };
  }
  
  // KEON Skill Implementations
  addTacticalAnalysis() {
    this.analysisRadius = 150;
    this.damageBonus = 0.25; // 25% damage bonus
    
    // Mark enemies for increased damage
    const analysisInterval = setInterval(() => {
      if (!this.active) {
        clearInterval(analysisInterval);
        return;
      }
      
      const nearbyEnemies = this.getEnemiesInRange(this.analysisRadius);
      nearbyEnemies.forEach(enemy => {
        if (!enemy.analyzed) {
          enemy.analyzed = true;
          enemy.analysisDamageBonus = this.damageBonus;
          
          // Visual indicator
          const marker = this.scene.add.circle(enemy.x, enemy.y - 20, 8, 0xFFD700);
          marker.setStrokeStyle(2, 0xFFA500);
          
          // Follow enemy
          const markerUpdate = () => {
            if (enemy.sprite && marker.active) {
              marker.x = enemy.x;
              marker.y = enemy.y - 20;
              requestAnimationFrame(markerUpdate);
            } else {
              marker.destroy();
            }
          };
          markerUpdate();
        }
      });
    }, 1000);
  }
  
  addPrecisionStrike() {
    this.precisionChance = 0.3; // 30% chance
    this.armorPiercing = true;
    
    this.originalApplyDamage = this.applyDamageToEnemy.bind(this);
    this.applyDamageToEnemy = (enemy, damage) => {
      let finalDamage = damage;
      
      if (Math.random() < this.precisionChance) {
        finalDamage *= 1.5; // 50% more damage
        this.showDamageText(enemy, 'PRECISION!', 0x00FFFF);
        
        // Ignore armor/resistances
        if (enemy.armor) {
          finalDamage += enemy.armor;
        }
      }
      
      return this.originalApplyDamage(enemy, finalDamage);
    };
  }
  
  // Utility methods
  isSkillOnCooldown(skillName) {
    const cooldownKey = `${this.type}_${skillName}`;
    const lastUsed = this.skillCooldowns.get(cooldownKey) || 0;
    const cooldownDuration = this.getSkillCooldown(skillName);
    return (Date.now() - lastUsed) < cooldownDuration;
  }
  
  setSkillCooldown(skillName, duration) {
    const cooldownKey = `${this.type}_${skillName}`;
    this.skillCooldowns.set(cooldownKey, Date.now());
  }
  
  getSkillCooldown(skillName) {
    const cooldowns = {
      'thorn_barrier': 15000,
      'freeze_blast': 20000,
      'inferno': 25000,
      'meteor_strike': 30000,
      'blizzard': 35000,
      'natures_wrath': 40000,
      'fire_lord': 45000,
      'legendary_presence': 50000
    };
    return cooldowns[skillName] || 10000;
  }
  
  // Override update method to handle skill effects
  update(time, delta) {
    super.update(time, delta);
    
    // Update skill-specific effects
    this.updateSkillEffects(time, delta);
  }
  
  updateSkillEffects(time, delta) {
    // Handle active skill effects that need continuous updates
    this.activeSkills.forEach(skillId => {
      switch (skillId) {
        case 'chog_thorn_barrier':
          if (this.thornBarrierActive) {
            // Thorn barrier is handled in its activation method
          }
          break;
        // Add other continuous skill effects here
      }
    });
  }
  
  // Method to refresh skills when new ones are unlocked
  refreshSkills() {
    this.initializeSkills();
    this.applyUnlockedSkills();
  }
  
  // Override destroy to clean up skill effects
  destroy() {
    // Clean up any skill-related intervals or effects
    this.activeSkills.clear();
    this.skillCooldowns.clear();
    this.skillEffects.clear();
    
    // Clean up frost aura specifically
    this.cleanupFrostAura();
    
    super.destroy();
  }
}