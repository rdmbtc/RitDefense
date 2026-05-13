"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the game context interface
interface GameContextType {
  // Plot and farming
  plots: any[];
  setPlots: (plots: any[]) => void;
  farmCoins: number;
  addFarmCoins: (amount: number) => void;
  seeds: any[];
  selectedSeed: any;
  setSelectedSeed: (seed: any) => void;
  
  // Player stats
  playerLevel: number;
  playerXp: number;
  playerXpToNext: number;
  farmSize: number;
  expandFarm: () => void;
  playerName: string;
  
  // Game stats
  cropsHarvested: number;
  seedsPlanted: number;
  totalCoinsEarned: number;
  incrementCropsHarvested: () => void;
  incrementSeedsPlanted: () => void;
  addCropToInventory: (crop: any) => void;
  
  // Inventory
  cropInventory: any[];
  sellCrop: (cropId: string) => void;
  sellAllCrops: () => void;
  
  // Season and weather
  currentSeason: string;
  setCurrentSeason: (season: string) => void;
  currentWeather: string;
  setCurrentWeather: (weather: string) => void;
  seasonDay: number;
  advanceDay: () => void;
  seasonLength: number;
  
  // Animals
  animals: any[];
  animalProducts: any[];
  animalProductInventory: any[];
  buyAnimal: (animal: any) => void;
  feedAnimal: (animalId: string) => void;
  collectAnimalProduct: (animalId: string) => void;
  sellAnimalProduct: (productId: string) => void;
  sellAllAnimalProducts: () => void;
  
  // Crafting
  craftableItems: any[];
  craftedItemInventory: any[];
  craftItem: (itemId: string) => void;
  sellCraftedItem: (itemId: string) => void;
  sellAllCraftedItems: () => void;
  
  // Boosters
  boosters: any[];
  boostedPlots: any[];
  buyBooster: (boosterId: string) => void;
  applyBooster: (boosterType: string) => void;
  getPlotBoosters: (plotId: number) => any[];
  ownedBoosters: Record<string, number>;
  addCoinsEarned: (amount: number) => void;
}

// Create the context
export const GameContext = createContext<GameContextType | undefined>(undefined);

// Provider component
export function GameProvider({ children }: { children: ReactNode }) {
  // Basic state management
  const [plots, setPlots] = useState<any[]>([]);
  const [farmCoins, setFarmCoins] = useState(100);
  const [seeds] = useState<any[]>([]);
  const [selectedSeed, setSelectedSeed] = useState<any>(null);
  const [playerLevel] = useState(1);
  const [playerXp] = useState(0);
  const [playerXpToNext] = useState(100);
  const [farmSize] = useState(9);
  const [playerName] = useState('Player');
  const [cropsHarvested, setCropsHarvested] = useState(0);
  const [seedsPlanted, setSeedsPlanted] = useState(0);
  const [totalCoinsEarned, setTotalCoinsEarned] = useState(0);
  const [cropInventory] = useState<any[]>([]);
  const [currentSeason, setCurrentSeason] = useState('Spring');
  const [currentWeather, setCurrentWeather] = useState('Sunny');
  const [seasonDay] = useState(1);
  const [seasonLength] = useState(28);
  const [animals] = useState<any[]>([]);
  const [animalProducts] = useState<any[]>([]);
  const [animalProductInventory] = useState<any[]>([]);
  const [craftableItems] = useState<any[]>([]);
  const [craftedItemInventory] = useState<any[]>([]);
  const [boosters] = useState<any[]>([]);
  const [boostedPlots] = useState<any[]>([]);
  const [ownedBoosters] = useState<Record<string, number>>({});

  // Helper functions
  const addFarmCoins = (amount: number) => {
    setFarmCoins(prev => prev + amount);
    setTotalCoinsEarned(prev => prev + amount);
  };

  const expandFarm = () => {
    // Basic farm expansion logic
    console.log('Farm expansion not implemented');
  };

  const incrementCropsHarvested = () => {
    setCropsHarvested(prev => prev + 1);
  };

  const incrementSeedsPlanted = () => {
    setSeedsPlanted(prev => prev + 1);
  };

  const addCropToInventory = (crop: any) => {
    console.log('Add crop to inventory:', crop);
  };

  const sellCrop = (cropId: string) => {
    console.log('Sell crop:', cropId);
  };

  const sellAllCrops = () => {
    console.log('Sell all crops');
  };

  const advanceDay = () => {
    console.log('Advance day');
  };

  const buyAnimal = (animal: any) => {
    console.log('Buy animal:', animal);
  };

  const feedAnimal = (animalId: string) => {
    console.log('Feed animal:', animalId);
  };

  const collectAnimalProduct = (animalId: string) => {
    console.log('Collect animal product:', animalId);
  };

  const sellAnimalProduct = (productId: string) => {
    console.log('Sell animal product:', productId);
  };

  const sellAllAnimalProducts = () => {
    console.log('Sell all animal products');
  };

  const craftItem = (itemId: string) => {
    console.log('Craft item:', itemId);
  };

  const sellCraftedItem = (itemId: string) => {
    console.log('Sell crafted item:', itemId);
  };

  const sellAllCraftedItems = () => {
    console.log('Sell all crafted items');
  };

  const buyBooster = (boosterId: string) => {
    console.log('Buy booster:', boosterId);
  };

  const applyBooster = (boosterType: string) => {
    console.log('Apply booster:', boosterType);
  };

  const getPlotBoosters = (plotId: number) => {
    return [];
  };

  const addCoinsEarned = (amount: number) => {
    addFarmCoins(amount);
  };

  const value: GameContextType = {
    plots,
    setPlots,
    farmCoins,
    addFarmCoins,
    seeds,
    selectedSeed,
    setSelectedSeed,
    playerLevel,
    playerXp,
    playerXpToNext,
    farmSize,
    expandFarm,
    playerName,
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
    animals,
    animalProducts,
    animalProductInventory,
    buyAnimal,
    feedAnimal,
    collectAnimalProduct,
    sellAnimalProduct,
    sellAllAnimalProducts,
    craftableItems,
    craftedItemInventory,
    craftItem,
    sellCraftedItem,
    sellAllCraftedItems,
    boosters,
    boostedPlots,
    buyBooster,
    applyBooster,
    getPlotBoosters,
    ownedBoosters,
    addCoinsEarned,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

// Custom hook to use the game context
export function useGameContext() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}