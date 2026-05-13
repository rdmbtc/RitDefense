'use client';

// Import the SoundManager
import SoundManager from '../utils/SoundManager';
// Import the VolumeControls
import VolumeControls from '../utils/volume-controls.js';
// Import the Defense class
import Defense from '../entities/Defense.js';
// Import the SkillDefender class
import SkillDefender from '../entities/SkillDefender.js';
// Import the SkinCustomization class
import SkinCustomization from '../ui/SkinCustomization.js';

// Set up a global flag to prevent recursive/overlapping updates
let isUpdating = false;

// Ensure we only run Phaser-specific code on the client
const isBrowser = typeof window !== 'undefined';

// Create a placeholder class for SSR
class PlaceholderScene {
  constructor() {
    this.type = 'placeholder';
  }
  
  // Add stub methods to prevent errors
  init() {}
  preload() {}
  create() {}
  update() {}
}

// Define a class that will be used on the client side
class GameSceneImpl {
  constructor() {
    if (!isBrowser) return;
    
    this.type = 'game-scene';
    this.farmCoins = 0;
    this.addFarmCoinsCallback = null;
    this.crops = {};
    this.enemies = [];
    this.isSpawningEnemies = false;
    this.gameInitialized = false;
    this.initialClickProcessed = false;
    this.allowPlanting = false;
    this.upgradeSystem = null;
    this.pendingDefensePlacement = false; // New flag to track if we're waiting for placement click
          this.lastEnemyCleanupTime = 0; // Add this property to track cleanup timing
          this.volumeControls = null; // Add property for volume controls
          this.skinCustomization = null; // Add property for skin customization
  }
  
  // Add stub methods for safety
  init() {}
  preload() {}
  create() {}
  update() {}
  createBackground() {}
  createUI() {}
  setupInputHandlers() {}
  showStartButton() {}
  startGame() {}
  forceNextWave() {}
}

// Only load and initialize Phaser on the client
let GameScene = PlaceholderScene;

if (isBrowser) {
  // We're on the client side, so we can safely use Phaser
  import('phaser').then(module => {
    try {
      const Phaser = module.default;
      
      // Now define the real GameScene that extends Phaser.Scene
      class GameSceneClient extends Phaser.Scene {
        constructor() {
          super('GameScene');
          this.type = 'phaser-scene';
          this.farmCoins = 0;
          this.addFarmCoinsCallback = null;
          this.crops = {};
          this.enemies = [];
          this.isSpawningEnemies = false;
          this.gameInitialized = false;
          this.initialClickProcessed = false;
          this.allowPlanting = false;
          this.waveTimer = null;
          this.waveInProgress = false;
          this.gameState = {
            isActive: false,
            isPaused: false,
            score: 0,
            lives: 3,
            wave: 1,
            farmCoins: 0,
            clickDamage: 0.5,
            canPlant: true,
            autoWave: true // Add auto-wave functionality by default
        };
        this.enemiesSpawned = 0;
           this.totalEnemiesInWave = 0;
          this.upgradeSystem = null;
          this.pendingDefensePlacement = false; // New flag to track if we're waiting for placement click
          this.soundManager = null; // Will be initialized in create()
          this.lastEnemyCleanupTime = 0; // Add this property to track cleanup timing
          this.volumeControls = null; // Add property for volume controls
          this.isSubmittingScore = false; // Flag to prevent multiple score submissions
          
          // Weather System Properties
          this.weatherSystem = {
            currentWeather: 'sunny', // sunny, rainy, snow, cloudy
            weatherParticles: null,
            weatherBackground: null,
            weatherText: null,
            lastWeatherChange: 1 // Track last wave when weather changed
          };
        }
        
        init(data) {
          // GameScene init started
          try {
            // Initialize game state with safe values
            this.gameState = {
              isActive: false,
              isPaused: false,
              score: 0,
              lives: 3,
              wave: 1,
              farmCoins: 0, // Reset to zero
              clickDamage: 0.5, // Reduced from 1
              canPlant: true
            };
            
            // Initialize skill tree manager
            if (typeof window !== 'undefined' && window.skillTreeManager) {
              this.skillTreeManager = window.skillTreeManager;
            }
            
            // Store callbacks
            this.addFarmCoins = this.registry.get('addFarmCoins');
            this.EnemyClass = this.registry.get('EnemyClass');
            this.CropClass = this.registry.get('CropClass');
            this.UpgradeClass = this.registry.get('UpgradeClass');
            this.gameMode = this.registry.get('gameMode') || 'farm';
            
            // If gameMode is defense, automatically start defense mode
            if (this.gameMode === 'defense') {
              this.gameState.isActive = true;
              this.gameState.canPlant = false;
            }
            
            // GameScene initialized
          } catch (error) {
            console.error("Error in GameScene init:", error);
            throw error;
          }
        }
        
        preload() {
          try {
            // GameScene preload started
            
            // Initialize the sound manager AND PRELOAD ITS ASSETS
            this.soundManager = new SoundManager(this);
            this.soundManager.preload();
            
            // REMOVE VolumeControls initialization from here
            // this.volumeControls = new VolumeControls(this, this.soundManager);
            // this.volumeControls.createUI(); 
            
            // Load Upgrade module
            this.UpgradeClass = this.registry.get('UpgradeClass');
            
            // Load tree/plant assets
            this.load.image('Fruit_tree3', '/characters/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees_shadow/Fruit_tree3.png');
            this.load.image('Moss_tree3', '/characters/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees_shadow/Moss_tree3.png');
            
            // Load fireball assets
            this.load.image('fireball', '/fireball.png');
            this.load.image('iceball', '/iceball.png');
            
            // Load coin asset for effects
            this.load.image('coin', '/coin.png'); // <<<<<< ADD THIS LINE (ensure file exists)
            
            // Load tileset assets
            this.load.image('tileset', '/characters/craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/1 Tiles/FieldsTileset.png');
            this.load.image('tileset2', '/characters/craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/1.1 Tiles/Tileset2.png');
            
            // Load individual tiles for specific uses
            this.load.image('grass1', '/characters/craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/1 Tiles/FieldsTile_01.png');
            this.load.image('grass2', '/characters/craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/1 Tiles/FieldsTile_02.png');
            this.load.image('soil1', '/characters/craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/1 Tiles/FieldsTile_11.png');
            this.load.image('soil2', '/characters/craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/1 Tiles/FieldsTile_12.png');
            
            // Load decorative objects
            this.load.image('towerPlace1', '/characters/craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/2 Objects/PlaceForTower1.png');
            this.load.image('towerPlace2', '/characters/craftpix-net-504452-free-village-pixel-tileset-for-top-down-defense/2 Objects/PlaceForTower2.png');
            
            // Load trees
            this.load.image('tree1', '/characters/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Tree1.png');
            this.load.image('tree2', '/characters/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Tree2.png');
            this.load.image('tree3', '/characters/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Tree3.png');
            this.load.image('fruitTree1', '/characters/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Fruit_tree1.png');
            this.load.image('fruitTree2', '/characters/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Fruit_tree2.png');
            this.load.image('flowerTree1', '/characters/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Flower_tree1.png');
            this.load.image('flowerTree2', '/characters/craftpix-net-385863-free-top-down-trees-pixel-art/PNG/Assets_separately/Trees/Flower_tree2.png');
            
            // Load houses
            this.load.image('house1', '/characters/2 Objects/7 House/1.png');
            this.load.image('house2', '/characters/2 Objects/7 House/2.png');
            this.load.image('house3', '/characters/2 Objects/7 House/3.png');
            this.load.image('house4', '/characters/2 Objects/7 House/4.png');
            
            // Load decorative elements
            this.load.image('decor1', '/characters/2 Objects/3 Decor/1.png');
            this.load.image('decor2', '/characters/2 Objects/3 Decor/2.png');
            this.load.image('decor3', '/characters/2 Objects/3 Decor/3.png');
            this.load.image('decor4', '/characters/2 Objects/3 Decor/4.png');
            this.load.image('decor5', '/characters/2 Objects/3 Decor/5.png');
            this.load.image('decor6', '/characters/2 Objects/3 Decor/6.png');
            this.load.image('decor7', '/characters/2 Objects/3 Decor/7.png');
            this.load.image('decor8', '/characters/2 Objects/3 Decor/8.png');
            
            // Load penguin mage assets
            this.load.image('ABS_idle', '/defense/abster idle.png');
            this.load.image('ABS_attack', '/defense/abster attacks.png');
            this.load.image('MON_idle', '/defense/noot idle.png');
            this.load.image('MON_attack', '/defense/noot attack.png');
            
            // Load enemy images with proper path and error handling
            this.load.image('enemy_bird', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon1.png');
            this.load.image('enemy_rabbit', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon2.png');
            this.load.image('enemy_boss', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon3.png');
            this.load.image('enemy_fox', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon9.png');
            
            // Load additional enemy skins
            this.load.image('enemy_slime', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon4.png');
            this.load.image('enemy_ghost', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon5.png');
            this.load.image('enemy_skeleton', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon6.png');
            this.load.image('enemy_bat', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon7.png');
            this.load.image('enemy_spider', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon8.png');
            this.load.image('enemy_wolf', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon10.png');
            this.load.image('enemy_snake', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon11.png');
            this.load.image('enemy_goblin', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon12.png');
            this.load.image('enemy_dragon', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon14.png');
            this.load.image('enemy_demon', 'characters/craftpix-net-459799-free-low-level-monsters-pixel-icons-32x32/PNG/Transperent/Icon15.png');
            
            // Load defense character textures for the new defense system
            this.load.image('chog_idle', '/defense/chog_idle.png');
            this.load.image('chog_attack', '/defense/chog_idle.png'); // Use idle for attack for now
            this.load.image('molandak_idle', '/defense/molandak_idle.png');
            this.load.image('molandak_attack', '/defense/molandak_idle.png'); // Use idle for attack for now
            this.load.image('moyaki_idle', '/defense/moyaki_idle.png');
            this.load.image('moyaki_attack', '/defense/moyaki_idle.png'); // Use idle for attack for now
            this.load.image('keon_idle', '/defense/keon_idle.png');
            this.load.image('keon_attack', '/defense/keon_idle.png'); // Use idle for attack for now

            // Load additional skin textures
            this.load.image('jumapel_idle', '/defense/jumapel_idle.png');
            this.load.image('jumapel_attack', '/defense/jumapel_attack.png');
            this.load.image('skrumpet_idle', '/defense/skrumpet_idle.png');
            this.load.image('skrumpet_attack', '/defense/skrumpet_attack.png');
            this.load.image('erkin_idle', '/defense/erkin_idle.png');
            this.load.image('erkin_attack', '/defense/erkin_attack.png');
            this.load.image('realnads_idle', '/defense/realnads_idle.png');
            this.load.image('realnads_attack', '/defense/realnads_attack.png');

            // Load legacy ABS and MON defense textures (still used in some places)
            this.load.image('ABS_idle', '/defense/abster idle.png');
            this.load.image('ABS_attack', '/defense/abster attacks.png');
            this.load.image('MON_idle', '/defense/noot idle.png');
            this.load.image('MON_attack', '/defense/noot attack.png');
            
            // Load shadows
            this.load.image('shadow1', '/characters/2 Objects/1 Shadow/1.png');
            this.load.image('shadow2', '/characters/2 Objects/1 Shadow/2.png');
            
            // Load plant assets for crops
            this.load.image('plant1_idle', '/characters/craftpix-net-922184-free-predator-plant-mobs-pixel-art-pack/PNG/Plant1/Idle/Plant1_Idle_head.png');
            this.load.image('plant2_idle', '/characters/craftpix-net-922184-free-predator-plant-mobs-pixel-art-pack/PNG/Plant2/Idle/Plant2_Idle_head.png');
            this.load.image('plant3_idle', '/characters/craftpix-net-922184-free-predator-plant-mobs-pixel-art-pack/PNG/Plant3/Idle/Plant3_Idle_head.png');
            
            // Load particle effects
            this.load.spritesheet('fire_particle', 
              '/particules/Spritesheets/Fire+Sparks-Sheet.png', 
              { frameWidth: 48, frameHeight: 48 }
            );
            this.load.spritesheet('rocket_fire', 
              '/particules/Spritesheets/Rocket Fire 2-Sheet.png', 
              { frameWidth: 32, frameHeight: 32 }
            );
            
            // Use the fireball particles as fallbacks
            this.load.image('magic_particle', '/fireball.png');
            this.load.image('fireball_red', '/fireball.png');
            
            this.load.image('fireball_blue', '/iceball.png');
            
            // Load essential pixel texture for weather effects (rain, snow particles)
            this.load.image('pixel', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==');
            
            // Add load error handling
            this.load.on('loaderror', (fileObj) => {
              // Check if the failed asset is an image or spritesheet before trying to create fallback texture
              if (fileObj.type === 'image' || fileObj.type === 'spritesheet') {
                console.error('Error loading visual asset:', fileObj.key);
                
                // Create a placeholder for missing fireball assets
                if (fileObj.key === 'fireball_blue' || fileObj.key === 'fireball_red') {
                  const color = fileObj.key === 'fireball_blue' ? 0x0088FF : 0xFF4400;
                  const graphics = this.make.graphics();
                  graphics.fillStyle(color, 1);
                  graphics.fillCircle(16, 16, 16);
                  graphics.generateTexture(fileObj.key, 32, 32);
                  // Created fallback texture
                }
                
                // Create placeholders for missing defense character assets
                if (fileObj.key === 'chog_idle' || fileObj.key === 'chog_attack' ||
                    fileObj.key === 'molandak_idle' || fileObj.key === 'molandak_attack' ||
                    fileObj.key === 'moyaki_idle' || fileObj.key === 'moyaki_attack' ||
                    fileObj.key === 'keon_idle' || fileObj.key === 'keon_attack' ||
                    fileObj.key === 'jumapel_idle' || fileObj.key === 'jumapel_attack' ||
                    fileObj.key === 'skrumpet_idle' || fileObj.key === 'skrumpet_attack' ||
                    fileObj.key === 'erkin_idle' || fileObj.key === 'erkin_attack' ||
                    fileObj.key === 'realnads_idle' || fileObj.key === 'realnads_attack' ||
                    fileObj.key === 'ABS_idle' || fileObj.key === 'ABS_attack' ||
                    fileObj.key === 'MON_idle' || fileObj.key === 'MON_attack') {
                  // Creating placeholder for missing asset

                  // We'll create the fallbacks in the complete handler
                }
              } else if (fileObj.type === 'audio') {
                // Log audio load errors separately
                console.warn(`Failed to load audio asset: ${fileObj.key}`);
              } else {
                // Log other types of load errors
                console.error(`Error loading asset of type ${fileObj.type}:`, fileObj.key);
              }
            });
            
            // Create fallback textures for commonly missing assets as a failsafe
            this.load.on('complete', () => {
              // Check if fireball textures exist, if not create them
              if (!this.textures.exists('fireball_blue')) {
                const blueGraphics = this.make.graphics();
                blueGraphics.fillStyle(0x0088FF, 1);
                blueGraphics.fillCircle(16, 16, 16);
                // Add glow effect
                blueGraphics.fillStyle(0x66BBFF, 0.4);
                blueGraphics.fillCircle(16, 16, 20);
                blueGraphics.generateTexture('fireball_blue', 40, 40);
                // Created fallback texture for fireball_blue
              }
              
              if (!this.textures.exists('fireball_red')) {
                const redGraphics = this.make.graphics();
                redGraphics.fillStyle(0xFF4400, 1);
                redGraphics.fillCircle(16, 16, 16);
                // Add glow effect
                redGraphics.fillStyle(0xFF8866, 0.4);
                redGraphics.fillCircle(16, 16, 20);
                redGraphics.generateTexture('fireball_red', 40, 40);
                // Created fallback texture for fireball_red
              }
              
              // Create fallback textures for defense characters if they fail to load
              if (!this.textures.exists('chog_idle')) {
                const chogGraphics = this.make.graphics();
                chogGraphics.fillStyle(0x00AA00, 1);
                chogGraphics.fillCircle(20, 20, 18);
                chogGraphics.fillStyle(0x006600, 1);
                chogGraphics.fillRect(15, 10, 10, 8); // Shield
                chogGraphics.generateTexture('chog_idle', 40, 40);
                // Created fallback texture for chog_idle
              }

              if (!this.textures.exists('molandak_idle')) {
                const molandakGraphics = this.make.graphics();
                molandakGraphics.fillStyle(0x0088FF, 1);
                molandakGraphics.fillCircle(20, 20, 18);
                molandakGraphics.fillStyle(0x66CCFF, 1);
                // Create ice crystal shape manually
                molandakGraphics.fillTriangle(20, 10, 15, 20, 25, 20); // Top triangle
                molandakGraphics.fillTriangle(20, 30, 15, 20, 25, 20); // Bottom triangle
                molandakGraphics.generateTexture('molandak_idle', 40, 40);
                // Created fallback texture for molandak_idle
              }

              if (!this.textures.exists('moyaki_idle')) {
                const moyakiGraphics = this.make.graphics();
                moyakiGraphics.fillStyle(0xFF4400, 1);
                moyakiGraphics.fillCircle(20, 20, 18);
                moyakiGraphics.fillStyle(0xFF8844, 1);
                moyakiGraphics.fillTriangle(15, 25, 25, 25, 20, 15); // Fire
                moyakiGraphics.generateTexture('moyaki_idle', 40, 40);
                // Created fallback texture for moyaki_idle
              }

              if (!this.textures.exists('keon_idle')) {
                const keonGraphics = this.make.graphics();
                keonGraphics.fillStyle(0xFFD700, 1);
                keonGraphics.fillCircle(20, 20, 20);
                keonGraphics.fillStyle(0xFFFF00, 1);
                keonGraphics.fillRect(15, 8, 10, 6); // Crown
                keonGraphics.generateTexture('keon_idle', 40, 40);
                // Created fallback texture for keon_idle
              }

              // Create attack textures by copying idle textures
              if (!this.textures.exists('chog_attack') && this.textures.exists('chog_idle')) {
                const idleTexture = this.textures.get('chog_idle');
                this.textures.addImage('chog_attack', idleTexture.getSourceImage());
              }
              if (!this.textures.exists('molandak_attack') && this.textures.exists('molandak_idle')) {
                const idleTexture = this.textures.get('molandak_idle');
                this.textures.addImage('molandak_attack', idleTexture.getSourceImage());
              }
              if (!this.textures.exists('moyaki_attack') && this.textures.exists('moyaki_idle')) {
                const idleTexture = this.textures.get('moyaki_idle');
                this.textures.addImage('moyaki_attack', idleTexture.getSourceImage());
              }
              if (!this.textures.exists('keon_attack') && this.textures.exists('keon_idle')) {
                const idleTexture = this.textures.get('keon_idle');
                this.textures.addImage('keon_attack', idleTexture.getSourceImage());
              }

              // Create fallback textures for ABS and MON if they don't exist
              if (!this.textures.exists('ABS_idle')) {
                const absGraphics = this.make.graphics();
                absGraphics.fillStyle(0x0088FF, 1);
                absGraphics.fillCircle(20, 20, 18);
                absGraphics.fillStyle(0x66CCFF, 1);
                absGraphics.fillTriangle(20, 10, 15, 20, 25, 20); // Ice crystal
                absGraphics.generateTexture('ABS_idle', 40, 40);
                // Created fallback texture for ABS_idle
              }

              if (!this.textures.exists('MON_idle')) {
                const monGraphics = this.make.graphics();
                monGraphics.fillStyle(0xFF4400, 1);
                monGraphics.fillCircle(20, 20, 18);
                monGraphics.fillStyle(0xFF8844, 1);
                monGraphics.fillTriangle(15, 25, 25, 25, 20, 15); // Fire
                monGraphics.generateTexture('MON_idle', 40, 40);
                // Created fallback texture for MON_idle
              }

            });
          } catch (error) {
            console.error("Error in GameScene preload:", error);
            throw error;
          }
        }
        
        create() {
          try {
            // --- Force unlock Web Audio context ---
            // Initialize audio context
            if (this.sound && this.sound.unlock) {
              this.sound.unlock();
            }
            // --- End unlock attempt ---
            
            // Initialize SoundManager FIRST (Instance already created in preload, but confirm it exists)
            if (!this.soundManager) {
              // SoundManager not initialized in preload, creating now
              this.soundManager = new SoundManager(this);
              // Note: Preload should have happened already, but can add safety preload call if needed
            }

            // Set up audio context unlock on first user interaction
            this.setupAudioUnlock();
            
            // Initialize Volume Controls AFTER SoundManager
            this.volumeControls = new VolumeControls(this, this.soundManager);
            this.volumeControls.createUI(); // Create the UI but keep it hidden
            
            // Initialize Skin Customization System
            this.skinCustomization = new SkinCustomization(this);
            this.skinCustomization.init();

            // Register the Defense class in the scene registry
            this.registry.set('DefenseClass', Defense);
            // Register the SkillDefender class in the scene registry
            this.registry.set('SkillDefenderClass', SkillDefender);
            // Defense class registered in scene registry

            // console.log("GameScene create start"); // Removed duplicate log
            
            // Add mute button for audio
            const muteButton = this.add.rectangle(750, 30, 40, 40, 0x333333);
            muteButton.setInteractive();
            
            const muteIcon = this.add.text(750, 30, '🔊', {
              fontFamily: 'Arial',
              fontSize: '20px'
            }).setOrigin(0.5);
            
            muteButton.on('pointerdown', () => {
              const isMuted = this.soundManager.toggleMute();
              muteIcon.setText(isMuted ? '🔇' : '🔊');
              
              // Play click sound if unmuting
              if (!isMuted) {
                this.soundManager.play('click');
              }
            });
            
            // Add settings button to toggle volume controls
            const settingsButton = this.add.text(700, 30, '⚙️', {
              fontFamily: 'Arial',
              fontSize: '24px'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });
            settingsButton.setDepth(1001); // Set depth to ensure visibility
            
            settingsButton.on('pointerdown', () => {
              // Ensure volumeControls exists before toggling
              if (this.volumeControls) {
                this.volumeControls.toggle();
              } else {
                console.error("VolumeControls not initialized when settings button clicked.");
              }
              // Play click sound if soundManager exists
              if (this.soundManager) {
                this.soundManager.play('click'); 
              }
            });
            
            // Prepare game state
            this.gameState = {
              wave: 1,
              score: 0,
              farmCoins: 50,
              isActive: false,
              lives: 3,
              clickDamage: 1,
            };
            
            // Define enemy path from right to left
            this.gameState.path = {
              points: [
                { x: 800, y: 150 },  // Entry point right side, upper area
                { x: 600, y: 200 },  // First turn
                { x: 500, y: 300 },  // Middle of screen
                { x: 400, y: 350 },  // Approaching farm
                { x: 300, y: 400 },  // Near farm
                { x: 150, y: 425 },  // Farm entrance
                { x: 50, y: 350 },   // Farm target
                { x: 20, y: 300 }    // Final destination
              ]
            };
            
            // Created enemy path
            
            // Visualize the path for debugging
            this.visualizePath();
            
            // Create dynamic textures for fireballs if they don't exist
            if (!this.textures.exists('fireball_red')) {
              try {
                // Using loaded red fireball texture
                // Skipping dynamic creation since we're loading the texture directly
              } catch (error) {
                console.error("Error creating red fireball texture:", error);
              }
            }
            
            if (!this.textures.exists('fireball_blue')) {
              try {
                // Using loaded blue fireball texture
                // Skipping dynamic creation since we're loading the texture directly
              } catch (error) {
                console.error("Error creating blue fireball texture:", error);
              }
            }
            
            // Initialize global flag for update loop
            isUpdating = false;
            
            // GameScene create started
            
            // Setup particle animations
            this.createParticleAnimations();
            
            // Initialize the defense range indicator early
            this.defenseRangeIndicator = this.add.circle(0, 0, 150, 0xFFFFFF, 0.2);
            this.defenseRangeIndicator.setStrokeStyle(2, 0xFFFFFF);
            this.defenseRangeIndicator.setVisible(false);
            
            // Define the range functions early
            this.showDefenseRange = (x, y, radius) => {
              if (this.defenseRangeIndicator) {
                this.defenseRangeIndicator.x = x;
                this.defenseRangeIndicator.y = y;
                this.defenseRangeIndicator.setRadius(radius);
                this.defenseRangeIndicator.setVisible(true);
              }
            };
            
            this.hideDefenseRange = () => {
              if (this.defenseRangeIndicator) {
                this.defenseRangeIndicator.setVisible(false);
              }
            };
            
            // Debug texture loading
            this.verifyTextureLoading();
            
            // Create fallback textures for advanced defenses
            this.createAdvancedDefenseTextures();
            
            // Add debug renderer
            this.createDebugRenderer();
            
            // Create enemies array first
            this.enemies = [];
            
            // Create background
            this.createBackground();
            
            // Create UI elements
            this.createUI();
            
            // Initialize weather system
            this.initializeWeatherSystem();
            
            // Set up defenses array
            this.defenses = [];
            
            // Initialize defense mode
            this.currentDefenseType = null; // null = not in defense placement mode
            this.toolMode = 'attack'; // Default mode: attack, not plant
            this.pendingDefensePlacement = false;
            this.pendingDefenseType = null;
            
            // Create toolbar for easier selection
            this.createToolbar();
            
            // Create start button
            this.showStartButton();
            
            // Create a planting area indicator
            this.plantingIndicator = this.add.rectangle(0, 0, 32, 32, 0x00FF00, 0.3);
            this.plantingIndicator.setStrokeStyle(2, 0x00FF00);
            this.plantingIndicator.visible = false;
            
            // Create a message to show where planting is allowed
            this.plantingHelpText = this.add.text(200, 50, "Plant crops on the LEFT side only", {
              fontFamily: 'Arial',
              fontSize: '18px',
              color: '#00FF00'
            }).setOrigin(0.5);
            this.plantingHelpText.visible = false;
            
            // Create a global click handler for the main game area
            const gameArea = this.add.rectangle(400, 300, 800, 500, 0, 0);
            gameArea.setInteractive();
            gameArea.on('pointerdown', (pointer) => {
              // Skip if clicking in toolbar area
              if (pointer.y > 520) return;
              
              // Skip if game not active
              if (!this.gameState.isActive) return;
              
              // Game area clicked
              
              // ATTACK MODE - Check for enemies
              if (this.toolMode === 'attack') {
                const clickedEnemy = this.getEnemyAtPosition(pointer.x, pointer.y);
                if (clickedEnemy) {
                  // Apply damage to the enemy
                  clickedEnemy.takeDamage(this.gameState.clickDamage || 1);
                  
                  // Show attack effect
                  this.showFloatingText(clickedEnemy.x, clickedEnemy.y - 20, 
                    `-${(this.gameState.clickDamage || 1).toFixed(1)}`, 0xFF0000);
                    
                  // Create attack effect
                  this.createClickAttackEffect(clickedEnemy.x, clickedEnemy.y);
                  return;
                }
              }
              
              // CROP PLANTING MODE
              if (this.toolMode === 'plant') {
                if (this.isPointInFarmArea(pointer.x, pointer.y)) {
                  if (this.gameState.farmCoins >= 5) {
                    this.plantCrop(pointer.x, pointer.y);
                  } else {
                    this.showFloatingText(pointer.x, pointer.y, "Need 5 coins!", 0xFF0000);
                  }
                } else {
                  this.showFloatingText(pointer.x, pointer.y, "Plant on LEFT side only!", 0xFF0000);
                }
                return;
              }
              
              // DEFENSE PLACEMENT MODE - For all defense types
              if (this.pendingDefensePlacement && this.pendingDefenseType) {
                // Check valid placement area
                if (pointer.x < 200) {
                  this.showFloatingText(pointer.x, pointer.y, "Place on RIGHT side only!", 0xFF0000);
                  return;
                }
                
                // Calculate cost based on defense type
                const cost = this.pendingDefenseType === 'chog' ? 25 : 
                           this.pendingDefenseType === 'molandak' ? 50 : 
                           this.pendingDefenseType === 'moyaki' ? 80 : 
                           this.pendingDefenseType === 'keon' ? 150 : 50;
                
                // Check if enough coins
                if (this.gameState.farmCoins < cost) {
                  this.showFloatingText(pointer.x, pointer.y, `Need ${cost} coins!`, 0xFF0000);
                  return;
                }
                
                // Place the defense
                if (typeof this.placeDefense === 'function') {
                  // Place defense
                  const defense = this.placeDefense(this.pendingDefenseType, pointer.x, pointer.y);
                  
                  // Show success message and range indicator
                  if (defense) {
                    const defenseName = this.pendingDefenseType === 'chog' ? 'CHOG Defender' : 
                                      this.pendingDefenseType === 'molandak' ? 'MOLANDAK Guardian' : 
                                      this.pendingDefenseType === 'moyaki' ? 'MOYAKI Warrior' : 
                                      this.pendingDefenseType === 'keon' ? 'KEON Champion' : 'Defense';
                    const color = this.pendingDefenseType === 'chog' ? 0x0088FF : 
                                this.pendingDefenseType === 'molandak' ? 0xFF4400 : 
                                this.pendingDefenseType === 'moyaki' ? 0xFF0000 : 
                                this.pendingDefenseType === 'keon' ? 0xFF00FF : 0x00FFFF;
                    this.showFloatingText(pointer.x, pointer.y - 30, `${defenseName} placed!`, color);
                    
                    // Create range visual effect
                    const range = this.pendingDefenseType === 'chog' ? 250 : 
                                this.pendingDefenseType === 'molandak' ? 200 : 
                                this.pendingDefenseType === 'moyaki' ? 180 : 
                                this.pendingDefenseType === 'keon' ? 300 : 200;
                    const rangeEffect = this.add.circle(pointer.x, pointer.y, range, color, 0.2);
                    rangeEffect.setStrokeStyle(2, color);
                    this.tweens.add({
                      targets: rangeEffect,
                      alpha: 0,
                      scale: 1.2,
                      duration: 1500,
                      onComplete: () => rangeEffect.destroy()
                    });
                    
                    // Deduct cost
                    this.updateFarmCoins(-cost);
                  }
                  
                  // Keep defense placement mode active until explicitly changed by user
                  // this.pendingDefensePlacement = false;
                  // this.pendingDefenseType = null;
                  // this.setToolMode('attack');
                  
                  // Hide placement indicator
                  this.plantingIndicator.visible = false;
                  this.plantingHelpText.visible = false;
                } else {
                  console.error("placeDefense method is not defined");
                  this.showFloatingText(pointer.x, pointer.y, "Can't place defense - error!", 0xFF0000);
                }
                return;
              }
            });
            
            // Add pointer move handler for planting indicator
            this.input.on('pointermove', (pointer) => {
              // Skip if clicking in toolbar area
              if (pointer.y > 520) {
                this.plantingIndicator.visible = false;
                this.plantingHelpText.visible = false;
                return;
              }
              
              if (this.gameState && this.gameState.isActive) {
                if (this.toolMode === 'plant') {
                  // Crop planting mode
                  this.showCropPlacementIndicator(pointer);
                } else if (this.pendingDefensePlacement) {
                  // Defense placement mode
                  this.showDefensePlacementIndicator(pointer, this.pendingDefenseType);
                } else {
                  // Attack mode - hide indicators
                  this.plantingIndicator.visible = false;
                  this.plantingHelpText.visible = false;
                }
              }
            });
            
            // Add helper functions
            this.addHelperFunctions();
            
            // Initialize the upgrade system
            if (this.UpgradeClass) {
              this.upgradeSystem = new this.UpgradeClass(this);
              this.upgradeSystem.createUI();
            } else {
              console.error("UpgradeClass not available");
            }
            
            // Add keyboard handling for special attacks
            this.input.keyboard.on('keydown-S', () => {
              this.triggerSpecialAttack();
            });
            
            // Add right-click handler for special attacks
            this.input.on('pointerdown', (pointer) => {
              if (pointer.rightButtonDown()) {
                this.triggerSpecialAttack();
              }
            });
            
            // Optimize input performance
            this.input.on('pointerdown', (pointer) => {
              this.lastPointerDown = {
                time: this.time.now,
                x: pointer.x,
                y: pointer.y
              };
            });
            
            // Setup wave progression check interval - REMOVED redundant timer
            // this.waveCheckInterval = this.time.addEvent({
            //   delay: 2000,
            //   callback: () => {
            //     try {
            //       // Check for completed waves that didn't progress
            //       if (this.gameState?.isActive && 
            //           this.enemies?.length === 0 && 
            //           !this.isSpawningEnemies &&
            //           this.enemiesSpawned >= this.totalEnemiesInWave &&
            //           this.waveInProgress) {
            //         console.log("Wave completion detected (interval), forcing next wave");
            //         this.forceNextWave();
            //       }
            //     } catch(err) {
            //       console.error("Error in wave check interval:", err);
            //     }
            //   },
            //   loop: true
            // });
            // console.log("Redundant wave check interval REMOVED.");

            // GameScene created successfully
          } catch (error) {
            console.error("Error in GameScene create:", error);
            throw error;
          }
        }
        
        createBackground() {
          try {
            // Creating background
            
            // Define grid cell size for the game
            this.gridCellSize = 32;
            
            // Create a dark green background base
            const bg = this.add.rectangle(400, 300, 800, 600, 0x1a4d1a).setOrigin(0.5);
            
            // Create the farm area (left side)
            const farmArea = this.add.container(0, 0);
            for (let y = 0; y < 600; y += this.gridCellSize) {
              for (let x = 0; x < 200; x += this.gridCellSize) {
                // Create soil pattern using pixel art tiles
                const soilTile = this.add.image(
                  x + this.gridCellSize/2, 
                  y + this.gridCellSize/2,
                  Math.random() > 0.5 ? 'soil1' : 'soil2'
                ).setDisplaySize(this.gridCellSize, this.gridCellSize);
                farmArea.add(soilTile);
              }
            }
            
            // Create defense area (right side)
            const defenseArea = this.add.container(200, 0);
            for (let y = 0; y < 600; y += this.gridCellSize) {
              for (let x = 0; x < 600; x += this.gridCellSize) {
                // Create grass pattern using pixel art tiles
                const grassTile = this.add.image(
                  x + this.gridCellSize/2, 
                  y + this.gridCellSize/2,
                  Math.random() > 0.5 ? 'grass1' : 'grass2'
                ).setDisplaySize(this.gridCellSize, this.gridCellSize);
                defenseArea.add(grassTile);
              }
            }
            
            // Add farm buildings and decorations (left side)
            // Add a farmhouse
            const farmhouse = this.add.image(100, 150, 'house1').setDisplaySize(80, 80);
            farmArea.add(farmhouse);
            
            // Add a barn
            const barn = this.add.image(50, 250, 'house2').setDisplaySize(70, 70);
            farmArea.add(barn);
            
            // Add fruit trees around the farm
            const fruitTree1 = this.add.image(30, 100, 'fruitTree1').setDisplaySize(60, 60);
            farmArea.add(fruitTree1);
            
            const fruitTree2 = this.add.image(150, 80, 'fruitTree2').setDisplaySize(50, 50);
            farmArea.add(fruitTree2);
            
            // Add decorative elements to the farm
            const decor1 = this.add.image(40, 180, 'decor1').setDisplaySize(30, 30);
            farmArea.add(decor1);
            
            const decor2 = this.add.image(120, 200, 'decor2').setDisplaySize(25, 25);
            farmArea.add(decor2);
            
            // Add defense area decorations (right side)
            // Add trees around the defense area
            const tree1 = this.add.image(250, 100, 'tree1').setDisplaySize(70, 70);
            defenseArea.add(tree1);
            
            const tree2 = this.add.image(700, 150, 'tree2').setDisplaySize(60, 60);
            defenseArea.add(tree2);
            
            const tree3 = this.add.image(600, 80, 'tree3').setDisplaySize(65, 65);
            defenseArea.add(tree3);
            
            // Add flower trees for decoration
            const flowerTree1 = this.add.image(350, 120, 'flowerTree1').setDisplaySize(55, 55);
            defenseArea.add(flowerTree1);
            
            const flowerTree2 = this.add.image(500, 100, 'flowerTree2').setDisplaySize(50, 50);
            defenseArea.add(flowerTree2);
            
            // Add decorative elements to the defense area
            const decor3 = this.add.image(300, 200, 'decor3').setDisplaySize(30, 30);
            defenseArea.add(decor3);
            
            const decor4 = this.add.image(450, 180, 'decor4').setDisplaySize(25, 25);
            defenseArea.add(decor4);
            
            const decor5 = this.add.image(550, 220, 'decor5').setDisplaySize(35, 35);
            defenseArea.add(decor5);
            
            const decor6 = this.add.image(650, 250, 'decor6').setDisplaySize(30, 30);
            defenseArea.add(decor6);
            
            // Add shadows for depth
            const shadow1 = this.add.image(100, 170, 'shadow1').setDisplaySize(40, 20).setAlpha(0.5);
            farmArea.add(shadow1);
            
            const shadow2 = this.add.image(250, 120, 'shadow2').setDisplaySize(50, 25).setAlpha(0.5);
            defenseArea.add(shadow2);
            
            // Add tower placement indicators using pixel art
            for (let y = 100; y < 500; y += 100) {
              for (let x = 250; x < 750; x += 100) {
                // Skip placement if there's a tree or decoration nearby
                if ((x > 230 && x < 270 && y > 80 && y < 120) || // Near tree1
                    (x > 680 && x < 720 && y > 130 && y < 170) || // Near tree2
                    (x > 580 && x < 620 && y > 60 && y < 100) || // Near tree3
                    (x > 330 && x < 370 && y > 100 && y < 140) || // Near flowerTree1
                    (x > 480 && x < 520 && y > 80 && y < 120)) { // Near flowerTree2
                  continue;
                }
                
                const towerPlace = this.add.image(x, y, 
                  Math.random() > 0.5 ? 'towerPlace1' : 'towerPlace2'
                ).setDisplaySize(48, 48).setAlpha(0.7);
                defenseArea.add(towerPlace);
              }
            }
            
            // Add farm area indicator with a more natural look
            this.farmArea = this.add.rectangle(100, 300, 180, 600, 0x2d572d, 0.2);
            this.farmArea.setStrokeStyle(3, 0x3a6b3a);
            
            // Add subtle grid lines
            for (let i = 0; i <= 25; i++) {
              // Horizontal lines
              const hLine = this.add.line(0, i * this.gridCellSize, 0, 0, 800, 0, 0x3a6b3a, 0.2);
              hLine.setLineWidth(1);
              
              // Vertical lines
              const vLine = this.add.line(i * this.gridCellSize, 0, 0, 0, 0, 600, 0x3a6b3a, 0.2);
              vLine.setLineWidth(1);
            }
            
            // Add border around the game area
            const border = this.add.rectangle(400, 300, 800, 600, 0x000000, 0);
            border.setStrokeStyle(4, 0x2d572d);
            
            // Add game title with pixel art style - moved to top of screen and made smaller
          
            
            // Background created successfully
          } catch (error) {
            console.error("Error creating background:", error);
            throw error;
          }
        }
        
        createUI() {
          try {
            // Set UI depth to ensure it appears above all game elements
            const UI_DEPTH = 6000; // High depth to ensure UI stays above all game elements
            
            // Create text displays
            this.scoreText = this.add.text(10, 10, "Score: 0", {
              fontFamily: 'Arial',
              fontSize: '18px',
              color: '#FFFFFF'
            }).setDepth(UI_DEPTH);
            
            this.farmCoinsText = this.add.text(10, 30, "Farm Coins: 0", {
              fontFamily: 'Arial',
              fontSize: '18px',
              color: '#FFFF00'
            }).setDepth(UI_DEPTH);
            // Store target position for coin animation
            this.farmCoinsTargetPos = { x: this.farmCoinsText.x + 70, y: this.farmCoinsText.y + 10 }; // Adjust offset as needed
            
            this.waveText = this.add.text(10, 50, "Wave: 0", {
              fontFamily: 'Arial',
              fontSize: '18px',
              color: '#FFFFFF'
            }).setDepth(UI_DEPTH);
            
            // Lives text
            this.livesText = this.add.text(10, 70, "Lives: 3", {
              fontFamily: 'Arial',
              fontSize: '18px',
              color: '#FF6B6B'
            }).setDepth(UI_DEPTH);
            
            // Weather UI
            this.weatherSystem.weatherText = this.add.text(10, 90, "Weather: Sunny", {
              fontFamily: 'Arial',
              fontSize: '18px',
              color: '#FFD700'
            }).setDepth(UI_DEPTH);
            
            // Skill Tree Button - Positioned with proper spacing from settings
            this.skillTreeButton = this.add.text(580, 30, '🌟 Skills', {
              fontFamily: 'Arial',
              fontSize: '16px',
              color: '#FFFFFF',
              backgroundColor: '#6B46C1',
              padding: { x: 12, y: 8 }
            }).setDepth(UI_DEPTH).setInteractive({ useHandCursor: true });
            
            this.skillTreeButton.on('pointerdown', () => {
              this.toggleSkillTree();
              if (this.soundManager) {
                this.soundManager.play('click');
              }
            });
            
            // Initialize skill tree overlay as hidden
            this.skillTreeVisible = false;
            
            // Next Wave button removed - waves now progress automatically
            
            // UI created with proper depth layering
          } catch (error) {
            console.error("Error creating UI:", error);
          }
        }
        
        // UI Animation Methods
        addUIAnimations(element, options = {}) {
          if (!element) return;
          
          const config = {
            hoverScale: options.hoverScale || 1.1,
            clickScale: options.clickScale || 0.95,
            duration: options.duration || 150,
            useHandCursor: options.useHandCursor !== false, // Default to true
            hitArea: options.hitArea || { x: -40, y: -30, width: 80, height: 60 },
            ...options
          };
          
          // Make element interactive with proper configuration
          element.setInteractive({ useHandCursor: config.useHandCursor });
          
          // Set custom hit area if provided
          if (config.hitArea && element.input) {
            element.input.hitArea.setTo(config.hitArea.x, config.hitArea.y, config.hitArea.width, config.hitArea.height);
          }
          
          // Hover animations
          element.on('pointerover', () => {
            this.tweens.add({
              targets: element,
              scaleX: config.hoverScale,
              scaleY: config.hoverScale,
              duration: config.duration,
              ease: 'Back.easeOut'
            });
          });
          
          element.on('pointerout', () => {
            this.tweens.add({
              targets: element,
              scaleX: 1,
              scaleY: 1,
              duration: config.duration,
              ease: 'Back.easeOut'
            });
          });
          
          // Click animations
          element.on('pointerdown', () => {
            this.tweens.add({
              targets: element,
              scaleX: config.clickScale,
              scaleY: config.clickScale,
              duration: config.duration / 2,
              ease: 'Power2'
            });
          });
          
          element.on('pointerup', () => {
            this.tweens.add({
              targets: element,
              scaleX: config.hoverScale,
              scaleY: config.hoverScale,
              duration: config.duration / 2,
              ease: 'Power2'
            });
          });
        }
        
        // Weather System Methods
        initializeWeatherSystem() {
          // Initialize weather background overlay
          this.weatherSystem.weatherBackground = this.add.rectangle(400, 300, 800, 600, 0x000000, 0);
          this.weatherSystem.weatherBackground.setDepth(-1);
          
          // Set initial weather
          this.updateWeather('sunny');
        }
        
        updateWeather(newWeather) {
           if (this.weatherSystem.currentWeather === newWeather) return;
           
           // Weather changing
           
           // Clean up ColorMatrix effects
           if (this.weatherSystem.colorMatrix && this.cameras.main.postFX) {
             this.cameras.main.postFX.clear();
             this.weatherSystem.colorMatrix = null;
           }
           
           // Fade out current weather effects
           if (this.weatherSystem.weatherParticles) {
             this.tweens.add({
               targets: this.weatherSystem.weatherParticles,
               alpha: 0,
               duration: 1000,
               onComplete: () => {
                 if (this.weatherSystem.weatherParticles) {
                   this.weatherSystem.weatherParticles.destroy();
                   this.weatherSystem.weatherParticles = null;
                 }
               }
             });
           }
           
           // Fade out current background overlay
           if (this.weatherSystem.weatherBackground) {
             this.tweens.add({
               targets: this.weatherSystem.weatherBackground,
               alpha: 0,
               duration: 800
             });
           }
           
           this.weatherSystem.currentWeather = newWeather;
           
           // Animate weather text change
           if (this.weatherSystem.weatherText) {
             const weatherName = newWeather.charAt(0).toUpperCase() + newWeather.slice(1);
             
             // Scale and fade animation for text
             this.tweens.add({
               targets: this.weatherSystem.weatherText,
               scale: 1.3,
               alpha: 0.5,
               duration: 300,
               yoyo: true,
               onStart: () => {
                 this.weatherSystem.weatherText.setText(`Weather: ${weatherName}`);
               },
               onComplete: () => {
                 this.weatherSystem.weatherText.setScale(1);
                 this.weatherSystem.weatherText.setAlpha(1);
               }
             });
           }
           
           // Delay applying new weather effects for smooth transition
           this.time.delayedCall(1200, () => {
             this.applyWeatherEffects(newWeather);
           });
         }
        
        applyWeatherEffects(weather) {
          // Reset background overlay
          this.weatherSystem.weatherBackground.setAlpha(0);
          this.weatherSystem.weatherBackground.setFillStyle(0x000000, 0);
          
          switch (weather) {
            case 'sunny':
              // Bright and clear
              this.weatherSystem.weatherText.setColor('#FFD700');
              break;
              
            case 'rainy':
              // Dark blue overlay and rain particles
              this.weatherSystem.weatherBackground.setFillStyle(0x4A90E2, 0.2);
              this.weatherSystem.weatherText.setColor('#4A90E2');
              this.createRainParticles();
              // Fade in overlay
              this.tweens.add({
                targets: this.weatherSystem.weatherBackground,
                alpha: 1,
                duration: 1000
              });
              break;
              
            case 'snow':
              // Light blue overlay and snow particles
              this.weatherSystem.weatherBackground.setFillStyle(0xE6F3FF, 0.3);
              this.weatherSystem.weatherText.setColor('#87CEEB');
              this.createSnowParticles();
              // Fade in overlay
              this.tweens.add({
                targets: this.weatherSystem.weatherBackground,
                alpha: 1,
                duration: 1000
              });
              break;
              
            case 'cloudy':
              // Gray overlay and moving clouds
              this.weatherSystem.weatherBackground.setFillStyle(0x808080, 0.15);
              this.weatherSystem.weatherText.setColor('#808080');
              this.createCloudParticles();
              // Fade in overlay
              this.tweens.add({
                targets: this.weatherSystem.weatherBackground,
                alpha: 1,
                duration: 1000
              });
              break;
          }
        }
        
        createRainParticles() {
          this.weatherSystem.weatherParticles = this.add.particles(0, 0, 'pixel', {
            x: { min: -50, max: 850 }, // Wider spawn area for better coverage
            y: -20,
            speedY: { min: 800, max: 1200 }, // Much faster falling speed for fast raindrops
            speedX: { min: -80, max: -30 }, // More diagonal rain effect
            scale: { min: 3, max: 8 }, // Larger, more visible raindrops
            alpha: { min: 0.9, max: 1.0 }, // More opaque for better visibility
            tint: 0xFFFFFF, // White raindrops for visibility
            lifespan: 1200, // Shorter lifespan for faster refresh
            frequency: 10, // Much denser rain (lower frequency = more particles)
            gravityY: 300 // Stronger gravity for realistic fast fall
          });
          
          // Set higher depth to ensure visibility
          this.weatherSystem.weatherParticles.setDepth(1000);
          
          // Apply black and white LUT ColorMatrix effects to the camera
          if (this.cameras.main.postFX) {
            // Clear any existing color matrix effects
            this.cameras.main.postFX.clear();
            
            // Add ColorMatrix for black and white rainy mood
            const colorMatrix = this.cameras.main.postFX.addColorMatrix();
            colorMatrix.brightness(-0.3);    // Darker for dramatic effect
            colorMatrix.contrast(0.4);       // High contrast for black and white
            colorMatrix.saturate(-1.0);      // Complete desaturation for black and white
            colorMatrix.hue(0);              // Reset hue
            
            // Store reference for cleanup
            this.weatherSystem.colorMatrix = colorMatrix;
          }
        }
        
        createSnowParticles() {
          this.weatherSystem.weatherParticles = this.add.particles(0, 0, 'pixel', {
            x: { min: -50, max: 850 }, // Wider spawn area
            y: -20,
            speedY: { min: 80, max: 200 }, // Slightly faster falling
            speedX: { min: -40, max: 40 }, // More wind effect
            scale: { min: 2, max: 6 }, // Larger snowflakes
            alpha: { min: 0.8, max: 1 }, // More visible
            tint: 0xFFFFFF,
            lifespan: 8000, // Longer lifespan for gentle drift
            frequency: 25, // Much denser snowfall (was 60, now 25)
            gravityY: 30 // Slightly stronger gravity
          });
          
          // Set higher depth to ensure visibility
          this.weatherSystem.weatherParticles.setDepth(1000);
          
          // Apply snow mood ColorMatrix effects to the camera
          if (this.cameras.main.postFX) {
            // Clear any existing color matrix effects
            this.cameras.main.postFX.clear();
            
            // Add ColorMatrix for snow mood - cooler, brighter, more contrast
            const colorMatrix = this.cameras.main.postFX.addColorMatrix();
            colorMatrix.brightness(0.1);     // Slightly brighter
            colorMatrix.contrast(0.2);       // More contrast
            colorMatrix.saturate(-0.3);      // Less saturated (more grey/white)
            colorMatrix.hue(200);            // Shift towards blue hues
            
            // Store reference for cleanup
            this.weatherSystem.colorMatrix = colorMatrix;
          }
        }
        
        createCloudParticles() {
          this.weatherSystem.weatherParticles = this.add.particles(0, 0, 'pixel', {
            x: { min: -50, max: 850 },
            y: { min: 50, max: 150 },
            speedX: { min: 20, max: 60 },
            speedY: 0,
            scale: { min: 10, max: 20 },
            alpha: { min: 0.3, max: 0.6 },
            tint: 0xC0C0C0,
            lifespan: 10000,
            frequency: 150
          });
          
          // Set higher depth to ensure visibility
          this.weatherSystem.weatherParticles.setDepth(1000);
          
          // Apply cloudy mood ColorMatrix effects to the camera
          if (this.cameras.main.postFX) {
            // Clear any existing color matrix effects
            this.cameras.main.postFX.clear();
            
            // Add ColorMatrix for cloudy mood - desaturated, slightly darker
            const colorMatrix = this.cameras.main.postFX.addColorMatrix();
            colorMatrix.brightness(-0.1);    // Slightly darker
            colorMatrix.saturate(-0.2);      // Less saturated (more grey)
            colorMatrix.contrast(-0.1);      // Less contrast
            
            // Store reference for cleanup
            this.weatherSystem.colorMatrix = colorMatrix;
          }
        }
        
        checkWeatherChange() {
          // Change weather every 5 waves
          if (this.gameState.wave % 5 === 1 && this.gameState.wave !== this.weatherSystem.lastWeatherChange) {
            const weatherTypes = ['sunny', 'rainy', 'snow', 'cloudy'];
            const currentIndex = weatherTypes.indexOf(this.weatherSystem.currentWeather);
            const nextIndex = (currentIndex + 1) % weatherTypes.length;
            
            this.updateWeather(weatherTypes[nextIndex]);
            this.weatherSystem.lastWeatherChange = this.gameState.wave;
            
            // Show weather change notification
            const weatherName = weatherTypes[nextIndex].charAt(0).toUpperCase() + weatherTypes[nextIndex].slice(1);
            this.showFloatingText(400, 200, `Weather: ${weatherName}!`, 0xFFD700);
          }
        }
        
        // showNextWaveButton method removed - no longer needed
        
        // Start the game
        startGame() {
          try {
            // Reset submission flag for new game
            this.isSubmittingScore = false;
            
            // --- Add log ---
            // Starting game
            // --- End log ---

            // --- Force unlock Web Audio context on user interaction ---
            if (this.sound && this.sound.unlock) {
              this.sound.unlock();
              // Attempted to unlock Web Audio context
            } else {
              console.warn("this.sound.unlock not available at start of startGame.");
            }
            // --- End unlock attempt ---
            
            // Start button clicked
            
            // Remove start button if it exists
            if (this.startButton) {
              this.startButton.destroy();
              this.startButton = null; // Clear reference
            }
            if (this.startText) {
              this.startText.destroy();
              this.startText = null; // Clear reference
            }
            
            // --- Call cleanup FIRST to ensure a clean slate (full cleanup on restart) ---
            this.cleanupCurrentGame(true);
            // --- End cleanup ---

            // --- Add log ---
            // Cleanup complete
            // --- End log ---

            // Re-initialize game state (partially redundant with cleanup, but ensures defaults)
            this.gameState = {
              isActive: true, // Set to active now
              isPaused: false,
              wave: 1,
              score: 0,
              lives: 3,
              farmCoins: 120, // Increased for better early game balance
              clickDamage: 0.5, // Increased from 0.3
              canPlant: true,
              autoWave: true, // Default to auto wave
              path: this.gameState.path // Preserve path if needed, or redefine
            };
            this.registry.set('farmCoins', this.gameState.farmCoins);
            
            // Re-initialize arrays and flags
            // Don't reset enemies array - preserve existing enemies and show their health bars
            if (this.enemies && this.enemies.length) {
              this.enemies.forEach(enemy => {
                if (enemy && typeof enemy.showHealthBar === 'function') {
                  try {
                    enemy.showHealthBar();
                  } catch (e) { console.error("Error showing enemy health bar:", e); }
                }
              });
              // Enemy health bars restored
            } else {
              this.enemies = []; // Initialize if not exists
            }
            this.crops = {};
            this.defenses = []; // Ensure defenses array is empty
            this.isSpawningEnemies = false;
            this.waveInProgress = false;
            this.waveChangeInProgress = false;
            this.enemiesSpawned = 0;
            this.totalEnemiesInWave = 0;
            this.currentDefenseType = null;
            this.toolMode = 'attack';
            this.pendingDefensePlacement = false;
            this.pendingDefenseType = null;
            
            // Update UI text elements
            this.updateWaveText(); // Should show Wave: 1
            this.updateScoreText(); // Should show Score: 0
            this.updateLivesText(); // Should show Lives: 3
            this.updateFarmCoins(0); // Should show Coins: 75 (updated value)
            
            // Re-create or reset the upgrade system if needed
            if (this.UpgradeClass) {
            if (this.upgradeSystem) {
                this.upgradeSystem.destroy(); // Destroy old one first
              }
              this.upgradeSystem = new this.UpgradeClass(this);
              this.upgradeSystem.createUI(); // Create new UI
              this.upgradeSystem.setUIVisible(false); // Start hidden
              this.updateAdvancedDefenseButtons(); // Update button visibility
            } else {
              console.error("UpgradeClass not available during startGame");
            }
            
            // Ensure toolbar is reset to attack mode visually
            this.setToolMode('attack');
            
            // Start first wave - IMPORTANT: must be after setting gameState and resetting flags
            this.startWave(false); // Don't clear existing enemies during game restart
            
            // Next Wave button handling removed - waves progress automatically
            
            // Start background music if sound manager exists and isn't already playing
            if (this.soundManager && (!this.soundManager.currentMusic || !this.soundManager.currentMusic.isPlaying)) {
              this.soundManager.playMusic();
            }
            // Play click sound for starting
            if (this.soundManager) {
              this.soundManager.play('click');
            }
            
            // Game started successfully
          } catch (error) {
            console.error("Error starting game:", error);
            // Attempt to recover or show error message
            this.gameState.isActive = false;
             this.add.text(400, 300, 'Error starting game!', { fontSize: '24px', color: '#FF0000' }).setOrigin(0.5);
          }
        }
        
        setupInputHandlers() {
          try {
            // Setting up input handlers
            
            // Create a global click handler for the main game area with expanded hit area
            const gameArea = this.add.rectangle(400, 300, 800, 500, 0, 0);
            gameArea.setInteractive();
            
            // Use DOWN event for faster response
            gameArea.on('pointerdown', (pointer) => {
              // Skip if clicking in toolbar area - moved up to give more game area
              if (pointer.y > 510) return;
              
              // Skip if game not active
              if (!this.gameState.isActive) return;
              
              // Game area clicked
              
              // ATTACK MODE - Check for enemies with expanded hit area
              if (this.toolMode === 'attack') {
                // Find closest enemy within a reasonable distance (easier clicking)
                let closestEnemy = null;
                let closestDistance = 40; // Increased click radius from default
                
                if (this.enemies && this.enemies.length > 0) {
                  this.enemies.forEach(enemy => {
                    if (enemy && enemy.active) {
                      const dx = enemy.x - pointer.x;
                      const dy = enemy.y - pointer.y;
                      const distance = Math.sqrt(dx * dx + dy * dy);
                      
                      if (distance < closestDistance) {
                        closestDistance = distance;
                        closestEnemy = enemy;
                      }
                    }
                  });
                }
                
                if (closestEnemy) {
                  // Apply damage to the enemy
                  closestEnemy.takeDamage(this.gameState.clickDamage || 1);
                  
                  // Show attack effect
                  this.showFloatingText(closestEnemy.x, closestEnemy.y - 20, 
                    `-${(this.gameState.clickDamage || 1).toFixed(1)}`, 0xFF0000);
                    
                  // Create attack effect
                  this.createClickAttackEffect(closestEnemy.x, closestEnemy.y);
                  return;
                }
                
                // Allow defense placement when in attack mode too (easier workflow)
                if (pointer.x >= 200) {
                  // Try to find a special attack to trigger
                  this.triggerSpecialAttack();
                }
              }
              
              // CROP PLANTING MODE with improved grid snapping
              else if (this.toolMode === 'plant') {
                if (this.isPointInFarmArea(pointer.x, pointer.y)) {
                  if (this.gameState.farmCoins >= 3) {
                    // Better grid alignment for crops
                    const gridSize = this.gridCellSize || 32;
                    const snappedX = Math.floor(pointer.x / gridSize) * gridSize + (gridSize / 2);
                    const snappedY = Math.floor(pointer.y / gridSize) * gridSize + (gridSize / 2);
                    this.plantCrop(snappedX, snappedY);
                  } else {
                    this.showFloatingText(pointer.x, pointer.y, "Need 3 coins!", 0xFF0000);
                  }
                } else {
                  this.showFloatingText(pointer.x, pointer.y, "Plant on LEFT side only!", 0xFF0000);
                }
                return;
              }
              
              // DEFENSE PLACEMENT MODE - For any defense type
              else if (this.isDefenseMode(this.toolMode) || this.pendingDefensePlacement) {
                // Store the defense type from either source
                const defenseType = this.pendingDefenseType || this.toolMode;
                
                // Check valid placement area
                if (pointer.x < 200) {
                  this.showFloatingText(pointer.x, pointer.y, "Place on RIGHT side only!", 0xFF0000);
                  return;
                }
                
                // Calculate cost based on defense type
                let cost = 0;
                switch (defenseType) {
                  case 'chog': cost = 25; break;
        case 'molandak': cost = 50; break;
        case 'keon': cost = 150; break;
        case 'moyaki': cost = 80; break;
        default: cost = 50; break;
                }
                
                // Check if enough coins
                if (this.gameState.farmCoins < cost) {
                  this.showFloatingText(pointer.x, pointer.y, `Need ${cost} coins!`, 0xFF0000);
                  return;
                }
                
                // Grid snap the defense for better placement
                const gridSize = 40; // Use slightly larger grid for defenses
                const snappedX = Math.floor(pointer.x / gridSize) * gridSize + (gridSize / 2);
                const snappedY = Math.floor(pointer.y / gridSize) * gridSize + (gridSize / 2);
                
                // Place the defense at the snapped position
                const success = this.placeDefense(defenseType, snappedX, snappedY);
                
                if (success) {
                  // Reset flags
                  this.pendingDefensePlacement = false;
                  this.pendingDefenseType = null;
                  
                  // Don't automatically return to attack mode - let player continue placing defenses
                  // this.setToolMode('attack');
                  
                  // Hide any indicators that might be visible
                  if (this.plantingIndicator) this.plantingIndicator.visible = false;
                  if (this.plantingHelpText) this.plantingHelpText.visible = false;
                }
                
                return;
              }
            });
            
            // Initialize pointerMoveListener for tracking tool placement
            this.pointerMoveListener = (pointer) => {
              // Skip if clicking in toolbar area
              if (pointer.y > 520) {
                if (this.plantingIndicator) this.plantingIndicator.visible = false;
                if (this.plantingHelpText) this.plantingHelpText.visible = false;
                if (this.placementCircle) this.placementCircle.visible = false;
                return;
              }
              
              if (this.gameState && this.gameState.isActive) {
                if (this.toolMode === 'plant') {
                  // Crop planting mode
                  this.updatePlacementPreview(pointer);
                } else if (this.isDefenseMode(this.toolMode) || this.pendingDefensePlacement) {
                  // Defense placement mode - show range indicator
                  if (this.placementCircle) {
                    this.placementCircle.x = pointer.x;
                    this.placementCircle.y = pointer.y;
                    this.placementCircle.visible = true;
                  }
                } else {
                  // Attack mode - hide indicators
                  if (this.plantingIndicator) this.plantingIndicator.visible = false;
                  if (this.plantingHelpText) this.plantingHelpText.visible = false;
                  if (this.placementCircle) this.placementCircle.visible = false;
                }
              }
            };
            
            // Add pointer move handler
            this.input.on('pointermove', this.pointerMoveListener);
            
            // Add keyboard event handlers for game controls
            this.input.keyboard.on('keydown-P', () => {
              if (this.gameState.isActive) {
                this.setToolMode('plant');
                this.showFloatingText(400, 50, "Plant Crops Mode Activated!", 0x00FF00);
              }
            });
            
            this.input.keyboard.on('keydown-ONE', () => {
              if (this.gameState.isActive) {
                this.setToolMode('chog');
                this.showFloatingText(400, 50, "CHOG Defender Selected (25 coins)", 0x0088FF);
              }
            });
            
            this.input.keyboard.on('keydown-TWO', () => {
              if (this.gameState.isActive) {
                this.setToolMode('molandak');
                this.showFloatingText(400, 50, "MOLANDAK Guardian Selected (50 coins)", 0xFF4400);
              }
            });
            
          } catch (error) {
            console.error("Error setting up input handlers:", error);
          }
        }
        
        // Create visual effect for click attack
        createClickAttackEffect(x, y) {
          try {
            // Add a small screen shake on click
            this.cameras.main.shake(50, 0.003); // Duration 50ms, Intensity 0.003

            // Create a larger burst effect for better visibility
            const burst = this.add.circle(x, y, 15, 0xFF0000, 0.7); // Increased size from 10
            burst.setStrokeStyle(3, 0xFFFFFF); // Thicker stroke
            burst.setDepth(2000); // Ensure effect is on top

            // Animate the burst with larger scale
            this.tweens.add({
              targets: burst,
              scale: 3.5, // Increased from 3
              alpha: 0,
              duration: 300, // Slightly shorter duration for snappiness
              ease: 'Cubic.easeOut', // Keep ease out for impact
              onComplete: () => burst.destroy()
            });

            // Add more sparkles for better visual feedback
            for (let i = 0; i < 15; i++) { // Increased particle count from 10
              const angle = Math.random() * Math.PI * 2;
              const distance = 10 + Math.random() * 25; // Increased range slightly
              // Start sparks closer to the center for a tighter burst
              const startX = x + Math.cos(angle) * (distance * 0.5);
              const startY = y + Math.sin(angle) * (distance * 0.5);
              const endX = x + Math.cos(angle) * (distance * 1.5); // Travel further out
              const endY = y + Math.sin(angle) * (distance * 1.5);

              // Vary spark color slightly
              const sparkColor = Phaser.Math.Between(0xFFDD00, 0xFFFFFF); // Yellow/White sparks
              const spark = this.add.circle(startX, startY, Phaser.Math.Between(2, 4), sparkColor, 1); // Slightly larger sparks
              spark.setDepth(2001); // Above burst

              this.tweens.add({
                targets: spark,
                x: endX,
                y: endY,
                alpha: 0,
                scale: 0.2, // Shrink more
                duration: 350, // Slightly longer duration for travel
                ease: 'Quad.easeOut', // Different ease for variety
                onComplete: () => spark.destroy()
              });
            }

            // Play a sharper click/attack sound
            if (this.soundManager) {
              // Assuming you have a sound like this - if not, it will fail gracefully
              this.soundManager.play('attack_click', { volume: 0.6 }); 
            }

          } catch (error) {
            console.error("Error creating click attack effect:", error);
          }
        }
        
        // Add a new method to update placement preview
        updatePlacementPreview(pointer) {
          try {
            // Skip if game is inactive
            if (!this.gameState.isActive) return;
            
            // For crop planting preview
            if (this.toolMode === 'plant') {
              // Check if in valid farm area
              const isValidPosition = this.isPointInFarmArea(pointer.x, pointer.y);
              
              // Calculate grid position
              const gridCellSize = this.gridCellSize || 32;
              const gridX = Math.floor(pointer.x / gridCellSize) * gridCellSize + (gridCellSize / 2);
              const gridY = Math.floor(pointer.y / gridCellSize) * gridCellSize + (gridCellSize / 2);
              
              // Highlight the target cell
              if (!this.placementPreview) {
                this.placementPreview = this.add.rectangle(gridX, gridY, gridCellSize, gridCellSize, 
                  isValidPosition ? 0x00FF00 : 0xFF0000, 0.3);
              } else {
                this.placementPreview.x = gridX;
                this.placementPreview.y = gridY;
                this.placementPreview.fillColor = isValidPosition ? 0x00FF00 : 0xFF0000;
                this.placementPreview.setVisible(true);
              }
            }
            
            // For defense placement preview
            else if (this.toolMode === 'chog' || this.toolMode === 'molandak') {
              // Check if position is valid (right side)
              const isValidPosition = pointer.x >= 200;
              
              // Update range circle position and color
              if (this.placementCircle) {
                this.placementCircle.x = pointer.x;
                this.placementCircle.y = pointer.y;
                this.placementCircle.setStrokeStyle(2, 
                  isValidPosition ? 
                  (this.toolMode === 'chog' ? 0x0088FF : 0xFF4400) : 
                  0xFF0000);
                this.placementCircle.setVisible(true);
              }
              
              // Show defense preview sprite if it doesn't exist
              const spriteKey = this.toolMode === 'chog' ? 'ABS_idle' : 'MON_idle';
              if (!this.defensePreview && this.textures.exists(spriteKey)) {
                this.defensePreview = this.add.image(pointer.x, pointer.y, spriteKey);
                this.defensePreview.setDisplaySize(48, 48);
                this.defensePreview.setAlpha(0.7);
              } 
              // Update existing preview
              else if (this.defensePreview) {
                this.defensePreview.x = pointer.x;
                this.defensePreview.y = pointer.y;
                this.defensePreview.setTexture(spriteKey);
                this.defensePreview.setVisible(true);
                this.defensePreview.setAlpha(isValidPosition ? 0.7 : 0.4);
              }
            }
          } catch (error) {
            console.error("Error updating placement preview:", error);
          }
        }
        
        // Helper method to detect clicked enemies
        getEnemyAtPosition(x, y) {
          try {
            // If no enemies exist, return null
            if (!this.enemies || this.enemies.length === 0) {
              return null;
            }
            
            // Larger click radius for easier targeting
            const clickRadius = 40; // Increased from default
            let closestEnemy = null;
            let closestDistance = clickRadius;
            
            // Find closest enemy within click radius
            this.enemies.forEach(enemy => {
              if (enemy && enemy.active) {
                const dx = enemy.x - x;
                const dy = enemy.y - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestEnemy = enemy;
                }
              }
            });
            
            return closestEnemy;
          } catch (error) {
            console.error("Error in getEnemyAtPosition:", error);
            return null;
          }
        }
        
        // Helper method to check if point is in farm area (left side)
        isPointInFarmArea(x, y) {
          // Farm area is the left portion of the screen (first 200 pixels)
          return x < 200 && y < 520;
        }
        
        // Plant a crop at specified position
        plantCrop(x, y) {
          try {
            // Make sure gridCellSize is defined
            if (!this.gridCellSize) {
              this.gridCellSize = 32; // Default if not set
              console.log("Setting default gridCellSize to 32");
            }
            
            console.log("Attempting to plant crop at:", x, y);
            
            // Calculate grid position
            const gridX = Math.floor(x / this.gridCellSize) * this.gridCellSize + (this.gridCellSize / 2);
            const gridY = Math.floor(y / this.gridCellSize) * this.gridCellSize + (this.gridCellSize / 2);
            const gridKey = `${gridX},${gridY}`;
            
            console.log("Grid position:", gridX, gridY, "Grid key:", gridKey);
            
            // Initialize crops object if it doesn't exist
            if (!this.crops) {
              this.crops = {};
              console.log("Initializing crops object");
            }
            
            // Check if position is already occupied
            if (this.crops[gridKey]) {
              console.log("Position already occupied");
              return;
            }
            
            // Check if we have enough coins
            if (this.gameState.farmCoins < 3) {
              console.log("Not enough coins to plant crop");
              this.showFloatingText(x, y, "Need 3 coins!", 0xFF0000);
              return;
            }

            // Deduct coins
            this.updateFarmCoins(-3);
            
            // Get the Crop class from registry
            const CropClass = this.registry.get('CropClass');
            console.log("CropClass from registry:", !!CropClass);
            
            // IMPORTANT: Always use trees as crops - NEVER change this!
            // These are fixed to Fruit_tree3 and Moss_tree3 in the Crop class
            const cropType = 'tree';
            console.log(`Using tree as crop type (using Fruit_tree3/Moss_tree3 textures)`);
            
            if (CropClass) {
              try {
                const crop = new CropClass(this, gridX, gridY, cropType);
                this.crops[gridKey] = crop;
                this.showFloatingText(gridX, gridY, "+", 0x00FF00);
              } catch (cropError) {
                console.error("Error creating crop instance:", cropError);
                this.updateFarmCoins(3); // Refund coins if crop creation fails
              }
            } else {
              console.error("CropClass not found in registry");
              this.updateFarmCoins(3); // Refund coins if CropClass is missing
              
              // Try to load the Crop class directly as a fallback
              import('../entities/Crop').then(module => {
                if (module && module.default) {
                  try {
                    const crop = new module.default(this, gridX, gridY, cropType);
                    this.crops[gridKey] = crop;
                  } catch (directError) {
                    console.error("Error creating crop with direct import:", directError);
                  }
                }
              }).catch(error => {
                console.error("Failed to load Crop class directly:", error);
              });
            }
            
            // Play planting sound
            if (this.soundManager) {
              this.soundManager.play('plant');
            }
          } catch (error) {
            console.error("Error planting crop:", error);
            // Refund coins on error
            this.updateFarmCoins(3);
          }
        }

        // Set up audio context unlock on user interaction
        setupAudioUnlock() {
          if (this.audioUnlocked) return; // Already unlocked

          console.log("Setting up audio unlock handler...");

          const unlockAudio = () => {
            if (this.sound && this.sound.context && this.sound.context.state === 'suspended') {
              console.log("Attempting to resume audio context...");
              this.sound.context.resume().then(() => {
                console.log("Audio context resumed successfully!");
                this.audioUnlocked = true;

                // Test play a sound to verify it works
                if (this.soundManager) {
                  console.log("Testing sound playback...");
                  this.soundManager.play('click', { volume: 0.1 });
                }
              }).catch(err => {
                console.error("Failed to resume audio context:", err);
              });
            } else {
              console.log("Audio context already active or not available");
              this.audioUnlocked = true;
            }

            // Remove the event listener after first interaction
            this.input.off('pointerdown', unlockAudio);
          };

          // Listen for any user interaction
          this.input.on('pointerdown', unlockAudio);

          // Also try to unlock when the game starts
          this.events.once('wake', unlockAudio);
        }



        // Show floating text that fades up and out
        showFloatingText(x, y, message, color = 0xFFFFFF) {
          try {
            // Create text with larger font size and a shadow for better visibility
            const textConfig = {
              fontFamily: 'Arial Black, Impact, sans-serif', // Bolder font
              fontSize: '26px', // Slightly larger
              color: this.rgbToHex(color),
              stroke: '#000000',
              strokeThickness: 5, // Thicker stroke
              shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 4,
                fill: true, // Ensure shadow fills
                stroke: true // Ensure shadow strokes
              }
            };

            const floatingText = this.add.text(x, y, message, textConfig)
                .setOrigin(0.5)
                .setDepth(3000); // Ensure text is above most things

            // Initial state for animation
            floatingText.setScale(0.5);
            floatingText.setAlpha(0);

            // Bounce in and fade out animation
            this.tweens.add({
              targets: floatingText,
              y: y - 70, // Move further up
              alpha: { from: 1, to: 0 }, // Fade in quickly, then fade out
              scale: { from: 0.5, to: 1.1 }, // Scale up with overshoot
              duration: 1000, // Slightly shorter duration
              ease: 'Back.easeOut', // Use Back ease for bounce effect
              yoyo: false, // Don't yoyo the main movement
              onStart: () => {
                 // A small secondary tween for the bounce-back part of the scale
                 this.tweens.add({
                     targets: floatingText,
                     scale: 1, // Settle back to 1
                     duration: 300,
                     ease: 'Sine.easeInOut',
                     delay: 150 // Start after the initial overshoot
                 });
              },
              onComplete: () => {
                floatingText.destroy();
              }
            });
          } catch (error) {
            console.error("Error showing floating text:", error);
          }
        }
        
        // Helper function to convert RGB color to hex string
        rgbToHex(color) {
          const r = (color >> 16) & 0xFF;
          const g = (color >> 8) & 0xFF;
          const b = color & 0xFF;
          return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        }
        
        // Show wave completion message with dramatic animation
        showWaveCompletionMessage() {
          try {
            // Create wave completion text
            const completionText = this.add.text(400, 200, `Wave ${this.gameState.wave} Complete!`, {
              fontFamily: 'Arial Black, Impact, sans-serif',
              fontSize: '48px',
              color: '#00FF00',
              stroke: '#000000',
              strokeThickness: 4,
              shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000000',
                blur: 5
              }
            }).setOrigin(0.5);
            completionText.setDepth(2000);
            
            // Initial state for dramatic entrance
            completionText.setScale(0);
            completionText.setAlpha(0);
            completionText.setRotation(-0.2);
            
            // Dramatic entrance animation
            this.tweens.add({
              targets: completionText,
              scale: { from: 0, to: 1.3 },
              alpha: { from: 0, to: 1 },
              rotation: { from: -0.2, to: 0 },
              duration: 600,
              ease: 'Back.easeOut',
              onComplete: () => {
                // Settle animation
                this.tweens.add({
                  targets: completionText,
                  scale: 1,
                  duration: 200,
                  ease: 'Power2',
                  onComplete: () => {
                    // Hold for a moment, then fade out
                    this.tweens.add({
                      targets: completionText,
                      alpha: 0,
                      scale: 0.8,
                      duration: 400,
                      ease: 'Power2',
                      delay: 600,
                      onComplete: () => {
                        completionText.destroy();
                      }
                    });
                  }
                });
              }
            });
            
            // Play wave complete sound if available
            if (this.soundManager && this.soundManager.play) {
              this.soundManager.play('wave_complete');
            }
          } catch (error) {
            console.error("Error showing wave completion message:", error);
          }
        }
        
        showStartButton() {
          try {
            console.log("Showing start button");
            
            // Create a button to start the game
            this.startButton = this.add.rectangle(400, 300, 200, 50, 0xFFFFFF);
            this.startText = this.add.text(400, 300, "Start Game", {
              fontFamily: 'Arial',
              fontSize: '18px',
              color: '#000000'
            }).setOrigin(0.5);
            
            // Make the button interactive - ensure it has proper depth
            this.startButton.setInteractive();
            this.startButton.setDepth(1000);
            this.startText.setDepth(1001);
            
            // Add click handler directly to both rectangle and text
            this.startButton.on('pointerdown', () => {
              console.log("Start button clicked (rectangle)");
              this.startGame();
            });
            
            // Also make text interactive as a backup
            this.startText.setInteractive();
            this.startText.on('pointerdown', () => {
              console.log("Start button clicked (text)");
              this.startGame();
            });
            
            // Add hover effect
            this.startButton.on('pointerover', () => {
              this.startButton.fillColor = 0xDDDDDD;
            });
            
            this.startButton.on('pointerout', () => {
              this.startButton.fillColor = 0xFFFFFF;
            });
            
            // Make sure button is prominent
            this.startButton.width = 200;
            this.startButton.height = 60;
            
            // Add a more obvious border
            this.startButton.setStrokeStyle(4, 0x000000);
            
            console.log("Start button created and events attached");
          } catch (error) {
            console.error("Error showing start button:", error);
          }
        }
        
        startGame() {
          try {
            // --- Add log ---
            console.log("startGame: Initiated. Preparing to clean up previous game...");
            // --- End log ---

            // --- Force unlock Web Audio context on user interaction ---
            if (this.sound && this.sound.unlock) {
              this.sound.unlock();
              console.log("Attempted to unlock Web Audio context on startGame.");
            } else {
              console.warn("this.sound.unlock not available at start of startGame.");
            }
            // --- End unlock attempt ---
            
            console.log("Start button clicked - starting game");
            
            // Remove start button if it exists
            if (this.startButton) {
              this.startButton.destroy();
              this.startButton = null; // Clear reference
            }
            if (this.startText) {
              this.startText.destroy();
              this.startText = null; // Clear reference
            }
            
            // --- Call cleanup FIRST to ensure a clean slate (full cleanup on restart) ---
            this.cleanupCurrentGame(true);
            // --- End cleanup ---

            // --- Add log ---
            console.log(`startGame: Cleanup complete. Defenses array length: ${this.defenses?.length || 0}`);
            // --- End log ---

            // Re-initialize game state (partially redundant with cleanup, but ensures defaults)
            this.gameState = {
              isActive: true, // Set to active now
              isPaused: false,
              wave: 1,
              score: 0,
              lives: 3,
              farmCoins: 120, // Increased for better early game balance
              clickDamage: 0.5, // Increased from 0.3
              canPlant: true,
              autoWave: true, // Default to auto wave
              path: this.gameState.path // Preserve path if needed, or redefine
            };
            this.registry.set('farmCoins', this.gameState.farmCoins);
            
            // Re-initialize arrays and flags
            this.enemies = [];
            this.crops = {};
            this.defenses = []; // Ensure defenses array is empty
            this.isSpawningEnemies = false;
            this.waveInProgress = false;
            this.waveChangeInProgress = false;
            this.enemiesSpawned = 0;
            this.totalEnemiesInWave = 0;
            this.currentDefenseType = null;
            this.toolMode = 'attack';
            this.pendingDefensePlacement = false;
            this.pendingDefenseType = null;
            
            // Update UI text elements
            this.updateWaveText(); // Should show Wave: 1
            this.updateScoreText(); // Should show Score: 0
            this.updateLivesText(); // Should show Lives: 3
            this.updateFarmCoins(0); // Should show Coins: 75 (updated value)
            
            // Re-create or reset the upgrade system if needed
            if (this.UpgradeClass) {
            if (this.upgradeSystem) {
                this.upgradeSystem.destroy(); // Destroy old one first
              }
              this.upgradeSystem = new this.UpgradeClass(this);
              this.upgradeSystem.createUI(); // Create new UI
              this.upgradeSystem.setUIVisible(false); // Start hidden
              this.updateAdvancedDefenseButtons(); // Update button visibility
            } else {
              console.error("UpgradeClass not available during startGame");
            }
            
            // Ensure toolbar is reset to attack mode visually
            this.setToolMode('attack');
            
            // Start first wave - IMPORTANT: must be after setting gameState and resetting flags
            this.startWave(false); // Don't clear existing enemies during game restart
            
            // Next Wave button handling removed - waves progress automatically
            
            // Start background music if sound manager exists and isn't already playing
            if (this.soundManager && (!this.soundManager.currentMusic || !this.soundManager.currentMusic.isPlaying)) {
              this.soundManager.playMusic();
            }
            // Play click sound for starting
            if (this.soundManager) {
              this.soundManager.play('click');
            }
            
            console.log("Game started successfully");
          } catch (error) {
            console.error("Error starting game:", error);
            // Attempt to recover or show error message
            this.gameState.isActive = false;
             this.add.text(400, 300, 'Error starting game!', { fontSize: '24px', color: '#FF0000' }).setOrigin(0.5);
          }
        }
        
        // Update farm coins and UI
        updateFarmCoins(amount) {
          try {
            const currentCoins = this.gameState.farmCoins || 0;
            const newCoins = Math.max(0, currentCoins + amount); // Ensure coins don't go below 0
            const oldCoins = this.gameState.farmCoins; // Store old value for comparison
            
            this.gameState.farmCoins = newCoins;

            // Update registry
            this.registry.set('farmCoins', newCoins);

            // Update UI
            if (this.farmCoinsText) {
              this.farmCoinsText.setText(`Coins: ${newCoins}`);

              // Add animation if coins increased or decreased
              if (newCoins !== oldCoins) {
                // Determine color based on gain/loss
                const targetColor = amount > 0 ? '#FFFF00' : '#FF8888'; // Yellow for gain, reddish for loss
                
                // Reset scale and color before tweening
                this.farmCoinsText.setScale(1);
                this.farmCoinsText.setColor('#FFFF00'); // Reset to default yellow first

                this.tweens.add({
                  targets: this.farmCoinsText,
                  scale: { from: 1.3, to: 1 }, // Start slightly larger and shrink
                  duration: 300,
                  ease: 'Sine.easeInOut',
                  onStart: () => {
                     // Briefly change color during the animation for emphasis
                    this.farmCoinsText.setColor(targetColor);
                    // Use a delayed call to reset the color back to default yellow
                    this.time.delayedCall(250, () => {
                         if (this.farmCoinsText) { // Check if text still exists
                            this.farmCoinsText.setColor('#FFFF00');
                         }
                    });
                  }
                });
              }
            }

            // Call the callback if it exists
            const addFarmCoins = this.registry.get('addFarmCoins');
            
            if (typeof addFarmCoins === 'function') {
              addFarmCoins(amount);
            }
            
            // Emit coinsEarned event for React component when coins are gained
            if (amount > 0) {
              const onGameEvent = this.registry.get('onGameEvent');
              if (typeof onGameEvent === 'function') {
                onGameEvent('coinsEarned', { amount: amount, total: newCoins });
              }
            }

            // Play coin sound if gaining coins - maybe a different sound for spending?
            if (amount > 0 && this.soundManager) {
               // Assuming these sounds exist - adjust keys if needed
              this.soundManager.play('coin_gain', { volume: 0.7 }); 
            } else if (amount < 0 && this.soundManager) {
              this.soundManager.play('coin_spend', { volume: 0.5 }); 
            }
          } catch (error) {
            console.error("Error updating farm coins:", error);
          }
        }
        
        // Update score text
        updateScoreText() {
          if (this.scoreText) {
            this.scoreText.setText(`Score: ${this.gameState.score}`);
          }
        }
        
        // Update wave text
        updateWaveText() {
          // FIX: Use this.waveText instead of this.uiElements.waveText
          if (this.waveText && this.gameState) { 
            if (this.gameState.wave !== undefined && this.gameState.wave !== null) {
                // FIX: Use this.waveText
                this.waveText.setText(`Wave: ${this.gameState.wave}`);
            } else {
                 // FIX: Use this.waveText
                 this.waveText.setText(`Wave: N/A`); // Default text if wave is missing
            }

            // Update the wave text stored in the game state
            // this.gameState.waveText = `Wave: ${this.gameState.wave}`;

            // Ensure any big wave text showing also has the correct wave number
            // (This part correctly uses this._waveStartText)
            if (this._waveStartText && this._waveStartText.active && this._waveStartText.text && typeof this._waveStartText.text.setText === 'function') {
              try {
                  this._waveStartText.text.setText(`WAVE ${this.gameState.wave}`);
              } catch (e) {
                  console.error("Error setting text on _waveStartText.text:", e, this._waveStartText);
              }
            }
          } else {
            // Log if waveText or gameState are missing
             if (!this.waveText) console.warn("updateWaveText called but this.waveText is missing.");
             if (!this.gameState) console.warn("updateWaveText called but this.gameState is missing.");
          }
        }
        
        // Update lives text
        updateLivesText() {
          if (this.livesText && this.gameState) {
            this.livesText.setText(`Lives: ${this.gameState.lives}`);
          }
        }
        
        // Start a new wave of enemies - make waves more difficult over time
        startWave(clearExistingEnemies = true) {
          try {
            console.log(`Starting wave ${this.gameState.wave}`);
            
            // Reset the wave change flag here as startWave is beginning
            if (this.waveChangeInProgress) {
              console.log("Resetting waveChangeInProgress flag at startWave");
              this.waveChangeInProgress = false;
              // Clear the specific safety timeout set by forceNextWave
              // FIX: Use the correct variable name _waveChangeTimeout
              if (this._waveChangeTimeout) { 
                console.log("Clearing safety timeout from forceNextWave.");
                clearTimeout(this._waveChangeTimeout);
                this._waveChangeTimeout = null;
              }
            } // End if (this.waveChangeInProgress)

            // Check if already in progress or spawning
            if (this.waveInProgress || this.isSpawningEnemies) {
              console.warn("Attempted to start wave while another is active or spawning.");
              // Don't return here, allow potential recovery or state correction
            }
    
            // Prevent starting if game is not active
            if (!this.gameState?.isActive) {
              console.warn("Attempted to start wave while game is not active.");
              return;
            }
    
            // Check for expired defenses at wave start
            this.checkDefenseExpirations(this.gameState.wave);
            
            // Reset wave-specific state
            this.waveInProgress = true;
            this.isSpawningEnemies = true;
            this.enemiesSpawned = 0;
            this.enemies = this.enemies || [];
    
            // Reset enemy target counts and clear existing enemies if requested
            if (clearExistingEnemies && this.enemies.length > 0) {
              console.warn(`Starting wave ${this.gameState.wave} with ${this.enemies.length} enemies still present. Clearing them.`);
              this.enemies.forEach(enemy => {
                if (enemy) {
                  // Explicitly destroy wave indicator first
                  if (enemy.waveIndicator) {
                    enemy.waveIndicator.destroy();
                    enemy.waveIndicator = null;
                  }
                  if (typeof enemy.hideHealthBar === 'function') {
                    enemy.hideHealthBar();
                  }
                  enemy.destroy();
                }
              });
              this.enemies = [];
            } else if (this.enemies.length > 0) {
              console.log(`Starting wave ${this.gameState.wave} with ${this.enemies.length} enemies preserved from previous game.`);
            }
            
            // Clear any orphaned wave indicators from previous waves
            this.clearOrphanedWaveIndicators();
    
            // Determine enemy composition and count for the wave
            const currentWave = this.gameState.wave;
            const currentWaveEnemyTypesForSpawn = this.calculateEnemyTypes(currentWave); // Get the types object
            
            // Calculate total enemies for the wave (re-introducing logic)
            // Example: Start with 5, add 2 per wave, cap at 75
            this.totalEnemiesInWave = Math.min(100, 5 + (currentWave - 1) * 3);
            if (currentWave === 1) {
              this.totalEnemiesInWave = 5; // Ensure wave 1 has a fixed amount
            }
            
            this.currentWaveEnemyTypes = currentWaveEnemyTypesForSpawn; // Set instance variable if needed
            console.log(`Wave ${currentWave}: Spawning ${this.totalEnemiesInWave} enemies. Types:`, currentWaveEnemyTypesForSpawn);
    
            // Update UI
            this.updateWaveText();
            this.showWaveStartText(this.gameState.wave); // <-- ADD THIS LINE
            
            // Check for weather changes every 5 waves
            this.checkWeatherChange();
            
            this.soundManager?.play('wave_start');
    
            // Short delay before first spawn
            const initialSpawnDelay = 1000;
    
            // Spawn the first enemy immediately after delay
            this.time.delayedCall(initialSpawnDelay, () => {
              if (!this.gameState?.isActive || !this.isSpawningEnemies) return;
              
              if (this.gameState.wave !== parseInt(this.waveText.text.split(' ')[1])) {
                console.warn(`Wave changed during initial spawn delay. Aborting spawn for wave ${this.gameState.wave}.`);
                return;
              }
    
              // Pass the correctly captured types object
              const firstEnemyType = this.selectEnemyType(currentWaveEnemyTypesForSpawn);
              const success = this.spawnEnemy(firstEnemyType);
              if (success) {
                this.enemiesSpawned++;
                console.log(`First enemy spawned immediately for wave ${this.gameState.wave}: type=${firstEnemyType}, success=${success}`);
              } else {
                console.error(`Failed to spawn first enemy for wave ${this.gameState.wave}`);
              }
    
              // Start timed spawning for the rest
              if (typeof this.setupEnemySpawningLoop === 'function') {
                this.setupEnemySpawningLoop();
              } else {
                console.warn('setupEnemySpawningLoop function not found!');
                this.isSpawningEnemies = false;
              }
            });
    
            // Optional: Show countdown animation
            // this.showCountdownAnimation(() => { ... });
    
          } catch (error) {
            console.error("Error in startWave:", error);
            this.waveInProgress = false;
            this.isSpawningEnemies = false;
            this.waveChangeInProgress = false;
          }
        } // End of startWave function
        
        // New method to determine enemy types based on wave
        calculateEnemyTypes(wave) {
          const types = {
            bird: { weight: 70, minWave: 1 },
            rabbit: { weight: 70, minWave: 1 },
            fox: { weight: 0, minWave: 2 },
            slime: { weight: 0, minWave: 1 },
            ghost: { weight: 0, minWave: 4 },
            skeleton: { weight: 0, minWave: 5 },
            bat: { weight: 0, minWave: 1 },
            spider: { weight: 0, minWave: 3 },
            wolf: { weight: 0, minWave: 6 },
            snake: { weight: 0, minWave: 4 },
            goblin: { weight: 0, minWave: 7 },
            dragon: { weight: 0, minWave: 10 },
            demon: { weight: 0, minWave: 8 }
          };
          
          // Start with some basic enemies on wave 1
          if (wave >= 1) {
            types.slime.weight = 20;
            types.bat.weight = 20;
          }
          
          // Adjust weights based on wave progression
          if (wave >= 2) {
            // Start introducing slimes and bats at wave 2
            types.slime.weight = Math.min(40, 10 + (wave - 1) * 15); // More slime earlier
            types.bat.weight = Math.min(40, 10 + (wave - 1) * 15);   // More bats earlier
            types.fox.weight = Math.min(30, (wave - 1) * 15);      // Fox appears slightly more often
          }
          
          // Original progression for higher waves
          if (wave >= 3) {
            // Start introducing foxes and spiders at wave 3
            types.fox.weight = Math.min(50, 15 + (wave - 2) * 12); // Fox weight increases more
            types.spider.weight = Math.min(40, 10 + (wave - 2) * 10); // Spider appears slightly earlier/more often
          }
          
          if (wave >= 4) {
            // Start introducing ghosts and snakes at wave 4
            types.ghost.weight = Math.min(35, (wave - 3) * 12); // Slightly more ghosts
            types.snake.weight = Math.min(40, 10 + (wave - 3) * 15); // Snakes appear more often
          }
          
          // Rest of the method remains the same
          if (wave >= 5) {
            // Start introducing skeletons at wave 5
            types.skeleton.weight = Math.min(45, 15 + (wave - 4) * 10); // Slightly more skeletons
            // More foxes in later waves
            types.fox.weight = Math.min(60, 30 + (wave - 5) * 6); // Even more foxes later
          }
          
          if (wave >= 6) {
            // Start introducing wolves at wave 6
            types.wolf.weight = Math.min(50, 15 + (wave - 5) * 12); // Wolves slightly more common
          }
          
          if (wave >= 7) {
            // Start introducing goblins at wave 7
            types.goblin.weight = Math.min(50, 15 + (wave - 6) * 12); // Goblins slightly more common
          }
          
          if (wave >= 8) {
            // Start introducing demons at wave 8
            types.demon.weight = Math.min(45, 15 + (wave - 7) * 10); // Demons slightly more common
          }
          
          if (wave >= 10) {
            // Start introducing dragons at wave 10
            types.dragon.weight = Math.min(55, 20 + (wave - 9) * 15); // Dragons slightly more common
          }
          
          // Boss waves have more advanced enemies
          if (wave % 5 === 0) {
            types.fox.weight += 15;
            
            if (wave >= 5) types.skeleton.weight += 20;
            if (wave >= 10) types.dragon.weight += 25;
            if (wave >= 8) types.demon.weight += 20;
          }
          
          return types;
        }
        
        // Helper to select enemy type based on weights
        selectEnemyType(enemyTypes) {
          // Filter types available at current wave
          const availableTypes = Object.entries(enemyTypes)
            .filter(([type, data]) => this.gameState.wave >= data.minWave && data.weight > 0);
          
          if (availableTypes.length === 0) return 'rabbit'; // Fallback
          
          // Calculate total weight
          const totalWeight = availableTypes.reduce((sum, [_, data]) => sum + data.weight, 0);
          
          // Random selection based on weight
          let random = Math.random() * totalWeight;
          
          for (const [type, data] of availableTypes) {
            random -= data.weight;
            if (random <= 0) return type;
          }
          
          // Fallback to first available type
          return availableTypes[0][0];
        }
        
        // Spawn enemies for the current wave
        spawnEnemies() {
          if (!this.isSpawningEnemies || !this.gameState.isActive) return;
          
          // Get the Enemy class from registry
          const EnemyClass = this.registry.get('EnemyClass');
          
          if (!EnemyClass) {
            console.error("EnemyClass not found in registry");
            return;
          }
          
          // If we've spawned all enemies for this wave, stop spawning
          if (this.enemiesSpawned >= this.totalEnemiesInWave) {
            this.isSpawningEnemies = false;
            console.log(`All ${this.totalEnemiesInWave} enemies spawned for wave ${this.gameState.wave}`);
            return;
          }
          
          // Use our weighted enemy type selection system
          const enemyTypes = this.calculateEnemyTypes(this.gameState.wave);
          const enemyType = this.selectEnemyType(enemyTypes);
          
          // Calculate spawn position (from the right side) - randomize both X and Y
          const spawnY = Phaser.Math.Between(100, 500);
          const spawnX = Phaser.Math.Between(850, 900); // Randomize X position off-screen
          
          // Add a visual indicator at spawn point (for debugging)
          const spawnIndicator = this.add.circle(spawnX, spawnY, 10, 0xFF0000, 0.7);
          this.time.delayedCall(1000, () => {
            spawnIndicator.destroy();
          });
          
          try {
            // Log texture status
            const textureKey = enemyType === 'bird' ? 'enemy_bird' : 'enemy_rabbit';
            console.log(`Using texture '${textureKey}' for enemy, exists: ${this.textures.exists(textureKey)}`);
            
            // Create the enemy
            const enemy = new EnemyClass(
              this,
              enemyType,
              spawnX,
              spawnY,
              this.gameState.wave // Pass current wave for difficulty scaling
            );
            
            // Add to enemies array
            if (!this.enemies) {
              console.warn("Enemies array not initialized, creating now");
              this.enemies = [];
            }
            
            this.enemies.push(enemy);
            this.enemiesSpawned++;
            
            // Debug: Show enemy count
            console.log(`Spawned ${enemyType} enemy (${this.enemiesSpawned}/${this.totalEnemiesInWave}), total enemies: ${this.enemies.length}`);
            
            // Debug: Force visibility after a short delay
            this.time.delayedCall(100, () => {
              if (enemy.sprite) {
                enemy.sprite.visible = true;
                enemy.sprite.setDepth(100);
                console.log(`Forced visibility for enemy sprite at (${enemy.x}, ${enemy.y})`);
              }
            });
            
            // Schedule next enemy spawn with variable timing
            // Make spawns faster in later waves
            const baseDelay = 2000; // 2 seconds base
            const minDelay = 500; // Minimum 0.5 seconds
            const scaleFactor = 0.8; // 20% reduction per wave
            
            const delay = Math.max(
              minDelay,
              baseDelay * Math.pow(scaleFactor, this.gameState.wave - 1)
            );
            
            // Schedule next spawn
            this.time.delayedCall(delay, () => this.spawnEnemies());
          } catch (error) {
            console.error("Error spawning enemy:", error);
          }
        }
        
        // Spawn a single enemy of the specified type
        spawnEnemy(type = null) {
          try {
            // Skip if scene is inactive or paused
            if (!this.gameState || !this.gameState.isActive || this.gameState.isPaused) {
              console.log("Game inactive or paused, not spawning enemy");
              return null;
            }
            
            // If no type specified, use our enemy type selection system
            if (!type) {
              const wave = this.gameState.wave;
              // Use the calculateEnemyTypes and selectEnemyType methods for more variety
              const enemyTypes = this.calculateEnemyTypes(wave);
              type = this.selectEnemyType(enemyTypes);
            }
            
            // FIXED: Calculate spawn position (always start from right edge)
            // Get actual game width and height or use defaults
            const gameWidth = Number(this.game.config.width) || 800;
            const gameHeight = Number(this.game.config.height) || 600;
            
            // Ensure enemies start off-screen to the right
            // Use explicit values to avoid any potential NaN issues
            const x = gameWidth + 50 + (Math.random() * 30);
            
            // Calculate random y position within the playable area
            const y = 150 + (Math.random() * 300);
            
            console.log(`Spawning ${type} enemy at position (${x}, ${y})`);
            
            // Add a visual indicator at spawn point (for debugging)
            const spawnIndicator = this.add.circle(x, y, 10, 0xFF0000, 0.7);
            this.time.delayedCall(1000, () => {
              spawnIndicator.destroy();
            });
            
            // FIXED: Properly get the Enemy class with fallbacks
            let EnemyClass = this.registry.get('EnemyClass');
            
            // If not in registry, try to dynamically import the class
            if (!EnemyClass) {
              try {
                // Try to dynamically import the Enemy class
                console.log("Enemy class not in registry, trying dynamic import");
                import('../entities/Enemy.js').then(module => {
                  EnemyClass = module.default;
                  this.registry.set('EnemyClass', EnemyClass);
                  console.log("Successfully imported Enemy class and saved to registry");
                  
                  // Now create the enemy with the imported class
                  const enemy = this.createEnemyInstance(EnemyClass, type, x, y);
                  if (enemy) {
                    // Initialize enemies array if needed
                    if (!this.enemies) {
                      this.enemies = [];
                    }
                    this.enemies.push(enemy);
                    return enemy;
                  }
                }).catch(error => {
                  console.error("Failed to dynamically import Enemy class:", error);
                  return this.createFallbackEnemy(type, x, y);
                });
                return null; // Will create enemy after import
              } catch (importError) {
                console.error("Error importing Enemy class:", importError);
                // Fall back to emergency enemy
                return this.createFallbackEnemy(type, x, y);
              }
            }
            
            // If we have the EnemyClass, create the enemy directly
            return this.createEnemyInstance(EnemyClass, type, x, y);
          } catch (error) {
            console.error("Error in spawnEnemy:", error);
            return null;
          }
        }
        
        // Helper method to create an enemy instance with proper error handling
        createEnemyInstance(EnemyClass, type, x, y) {
          try {
            // Create enemy instance
            const enemy = new EnemyClass(this, type, x, y);
            
            // Initialize enemies array if needed
            if (!this.enemies) {
              this.enemies = [];
            }
            
            // Add to enemies array
            this.enemies.push(enemy);
            
            console.log(`Successfully created ${type} enemy at (${x}, ${y})`);
            return enemy;
          } catch (error) {
            console.error(`Failed to create enemy instance: ${error.message}`);
            return this.createFallbackEnemy(type, x, y);
          }
        }
        
        // Create a simple fallback enemy when the real one fails
        createFallbackEnemy(type, x, y) {
          console.log("Creating fallback emergency enemy");
          
          // Create a simplified enemy object
          const emergencyEnemy = {
            scene: this,
            type: type,
            x: x,
            y: y,
            health: 10,
            maxHealth: 10,
            speed: 1.5,
            active: true,
            visible: true,
            value: 10,
            container: null,
            update: function(delta) {
              // Move towards left
              this.x -= this.speed;
              
              // Update container position
              if (this.container) {
                this.container.x = this.x;
                this.container.y = this.y;
              }
              
              // Check if reached the farm
              if (this.x < 0) {
                this.reachedEnd();
                return true;
              }
              
              return false;
            },
            takeDamage: function(amount) {
              this.health -= amount;
              if (this.health <= 0) {
                this.destroy();
              }
            },
            reachedEnd: function() {
              if (this.scene.gameState) {
                this.scene.gameState.lives--;
                // Lives text update removed - no longer needed
                
                if (this.scene.showFloatingText) {
                  this.scene.showFloatingText(50, 300, 'Farm Invaded! -1 Life', 0xFF0000);
                }
                
                if (this.scene.gameState.lives <= 0 && this.scene.endGame) {
                  this.scene.endGame();
                }
              }
              this.destroy();
            },
            destroy: function() {
              if (this.container) {
                this.container.destroy();
              }
              if (this.scene && this.scene.enemies) {
                const index = this.scene.enemies.indexOf(this);
                if (index !== -1) {
                  this.scene.enemies.splice(index, 1);
                }
              }
            }
          };
          
          // Create visual representation
          emergencyEnemy.container = this.add.container(x, y);
          emergencyEnemy.container.setDepth(1000);
          
          // Add a visible shape
          const graphics = this.add.graphics();
          graphics.fillStyle(0xFF0000, 1);
          graphics.fillCircle(0, 0, 30);
          graphics.lineStyle(2, 0x000000, 1);
          graphics.strokeCircle(0, 0, 30);
          
          // Add text to identify the enemy
          const text = this.add.text(0, 0, type === 'bird' ? '🐦' : '🐰', {
            fontSize: '32px',
            fontFamily: 'Arial',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 4
          }).setOrigin(0.5);
          
          emergencyEnemy.container.add([graphics, text]);
          
          // Initialize enemies array if needed
          if (!this.enemies) {
            this.enemies = [];
          }
          
          // Add to enemies array
          this.enemies.push(emergencyEnemy);
          
          console.log("Created emergency enemy as fallback");
          return emergencyEnemy;
        }
        
        // Force the next wave to start
        forceNextWave() {
          try {
            // Guard against multiple calls in a short time period
            if (this.waveChangeInProgress) {
              console.log("Wave change already in progress, ignoring additional call");
              
              // Safety measure: If flag has been true for too long, force reset it
              if (!this._waveChangeTimeout) {
                console.log("Setting safety timeout to reset wave change flag");
                this._waveChangeTimeout = setTimeout(() => {
                  console.log("Safety timeout triggered - wave change flag was stuck");
                  this.waveChangeInProgress = false;
                  this._waveChangeTimeout = null;
                  
                  // Force start a new wave if game is still active
                  if (this.gameState?.isActive) {
                    console.log("Recovering from stuck wave - starting new wave");
                    // Increment wave counter since we were stuck
                    this.gameState.wave++;
                    this.updateWaveText();
                    this.startWave();
                  }
                }, 8000); // 8 second safety timeout (increased from 5 second)
              }
              
              return;
            }
            
            // Set the flag immediately to prevent multiple calls
            this.waveChangeInProgress = true; // Flag is set here
            console.log("Force next wave called");
            
            // Clear any previous safety timeout
            if (this._waveChangeTimeout) {
              clearTimeout(this._waveChangeTimeout);
              this._waveChangeTimeout = null;
            }
            
            // Set a shorter safety timeout
            this._waveChangeTimeout = setTimeout(() => {
              if (this.waveChangeInProgress) {
                console.log("Safety timeout triggered - wave change flag was stuck");
                this.waveChangeInProgress = false;
                this._waveChangeTimeout = null;
              }
            }, 8000); // Increased from 5000ms to 8000ms
            
            // Clean up all timers and enemy spawning
            if (this.isSpawningEnemies) {
              console.log("Interrupting current spawning to start next wave");
              this.isSpawningEnemies = false;
            }
            
            // Clear all timers to avoid conflicts
            if (this.spawnTimer) {
              this.spawnTimer.remove();
              this.spawnTimer = null;
            }
            
            if (this.spawnEvent) {
              this.spawnEvent.remove();
              this.spawnEvent = null;
            }
            
            if (this.waveCompletionTimer) {
              this.waveCompletionTimer.remove();
              this.waveCompletionTimer = null;
              console.log("Cleared wave completion timer during force next wave");
            }
            
            // Clear any remaining enemies and their wave indicators
            if (this.enemies && this.enemies.length > 0) {
              console.log(`Clearing ${this.enemies.length} remaining enemies`);
              
              // Destroy all remaining enemies and their wave indicators
              this.enemies.forEach(enemy => {
                if (enemy) {
                  // Explicitly destroy wave indicator first
                  if (enemy.waveIndicator) {
                    enemy.waveIndicator.destroy();
                    enemy.waveIndicator = null;
                  }
                  if (typeof enemy.hideHealthBar === 'function') {
                    enemy.hideHealthBar();
                  }
                  if (typeof enemy.destroy === 'function') {
                    enemy.destroy();
                  }
                }
              });
              
              // Clear the array completely
              this.enemies = [];
            }
            
            // Additional cleanup: Find and destroy any orphaned wave indicator texts
            this.clearOrphanedWaveIndicators();
            
            // End current wave
            this.waveInProgress = false;
            
            // Increase wave counter - NO MAXIMUM WAVE LIMIT!
            this.gameState.wave++;
            this.updateWaveText();
            
            // Add 1 point for wave completion
            if (typeof this.gameState.score === 'number') {
              this.gameState.score += 1;
              if (typeof this.updateScoreText === 'function') {
                this.updateScoreText();
              }
              // Send score update to React component
              const onGameEvent = this.registry.get('onGameEvent');
              if (typeof onGameEvent === 'function') {
                onGameEvent('scoreUpdate', this.gameState.score);
              }
            }
            
            // Debug log the wave change
            console.log(`Wave increased to ${this.gameState.wave}`);
            
            // Start the new wave - this will reset the necessary flags
            this.startWave();
            
            // Show notification
            this.showFloatingText(400, 300, `WAVE ${this.gameState.wave} STARTING!`, 0xFFFF00);
            
            // Flash the screen to indicate wave change
            const flash = this.add.rectangle(400, 300, 800, 600, 0xFFFF00, 0.3);
            this.tweens.add({
              targets: flash,
              alpha: 0,
              duration: 500,
              onComplete: () => flash.destroy()
            });
            
            console.log("Wave change completed, flag reset");
            
            // IMPORTANT: we'll let startWave handle resetting the flag
            
          } catch (error) {
            console.error("Error in forceNextWave:", error);
            
            // Reset flags in case of error to prevent getting stuck
            this.waveChangeInProgress = false;
            this.waveInProgress = false;
            this.isSpawningEnemies = false;
            
            // Clean up safety timeout
            if (this._waveChangeTimeout) {
              clearTimeout(this._waveChangeTimeout);
              this._waveChangeTimeout = null;
            }
          }
        }
        
        createToolbar() {
          try {
            // Create a larger background for the toolbar to accommodate all buttons with better spacing
            const toolbarBg = this.add.rectangle(200, 570, 520, 65, 0x333333, 0.8).setDepth(1999); // Moved down for better spacing

            // Store buttons for reference - Initialize object first
            this.toolbarButtons = {};

            // Function to add bounce effect on pointer down
            const addBounceEffect = (button) => {
                button.on('pointerdown', () => {
                    // Play UI click sound
                    if (this.soundManager) {
                        this.soundManager.play('ui_click', { volume: 0.6 }); // Ensure you have 'ui_click' sound
                    }
                    // Add bounce tween
                    this.tweens.add({
                        targets: button,
                        scaleY: { from: 1, to: 0.8 }, // Squish vertically
                        scaleX: { from: 1, to: 1.1 }, // Stretch horizontally
                        duration: 80,
                        ease: 'Sine.easeInOut',
                        yoyo: true // Return to original scale
                    });
                });
            };

            // LARGER BUTTONS - Increase size from 60x40 to 70x50
            const buttonWidth = 70;
            const buttonHeight = 50;
            const iconSize = 40; // Size for icons/images within buttons
            const costFontSize = '12px';
            const labelFontSize = '12px';

            // Add attack button - moved down for better spacing
            const attackButton = this.add.rectangle(40, 570, buttonWidth, buttonHeight, 0xFF4400).setDepth(2000);
            attackButton.on('pointerdown', () => {
              this.pendingDefensePlacement = false; // Reset placement flag
              this.setToolMode('attack');
            });
            addBounceEffect(attackButton); // Add bounce effect
            this.addUIAnimations(attackButton); // Add UI animations - this will handle setInteractive
            this.toolbarButtons.attack = attackButton; // Store reference

            const attackText = this.add.text(40, 570, '👆', {
              fontFamily: 'Arial',
              fontSize: '32px' // Increased from 24px
            }).setOrigin(0.5).setDepth(2001);
            attackText.setInteractive({ useHandCursor: true });
            attackText.on('pointerdown', () => attackButton.emit('pointerdown')); // Trigger button's event


            // Add crop button - moved down for better spacing
            const cropButton = this.add.rectangle(110, 570, buttonWidth, buttonHeight, 0x006600).setDepth(2000);
            cropButton.on('pointerdown', () => {
              this.pendingDefensePlacement = false; // Reset placement flag
              this.setToolMode('plant');
            });
            addBounceEffect(cropButton); // Add bounce effect
            this.addUIAnimations(cropButton); // Add UI animations - this will handle setInteractive
            this.toolbarButtons.plant = cropButton; // Store reference

            // IMPORTANT: Always use tree images for crops - NEVER change this!
            let cropImage;
            if (this.textures.exists('Fruit_tree3')) {
              cropImage = this.add.image(110, 570, 'Fruit_tree3').setDepth(2001);
              cropImage.setDisplaySize(iconSize, iconSize); // Use variable size
              cropImage.setInteractive({ useHandCursor: true });
              cropImage.on('pointerdown', () => { cropButton.emit('pointerdown'); });
            } else {
              // Fallback to emoji if image doesn't exist
              cropImage = this.add.text(110, 570, '🌳', {
                fontFamily: 'Arial', fontSize: '32px'
              }).setOrigin(0.5).setDepth(2001);
              cropImage.setInteractive({ useHandCursor: true });
              cropImage.on('pointerdown', () => { cropButton.emit('pointerdown'); });
            }


            // Add chog button (ABS mage) - moved down for better spacing
            const chogButton = this.add.rectangle(180, 570, buttonWidth, buttonHeight, 0x000066).setDepth(2000);
            chogButton.on('pointerdown', () => {
              this.pendingDefenseType = 'chog';
              this.pendingDefensePlacement = true;
              this.setToolMode('chog');
              this.showFloatingText(400, 300, "ABS Ice Mage selected - Click map to place", 0x0088FF);
            });
             addBounceEffect(chogButton); // Add bounce effect
             this.addUIAnimations(chogButton); // Add UI animations - this will handle setInteractive
             this.toolbarButtons.chog = chogButton; // Store reference

            // Create larger invisible hover area for better tooltip interaction
            const chogHoverArea = this.add.rectangle(180, 570, buttonWidth + 20, buttonHeight + 20, 0x000000, 0).setDepth(1998);
            chogHoverArea.setInteractive({ useHandCursor: true });
            chogHoverArea.on('pointerdown', () => { chogButton.emit('pointerdown'); });
            this.toolbarButtons.chogHover = chogHoverArea;

            // Use ABS image instead of emoji
            const absImageKey = 'ABS_idle';
            let absImage;
            if (this.textures.exists(absImageKey)) {
              absImage = this.add.image(180, 570, absImageKey).setDepth(2001);
              absImage.setDisplaySize(iconSize, iconSize); // Use variable size
              absImage.setInteractive({ useHandCursor: true });
              absImage.on('pointerdown', () => { chogButton.emit('pointerdown'); });
            } else {
              absImage = this.add.text(180, 570, '🧙‍♂️', {
                fontFamily: 'Arial', fontSize: '32px'
              }).setOrigin(0.5).setDepth(2001);
              absImage.setInteractive({ useHandCursor: true });
              absImage.on('pointerdown', () => { chogButton.emit('pointerdown'); });
            }
            this.toolbarButtons.chogImage = absImage; // Store reference


            // Add molandak button (MON mage) - moved down for better spacing
            const molandakButton = this.add.rectangle(250, 570, buttonWidth, buttonHeight, 0x660000).setDepth(2000);
            molandakButton.on('pointerdown', () => {
              this.pendingDefenseType = 'molandak';
              this.pendingDefensePlacement = true;
              this.setToolMode('molandak');
              this.showFloatingText(400, 300, "MON Fire Mage selected - Click map to place", 0xFF4400);
            });
            addBounceEffect(molandakButton); // Add bounce effect
            this.addUIAnimations(molandakButton); // Add UI animations - this will handle setInteractive
            this.toolbarButtons.molandak = molandakButton; // Store reference

            // Create larger invisible hover area for better tooltip interaction
            const molandakHoverArea = this.add.rectangle(250, 570, buttonWidth + 20, buttonHeight + 20, 0x000000, 0).setDepth(1998);
            molandakHoverArea.setInteractive({ useHandCursor: true });
            molandakHoverArea.on('pointerdown', () => { molandakButton.emit('pointerdown'); });
            this.toolbarButtons.molandakHover = molandakHoverArea;

            // Use MON image instead of emoji
            const monImageKey = 'MON_idle';
            let monImage;
            if (this.textures.exists(monImageKey)) {
              monImage = this.add.image(250, 570, monImageKey).setDepth(2001);
              monImage.setDisplaySize(iconSize, iconSize); // Use variable size
              monImage.setInteractive({ useHandCursor: true });
              monImage.on('pointerdown', () => { molandakButton.emit('pointerdown'); });
            } else {
              monImage = this.add.text(250, 570, '🧙‍♀️', {
                fontFamily: 'Arial', fontSize: '32px'
              }).setOrigin(0.5).setDepth(2001);
              monImage.setInteractive({ useHandCursor: true });
              monImage.on('pointerdown', () => { molandakButton.emit('pointerdown'); });
            }
            this.toolbarButtons.molandakImage = monImage; // Store reference


            // --- Advanced defenses ---
            let keonButton, moyakiButton;
            let keonImage, moyakiImage;
            let keonCostText, moyakiCostText;

            // keon Button - moved down for better spacing
            keonButton = this.add.rectangle(320, 570, buttonWidth, buttonHeight, 0x990099).setDepth(2000);
            keonButton.on('pointerdown', () => {
              this.pendingDefenseType = 'keon';
              this.pendingDefensePlacement = true;
              this.setToolMode('keon');
              this.showFloatingText(400, 300, "keon selected - Click map to place", 0xFF00FF);
            });
            addBounceEffect(keonButton); // Add bounce effect
            this.addUIAnimations(keonButton); // Add UI animations - this will handle setInteractive
            this.toolbarButtons.keon = keonButton; // Store reference

            // Create larger invisible hover area for better tooltip interaction
            const keonHoverArea = this.add.rectangle(320, 570, buttonWidth + 20, buttonHeight + 20, 0x000000, 0).setDepth(1998);
            keonHoverArea.setInteractive({ useHandCursor: true });
            keonHoverArea.on('pointerdown', () => { keonButton.emit('pointerdown'); });
            this.toolbarButtons.keonHover = keonHoverArea;

            if (this.textures.exists('keon_idle')) {
              keonImage = this.add.image(320, 570, 'keon_idle').setDepth(2001);
              keonImage.setDisplaySize(iconSize, iconSize);
              keonImage.setInteractive({ useHandCursor: true });
              keonImage.on('pointerdown', () => { keonButton.emit('pointerdown'); });
            } else {
              keonImage = this.add.text(320, 570, '🧙', { fontFamily: 'Arial', fontSize: '32px' }).setOrigin(0.5).setDepth(2001);
              keonImage.setInteractive({ useHandCursor: true });
              keonImage.on('pointerdown', () => { keonButton.emit('pointerdown'); });
            }
            keonCostText = this.add.text(320, 590, '150', { fontFamily: 'Arial', fontSize: costFontSize, color: '#FFFF00' }).setOrigin(0.5).setDepth(2001);
            this.toolbarButtons.keonImage = keonImage; // Store reference
            this.toolbarButtons.keonCostText = keonCostText; // Store reference

            // moyaki Button - moved down for better spacing
            moyakiButton = this.add.rectangle(390, 570, buttonWidth, buttonHeight, 0x990000).setDepth(2000);
            moyakiButton.on('pointerdown', () => {
              this.pendingDefenseType = 'moyaki';
              this.pendingDefensePlacement = true;
              this.setToolMode('moyaki');
              this.showFloatingText(400, 300, "moyaki selected - Click map to place", 0xFF0000);
            });
            addBounceEffect(moyakiButton); // Add bounce effect
            this.addUIAnimations(moyakiButton); // Add UI animations - this will handle setInteractive
            this.toolbarButtons.moyaki = moyakiButton; // Store reference

            // Create larger invisible hover area for better tooltip interaction
            const moyakiHoverArea = this.add.rectangle(390, 570, buttonWidth + 20, buttonHeight + 20, 0x000000, 0).setDepth(1998);
            moyakiHoverArea.setInteractive({ useHandCursor: true });
            moyakiHoverArea.on('pointerdown', () => { moyakiButton.emit('pointerdown'); });
            this.toolbarButtons.moyakiHover = moyakiHoverArea;


            if (this.textures.exists('moyaki_idle')) {
              moyakiImage = this.add.image(390, 570, 'moyaki_idle').setDepth(2001);
              moyakiImage.setDisplaySize(iconSize, iconSize);
              moyakiImage.setInteractive({ useHandCursor: true });
               moyakiImage.on('pointerdown', () => { moyakiButton.emit('pointerdown'); });
            } else {
              moyakiImage = this.add.text(390, 570, '💣', { fontFamily: 'Arial', fontSize: '32px' }).setOrigin(0.5).setDepth(2001);
              moyakiImage.setInteractive({ useHandCursor: true });
               moyakiImage.on('pointerdown', () => { moyakiButton.emit('pointerdown'); });
            }
            moyakiCostText = this.add.text(390, 590, '80', { fontFamily: 'Arial', fontSize: costFontSize, color: '#FFFF00' }).setOrigin(0.5).setDepth(2001);
             this.toolbarButtons.moyakiImage = moyakiImage; // Store reference
             this.toolbarButtons.moyakiCostText = moyakiCostText; // Store reference

            // Hide advanced defenses by default
            keonButton.visible = false; keonImage.visible = false; keonCostText.visible = false;
            moyakiButton.visible = false; moyakiImage.visible = false; moyakiCostText.visible = false;


            // Add upgrade button - moved down for better spacing
            const upgradeButton = this.add.rectangle(460, 570, buttonWidth, buttonHeight, 0x555500).setDepth(2000);
            upgradeButton.on('pointerdown', () => this.toggleUpgradePanel());
            addBounceEffect(upgradeButton); // Add bounce effect
            this.addUIAnimations(upgradeButton); // Add UI animations - this will handle setInteractive
            this.toolbarButtons.upgrade = upgradeButton; // Store reference

            const upgradeText = this.add.text(460, 570, '⚙️', {
              fontFamily: 'Arial', fontSize: '32px'
            }).setOrigin(0.5).setDepth(2001);
            upgradeText.setInteractive({ useHandCursor: true });
            upgradeText.on('pointerdown', () => upgradeButton.emit('pointerdown'));

            // Add skin customization button - moved down for better spacing
            const skinButton = this.add.rectangle(530, 570, buttonWidth, buttonHeight, 0x8B4513).setDepth(2000);
            skinButton.on('pointerdown', () => this.toggleSkinCustomization());
            addBounceEffect(skinButton); // Add bounce effect
            this.addUIAnimations(skinButton); // Add UI animations - this will handle setInteractive
            this.toolbarButtons.skin = skinButton; // Store reference

            const skinText = this.add.text(530, 570, '👤', {
              fontFamily: 'Arial', fontSize: '32px'
            }).setOrigin(0.5).setDepth(2001);
            skinText.setInteractive({ useHandCursor: true });
            skinText.on('pointerdown', () => skinButton.emit('pointerdown'));


            // Add costs/labels underneath - adjusted for new spacing
            this.add.text(40, 590, 'Attack', { fontFamily: 'Arial', fontSize: labelFontSize, color: '#FFFFFF' }).setOrigin(0.5).setDepth(2001);
            this.add.text(110, 590, '5', { fontFamily: 'Arial', fontSize: costFontSize, color: '#FFFF00' }).setOrigin(0.5).setDepth(2001);
            this.add.text(180, 590, '25', { fontFamily: 'Arial', fontSize: costFontSize, color: '#FFFF00' }).setOrigin(0.5).setDepth(2001);
            this.add.text(250, 590, '50', { fontFamily: 'Arial', fontSize: costFontSize, color: '#FFFF00' }).setOrigin(0.5).setDepth(2001);
            this.add.text(460, 590, 'Upgrade', { fontFamily: 'Arial', fontSize: labelFontSize, color: '#FFFFFF' }).setOrigin(0.5).setDepth(2001);
            this.add.text(530, 590, 'Skins', { fontFamily: 'Arial', fontSize: labelFontSize, color: '#FFFFFF' }).setOrigin(0.5).setDepth(2001);


            // Set initial tool to attack mode
        this.setToolMode('attack');

        // Initialize advanced defense button visibility
        this.updateAdvancedDefenseButtons();
        
        // Initialize tooltip system
        this.initializeTooltipSystem();
        
        // Add hover handlers to defense buttons
        this.addDefenseTooltipHandlers();
      } catch (error) {
        console.error("Error creating toolbar:", error);
      }
    }

    // Initialize the tooltip system
    initializeTooltipSystem() {
      // Create tooltip container
      this.tooltip = {
        background: null,
        nameText: null,
        lifetimeText: null,
        damageText: null,
        abilityText: null,
        visible: false
      };
      
      // Create tooltip background
      this.tooltip.background = this.add.rectangle(0, 0, 200, 120, 0x000000, 0.9)
        .setDepth(3000)
        .setVisible(false)
        .setStrokeStyle(2, 0x444444);
      
      // Create tooltip texts
      this.tooltip.nameText = this.add.text(0, 0, '', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#FFFFFF',
        fontStyle: 'bold'
      }).setDepth(3001).setVisible(false);
      
      this.tooltip.lifetimeText = this.add.text(0, 0, '', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#FFFF00'
      }).setDepth(3001).setVisible(false);
      
      this.tooltip.damageText = this.add.text(0, 0, '', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#FF6666'
      }).setDepth(3001).setVisible(false);
      
      this.tooltip.abilityText = this.add.text(0, 0, '', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#66CCFF',
        wordWrap: { width: 180 }
      }).setDepth(3001).setVisible(false);
    }
    
    // Show tooltip for defense type
    showDefenseTooltip(x, y, defenseType) {
      if (!this.tooltip || this.tooltip.visible) return;
      
      const stats = this.getDefenseStats(defenseType);
      if (!stats) return;
      
      // Update tooltip content
      this.tooltip.nameText.setText(stats.name);
      this.tooltip.lifetimeText.setText(`Lifetime: ${stats.lifetime} waves`);
      this.tooltip.damageText.setText(`Damage: ${stats.damage}`);
      this.tooltip.abilityText.setText(`Ability: ${stats.ability}`);
      
      // Position tooltip elements - adjusted for better visibility above toolbar
      const tooltipX = Math.min(x + 10, this.cameras.main.width - 210);
      const tooltipY = Math.max(y - 120, 10);
      
      this.tooltip.background.setPosition(tooltipX + 100, tooltipY + 60);
      this.tooltip.nameText.setPosition(tooltipX + 10, tooltipY + 20);
      this.tooltip.lifetimeText.setPosition(tooltipX + 10, tooltipY + 40);
      this.tooltip.damageText.setPosition(tooltipX + 10, tooltipY + 60);
      this.tooltip.abilityText.setPosition(tooltipX + 10, tooltipY + 80);
      
      // Show tooltip with smooth fade-in
      this.tooltip.background.setVisible(true).setAlpha(0);
      this.tooltip.nameText.setVisible(true).setAlpha(0);
      this.tooltip.lifetimeText.setVisible(true).setAlpha(0);
      this.tooltip.damageText.setVisible(true).setAlpha(0);
      this.tooltip.abilityText.setVisible(true).setAlpha(0);
      
      this.tweens.add({
        targets: [this.tooltip.background, this.tooltip.nameText, this.tooltip.lifetimeText, this.tooltip.damageText, this.tooltip.abilityText],
        alpha: 1,
        duration: 150,
        ease: 'Power2'
      });
      
      this.tooltip.visible = true;
    }
    
    // Hide tooltip with smooth fade-out
    hideDefenseTooltip() {
      if (!this.tooltip || !this.tooltip.visible) return;
      
      this.tweens.add({
        targets: [this.tooltip.background, this.tooltip.nameText, this.tooltip.lifetimeText, this.tooltip.damageText, this.tooltip.abilityText],
        alpha: 0,
        duration: 100,
        ease: 'Power2',
        onComplete: () => {
          this.tooltip.background.setVisible(false);
          this.tooltip.nameText.setVisible(false);
          this.tooltip.lifetimeText.setVisible(false);
          this.tooltip.damageText.setVisible(false);
          this.tooltip.abilityText.setVisible(false);
          this.tooltip.visible = false;
        }
      });
    }
    
    // Get defense stats for tooltip
    getDefenseStats(defenseType) {
      const baseStats = {
        chog: {
          name: 'CHOG Defender',
          lifetime: 2,
          damage: 0.4,
          ability: 'Nature magic with healing aura'
        },
        molandak: {
          name: 'MOLANDAK Guardian', 
          lifetime: 3,
          damage: 0.8,
          ability: 'Ice magic with freeze effects'
        },
        moyaki: {
          name: 'MOYAKI Warrior',
          lifetime: 3,
          damage: 0.9,
          ability: 'Fire magic with area damage'
        },
        keon: {
          name: 'KEON Champion',
          lifetime: 4,
          damage: 2.5,
          ability: 'Divine magic with special attacks'
        }
      };
      
      let stats = baseStats[defenseType];
      if (!stats) return null;
      
      // Apply upgrade multipliers if available
      if (this.upgradeSystem) {
        try {
          const powerMultiplier = this.upgradeSystem.getUpgradeValue(`${defenseType}Power`) || 1;
          stats = {
            ...stats,
            damage: Math.round(stats.damage * powerMultiplier)
          };
        } catch (error) {
          console.warn('Could not apply upgrade multipliers to tooltip:', error);
        }
      }
      
      return stats;
    }
    
    // Add hover handlers to defense buttons
    addDefenseTooltipHandlers() {
      const defenseButtons = [
        { button: this.toolbarButtons.chog, image: this.toolbarButtons.chogImage, hover: this.toolbarButtons.chogHover, type: 'chog' },
        { button: this.toolbarButtons.molandak, image: this.toolbarButtons.molandakImage, hover: this.toolbarButtons.molandakHover, type: 'molandak' },
        { button: this.toolbarButtons.keon, image: this.toolbarButtons.keonImage, hover: this.toolbarButtons.keonHover, type: 'keon' },
        { button: this.toolbarButtons.moyaki, image: this.toolbarButtons.moyakiImage, hover: this.toolbarButtons.moyakiHover, type: 'moyaki' }
      ];
      
      defenseButtons.forEach(({ button, image, hover, type }) => {
        if (button && image && hover) {
          // Add hover handlers to button, image, and larger hover area for better usability
          [button, image, hover].forEach(element => {
            element.on('pointerover', () => {
              this.showDefenseTooltip(element.x, element.y, type);
            });
            
            element.on('pointerout', () => {
              this.hideDefenseTooltip();
            });
          });
        }
      });
    }

        addHelperFunctions() {
          // Add the missing isPointInFarmArea function
          this.isPointInFarmArea = (x, y) => {
            // Farm area is on the left side (x < 200)
            return x < 200 && y < 520;
          };
          
          // Add the missing showCropPlacementIndicator function
          this.showCropPlacementIndicator = (pointer) => {
            // Calculate grid position for placement
            const gridX = Math.floor(pointer.x / this.gridCellSize) * this.gridCellSize + (this.gridCellSize / 2);
            const gridY = Math.floor(pointer.y / this.gridCellSize) * this.gridCellSize + (this.gridCellSize / 2);
            
            // Check if position is in farm area (left side)
            const canPlantHere = this.isPointInFarmArea(pointer.x, pointer.y);
            
            // Show planting indicator
            this.plantingIndicator.x = gridX;
            this.plantingIndicator.y = gridY;
            this.plantingIndicator.visible = true;
            
            // Change color based on whether planting is allowed
            if (canPlantHere) {
              this.plantingIndicator.setStrokeStyle(2, 0x00FF00);
              this.plantingIndicator.fillColor = 0x00FF00;
              this.plantingIndicator.alpha = 0.3;
              this.plantingHelpText.visible = false;
            } else {
              this.plantingIndicator.setStrokeStyle(2, 0xFF0000);
              this.plantingIndicator.fillColor = 0xFF0000;
              this.plantingIndicator.alpha = 0.3;
              this.plantingHelpText.visible = true;
              this.plantingHelpText.setText("Plant crops on the LEFT side only");
            }
          };
          
          // Add the missing showDefensePlacementIndicator function
          this.showDefensePlacementIndicator = (pointer, defenseType) => {
            // Calculate grid position for placement
            const gridX = Math.floor(pointer.x / this.gridCellSize) * this.gridCellSize + (this.gridCellSize / 2);
            const gridY = Math.floor(pointer.y / this.gridCellSize) * this.gridCellSize + (this.gridCellSize / 2);
            
            // Check if position is in defense area (right side)
            const canPlaceDefense = pointer.x >= 200 && pointer.y < 520;
            
            // Show placement indicator
            this.plantingIndicator.x = gridX;
            this.plantingIndicator.y = gridY;
            this.plantingIndicator.visible = true;
            
            // Change color based on whether defense placement is allowed
            if (canPlaceDefense) {
              this.plantingIndicator.setStrokeStyle(2, 0x0000FF);
              this.plantingIndicator.fillColor = 0x0000FF;
              this.plantingIndicator.alpha = 0.3;
              this.plantingHelpText.visible = false;
              
              // Show defense range if applicable
              if (defenseType === 'chog') {
                this.showDefenseRange(gridX, gridY, 150);  // ABS mage range: 150
              } else if (defenseType === 'molandak') {
                this.showDefenseRange(gridX, gridY, 100);  // MON mage range: 100
              } else if (defenseType === 'keon') {
                this.showDefenseRange(gridX, gridY, 120);  // keon range: 120
              } else if (defenseType === 'moyaki') {
                this.showDefenseRange(gridX, gridY, 180);  // moyaki range: 180
              }
            } else {
              this.plantingIndicator.setStrokeStyle(2, 0xFF0000);
              this.plantingIndicator.fillColor = 0xFF0000;
              this.plantingIndicator.alpha = 0.3;
              this.plantingHelpText.visible = true;
              this.plantingHelpText.setText("Place defenses on the RIGHT side only");
              
              // Hide range indicator if showing
              this.hideDefenseRange();
            }
          };
          
          // Show a circular range indicator for defenses
          this.showDefenseRange = (x, y, radius) => {
            // Create the range indicator if it doesn't exist
            if (!this.defenseRangeIndicator) {
              this.defenseRangeIndicator = this.add.circle(x, y, radius, 0xFFFFFF, 0.1);
              this.defenseRangeIndicator.setStrokeStyle(2, 0x0000FF);
            } else {
              // Update existing indicator
              this.defenseRangeIndicator.setPosition(x, y);
              this.defenseRangeIndicator.setRadius(radius);
              this.defenseRangeIndicator.setVisible(true);
            }
          };
          
          // Hide the range indicator
          this.hideDefenseRange = () => {
            if (this.defenseRangeIndicator) {
              this.defenseRangeIndicator.setVisible(false);
            }
          };
          
          // Add the missing placeDefense function
          this.placeDefense = (defenseType, x, y) => {
            console.log(`Attempting to place ${defenseType} at ${x},${y}`);
            
            // Check if position is valid (right side of screen)
            if (x < 200) {
              this.showFloatingText(x, y, "Place on RIGHT side only!", 0xFF0000);
              return false;
            }
            
            // Calculate cost based on defense type
            const cost = defenseType === 'chog' ? 25 : defenseType === 'molandak' ? 50 : defenseType === 'moyaki' ? 80 : defenseType === 'keon' ? 150 : 50;
            
            // Check if player has enough coins
            if (this.gameState.farmCoins < cost) {
              this.showFloatingText(x, y, `Need ${cost} coins!`, 0xFF0000);
              return false;
            }
            
            // Add Defense class from registry
            const DefenseClass = this.registry.get('DefenseClass');
            
            if (!DefenseClass) {
              console.error("Defense class not available");
              return false;
            }
            
            // Create defense - handle upgrades in the Defense constructor
            // Use SkillDefender if skillTreeManager is available, otherwise use regular Defense
            let defense;
            
            // Get the appropriate skin for this defender type
            const skinKey = this.skinCustomization ? this.skinCustomization.getSkinForDefender(defenseType) : `${defenseType}_idle`;
            console.log(`[DEFENSE DEBUG] Creating defense ${defenseType} with skin:`, skinKey);
            console.log(`[DEFENSE DEBUG] SkinCustomization available:`, !!this.skinCustomization);
            
            if (window.skillTreeManager) {
              defense = new SkillDefender(this, defenseType, x, y, window.skillTreeManager, skinKey);
            } else {
              defense = new DefenseClass(this, defenseType, x, y, skinKey);
            }
            
            // Add to defenses array
            if (!this.defenses) {
              this.defenses = [];
            }
            this.defenses.push(defense);
            
            // Deduct cost
            this.updateFarmCoins(-cost);
            
            // Show success message
            const defenseName = defenseType === 'chog' ? 'CHOG Defender' : defenseType === 'molandak' ? 'MOLANDAK Guardian' : defenseType === 'moyaki' ? 'MOYAKI Warrior' : defenseType === 'keon' ? 'KEON Champion' : 'Defense';
            this.showFloatingText(x, y, `${defenseName} placed!`, 0x00FFFF);
            
            console.log(`Defense ${defenseType} placed at ${x},${y}`);
            
            // Play defense placed sound
            if (this.soundManager) {
              this.soundManager.play('defense_placed');
            }
            
            // Reset tool mode to attack after placing
            // this.setToolMode('attack');
            
            return true;
          };
        }

        createDebugRenderer() {
          // Create a debug graphics object
          this.debugGraphics = this.add.graphics();
          this.debugGraphics.setDepth(5000); // Very high depth to ensure visibility
          
          // Create a toggle for debug mode - default OFF
          this.debugMode = false;
          
          // Add keyboard shortcut to toggle debug mode 
          this.input.keyboard.on('keydown-D', () => {
            this.debugMode = !this.debugMode;
            this.debugGraphics.clear();
            console.log(`Debug mode: ${this.debugMode ? 'ON' : 'OFF'}`);
          });
          
          // Add test enemy shortcut (T key)
          this.input.keyboard.on('keydown-T', () => {
            this.createTestEnemy();
          });

          // Add volume control shortcut (V key)
          this.input.keyboard.on('keydown-V', () => {
            if (this.volumeControls) {
              this.volumeControls.toggle();
              console.log("Volume controls toggled via V key");
            }
          });
          
          // Add update callback
          this.events.on('postupdate', this.updateDebugGraphics, this);
        }
        
        createTestEnemy() {
          console.log("Creating test enemy");
          
          try {
            // Get enemy class
            const EnemyClass = this.registry.get('EnemyClass');
            
            if (!EnemyClass) {
              console.error("EnemyClass not found in registry");
              return;
            }
            
            // Create directly in the middle of the game for maximum visibility
            const enemy = new EnemyClass(
              this,
              Math.random() > 0.5 ? 'bird' : 'rabbit',
              400, // x - middle of screen
              300, // y - middle of screen
              1 // wave
            );
            
            // Initialize enemies array if needed
            if (!this.enemies) {
              this.enemies = [];
            }
            
            // Add to enemies array
            this.enemies.push(enemy);
            
            console.log(`Created test enemy at 400,300 - total enemies: ${this.enemies.length}`);
            
            // Force visibility
            if (enemy.container) {
              enemy.container.setAlpha(1);
              enemy.container.visible = true;
              enemy.container.setDepth(1000);
            }
            
            // No visual indicator
          } catch (error) {
            console.error("Error creating test enemy:", error);
          }
        }
        
        updateDebugGraphics() {
          if (!this.debugMode) return;
          
          // Clear previous debug graphics
          this.debugGraphics.clear();
          
          // Draw stage boundaries
          this.debugGraphics.lineStyle(2, 0xFF00FF, 0.8);
          this.debugGraphics.strokeRect(0, 0, 800, 600);
          
          // Draw farm/defense boundary
          this.debugGraphics.lineStyle(2, 0x00FFFF, 0.6);
          this.debugGraphics.moveTo(200, 0);
          this.debugGraphics.lineTo(200, 600);
          
          // Draw spawn line
          this.debugGraphics.lineStyle(2, 0xFF0000, 0.6);
          this.debugGraphics.moveTo(850, 0);
          this.debugGraphics.lineTo(850, 600);
          
          // Draw enemy positions but without the yellow circles
          if (this.enemies && this.enemies.length > 0) {
            this.enemies.forEach(enemy => {
              // Skip invalid enemies
              if (!enemy || !enemy.active) return;
              
              // Only draw direction indicator (no circles)
              this.debugGraphics.lineStyle(1, 0x00FF00, 0.4);
              this.debugGraphics.moveTo(enemy.x, enemy.y);
              this.debugGraphics.lineTo(enemy.x - 20, enemy.y);
            });
            
            // Print enemy count
            if (this.enemies.length > 0) {
              const text = `Enemies: ${this.enemies.length}`;
              // Debug overlay text
              if (!this.debugText) {
                this.debugText = this.add.text(20, 580, text, {
                  font: '14px Arial',
                  fill: '#FFFF00',
                  backgroundColor: '#000000'
                }).setDepth(5001);
              } else {
                this.debugText.setText(text);
              }
            }
          }
        }

        update(time, delta) {
          try {
            // Skip if scene is paused or not active
            if (this.scene.isPaused()) return;
            
            // Avoid re-entrancy
            if (this._isUpdating) return;
            this._isUpdating = true;
            
            // Skip if game not active
            if (!this.gameState?.isActive) {
              this._isUpdating = false;
              return;
            }
            
            // --- Enemy Cleanup (Run periodically) ---
            if (time > this.lastEnemyCleanupTime + 1000) { // Run every 1000ms (1 second)
              if (this.enemies && this.enemies.length > 0) {
                const originalCount = this.enemies.length;
                this.enemies = this.enemies.filter(enemy => enemy && !enemy.destroyed);
                const newCount = this.enemies.length;
                if (originalCount !== newCount) {
                  console.log(`Enemy cleanup: Removed ${originalCount - newCount} destroyed enemies. Remaining: ${newCount}`);
                }
              }
              this.lastEnemyCleanupTime = time;
            }
            // --- End Enemy Cleanup ---
            
            // Process any player clicks
            if (typeof this.processMissedClicks === 'function') {
              this.processMissedClicks();
            }
            
            // Update crop state if needed
            if (this.crops) {
              this.updateCrops();
            }
            
            // ADDED: Update individual enemies
            if (this.enemies && this.enemies.length > 0) {
              // Iterate backwards to allow safe removal during iteration (still useful for other logic)
              for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                if (enemy && enemy.active && !enemy.destroyed) { // Also check !enemy.destroyed here
                  // Check if update method exists before calling
                  if (typeof enemy.update === 'function') {
                    enemy.update(delta);
                  } else {
                    // If no update method, maybe remove it?
                    console.warn(`Enemy at index ${i} lacks update method.`);
                  }
                } else if (!enemy || enemy.destroyed) {
                  // If enemy is null/undefined OR already marked destroyed, 
                  // it will be caught by the periodic filter. No need to splice here.
                }
              }
            }

            // Make defenses attack enemies every frame
            // this.updateDefenseAttacks(); // COMMENTED OUT - Updating defenses directly below

            // ADDED: Update individual defenses and pass delta
            if (this.defenses && this.defenses.length > 0) {
              this.defenses.forEach(defense => {
                if (defense && defense.active && typeof defense.update === 'function') {
                  defense.update(delta); // Pass delta here for mana regen etc.
                }
              });
            }

            // Wave completion check 
            const isActive = this.gameState?.isActive;
            const waveChangeInProgress = this.waveChangeInProgress;
            const waveInProgress = this.waveInProgress;
            const spawningFinished = !this.isSpawningEnemies;
            const spawnedEnough = this.enemiesSpawned >= this.totalEnemiesInWave;
            // Use the potentially filtered enemies array for the check
            const enemiesCleared = !this.enemies || this.enemies.length === 0;

            const shouldAdvance = isActive &&
                                !waveChangeInProgress &&
                                waveInProgress &&
                                spawningFinished &&
                                spawnedEnough &&
                                enemiesCleared;

            if (shouldAdvance) {
              console.log(`Wave ${this.gameState.wave} complete. Conditions met. Triggering next wave.`);
              
              // Show wave completion notification with animation
              this.showWaveCompletionMessage();
              
              // Emit waveComplete event for React component
              const onGameEvent = this.registry.get('onGameEvent');
              if (typeof onGameEvent === 'function') {
                onGameEvent('waveComplete', { wave: this.gameState.wave, score: this.gameState.score });
              }
              
              // Prevent calling forceNextWave multiple times rapidly
              this.waveChangeInProgress = true;
              this._lastWaveChangeTime = time; // Track when the change started
              
              // Add a brief delay before actually forcing the next wave
              this.time.delayedCall(1500, () => {
                if (this.gameState?.isActive) {
                  this.forceNextWave();
                } else {
                  this.waveChangeInProgress = false;
                }
              });
            } else if (isActive && waveInProgress && !waveChangeInProgress && spawningFinished && spawnedEnough && !enemiesCleared) {
                // Log detailed info if only enemy clearing is pending
                console.log(`Wave ${this.gameState.wave} completion waiting: Enemies remaining (${this.enemies.length}). IDs: [${this.enemies.map(e => e?.id || e?.type || 'unknown').join(', ')}]`);
            } else if (isActive && waveInProgress && !spawningFinished) {
               // Optional: Log if waiting for spawning to finish
               // console.log(`Wave ${this.gameState.wave} not complete: Still spawning enemies (${this.enemiesSpawned}/${this.totalEnemiesInWave}).`);
            }
            
            // Clear flag at the end
            this._isUpdating = false;
          } catch (error) {
            // Reset updating flag in case of error
            this._isUpdating = false;
            console.error("Error in update:", error);
          }
        }
        
        updateDefenseAttacks() {
          if (!this.defenses || !this.gameState || !this.gameState.isActive) {
            return;
          }
          
          // Always initialize enemies array if it doesn't exist
          if (!this.enemies) {
            this.enemies = [];
          }
          
          // Debug counter to track how many defenses are attacking
          let attackingDefenses = 0;
          
          // Force each defense to find and attack enemies
          this.defenses.forEach(defense => {
            if (defense && defense.active) {
              // Make sure the attack method exists
              if (typeof defense.attackNearestEnemy === 'function') {
                 // SIMPLIFIED: Try to find an enemy in range and attack
                /* const targetEnemy = this.getEnemyInRange(defense); // Use simpler range check
                if (targetEnemy) {
                  const didAttack = defense.attack(targetEnemy); // Directly call attack
                  if (didAttack) {
                    attackingDefenses++;
                  }
                } else {
                   // Optionally, call the defense's own targeting logic if needed
                   // const didAttack = defense.attackNearestEnemy(true); 
                   // if (didAttack) attackingDefenses++;
                } */
                
                // Use the defense's built-in targeting and attack logic
                const didAttack = defense.attackNearestEnemy(true); 
                if (didAttack) {
                    attackingDefenses++;
                }
              }
            }
          });
          
          // Debug log how many defenses are attacking
          if (this.gameState.debug && this.defenses.length > 0) {
            console.log(`${attackingDefenses}/${this.defenses.length} defenses attacking`);
          }
        }
        
        // Find enemy with lowest health for priority targeting
        findLowHealthEnemy(defense) {
          if (!defense || !this.enemies || this.enemies.length === 0) {
            return null;
          }
          
          let lowestHealthEnemy = null;
          let lowestHealth = Infinity;
          
          // Look for low health enemies first - use a wider range
          for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            if (!enemy) continue;
            
            // Force enemy to be active - this fixes the issue with inactive enemies
            enemy.active = true;
            
            // Calculate distance
            const dx = enemy.x - defense.x;
            const dy = enemy.y - defense.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Use a much larger range for targeting low health enemies
            // This helps mages to finish off enemies anywhere on screen
            const extendedRange = defense.range * 1.75; // Increased from 1.5
            
            if (distance <= extendedRange) {
              // Prioritize very low health enemies to ensure kills
              // Count all enemies with less than 5 health as low health
              if (enemy.health <= 5) { // Increased from 3
                // The lower the health, the higher the priority
                const priority = 6 - enemy.health; // Give priority boost to lowest health
                
                if (enemy.health < lowestHealth || 
                   (enemy.health === lowestHealth && distance < defense.range)) {
                  lowestHealthEnemy = enemy;
                  lowestHealth = enemy.health;
                }
              }
            }
          }
          
          // If we found a low health enemy, log it occasionally for debugging
          if (lowestHealthEnemy && Math.random() < 0.05) {
            console.log(`Defense at (${defense.x}, ${defense.y}) found low health enemy with ${lowestHealth.toFixed(1)} HP`);
          }
          
          return lowestHealthEnemy;
        }
        
        // Get closest enemy regardless of range
        getClosestEnemy(defense) {
          if (!defense || !this.enemies || this.enemies.length === 0) {
            return null;
          }
          
          let closestEnemy = null;
          let closestDistance = Infinity;
          
          // Find closest enemy - more aggressive search
          for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            
            // Skip completely invalid enemies
            if (!enemy) continue;
            
            // Skip dead or inactive enemies
            if (enemy.health <= 0 || enemy.destroyed === true || !enemy.active) {
              continue;
            }
            
            // Ensure enemy has valid position
            if (typeof enemy.x !== 'number' || typeof enemy.y !== 'number') {
              // Try to find position in alternative properties
              if (enemy.sprite && typeof enemy.sprite.x === 'number' && typeof enemy.sprite.y === 'number') {
                enemy.x = enemy.sprite.x;
                enemy.y = enemy.sprite.y;
              } else if (enemy.container && typeof enemy.container.x === 'number' && typeof enemy.container.y === 'number') {
                enemy.x = enemy.container.x;
                enemy.y = enemy.container.y;
              } else {
                // Skip enemies without position
                continue;
              }
            }
            
            // Calculate distance
            const dx = enemy.x - defense.x;
            const dy = enemy.y - defense.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if this enemy is a valid target - more permissive type checking
            let canTarget = !defense.targetTypes || 
                           defense.targetTypes.length === 0 || 
                           defense.targetTypes.includes(enemy.type) || 
                           defense.targetTypes.includes('all');
            
            // In desperate situations (few enemies), target anyway
            if (!canTarget && this.enemies.length <= 3) {
              canTarget = true;
            }
            
            // Update closest enemy tracking
            if (canTarget && distance < closestDistance) {
              closestDistance = distance;
              closestEnemy = enemy;
            }
          }
          
          // Only return if within reasonable distance (extended range)
          // Use a larger extended range for better targeting
          const extendedRange = defense.range * 2.0; // Increased from 1.5
          
          if (closestEnemy && closestDistance <= extendedRange) {
            // Log occasionally for debugging
            if (Math.random() < 0.01) { // Reduced logging frequency
              console.log(`Defense at (${defense.x}, ${defense.y}) found closest enemy at distance ${closestDistance.toFixed(1)}px`);
            }
            return closestEnemy;
          }
          
          return null;
        }

        // Add a method to destroy defenses properly
        destroyDefense(defense) {
          // Destroy sprite
          if (defense.sprite) {
            defense.sprite.destroy();
          }
          // Remove from defenses array
          const index = this.defenses.indexOf(defense);
          if (index > -1) {
            this.defenses.splice(index, 1);
          }
          // Destroy range indicator if it exists
          if (defense.rangeIndicator) {
            defense.rangeIndicator.destroy();
          }
        }

        // Toggle the upgrade panel visibility with smooth animations
        toggleUpgradePanel() {
          try {
            if (!this.upgradeSystem) return;
            
            // Get current state
            const isVisible = this.upgradeSystem.uiElements?.panel?.visible || false;
            const panel = this.upgradeSystem.uiElements?.panel;
            
            if (!panel) return;
            
            if (isVisible) {
              // Animate panel sliding out and fading
              this.tweens.add({
                targets: panel,
                x: panel.x + 300, // Slide to the right
                alpha: 0,
                duration: 250,
                ease: 'Power2',
                onComplete: () => {
                  this.upgradeSystem.setUIVisible(false);
                  panel.x -= 300; // Reset position for next show
                  panel.alpha = 1; // Reset alpha for next show
                }
              });
            } else {
              // Show panel first, then animate it sliding in
              this.upgradeSystem.setUIVisible(true);
              panel.x += 300; // Start position (off-screen)
              panel.alpha = 0; // Start transparent
              
              this.tweens.add({
                targets: panel,
                x: panel.x - 300, // Slide to original position
                alpha: 1,
                duration: 250,
                ease: 'Power2'
              });
            }
            
            // Update defense buttons
            this.updateAdvancedDefenseButtons();
            
            console.log(`Upgrade panel ${isVisible ? 'hidden' : 'shown'}`);
          } catch (error) {
            console.error("Error toggling upgrade panel:", error);
          }
        }

        // Toggle skin customization panel
        toggleSkinCustomization(defenderType = null) {
          try {
            if (!this.skinCustomization) return;
            
            // Get current state
            const isVisible = this.skinCustomization.isVisible || false;
            
            if (isVisible) {
              // Hide the skin customization panel
              this.skinCustomization.hide();
            } else {
              // Show the skin customization panel with defender selection
              if (defenderType) {
                this.skinCustomization.show(defenderType);
              } else {
                // Show defender selection menu first
                this.showDefenderSelectionMenu();
              }
            }
            
            console.log(`Skin customization panel ${isVisible ? 'hidden' : 'shown'}`);
          } catch (error) {
            console.error('Error toggling skin customization:', error);
          }
        }
        
        showDefenderSelectionMenu() {
          const centerX = this.cameras.main.width / 2;
          const centerY = this.cameras.main.height / 2;
          
          // Create container for defender selection
          this.defenderSelectionContainer = this.add.container(0, 0);
          this.defenderSelectionContainer.setDepth(9999);
          
          // Background overlay
          const overlay = this.add.rectangle(0, 0, 
            this.cameras.main.width, 
            this.cameras.main.height, 
            0x000000, 0.7);
          overlay.setOrigin(0, 0);
          this.defenderSelectionContainer.add(overlay);
          
          // Main panel
          const panelWidth = 500;
          const panelHeight = 350;
          const mainPanel = this.add.rectangle(centerX, centerY, panelWidth, panelHeight, 0x2a2a2a);
          mainPanel.setStrokeStyle(3, 0x4a4a4a);
          this.defenderSelectionContainer.add(mainPanel);
          
          // Title
          const title = this.add.text(centerX, centerY - 140, 'SELECT DEFENDER TO CUSTOMIZE', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
          });
          title.setOrigin(0.5);
          this.defenderSelectionContainer.add(title);
          
          // Close button
          const closeButton = this.add.rectangle(centerX + 230, centerY - 140, 40, 40, 0xff4444);
          closeButton.setStrokeStyle(2, 0xffffff);
          const closeText = this.add.text(centerX + 230, centerY - 140, 'X', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
          });
          closeText.setOrigin(0.5);
          closeButton.setInteractive({ useHandCursor: true });
          closeButton.on('pointerdown', () => this.hideDefenderSelectionMenu());
          this.defenderSelectionContainer.add([closeButton, closeText]);
          
          // Defender buttons
          const defenders = [
            { type: 'chog', name: 'CHOG Defender', color: 0x0088FF, icon: '🧙‍♂️' },
            { type: 'molandak', name: 'MOLANDAK Guardian', color: 0xFF4400, icon: '🧙‍♀️' },
            { type: 'moyaki', name: 'MOYAKI Warrior', color: 0xFF0000, icon: '⚔️' },
            { type: 'keon', name: 'KEON Champion', color: 0xFF00FF, icon: '🛡️' }
          ];
          
          const buttonWidth = 100;
          const buttonHeight = 80;
          const startX = centerX - (defenders.length * 110) / 2 + 55;
          
          defenders.forEach((defender, index) => {
            const x = startX + (index * 110);
            const y = centerY - 20;
            
            // Defender button
            const button = this.add.rectangle(x, y, buttonWidth, buttonHeight, defender.color);
            button.setStrokeStyle(2, 0xffffff);
            button.setInteractive({ useHandCursor: true });
            
            // Defender icon/image
            let defenderImage;
            const imageKey = `${defender.type}_idle`;
            if (this.textures.exists(imageKey)) {
              defenderImage = this.add.image(x, y - 10, imageKey);
              defenderImage.setDisplaySize(50, 50);
            } else {
              defenderImage = this.add.text(x, y - 10, defender.icon, {
                fontSize: '32px'
              });
              defenderImage.setOrigin(0.5);
            }
            
            // Defender name
            const nameText = this.add.text(x, y + 25, defender.name, {
              fontSize: '10px',
              fontFamily: 'Arial',
              color: '#ffffff',
              align: 'center',
              wordWrap: { width: 90 }
            });
            nameText.setOrigin(0.5);
            
            // Button interaction
            button.on('pointerdown', () => {
              this.hideDefenderSelectionMenu();
              this.skinCustomization.show(defender.type);
            });
            
            button.on('pointerover', () => {
              button.setStrokeStyle(3, 0xffffff);
            });
            
            button.on('pointerout', () => {
              button.setStrokeStyle(2, 0xffffff);
            });
            
            this.defenderSelectionContainer.add([button, defenderImage, nameText]);
          });
        }
        
        hideDefenderSelectionMenu() {
          if (this.defenderSelectionContainer) {
            this.defenderSelectionContainer.destroy();
            this.defenderSelectionContainer = null;
          }
        }

        // Find an enemy within range of a defense
        getEnemyInRange(defense) {
          if (!defense || !this.enemies || this.enemies.length === 0) {
            return null;
          }
          
          let closestEnemy = null;
          let closestDistance = Infinity;
          let weakestEnemy = null;
          let lowestHealth = Infinity;
          
          // Loop through all enemies to find potential targets
          for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            
            // Skip invalid enemies
            if (!enemy || !enemy.active) {
              continue;
            }
            
            // Skip dead or destroyed enemies
            if (enemy.health <= 0 || enemy.destroyed === true) {
              continue;
            }
            
            // Skip enemies already queued for removal
            if (enemy._pendingRemoval === true) {
              continue;
            }
            
            // Calculate distance from defense to enemy
            const dx = enemy.x - defense.x;
            const dy = enemy.y - defense.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if enemy is in range and the defense can target this enemy type
            const inRange = distance <= defense.range * 1.2; // 20% increased range
            if (inRange) {
              // Check if this defense can target this enemy type - be more permissive
              let canTarget = defense.targetTypes.length === 0 || 
                            defense.targetTypes.includes(enemy.type) || 
                            defense.targetTypes.includes('all');
                            
              // In desperate situations (few enemies), target anyway
              if (!canTarget && this.enemies.length <= 2) {
                canTarget = true;
              }
              
              if (canTarget && distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
              }
            }
          }
          
          return closestEnemy;
        }

        // New method to force defenses to attack enemies
        forceDefensesToAttack() {
          // Skip if no defenses or enemies
          if (!this.defenses || !this.enemies || this.defenses.length === 0 || this.enemies.length === 0) {
            return;
          }
          
          // Loop through each defense
          for (let i = 0; i < this.defenses.length; i++) {
            const defense = this.defenses[i];
            if (!defense || !defense.active) continue;
            
            // Skip if defense is on cooldown
            if (defense.cooldownRemaining && defense.cooldownRemaining > 0) {
              continue;
            }
            
            // Force all enemies to be active
            this.enemies.forEach(enemy => {
              if (enemy) {
                enemy.active = true;
              }
            });
            
            // Direct attack - find the closest enemy and attack it
            let closestEnemy = null;
            let closestDistance = Infinity;
            
            // Find closest enemy
            for (let j = 0; j < this.enemies.length; j++) {
              const enemy = this.enemies[j];
              if (!enemy) continue;
              
              // Calculate distance
              const dx = enemy.x - defense.x;
              const dy = enemy.y - defense.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // Use a very generous range for targeting
              const maxRange = 500; // Almost entire screen width
              
              if (distance < closestDistance && distance <= maxRange) {
                closestDistance = distance;
                closestEnemy = enemy;
              }
            }
            
            // If found an enemy, attack it regardless of range
            if (closestEnemy) {
              // Force direct attack regardless of range or type
              if (typeof defense.attack === 'function') {
                defense.attack(closestEnemy);
                
                // Log attack occasionally
                if (Math.random() < 0.05) {
                  console.log(`FORCED attack from ${defense.type} at (${defense.x}, ${defense.y}) on enemy at (${closestEnemy.x}, ${closestEnemy.y})`);
                }
              }
            }
          }
        }

        // CRITICAL FIX: Ultra aggressive direct attack method - highest priority
        superForceDefensesToAttack() {
          if (!this.defenses || !this.enemies || this.defenses.length === 0 || this.enemies.length === 0) {
            return;
          }
          
          // For each defense, directly attack the first enemy
          this.defenses.forEach(defense => {
            // Skip invalid defenses
            if (!defense || !defense.active) return;
            
            // Skip if on cooldown
            if (defense.cooldownRemaining > 0) return;
            
            // Pick ANY enemy to attack, priority to the closest
            let targetEnemy = null;
            let minDistance = Infinity;
            
            // Find ANY valid enemy
            for (let i = 0; i < this.enemies.length; i++) {
              const enemy = this.enemies[i];
              if (!enemy) continue;
              
              // Force enemy to be active - critical fix
              enemy.active = true;
              enemy.visible = true;
              
              // Calculate distance
              const dx = enemy.x - defense.x;
              const dy = enemy.y - defense.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              
              // Update closest enemy
              if (distance < minDistance) {
                minDistance = distance;
                targetEnemy = enemy;
              }
            }
            
            // If we found any enemy, attack it regardless of range
            if (targetEnemy) {
              // Directly modify defense properties to ensure attack works
              defense.cooldownRemaining = 0;
              defense.lastAttackTime = 0;
              
              // Force attack by directly accessing the method
              if (typeof defense.attack === 'function') {
                const success = defense.attack(targetEnemy);
                
                if (success && Math.random() < 0.1) {
                  console.log(`SUPER FORCED attack from ${defense.type} at (${defense.x}, ${defense.y}) to enemy at (${targetEnemy.x}, ${targetEnemy.y})`);
                }
              }
            }
          });
        }

        showDefensePlacementIndicator(pointer, type) {
          try {
            // Get defense cost to check affordability
            const cost = type === 'chog' ? 45 : 
                         type === 'molandak' ? 65 : 
                         type === 'keon' ? 125 : 
                         type === 'moyaki' ? 200 : 0;
            
            // Only allow placement on right side of map
            const canAfford = this.gameState.farmCoins >= cost;
            const validSide = pointer.x >= 200; // Only allow on right side
            
            // Set indicator color based on affordability and placement area
            let color = 0xFF0000; // Default red for invalid
            
            if (validSide) {
              color = canAfford ? 0x00FF00 : 0xFFFF00; // Green if affordable, yellow if valid position but can't afford
            }
            
            // Don't show if clicking in toolbar area
            if (pointer.y > 520) {
              if (this.plantingIndicator) this.plantingIndicator.visible = false;
              if (this.plantingHelpText) this.plantingHelpText.visible = false;
              return;
            }
            
            // Create or update indicator
            if (!this.plantingIndicator) {
              this.plantingIndicator = this.add.rectangle(pointer.x, pointer.y, 40, 40, color, 0.4);
              this.plantingIndicator.setStrokeStyle(2, color);
            } else {
              this.plantingIndicator.x = pointer.x;
              this.plantingIndicator.y = pointer.y;
              this.plantingIndicator.fillColor = color;
              this.plantingIndicator.strokeColor = color;
              this.plantingIndicator.visible = true;
            }
            
            // Set indicator text based on defense type
            let text = "";
            let textColor = "#FFFFFF";
            
            if (!validSide) {
              text = "Place on RIGHT side only";
              textColor = "#FF0000";
            } else if (!canAfford) {
              text = `Need ${cost} coins`;
              textColor = "#FFFF00";
            } else {
              // Set text based on defense type
              if (type === 'chog') {
                text = "ABS Ice Mage (45 coins)";
                textColor = "#00AAFF";
              } else if (type === 'molandak') {
                text = "MON Fire Mage (65 coins)";
                textColor = "#FF4400";
              } else if (type === 'keon') {
                text = "keon (125 coins)";
                textColor = "#FF00FF";
              } else if (type === 'moyaki') {
                text = "moyaki (200 coins)";
                textColor = "#FF0000";
              }
            }
            
            // Update help text
            if (!this.plantingHelpText) {
              this.plantingHelpText = this.add.text(400, 50, text, {
                fontFamily: 'Arial',
                fontSize: '18px',
                color: textColor
              }).setOrigin(0.5);
            } else {
              this.plantingHelpText.setText(text);
              this.plantingHelpText.setColor(textColor);
              this.plantingHelpText.visible = true;
            }
          } catch (error) {
            console.error("Error showing defense placement indicator:", error);
          }
        }

        // Add this new method after the "addHelperFunctions" method
        triggerSpecialAttack() {
          // Ensure we have defenses to work with
          if (!this.defenses || this.defenses.length === 0) {
            return;
          }
          
          // Try to find the closest defense to the pointer
          const pointer = this.input.activePointer;
          let closestDefense = null;
          let closestDistance = 100; // Maximum distance to consider "selected"
          
          // Find closest defense
          for (const defense of this.defenses) {
            if (!defense || !defense.active) continue;
            
            const dx = defense.x - pointer.x;
            const dy = defense.y - pointer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < closestDistance) {
              closestDistance = distance;
              closestDefense = defense;
            }
          }
          
          // If we found a defense close to the cursor, trigger its special attack
          if (closestDefense && typeof closestDefense.performSpecialAttack === 'function') {
            const result = closestDefense.performSpecialAttack();
            
            // Provide feedback if special attack was used
            if (result) {
              const color = closestDefense.type === 'chog' ? 0x00FFFF : 0xFF6600;
              const text = closestDefense.type === 'chog' ? 'ICE STORM!' : 'FIRE BLAST!';
              
              // Show floating text above the mage
              this.showFloatingText(closestDefense.x, closestDefense.y - 60, text, color);
              
              // Add screen shake for dramatic effect
              this.cameras.main.shake(300, 0.005);
            }
          } else {
            // Inform player how to use special attacks
            this.showFloatingText(
              this.input.activePointer.x,
              this.input.activePointer.y - 30,
              "Move cursor near a mage with SPECIAL ready!",
              0xFFFFFF
            );
          }
        }

        setToolMode(mode) {
          try {
            console.log(`Setting tool mode to: ${mode}`);
            
            // Update tool mode
            this.toolMode = mode;
            
            // Hide range indicators
            this.hideDefenseRange();
            
            // Cancel any existing placement preview
            if (this.placementPreview) {
              this.placementPreview.destroy();
              this.placementPreview = null;
            }
            
            // Hide any existing placement circles
            if (this.placementCircle) {
              this.placementCircle.setVisible(false);
            }
            
            // Remove any existing pointermove listener
            if (this.pointerMoveListener) {
              this.input.off('pointermove', this.pointerMoveListener);
              this.pointerMoveListener = null;
            }
            
            // Reset placement state if switching to attack or plant mode
            if (mode === 'attack' || mode === 'plant') {
              this.pendingDefensePlacement = false;
              
              // Destroy defense preview
              if (this.defensePreview) {
                this.defensePreview.destroy();
                this.defensePreview = null;
              }
            }
            
            // Start showing placement preview if planting or placing defenses
            if (mode === 'plant' || this.isDefenseMode(mode)) {
              // For defenses, show the range circle that follows the cursor
              if (this.isDefenseMode(mode)) {
                let range = 200; // Default range
                let color = 0x0088FF; // Default color
                let spriteKey = null; // Key for preview sprite
                
                // Set range and color based on defense type
                if (mode === 'chog') {
                  range = 250;
                  color = 0x0088FF; // Blue for ABS
                  spriteKey = 'ABS_idle';
                } else if (mode === 'molandak') {
                  range = 200;
                  color = 0xFF4400; // Red for MON
                  spriteKey = 'MON_idle';
                } else if (mode === 'keon') {
                  range = 300;
                  color = 0xFF00FF; // Purple for keon
                  spriteKey = 'keon_idle'; // Use keon sprite key
                } else if (mode === 'moyaki') {
                  range = 350;
                  color = 0xFF0000; // Red for moyaki
                  spriteKey = 'moyaki_idle'; // Use moyaki sprite key
                }
                
                // Create circle if it doesn't exist
                if (!this.placementCircle) {
                  this.placementCircle = this.add.circle(0, 0, range, 0xFFFFFF, 0.2);
                  this.placementCircle.setStrokeStyle(2, color);
                } else {
                  // Update existing circle
                  this.placementCircle.setRadius(range);
                  this.placementCircle.setStrokeStyle(2, color);
                }
                
                // Make sure the circle is visible
                this.placementCircle.setVisible(true);
                
                // Get current pointer position and update placement circle
                const pointer = this.input.activePointer;
                this.placementCircle.x = pointer.x;
                this.placementCircle.y = pointer.y;
                
                // Create a new pointermove listener
                this.pointerMoveListener = (pointer) => {
                  if (this.placementCircle && (this.isDefenseMode(this.toolMode) || this.pendingDefensePlacement)) {
                    this.placementCircle.x = pointer.x;
                    this.placementCircle.y = pointer.y;
                  }
                };
                
                // Add new listener
                this.input.on('pointermove', this.pointerMoveListener);
              }
            }
            
            // Update button highlighting in toolbar
            if (this.toolbarButtons) {
              Object.keys(this.toolbarButtons).forEach(key => {
                const isActive = key === mode;
                if (this.toolbarButtons[key]) {
                  this.toolbarButtons[key].fillColor = this.getToolColor(key, isActive);
                }
              });
            }
            
            // Show info text based on mode
            let infoText = "";
            let textColor = 0xFFFFFF;
            
            switch (mode) {
              case 'attack':
                infoText = "ATTACK MODE: Click on enemies";
                textColor = 0xFF4400;
                break;
              case 'plant':
                infoText = "PLANT MODE: Plant crops (5 coins)";
                textColor = 0x00FF00;
                break;
              case 'chog':
                infoText = "ABS ICE MAGE: Click to place (45 coins)";
                textColor = 0x0088FF;
                break;
              case 'molandak':
                infoText = "MON FIRE MAGE: Click to place (65 coins)";
                textColor = 0xFF8800;
                break;
              case 'keon':
                infoText = "keon: Click to place (125 coins)";
                textColor = 0xFF00FF;
                break;
              case 'moyaki':
                infoText = "moyaki: Click to place (200 coins)";
                textColor = 0xFF0000;
                break;
            }
            
            // Show mode change message in center of screen
            this.showFloatingText(400, 300, infoText, textColor);
            
            console.log(`Tool mode set to: ${mode}`);
          } catch (error) {
            console.error("Error setting tool mode:", error);
          }
        }

        // Helper method to check if a mode is a defense mode
        isDefenseMode(mode) {
          return ['chog', 'molandak', 'keon', 'moyaki'].includes(mode);
        }

        // Get color for tool buttons
        getToolColor(tool, isActive) {
          const colors = {
            attack: 0x333333, // Darker base for inactive
            plant: 0x333333,
            chog: 0x333333,
            molandak: 0x333333,
            keon: 0x333333, // Add keon base color
            moyaki: 0x333333, // Add moyaki base color
            upgrade: 0x555500 // Keep upgrade color distinct
          };
          
          const activeColors = {
            attack: 0xFF4400, // Use defined active colors
            plant: 0x00AA00,
            chog: 0x0088FF,
            molandak: 0xFF8800,
            keon: 0xFF00FF, // Active keon color
            moyaki: 0xCC0000, // Active moyaki color
            upgrade: 0xFFFF00 // Active upgrade color
          };
          
          // Find the button element to apply tinting if needed
          const buttonElement = this.toolbarButtons ? this.toolbarButtons[tool] : null;
          
          if (buttonElement) {
              // Directly set fill color based on active state
              buttonElement.fillColor = isActive ? (activeColors[tool] || 0xFFFFFF) : (colors[tool] || 0x333333);
          }

          // Return the color code (though direct manipulation above might be better)
          return isActive ? (activeColors[tool] || 0xFFFFFF) : (colors[tool] || 0x333333);
        }

        placeDefense(x, y, type) {
          try {
            console.log(`Placing defense: ${type} at ${x}, ${y}`);
            
            // Only allow placement on right side
            if (x < 200) {
              this.showFloatingText(x, y, "Place on RIGHT side only!", 0xFF0000);
              return false;
            }
            
            // Check defense costs
            const cost = type === 'chog' ? 25 : 
                         type === 'molandak' ? 50 : 
                         type === 'keon' ? 150 : // Add keon cost
                         type === 'moyaki' ? 80 : 0; // Add moyaki cost
            
            // Check if player has enough coins
            if (this.gameState.farmCoins < cost) {
              this.showFloatingText(x, y, `Need ${cost} coins!`, 0xFF0000);
              return false;
            }
            
            // Add the defense
            if (!this.defenses) {
              this.defenses = [];
            }
            
            // Import Defense class if available
            const DefenseClass = this.registry.get('DefenseClass');
            
            // Create the defense using the class or fallback to basic rectangle
            let defense;
            
            if (DefenseClass) {
              // Get the appropriate skin for this defender type
              const skinKey = this.skinCustomization ? this.skinCustomization.getSkinForDefender(type) : `${type}_idle`;
              console.log(`[DEFENSE DEBUG 2] Creating defense ${type} with skin:`, skinKey);
              console.log(`[DEFENSE DEBUG 2] SkinCustomization available:`, !!this.skinCustomization);
              
              // Use SkillDefender if skillTreeManager is available, otherwise use regular Defense
              if (window.skillTreeManager) {
                defense = new SkillDefender(this, type, x, y, window.skillTreeManager, skinKey);
              } else {
                defense = new DefenseClass(this, type, x, y, skinKey);
              }
            } else {
              // Fallback if DefenseClass isn't available
              defense = {
                type,
                x,
                y,
                active: true,
                range: type === 'chog' ? 250 : 
                       type === 'molandak' ? 200 : 
                       type === 'keon' ? 300 : 
                       type === 'moyaki' ? 350 : 200,
                sprite: this.add.rectangle(x, y, 40, 40, 
                  type === 'chog' ? 0x0088FF : 
                  type === 'molandak' ? 0xFF4400 : 
                  type === 'keon' ? 0xFF00FF : 
                  type === 'moyaki' ? 0xFF0000 : 0x666666),
                // Add forceDestroy method for fallback defenses
                forceDestroy() {
                  this.active = false;
                  if (this.sprite && typeof this.sprite.destroy === 'function') this.sprite.destroy();
                  if (this.label && typeof this.label.destroy === 'function') this.label.destroy();
                },
                destroy() {
                  this.forceDestroy();
                }
              };
              
              // Add defense type text
              const emojiMap = {
                'chog': '🧙‍♂️',
                'molandak': '🧙‍♀️',
                'keon': '🧙',
                'moyaki': '💣'
              };
              
              const emoji = emojiMap[type] || '❓';
              defense.label = this.add.text(x, y, emoji, {
                fontSize: '24px',
                fontFamily: 'Arial'
              }).setOrigin(0.5);
            }
            
            // Add to defenses array
            this.defenses.push(defense);
            
            // Deduct coins
            this.updateFarmCoins(-cost);
            
            // Show confirmation text
            const defenseNames = {
              'chog': 'ABS Ice Mage',
              'molandak': 'MON Fire Mage',
              'keon': 'keon',
              'moyaki': 'moyaki'
            };
            
            const defenseName = defenseNames[type] || type;
            this.showFloatingText(x, y - 50, `${defenseName} placed!`, 0x00FF00);
            
            console.log(`Placed ${type} defense at ${x}, ${y}`);
            
            // Reset the tool mode to attack
            if (this.pendingDefensePlacement) {
              this.pendingDefensePlacement = false;
              
              // Hide placement indicators
              if (this.plantingIndicator) {
                this.plantingIndicator.visible = false;
              }
              
              if (this.plantingHelpText) {
                this.plantingHelpText.visible = false;
              }
              
              if (this.placementCircle) {
                this.placementCircle.visible = false;
              }
            }
            
            // Play defense placed sound
            if (this.soundManager) {
              this.soundManager.play('defense_placed');
            }
            
            // Reset tool mode to attack after placing
            this.setToolMode('attack');
            
            return true;
          } catch (error) {
            console.error("Error placing defense:", error);
            return false;
          }
        }

        verifyTextureLoading() {
          try {
            // Log all available textures for debugging
            if (this.textures) {
              const textureKeys = Object.keys(this.textures.list);
              console.log(`Available textures (${textureKeys.length}):`, textureKeys.join(', '));
            }
          } catch (error) {
            console.error("Error verifying textures:", error);
          }
        }
        
        // Create fallback textures for advanced defenses
        createAdvancedDefenseTextures() {
          try {
            console.log("Checking for advanced defense textures");
            
            // Only create fallback textures if the actual textures aren't loaded
            // keon textures
            if (!this.textures.exists('keon_idle')) {
              console.log("Creating fallback keon_idle texture");
              const keonGraphics = this.make.graphics();
              keonGraphics.fillStyle(0xFF00FF, 1);
              keonGraphics.fillCircle(20, 20, 20);
              keonGraphics.fillStyle(0x9900CC, 1);
              keonGraphics.fillTriangle(10, 20, 30, 20, 20, 0);
              keonGraphics.generateTexture('keon_idle', 40, 40);
            }
            
            if (!this.textures.exists('keon_attack')) {
              console.log("Creating fallback keon_attack texture");
              if (this.textures.exists('keon_idle')) {
                // Replace addKey with the correct way to reuse a texture
                const idleTexture = this.textures.get('keon_idle');
                this.textures.addImage('keon_attack', idleTexture.getSourceImage());
              } else {
                const keonGraphics = this.make.graphics();
                keonGraphics.fillStyle(0xFF00FF, 1);
                keonGraphics.fillCircle(20, 20, 18);
                keonGraphics.fillStyle(0x9900CC, 1);
                keonGraphics.fillTriangle(10, 20, 30, 20, 20, 0);
                keonGraphics.generateTexture('keon_attack', 40, 40);
              }
            }
            
            // Create moyaki textures
            if (!this.textures.exists('moyaki_idle')) {
              console.log("Creating fallback moyaki_idle texture");
              const moyakiGraphics = this.make.graphics();
              moyakiGraphics.fillStyle(0x666666, 1);
              moyakiGraphics.fillRect(10, 20, 20, 15);
              moyakiGraphics.fillStyle(0xFF0000, 1);
              moyakiGraphics.fillRect(18, 10, 15, 10);
              moyakiGraphics.generateTexture('moyaki_idle', 40, 40);
            }
            
            if (!this.textures.exists('moyaki_attack')) {
              console.log("Creating fallback moyaki_attack texture");
              if (this.textures.exists('moyaki_idle')) {
                // Replace addKey with the correct way to reuse a texture
                const idleTexture = this.textures.get('moyaki_idle');
                this.textures.addImage('moyaki_attack', idleTexture.getSourceImage());
              } else {
                const moyakiGraphics = this.make.graphics();
                moyakiGraphics.fillStyle(0x666666, 1);
                moyakiGraphics.fillRect(10, 20, 20, 15);
                moyakiGraphics.fillStyle(0xFF0000, 1);
                moyakiGraphics.fillRect(18, 10, 15, 10);
                moyakiGraphics.generateTexture('moyaki_attack', 40, 40);
              }
            }
            
            console.log("Defense textures verified successfully");
          } catch (error) {
            console.error("Error creating fallback textures:", error);
          }
        }

        // Clear any orphaned wave indicator texts that might be stuck on screen
        clearOrphanedWaveIndicators() {
          try {
            // Find all text objects that contain wave indicator patterns
            const allChildren = this.children.list;
            const orphanedIndicators = allChildren.filter(child => {
              return child && 
                     child.type === 'Text' && 
                     child.text && 
                     (child.text.includes('BOSS W') || 
                      child.text.includes('BOSS') ||
                      /^W\d+$/.test(child.text) || // Matches W1, W2, W3, W4, etc.
                      /^BOSS W\d+$/.test(child.text)); // Matches BOSS W5, BOSS W10, etc.
            });
            
            if (orphanedIndicators.length > 0) {
              console.log(`Found ${orphanedIndicators.length} orphaned wave indicators, destroying them`);
              orphanedIndicators.forEach(indicator => {
                try {
                  console.log(`Destroying orphaned wave indicator: "${indicator.text}"`);
                  indicator.destroy();
                } catch (error) {
                  console.warn('Error destroying orphaned wave indicator:', error);
                }
              });
            }
          } catch (error) {
            console.error('Error clearing orphaned wave indicators:', error);
          }
        }

        // Display large wave start text animation in the center of the screen
        showWaveStartText(waveNumber) {
          try {
            // Clean up any existing wave text to prevent duplicates
            if (this._waveStartText) {
              if (this._waveStartText.text) this._waveStartText.text.destroy();
              if (this._waveStartText.bg) this._waveStartText.bg.destroy();
              this._waveStartText = null;
            }
            
            // Create a semi-transparent background for better contrast
            const textBg = this.add.rectangle(400, 200, 400, 80, 0x000000, 0.5);
            textBg.setDepth(999);
            
            // Create wave text with consistent styling
            const waveText = this.add.text(400, 200, `WAVE ${waveNumber}`, {
              fontFamily: 'Arial, sans-serif',
              fontSize: '36px',
              color: '#FFFFFF',
              stroke: '#000000',
              strokeThickness: 6,
              align: 'center',
              shadow: {
                offsetX: 2,
                offsetY: 2,
                color: '#000000',
                blur: 3
              }
            }).setOrigin(0.5);
            waveText.setDepth(1000);
            
            // Store references to cleanup later
            this._waveStartText = {
              text: waveText,
              bg: textBg
            };
            
            // Animate in with scale
            waveText.setScale(0.5);
            this.tweens.add({
              targets: waveText,
              scale: 1,
              duration: 500,
              ease: 'Back.easeOut'
            });
            
            // Auto destroy after a fixed time
            this.time.delayedCall(1400, () => {
              if (this._waveStartText) {
                if (this._waveStartText.text) {
                  this.tweens.add({
                    targets: this._waveStartText.text,
                    alpha: 0,
                    y: 150,
                    duration: 300,
                    onComplete: () => {
                      if (this._waveStartText && this._waveStartText.text) {
                        this._waveStartText.text.destroy();
                      }
                    }
                  });
                }
                
                if (this._waveStartText.bg) {
                  this.tweens.add({
                    targets: this._waveStartText.bg,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => {
                      if (this._waveStartText && this._waveStartText.bg) {
                        this._waveStartText.bg.destroy();
                      }
                    }
                  });
                }
                
                this._waveStartText = null;
              }
            });
            
            // Add additional flair - particles or effect if supported
            if (this.particles) {
              const emitter = this.particles.createEmitter({
                x: 400,
                y: 300,
                speed: { min: -100, max: 100 },
                scale: { start: 0.5, end: 0 },
                blendMode: 'ADD',
                lifespan: 1000,
                quantity: 20
              });
              
              // Stop and destroy after a short time
              this.time.delayedCall(2000, () => {
                emitter.stop();
                this.time.delayedCall(1000, () => emitter.remove());
              });
            }
            
          } catch (error) {
            console.error("Error showing wave start text:", error);
          }
        }

        // Update and process crops - ensure they are harvestable
        updateCrops() {
          try {
            // Skip if crops object doesn't exist or is empty
            if (!this.crops || Object.keys(this.crops).length === 0) {
              return;
            }
            

            
            // Process each crop
            Object.values(this.crops).forEach(crop => {
              if (!crop || !crop.isActive) return;
              
              // Call crop's update method if it exists
              if (typeof crop.update === 'function') {
                crop.update();
              }
              
              // CRITICAL FIX: Make sure harvestable crops respond to clicks
              if (crop.isHarvestable && crop.setInteractive && !crop.input) {
                crop.setInteractive({ useHandCursor: true });
                
                // Re-bind pointerdown event if it was lost
                crop.on('pointerdown', () => {
                  if (crop.isHarvestable) {
                    // Ensure we directly call the harvest method with proper this context
                    crop.harvest();
                    
                    // Show floating text as additional feedback
                    const yieldAmount = crop.calculateYield ? crop.calculateYield() : crop.value || 2;
                    this.showFloatingText(crop.x, crop.y, `+${yieldAmount}`, 0xFFFF00);
                    
                    console.log(`Manually harvested crop at ${crop.x},${crop.y} for ${yieldAmount} coins`);
                  }
                });
              }
              
              // Make sure the harvestable indicator is visible
              if (crop.isHarvestable && crop.harvestIndicator) {
                crop.harvestIndicator.setVisible(true);
              }
              
              // Debug: randomly log crop status
              if (Math.random() < 0.001) {
                console.log(`Crop at ${crop.x},${crop.y}: Active=${crop.isActive}, Harvestable=${crop.isHarvestable}, GrowthProgress=${crop.growthProgress}/${crop.maxGrowth}`);
              }
            });
          } catch (error) {
            console.error("Error updating crops:", error);
          }
        }

        // Update defense button visibility based on unlocks
        updateAdvancedDefenseButtons() {
          if (!this.upgradeSystem || !this.toolbarButtons) { // Add check for toolbarButtons
            console.log("Upgrade system or toolbar buttons not ready for update.");
            return;
          }
          
          try {
            // Update keon button
            if (this.toolbarButtons.keon) {
              const keonVisible = this.upgradeSystem.isDefenseUnlocked('keon');
              this.toolbarButtons.keon.visible = keonVisible;
              
              // Use stored references
              if (this.toolbarButtons.keonImage) this.toolbarButtons.keonImage.visible = keonVisible;
              if (this.toolbarButtons.keonCostText) this.toolbarButtons.keonCostText.visible = keonVisible;
              if (this.toolbarButtons.keonHover) this.toolbarButtons.keonHover.visible = keonVisible;
              
              // Show notification when first unlocked
              if (keonVisible && !this.keonUnlockNotified) {
                this.showFloatingText(400, 300, "keon Defense Unlocked!", 0xFF00FF);
                this.keonUnlockNotified = true;
              }
            }
            
            // Update moyaki button
            if (this.toolbarButtons.moyaki) {
              const moyakiVisible = this.upgradeSystem.isDefenseUnlocked('moyaki');
              this.toolbarButtons.moyaki.visible = moyakiVisible;
              
              // Use stored references
              if (this.toolbarButtons.moyakiImage) this.toolbarButtons.moyakiImage.visible = moyakiVisible;
              if (this.toolbarButtons.moyakiCostText) this.toolbarButtons.moyakiCostText.visible = moyakiVisible;
              if (this.toolbarButtons.moyakiHover) this.toolbarButtons.moyakiHover.visible = moyakiVisible;
              
              // Show notification when first unlocked
              if (moyakiVisible && !this.moyakiUnlockNotified) {
                this.showFloatingText(400, 300, "moyaki Defense Unlocked!", 0xFF0000);
                this.moyakiUnlockNotified = true;
              }
            }
          } catch (error) {
            console.error("Error updating advanced defense buttons:", error);
          }
        }

        createParticleAnimations() {
          try {
            // Fire+Sparks animation
            this.anims.create({
              key: 'fire_sparks_anim',
              frames: this.anims.generateFrameNumbers('fire_particle', { start: 0, end: 7 }),
              frameRate: 12,
              repeat: -1
            });
            
            // Rocket Fire animation
            this.anims.create({
              key: 'rocket_fire_anim',
              frames: this.anims.generateFrameNumbers('rocket_fire', { start: 0, end: 7 }),
              frameRate: 12,
              repeat: -1
            });
            
            console.log('Particle animations created successfully');
          } catch (error) {
            console.error('Error creating particle animations:', error);
          }
        }

        createMagicAura() {
          // ... existing code ...
        }
        
        // Create hit effect when projectile hits target
        createHitEffect(x, y, defenseType) {
          try {
            if (!this || !this.add) return;
            
            // Determine effect color based on defense type
            let color = 0xff0000;
            let particleTexture = 'pixel';
            
            switch (defenseType) {
              case 'ABS': // Ice Mage
                color = 0x66ccff;
                break;
              case 'MON': // Fire Mage
                color = 0xff6600;
                break;
              case 'keon':
                color = 0xff00ff;
                break;
              case 'moyaki':
                color = 0xff0000;
                break;
            }
            
            // Create impact particle
            const particles = this.add.particles(x, y, particleTexture, {
              speed: { min: 50, max: 150 },
              scale: { start: 1, end: 0 },
              tint: color,
              blendMode: 'ADD',
              lifespan: 300,
              quantity: 15
            });
            
            // Clean up after animation completes
            this.time.delayedCall(300, () => {
              particles.destroy();
            });
          } catch (error) {
            console.error("Error creating hit effect:", error);
          }
        }
        
        createCombatAura() {
          // ... existing code ...
        }
        
        // Clean up resources when scene is shutdown or destroyed
        shutdown() {
          try {
            console.log("GameScene shutting down, cleaning up resources");
            
            // Clean up wave check interval
            if (this.waveCheckInterval) {
              this.waveCheckInterval.remove();
              this.waveCheckInterval = null;
            }
            
            // Clean up any other timers or events
            if (this.spawnTimer) {
              this.spawnTimer.remove();
              this.spawnTimer = null;
            }
            
            if (this.spawnEvent) {
              this.spawnEvent.remove();
              this.spawnEvent = null;
            }
            
            // Clean up pointer event listeners
            if (this.pointerMoveListener) {
              this.input.off('pointermove', this.pointerMoveListener);
              this.pointerMoveListener = null;
            }
            
            // Remove any placement UI elements
            if (this.placementCircle) {
              this.placementCircle.destroy();
              this.placementCircle = null;
            }
            
            if (this.placementPreview) {
              this.placementPreview.destroy();
              this.placementPreview = null;
            }
            
            if (this.defensePreview) {
              this.defensePreview.destroy();
              this.defensePreview = null;
            }
            
            // Clean up sound manager
            if (this.soundManager) {
              this.soundManager.destroy();
            }
            
            console.log("GameScene resources cleaned up");
          } catch (error) {
            console.error("Error in shutdown method:", error);
          }
          
          // Destroy VolumeControls UI if it exists
          if (this.volumeControls) {
            this.volumeControls.destroy();
            this.volumeControls = null;
          }
        }

        visualizePath() {
          try {
            if (!this.gameState?.path?.points || this.gameState.path.points.length < 2) {
              console.warn("No valid path to visualize");
              return;
            }
            
            // Create a graphics object to visualize the path
            const pathGraphics = this.add.graphics();
            pathGraphics.lineStyle(3, 0xFFFF00, 0.5);
            
            // Draw lines between each point
            const points = this.gameState.path.points;
            pathGraphics.moveTo(points[0].x, points[0].y);
            
            // Connect all points with lines
            for (let i = 1; i < points.length; i++) {
              pathGraphics.lineTo(points[i].x, points[i].y);
            }
            
            pathGraphics.strokePath();
            
            // Add markers at each point
            points.forEach((point, index) => {
              const marker = this.add.circle(point.x, point.y, 8, 0xFFFF00, 0.7);
              marker.setStrokeStyle(2, 0x000000);
              
              // Add label for debug
              const label = this.add.text(point.x, point.y - 20, `${index}`, {
                fontSize: '12px',
                color: '#FFFFFF',
                backgroundColor: '#000000'
              }).setOrigin(0.5);
              
              // Make the visualization temporary
              this.time.delayedCall(10000, () => {
                marker.destroy();
                label.destroy();
              });
            });
            
            // Make the path visualization temporary
            this.time.delayedCall(10000, () => {
              pathGraphics.destroy();
            });
            
            console.log("Path visualization created");
          } catch (error) {
            console.error("Error creating path visualization:", error);
          }
        }

        // Add this method to handle enemies that reach the end of the path
        enemyReachedEnd(enemy) {
          if (!enemy || !this.gameState || !this.gameState.isActive) return;
          
          // Prevent multiple life losses from the same enemy
          if (enemy.hasReachedEnd) {
            return;
          }
          enemy.hasReachedEnd = true;

          console.log(`Enemy ${enemy.id} reached the farm - lives: ${this.gameState.lives} -> ${this.gameState.lives - 1}`);

          // Reduce lives
          this.gameState.lives--;
          
          // Update lives display
          if (typeof this.updateLivesText === 'function') {
            this.updateLivesText();
          }

          // Show warning text
          if (typeof this.showFloatingText === 'function') {
            this.showFloatingText(50, 300, 'Farm Invaded! -1 Life', 0xFF0000);
          }

          // Add screen shake when a life is lost
          this.cameras.main.shake(250, 0.008);

          // Hide health bar immediately before cleanup
          if (typeof enemy.hideHealthBar === 'function') {
            enemy.hideHealthBar();
          }

          // Remove enemy from enemies array immediately
          const enemyIndex = this.enemies.indexOf(enemy);
          if (enemyIndex > -1) {
            this.enemies.splice(enemyIndex, 1);
          }

          // Destroy the enemy
          if (typeof enemy.destroy === 'function') {
            enemy.destroy();
          }

          // Play enemy escaped sound
          if (this.soundManager) {
            this.soundManager.play('enemy_escaped_alarm', { volume: 0.8 });
          }

          // Check for game over AFTER enemy cleanup
          if (this.gameState.lives <= 0) {
            console.log("Game over! No lives remaining.");
            // Delay game over slightly to allow visual feedback
            this.time.delayedCall(500, () => {
              if (typeof this.endGame === 'function') {
                this.endGame(false);
              }
            });
          }
        }

        // Add endGame function to handle game over state
        endGame(victory = false) {
          try {
            console.log(`Game ended with ${victory ? 'victory' : 'defeat'}`);

            // --- CAPTURE STATS BEFORE CLEANUP ---
            const finalScore = this.gameState.score || 0;
            const finalCoins = this.gameState.farmCoins || 0;
            const completedWaves = Math.max(0, this.gameState.wave - 1);

            // Set game to inactive
            this.gameState.isActive = false;

            // Emit game end event
            const onGameEvent = this.registry.get('onGameEvent');
            if (typeof onGameEvent === 'function') {
              if (victory) {
                onGameEvent('gameWon', finalScore);
              } else {
                onGameEvent('gameOver', finalScore);
              }
            }

            // IMPORTANT: Immediately clean up all game objects (full cleanup on game end)
            this.cleanupCurrentGame(true);

            // Add screen shake on game end - more intense for game over
            this.cameras.main.shake(victory ? 400 : 600, victory ? 0.006 : 0.012);

            // Create overlay to dim the background
            const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
            overlay.setDepth(1000);

            // Calculate final stats (Already captured above)
            // const coinsEarned = finalCoins; // Use captured value

            // Add game over text with dramatic entrance animation
            const resultText = victory ? 'Victory!' : 'Game Over';
            const gameOverText = this.add.text(400, 200, resultText, {
              fontFamily: 'Arial Black, Impact, sans-serif',
              fontSize: '64px',
              color: victory ? '#00FF00' : '#FF0000',
              stroke: '#000000',
              strokeThickness: 6,
              shadow: {
                offsetX: 3,
                offsetY: 3,
                color: '#000000',
                blur: 5
              }
            }).setOrigin(0.5);
            gameOverText.setDepth(2001);
            
            // Animate game over text with dramatic entrance
            gameOverText.setScale(0);
            gameOverText.setAlpha(0);
            this.tweens.add({
              targets: gameOverText,
              scale: { from: 0, to: 1.2 },
              alpha: { from: 0, to: 1 },
              duration: 600,
              ease: 'Back.easeOut',
              onComplete: () => {
                // Slight bounce effect
                this.tweens.add({
                  targets: gameOverText,
                  scale: 1,
                  duration: 200,
                  ease: 'Power2'
                });
              }
            });

            // Show statistics with staggered entrance animations
            const scoreText = this.add.text(400, 280, `Score: ${finalScore}`, {
              fontFamily: 'Arial',
              fontSize: '32px',
              color: '#FFFFFF',
              stroke: '#000000',
              strokeThickness: 3
            }).setOrigin(0.5);
            scoreText.setDepth(2001);
            scoreText.setAlpha(0);
            scoreText.setY(scoreText.y + 20);

            const wavesText = this.add.text(400, 330, `Waves: ${completedWaves}`, {
              fontFamily: 'Arial',
              fontSize: '28px',
              color: '#FFFFFF',
              stroke: '#000000',
              strokeThickness: 3
            }).setOrigin(0.5);
            wavesText.setDepth(2001);
            wavesText.setAlpha(0);
            wavesText.setY(wavesText.y + 20);

            const coinsText = this.add.text(400, 380, `Coins: ${finalCoins}`, {
              fontFamily: 'Arial',
              fontSize: '28px',
              color: '#FFFF00',
              stroke: '#000000',
              strokeThickness: 3
            }).setOrigin(0.5);
            coinsText.setDepth(2001);
            coinsText.setAlpha(0);
            coinsText.setY(coinsText.y + 20);
            
            // Animate statistics with staggered entrance
            this.tweens.add({
              targets: scoreText,
              alpha: 1,
              y: scoreText.y - 20,
              duration: 400,
              ease: 'Power2',
              delay: 800
            });
            
            this.tweens.add({
              targets: wavesText,
              alpha: 1,
              y: wavesText.y - 20,
              duration: 400,
              ease: 'Power2',
              delay: 1000
            });
            
            this.tweens.add({
              targets: coinsText,
              alpha: 1,
              y: coinsText.y - 20,
              duration: 400,
              ease: 'Power2',
              delay: 1200
            });

            // Create score submission button with proper styling and entrance animation
            const buttonWidth = 220;
            const buttonHeight = 60;
            const submitButton = this.add.rectangle(400, 450, buttonWidth, buttonHeight, 0x6B46C1, 1);
            submitButton.setStrokeStyle(4, 0x553C9A);
            submitButton.setDepth(2001);
            submitButton.setAlpha(0);
            submitButton.setScale(0.8);

            const submitText = this.add.text(400, 450, 'Submit Score', {
              fontFamily: 'Arial',
              fontSize: '24px',
              color: '#FFFFFF',
              stroke: '#000000',
              strokeThickness: 1
            }).setOrigin(0.5);
            submitText.setDepth(2002);
            submitText.setAlpha(0);
            submitText.setScale(0.8);

            // Create restart button with proper styling and entrance animation
            const restartButton = this.add.rectangle(400, 530, buttonWidth, buttonHeight, 0x4CAF50, 1);
            restartButton.setStrokeStyle(4, 0x45A049);
            restartButton.setDepth(2001);
            restartButton.setAlpha(0);
            restartButton.setScale(0.8);

            const restartText = this.add.text(400, 530, 'Play Again', {
              fontFamily: 'Arial',
              fontSize: '28px',
              color: '#FFFFFF',
              stroke: '#000000',
              strokeThickness: 1
            }).setOrigin(0.5);
            restartText.setDepth(2002);
            restartText.setAlpha(0);
            restartText.setScale(0.8);
            
            // Animate buttons with staggered entrance
            this.tweens.add({
              targets: [submitButton, submitText],
              alpha: 1,
              scale: 1,
              duration: 300,
              ease: 'Back.easeOut',
              delay: 1500
            });
            
            this.tweens.add({
              targets: [restartButton, restartText],
              alpha: 1,
              scale: 1,
              duration: 300,
              ease: 'Back.easeOut',
              delay: 1700
            });

            // Add submit button hover effect and interaction
            submitButton.setInteractive({ useHandCursor: true })
              .on('pointerover', () => {
                if (!this.isSubmittingScore) {
                  submitButton.fillColor = 0x553C9A;
                  this.tweens.add({ targets: submitButton, scale: 1.05, duration: 100 });
                  this.input.setDefaultCursor('pointer');
                }
              })
              .on('pointerout', () => {
                if (!this.isSubmittingScore) {
                  submitButton.fillColor = 0x6B46C1;
                  this.tweens.add({ targets: submitButton, scale: 1.0, duration: 100 });
                  this.input.setDefaultCursor('default');
                }
              })
              .on('pointerdown', () => {
                // Prevent multiple submissions
                if (this.isSubmittingScore) {
                  return;
                }

                // Play click sound if available
                if (this.soundManager) {
                  this.soundManager.play('ui_click_confirm', { volume: 0.8 }); 
                }

                // Add quick scale down animation on click
                this.tweens.add({
                  targets: submitButton,
                  scale: 0.95,
                  duration: 80,
                  yoyo: true,
                  onComplete: () => {
                    // Submit score via API and handle UI updates
                    this.submitScore(finalScore, completedWaves, submitButton, submitText);
                  }
                });
              });

            // Add hover effect for restart button
            restartButton.setInteractive({ useHandCursor: true })
              .on('pointerover', () => {
                restartButton.fillColor = 0x45A049;
                // Add slight scale effect on hover
                this.tweens.add({ targets: restartButton, scale: 1.05, duration: 100 });
                this.input.setDefaultCursor('pointer');
              })
              .on('pointerout', () => {
                restartButton.fillColor = 0x4CAF50;
                // Reset scale
                 this.tweens.add({ targets: restartButton, scale: 1.0, duration: 100 });
                this.input.setDefaultCursor('default');
              })
              .on('pointerdown', () => {
                // Play click sound if available
                if (this.soundManager) {
                    // Use a confirmation sound - ensure this key exists
                  this.soundManager.play('ui_click_confirm', { volume: 0.8 }); 
                }

                // Add quick scale down animation on click
                this.tweens.add({
                  targets: restartButton,
                  scale: 0.95,
                  duration: 80,
                  yoyo: true, // Go back to original scale
                  onComplete: () => {
                      // Clean up game over UI elements BEFORE starting new game
                      overlay.destroy();
                      gameOverText.destroy();
                      scoreText.destroy();
                      wavesText.destroy();
                      coinsText.destroy();
                      submitButton.destroy();
                      submitText.destroy();
                      restartButton.destroy();
                      restartText.destroy();

                      // Reset cursor
                      this.input.setDefaultCursor('default');

                      // Start a new game - cleanup will happen inside startGame
                      this.startGame();
                  }
                });
              });

            // Play victory or game over sound
            if (this.soundManager) {
              if (victory) {
                  // More epic victory sound - ensure this key exists
                this.soundManager.play('victory_fanfare', { volume: 0.9 }); 
              } else {
                   // More dramatic game over sound - ensure this key exists
                this.soundManager.play('game_over_sting', { volume: 0.9 });
              }

              // Stop the background music
              this.soundManager.stopMusic();
            }
          } catch (error) {
            console.error("Error in endGame function:", error);
            // Fallback to basic game over
            this.gameState.isActive = false;
            this.add.text(400, 300, 'GAME OVER', {
              fontSize: '48px',
              fontFamily: 'Arial',
              color: '#FF0000'
            }).setOrigin(0.5);
          }
        }

        // Add method to submit score via API
        // Add helper method to validate scene context
        isSceneValid() {
          try {
            // Check if scene object exists and is properly initialized
            if (!this || !this.scene) {
              console.warn('Scene validation failed: scene object is null or undefined');
              return false;
            }
            
            // Check if scene is active
            if (!this.scene.isActive || typeof this.scene.isActive !== 'function' || !this.scene.isActive()) {
              console.warn('Scene validation failed: scene is not active');
              return false;
            }
            
            // Check if add object exists and has required methods
            if (!this.add || typeof this.add !== 'object') {
              console.warn('Scene validation failed: add object is null or not an object');
              return false;
            }
            
            if (typeof this.add.text !== 'function') {
              console.warn('Scene validation failed: add.text is not a function');
              return false;
            }
            
            // Check if tweens object exists and has required methods
            if (!this.tweens || typeof this.tweens !== 'object') {
              console.warn('Scene validation failed: tweens object is null or not an object');
              return false;
            }
            
            if (typeof this.tweens.add !== 'function') {
              console.warn('Scene validation failed: tweens.add is not a function');
              return false;
            }
            
            // Additional checks for scene destruction
            if (this.scene.sys && this.scene.sys.isDestroyed) {
              console.warn('Scene validation failed: scene system is destroyed');
              return false;
            }
            
            return true;
          } catch (error) {
            console.error('Error in scene validation:', error);
            return false;
          }
        }

        async submitScore(score, waves, submitButton, submitText) {
          // Prevent multiple submissions
          if (this.isSubmittingScore) {
            console.log('Score submission already in progress, ignoring duplicate request');
            return;
          }

          // Validate scene before proceeding
          if (!this.isSceneValid()) {
            console.error('Scene is invalid, cannot submit score');
            return;
          }
          
          this.isSubmittingScore = true;
          
          // Disable the submit button immediately
          if (submitButton && submitText) {
            submitButton.fillColor = 0x666666; // Gray out the button
            submitButton.disableInteractive();
            submitText.setColor('#AAAAAA'); // Gray out the text
            submitText.setText('Submitting...');
          }
          
          try {
            console.log(`Submitting score: Score=${score}, Waves=${waves}`);
            
            // Check if secure score submission function is available
            if (typeof window !== 'undefined' && window.secureSubmitScore) {
              // Show loading feedback to user - add null check for scene context
              let feedbackText = null;
              if (this.isSceneValid() && this.add && typeof this.add.text === 'function') {
                try {
                  feedbackText = this.add.text(400, 400, 'Submitting Score...', {
                    fontFamily: 'Arial',
                    fontSize: '24px',
                    color: '#FFD700',
                    stroke: '#000000',
                    strokeThickness: 2
                  }).setOrigin(0.5);
                  feedbackText.setDepth(1003);
                } catch (e) {
                  console.warn('Could not create feedback text:', e);
                }
              }
              
              // Generate game state hash for integrity verification
              const gameStateData = {
                score: score,
                waves: waves,
                timestamp: Date.now(),
                gameTime: this.gameTime || 0,
                enemiesDefeated: this.enemiesDefeated || 0
              };
              
              // Call the secure submission function
              const transactionCount = 1; // Always 1 transaction per game session
              const success = window.secureSubmitScore(score, transactionCount, gameStateData);
              
              // Remove loading text safely
              if (feedbackText && typeof feedbackText.destroy === 'function') {
                try {
                  feedbackText.destroy();
                } catch (e) {
                  console.warn('Could not destroy feedback text:', e);
                }
              }
              
              if (success) {
                // Update button to show success and hide it
                if (submitButton && submitText) {
                  submitText.setText('Score Submitted!');
                  submitText.setColor('#00FF00');
                  
                  // Fade out the submit button after showing success
                  if (this.isSceneValid()) {
                    this.tweens.add({
                      targets: [submitButton, submitText],
                      alpha: 0,
                      duration: 2000,
                      onComplete: () => {
                        if (submitButton && typeof submitButton.destroy === 'function') submitButton.destroy();
                        if (submitText && typeof submitText.destroy === 'function') submitText.destroy();
                      }
                    });
                  }
                }
                
                // Show success feedback - add null check for scene context
                if (this.isSceneValid() && this.add && typeof this.add.text === 'function') {
                  try {
                    const successText = this.add.text(400, 450, 'Score submitted successfully!\nUse "Play Again" to start a new game\n(Click to dismiss)', {
                      fontFamily: 'Arial',
                      fontSize: '20px',
                      color: '#00FF00',
                      stroke: '#000000',
                      strokeThickness: 2,
                      align: 'center'
                    }).setOrigin(0.5);
                    successText.setDepth(1003);
                    
                    // Make success text clickable to dismiss
                    successText.setInteractive({ useHandCursor: true })
                      .on('pointerdown', () => {
                        if (successText && typeof successText.destroy === 'function') {
                          successText.destroy();
                        }
                      });
                    
                    // Store reference for cleanup during game restart
                    this.successText = successText;
                  } catch (e) {
                    console.warn('Could not create success text:', e);
                  }
                }
                
              } else {
                // Re-enable button on failure
                if (submitButton && submitText) {
                  submitButton.fillColor = 0x6B46C1;
                  submitButton.setInteractive({ useHandCursor: true });
                  submitText.setColor('#FFFFFF');
                  submitText.setText('Submit Score');
                }
                throw new Error('Submission failed');
              }
            } else {
              // Re-enable button if submission not available
              if (submitButton && submitText) {
                submitButton.fillColor = 0x6B46C1;
                submitButton.setInteractive({ useHandCursor: true });
                submitText.setColor('#FFFFFF');
                submitText.setText('Submit Score');
              }
              throw new Error('Score submission not available');
            }
            
          } catch (error) {
            console.error('Error submitting score:', error);
            
            // Show error feedback - add null check for scene context
            if (this.isSceneValid() && this.add && typeof this.add.text === 'function') {
              try {
                const errorText = this.add.text(400, 400, 'Score submission failed\nTry again or use "Play Again"', {
                  fontFamily: 'Arial',
                  fontSize: '20px',
                  color: '#FF0000',
                  stroke: '#000000',
                  strokeThickness: 2,
                  align: 'center'
                }).setOrigin(0.5);
                errorText.setDepth(1003);
                
                // Fade out the error text after 4 seconds
                if (this.isSceneValid() && this.tweens && typeof this.tweens.add === 'function') {
                  this.tweens.add({
                    targets: errorText,
                    alpha: 0,
                    duration: 4000,
                    onComplete: () => {
                      if (errorText && typeof errorText.destroy === 'function') {
                        errorText.destroy();
                      }
                    }
                  });
                }
              } catch (e) {
                console.warn('Could not create error text:', e);
              }
            }
          } finally {
            // Reset submission flag
            this.isSubmittingScore = false;
          }
        }

        // Add helper method to clean up game objects
        cleanupCurrentGame(fullCleanup = false) {
          try {
            console.log("Cleaning up current game...", fullCleanup ? "(Full cleanup)" : "(Preserving crops)");
            
            // Reset update flags to prevent issues between sessions
            this._isUpdating = false;
            // Reset global isUpdating flag to prevent cross-session issues
            isUpdating = false;
            
            // Stop enemy spawning and wave timers, but preserve crop timers unless full cleanup
            if (fullCleanup) {
              this.time.removeAllEvents();
            } else {
              // Only remove specific timers, preserve crop growth timers
              if (this.spawnTimer) {
                this.spawnTimer.remove();
                this.spawnTimer = null;
              }
              if (this.waveTimer) {
                this.waveTimer.remove();
                this.waveTimer = null;
              }
            }
            
            // Clean up enemies - always clear them when game ends
            if (this.enemies && this.enemies.length) {
              console.log(`Cleaning up ${this.enemies.length} enemies`);
              this.enemies.forEach(enemy => {
                if (enemy) {
                  try {
                    // Hide health bar immediately before destroying
                    if (typeof enemy.hideHealthBar === 'function') {
                      enemy.hideHealthBar();
                    }
                    // Destroy the enemy
                    if (typeof enemy.destroy === 'function') {
                      enemy.destroy();
                    }
                  } catch (e) { console.error("Error destroying enemy:", e); }
                }
              });
              this.enemies = []; // Clear the array
              console.log("All enemies cleaned up.");
            } else {
              this.enemies = []; // Ensure the array is initialized
            }
            
            // Only clean up crops on full cleanup (game over), preserve them on restart
            if (fullCleanup && this.crops) {
              Object.keys(this.crops).forEach(key => {
                const crop = this.crops[key];
                if (crop && typeof crop.destroy === 'function') {
                  try {
                    crop.destroy();
                  } catch (e) { console.error("Error destroying crop:", e); }
                }
              });
              this.crops = {}; // Clear the object
              console.log("Crops cleaned up.");
            } else if (this.crops) {
              console.log("Crops preserved for game restart.");
            }
            
            // Clean up defenses - always clear them when game ends
            if (this.defenses && this.defenses.length) {
              console.log(`Cleaning up ${this.defenses.length} defenses`);
              // Create a copy of the array to avoid issues with array modification during iteration
              const defensesToClean = [...this.defenses];
              defensesToClean.forEach((defense, index) => {
                if (defense) {
                  console.log(`Cleaning defense ${index}: type=${defense.type}, hasForceDestroy=${typeof defense.forceDestroy === 'function'}, hasDestroy=${typeof defense.destroy === 'function'}`);
                  // Use forceDestroy to bypass wave lifecycle, fallback to destroy
                  if (typeof defense.forceDestroy === 'function') {
                    try {
                      defense.forceDestroy();
                      console.log(`Defense ${defense.type} force destroyed successfully`);
                    } catch (e) { console.error("Error force destroying defense:", e); }
                  } else if (typeof defense.destroy === 'function') {
                    try {
                      defense.destroy();
                      console.log(`Defense ${defense.type} destroyed successfully`);
                    } catch (e) { console.error("Error destroying defense:", e); }
                  } else {
                    // Manual cleanup if no destroy method
                    console.log(`Manual cleanup for defense ${defense.type}`);
                    if (defense.sprite && typeof defense.sprite.destroy === 'function') {
                      defense.sprite.destroy();
                      console.log(`Defense ${defense.type} sprite destroyed`);
                    }
                    if (defense.rangeIndicator && typeof defense.rangeIndicator.destroy === 'function') defense.rangeIndicator.destroy();
                    if (defense.manaText && typeof defense.manaText.destroy === 'function') defense.manaText.destroy();
                    if (defense.cooldownIndicator && typeof defense.cooldownIndicator.destroy === 'function') defense.cooldownIndicator.destroy();
                    if (defense.label && typeof defense.label.destroy === 'function') {
                      defense.label.destroy();
                      console.log(`Defense ${defense.type} label destroyed`);
                    }
                  }
                }
              });
              this.defenses = [];
              console.log("All defenses cleaned up.");
            } else {
              this.defenses = []; // Ensure the array is initialized
            }
            
            // Clean up projectiles if they exist as a separate group
            if (this.projectiles && typeof this.projectiles.destroy === 'function') {
              this.projectiles.destroy(true); // Destroy group and children
              this.projectiles = null; // Reset reference
              console.log("Projectiles cleaned up.");
            }
            
            // Clean up global defense range indicator
            if (this.defenseRangeIndicator && typeof this.defenseRangeIndicator.destroy === 'function') {
              this.defenseRangeIndicator.destroy();
              this.defenseRangeIndicator = null;
              console.log("Global defense range indicator cleaned up.");
            }
            
            // Reset game state
            this.gameState = {
              isActive: false,
              isPaused: false, // Ensure paused state is reset
              wave: 1,
              score: 0,
              lives: 3, // Reset lives
              farmCoins: 75, // Reset starting coins
              clickDamage: 0.5, // Reset base click damage
              canPlant: true,
              autoWave: true // Reset auto-wave setting
            };
            this.registry.set('farmCoins', this.gameState.farmCoins); // Update registry too
            
            // Reset other game properties
            this.isSpawningEnemies = false;
            this.waveInProgress = false; // Ensure wave is marked as not in progress
            this.waveChangeInProgress = false; // Reset wave change flag
            this.enemiesSpawned = 0;
            this.totalEnemiesInWave = 0;
            this.currentDefenseType = null;
            this.toolMode = 'attack'; // Reset tool mode
            this.pendingDefensePlacement = false; // Reset placement flag
            this.pendingDefenseType = null;
            
            // Reset UI elements if they exist
            if (this.scoreText) this.scoreText.setText("Score: 0");
            if (this.farmCoinsText) this.farmCoinsText.setText(`Coins: ${this.gameState.farmCoins}`);
            if (this.waveText) this.waveText.setText("Wave: 1");
            // Lives text removed - no longer displayed
            // Next Wave button cleanup removed - button no longer exists
            
            // Reset upgrade system UI if necessary
            if (this.upgradeSystem && typeof this.upgradeSystem.resetUI === 'function') {
              this.upgradeSystem.resetUI(); // Assuming resetUI hides/resets the panel
              this.upgradeSystem.setUIVisible(false); // Ensure it's hidden
            }
            
            // Clean up success text if it exists
            if (this.successText && typeof this.successText.destroy === 'function') {
              this.successText.destroy();
              this.successText = null;
              console.log('Success text cleaned up.');
            }
            
            // Clear any lingering floating text or effects
            // (Phaser might handle this, but explicit cleanup can help)
            // Example: Find all text objects that are floating texts and destroy them
            
            // Reset sound manager state if needed (e.g., stop looping sounds)
            if (this.soundManager) {
              // this.soundManager.stopAllLoops(); // Assuming such a method exists
            }
            
            // --- Add log ---
            console.log("Game cleanup complete (End of cleanupCurrentGame)");
            // --- End log ---
          } catch (error) {
            console.error("Error in cleanupCurrentGame:", error);
          }
        }

        // Add a new countdown animation that shows 3, 2, 1, FIGHT! before starting a wave
        showCountdownAnimation(onComplete) {
          try {
            // Prevent multiple countdown animations running simultaneously
            if (this._countdownInProgress) {
              console.log("Countdown already in progress, skipping duplicate");
              // Still call the completion callback to ensure game flow continues
              if (typeof onComplete === 'function') {
                onComplete();
              }
              return;
            }
            
            // Set flag to prevent multiple countdowns
            this._countdownInProgress = true;
            
            // Clean up any previous countdown elements that might be stuck
            if (this._countdownElements) {
              this._countdownElements.forEach(element => {
                if (element && element.destroy) {
                  element.destroy();
                }
              });
            }
            
            // Initialize array to track countdown elements for cleanup
            this._countdownElements = [];
            
            // Start countdown after a short delay (wave announcement is shown elsewhere)
            this.time.delayedCall(800, () => {
              // Create countdown text styles - improve visibility
              const countStyle = {
                fontFamily: 'Arial Black, Impact, sans-serif',
                fontSize: '100px',
                color: '#FFFFFF',
                stroke: '#000000',
                strokeThickness: 8,
                align: 'center',
                shadow: {
                  offsetX: 4,
                  offsetY: 4,
                  color: '#000000',
                  blur: 8
                }
              };
              
              // Rest of countdown animation remains the same...
            });
          } catch (error) {
            console.error("Error creating countdown animation:", error);
          }
        }

        /**
         * Handles any clicks that don't directly hit interactive objects
         * This ensures consistent click handling throughout the game area
         */
        processMissedClicks() {
          // This function handles any queued or missed clicks
          // It's a stub that can be implemented fully if needed later
          // Currently just here to prevent errors when called from update()
          return;
        }

        // Add this new function definition
        setupEnemySpawningLoop() {
            if (!this.gameState?.isActive || !this.isSpawningEnemies) {
                console.log("setupEnemySpawningLoop called but game/spawning is not active. Aborting loop setup.");
                this.isSpawningEnemies = false; // Ensure flag is false if loop isn't set up
                return;
            }

            // Use the locally captured types from startWave if available, otherwise recalculate (less ideal)
            const enemyTypesToSpawn = this.currentWaveEnemyTypes || this.calculateEnemyTypes(this.gameState.wave);

            // Calculate delay between spawns (decrease delay for higher waves)
            const baseDelay = 1500; // ms between spawns
            const minDelay = 400; // Minimum delay
            const waveFactor = Math.max(0, this.gameState.wave - 1);
            const spawnInterval = Math.max(minDelay, baseDelay - waveFactor * 100); // Decrease delay by 100ms per wave

            console.log(`Setting up enemy spawn loop for wave ${this.gameState.wave}. Interval: ${spawnInterval}ms`);

            // Ensure spawnTimer is cleared if it exists
            if (this.spawnTimer) {
                this.spawnTimer.remove();
                this.spawnTimer = null;
                 console.log("Cleared existing spawn timer before setting up new one.");
            }

            this.spawnTimer = this.time.addEvent({
                delay: spawnInterval,
                callback: () => {
                    try {
                        // Check if we should still be spawning
                        if (!this.gameState?.isActive || !this.isSpawningEnemies) {
                             console.log("Spawn callback triggered, but spawning should be stopped.");
                             if(this.spawnTimer) this.spawnTimer.remove(); // Stop the timer
                             this.isSpawningEnemies = false;
                            return;
                        }

                        // Check if we've spawned enough enemies already
                        // Use > instead of >= to account for the first enemy spawned outside the loop
                        if (this.enemiesSpawned >= this.totalEnemiesInWave) {
                            console.log(`Spawn callback: Already spawned ${this.enemiesSpawned}/${this.totalEnemiesInWave}. Stopping spawn loop.`);
                            this.isSpawningEnemies = false;
                            if(this.spawnTimer) this.spawnTimer.remove();
                            this.spawnTimer = null;
                            return;
                        }

                        // Select and spawn the next enemy
                        const enemyType = this.selectEnemyType(enemyTypesToSpawn);
                        const success = this.spawnEnemy(enemyType);

                        if (success) {
                            this.enemiesSpawned++;
                            console.log(`Spawned enemy ${this.enemiesSpawned}/${this.totalEnemiesInWave} (Type: ${enemyType})`);
                        } else {
                            console.error(`Failed to spawn enemy ${this.enemiesSpawned + 1}/${this.totalEnemiesInWave} (Type: ${enemyType})`);
                            // Decide how to handle failure - maybe skip or retry?
                            // For now, we still increment to avoid infinite loops if spawn always fails.
                             this.enemiesSpawned++;
                        }

                        // Check if this was the *last* enemy to be spawned
                        if (this.enemiesSpawned >= this.totalEnemiesInWave) {
                            console.log(`Last enemy (${this.enemiesSpawned}/${this.totalEnemiesInWave}) spawned for wave ${this.gameState.wave}. Stopping spawn loop.`);
                            this.isSpawningEnemies = false;
                            if(this.spawnTimer) this.spawnTimer.remove();
                            this.spawnTimer = null;
                        }
                    } catch (spawnError) {
                        console.error("Error within spawn timer callback:", spawnError);
                        this.isSpawningEnemies = false; // Stop spawning on error
                        if(this.spawnTimer) this.spawnTimer.remove();
                         this.spawnTimer = null;
                    }
                },
                callbackScope: this,
                 // Repeat needs to be totalEnemies - 1 because the first enemy is spawned outside this loop
                 // Ensure repeat count is at least 0
                repeat: Math.max(0, this.totalEnemiesInWave - this.enemiesSpawned -1)
            });
        }

        // --- Defense Lifetime Management ---
        checkDefenseExpirations(currentWave) {
          if (!this.defenses || !Array.isArray(this.defenses)) {
            return;
          }
          
          console.log(`Checking defense expirations for wave ${currentWave}`);
          
          // Check each defense for expiration
          const expiredDefenses = [];
          
          for (let i = 0; i < this.defenses.length; i++) {
            const defense = this.defenses[i];
            
            if (defense && typeof defense.checkWaveExpiration === 'function') {
              const isExpired = defense.checkWaveExpiration(currentWave);
              
              if (isExpired) {
                console.log(`Defense ${defense.type} placed in wave ${defense.placementWave} exhausted at wave ${currentWave}`);
                expiredDefenses.push(defense);
                // Don't remove from array here - let Defense.destroy() handle it after animation
              }
            }
          }
          
          if (expiredDefenses.length > 0) {
            console.log(`${expiredDefenses.length} defenses exhausted`);
            
            // Show notification if defenses expired
            this.showFloatingText(400, 100, `${expiredDefenses.length} defense(s) exhausted!`, 0xFF6600);
          }
        }
        
        // Method for defenses to remove themselves from the array after destruction
        removeDefenseFromArray(defense) {
          if (this.defenses && defense) {
            const index = this.defenses.indexOf(defense);
            if (index !== -1) {
              this.defenses.splice(index, 1);
              console.log(`Defense ${defense.type} removed from defenses array`);
              console.log(`Remaining defenses: ${this.defenses.length}`);
              this.defenses.forEach((def, i) => {
                console.log(`  Defense ${i}: ${def.type || 'unknown'} at (${def.x || 'N/A'}, ${def.y || 'N/A'})`);
              });
            }
          }
        }

        // --- NEW: Create Flying Coin Effect --- 
        createFlyingCoinEffect(startX, startY, amount) {
            if (!this.textures.exists('coin') || !this.farmCoinsTargetPos) {
                console.warn("Coin texture or target position missing for flying coin effect.");
                // Directly update coins as fallback if effect can't run
                this.updateFarmCoins(amount);
                return;
            }

            // Limit the number of coin sprites for performance
            const numCoins = Math.min(10, Math.max(1, Math.floor(amount / 2))); // e.g., 1 coin per 2 value, max 10
            const coinValuePerSprite = amount / numCoins; // Distribute value for potential future logic

            for (let i = 0; i < numCoins; i++) {
                // Create coin slightly offset from start position
                const coinX = startX + (Math.random() - 0.5) * 30;
                const coinY = startY + (Math.random() - 0.5) * 30;

                const coinSprite = this.add.sprite(coinX, coinY, 'coin');
                coinSprite.setScale(0.5); // Start small
                coinSprite.setDepth(4000); // Ensure coins are on top
                coinSprite.setAlpha(0.8);

                // Calculate target position with slight variation
                const targetX = this.farmCoinsTargetPos.x + (Math.random() - 0.5) * 20;
                const targetY = this.farmCoinsTargetPos.y + (Math.random() - 0.5) * 10;

                // Random duration for staggered effect
                const duration = 600 + Math.random() * 300;

                // Tween animation
                this.tweens.add({
                    targets: coinSprite,
                    x: targetX,
                    y: targetY,
                    scale: { from: 0.8, to: 0.2 }, // Scale up slightly then shrink
                    alpha: { from: 1, to: 0 },
                    angle: 360 + (Math.random() * 180), // Add rotation
                    duration: duration,
                    ease: 'Cubic.easeIn', // Ease in towards the target
                    delay: i * 50, // Stagger the start of each coin
                    onComplete: () => {
                        coinSprite.destroy();
                        // Optional: Play a small sound when coin reaches target?
                        // if (i === numCoins - 1) { // Only play sound for last coin if desired
                        //    if (this.soundManager) this.soundManager.play('coin_collect_single');
                        // }
                    }
                });
            }

            // Play a general coin collect sound once for the batch
            if (this.soundManager) {
                this.soundManager.play('coin_collect_batch', { volume: 0.5, delay: 0.1 }); // Delay slightly
            }

            // IMPORTANT: Update the actual coin count *immediately* 
            // The visual effect is just for show
            this.updateFarmCoins(amount);
        }
        // --- End Flying Coin Effect ---
        
        // --- Skill Tree Methods ---
        toggleSkillTree() {
          this.skillTreeVisible = !this.skillTreeVisible;
          
          if (this.skillTreeVisible) {
            this.showSkillTreeOverlay();
          } else {
            this.hideSkillTreeOverlay();
          }
        }

        // Create skill tree background particles
        createSkillTreeParticles() {
          // Create floating background particles for the skill tree
          for (let i = 0; i < 15; i++) {
            const x = 60 + Math.random() * 680;
            const y = 80 + Math.random() * 440;
            
            const particle = this.add.circle(x, y, 1 + Math.random() * 2, 0x3b82f6, 0.3 + Math.random() * 0.4);
            particle.setDepth(7000);
            this.skillTreeElements.push(particle);
            
            // Add floating animation
            this.tweens.add({
              targets: particle,
              y: y - 20 - Math.random() * 30,
              alpha: 0,
              duration: 3000 + Math.random() * 2000,
              delay: i * 100,
              ease: 'Power2',
              repeat: -1,
              yoyo: false,
              onRepeat: () => {
                particle.y = 520 + Math.random() * 20;
                particle.alpha = 0.3 + Math.random() * 0.4;
              }
            });
          }
        }

        // Create corner decorations for the skill tree
        createCornerDecorations() {
          const corners = [
            { x: 80, y: 80, rotation: 0 },
            { x: 720, y: 80, rotation: Math.PI / 2 },
            { x: 80, y: 520, rotation: -Math.PI / 2 },
            { x: 720, y: 520, rotation: Math.PI }
          ];
          
          corners.forEach((corner, index) => {
            // Create ornate corner decoration
            const decoration = this.add.graphics();
            decoration.setDepth(7002);
            decoration.lineStyle(3, 0x3b82f6, 0.8);
            decoration.beginPath();
            decoration.moveTo(0, 0);
            decoration.lineTo(30, 0);
            decoration.lineTo(30, 5);
            decoration.lineTo(5, 5);
            decoration.lineTo(5, 30);
            decoration.lineTo(0, 30);
            decoration.closePath();
            decoration.strokePath();
            
            decoration.x = corner.x;
            decoration.y = corner.y;
            decoration.rotation = corner.rotation;
            
            this.skillTreeElements.push(decoration);
            
            // Add pulsing glow animation
            this.tweens.add({
              targets: decoration,
              alpha: 0.4,
              duration: 2000,
              delay: index * 300,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
          });
        }
        
        showSkillTreeOverlay() {
          // Initialize skill tree elements array for proper cleanup
          this.skillTreeElements = [];
          
          // Create full-screen dark overlay with subtle gradient
          this.skillTreeOverlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.9);
          this.skillTreeOverlay.setDepth(7000);
          this.skillTreeOverlay.setInteractive();
          this.skillTreeElements.push(this.skillTreeOverlay);
          
          // Add animated background particles
          this.createSkillTreeParticles();
          
          // Main panel with modern glass morphism design
          this.skillTreePanel = this.add.rectangle(400, 300, 700, 500, 0x0f172a, 0.85);
          this.skillTreePanel.setDepth(7001);
          this.skillTreePanel.setStrokeStyle(2, 0x334155, 0.8);
          this.skillTreeElements.push(this.skillTreePanel);
          
          // Outer glow with animated pulse
          this.skillTreeOuterGlow = this.add.rectangle(400, 300, 710, 510, 0x000000, 0);
          this.skillTreeOuterGlow.setDepth(7000);
          this.skillTreeOuterGlow.setStrokeStyle(3, 0x06b6d4, 0.6);
          this.skillTreeElements.push(this.skillTreeOuterGlow);
          
          // Animated glow pulse
          this.tweens.add({
              targets: this.skillTreeOuterGlow,
              alpha: 0.3,
              duration: 2000,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
          });
          
          // Inner gradient panels for depth
          this.skillTreeInnerPanel1 = this.add.rectangle(400, 300, 680, 480, 0x1e293b, 0.6);
          this.skillTreeInnerPanel1.setDepth(7001);
          this.skillTreeInnerPanel1.setStrokeStyle(1, 0x475569, 0.4);
          this.skillTreeElements.push(this.skillTreeInnerPanel1);
          
          // Header section with gradient background
          this.skillTreeHeader = this.add.rectangle(400, 120, 680, 80, 0x1e40af, 0.3);
          this.skillTreeHeader.setDepth(7001);
          this.skillTreeHeader.setStrokeStyle(1, 0x3b82f6, 0.6);
          this.skillTreeElements.push(this.skillTreeHeader);
          
          // Modern title with cyberpunk styling
          this.skillTreeTitle = this.add.text(400, 105, 'SKILL NEXUS', {
              fontFamily: 'Arial Black',
              fontSize: '32px',
              color: '#00f5ff',
              fontStyle: 'bold',
              stroke: '#0c4a6e',
              strokeThickness: 2,
              shadow: {
                  offsetX: 0,
                  offsetY: 0,
                  color: '#00f5ff',
                  blur: 15,
                  fill: false
              }
          }).setOrigin(0.5).setDepth(7002);
          this.skillTreeElements.push(this.skillTreeTitle);
          
          // Animated title glow
          this.tweens.add({
              targets: this.skillTreeTitle,
              alpha: 0.8,
              duration: 1500,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
          });
          
          // Subtitle with modern styling
          this.skillTreeSubtitle = this.add.text(400, 135, 'ENHANCE YOUR DEFENDERS', {
              fontFamily: 'Arial',
              fontSize: '16px',
              color: '#94a3b8',
              fontStyle: 'normal',
              letterSpacing: '2px'
          }).setOrigin(0.5).setDepth(7002);
          this.skillTreeElements.push(this.skillTreeSubtitle);
          
          // Modern close button with hover effects
          this.skillTreeCloseBtn = this.add.rectangle(650, 80, 40, 40, 0xdc2626, 0.9);
          this.skillTreeCloseBtn.setDepth(7002);
          this.skillTreeCloseBtn.setStrokeStyle(2, 0xef4444);
          this.skillTreeCloseBtn.setInteractive({ useHandCursor: true });
          this.skillTreeElements.push(this.skillTreeCloseBtn);
          
          // Close button glow
          this.skillTreeCloseBtnGlow = this.add.rectangle(650, 80, 50, 50, 0x000000, 0);
          this.skillTreeCloseBtnGlow.setDepth(7001);
          this.skillTreeCloseBtnGlow.setStrokeStyle(2, 0xef4444, 0.5);
          this.skillTreeElements.push(this.skillTreeCloseBtnGlow);
          
          this.skillTreeCloseBtnText = this.add.text(650, 80, '✕', {
              fontFamily: 'Arial Black',
              fontSize: '20px',
              color: '#ffffff'
          }).setOrigin(0.5).setDepth(7003);
          this.skillTreeElements.push(this.skillTreeCloseBtnText);
          
          // Close button hover effects
          this.skillTreeCloseBtn.on('pointerover', () => {
              this.skillTreeCloseBtn.setFillStyle(0xef4444);
              this.skillTreeCloseBtnGlow.setStrokeStyle(3, 0xfca5a5, 0.8);
              this.tweens.add({
                  targets: this.skillTreeCloseBtn,
                  scaleX: 1.1,
                  scaleY: 1.1,
                  duration: 200,
                  ease: 'Back.easeOut'
              });
          });
          
          this.skillTreeCloseBtn.on('pointerout', () => {
              this.skillTreeCloseBtn.setFillStyle(0xdc2626);
              this.skillTreeCloseBtnGlow.setStrokeStyle(2, 0xef4444, 0.5);
              this.tweens.add({
                  targets: this.skillTreeCloseBtn,
                  scaleX: 1,
                  scaleY: 1,
                  duration: 200,
                  ease: 'Back.easeOut'
              });
          });
          
          this.skillTreeCloseBtn.on('pointerdown', () => {
              this.toggleSkillTree();
          });
          
          // Progress panel with modern design
          this.progressPanel = this.add.rectangle(400, 180, 650, 60, 0x0f172a, 0.8);
          this.progressPanel.setDepth(7001);
          this.progressPanel.setStrokeStyle(1, 0x334155, 0.6);
          this.skillTreeElements.push(this.progressPanel);
          
          // Progress panel glow
          this.progressPanelGlow = this.add.rectangle(400, 180, 660, 70, 0x000000, 0);
          this.progressPanelGlow.setDepth(7000);
          this.progressPanelGlow.setStrokeStyle(2, 0x0ea5e9, 0.3);
          this.skillTreeElements.push(this.progressPanelGlow);
          
          // Get skill tree manager and display progress
          const skillTreeManager = window.skillTreeManager;
          if (skillTreeManager) {
              const progressData = skillTreeManager.getProgressData();
              
              // Score display with modern styling
              const scoreIcon = this.add.text(150, 165, '⭐', {
                  fontSize: '20px',
                  color: '#fbbf24'
              }).setDepth(7002);
              this.skillTreeElements.push(scoreIcon);
              
              // Safe score display with null checks - use current game score instead of skill tree total
              const currentScore = this.gameState?.score || 0;
              const scoreText = this.add.text(180, 165, `${currentScore.toLocaleString()}`, {
                  fontFamily: 'Arial Black',
                  fontSize: '18px',
                  color: '#fbbf24',
                  fontStyle: 'bold'
              }).setDepth(7002);
              this.skillTreeElements.push(scoreText);
              
              const scoreLabel = this.add.text(180, 185, 'CURRENT SCORE', {
                  fontFamily: 'Arial',
                  fontSize: '10px',
                  color: '#64748b',
                  letterSpacing: '1px'
              }).setDepth(7002);
              this.skillTreeElements.push(scoreLabel);
              
              // Enemies defeated display
              const enemyIcon = this.add.text(450, 165, '💀', {
                  fontSize: '20px',
                  color: '#ef4444'
              }).setDepth(7002);
              this.skillTreeElements.push(enemyIcon);
              
              // Safe enemies defeated display with null checks
              const enemiesDefeated = (progressData && typeof progressData.enemiesDefeated === 'number') ? progressData.enemiesDefeated : 0;
              const enemiesText = this.add.text(480, 165, `${enemiesDefeated.toLocaleString()}`, {
                  fontFamily: 'Arial Black',
                  fontSize: '18px',
                  color: '#ef4444',
                  fontStyle: 'bold'
              }).setDepth(7002);
              this.skillTreeElements.push(enemiesText);
              
              const enemiesLabel = this.add.text(480, 185, 'ENEMIES DEFEATED', {
                  fontFamily: 'Arial',
                  fontSize: '10px',
                  color: '#64748b',
                  letterSpacing: '1px'
              }).setDepth(7002);
              this.skillTreeElements.push(enemiesLabel);
              
              this.displayDefenderSkills(skillTreeManager);
          }
        }
        
        displayDefenderSkills(skillTreeManager) {
          const defenders = ['CHOG', 'MOLANDAK', 'MOYAKI', 'KEON'];
          const startY = 190;
          const spacing = 95;
          
          defenders.forEach((defenderType, index) => {
            const y = startY + (index * spacing);
            
            // Enhanced defender section background with gradient effect
            const defenderBg = this.add.rectangle(400, y, 680, 85, 0x0f172a, 0.9);
            defenderBg.setDepth(7001);
            defenderBg.setStrokeStyle(2, 0x1e293b);
            this.skillTreeElements.push(defenderBg);
            
            // Add defender section glow
            const defenderGlow = this.add.rectangle(400, y, 690, 95, 0x000000, 0);
            defenderGlow.setDepth(7000);
            defenderGlow.setStrokeStyle(3, this.getDefenderColor(defenderType), 0.3);
            this.skillTreeElements.push(defenderGlow);
            
            // Enhanced defender icon with animated background
            const defenderIconBg = this.add.rectangle(130, y, 60, 60, this.getDefenderColor(defenderType), 0.8);
            defenderIconBg.setDepth(7002);
            defenderIconBg.setStrokeStyle(3, this.getDefenderColor(defenderType));
            this.skillTreeElements.push(defenderIconBg);
            
            // Add subtle rotation animation to icon background
            this.tweens.add({
              targets: defenderIconBg,
              rotation: 0.1,
              duration: 3000,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
            
            // Defender type emoji/icon with enhanced styling - SMALLER SIZE
            const defenderEmoji = this.getDefenderEmoji(defenderType);
            const defenderEmojiText = this.add.text(130, y, defenderEmoji, {
              fontSize: '24px'
            }).setOrigin(0.5).setDepth(7003);
            this.skillTreeElements.push(defenderEmojiText);
            
            // Add floating animation to emoji
            this.tweens.add({
              targets: defenderEmojiText,
              y: y - 2,
              duration: 2000,
              yoyo: true,
              repeat: -1,
              ease: 'Sine.easeInOut'
            });
            
            // Enhanced defender name with epic styling - SMALLER SIZE
            const defenderNameText = this.add.text(160, y - 10, defenderType, {
              fontFamily: 'Arial Black',
              fontSize: '16px',
              color: '#f1f5f9',
              fontStyle: 'bold',
              stroke: '#000000',
              strokeThickness: 1,
              shadow: {
                offsetX: 1,
                offsetY: 1,
                color: '#000000',
                blur: 3,
                fill: true
              }
            }).setOrigin(0, 0.5).setDepth(7002);
            this.skillTreeElements.push(defenderNameText);
            
            // Enhanced defender class label with color coding - SMALLER SIZE
            const defenderClass = this.add.text(160, y + 5, this.getDefenderClass(defenderType), {
              fontFamily: 'Arial Bold',
              fontSize: '11px',
              color: this.getDefenderColor(defenderType),
              fontStyle: 'italic',
              letterSpacing: '0.3px'
            }).setOrigin(0, 0.5).setDepth(7002);
            this.skillTreeElements.push(defenderClass);
            
            // Add defender mastery level indicator - SMALLER SIZE
            const masteryLevel = skillTreeManager.getDefenderMasteryLevel ? skillTreeManager.getDefenderMasteryLevel(defenderType) : 1;
            const masteryText = this.add.text(160, y + 15, `Mastery Level ${masteryLevel}`, {
              fontFamily: 'Arial',
              fontSize: '9px',
              color: '#64748b',
              fontStyle: 'italic'
            }).setOrigin(0, 0.5).setDepth(7002);
            this.skillTreeElements.push(masteryText);
            
            // Get skills for this defender
            const skills = skillTreeManager.getDefenderSkills(defenderType);
            console.log(`[SKILL DEBUG] Getting skills for ${defenderType}:`, skills);
            console.log(`[SKILL DEBUG] SkillTreeManager available defenders:`, skillTreeManager.getAllDefenders());
            
            if (skills && skills.tiers) {
                console.log(`[SKILL DEBUG] ${defenderType} has tiers:`, Object.keys(skills.tiers));
              let skillIndex = 0;
              Object.values(skills.tiers).forEach(tier => {
                tier.skills.forEach((skill) => {
                  const skillX = 280 + (skillIndex * 80); // SMALLER SPACING
                  const isUnlocked = skillTreeManager.isSkillUnlocked(defenderType, skill.id);
                  const canUnlock = skillTreeManager.canUnlockSkill(defenderType, skill.id);
                  
                  // Enhanced skill node with hexagonal design and multiple layers - SMALLER SIZE
                  const skillBgOuter = this.add.rectangle(skillX, y, 70, 45, 0x000000, 0);
                  skillBgOuter.setDepth(7001);
                  skillBgOuter.setStrokeStyle(2, 
                    isUnlocked ? 0x10b981 : (canUnlock ? 0x3b82f6 : 0x374151), 0.6);
                  this.skillTreeElements.push(skillBgOuter);
                  
                  const skillBg = this.add.rectangle(skillX, y, 65, 40, 
                    isUnlocked ? 0x065f46 : (canUnlock ? 0x1e40af : 0x1f2937), 0.9);
                  skillBg.setDepth(7002);
                  skillBg.setStrokeStyle(1, 
                    isUnlocked ? 0x10b981 : (canUnlock ? 0x3b82f6 : 0x4b5563));
                  this.skillTreeElements.push(skillBg);
                  
                  // Enhanced skill status indicator with glow - SMALLER SIZE
                  const statusIndicator = this.add.circle(skillX + 25, y - 15, 4, 
                    isUnlocked ? 0x10b981 : (canUnlock ? 0x3b82f6 : 0x6b7280));
                  statusIndicator.setDepth(7003);
                  this.skillTreeElements.push(statusIndicator);
                  
                  // Add pulsing glow to unlocked skills - SMALLER SIZE
                  if (isUnlocked) {
                    const statusGlow = this.add.circle(skillX + 25, y - 15, 6, 0x10b981, 0.3);
                    statusGlow.setDepth(7002);
                    this.skillTreeElements.push(statusGlow);
                    
                    this.tweens.add({
                      targets: statusGlow,
                      scaleX: 1.5,
                      scaleY: 1.5,
                      alpha: 0,
                      duration: 1500,
                      repeat: -1,
                      ease: 'Power2'
                    });
                  }
                  
                  // Enhanced skill name with better typography - SMALLER SIZE
                  const skillText = this.add.text(skillX, y - 8, skill.name, {
                    fontFamily: 'Arial Bold',
                    fontSize: '9px',
                    color: isUnlocked ? '#ffffff' : (canUnlock ? '#e2e8f0' : '#9ca3af'),
                    align: 'center',
                    wordWrap: { width: 60 },
                    stroke: '#000000',
                    strokeThickness: 1
                  }).setOrigin(0.5).setDepth(7003);
                  this.skillTreeElements.push(skillText);
                  
                  // Enhanced cost display with modern styling - SMALLER SIZE
                  const costText = this.add.text(skillX, y + 10, `${skill.scoreRequired || 100} ⭐`, {
                    fontFamily: 'Arial Bold',
                    fontSize: '8px',
                    color: isUnlocked ? '#6ee7b7' : (canUnlock ? '#93c5fd' : '#9ca3af'),
                    align: 'center',
                    stroke: '#000000',
                    strokeThickness: 1
                  }).setOrigin(0.5).setDepth(7003);
                  this.skillTreeElements.push(costText);
                  
                  // Make skill interactive with enhanced effects
                  if (!isUnlocked) {
                    skillBg.setInteractive({ useHandCursor: true });
                    
                    skillBg.on('pointerdown', () => {
                      if (canUnlock) {
                        skillTreeManager.unlockSkill(defenderType, skill.id);
                        this.hideSkillTreeOverlay();
                        this.showSkillTreeOverlay(); // Refresh the display
                        if (this.soundManager) {
                          this.soundManager.play('upgrade');
                        }
                      } else {
                        // Show insufficient resources feedback
                        this.showInsufficientResourcesFeedback(skillX, y);
                      }
                    });
                    
                    // Enhanced hover effects with animations
                    skillBg.on('pointerover', () => {
                      if (canUnlock) {
                        skillBg.setFillStyle(0x2563eb);
                        skillBgOuter.setStrokeStyle(4, 0x3b82f6, 0.8);
                        this.tweens.add({
                          targets: [skillBg, skillBgOuter],
                          scaleX: 1.05,
                          scaleY: 1.05,
                          duration: 200,
                          ease: 'Back.easeOut'
                        });
                      }
                      this.showSkillTooltip(skill, skillX, y - 50);
                    });
                    
                    skillBg.on('pointerout', () => {
                      skillBg.setFillStyle(canUnlock ? 0x1e40af : 0x1f2937);
                      skillBgOuter.setStrokeStyle(3, canUnlock ? 0x3b82f6 : 0x374151, 0.6);
                      this.tweens.add({
                        targets: [skillBg, skillBgOuter],
                        scaleX: 1,
                        scaleY: 1,
                        duration: 200,
                        ease: 'Back.easeOut'
                      });
                      this.hideSkillTooltip();
                    });
                  } else {
                    // Add epic glow effect for unlocked skills
                    const glowEffect = this.add.rectangle(skillX, y, 105, 65, 0x10b981, 0.15);
                    glowEffect.setDepth(7001);
                    this.skillTreeElements.push(glowEffect);
                    
                    // Add particle effect for unlocked skills
                    this.createSkillParticles(skillX, y);
                  }
                  
                  skillIndex++;
                });
              });
            }
          });
        }
        
        // Helper method to create progress decorations
        createProgressDecorations() {
          // Add animated corner decorations
          const corners = [
            { x: 120, y: 320 },
            { x: 680, y: 320 },
            { x: 120, y: 380 },
            { x: 680, y: 380 }
          ];
          
          corners.forEach((corner, index) => {
            const decoration = this.add.rectangle(corner.x, corner.y, 8, 8, 0x3b82f6, 0.8);
            decoration.setDepth(7003);
            decoration.setRotation(Math.PI / 4);
            this.skillTreeElements.push(decoration);
            
            // Add rotation animation with delay
            this.tweens.add({
              targets: decoration,
              rotation: decoration.rotation + Math.PI * 2,
              duration: 4000,
              delay: index * 500,
              repeat: -1,
              ease: 'Linear'
            });
          });
        }
        
        // Helper method to create skill particles
        createSkillParticles(x, y) {
          // Create subtle particle effect for unlocked skills
          for (let i = 0; i < 3; i++) {
            const particle = this.add.circle(
              x + (Math.random() - 0.5) * 20,
              y + (Math.random() - 0.5) * 20,
              2,
              0x10b981,
              0.6
            );
            particle.setDepth(7004);
            this.skillTreeElements.push(particle);
            
            this.tweens.add({
              targets: particle,
              y: y - 30,
              alpha: 0,
              scaleX: 0.5,
              scaleY: 0.5,
              duration: 2000 + Math.random() * 1000,
              delay: i * 200,
              ease: 'Power2',
              onComplete: () => {
                if (particle && particle.destroy) {
                  particle.destroy();
                }
              }
            });
          }
        }
        
        getDefenderEmoji(defenderType) {
          const emojis = {
            'CHOG': '🌪️',
            'MOLANDAK': '❄️',
            'MOYAKI': '🔥',
            'KEON': '⚡'
          };
          return emojis[defenderType] || '🛡️';
        }
        
        getDefenderColor(defenderType) {
          const colors = {
            'CHOG': 0x10b981,      // Emerald for wind
            'MOLANDAK': 0x3b82f6,  // Blue for ice
            'MOYAKI': 0xef4444,    // Red for fire
            'KEON': 0xf59e0b       // Amber for lightning
          };
          return colors[defenderType] || 0x6b7280;
        }
        
        getDefenderClass(defenderType) {
          const classes = {
            'CHOG': 'Wind Master',
            'MOLANDAK': 'Ice Guardian',
            'MOYAKI': 'Fire Warrior',
            'KEON': 'Lightning Champion'
          };
          return classes[defenderType] || 'Defender';
        }
        
        showInsufficientResourcesFeedback(x, y) {
          const feedback = this.add.text(x, y - 30, 'Insufficient Score!', {
            fontFamily: 'Arial Bold',
            fontSize: '12px',
            color: '#ef4444',
            backgroundColor: '#1f2937',
            padding: { x: 8, y: 4 }
          }).setOrigin(0.5).setDepth(7004);
          this.skillTreeElements.push(feedback);
          
          // Fade out after 2 seconds
          this.tweens.add({
            targets: feedback,
            alpha: 0,
            duration: 2000,
            onComplete: () => {
              if (feedback && feedback.destroy) {
                feedback.destroy();
              }
            }
          });
        }
        
        showSkillTooltip(skill, x, y) {
          this.hideSkillTooltip(); // Remove any existing tooltip
          
          this.skillTooltip = this.add.rectangle(x + 100, y, 200, 80, 0x000000, 0.9);
          this.skillTooltip.setDepth(7003);
          this.skillTooltip.setStrokeStyle(1, 0xFFFFFF);
          
          this.skillTooltipText = this.add.text(x + 100, y - 20, skill.description, {
            fontFamily: 'Arial',
            fontSize: '10px',
            color: '#FFFFFF',
            wordWrap: { width: 180 }
          }).setOrigin(0.5).setDepth(7004);
          
          this.skillRequirementText = this.add.text(x + 100, y + 15, `Requires: ${skill.scoreRequired} score, ${skill.enemiesRequired} enemies`, {
            fontFamily: 'Arial',
            fontSize: '10px',
            color: '#FFD700',
            wordWrap: { width: 180 }
          }).setOrigin(0.5).setDepth(7004);
        }
        
        hideSkillTooltip() {
          if (this.skillTooltip) {
            this.skillTooltip.destroy();
            this.skillTooltip = null;
          }
          if (this.skillTooltipText) {
            this.skillTooltipText.destroy();
            this.skillTooltipText = null;
          }
          if (this.skillRequirementText) {
            this.skillRequirementText.destroy();
            this.skillRequirementText = null;
          }
        }
        
        hideSkillTreeOverlay() {
          // Clean up all tracked skill tree elements
          if (this.skillTreeElements) {
            this.skillTreeElements.forEach(element => {
              if (element && element.destroy) {
                element.destroy();
              }
            });
            this.skillTreeElements = [];
          }
          
          // Clean up individual references
          this.skillTreeOverlay = null;
          this.skillTreePanel = null;
          this.skillTreeTitle = null;
          this.skillTreeCloseBtn = null;
          
          // Clean up any tooltips
          this.hideSkillTooltip();
          
          // Final cleanup - remove any remaining elements with skill tree depth
          this.children.list.forEach(child => {
            if (child.depth >= 7000 && child.depth < 8000) {
              try {
                child.destroy();
              } catch (e) {
                // Element already destroyed, ignore
              }
            }
          });
        }
        // --- End Skill Tree Methods ---
      }
      
      // Replace the placeholder with the real implementation
      GameScene = GameSceneClient;
      console.log("Client-side GameScene loaded successfully");
    } catch (error) {
      console.error("Error initializing Phaser GameScene:", error);
      // Assign placeholder back if initialization failed
      GameScene = PlaceholderScene;
    }
  }).catch(error => {
    console.error("Failed to load Phaser:", error);
    // Assign placeholder back if Phaser load failed
    GameScene = PlaceholderScene;
  });
} // End of if (isBrowser) block

// Export using ES modules
export { GameScene };