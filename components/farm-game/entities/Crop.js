'use client';

export default class Crop extends Phaser.GameObjects.Container {
  constructor(scene, x, y, cropType = 'carrot') {
    super(scene, x, y);
    scene.add.existing(this);
    
    // Store properties
    this.scene = scene;
    this.cropType = cropType;
    this.growthState = 'seedling';
    this.growthProgress = 0;
    this.maxGrowth = 100;
    this.growthRate = 0.5;
    this.isHarvestable = false;
    this.health = 100;
    this.maxHealth = 100;
    this.isActive = true;
    this.isGrowing = false;
    this.damageSound = null;
    this.value = 4; // Coins per harvest - increased for better economy
    this.growthMultiplier = 1.0; // Multiplier from upgrades
    this.yieldMultiplier = 1.0;  // Multiplier from upgrades
    
    // Create plant sprite based on crop type
    this.createSprites();
    
    // Create health bar for crop
    this.createHealthBar();
    
    // Add interactions
    this.setSize(32, 32);
    this.setInteractive();
    this.on('pointerdown', () => {
      if (this.isHarvestable) {
        this.harvest();
      }
    });
    
    // Add hover tooltip functionality
    this.on('pointerover', () => this.showTooltip());
    this.on('pointerout', () => this.hideTooltip());
    
    // Initialize tooltip
    this.tooltip = null;
    
    // Start growth
    this.startGrowth();
    
    // Apply game balance adjustments based on current wave
    this.adjustForWave();
    
    // Apply any existing upgrades
    this.applyUpgrades();
    
    // Crop created
  }
  
  createSprites() {
    // Choose random tree type for variety
    const treeVariants = ['tree', 'fruitTree'];
    this.treeType = treeVariants[Math.floor(Math.random() * treeVariants.length)];
    
    // Create shadow sprite
    this.shadowSprite = this.scene.add.image(0, 8, 'shadow1');
    this.shadowSprite.setScale(0.6);
    this.shadowSprite.setAlpha(0.4);
    this.add(this.shadowSprite);
    
    // Create plant sprite starting with smallest tree (Tree3)
    const initialTexture = this.treeType === 'fruitTree' ? 'fruitTree2' : 'tree3';
    this.plantSprite = this.scene.add.image(0, 0, initialTexture);
    this.plantSprite.setScale(0.2); // Start very small
    this.add(this.plantSprite);
    
    // Add a small indicator that the plant is harvestable (initially hidden)
    this.harvestIndicator = this.scene.add.text(0, -20, '✓', {
      font: 'bold 14px Arial',
      fill: '#00FF00'
    }).setOrigin(0.5);
    this.harvestIndicator.setVisible(false);
    this.add(this.harvestIndicator);
  }
  
  createHealthBar() {
    // Create health bar background
    this.healthBarBg = this.scene.add.rectangle(0, -25, 30, 4, 0x000000);
    this.healthBarBg.setAlpha(0.7);
    this.add(this.healthBarBg);
    
    // Create health bar fill
    this.healthBar = this.scene.add.rectangle(-15, -25, 30, 4, 0x00FF00);
    this.healthBar.setOrigin(0, 0.5);
    this.add(this.healthBar);
    
    // Hide health bar initially
    this.healthBarBg.setVisible(false);
    this.healthBar.setVisible(false);
  }
  
  startGrowth() {
    if (this.growthTimer) {
      return; // Already growing
    }

    // Set growing flag
    this.isGrowing = true;

    // Calculate actual growth delay based on growth speed and multiplier
    const growthDelay = Math.max(500, 1000 / this.growthMultiplier);

    // Create a timer that increments growth
    this.growthTimer = this.scene.time.addEvent({
      delay: growthDelay,
      callback: this.grow,
      callbackScope: this,
      loop: true
    });
  }
  
  grow() {
    if (!this.isActive || this.growthProgress >= this.maxGrowth) {
      return;
    }

    // Increment growth based on growth speed and multiplier
    const effectiveGrowthSpeed = this.growthRate * this.growthMultiplier;
    this.growthProgress += effectiveGrowthSpeed;

    // Cap growth
    if (this.growthProgress >= this.maxGrowth) {
      this.growthProgress = this.maxGrowth;
      this.setGrowthState('mature');
      this.isGrowing = false; // Stop growing when mature

      // Stop the growth timer
      if (this.growthTimer) {
        this.growthTimer.destroy();
        this.growthTimer = null;
      }
    } else if (this.growthProgress >= this.maxGrowth / 2 && this.growthState === 'seedling') {
      this.setGrowthState('growing');
    }
  }
  
  setGrowthState(state) {
    // Update state
    this.growthState = state;
    
    // Update visual appearance with texture and scale changes
    if (state === 'seedling') {
      // Start with smallest tree (Tree3 or fruitTree2)
      const texture = this.treeType === 'fruitTree' ? 'fruitTree2' : 'tree3';
      this.plantSprite.setTexture(texture);
      this.plantSprite.setScale(0.2); // Very small
      this.isHarvestable = false;
      this.harvestIndicator.setVisible(false);
    } else if (state === 'growing') {
      // Medium tree (Tree2 or fruitTree1)
      const texture = this.treeType === 'fruitTree' ? 'fruitTree1' : 'tree2';
      this.plantSprite.setTexture(texture);
      this.plantSprite.setScale(0.4); // Medium size
      this.isHarvestable = false;
      this.harvestIndicator.setVisible(false);
    } else if (state === 'mature') {
      // Largest tree (Tree1 or fruitTree1 - using tree1 for final stage)
      const texture = this.treeType === 'fruitTree' ? 'fruitTree1' : 'tree1';
      this.plantSprite.setTexture(texture);
      this.plantSprite.setScale(0.6); // Full grown size
      this.isHarvestable = true;
      this.harvestIndicator.setVisible(true);
      
      // Add a small "bob" animation
      this.scene.tweens.add({
        targets: this.plantSprite,
        y: -2,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Play a sound if available
      if (this.scene.sound && this.scene.sound.add) {
        try {
          const growSound = this.scene.sound.add('grow_complete', { 
            volume: 0.2,
            rate: 0.8 + Math.random() * 0.4
          });
          growSound.play();
        } catch (e) {
          console.log("Could not play grow sound", e);
        }
      }
      
      // Show floating text
      if (this.scene.showFloatingText) {
        this.scene.showFloatingText(this.x, this.y - 30, 'Ready!', 0x00FF00);
      }
    }
  }
  
  setHarvestReady(ready) {
    this.isHarvestable = ready;
    
    // Show/hide harvest indicator
    if (this.harvestIndicator) {
      this.harvestIndicator.setVisible(ready);
    }
    
    // Add "ready" animation if it's harvestable
    if (ready && this.plantSprite) {
      this.scene.tweens.add({
        targets: this.plantSprite,
        y: -2,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Show floating text
      if (this.scene.showFloatingText) {
        this.scene.showFloatingText(this.x, this.y - 30, 'Ready!', 0x00FF00);
      }
    }
  }
  
  harvest() {
    if (!this.isActive || !this.isHarvestable) {
      return 0;
    }

    // Play harvest sound
    if (this.scene.soundManager) {
      this.scene.soundManager.play('harvest');
    }

    // Reset growth
    this.growthProgress = 0;
    this.isHarvestable = false;
    this.setGrowthState('seedling'); // This will reset texture and scale

    // Restart growth cycle
    this.startGrowth();

    // Calculate yield
    const yieldAmount = this.calculateYield();

    // Generate coins with flying coin animation
    if (this.scene.createFlyingCoinEffect) {
      // Use the flying coin effect for better visual feedback
      this.scene.createFlyingCoinEffect(this.x, this.y, yieldAmount);
    } else if (this.scene.updateFarmCoins) {
      // Fallback to direct coin update if flying effect not available
      this.scene.updateFarmCoins(yieldAmount);
      
      // Show floating text as backup visual feedback
      if (this.scene.showFloatingText) {
        this.scene.showFloatingText(this.x, this.y, `+${yieldAmount} coins`, 0xFFFF00);
      }
    }

    // Show harvest notification message
    this.showHarvestNotification(yieldAmount);

    // Add visual effect when harvesting
    this.scene.tweens.add({
      targets: this,
      y: this.y - 10,
      duration: 100,
      yoyo: true,
      ease: 'Power1'
    });

    return yieldAmount;
  }

  showHarvestNotification(yieldAmount) {
    // Create a prominent notification message
    const notificationText = this.scene.add.text(400, 100, `🌾 Crop Harvested! +${yieldAmount} Coins 💰`, {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#FFFF00',
      stroke: '#000000',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 5,
        fill: true
      }
    }).setOrigin(0.5).setDepth(3000);

    // Animate the notification
    this.scene.tweens.add({
      targets: notificationText,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 1, to: 0 },
      y: notificationText.y - 50,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        notificationText.destroy();
      }
    });

    // Add a coin particle effect
    this.createCoinParticles();
  }

  createCoinParticles() {
    // Create multiple coin particles around the crop
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5;
      const distance = 30;
      const particleX = this.x + Math.cos(angle) * distance;
      const particleY = this.y + Math.sin(angle) * distance;

      const coinParticle = this.scene.add.text(particleX, particleY, '💰', {
        fontSize: '20px'
      }).setDepth(2500);

      // Animate particles flying towards the coin counter
      this.scene.tweens.add({
        targets: coinParticle,
        x: 100, // Approximate position of coin counter
        y: 30,
        scale: { from: 1, to: 0.3 },
        alpha: { from: 1, to: 0 },
        duration: 1000 + (i * 100), // Stagger the animations
        ease: 'Power2',
        onComplete: () => {
          coinParticle.destroy();
        }
      });
    }
  }
  
  calculateYield() {
    // Base yield with some randomness, modified by yield multiplier
    const baseYield = this.value + Math.random() * 3; // Increased random bonus
    const finalYield = Math.floor(baseYield * this.yieldMultiplier);
    // Yield calculated
    return finalYield;
  }
  
  damage(amount) {
    // Reduce health
    this.health -= amount;
    
    // Update health bar
    this.healthBarBg.setVisible(true);
    this.healthBar.setVisible(true);
    this.healthBar.width = Math.max(0, (this.health / this.maxHealth) * 30);
    
    // Change color based on health
    if (this.health < this.maxHealth * 0.3) {
      this.healthBar.fillColor = 0xFF0000;
    } else if (this.health < this.maxHealth * 0.6) {
      this.healthBar.fillColor = 0xFFFF00;
    }
    
    // Check for destruction
    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    
    // Hide health bar after delay
    this.scene.time.delayedCall(2000, () => {
      if (this.healthBarBg) {
        this.healthBarBg.setVisible(false);
        this.healthBar.setVisible(false);
      }
    });
    
    return false;
  }
  
  update() {
    // Update health bar visibility based on damage
    if (this.healthBar) {
      const healthPercentage = this.health / this.maxHealth;
      if (healthPercentage < 1.0) {
        this.healthBar.setVisible(true);
        this.updateHealthBar();
      } else {
        this.healthBar.setVisible(false);
      }
    }

    // Update crop state (removed debug logging)
  }
  
  adjustForWave() {
    // Get current wave
    const wave = this.scene.gameState?.wave || 1;
    
    // Adjust growth rate based on wave
    if (wave > 1) {
      this.growthRate = Math.min(1.5, 0.5 + (wave * 0.1));
    }
  }
  
  destroy() {
    // Hide tooltip before destroying
    this.hideTooltip();
    
    // Clean up timers
    if (this.growthTimer) {
      this.growthTimer.remove();
      this.growthTimer = null;
    }
    
    // Clean up tweens
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.killTweensOf(this.plantSprite);
    
    // Set as inactive
    this.isActive = false;
    
    // Remove from parent
    super.destroy();
  }
  
  // Apply existing upgrades when a crop is created
  applyUpgrades() {
    // If upgrade system exists, apply current upgrades
    if (this.scene.upgradeSystem) {
      const yieldUpgrade = this.scene.upgradeSystem.getUpgradeValue('cropYield');
      const growthUpgrade = this.scene.upgradeSystem.getUpgradeValue('cropGrowth');
      
      // Apply crop yield upgrade
      this.updateYield(yieldUpgrade);
      
      // Apply growth rate upgrade
      this.updateGrowthRate(growthUpgrade);
    }
  }
  
  // Update the yield multiplier when upgraded
  updateYield(multiplier) {
    if (typeof multiplier === 'number' && multiplier > 0) {
      this.yieldMultiplier = multiplier;
      
      // Show visual feedback
      if (this.plantSprite) {
        const currentScale = this.plantSprite.scaleX;
        this.scene.tweens.add({
          targets: this.plantSprite,
          scaleX: currentScale * 1.2,
          scaleY: currentScale * 1.2,
          duration: 200,
          yoyo: true,
          onComplete: () => {
            if (this.plantSprite) {
              // Restore to current growth state scale
              this.plantSprite.setScale(currentScale);
            }
          }
        });
      }
      
      // Yield multiplier updated
    }
  }
  
  // Update the growth rate multiplier when upgraded
  updateGrowthRate(multiplier) {
    if (typeof multiplier === 'number' && multiplier > 0) {
      this.growthMultiplier = multiplier;
      
      // Update the growth timer if it exists
      if (this.growthTimer) {
        this.growthTimer.destroy();
        this.growthTimer = null;
        this.isGrowing = false;
        this.startGrowth(); // Restart with new delay
      }
      
      // Show visual feedback
      if (this.plantSprite) {
        this.scene.tweens.add({
          targets: this.plantSprite,
          alpha: 0.7,
          duration: 100,
          yoyo: true,
          repeat: 3
        });
      }
    }
  }
  
  showTooltip() {
    if (this.tooltip) return; // Already showing
    
    // Calculate expected yield
    const expectedYield = this.calculateYield();
    
    // Create tooltip background
    const tooltipBg = this.scene.add.rectangle(this.x, this.y - 80, 160, 80, 0x000000, 0.8);
    tooltipBg.setStrokeStyle(2, 0x00FF00);
    tooltipBg.setDepth(1000);
    
    // Create tooltip text
    const tooltipText = this.scene.add.text(this.x, this.y - 80, 
      `${this.cropType.toUpperCase()}\n` +
      `State: ${this.growthState}\n` +
      `Growth: ${Math.floor(this.growthProgress)}%\n` +
      `Expected Yield: ${expectedYield} coins\n` +
      `Health: ${Math.floor(this.health)}/${this.maxHealth}`,
      {
        fontSize: '12px',
        fill: '#FFFFFF',
        align: 'center',
        fontFamily: 'Arial'
      }
    );
    tooltipText.setOrigin(0.5);
    tooltipText.setDepth(1001);
    
    // Store tooltip elements
    this.tooltip = {
      background: tooltipBg,
      text: tooltipText
    };
  }
  
  hideTooltip() {
    if (!this.tooltip) return;
    
    // Destroy tooltip elements
    if (this.tooltip.background) {
      this.tooltip.background.destroy();
    }
    if (this.tooltip.text) {
      this.tooltip.text.destroy();
    }
    
    this.tooltip = null;
  }
}