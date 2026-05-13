'use client';

import Enemy from './Enemy.js';

export default class EliteEnemy extends Enemy {
  constructor(scene, type, x, y, eliteVariant = 'swift') {
    super(scene, type, x, y);
    
    this.eliteVariant = eliteVariant;
    this.isElite = true;
    this.adaptiveCounter = 0;
    this.lastDamageType = null;
    this.resistances = new Map();
    this.specialAbilities = new Set();
    
    // Apply elite enhancements
    this.applyEliteEnhancements();
    this.initializeEliteAbilities();
    this.createEliteVisuals();
  }
  
  applyEliteEnhancements() {
    const currentWave = this.scene.gameState?.wave || 1;
    const eliteMultiplier = 1.5 + (currentWave * 0.1);
    
    // Base elite enhancements
    this.health = Math.floor(this.health * eliteMultiplier);
    this.maxHealth = this.health;
    this.value = Math.floor(this.value * 2.5);
    this.damage = Math.floor(this.damage * 1.3);
    
    // Apply variant-specific enhancements
    switch (this.eliteVariant) {
      case 'swift':
        this.speed *= 1.8;
        this.specialAbilities.add('dash');
        this.dashCooldown = 3000;
        this.lastDashTime = 0;
        break;
        
      case 'armored':
        this.health *= 1.5;
        this.maxHealth = this.health;
        this.damageResistance = Math.min(0.7, (this.damageResistance || 0) + 0.3);
        this.specialAbilities.add('armor_regeneration');
        break;
        
      case 'regenerative':
        this.regenRate = Math.floor(this.maxHealth * 0.02); // 2% per second
        this.specialAbilities.add('health_regeneration');
        break;
        
      case 'adaptive':
        this.adaptiveThreshold = 3; // Adapt after 3 hits of same type
        this.maxResistance = 0.6;
        this.specialAbilities.add('damage_adaptation');
        break;
        
      case 'berserker':
        this.berserkerThreshold = 0.5; // Activate at 50% health
        this.berserkerActive = false;
        this.specialAbilities.add('berserker_rage');
        break;
        
      case 'phase':
        this.phaseChance = 0.25; // 25% chance to phase through attacks
        this.specialAbilities.add('phase_shift');
        break;
    }
  }
  
  initializeEliteAbilities() {
    // Initialize ability-specific properties and intervals
    if (this.specialAbilities.has('health_regeneration')) {
      this.regenInterval = setInterval(() => {
        if (this.active && this.health < this.maxHealth) {
          this.health = Math.min(this.maxHealth, this.health + this.regenRate);
          this.updateHealthBar();
          this.showRegenEffect();
        }
      }, 1000);
      this.activeIntervals.add(this.regenInterval);
    }
    
    if (this.specialAbilities.has('armor_regeneration')) {
      this.armorRegenInterval = setInterval(() => {
        if (this.active && this.damageResistance < 0.7) {
          this.damageResistance = Math.min(0.7, this.damageResistance + 0.02);
          this.showArmorRegenEffect();
        }
      }, 2000);
      this.activeIntervals.add(this.armorRegenInterval);
    }
  }
  
  createEliteVisuals() {
    if (!this.sprite) return;
    
    // Add elite glow effect
    const glowColor = this.getEliteGlowColor();
    this.eliteGlow = this.scene.add.circle(this.x, this.y, 25, glowColor, 0.3);
    this.eliteGlow.setStrokeStyle(3, glowColor);
    
    // Add elite crown/indicator
    this.eliteCrown = this.scene.add.text(this.x, this.y - 30, '👑', {
      fontSize: '16px',
      fill: '#FFD700'
    }).setOrigin(0.5);
    
    // Pulsing animation for elite glow
    this.scene.tweens.add({
      targets: this.eliteGlow,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }
  
  getEliteGlowColor() {
    const colors = {
      'swift': 0x00FFFF,      // Cyan
      'armored': 0x808080,    // Gray
      'regenerative': 0x00FF00, // Green
      'adaptive': 0xFF00FF,   // Magenta
      'berserker': 0xFF0000,  // Red
      'phase': 0x9400D3       // Purple
    };
    return colors[this.eliteVariant] || 0xFFD700;
  }
  
  // Override takeDamage to implement adaptive mechanics
  takeDamage(amount, damageType = 'physical', source = null) {
    // Phase shift ability
    if (this.specialAbilities.has('phase_shift') && Math.random() < this.phaseChance) {
      this.showPhaseEffect();
      return false; // Damage phased through
    }
    
    // Adaptive resistance
    if (this.specialAbilities.has('damage_adaptation')) {
      this.handleDamageAdaptation(damageType);
    }
    
    // Apply resistance
    const resistance = this.resistances.get(damageType) || 0;
    const finalAmount = amount * (1 - resistance);
    
    const result = super.takeDamage(finalAmount, damageType, source);
    
    // Check for berserker activation
    if (this.specialAbilities.has('berserker_rage') && !this.berserkerActive) {
      const healthPercent = this.health / this.maxHealth;
      if (healthPercent <= this.berserkerThreshold) {
        this.activateBerserkerRage();
      }
    }
    
    return result;
  }
  
  handleDamageAdaptation(damageType) {
    if (this.lastDamageType === damageType) {
      this.adaptiveCounter++;
    } else {
      this.adaptiveCounter = 1;
      this.lastDamageType = damageType;
    }
    
    if (this.adaptiveCounter >= this.adaptiveThreshold) {
      const currentResistance = this.resistances.get(damageType) || 0;
      const newResistance = Math.min(this.maxResistance, currentResistance + 0.15);
      this.resistances.set(damageType, newResistance);
      
      this.showAdaptationEffect(damageType);
      this.adaptiveCounter = 0; // Reset counter after adaptation
    }
  }
  
  activateBerserkerRage() {
    this.berserkerActive = true;
    this.speed *= 1.5;
    this.damage *= 1.8;
    
    // Visual effect
    this.berserkerAura = this.scene.add.circle(this.x, this.y, 30, 0xFF0000, 0.4);
    this.berserkerAura.setStrokeStyle(4, 0xFF4500);
    
    this.scene.tweens.add({
      targets: this.berserkerAura,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0.2,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Power2'
    });
    
    this.showBerserkerEffect();
  }
  
  // Override update method to handle elite abilities
  update(delta) {
    super.update(delta);
    
    // Update elite-specific mechanics
    this.updateEliteAbilities(delta);
    this.updateEliteVisuals();
  }
  
  updateEliteAbilities(delta) {
    const currentTime = this.scene.time.now;
    
    // Swift dash ability
    if (this.specialAbilities.has('dash') && 
        currentTime - this.lastDashTime > this.dashCooldown) {
      
      // Check if there are defenders nearby to dash towards
      const nearbyDefenders = this.getNearbyDefenders(150);
      if (nearbyDefenders.length > 0 && Math.random() < 0.3) {
        this.performDash();
        this.lastDashTime = currentTime;
      }
    }
  }
  
  updateEliteVisuals() {
    if (this.eliteGlow && this.sprite) {
      this.eliteGlow.x = this.x;
      this.eliteGlow.y = this.y;
    }
    
    if (this.eliteCrown && this.sprite) {
      this.eliteCrown.x = this.x;
      this.eliteCrown.y = this.y - 30;
    }
    
    if (this.berserkerAura && this.sprite) {
      this.berserkerAura.x = this.x;
      this.berserkerAura.y = this.y;
    }
  }
  
  performDash() {
    const dashDistance = 100;
    const dashDirection = Math.random() * Math.PI * 2;
    
    const targetX = this.x + Math.cos(dashDirection) * dashDistance;
    const targetY = this.y + Math.sin(dashDirection) * dashDistance;
    
    // Create dash effect
    this.showDashEffect();
    
    // Perform the dash
    this.scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      duration: 200,
      ease: 'Power2',
      onComplete: () => {
        this.showDashImpact();
      }
    });
  }
  
  getNearbyDefenders(radius) {
    if (!this.scene.defenses) return [];
    
    return this.scene.defenses.filter(defense => {
      if (!defense.active) return false;
      const distance = Phaser.Math.Distance.Between(this.x, this.y, defense.x, defense.y);
      return distance <= radius;
    });
  }
  
  // Visual effect methods
  showRegenEffect() {
    const regenText = this.scene.add.text(this.x, this.y - 20, '+' + this.regenRate, {
      fontSize: '12px',
      fill: '#00FF00',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: regenText,
      y: regenText.y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => regenText.destroy()
    });
  }
  
  showArmorRegenEffect() {
    const armorEffect = this.scene.add.circle(this.x, this.y, 20, 0x808080, 0.5);
    
    this.scene.tweens.add({
      targets: armorEffect,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => armorEffect.destroy()
    });
  }
  
  showPhaseEffect() {
    const phaseText = this.scene.add.text(this.x, this.y - 15, 'PHASE', {
      fontSize: '10px',
      fill: '#9400D3',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: [this.sprite, phaseText],
      alpha: 0.3,
      duration: 200,
      yoyo: true,
      onComplete: () => {
        phaseText.destroy();
        if (this.sprite) this.sprite.alpha = 1;
      }
    });
  }
  
  showAdaptationEffect(damageType) {
    const adaptText = this.scene.add.text(this.x, this.y - 25, `RESIST ${damageType.toUpperCase()}`, {
      fontSize: '8px',
      fill: '#FF00FF',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: adaptText,
      y: adaptText.y - 20,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => adaptText.destroy()
    });
  }
  
  showBerserkerEffect() {
    const berserkerText = this.scene.add.text(this.x, this.y - 35, 'BERSERKER RAGE!', {
      fontSize: '10px',
      fill: '#FF0000',
      fontWeight: 'bold'
    }).setOrigin(0.5);
    
    this.scene.tweens.add({
      targets: berserkerText,
      scaleX: 1.5,
      scaleY: 1.5,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => berserkerText.destroy()
    });
  }
  
  showDashEffect() {
    const dashTrail = this.scene.add.circle(this.x, this.y, 15, 0x00FFFF, 0.6);
    
    this.scene.tweens.add({
      targets: dashTrail,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 300,
      ease: 'Power2',
      onComplete: () => dashTrail.destroy()
    });
  }
  
  showDashImpact() {
    const impact = this.scene.add.circle(this.x, this.y, 25, 0x00FFFF, 0.8);
    
    this.scene.tweens.add({
      targets: impact,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => impact.destroy()
    });
  }
  
  // Override destroy to clean up elite-specific elements
  destroy(silent = false) {
    // Clean up elite visual elements
    if (this.eliteGlow) {
      this.eliteGlow.destroy();
    }
    if (this.eliteCrown) {
      this.eliteCrown.destroy();
    }
    if (this.berserkerAura) {
      this.berserkerAura.destroy();
    }
    
    // Clean up intervals
    if (this.regenInterval) {
      clearInterval(this.regenInterval);
    }
    if (this.armorRegenInterval) {
      clearInterval(this.armorRegenInterval);
    }
    
    super.destroy(silent);
  }
  
  // Static method to create random elite variant
  static createRandomElite(scene, type, x, y) {
    const variants = ['swift', 'armored', 'regenerative', 'adaptive', 'berserker', 'phase'];
    const randomVariant = variants[Math.floor(Math.random() * variants.length)];
    return new EliteEnemy(scene, type, x, y, randomVariant);
  }
  
  // Get elite info for UI display
  getEliteInfo() {
    return {
      variant: this.eliteVariant,
      specialAbilities: Array.from(this.specialAbilities),
      resistances: Object.fromEntries(this.resistances),
      isElite: true
    };
  }
}