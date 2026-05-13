'use client';

export default class Enemy {
  constructor(scene, type, x, y) {
    this.scene = scene;
    this.type = type;
    this.x = x;
    this.y = y;
    
    // ADDED: Debug logging for initial position
    // console.log(`Enemy ${type} created at initial position (${x}, ${y})`);
    
    this.active = true;
    this.visible = true;
    this.stuck = false;
    this.stuckCounter = 0;
    this.lastX = x;
    this.lastY = y;
    this.timeSinceLastMove = 0;
    this.lastMoveTime = this.scene.time.now;
    this.removeTimeout = null;
    
    // Generate a unique ID for this enemy
    this.id = `${this.type}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    
    // Track intervals and timers for proper cleanup
    this.activeIntervals = new Set();
    this.activeTimers = new Set();
    
    // Get current wave for scaling difficulty
    const currentWave = this.scene.gameState?.wave || 1;
    // INCREASED SCALING: Higher multiplier
    const waveScaling = Math.min(3.0, 1 + (currentWave * 0.18)); // Was: min(2.5, 1 + (currentWave * 0.15))
    
    // Set properties based on type with wave scaling
    if (type === 'bird') {
      // Base properties
      this.baseSpeed = 1.8;
      this.baseHealth = 7; // Increased from 5
      this.baseValue = 10; // Increased bird reward
      
      // Scale with wave
      this.speed = this.baseSpeed + (currentWave * 0.12); // Slightly faster scaling
      this.health = Math.floor(this.baseHealth * waveScaling);
      this.maxHealth = this.health;
      this.value = Math.floor(this.baseValue * waveScaling);
      
      this.color = 0x3498db;
      this.weakAgainst = 'scarecrow';
      this.weaknessMultiplier = 1.5;
    } else if (type === 'deer') {
      // Deer: Tougher, slower, higher value, appears later
      this.baseSpeed = 1.0; 
      this.baseHealth = 18; // Increased from 15
      this.baseValue = 17; // Increased deer reward
      
      // Scale with wave
      this.speed = this.baseSpeed + (currentWave * 0.07); // Slightly faster scaling
      this.health = Math.floor(this.baseHealth * waveScaling * 1.20); // Increased scaling slightly
      this.maxHealth = this.health;
      this.value = Math.floor(this.baseValue * waveScaling);
      
      this.color = 0x8B4513; 
      this.weakAgainst = 'cannon';
      this.weaknessMultiplier = 1.8;
      
      // Deer might have higher damage resistance - Increased scaling slightly
      this.damageResistance = Math.min(0.5, Math.max(0, currentWave - 3) * 0.06); // Was: min(0.4, ... * 0.05)
      
    } else { // Rabbit (default)
      // Base properties
      this.baseSpeed = 1.5;
      this.baseHealth = 8; // Increased from 6
      this.baseValue = 9; // Increased rabbit reward
      
      // Scale with wave
      this.speed = this.baseSpeed + (currentWave * 0.09); // Slightly faster scaling
      this.health = Math.floor(this.baseHealth * waveScaling);
      this.maxHealth = this.health;
      this.value = Math.floor(this.baseValue * waveScaling);
      
      this.color = 0x9b59b6;
      this.weakAgainst = 'dog';
      this.weaknessMultiplier = 1.5;
    }
    
    // Set a default damage value used when enemy reaches the end
    this.damage = type === 'deer' ? 3 : 2; // Keep base damage same for now
    
    // RE-ENABLED: Anti-stacking position variation
    this.x += (Math.random() - 0.5) * 40; 
    this.y += (Math.random() - 0.5) * 100; 
    
    // ADDED: Debug logging after position variation
    // console.log(`Enemy ${this.id} after position variation: (${this.x}, ${this.y})`);
    
    // Ensure minimum values
    this.health = Math.max(4, this.health); // Increased min health
    this.speed = Math.max(0.8, this.speed); // Increased min speed
    this.value = Math.max(3, this.value); // Keep min value
    
    // Cap maximum speed to prevent teleporting/sonic speed
    this.speed = Math.min(2.8, this.speed); // Increased max speed slightly
    
    // Apply difficulty bonuses to later waves with reduced speed scaling
    if (currentWave > 1) {
      // INCREASED flat health bonus
      this.health += Math.floor(currentWave * 0.3); // Was: 0.2
      // Speed bonus removed here, handled in base scaling only
      // Apply general damage resistance if not deer - Increased scaling slightly
      if (type !== 'deer') {
          this.damageResistance = Math.min(0.40, Math.max(0, currentWave - 1) * 0.05); // Was: min(0.35, ... * 0.04)
      }
    }
    
    // Boss waves - Adjustments
    if (currentWave % 5 === 0) {
      this.health = Math.floor(this.health * 1.5); // Slightly higher multiplier
      this.maxHealth = this.health;
      this.value = Math.floor(this.value * 2.0); // Slightly higher multiplier
      this.isBoss = true;
      
      if (this.damageResistance) {
        this.damageResistance = Math.min(0.55, this.damageResistance + 0.1); // Cap resistance slightly higher
      } else {
        this.damageResistance = 0.15; // Slightly higher base for boss
      }
      
      // Use boss sprite for boss waves
      this.spriteKey = 'enemy_boss';
    } else {
      // Use regular enemy sprites
      if (type === 'bird') {
        this.spriteKey = 'enemy_bird';
      } else if (type === 'deer') {
        this.spriteKey = 'enemy_deer'; // Use deer sprite
      } else { // Rabbit or other types
        // Determine sprite based on type or fallback
        this.spriteKey = `enemy_${type.toLowerCase()}`; 
        if (!scene.textures.exists(this.spriteKey)) {
            this.spriteKey = 'enemy_rabbit'; // Default fallback
        }
      }
    }
    
    // Create visual representation using sprite images with fallback
    try {
      // CRITICAL FIX: Force textures to load if not in cache
      if (!scene.textures.exists(this.spriteKey)) {
        console.warn(`Texture key ${this.spriteKey} missing, attempting fallback...`);
        // Fallback logic based on type
        if (type === 'bird') {
          this.spriteKey = 'enemy_bird';
          if (!scene.textures.exists('enemy_bird')) {
            this.spriteKey = 'enemy_rabbit'; // Ultimate fallback
          }
        } else if (type === 'deer') {
          this.spriteKey = 'enemy_deer';
          if (!scene.textures.exists('enemy_deer')) {
            this.spriteKey = 'enemy_rabbit'; // Ultimate fallback
          }
        } else { // Rabbit or unknown
           this.spriteKey = 'enemy_rabbit';
        }
        console.warn(`Using fallback texture key: ${this.spriteKey}`);
      }
      
      // Check if the sprite texture exists in the cache
      if (scene.textures.exists(this.spriteKey)) {
        // Create a container for the enemy (for better grouping)
        this.container = scene.add.container(x, y);
        this.container.setDepth(100); // Use consistent depth 
        
        // Use a large visible sprite for the enemy
        this.sprite = scene.add.sprite(0, 0, this.spriteKey);
        this.sprite.setDisplaySize(60, 60); // Larger size for better visibility
        this.sprite.setInteractive({ useHandCursor: true, pixelPerfect: false }); // Make it interactive for clicks with larger hitbox
        this.sprite.flipX = true; // ADDED: Flip the sprite horizontally to face left
        
        // Add idle animation to the sprite
        this.addIdleAnimation();
        
        // Add entrance animation
        this.addEntranceAnimation();
        
        // Make sprite more interactive
        this.sprite.on('pointerdown', () => {
          if (this.scene && this.scene.gameState && typeof this.scene.gameState.clickDamage === 'number') {
            const clickDamage = this.scene.gameState.clickDamage || 1;
            this.takeDamage(clickDamage);
            console.log(`Enemy clicked and taking ${clickDamage} damage`);
          }
        });
        
        // Add to container (no highlight circle)
        this.container.add([this.sprite]);
        
        // CRITICAL: Make the container physics-enabled for collision detection
        if (scene.physics && scene.physics.world) {
          scene.physics.world.enable(this.container);
          this.container.body.setSize(50, 50); // Set collision hitbox size
          this.container.body.setCollideWorldBounds(false); // Allow movement off screen
          this.container.body.setImmovable(false); // Allow movement
          this.container.body.enable = true; // ADDED: Explicitly enable the body
          
          // ADDED: Set initial velocity immediately
          this.setInitialVelocity();
        }
        
        console.log(`Created enemy sprite with texture: ${this.spriteKey}`);
      } else {
        // Fallback to colored circle if texture doesn't exist
        console.warn(`Texture ${this.spriteKey} not found, using fallback circle`);
        
        // Create a container
        this.container = scene.add.container(x, y);
        this.container.setDepth(100);
        
        // FIX: Create a visible fallback graphic
        const graphics = scene.add.graphics();
        graphics.fillStyle(this.color, 1);
        graphics.fillCircle(0, 0, 30);
        graphics.lineStyle(2, 0x000000, 1);
        graphics.strokeCircle(0, 0, 30);
        
        // Add text to show enemy type
        this.typeText = scene.add.text(0, 0, this.getEmojiForType(type), { // Use helper function
          fontSize: '36px', // Larger text
          fontFamily: 'Arial',
          stroke: '#000000',
          strokeThickness: 4
        }).setOrigin(0.5);
        this.typeText.setInteractive(); // Make it interactive
        
        // Make text more interactive
        this.typeText.on('pointerdown', () => {
          if (this.scene && this.scene.gameState && typeof this.scene.gameState.clickDamage === 'number') {
            const clickDamage = this.scene.gameState.clickDamage || 1;
            this.takeDamage(clickDamage);
            console.log(`Enemy clicked and taking ${clickDamage} damage`);
          }
        });
        
        // Add to container (graphics first, then text)
        this.container.add([graphics, this.typeText]);
        
        // CRITICAL: Make the container physics-enabled for collision detection
        if (scene.physics && scene.physics.world) {
          scene.physics.world.enable(this.container);
          this.container.body.setSize(50, 50); // Set collision hitbox size
          this.container.body.setCollideWorldBounds(false); // Allow movement off screen
          this.container.body.setImmovable(false); // Allow movement
          this.container.body.enable = true; // ADDED: Explicitly enable the body
          
          // ADDED: Set initial velocity immediately (Fallback)
          this.setInitialVelocity();
        }
      }
      
      // Make the container interactive to improve clicking
      this.container.setSize(80, 80); // LARGER explicit size for better clicking
      this.container.setInteractive();
      
      // Make container interactive too (triple redundancy for click handling)
      this.container.on('pointerdown', () => {
        if (this.scene && this.scene.gameState && typeof this.scene.gameState.clickDamage === 'number') {
          const clickDamage = this.scene.gameState.clickDamage || 1;
          this.takeDamage(clickDamage);
          console.log(`Enemy container clicked and taking ${clickDamage} damage`);
        }
      });
      
      // Force visibility on all components
      if (this.container) this.container.setAlpha(1);
      if (this.sprite) this.sprite.setAlpha(1);
      
    } catch (error) {
      console.error('Error creating enemy sprite:', error);
      // Ultra fallback - create a minimal emergency representation
      this.container = scene.add.container(x, y);
      this.container.setDepth(100);
      this.container.setSize(60, 60);
      this.container.setInteractive();
      
      // FIX: Create a highly visible emergency representation  
      const emergencyGraphics = scene.add.graphics();
      emergencyGraphics.fillStyle(0xFF0000, 1);
      emergencyGraphics.fillCircle(0, 0, 25);
      emergencyGraphics.lineStyle(4, 0xFFFF00, 1);
      emergencyGraphics.strokeCircle(0, 0, 25);
      
      const emergencyText = scene.add.text(0, 0, "!", {
        fontSize: '36px',
        fontFamily: 'Arial',
        color: '#FFFFFF',
        stroke: '#000000',
        strokeThickness: 4
      }).setOrigin(0.5);
      
      this.container.add([emergencyGraphics, emergencyText]);
      
      // CRITICAL: Make the container physics-enabled for collision detection even in fallback
      if (scene.physics && scene.physics.world) {
        scene.physics.world.enable(this.container);
        this.container.body.setSize(50, 50); // Set collision hitbox size
        this.container.body.enable = true; // ADDED: Explicitly enable the body
        // ADDED: Set initial velocity immediately (Emergency Fallback)
        this.setInitialVelocity();
      }
    }
    
    // Add health bar with high visibility
    this.healthBar = {
      background: scene.add.rectangle(x, y - 35, 40, 8, 0xFF0000)
        .setDepth(2001)
        .setStrokeStyle(1, 0x000000),
      fill: scene.add.rectangle(x, y - 35, 40, 8, 0x00FF00)
        .setDepth(2002)
    };
    
    // CRITICAL FIX: Make health bar more visible
    this.healthBar.background.setAlpha(1);
    this.healthBar.fill.setAlpha(1);
    
    // Add wave indicator for stronger enemies
    if (currentWave > 1) {
      this.waveIndicator = scene.add.text(x, y + 20, `W${currentWave}`, {
        fontSize: '12px',
        fontFamily: 'Arial',
        color: '#FF0000'
      }).setOrigin(0.5);
      
      // Make boss wave enemies look special
      if (currentWave % 5 === 0) {
        this.waveIndicator.setText(`BOSS W${currentWave}`);
        this.waveIndicator.setColor('#FF00FF');
        
        // Make the enemy appear larger for boss waves
        if (this.sprite) {
          this.sprite.setScale(1.2);
        }
      }
    }
    
    // CRITICAL FIX: Force update visuals to ensure everything is positioned correctly
    this.updateVisuals();
    
    console.log(`Created ${type} enemy ${this.id} at ${x},${y} - health: ${this.health}, speed: ${typeof this.speed === 'number' ? this.speed.toFixed(1) : this.speed}, wave: ${currentWave}`);
  }
  
  update(delta) {
    if (!this.active || !this.scene || !this.scene.time) {
      // If inactive or scene missing, ensure physics body is stopped if it exists
      if (this.container && this.container.body) {
        this.container.body.setVelocity(0, 0);
      }
      return;
    }

    // Update visuals (like health bar)
    this.updateVisuals();

    // Update status effects
    this.updateStatusEffects(delta);
    
    // ADDED: Log velocity in update
    if (this.container && this.container.body && Math.random() < 0.05) { // Log occasionally
      console.log(`Enemy ${this.id} velocity: vx=${this.container.body.velocity.x.toFixed(1)}, vy=${this.container.body.velocity.y.toFixed(1)}`);
    }

    // Check if enemy reached the end
    if (this.x < 50) { // Check if x is near the left edge
      this.reachedEnd();
    }
  }
  
  updateVisuals() {
    if (!this.active || !this.container) return; // Check container exists
    
    // Force enemy to be active
    this.active = true;
    this.visible = true;
    
    // Ensure container is visible and opaque
    this.container.visible = true; // Force visibility
    this.container.setDepth(100); // LOWERED DEPTH to keep below UI
    this.container.alpha = 1; // CRITICAL FIX: Force full opacity
    
    // Make container interactive if not already
    if (!this.container.input) {
      this.container.setInteractive();
      // Ensure hit area matches visual size if needed (adjust size as necessary)
      // Example: this.container.input.hitArea.setSize(60, 60); 
    }
    
    // CRITICAL FIX: Force visibility on all child elements
    if (this.container.list && this.container.list.length > 0) {
      this.container.list.forEach(child => {
        if (child) {
          child.visible = true;
          child.alpha = 1;
        }
      });
    }
    
    // ADDED: Update internal x/y based on the *container's* current position
    // This is needed for health bar and wave indicator positioning relative to the visual
    this.x = this.container.x;
    this.y = this.container.y;
    
    // ADDED: Log position before health bar update
    if (Math.random() < 0.05) { // Log occasionally
        console.log(`Enemy ${this.id} Pos before health bar: x=${this.x?.toFixed(1)}, y=${this.y?.toFixed(1)}`);
    }
    
    // Update wave indicator position - always separate from container
    if (this.waveIndicator) {
      this.waveIndicator.x = this.x;
      this.waveIndicator.y = this.y + 20;
      this.waveIndicator.visible = true;
      this.waveIndicator.setDepth(1002); // Very high depth
      this.waveIndicator.alpha = 1; // CRITICAL FIX: Force full opacity
    }
    
    // Update health bar - always separate from container
    this.updateHealthBar();
    
    // CRITICAL FIX: Force health bar visibility
    if (this.healthBar) {
      if (this.healthBar.background) {
        this.healthBar.background.visible = true;
        this.healthBar.background.alpha = 1;
      }
      if (this.healthBar.fill) {
        this.healthBar.fill.visible = true;
        this.healthBar.fill.alpha = 1;
      }
    }
    
    // Debug log position occasionally
    if (Math.random() < 0.01) {
      // FIXED: Ensure x and y are numbers before calling toFixed
      const xPos = typeof this.x === 'number' ? this.x.toFixed(0) : '?';
      const yPos = typeof this.y === 'number' ? this.y.toFixed(0) : '?';
      const healthVal = typeof this.health === 'number' ? this.health.toFixed(1) : '?';
      
      console.log(`Enemy at (${xPos}, ${yPos}), health: ${healthVal}/${this.maxHealth}`);
    }
  }
  
  reachedEnd() {
    // Enemy reached the farm - call enemyReachedEnd on the scene if available
    try {
      // Add attack animation before dealing damage
      this.addFarmAttackAnimation();
      
      // Delay the actual damage to allow animation to play
      const reachEndTimer = this.scene.time.delayedCall(600, () => {
        if (this.scene && typeof this.scene.enemyReachedEnd === 'function') {
          // Call the scene's enemyReachedEnd method to handle damage to player
          this.scene.enemyReachedEnd(this);
        } else {
          // Fallback - just destroy the enemy without affecting lives
          console.log("Enemy reached end but no enemyReachedEnd method found");
          this.destroy();
        }
      });
      if (this.activeTimers) {
        this.activeTimers.add(reachEndTimer);
      }
    } catch (error) {
      console.error("Error in reachedEnd:", error);
      // Still try to destroy the enemy
      this.destroy();
    }
  }
  
  addFarmAttackAnimation() {
    if (!this.sprite || !this.scene) return;
    
    // Type-specific attack animations
    if (this.type === 'bird') {
      // Bird dive attack
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.3,
        scaleY: 0.7,
        rotation: -0.3,
        duration: 200,
        ease: 'Power2.easeOut',
        yoyo: true,
        repeat: 2
      });
      
      // Pecking motion
      this.scene.tweens.add({
        targets: this.sprite,
        y: this.sprite.y + 10,
        duration: 150,
        ease: 'Power2.easeOut',
        yoyo: true,
        repeat: 3
      });
    } else if (this.type === 'rabbit') {
      // Rabbit nibbling attack
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.2,
        scaleY: 0.9,
        duration: 100,
        ease: 'Power2',
        yoyo: true,
        repeat: 5
      });
      
      // Head bobbing
      this.scene.tweens.add({
        targets: this.sprite,
        rotation: 0.2,
        duration: 120,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: 4
      });
    } else if (this.type === 'deer') {
      // Deer trampling attack
      this.scene.tweens.add({
        targets: this.sprite,
        scaleY: 1.3,
        y: this.sprite.y - 5,
        duration: 200,
        ease: 'Power2.easeOut',
        yoyo: true,
        repeat: 2
      });
      
      // Antler thrust
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.sprite.x - 15,
        rotation: -0.2,
        duration: 250,
        ease: 'Power2.easeOut',
        yoyo: true
      });
    } else {
      // Default attack animation for other types
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.4,
        scaleY: 0.8,
        rotation: 0.3,
        duration: 200,
        ease: 'Power2.easeOut',
        yoyo: true,
        repeat: 2
      });
    }
    
    // Create attack impact effect
    this.createAttackImpactEffect();
    
    // Screen shake effect for dramatic impact
    if (this.scene.cameras && this.scene.cameras.main) {
      this.scene.cameras.main.shake(400, 0.01);
    }
  }
  
  createAttackImpactEffect() {
    if (!this.scene) return;
    
    // Create impact particles
    const impactColor = this.type === 'bird' ? 0xFFFF00 : 
                       this.type === 'rabbit' ? 0x90EE90 : 
                       this.type === 'deer' ? 0x8B4513 : 0xFF6B6B;
    
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      const distance = 20 + Math.random() * 15;
      const impactX = this.x + Math.cos(angle) * distance;
      const impactY = this.y + Math.sin(angle) * distance;
      
      const particle = this.scene.add.circle(this.x, this.y, 4, impactColor, 0.8);
      particle.setDepth(200);
      
      this.scene.tweens.add({
        targets: particle,
        x: impactX,
        y: impactY,
        alpha: 0,
        scale: 0.3,
        duration: 500,
        ease: 'Power2.easeOut',
        onComplete: () => particle.destroy()
      });
    }
    
    // Create damage text effect
    const damageText = this.scene.add.text(this.x, this.y - 30, 'FARM DAMAGE!', {
      fontSize: '16px',
      fill: '#FF0000',
      fontWeight: 'bold',
      stroke: '#FFFFFF',
      strokeThickness: 2
    });
    damageText.setOrigin(0.5);
    damageText.setDepth(250);
    
    this.scene.tweens.add({
      targets: damageText,
      y: damageText.y - 40,
      alpha: 0,
      scale: 1.5,
      duration: 800,
      ease: 'Power2.easeOut',
      onComplete: () => damageText.destroy()
    });
  }
  
  takeDamage(amount) {
    // Skip if already inactive
    if (!this.active) return;
    
    // Force active status
    this.active = true;
    
    // Ensure minimum damage is applied - INCREASED to ensure enemies die
    const actualDamage = Math.max(1.0, amount);
    
    // Log damage for debugging
    console.log(`Enemy ${this.type} taking ${actualDamage} damage, current health: ${this.health}`);
    
    // Apply damage resistance if applicable, but ensure minimum damage
    let finalDamage = actualDamage;
    if (this.damageResistance && this.damageResistance > 0) {
      finalDamage = actualDamage * (1 - this.damageResistance);
      finalDamage = Math.max(1, finalDamage); // Always do at least 1 damage
    }
    
    // IMPORTANT FIX: Special handling for enemies with low health
    // This prevents enemies getting stuck at 1 HP
    if (this.health <= 3) {
      // Guarantee the enemy dies with a critical hit
      finalDamage = this.health * 2; // Double damage to ensure death
      console.log(`Critical hit on low health enemy! Doing ${finalDamage} damage`);
    }
    
    // Apply damage - ensure immediate health reduction
    this.health -= finalDamage;
    
    // CRITICAL FIX: Ensure health never gets stuck at exactly 1
    if (this.health > 0 && this.health < 1.5) {
       this.health = 0;
      console.log(`Enemy ${this.type} with <1.5 HP force killed`);
    }
    
    // Add damage animation
    this.addDamageAnimation();
    
    // Play hit sound if soundManager is available
    if (this.scene && this.scene.soundManager) {
      this.scene.soundManager.play('enemy_hit', { volume: 0.4 });
    }
    
    // Update health bar if available
    if (typeof this.updateHealthBar === 'function') {
      // ADDED: Log before calling updateHealthBar
      console.log(`Enemy ${this.id} calling updateHealthBar from takeDamage`);
      this.updateHealthBar();
    }
    
    // Show damage text
    if (typeof this.showDamageText === 'function') {
      this.showDamageText(finalDamage);
    }
    
    // Check if enemy is defeated - STRONGLY ENSURE DEATH
    if (this.health <= 0) {
      // Play defeat sound
      if (this.scene && this.scene.soundManager) {
        this.scene.soundManager.play('enemy_defeat', { volume: 0.6 });
      }
      
      // Make sure health is exactly 0
      this.health = 0;
      
      // Debug log
      console.log(`Enemy defeated by takeDamage, health = ${this.health}`);
      
      // Ensure defeat is called properly by wrapping in try/catch
      try {
        // Call defeat directly to ensure proper cleanup and score updates
        if (typeof this.defeat === 'function') {
          console.log("Calling enemy defeat method");
          this.defeat();
        } else {
          // Fallback if defeat method is missing
          console.log("No defeat method, calling destroy directly");
          this.destroy();
        }
      } catch (err) {
        console.error("Error in defeat logic:", err);
        // Last resort - force destroy
        this.destroy();
      }
      
      return true; // Indicate successful kill
    }
    
    return false; // Enemy still alive
  }
  
  endGame() {
    if (!this.scene) return;
    
    console.log("Game over!");
    
    // Call the scene's endGame method which has proper cleanup logic
    if (typeof this.scene.endGame === 'function') {
      this.scene.endGame(false);
    }
  }
  
  destroy(silent = false) {
    if (!this.active || this.dead) {
      return;
    }
    
    try {
      // Mark as destroyed
      this.active = false;
      this.dead = true;
      this.destroyed = true; // Add explicit destroyed flag
      this.health = 0; // Ensure health is zero
      
      // Set a flag for pending removal to prevent targeting while animating
      this._pendingRemoval = true;
      
      // Clear all tracked intervals
      if (this.activeIntervals) {
        this.activeIntervals.forEach(interval => {
          try {
            clearInterval(interval);
          } catch (error) {
            console.warn('Error clearing interval:', error);
          }
        });
        this.activeIntervals.clear();
      }
      
      // Clear all tracked timers
      if (this.activeTimers) {
        this.activeTimers.forEach(timer => {
          try {
            if (timer && typeof timer.remove === 'function') {
              timer.remove(); // Phaser timer event
            } else if (typeof timer === 'number') {
              clearTimeout(timer); // Regular setTimeout
            }
          } catch (error) {
            console.warn('Error clearing timer:', error);
          }
        });
        this.activeTimers.clear();
      }
      
      // Kill tweens before destroying objects
      if (this.scene && this.scene.tweens) {
        if (this.sprite) this.scene.tweens.killTweensOf(this.sprite);
        if (this.healthBar) this.scene.tweens.killTweensOf(this.healthBar);
        if (this.healthBarBg) this.scene.tweens.killTweensOf(this.healthBarBg);
        if (this.waveIndicator) this.scene.tweens.killTweensOf(this.waveIndicator);
      }
      
      // Apply death animation or visual effect
      this.applyDeathEffect();
      
      // Log the destruction with position for debugging
      if (!silent) {
        // Make sure position values are numbers before calling toFixed
        const xDisplay = typeof this.x === 'number' ? this.x.toFixed(2) : String(this.x);
        const yDisplay = typeof this.y === 'number' ? this.y.toFixed(2) : String(this.y);
        
        console.log(`Destroying enemy ${this.id} at (${xDisplay}, ${yDisplay})`);
      }
      
      // Cleanup sprites with delay to allow animations to finish
      if (this.scene && this.scene.time && typeof this.scene.time.delayedCall === 'function') {
        const cleanupTimer = this.scene.time.delayedCall(300, () => {
          this.cleanupSprites();
        });
        if (this.activeTimers) {
          this.activeTimers.add(cleanupTimer);
        }
      } else {
        // If delayed call is not available, clean up immediately
        this.cleanupSprites();
      }
      
      // Stop any sounds being played by this enemy
      if (this.scene && this.scene.sound) {
        // No specific sounds to stop for now, but adding this for future sounds
      }
    } catch (error) {
      console.error("Error during Enemy destroy:", error, "Type:", this.type);
    } finally {
      // Ensure essential references are nullified even if errors occurred
      this.sprite = null;
      this.healthBar = null;
      this.healthBarBg = null;
      this.waveIndicator = null;
      this.scene = null; // Break reference to scene LAST
    }
  }
  
  setActive(state) {
    this.active = state;
    return this;
  }
  
  setVisible(state) {
    this.visible = state;
    
    if (this.sprite) this.sprite.visible = state;
    
    if (this.waveIndicator) this.waveIndicator.visible = state;
    
    if (this.healthBar) {
      if (this.healthBar.background) this.healthBar.background.visible = state;
      if (this.healthBar.fill) this.healthBar.fill.visible = state;
    }
    
    return this;
  }
  
  defeatAnimation() {
    if (!this.scene || !this.active) return;

    try {
      // --- Enhanced Death Effects --- 
      let particleColor = 0xFFFFFF; // Default particle color
      let particleLifespan = 600;
      let particleQuantity = 20;
      let particleScale = { start: 1.5, end: 0 };
      let particleSpeed = 100;
      let particleGravityY = 0; // No gravity by default
      let particleTexture = 'pixel'; // Default particle texture

      // Customize effects based on enemy type
      switch (this.type) {
        case 'bird':
          particleColor = 0xADD8E6; // Light blue for feathers/air
          particleQuantity = 25;
          particleLifespan = 800;
          particleGravityY = 80; // Particles drift down slightly
          // Could load a 'feather' particle texture if available
          break;
        case 'rabbit':
          particleColor = 0xD3D3D3; // Grey/white for fur
          particleQuantity = 15;
          particleScale = { start: 1.2, end: 0 };
          break;
        case 'fox':
          particleColor = 0xFF8C00; // Orange
          particleQuantity = 22;
          particleSpeed = 120;
          break;
        case 'slime':
          particleColor = 0x90EE90; // Light green goo
          particleQuantity = 30;
          particleLifespan = 1000;
          particleScale = { start: 2.5, end: 0.5 }; // Larger, goo-like particles
          particleSpeed = 50;
          particleGravityY = 100; // Goo falls
          break;
        case 'ghost':
          particleColor = 0xE6E6FA; // Lavender/ethereal
          particleQuantity = 15;
          particleLifespan = 1200; // Lingering effect
          particleSpeed = 40;
          particleScale = { start: 2.0, end: 0 };
          // Use BlendMode ADD for glow?
          break;
        case 'skeleton':
          particleColor = 0xFFFFFF; // White bone fragments
          particleQuantity = 35;
          particleLifespan = 500;
          particleSpeed = 150; // Faster scatter
          // Could load a 'bone' particle texture
          break;
        // Add cases for other enemy types here...
        case 'boss': // Special effect for bosses
           particleColor = 0xFFFF00; // Gold/yellow
           particleQuantity = 50; 
           particleLifespan = 1500;
           particleSpeed = 180;
           particleScale = { start: 3, end: 0 }; 
           break;
        default:
          particleColor = 0xFFC0CB; // Pinkish default
      }
      
      // Create particles if the system is available
      if (this.scene.add.particles) {
        try {
          // Check if the base texture exists, fallback if needed
          if (!this.scene.textures.exists(particleTexture)) {
              particleTexture = 'pixel'; // Ensure fallback
          }
          
          const particles = this.scene.add.particles(this.x, this.y, particleTexture, {
            speed: particleSpeed,
            lifespan: particleLifespan,
            scale: particleScale,
            gravityY: particleGravityY,
            blendMode: 'NORMAL', // Use ADD for ghosts? 
            tint: particleColor,
            quantity: particleQuantity, // Emit all at once
            emitting: false // Control emission manually
          });
          particles.setDepth(2500); // Ensure particles are visible

          // Explode particles
          particles.explode(particleQuantity);

          // Destroy particle emitter after lifespan
          const particleTimer = this.scene.time.delayedCall(particleLifespan + 100, () => {
             if (particles) particles.destroy(); 
          });
          if (this.activeTimers) {
            this.activeTimers.add(particleTimer);
          }
        } catch (particleError) {
          console.warn("Particle system error:", particleError);
        }
      } else {
         // Fallback: Simple circle flash if particles unavailable
         const fallbackExplosion = this.scene.add.circle(this.x, this.y, 10, particleColor, 0.8);
         fallbackExplosion.setDepth(2500);
         this.scene.tweens.add({
             targets: fallbackExplosion,
             scale: 4,
             alpha: 0,
             duration: 300,
             ease: 'Expo.easeOut',
             onComplete: () => { if(fallbackExplosion) fallbackExplosion.destroy(); }
         });
      }
      // --- End Enhanced Death Effects ---

      // Add defeat text with coin value - make it more visible
      const defeatText = this.scene.add.text(this.x, this.y - 20, `+${this.value}`, {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#FFFF00',
        stroke: '#000000',
        strokeThickness: 3
      }).setOrigin(0.5);
      defeatText.setDepth(2501); // Above particles

      // Animate the text with a more dramatic effect
      this.scene.tweens.add({
        targets: defeatText,
        y: this.y - 80,
        alpha: 0,
        scale: 1.5,
        duration: 1500,
        onComplete: () => defeatText.destroy()
      });
      
      // Add a special effect for boss enemies
      if (this.isBoss) {
        const bossText = this.scene.add.text(this.x, this.y - 40, 'BOSS DEFEATED!', {
          fontSize: '20px',
          fontFamily: 'Arial',
          color: '#FF00FF',
          stroke: '#000000',
          strokeThickness: 3
        }).setOrigin(0.5);
        
        this.scene.tweens.add({
          targets: bossText,
          y: this.y - 100,
          alpha: 0,
          scale: 1.5,
          duration: 1500,
          onComplete: () => bossText.destroy()
        });
      }
    } catch (error) {
      console.error("Error in defeatAnimation:", error);
    }
  }
  
  // Add the missing applyDeathEffect method
  applyDeathEffect() {
    // Call our existing defeatAnimation method
    this.defeatAnimation();
  }
  
  // Helper method to clean up sprites
  cleanupSprites() {
    try {
      // Clean up container
      if (this.container) {
        this.container.destroy();
        this.container = null;
        
        // The sprite and typeText are automatically destroyed as container children
        this.sprite = null;
        this.typeText = null;
      }
      // Legacy cleanup for standalone sprites
      else if (this.sprite) {
        this.sprite.destroy();
        this.sprite = null;
        
        if (this.typeText) {
          this.typeText.destroy();
          this.typeText = null;
        }
      }
      
      // Always independently clean up wave indicator
      if (this.waveIndicator) {
        this.waveIndicator.destroy();
        this.waveIndicator = null;
      }
      
      // Always independently clean up health bars
      if (this.healthBar) {
        if (this.healthBar.background) {
          this.healthBar.background.destroy();
          this.healthBar.background = null;
        }
        if (this.healthBar.fill) {
          this.healthBar.fill.destroy();
          this.healthBar.fill = null;
        }
        this.healthBar = null;
      }
      
      console.log(`Enemy cleanup complete for ${this.id}`);
    } catch (error) {
      console.error("Error cleaning up enemy sprites:", error);
    }
  }
  
  // Add updateHealthBar method to ensure health bar is properly updated
  updateHealthBar() {
    if (!this.healthBar || !this.scene || !this.active) return;
    
    // CRITICAL SAFETY CHECK: Ensure position is valid
    if (typeof this.x !== 'number') this.x = parseFloat(this.x) || 0;
    if (typeof this.y !== 'number') this.y = parseFloat(this.y) || 0;
    
    // Position health bar above the enemy with offset
    const offsetY = -35; // Distance above the enemy
    
    this.healthBar.background.setPosition(this.x, this.y + offsetY);
    this.healthBar.fill.setPosition(this.x, this.y + offsetY);
    this.healthBar.background.setDepth(101); // LOWERED DEPTH
    this.healthBar.fill.setDepth(102); // LOWERED DEPTH
    
    // Calculate health percentage and update health bar width
    const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth));
    const barWidth = 40; // Base width for health bar
    
    // Update health bar fill width based on current health
    this.healthBar.fill.width = barWidth * healthPercent;
    this.healthBar.fill.setDisplaySize(barWidth * healthPercent, 8);
    
    // CRITICAL FIX: Center the health bar fill based on healthPercent
    this.healthBar.fill.setOrigin(0, 0.5); // Center vertically, left align horizontally  
    this.healthBar.fill.setX(this.x - (barWidth / 2)); // Align left side with background
  }

  // Hide health bar without destroying the enemy (for game restart)
  hideHealthBar() {
    if (this.healthBar) {
      if (this.healthBar.background) {
        this.healthBar.background.setVisible(false);
      }
      if (this.healthBar.fill) {
        this.healthBar.fill.setVisible(false);
      }
    }
  }

  // Show health bar (for when game resumes)
  showHealthBar() {
    if (this.healthBar) {
      if (this.healthBar.background) {
        this.healthBar.background.setVisible(true);
      }
      if (this.healthBar.fill) {
        this.healthBar.fill.setVisible(true);
      }
    }
  }
  
  // Add a method to show damage text
  showDamageText(amount) {
    if (!this.scene || !this.active) return;
    
    try {
      // Convert damage to integer for display
      const displayAmount = Math.round(amount);
      
      const text = this.scene.add.text(this.x, this.y - 20, `-${displayAmount}`, {
        fontSize: '20px',
        fontFamily: 'Arial',
        color: '#FF0000',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5);
      
      this.scene.tweens.add({
        targets: text,
        y: this.y - 50,
        alpha: 0,
        scale: 1.2,
        duration: 800,
        onComplete: () => text.destroy()
      });
    } catch (error) {
      console.error("Error showing damage text:", error);
    }
  }
  
  // Add this method to handle enemy defeat
  defeat() {
    if (!this.active) return;
    
    try {
      // FIXED: Ensure x and y are numbers before calling toFixed
      const xPos = typeof this.x === 'number' ? this.x.toFixed(1) : '?';
      const yPos = typeof this.y === 'number' ? this.y.toFixed(1) : '?';
      
      console.log(`Enemy ${this.type} defeated at (${xPos}, ${yPos})`);
      
      // Make sure the enemy is dead
      this.health = 0;
      
      // Mark as inactive immediately to prevent multiple defeat calls
      this.active = false;
      this.dead = true;
      this.destroyed = true;
      
      // Call the flying coin effect instead of directly updating coins here
      if (typeof this.scene.createFlyingCoinEffect === 'function') {
        this.scene.createFlyingCoinEffect(this.x, this.y, this.value);
      } else {
        // Fallback if the effect function doesn't exist
        console.warn("createFlyingCoinEffect not found on scene, updating coins directly.");
        if (typeof this.scene.updateFarmCoins === 'function') { 
            this.scene.updateFarmCoins(this.value); 
        }
      }
      
      // Update score - 10 points per enemy kill
        if (typeof this.scene.gameState.score === 'number') {
          this.scene.gameState.score += 10;
          if (typeof this.scene.updateScoreText === 'function') {
            this.scene.updateScoreText();
          }
          // Send score update to React component
          const onGameEvent = this.scene.registry.get('onGameEvent');
          if (typeof onGameEvent === 'function') {
            onGameEvent('scoreUpdate', this.scene.gameState.score);
          }
        }

      // Update skill tree progress when enemy is defeated
      if (this.scene.skillTreeManager) {
        this.scene.skillTreeManager.onEnemyDefeated(this.type, this.scene.gameState.score);
      }

      // Emit enemyDefeated event
      const onGameEvent = this.scene.registry.get('onGameEvent');
      if (typeof onGameEvent === 'function') {
        onGameEvent('enemyDefeated', this.value * 10);
      }
      
      // Show floating text for COINS earned
      if (typeof this.scene.showFloatingText === 'function') {
        this.scene.showFloatingText(this.x, this.y - 20, `+${this.value}`, 0xFFFF00); 
      }
      
      // Play defeat animation - but don't call destroy from there to avoid loop
      if (typeof this.defeatAnimation === 'function') {
        this.defeatAnimation();
      }
      
      // Destroy this enemy with a slight delay to allow animations
      if (this.scene && this.scene.time && typeof this.scene.time.delayedCall === 'function') {
        this.scene.time.delayedCall(100, () => {
          this.cleanupSprites();
        });
      } else {
        // Immediate fallback
        this.cleanupSprites();
      }
      
    } catch (error) {
      console.error("Error in defeat method:", error);
      // Ensure cleanup still happens
      this.destroyed = true;
      this.cleanupSprites();
    }
  }
  
  // Add a simple implementation for updateStatusEffects to prevent errors
  updateStatusEffects(delta) {
    // Check if we have any status effects to update
    if (!this.statusEffects) {
      this.statusEffects = [];
      return;
    }
    
    // Update any status effects - remove expired ones
    for (let i = this.statusEffects.length - 1; i >= 0; i--) {
      const effect = this.statusEffects[i];
      
      if (!effect) {
        this.statusEffects.splice(i, 1);
        continue;
      }
      
      // Update the effect duration
      effect.duration -= delta;
      
      // Remove expired effects
      if (effect.duration <= 0) {
        // Apply end-of-effect logic if needed
        if (effect.type === 'freeze' && !this.frozen) {
          this.frozen = false;
          if (this.sprite) this.sprite.clearTint();
        }
        
        this.statusEffects.splice(i, 1);
      }
    }
  }
  
  // Helper function to get emoji based on type
  getEmojiForType(type) {
    switch (type) {
      case 'bird': return '🐦';
      case 'rabbit': return '🐰';
      case 'deer': return '🦌';
      default: return '❓';
    }
  }
  
  // Animation Methods
  addIdleAnimation() {
    if (!this.sprite || !this.scene) return;
    
    // Create subtle floating animation with type-specific variations
    const baseY = this.sprite.y;
    const floatAmount = this.type === 'bird' ? 5 : 3;
    const duration = this.type === 'bird' ? 600 : 1000 + Math.random() * 500;
    
    this.scene.tweens.add({
      targets: this.sprite,
      y: baseY - floatAmount,
      duration: duration,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    });
    
    // Type-specific animations
    if (this.type === 'bird') {
      // Wing flapping rotation
      this.scene.tweens.add({
        targets: this.sprite,
        rotation: 0.15,
        duration: 400,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
      
      // Slight horizontal sway for flying motion
      this.scene.tweens.add({
        targets: this.sprite,
        x: this.sprite.x + 2,
        duration: 800,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    } else if (this.type === 'rabbit') {
      // Ear twitch effect
      this.scene.tweens.add({
        targets: this.sprite,
        scaleX: 1.1,
        duration: 200,
        ease: 'Power2',
        yoyo: true,
        repeat: -1,
        repeatDelay: 2000 + Math.random() * 3000
      });
    } else if (this.type === 'deer') {
      // Graceful head movement
      this.scene.tweens.add({
        targets: this.sprite,
        rotation: 0.05,
        duration: 1500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    }
  }
  
  addEntranceAnimation() {
    if (!this.container || !this.scene) return;
    
    // Type-specific entrance animations
    if (this.type === 'bird') {
      // Birds fly in from above
      const originalY = this.container.y;
      this.container.y = originalY - 100;
      this.container.setAlpha(0.3);
      this.container.setScale(0.5);
      
      this.scene.tweens.add({
        targets: this.container,
        y: originalY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 600,
        ease: 'Power2.easeOut'
      });
      
      // Add wing flap effect during entrance
      this.scene.tweens.add({
        targets: this.container,
        rotation: 0.2,
        duration: 100,
        ease: 'Power2',
        yoyo: true,
        repeat: 3
      });
    } else if (this.type === 'rabbit') {
      // Rabbits hop in
      this.container.setAlpha(0);
      this.container.setScale(0.3);
      
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 400,
        ease: 'Bounce.easeOut'
      });
      
      // Add hop effect
      const originalY = this.container.y;
      this.scene.tweens.add({
        targets: this.container,
        y: originalY - 20,
        duration: 200,
        ease: 'Power2.easeOut',
        yoyo: true
      });
    } else {
      // Default dramatic entrance for other types
      this.container.setAlpha(0);
      this.container.setScale(0);
      
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 500,
        ease: 'Back.easeOut'
      });
    }
    
    // Add entrance particle effect
    this.createEntranceParticleEffect();
  }
  
  createEntranceParticleEffect() {
    if (!this.scene) return;
    
    // Create entrance particles based on enemy type
    const particleColor = this.type === 'bird' ? 0x87CEEB : 
                         this.type === 'rabbit' ? 0xDEB887 : 0xFFFFFF;
    
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 / 8) * i;
      const startX = this.x + Math.cos(angle) * 30;
      const startY = this.y + Math.sin(angle) * 30;
      
      const particle = this.scene.add.circle(startX, startY, 3, particleColor, 0.7);
      particle.setDepth(150);
      
      this.scene.tweens.add({
        targets: particle,
        x: this.x,
        y: this.y,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        ease: 'Power2.easeIn',
        onComplete: () => particle.destroy()
      });
    }
  }
  
  addMovementAnimation() {
    if (!this.sprite || !this.scene) return;
    
    // Type-specific movement animations
    if (this.type === 'bird') {
      // Flying motion with wing beats
      this.scene.tweens.add({
        targets: this.sprite,
        scaleY: 0.85,
        scaleX: 1.1,
        duration: 150,
        ease: 'Power2',
        yoyo: true,
        repeat: -1
      });
      
      // Altitude variation for flying
      this.scene.tweens.add({
        targets: this.sprite,
        y: this.sprite.y + 8,
        duration: 300,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      });
    } else if (this.type === 'rabbit') {
      // Hopping motion
      this.scene.tweens.add({
        targets: this.sprite,
        scaleY: 0.8,
        duration: 250,
        ease: 'Power2',
        yoyo: true,
        repeat: -1
      });
      
      // Slight forward lean while hopping
      this.scene.tweens.add({
        targets: this.sprite,
        rotation: -0.1,
        duration: 250,
        ease: 'Power2',
        yoyo: true,
        repeat: -1
      });
    } else {
      // Default walking bounce for other types
      this.scene.tweens.add({
        targets: this.sprite,
        scaleY: 0.9,
        duration: 200,
        ease: 'Power2',
        yoyo: true,
        repeat: -1
      });
    }
  }
  
  addDamageAnimation() {
    if (!this.sprite || !this.scene) return;
    
    // Enhanced damage animation with multiple effects
    const originalTint = this.sprite.tint;
    const originalScale = { x: this.sprite.scaleX, y: this.sprite.scaleY };
    
    // Flash red with intensity based on damage
    this.sprite.setTint(0xff0000);
    
    // Recoil effect - enemy gets pushed back slightly
    this.scene.tweens.add({
      targets: this.sprite,
      x: this.sprite.x + 8,
      scaleX: originalScale.x * 1.2,
      scaleY: originalScale.y * 0.8,
      duration: 80,
      ease: 'Power2.easeOut',
      yoyo: true,
      onComplete: () => {
        if (this.sprite) {
          this.sprite.x = 0; // Reset to container center
          this.sprite.setScale(originalScale.x, originalScale.y);
        }
      }
    });
    
    // Shake effect with decreasing intensity
    for (let i = 0; i < 4; i++) {
      const shakeTimer = this.scene.time.delayedCall(i * 40, () => {
        if (this.sprite) {
          const intensity = (4 - i) * 2;
          this.scene.tweens.add({
            targets: this.sprite,
            x: this.sprite.x + (Math.random() - 0.5) * intensity,
            y: this.sprite.y + (Math.random() - 0.5) * intensity,
            duration: 30,
            ease: 'Power2'
          });
        }
      });
      if (this.activeTimers) {
        this.activeTimers.add(shakeTimer);
      }
    }
    
    // Create damage spark effect
    this.createDamageSparkEffect();
    
    // Remove red tint with fade
    this.scene.tweens.add({
      targets: this.sprite,
      tint: originalTint,
      duration: 300,
      ease: 'Power2.easeOut'
    });
  }
  
  createDamageSparkEffect() {
    if (!this.scene) return;
    
    // Create small spark particles at impact point
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i;
      const distance = 15 + Math.random() * 10;
      const sparkX = this.x + Math.cos(angle) * distance;
      const sparkY = this.y + Math.sin(angle) * distance;
      
      const spark = this.scene.add.circle(sparkX, sparkY, 2, 0xFFFF00, 0.8);
      spark.setDepth(200);
      
      this.scene.tweens.add({
        targets: spark,
        x: sparkX + Math.cos(angle) * 20,
        y: sparkY + Math.sin(angle) * 20,
        alpha: 0,
        scale: 0.2,
        duration: 400,
        ease: 'Power2.easeOut',
        onComplete: () => spark.destroy()
      });
    }
  }
  
  // ADDED: Method to set initial velocity
  setInitialVelocity() {
    if (!this.container || !this.container.body) {
        console.warn(`Enemy ${this.id}: Cannot set initial velocity, body missing.`);
        return;
    }
    try {
      // Target the center-left of the farm area (e.g., x=100)
      const targetX = 100;
      const targetY = this.y; // Use the current y for horizontal movement target

      // Calculate direction vector towards target
      const currentX = this.container.body.center.x; // Use body center for calculation
      const currentY = this.container.body.center.y;
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      const angle = Math.atan2(dy, dx);

      // Calculate velocity based on speed and angle
      const velocityX = Math.cos(angle) * this.speed * 45;
      const velocityY = Math.sin(angle) * this.speed * 45;

      // Set the velocity on the physics body
      this.container.body.setVelocity(velocityX, velocityY);
      
      console.log(`Enemy ${this.id} initial velocity set: vx=${velocityX.toFixed(1)}, vy=${velocityY.toFixed(1)}`);

    } catch (error) {
      console.error("Error in setInitialVelocity:", error, "Enemy:", this);
      // Attempt to stop movement on error
      if (this.container && this.container.body) {
        this.container.body.setVelocity(0, 0);
      }
    }
  }
}