"use client";

import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useUnifiedNickname } from "@/hooks/useUnifiedNickname";
import { useGameContext } from "@/context/game-context";
import { WalletAuthProvider, useWalletAuth } from "@/context/wallet-auth-context";
import { WalletConnectionOverlay } from "@/components/wallet-connection-overlay";


import toast from "react-hot-toast";
import { 
  Coins, 
  Shield
} from "lucide-react";



// Import the ClientWrapper instead of FarmGame directly
import ClientWrapper from './farm-game/ClientWrapper';




// Define interfaces for the defend farm game
interface Enemy {
  id: string;
  type: 'rabbit' | 'bird' | 'deer' | 'boar';
  health: number;
  posX: number;
  posY: number;
  speed: number;
  isActive: boolean;
}

interface Defense {
  id: string;
  type: 'scarecrow' | 'dog' | 'trap' | 'fence';
  posX: number;
  posY: number;
  range: number;
  isActive: boolean;
}

interface DefendGameState {
  isActive: boolean;
  wave: number;
  day: number;
  score: number;
  lives: number;
  farmCoinsEarned: number;
  enemies: Enemy[];
  defenses: Defense[];
  isPaused: boolean;
  gameOverStatus: boolean;
}

type EnemyType = 'rabbit' | 'bird' | 'deer' | 'boar';
type DefenseType = 'scarecrow' | 'dog' | 'trap' | 'fence';

interface EnemyTypeInfo {
  name: string;
  icon: string;
  health: number;
  speed: number;
  damage: number;
  value: number;
  description: string;
}

interface DefenseTypeInfo {
  name: string;
  icon: string;
  cost: number;
  range: number;
  effectiveness: Record<EnemyType, number>;
  description: string;
}

// Add TypeScript declaration for window extension
declare global {
  interface Window {
    Phaser: any;
    game: any;
    _defendGameFixInterval?: number | NodeJS.Timeout; 
  }
}

// Define the possible active tab values, including the new Noot Gamble types
type ActiveTab = "defend";





// Internal Farm component that requires wallet authentication
function FarmInternal() {
  // --- Wallet Authentication ---
  const { isConnected, isOnCorrectNetwork } = useWalletAuth();
  const isWalletReady = isConnected && isOnCorrectNetwork;

  // --- Guide State ---
  const [showFarmGuide, setShowFarmGuide] = useState(false);

  const handleCloseGuide = () => {
    setShowFarmGuide(false);
  };
  // --- End Guide State ---

  // --- Unified Nickname Management ---
  const { nickname, setNickname } = useUnifiedNickname();

  // --- Local Profile State ---
  const [bio, setBio] = useState<string>("I love farming!");

  useEffect(() => {
    // Load bio from localStorage on mount (nickname is handled by unified hook)
    if (typeof window !== "undefined") {
      const savedBio = localStorage.getItem('player-bio');
      if (savedBio) {
        setBio(savedBio);
      }
      console.log('Bio loaded from localStorage:', savedBio || 'not found');
    }
  }, []); // Only run on mount
  // --- End Local Profile State ---

  // --- Remove Profile from Context Destructuring ---
  const { 
    plots: gamePlots, 
    setPlots: setGamePlots, 
    farmCoins,
    addFarmCoins,
    seeds, // Used by getCropName
    selectedSeed,
    setSelectedSeed,
    playerLevel,
    playerXp,
    playerXpToNext,
    farmSize,
    expandFarm,
    cropsHarvested,
    seedsPlanted,
    totalCoinsEarned,
    incrementCropsHarvested,
    incrementSeedsPlanted,
    addCropToInventory,
    cropInventory,
    sellCrop,
    sellAllCrops,
    currentSeason,
    setCurrentSeason,
    currentWeather,
    setCurrentWeather,
    seasonDay,
    advanceDay,
    seasonLength,
    // Animal-related values
    animals,
    animalProducts,
    animalProductInventory,
    buyAnimal,
    feedAnimal,
    collectAnimalProduct,
    sellAnimalProduct,
    sellAllAnimalProducts,
    // Crafting-related values
    craftableItems,
    craftedItemInventory,
    craftItem,
    sellCraftedItem,
    sellAllCraftedItems,
    // Booster-related values
    boosters,
    boostedPlots,
    buyBooster,
    applyBooster,
    getPlotBoosters,
    ownedBoosters,
    addCoinsEarned,
    // Remove profile context fields
    // nickname: contextNickname, 
    // setNickname: setContextNickname,
    // bio: contextBio, 
    // setBio: setContextBio
  } = useGameContext();
  // --- End Context Destructuring Update ---

  // Nickname synchronization is now handled by the unified hook
  
  
  // Error alert state for farm expansion
  const [expansionError, setExpansionError] = useState<{show: boolean, type: string, message: string} | null>(null);
  
  // Helper function to get booster count
  const getBoosterCount = (boosterType: string) => {
    return ownedBoosters[boosterType] || 0;
  };
  
  // Rebuild the booster popup with a completely different approach
  const showBoosterOptions = (index: number) => {
    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    
    // If not in browser, show a simple fallback
    if (!isBrowser) {
      console.log("Cannot create modal: not in browser environment");
      return;
    }
    
    // Check for active boosters on this plot
    const activeBoosters = getPlotBoosters(index);
    
    // First dismiss any existing toasts
    toast.dismiss();
    
    // Now we know we're in the browser
    // Create a modal container
    const modalContainer = document.createElement('div');
    modalContainer.className = 'fixed inset-0 flex items-center justify-center z-[1000]';
    modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    
    // Create the modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-black border border-gray-700 w-[300px] rounded shadow-lg';
    modalContent.style.position = 'fixed';
    modalContent.style.top = '50%';
    modalContent.style.left = '50%';
    modalContent.style.transform = 'translate(-50%, -50%)';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.display = 'flex';
    modalContent.style.flexDirection = 'column';
    
    // Create the header
    const header = document.createElement('div');
    header.className = 'p-3 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-black';
    header.innerHTML = `
      <h3 class="text-white font-medium flex items-center">
        <span class="mr-2">🚀</span>
        Apply Booster
      </h3>
    `;
    
    // Create the body
    const body = document.createElement('div');
    body.className = 'p-3 overflow-auto';
    body.style.maxHeight = '250px';
    
    // Add booster items
    const availableBoosters = Object.entries(ownedBoosters).filter(([_, count]) => count > 0);
    
    if (availableBoosters.length === 0) {
      // No boosters available
      body.innerHTML = `
        <div class="text-center text-gray-400 p-4">
          <p>No boosters available</p>
          <p class="text-xs mt-1">Purchase boosters from the Boosters tab</p>
        </div>
      `;
    } else {
      // Create booster items
      availableBoosters.forEach(([boosterType, count]) => {
        const booster = boosters.find(b => b.type === boosterType);
        if (!booster || count <= 0) return;
        
        // Check if this booster is already active
        const isActive = activeBoosters.some(ab => ab.boosterType === boosterType);
        
        const boosterItem = document.createElement('div');
        boosterItem.className = `flex items-center justify-between p-2 border mb-2 hover:border-white cursor-pointer ${
          isActive ? 'border-yellow-500 bg-yellow-900/20' : 'border-gray-700 bg-gray-900'
        }`;
        
        boosterItem.innerHTML = `
          <div class="flex items-center">
            <div class="w-8 h-8 flex items-center justify-center text-xl mr-2 bg-black border border-gray-700">
              ${booster.icon}
            </div>
            <div>
              <div class="text-white text-sm">${booster.name}</div>
              <div class="text-gray-400 text-xs">Qty: ${count}</div>
            </div>
          </div>
          ${!isActive ? `
            <div class="bg-blue-900/30 px-2 py-1 border border-blue-500/50 text-blue-300 text-xs">
              Apply
            </div>
          ` : ''}
        `;
        
        // Add click handler
        boosterItem.addEventListener('click', () => {
          if (!isActive) {
            // Apply booster
            applyBooster(boosterType);
            
            // Remove modal
            document.body.removeChild(modalContainer);
            
            // Show success toast
            toast.success(`Applied ${booster.name} to your crop!`);
          } else {
            toast.error(`This booster is already active!`);
          }
        });
        
        body.appendChild(boosterItem);
      });
    }
    
    // Create the footer
    const footer = document.createElement('div');
    footer.className = 'p-2 border-t border-gray-700 flex justify-end';
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.className = 'bg-white text-black hover:bg-gray-200 text-xs px-2 py-1 rounded';
    closeButton.textContent = 'Close';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modalContainer);
    });
    
    footer.appendChild(closeButton);
    
    // Add elements to modal
    modalContent.appendChild(header);
    modalContent.appendChild(body);
    modalContent.appendChild(footer);
    modalContainer.appendChild(modalContent);
    
    // Add modal to body
    document.body.appendChild(modalContainer);
    
    // Add click handler to close when clicking outside
    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) {
        document.body.removeChild(modalContainer);
      }
    });
  };
  
  // Add this code in useEffect to ensure the user has some boosters for testing
  // Add after other useEffect declarations

  // Add a function to give emergency coins
  const handleEmergencyCoins = () => {
    // Give the player some emergency coins
    addFarmCoins(100);
    addCoinsEarned(100);
    
    toast.success("Emergency funds: +100 coins!", { 
      icon: "💰",
      duration: 3000 
    });
  };
  
                         
  
  // Add Defend Farm game state
  const [defendGameState, setDefendGameState] = useState<DefendGameState>({
    isActive: false,
    wave: 1,
    day: 1,
    score: 0,
    lives: 5,
    farmCoinsEarned: 0,
    enemies: [],
    defenses: [],
    isPaused: false,
    gameOverStatus: false
  });
  
  // Enemy types for the defend farm game
  const enemyTypes: Record<EnemyType, EnemyTypeInfo> = {
    rabbit: { 
      name: "Rabbit", 
      icon: "🐰", 
      health: 1, 
      speed: 8, 
      damage: 1,
      value: 2,
      description: "Fast but weak; nibbles at crops"
    },
    bird: { 
      name: "Bird", 
      icon: "🐦", 
      health: 1, 
      speed: 10, 
      damage: 1,
      value: 2,
      description: "Flies in to peck at seeds" 
    },
    deer: { 
      name: "Deer", 
      icon: "🦌", 
      health: 3, 
      speed: 5, 
      damage: 2,
      value: 5,
      description: "Tougher; tramples fields" 
    },
    boar: { 
      name: "Boar", 
      icon: "🐗", 
      health: 5, 
      speed: 3, 
      damage: 3,
      value: 10,
      description: "Destroys structures and crops" 
    }
  };
  
  // Defense types for defend farm game
  const defenseTypes: Record<DefenseType, DefenseTypeInfo> = {
    scarecrow: {
      name: "Scarecrow",
      icon: "🎭",
      cost: 15,
      range: 100,
      effectiveness: {
        bird: 0.8,
        rabbit: 0.2,
        deer: 0.1,
        boar: 0
      },
      description: "Deters birds effectively"
    },
    dog: {
      name: "Farm Dog",
      icon: "🐕",
      cost: 25,
      range: 150,
      effectiveness: {
        bird: 0.3,
        rabbit: 0.9,
        deer: 0.4,
        boar: 0.2
      },
      description: "Chases away small animals"
    },
    trap: {
      name: "Trap",
      icon: "🪤",
      cost: 20,
      range: 50,
      effectiveness: {
        bird: 0.1,
        rabbit: 0.7,
        deer: 0.6,
        boar: 0.3
      },
      description: "Catches smaller pests"
    },
    fence: {
      name: "Strong Fence",
      icon: "🧱",
      cost: 35,
      range: 200,
      effectiveness: {
        bird: 0.1,
        rabbit: 0.5,
        deer: 0.8,
        boar: 0.6
      },
      description: "Blocks larger animals"
    }
  };
  
  // Initialize the defend game
  const startDefendGame = () => {
    // Set up initial state
    setDefendGameState({
      isActive: true,
      wave: 1,
      day: 1,
      score: 0,
      lives: 5,
      farmCoinsEarned: 0,
      enemies: [],
      defenses: [],
      isPaused: false,
      gameOverStatus: false
    });

    // Apply mage and selection tool fixes when defend game starts
    if (typeof window !== 'undefined') {
      // Add a small delay to ensure the game is initialized
      setTimeout(() => {
        console.log("Applying defense game fixes...");
        
        // Fix for mages not attacking
        const applyMageFixes = () => {
          if (!window.Phaser) return;
          
          const game = window.game || (window.Phaser.Game && window.Phaser.Game.instance);
          if (!game || !game.scene) return;
          
          // Find any Defense class or mage objects
          game.scene.scenes.forEach((scene: any) => {
            // Find Defense class
            let Defense: any = null;
            if (scene.Defense) Defense = scene.Defense;
            
            // Look in registry
            if (scene.registry && scene.registry.get && scene.registry.get('Defense')) {
              Defense = scene.registry.get('Defense');
            }
            
            // Fix Defense class if found
            if (Defense && Defense.prototype) {
              // Skip if already fixed
              if (Defense._mageFixes) return;
              Defense._mageFixes = true;
              
              // Fix createProjectile
              if (typeof Defense.prototype.createProjectile === 'function') {
                const originalCreateProjectile = Defense.prototype.createProjectile;
                
                // Add type annotation for enemy
                Defense.prototype.createProjectile = function(enemy: any) { 
                  try {
                    // Ensure scene and enemy exist
                    if (!this.scene || !this.scene.add || !enemy) return null;
                    
                    // Create projectile safely
                    let projectile;
                    try {
                      // Use safe methods to create projectile
                      projectile = this.scene.add.circle(this.x, this.y, 5, 0x00ffff);
                      projectile.setDepth(5);
                    } catch (e) {
                      console.error("Error creating projectile:", e);
                      return null;
                    }
                    
                    if (!projectile) return null;
                    
                    // Set up projectile
                    projectile.targetEnemy = enemy;
                    projectile.damage = this.damage || 15;
                    
                    // Get safe enemy position
                    const enemyX = enemy.x || (enemy.container && enemy.container.x) || 400;
                    const enemyY = enemy.y || (enemy.container && enemy.container.y) || 300;
                    
                    // Projectile physics
                    const dx = enemyX - this.x;
                    const dy = enemyY - this.y;
                    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
                    const speed = 5;
                    projectile.vx = (dx / distance) * speed;
                    projectile.vy = (dy / distance) * speed;
                    
                    // Add to scene projectiles
                    if (!this.scene.projectiles) this.scene.projectiles = [];
                    this.scene.projectiles.push(projectile);
                    
                    // Update function
                    // Add type annotation for delta
                    projectile.update = function(delta: number) { 
                      delta = delta || 1/60;
                      
                      // Move projectile
                      this.x += this.vx * delta;
                      this.y += this.vy * delta;
                      
                      // Skip if enemy is gone
                      if (!enemy || !enemy.active) {
                        this.destroy();
                        return;
                      }
                      
                      // Hit detection
                      const hitX = enemy.x || (enemy.container && enemy.container.x);
                      const hitY = enemy.y || (enemy.container && enemy.container.y);
                      
                      if (hitX && hitY) {
                        const dx = this.x - hitX;
                        const dy = this.y - hitY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        if (distance < 30) {
                          // Hit enemy
                          if (typeof enemy.takeDamage === 'function') {
                            enemy.takeDamage(this.damage);
                          }
                          this.destroy();
                        }
                      }
                      
                      // Destroy if offscreen
                      if (this.x < 0 || this.x > 800 || this.y < 0 || this.y > 600) {
                        this.destroy();
                      }
                    };
                    
                    return projectile;
                  } catch (error) {
                    console.error("Error in createProjectile:", error);
                    return null;
                  }
                };
              }
              
              // Fix mage update to always attack
              if (typeof Defense.prototype.update === 'function') {
                const originalUpdate = Defense.prototype.update;
                
                // Add type annotation for delta
                Defense.prototype.update = function(delta: number) { 
                  // Force activation for mages
                  if (this.type === 'mage') {
                    this.active = true;
                    
                    // Force attack with super range
                    if (typeof this.attackNearestEnemy === 'function') {
                      this.attackNearestEnemy(true);
                    }
                  }
                  
                  // Call original update
                  if (originalUpdate) originalUpdate.call(this, delta);
                };
              }
            }
            
            // Fix selection tool
            if (scene.input) {
              scene.input.enabled = true;
            }
          });
        };
        
        // Fix game over z-index
        const fixGameOverZIndex = () => {
          if (!window.Phaser) return;
          
          const game = window.game || (window.Phaser.Game && window.Phaser.Game.instance);
          if (!game || !game.scene) return;
          
          game.scene.scenes.forEach((scene: any) => {
            if (!scene || !scene.children || !scene.children.list) return;
            
            // Find highest depth
            let maxDepth = 10;
            // Add type annotation for child
            scene.children.list.forEach((child: any) => {
              if (child.depth > maxDepth) maxDepth = child.depth;
            });
            
            // Set UI much higher
            const uiDepth = maxDepth + 1000;
            
            // Fix all texts
            // Add type annotation for child
            scene.children.list.forEach((child: any) => {
              if (child.type === 'Text' && typeof child.setDepth === 'function') {
                if (child.text && (
                    child.text.includes('GAME OVER') || 
                    child.text.includes('Game Over') ||
                    child.text.includes('Score'))) {
                  child.setDepth(uiDepth);
                }
              }
            });
          });
        };
        
        // Apply fixes now and periodically
        applyMageFixes();
        fixGameOverZIndex();
        
        // Reapply fixes periodically
        const fixInterval = setInterval(() => {
          applyMageFixes();
          fixGameOverZIndex();
        }, 2000);
        
        // Store the interval for cleanup
        window._defendGameFixInterval = fixInterval;
      }, 1000);
    }

    // Start the first wave
    startNewWave();
  };
  
  // Start a new wave of enemies
  const startNewWave = () => {
    // Generate enemies based on current wave
    const numberOfEnemies = 3 + Math.floor(defendGameState.wave * 1.5);
    const newEnemies: Enemy[] = [];
    
    for (let i = 0; i < numberOfEnemies; i++) {
      // Determine enemy type based on wave difficulty
      let enemyType: EnemyType;
      const rand = Math.random();
      
      if (defendGameState.wave < 3) {
        // Early waves: mostly rabbits and birds
        enemyType = rand < 0.7 ? "rabbit" : "bird";
      } else if (defendGameState.wave < 6) {
        // Middle waves: add deer
        if (rand < 0.5) enemyType = "rabbit";
        else if (rand < 0.8) enemyType = "bird";
        else enemyType = "deer";
      } else {
        // Later waves: add boars
        if (rand < 0.3) enemyType = "rabbit";
        else if (rand < 0.6) enemyType = "bird";
        else if (rand < 0.85) enemyType = "deer";
        else enemyType = "boar";
      }
      
      // Random position (left side of screen)
      const posY = 100 + Math.random() * 400;
      
      newEnemies.push({
        id: `enemy-${Date.now()}-${i}`,
        type: enemyType,
        health: enemyTypes[enemyType].health,
        posX: -50, // Start off-screen
        posY: posY,
        speed: enemyTypes[enemyType].speed * (0.8 + Math.random() * 0.4), // Some speed variation
        isActive: true
      });
    }
    
    setDefendGameState(prevState => ({
      ...prevState,
      enemies: newEnemies
    }));
  };
  
  // Handle swatting/clicking an enemy
  const handleSwatEnemy = (enemyId: string) => {
    setDefendGameState(prevState => {
      const updatedEnemies = prevState.enemies.map(enemy => {
        if (enemy.id === enemyId && enemy.isActive) {
          // Reduce health and check if defeated
          const newHealth = enemy.health - 1;
          if (newHealth <= 0) {
            // Enemy defeated
            const enemyValue = enemyTypes[enemy.type].value;
            toast.success(`+${enemyValue} coins!`, { duration: 1000 });
            return {
              ...enemy,
              isActive: false,
              health: 0
            };
          }
          return {
            ...enemy,
            health: newHealth
          };
        }
        return enemy;
      });
      
      // Count defeated enemies
      const defeatedCount = updatedEnemies.filter(e => !e.isActive).length;
      const totalEnemies = updatedEnemies.length;
      
      // Calculate new score
      const newScore = prevState.score + 10;
      
      // Calculate coins earned
      const newlyDefeatedEnemies = updatedEnemies.filter(e => 
        !e.isActive && 
        prevState.enemies.find(pe => pe.id === e.id)?.isActive === true
      );
      
      const coinsEarned = prevState.farmCoinsEarned + newlyDefeatedEnemies.reduce(
        (total, e) => total + enemyTypes[e.type].value, 
        0
      );
      
      // Check if wave is complete
      if (defeatedCount === totalEnemies && totalEnemies > 0) {
        // Wave completed
        toast.success(`Wave ${prevState.wave} completed!`, { 
          duration: 3000,
          icon: '🎉' 
        });
        
        // Start next wave after delay
        setTimeout(() => {
          setDefendGameState(prev => ({
            ...prev,
            wave: prev.wave + 1,
            enemies: []
          }));
          startNewWave();
        }, 3000);
      }
      
      return {
        ...prevState,
        enemies: updatedEnemies,
        score: newScore,
        farmCoinsEarned: coinsEarned
      };
    });
  };
  
  // Place a defense
  const placeDefense = (defenseType: DefenseType, posX: number, posY: number) => {
    // Check if player has enough coins
    if (farmCoins < defenseTypes[defenseType].cost) {
      toast.error(`Not enough coins to place ${defenseTypes[defenseType].name}!`, {
        duration: 2000
      });
      return;
    }
    
    // Subtract cost from coins
    addFarmCoins(-defenseTypes[defenseType].cost);
    
    // Add the defense
    setDefendGameState(prev => ({
      ...prev,
      defenses: [
        ...prev.defenses,
        {
          id: `defense-${Date.now()}`,
          type: defenseType,
          posX: posX,
          posY: posY,
          range: defenseTypes[defenseType].range,
          isActive: true
        }
      ]
    }));
    
    toast.success(`${defenseTypes[defenseType].name} placed!`, {
      duration: 2000
    });
  };
  
  // End game and collect rewards
  // Use clientSide state to prevent hydration mismatch
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    // This runs only on the client, after hydration
    setIsClient(true);
  }, []);
  
  // Add client-side state for player level to prevent hydration mismatch
  const [clientPlayerLevel, setClientPlayerLevel] = useState(0);
  const [clientDisplayXp, setClientDisplayXp] = useState(0);
  const [clientXpToNext, setClientXpToNext] = useState(100);
  
  // Update client player level after mount
  useEffect(() => {
    setClientPlayerLevel(playerLevel);
    setClientDisplayXp(playerXp);
    setClientXpToNext(playerXpToNext);
  }, [playerLevel, playerXp, playerXpToNext]);
  
  // Active tab state - simplified to only handle defend tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("defend");
  
  // Log activeTab changes
  useEffect(() => {
    console.log("[farm.tsx] Active tab changed to:", activeTab);
  }, [activeTab]);
  
  // Helper to get crop name from type
  const getCropName = (cropType: string) => {
    const seed = seeds.find(s => s.type === cropType);
    return seed ? seed.name : cropType;
  };

  const endDefendGame = (wasSuccessful: boolean) => {
    // Clear any fix intervals
    if (typeof window !== 'undefined' && window._defendGameFixInterval) {
      clearInterval(window._defendGameFixInterval);
      // Assign undefined instead of null
      window._defendGameFixInterval = undefined;
    }

    // Update state to end the game
    setDefendGameState(prev => ({
      ...prev,
      isActive: false,
      gameOverStatus: true
    }));
  };

  // Add state for defend guide
  const [showDefendGuide, setShowDefendGuide] = useState(false);

  const handleCloseDefendGuide = () => {
    setShowDefendGuide(false);
  };

  // Add the guide modals to the JSX after the existing guides
  {/* Guide modals removed - components don't exist */}

  return (
    <div className="flex flex-col min-h-screen bg-black overflow-x-hidden text-white">
      {/* Wallet Connection Overlay */}
      {!isWalletReady && (
        <WalletConnectionOverlay 
          isVisible={!isWalletReady} 
          onClose={() => {}} 
        />
      )}

      {/* Disable all interactions when wallet is not ready */}
      <div className={!isWalletReady ? "pointer-events-none opacity-50" : ""}>
        {/* Expansion error alert */}
        {expansionError && expansionError.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" 
             onClick={() => setExpansionError(null)}>
          <div className="absolute inset-0 bg-black bg-opacity-70"></div>
          <div 
            className="relative z-10 p-6 border-2 animate-pulse max-w-md w-full mx-4"
            style={{ 
              borderColor: expansionError.type === 'level' ? '#ff4444' : '#ff9900',
              backgroundColor: expansionError.type === 'level' ? '#330000' : '#332200'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start mb-4">
              <div className="mr-3 text-4xl">
                {expansionError.type === 'level' ? '🔒' : '💰'}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {expansionError.type === 'level' ? 'Level Locked!' : 'Not Enough Coins!'}
                </h3>
                <p className="text-white">{expansionError.message}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                className="bg-white text-black px-4 py-2"
                onClick={() => setExpansionError(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sticky navigation bar - Use context nickname */}
      <header className="sticky top-0 z-10 bg-black border-b border-[#333]"> 
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Mon Defense Farm</h1>
            <div className="text-white">{nickname || 'Player'}</div>
          </div>
        </div>
      </header>
      
     
      
      {/* Main tabbed interface */}
      <div className="container mx-auto py-6 px-4 flex-grow">
        <div className="relative flex flex-wrap w-full bg-[#111] border border-[#333] mb-6 noot-text"> {/* Added relative positioning */}
          {/* Defend Your Farm Button */}
          <button 
            onClick={() => setActiveTab("defend")}
            className={`px-3 py-2 sm:px-4 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm ${activeTab === "defend" ? "bg-white text-black" : "text-white/80 hover:bg-[#222] hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"} transition-all duration-200`}
          >
            <Shield className="h-3 w-3 sm:h-4 sm:w-4" />
            Defend Your Farm
          </button>



        </div>
        


        
       
            
         
           
             
          
        
        
     
            
            
       
      

        {/* Defend Farm Tab - Conditionally Render ClientWrapper */}
        {activeTab === "defend" && (
          // Log when this section renders
          (() => {
            console.log("[farm.tsx] Rendering Defend Farm tab content (ClientWrapper)");
            return (
              <div className="space-y-4 animate-fadeIn"> 
                <h2 className="text-xl font-semibold text-white border-b border-white/10 pb-2">
                  Defend Your Farm
                </h2>
                <div className="noot-card p-1 overflow-hidden">
                  {isClient ? (
                    <div className="w-full max-w-full overflow-x-auto">
                      <ClientWrapper 
                         key="defend-game-instance" 
                         farmCoins={farmCoins} 
                         addFarmCoins={addFarmCoins}
                      />
                    </div>
                  ) : (
                     <LoadingPlaceholder />
                  )}
                </div>
              </div>
            );
          })()
        )}
        
        
       

        
        
       

        
      </div>
      
      <footer className="bg-black border-t border-[#333] py-3 px-4"> 
        {/* Remove key={`footer-${profileVersion}`} */}
        <div className="container mx-auto flex justify-between items-center">
          <div className="text-sm text-white/60">
            Rit Defense - First Ritual farming Playground on Ritual Testnet
          </div>
          
          <div className="flex items-center gap-2">
            {/* XP Progress */}
            <div className="border border-[#333] h-6 flex items-center text-white text-xs noot-text overflow-hidden" style={{ width: '180px' }}>
              <div className="w-5 h-5 rounded-none bg-white text-black flex items-center justify-center text-xs font-medium noot-title shrink-0 level-indicator">
                {typeof window !== 'undefined' ? clientPlayerLevel : 0}
              </div>
              <div className="flex-1 relative h-full">
                <div 
                  className="h-full bg-white/20 absolute top-0 left-0 xp-progress-bar"
                  style={{ width: `${Math.max(Math.min(((typeof window !== 'undefined' ? clientDisplayXp : 0) / (typeof window !== 'undefined' ? clientXpToNext : 100)) * 100, 100), 0)}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-center whitespace-nowrap px-1 text-white/80">
                  {typeof window !== 'undefined' ? clientDisplayXp : 0}/{typeof window !== 'undefined' ? clientXpToNext : 100} XP
                </div>
              </div>
            </div>
            
            {/* Coins display */}
            <div className="border border-[#333] px-2 py-1 flex items-center gap-1 text-white text-sm noot-text">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span>{farmCoins}</span>
            </div>
          </div>
        </div>
      </footer>
      
    
     

    

      {/* Defend Your Farm Guide Modal - Removed due to missing components */}
      {/* showDefendGuide && GuideModal components removed */}
      </div> {/* Close the pointer-events-none div */}
    </div>
  );
}

// Main Farm component with wallet authentication wrapper
export function Farm() {
  return (
    <WalletAuthProvider>
      <FarmInternal />
    </WalletAuthProvider>
  );
}

// Ensure LoadingPlaceholder is defined within or imported into farm.tsx if used here
function LoadingPlaceholder() {
  return (
    <div className="w-full h-[400px] sm:h-[500px] md:h-[600px] flex items-center justify-center bg-black/20 border border-white/10">
      <div className="text-white text-center px-4">
        <div className="mb-4">Loading farm defense...</div>
      </div>
    </div>
  );
}