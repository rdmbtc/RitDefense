'use client';

import Enemy from './Enemy.js';

export default class BossEnemy extends Enemy {
  constructor(scene, type, x, y, bossType = 'titan') {
    super(scene, type, x, y);
    
    this.bossType = bossType;
    this.isBoss = true;
    this.phase = 1;
    this.maxPhases = 3;
    this.phaseTransitioning = false;
    this.abilities = new Map();
    this.abilityTimers = new Map();
    this.minions = [];
    this.auraEffects = new Set();
    
    // Apply boss enhancements
    this.applyBossEnhancements();
    this.initializeBossAbilities();
    this.createBossVisuals();
    this.setupPhaseSystem();
  }
  
  applyBossEnhancements() {
    const currentWave = this.scene.gameState?.wave || 1;
    const bossMultiplier = 3.0 + (currentWave * 0.2);
    
    // Massive stat increases for boss
    this.health = Math.floor(this.health * bossMultiplier);
    this.maxHealth = this.health;
    this.value = Math.floor(this.value * 5.0);
    this.damage = Math.floor(this.damage * 2.5);
    this.speed *= 0.7; // Bosses are slower but tankier
    
    // Boss-specific resistances
    this.damageResistance = Math.min(0.8, (this.damageResistance || 0) + 0.4);
    this.statusResistance = 0.6; // Resistant to slows, stuns, etc.
    
    // Apply boss type specific enhancements
    switch (this.bossType) {
      case 'titan':
        this.health *= 1.8;
        this.maxHealth = this.health;
        this.auraRadius = 200;
        this.abilities.set('earthquake', { cooldown: 8000, lastUsed: 0 });
        this.abilities.set('stomp', { cooldown: 5000, lastUsed: 0 });
        this.abilities.set('summon_minions', { cooldown: 15000, lastUsed: 0 });
        break;
        
      case 'arcane':
        this.manaPool = 200;
        this.currentMana = this.manaPool;
        this.manaRegen = 5;
        this.abilities.set('arcane_missiles', { cooldown: 3000, lastUsed: 0 });
        this.abilities.set('teleport', { cooldown: 10000, lastUsed: 0 });
        this.abilities.set('mana_burn', { cooldown: 12000, lastUsed: 0 });
        break;
        
      case 'infernal':
        this.fireImmunity = true;
        this.burnAura = true;
        this.abilities.set('fire_nova', { cooldown: 6000, lastUsed: 0 });
        this.abilities.set('meteor_rain', { cooldown: 20000, lastUsed: 0 });
        this.abilities.set('flame_wall', { cooldown: 15000, lastUsed: 0 });
        break;
        
      case 'frost':
        this.iceImmunity = true;
        this.freezeAura = true;
        this.abilities.set('ice_storm', { cooldown: 7000, lastUsed: 0 });
        this.abilities.set('frozen_tomb', { cooldown: 18000, lastUsed: 0 });
        this.abilities.set('blizzard', { cooldown: 25000, lastUsed: 0 });
        break;
        
      case 'shadow':
        this.phaseShiftChance = 0.4;
        this.shadowClones = 0;
        this.maxShadowClones = 3;
        this.abilities.set('shadow_strike', { cooldown: 4000, lastUsed: 0 });
        this.abilities.set('create_clone', { cooldown: 12000, lastUsed: 0 });
        this.abilities.set('darkness', { cooldown: 30000, lastUsed: 0 });
        break;
    }
  }
  
  initializeBossAbilities() {
    // Set up ability intervals and passive effects
    this.abilityUpdateInterval = setInterval(() => {
      if (this.active && !this.phaseTransitioning) {
        this.updateAbilities();
      }
    }, 1000);
    this.activeIntervals.add(this.abilityUpdateInterval);
    
    // Initialize passive auras
    if (this.burnAura) {
      this.initializeBurnAura();
    }
    if (this.freezeAura) {
      this.initializeFreezeAura();
    }
    
    // Mana regeneration for arcane bosses
    if (this.manaPool) {
      this.manaRegenInterval = setInterval(() => {
        if (this.active && this.currentMana < this.manaPool) {
          this.currentMana = Math.min(this.manaPool, this.currentMana + this.manaRegen);
        }
      }, 1000);
      this.activeIntervals.add(this.manaRegenInterval);
    }
  }
  
  createBossVisuals() {
    if (!this.sprite) return;
    
    // Scale up boss sprite
    this.sprite.setScale(2.0);
    
    // Add boss aura
    const auraColor = this.getBossAuraColor();
    this.bossAura = this.scene.add.circle(this.x, this.y, 60, auraColor, 0.2);
    this.bossAura.setStrokeStyle(5, auraColor);
    
    // Add boss crown
    this.bossCrown = this.scene.add.text(this.x, this.y - 50, '👑', {
      fontSize: '24px',
      fill: '#FFD700'
    }).setOrigin(0.5);
    
    // Add boss nameplate
    this.bossNameplate = this.scene.add.text(this.x, this.y - 70, this.getBossName(), {
      fontSize: '14px',
      fill: '#FFFFFF',
      fontWeight: 'bold',
      backgroundColor: '#000000',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);
    
    // Pulsing aura animation
    this.scene.tweens.add({
      targets: this.bossAura,
      scaleX: 1.3,
      scaleY: 1.3,
      alpha: 0.4,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Phase indicator
    this.createPhaseIndicator();
  }
  
  getBossAuraColor() {
    const colors = {
      'titan': 0x8B4513,    // Brown
      'arcane': 0x9400D3,   // Purple
      'infernal': 0xFF4500, // Red-Orange
      'frost': 0x87CEEB,    // Sky Blue
      'shadow': 0x2F2F2F    // Dark Gray
    };
    return colors[this.bossType] || 0xFFD700;
  }
  
  getBossName() {
    const names = {
      'titan': 'Earth Titan',
      'arcane': 'Arcane Lord',
      'infernal': 'Infernal King',
      'frost': 'Frost Queen',
      'shadow': 'Shadow Master'
    };
    return names[this.bossType] || 'Boss Enemy';
  }
  
  setupPhaseSystem() {
    this.phaseThresholds = [0.66, 0.33, 0]; // Health percentages for phase transitions
    this.phaseAbilities = {
      1: ['basic_attack'],
      2: ['enhanced_abilities', 'summon_help'],
      3: ['ultimate_abilities', 'desperation_mode']
    };
  }
  
  createPhaseIndicator() {
    this.phaseIndicator = this.scene.add.text(this.x + 40, this.y - 40, `Phase ${this.phase}`, {
      fontSize: '12px',
      fill: '#FFD700',
      fontWeight: 'bold',
      backgroundColor: '#000000',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5);
  }
  
  // Override takeDamage to handle phase transitions
  takeDamage(amount, damageType = 'physical', source = null) {
    // Phase shift for shadow bosses
    if (this.bossType === 'shadow' && Math.random() < this.phaseShiftChance) {
      this.showPhaseShiftEffect();
      return false;
    }
    
    // Apply resistances
    let finalAmount = amount * (1 - this.damageResistance);
    
    // Type-specific immunities
    if ((damageType === 'fire' && this.fireImmunity) ||
        (damageType === 'ice' && this.iceImmunity)) {
      this.showImmunityEffect(damageType);
      return false;
    }
    
    const result = super.takeDamage(finalAmount, damageType, source);
    
    // Check for phase transition
    this.checkPhaseTransition();
    
    return result;
  }
  
  checkPhaseTransition() {
    if (this.phaseTransitioning) return;
    
    const healthPercent = this.health / this.maxHealth;
    const nextPhase = this.phase + 1;
    
    if (nextPhase <= this.maxPhases && healthPercent <= this.phaseThresholds[this.phase - 1]) {
      this.triggerPhaseTransition(nextPhase);
    }
  }
  
  triggerPhaseTransition(newPhase) {
    this.phaseTransitioning = true;
    this.phase = newPhase;
    
    // Visual transition effect
    this.showPhaseTransitionEffect();
    
    // Apply phase bonuses
    this.applyPhaseEnhancements();
    
    // Update phase indicator
    if (this.phaseIndicator) {
      this.phaseIndicator.setText(`Phase ${this.phase}`);
    }
    
    // End transition after effect
    this.scene.time.delayedCall(2000, () => {
      this.phaseTransitioning = false;
    });
  }
  
  applyPhaseEnhancements() {
    switch (this.phase) {
      case 2:
        this.speed *= 1.2;
        this.damage *= 1.3;
        // Reduce ability cooldowns
        this.abilities.forEach((ability, key) => {
          ability.cooldown *= 0.8;
        });
        break;
        
      case 3:
        this.speed *= 1.4;
        this.damage *= 1.6;
        this.damageResistance = Math.min(0.9, this.damageResistance + 0.1);
        // Further reduce cooldowns
        this.abilities.forEach((ability, key) => {
          ability.cooldown *= 0.6;
        });
        break;
    }
  }
  
  updateAbilities() {
    const currentTime = this.scene.time.now;
    
    this.abilities.forEach((ability, abilityName) => {
      if (currentTime - ability.lastUsed >= ability.cooldown) {
        if (this.shouldUseAbility(abilityName)) {
          this.useAbility(abilityName);
          ability.lastUsed = currentTime;
        }
      }
    });
  }
  
  shouldUseAbility(abilityName) {
    // Basic AI logic for ability usage
    const nearbyDefenders = this.getNearbyDefenders(this.auraRadius || 150);
    const healthPercent = this.health / this.maxHealth;
    
    switch (abilityName) {
      case 'earthquake':
      case 'stomp':
        return nearbyDefenders.length >= 2;
        
      case 'summon_minions':
        return this.minions.length < 3 && healthPercent < 0.7;
        
      case 'teleport':
        return nearbyDefenders.length >= 3;
        
      case 'meteor_rain':
      case 'blizzard':
        return this.phase >= 2 && nearbyDefenders.length >= 1;
        
      case 'create_clone':
        return this.shadowClones < this.maxShadowClones;
        
      default:
        return Math.random() < 0.3; // 30% chance for other abilities
    }
  }
  
  useAbility(abilityName) {
    switch (abilityName) {
      case 'earthquake':
        this.performEarthquake();
        break;
      case 'stomp':
        this.performStomp();
        break;
      case 'summon_minions':
        this.summonMinions();
        break;
      case 'arcane_missiles':
        this.castArcaneMissiles();
        break;
      case 'teleport':
        this.performTeleport();
        break;
      case 'fire_nova':
        this.castFireNova();
        break;
      case 'meteor_rain':
        this.castMeteorRain();
        break;
      case 'ice_storm':
        this.castIceStorm();
        break;
      case 'frozen_tomb':
        this.castFrozenTomb();
        break;
      case 'shadow_strike':
        this.performShadowStrike();
        break;
      case 'create_clone':
        this.createShadowClone();
        break;
    }
  }
  
  // Ability implementations
  performEarthquake() {
    const earthquakeRadius = 180;
    
    // Visual effect
    const earthquake = this.scene.add.circle(this.x, this.y, earthquakeRadius, 0x8B4513, 0.3);
    earthquake.setStrokeStyle(5, 0x654321);
    
    // Damage and slow nearby defenders
    const nearbyDefenders = this.getNearbyDefenders(earthquakeRadius);
    nearbyDefenders.forEach(defender => {
      if (defender.takeDamage) {
        defender.takeDamage(this.damage * 0.8);
      }
      // Stun effect
      defender.stunned = true;
      this.scene.time.delayedCall(2000, () => {
        defender.stunned = false;
      });
    });
    
    // Screen shake effect
    this.scene.cameras.main.shake(1000, 0.02);
    
    this.scene.tweens.add({
      targets: earthquake,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => earthquake.destroy()
    });
  }
  
  summonMinions() {
    const minionCount = Math.min(3, 5 - this.minions.length);
    
    for (let i = 0; i < minionCount; i++) {
      const angle = (Math.PI * 2 / minionCount) * i;
      const distance = 80;
      const minionX = this.x + Math.cos(angle) * distance;
      const minionY = this.y + Math.sin(angle) * distance;
      
      // Create minion (simplified enemy)
      const minion = new (this.scene.Enemy || Enemy)(this.scene, 'rabbit', minionX, minionY);
      minion.health = Math.floor(minion.health * 0.5);
      minion.maxHealth = minion.health;
      minion.isMinion = true;
      minion.bossParent = this;
      
      this.minions.push(minion);
      if (this.scene.enemies) {
        this.scene.enemies.push(minion);
      }
      
      // Summon effect
      this.showSummonEffect(minionX, minionY);
    }
  }
  
  castArcaneMissiles() {
    if (this.currentMana < 30) return;
    
    this.currentMana -= 30;
    const missileCount = 3 + this.phase;
    
    const targets = this.getNearbyDefenders(300);
    for (let i = 0; i < missileCount && i < targets.length; i++) {
      const target = targets[i];
      
      this.scene.time.delayedCall(i * 200, () => {
        this.launchArcaneMissile(target);
      });
    }
  }
  
  performTeleport() {
    if (this.currentMana < 50) return;
    
    this.currentMana -= 50;
    
    // Teleport effect at current location
    this.showTeleportEffect(this.x, this.y);
    
    // Find new position away from defenders
    const defenders = this.getNearbyDefenders(200);
    let newX = this.x;
    let newY = this.y;
    
    if (defenders.length > 0) {
      // Teleport away from defenders
      const avgDefenderX = defenders.reduce((sum, d) => sum + d.x, 0) / defenders.length;
      const avgDefenderY = defenders.reduce((sum, d) => sum + d.y, 0) / defenders.length;
      
      const angle = Math.atan2(this.y - avgDefenderY, this.x - avgDefenderX);
      newX = this.x + Math.cos(angle) * 150;
      newY = this.y + Math.sin(angle) * 150;
    }
    
    // Perform teleport
    this.x = newX;
    this.y = newY;
    if (this.sprite) {
      this.sprite.x = newX;
      this.sprite.y = newY;
    }
    
    // Teleport effect at new location
    this.showTeleportEffect(newX, newY);
  }
  
  // Visual effect methods
  showPhaseTransitionEffect() {
    const transitionEffect = this.scene.add.circle(this.x, this.y, 100, 0xFFD700, 0.8);
    
    this.scene.tweens.add({
      targets: transitionEffect,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => transitionEffect.destroy()
    });
    
    // Phase transition text
    const phaseText = this.scene.add.text(this.x, this.y - 80, `PHASE ${this.phase}!`, {
      fontSize: '20px',
      fill: '#FFD700',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: phaseText,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => phaseText.destroy()
    });
  }
  
  showSummonEffect(x, y) {
    const summonCircle = this.scene.add.circle(x, y, 30, 0x9400D3, 0.6);
    
    this.scene.tweens.add({
      targets: summonCircle,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => summonCircle.destroy()
    });
  }
  
  showTeleportEffect(x, y) {
    const teleportEffect = this.scene.add.circle(x, y, 40, 0x9400D3, 0.7);
    
    this.scene.tweens.add({
      targets: teleportEffect,
      scaleX: 2.5,
      scaleY: 2.5,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => teleportEffect.destroy()
    });
  }
  
  // Override update method
  update(delta) {
    super.update(delta);
    this.updateBossVisuals();
    this.updateMinions();
  }
  
  updateBossVisuals() {
    if (this.bossAura && this.sprite) {
      this.bossAura.x = this.x;
      this.bossAura.y = this.y;
    }
    
    if (this.bossCrown && this.sprite) {
      this.bossCrown.x = this.x;
      this.bossCrown.y = this.y - 50;
    }
    
    if (this.bossNameplate && this.sprite) {
      this.bossNameplate.x = this.x;
      this.bossNameplate.y = this.y - 70;
    }
    
    if (this.phaseIndicator && this.sprite) {
      this.phaseIndicator.x = this.x + 40;
      this.phaseIndicator.y = this.y - 40;
    }
  }
  
  updateMinions() {
    // Remove defeated minions
    this.minions = this.minions.filter(minion => minion.active);
  }
  
  getNearbyDefenders(radius) {
    if (!this.scene.defenses) return [];
    
    return this.scene.defenses.filter(defense => {
      if (!defense.active) return false;
      const distance = Phaser.Math.Distance.Between(this.x, this.y, defense.x, defense.y);
      return distance <= radius;
    });
  }
  
  // Override destroy to clean up boss-specific elements
  destroy(silent = false) {
    // Clean up boss visual elements
    if (this.bossAura) this.bossAura.destroy();
    if (this.bossCrown) this.bossCrown.destroy();
    if (this.bossNameplate) this.bossNameplate.destroy();
    if (this.phaseIndicator) this.phaseIndicator.destroy();
    
    // Clean up minions
    this.minions.forEach(minion => {
      if (minion.active) minion.destroy(true);
    });
    
    // Clean up intervals
    if (this.abilityUpdateInterval) {
      clearInterval(this.abilityUpdateInterval);
    }
    if (this.manaRegenInterval) {
      clearInterval(this.manaRegenInterval);
    }
    
    super.destroy(silent);
  }
  
  // Static method to create random boss type
  static createRandomBoss(scene, type, x, y) {
    const bossTypes = ['titan', 'arcane', 'infernal', 'frost', 'shadow'];
    const randomBossType = bossTypes[Math.floor(Math.random() * bossTypes.length)];
    return new BossEnemy(scene, type, x, y, randomBossType);
  }
  
  // Get boss info for UI display
  getBossInfo() {
    return {
      bossType: this.bossType,
      phase: this.phase,
      maxPhases: this.maxPhases,
      abilities: Array.from(this.abilities.keys()),
      minions: this.minions.length,
      isBoss: true
    };
  }
}