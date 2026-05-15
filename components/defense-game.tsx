"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useGameContext } from "@/context/game-context";
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useWallet } from '@/components/client-providers';
import { useGameSession } from '@/hooks/useGameSession';
import { usePlayerTotalScore } from '@/hooks/usePlayerTotalScore';
import { useCrossAppAccount } from '@/hooks/useCrossAppAccount';
import { useUsername } from '@/hooks/useUsername';
import { useOnchainScoreSubmissionWithRetry } from '@/hooks/useOnchainScoreSubmission';
import { GAME_CONFIG } from '@/lib/game-config';



// Extend Window interface to include custom properties
declare global {
  interface Window {
    _defenseMode?: boolean;
    _farmMode?: boolean;
    secureSubmitScore?: (score: number, transactionCount: number, gameStateHash: string) => boolean;
    skillTreeManager?: any;
  }
}

// Dynamically import the ClientWrapper to avoid SSR issues
const ClientWrapper = dynamic(() => import('./farm-game/ClientWrapper'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gradient-to-b from-blue-900 to-purple-900">
      <div className="text-white text-center">
        <div className="mb-4">Loading Defense Game...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
      </div>
    </div>
  )
});

import { DefenseGameProps, GameEventType } from '@/types';

export default function DefenseGame({ onBack, onGameEnd }: DefenseGameProps) {
  const [gameMode, setGameMode] = useState<'chapter' | 'game'>('chapter');
  const [chapterIndex, setChapterIndex] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState('menu');
  const [skillTreeVisible, setSkillTreeVisible] = useState(false);
  const { farmCoins, addFarmCoins } = useGameContext();
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const soundEffectRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicPlayPromise = useRef<Promise<void> | null>(null);
  const soundEffectPlayPromise = useRef<Promise<void> | null>(null);
  const skillTreeManagerRef = useRef<any>(null);
  
  // Audio state management
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [firstChapterInteraction, setFirstChapterInteraction] = useState(true);
  
  // API integration state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isProcessingChapter, setIsProcessingChapter] = useState(false);
  
  // Use custom hooks for API integration
  const { connected: isConnected, address: walletAddress, connect } = useWallet();
  const { data: usernameData, error: usernameError, isLoading: usernameLoading } = useUsername(walletAddress);
  const { data: playerStats } = usePlayerTotalScore(walletAddress, gameStarted, false);

  const gameSession = useGameSession(sessionToken);
  const onchainSubmission = useOnchainScoreSubmissionWithRetry();
  
  // Debug username retrieval
  console.log('Username debug info:', {
    walletAddress,
    usernameData,
    usernameError,
    usernameLoading,
    isConnected
  });
  
  // Improved username logic with better fallback handling
  const username = usernameData?.user?.username || null;
  const displayName = username || (walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Anonymous');



  

  // Audio is now handled directly in nextChapterSlide on user interaction

  // Note: Audio is now handled in nextChapterSlide on user interaction
  // This prevents browser autoplay restrictions

  // Start game session when user is isConnected
  useEffect(() => {
    if (isConnected && walletAddress && !sessionId) {
      gameSession.startGameSession.mutate({ walletAddress });
    }
  }, [isConnected, walletAddress, sessionId]);

  // Handle session token from game session hook
  useEffect(() => {
    if (gameSession.startGameSession.data?.sessionToken) {
      setSessionToken(gameSession.startGameSession.data.sessionToken);
      setSessionId(gameSession.startGameSession.data.sessionId);
    }
  }, [gameSession.startGameSession.data]);

  // Listen for session token refresh events
  useEffect(() => {
    const handleSessionTokenRefresh = (event: CustomEvent) => {
      const { sessionToken: newToken, sessionId: newSessionId } = event.detail;
      console.log('Session token refreshed, updating state:', { newToken, newSessionId });
      setSessionToken(newToken);
      setSessionId(newSessionId);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('sessionTokenRefreshed', handleSessionTokenRefresh as EventListener);
      
      return () => {
        window.removeEventListener('sessionTokenRefreshed', handleSessionTokenRefresh as EventListener);
      };
    }
  }, []);

  // Handle score submission using both API and on-chain submission
  const handleScoreSubmission = useCallback(async (score: number, transactionCount: number = 1, gameStateHash?: string): Promise<boolean> => {
    // Prevent multiple submissions
    if (isSubmitting) {
      console.log('Score submission already in progress, ignoring duplicate call');
      return false;
    }

    // Enhanced authentication checks
    if (!isConnected || !walletAddress || !sessionToken || !sessionId) {
      console.error('Missing required data for score submission:', {
        isConnected,
        walletAddress: !!walletAddress,
        sessionToken: !!sessionToken,
        sessionId: !!sessionId
      });
      toast.error('Please connect your wallet to submit scores!');
      connect();
      return false;
    }

    // Anti-cheat validation: Check if score is reasonable
    const sessionDuration = gameStartTime ? Date.now() - gameStartTime : 0;
    const maxReasonableScore = Math.floor(sessionDuration / 1000) * 50; // Max 50 points per second
    
    if (score > maxReasonableScore) {
      console.warn('Score submission rejected: unrealistic score', { score, maxReasonableScore, sessionDuration });
      toast.error('Score submission failed: Invalid score detected');
      return false;
    }

    // Validate minimum game time (prevent instant high scores)
    if (sessionDuration < 10000) { // Minimum 10 seconds
      console.warn('Score submission rejected: game too short', { sessionDuration });
      toast.error('Score submission failed: Play longer to submit scores');
      return false;
    }

    // Check if user has a registered username (optional - allow submission without username)
    if (!username) {
      console.log('No username found, but allowing score submission with wallet address');
      toast.info('Connect your wallet to track your scores!');
    }

    try {
      setIsSubmitting(true);
      console.log('Submitting score via API and on-chain:', score);
      
      // Submit to existing API with timestamp and additional security data
      const timestamp = Date.now();
      
      await gameSession.submitScore.mutateAsync({
        player: walletAddress,
        scoreAmount: score,
        transactionAmount: transactionCount,
        sessionId: sessionId,
        timestamp: timestamp,
        sessionDuration: sessionDuration,
        gameStartTime: gameStartTime || timestamp,
        // Add security metadata
        securityMetadata: {
          gameStateHash: gameStateHash || 'unknown',
          clientTimestamp: timestamp,
          sessionStartTime: gameStartTime || undefined,
          submissionSource: 'game_engine',
          gameplayMetrics: {
            totalClicks: 0, // TODO: Track actual clicks
            averageReactionTime: 0, // TODO: Track actual reaction time
            gameplayPattern: 'normal' // TODO: Analyze gameplay pattern
          }
        }
      });

      // Submit to smart contract on Ritual chain
      try {
        const onchainResult = await onchainSubmission.submitWithRetry(
          walletAddress,
          score,
          transactionCount,
          2, // max retries
          timestamp // include timestamp for anti-replay protection
        );
        
        if (onchainResult.success) {
          console.log('On-chain submission successful:', {
            transactionHash: onchainResult.transactionHash,
            gameId: GAME_CONFIG.BLOCKCHAIN.GAME_ID
          });
          toast.success(`Score submitted! TX: ${onchainResult.transactionHash?.slice(0, 8)}...`);
        } else {
          console.warn('On-chain submission failed, but API submission succeeded');
          toast.success('Score submitted to API (on-chain failed)');
        }
      } catch (onchainError) {
        console.warn('On-chain submission failed:', onchainError);
        toast.success('Score submitted to API (on-chain failed)');
      }

      setHasSubmittedScore(true);
      return true;
    } catch (error) {
      console.error('Error submitting score:', error);
      toast.error('Score submission failed');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [walletAddress, sessionToken, sessionId, gameSession.submitScore, isSubmitting]);



  useEffect(() => {
    // Initialize game state for defense mode when game starts
    if (gameMode === 'game') {
      if (typeof window !== 'undefined') {
        // Set up defense-specific global state
        window._defenseMode = true;
        window._farmMode = false;
        
        // Initialize skill tree manager
        if (!window.skillTreeManager) {
          const SkillTreeManager = require('./skill-tree/SkillTreeManager').default;
          window.skillTreeManager = new SkillTreeManager();
        }
        skillTreeManagerRef.current = window.skillTreeManager;
      }
      
      // Set game start time when switching to game mode
      setGameStartTime(Date.now());
      
      // Reset submission state for new game
      setHasSubmittedScore(false);
      
      // SECURE: Use custom events instead of global function
      const handleScoreSubmissionEvent = async (event: Event) => {
        const customEvent = event as CustomEvent;
        const { score, transactionCount, gameStateHash } = customEvent.detail;
        
        try {
          await handleScoreSubmission(score, transactionCount, gameStateHash);
        } catch (error) {
          console.error('Error in secure score submission:', error);
        }
      };

      // Add secure event listener
      window.addEventListener('gameScoreSubmission', handleScoreSubmissionEvent);
      
      // Provide a secure submission method for the game engine
      window.secureSubmitScore = (score: number, transactionCount: number, gameStateHash: string) => {
        // Validate parameters
        if (typeof score !== 'number' || score < 0 || score > 999999) {
          console.warn('Invalid score parameter blocked');
          return false;
        }
        
        if (typeof transactionCount !== 'number' || transactionCount < 0 || transactionCount > 100) {
          console.warn('Invalid transaction count parameter blocked');
          return false;
        }

        // Dispatch secure event
        const event = new CustomEvent('gameScoreSubmission', {
          detail: { score, transactionCount, gameStateHash }
        });
        window.dispatchEvent(event);
        return true;
      };
      
      return () => {
        // Clean up event listener and secure function
        window.removeEventListener('gameScoreSubmission', handleScoreSubmissionEvent);
        if (window.secureSubmitScore) {
          delete window.secureSubmitScore;
        }
      };
    }

    return () => {
      // Cleanup when component unmounts
      if (typeof window !== 'undefined') {
        window._defenseMode = false;
        
        // Clean up any running game instances
        if (window.game && window.game.destroy) {
          try {
            window.game.destroy(true);
            window.game = null;
          } catch (error) {
            console.warn('Error destroying game:', error);
          }
        }

        // Clean up secure submission system
        if (window.secureSubmitScore) {
          delete window.secureSubmitScore;
        }
      }
      
      // Clean up audio
      if (backgroundMusicRef.current) {
        try {
          // Wait for any ongoing play promise to resolve first
          if (backgroundMusicPlayPromise.current) {
            backgroundMusicPlayPromise.current.catch(() => {}).then(() => {
              if (backgroundMusicRef.current) {
                backgroundMusicRef.current.pause();
              }
              backgroundMusicPlayPromise.current = null;
            });
          } else {
            backgroundMusicRef.current.pause();
            backgroundMusicPlayPromise.current = null;
          }
        } catch (e) {
          // Ignore pause errors
        }
      }
      if (soundEffectRef.current) {
        try {
          // Wait for any ongoing play promise to resolve first
          if (soundEffectPlayPromise.current) {
            soundEffectPlayPromise.current.catch(() => {}).then(() => {
              if (soundEffectRef.current) {
                soundEffectRef.current.pause();
              }
              soundEffectPlayPromise.current = null;
            });
          } else {
            soundEffectRef.current.pause();
            soundEffectPlayPromise.current = null;
          }
        } catch (e) {
          // Ignore pause errors
        }
      }
    };
  }, [gameMode, walletAddress, sessionToken, sessionId, hasSubmittedScore, isSubmitting, handleScoreSubmission]);



  // Chapter assets for the intro
  const chapterAssets = [
    {
      image: '/BG/background_menu.jpg',
      title: 'Chapter One: The Awakening',
      description: 'The ritual has begun. The garden is no longer safe.',
      sound: '/assets/sounds/game/wave_start.mp3'
    },
    {
      image: '/BG/background_menu.jpg',
      title: 'The Defenders Rise',
      description: 'Choose your defenders wisely. Each has unique powers.',
      sound: '/assets/sounds/game/plant.mp3'
    }
  ];

  // Function to handle chapter slide progression
  const nextChapterSlide = async () => {
    if (isProcessingChapter) return;
    
    if (chapterIndex === chapterAssets.length - 1 && (!isConnected || !walletAddress)) {
      toast.error('Please connect your wallet to continue!');
      connect();
      return;
    }

    try {
      setIsProcessingChapter(true);
      
      if (soundEffectRef.current) {
        soundEffectRef.current.pause();
        soundEffectRef.current.currentTime = 0;
      }

      if (chapterIndex < chapterAssets.length - 1) {
        const nextIndex = chapterIndex + 1;
        setChapterIndex(nextIndex);
        
        if (chapterAssets[nextIndex].sound) {
          soundEffectRef.current = new Audio(chapterAssets[nextIndex].sound);
          soundEffectRef.current.volume = 0.7;
          soundEffectPlayPromise.current = soundEffectRef.current.play();
          await soundEffectPlayPromise.current;
        }
      } else {
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.pause();
          backgroundMusicRef.current.currentTime = 0;
        }
        
        setGameMode('game');
        setGameStarted(true);
      }
    } catch (error) {
      console.warn('Chapter navigation error:', error);
      if (chapterIndex === chapterAssets.length - 1) {
        setGameMode('game');
        setGameStarted(true);
      }
    } finally {
      setIsProcessingChapter(false);
    }
  };

  // Spacebar listener for chapter navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameMode === 'chapter') {
        nextChapterSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameMode, chapterIndex, isConnected, walletAddress, isProcessingChapter]);

  const handleBackToMenu = () => {
    // Clean up game before going back
    if (typeof window !== 'undefined' && window.game) {
      try {
        window.game.destroy(true);
        window.game = null;
      } catch (error) {
        console.warn('Error destroying game on back:', error);
      }
    }
    onBack();
  };

  // Chapter One intro screen
  if (gameMode === 'chapter') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center cursor-pointer relative overflow-hidden bg-black"
        onClick={nextChapterSlide}
      >
        {/* Mobile-responsive image container */}
        <div 
          className="md:hidden w-full h-full absolute inset-0"
          style={{
            backgroundImage: `url(${chapterAssets[chapterIndex].image})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        
        {/* Desktop overlay for better coverage */}
        <div 
          className="hidden md:block w-full h-full absolute inset-0"
          style={{
            backgroundImage: `url(${chapterAssets[chapterIndex].image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />

        {/* Click or spacebar instruction */}
        <div className="absolute bottom-4 md:bottom-8 left-1/2 transform -translate-x-1/2 px-4 z-10">
          <div className="bg-black/70 backdrop-blur px-4 md:px-6 py-2 md:py-3 rounded-lg border border-white/20">
            <p className="text-white text-center text-sm md:text-lg font-medium">
              Click or press Spacebar to continue
            </p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="absolute top-4 md:top-8 right-4 md:right-8 z-10">
          <div className="bg-black/70 backdrop-blur px-3 md:px-4 py-1 md:py-2 rounded-lg border border-white/20">
            <p className="text-white text-xs md:text-sm">
              {chapterIndex + 1} / {chapterAssets.length}
            </p>
          </div>
        </div>

        {/* Skip button and Audio Enable button */}
        <div className="absolute top-4 md:top-8 left-4 md:left-8 z-10 flex flex-col gap-2">
          <Button 
            onClick={(e) => {
              e.stopPropagation();
              
              // Check authentication before skipping to game
              if (!isConnected || !walletAddress) {
                toast.error('Please connect your wallet to play!');
                connect();
                return;
              }
              
              if (backgroundMusicRef.current) {
                try {
                  // Wait for any ongoing play promise to resolve first
                  if (backgroundMusicPlayPromise.current) {
                     backgroundMusicPlayPromise.current.catch(() => {}).then(() => {
                       if (backgroundMusicRef.current) {
                         backgroundMusicRef.current.pause();
                         backgroundMusicRef.current.currentTime = 0;
                       }
                       backgroundMusicPlayPromise.current = null;
                       setGameMode('game');
                       setGameStarted(true);
                     });
                   } else {
                     backgroundMusicRef.current.pause();
                     backgroundMusicRef.current.currentTime = 0;
                     backgroundMusicPlayPromise.current = null;
                     setGameMode('game');
                     setGameStarted(true);
                   }
                 } catch (e) {
                   // Ignore pause errors
                   setGameMode('game');
                   setGameStarted(true);
                 }
               } else {
                 setGameMode('game');
                 setGameStarted(true);
               }
            }}
            variant="outline"
            className="bg-black/70 backdrop-blur border-white/20 text-white hover:bg-white/20 text-xs md:text-sm px-2 md:px-4 py-1 md:py-2"
          >
            Skip Chapter
          </Button>
          
          {/* Audio Enable Button - only show when audio is blocked */}
          {audioBlocked && (
            <Button 
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  // Try to play background music
                  if (!backgroundMusicRef.current) {
                    backgroundMusicRef.current = new Audio('/ChapterOne/background_music_chapter_one.mp3');
                    backgroundMusicRef.current.loop = true;
                    backgroundMusicRef.current.volume = 0.3;
                  }
                  
                  backgroundMusicPlayPromise.current = backgroundMusicRef.current.play();
                  await backgroundMusicPlayPromise.current;
                  
                  // If successful, also try to play current slide sound
                  if (chapterAssets[chapterIndex].sound) {
                    if (soundEffectRef.current) {
                      soundEffectRef.current.pause();
                      soundEffectRef.current.currentTime = 0;
                    }
                    soundEffectRef.current = new Audio(chapterAssets[chapterIndex].sound);
                    soundEffectRef.current.volume = 0.7;
                    soundEffectPlayPromise.current = soundEffectRef.current.play();
                    await soundEffectPlayPromise.current;
                  }
                  
                  setAudioBlocked(false);
                  toast.success('Audio enabled successfully!');
                } catch (error) {
                  console.warn('Failed to enable audio:', error);
                  toast.error('Could not enable audio. Please check browser settings.');
                }
              }}
              variant="outline"
              className="bg-green-600/70 backdrop-blur border-green-500/20 text-white hover:bg-green-500/70 text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 animate-pulse"
            >
              🔊 Enable Audio
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex items-center justify-center p-4 md:p-8"
      style={{
        backgroundImage: 'url(/BG/background_menu.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for the entire background to improve contrast */}
      <div className="absolute inset-0 bg-black/40 pointer-events-none" />

      {/* Header with back button and wallet */}
      <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
        <Button 
          onClick={handleBackToMenu}
          variant="outline"
          className="bg-black/60 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
        >
          ← Back
        </Button>
      </div>
      
      <div className="absolute top-4 right-4 z-50 flex gap-4 items-center">
        {/* Wallet Display with Plate */}
        <div className="bg-black/60 backdrop-blur-md border border-white/20 rounded-full px-4 py-1.5 flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          {!isConnected ? (
            <button
              className="text-white text-xs font-medium hover:text-green-400 transition-colors"
              onClick={() => connect()}
            >
              Connect Wallet
            </button>
          ) : (
            <span className="text-white text-xs font-mono font-medium">
              {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connected'}
            </span>
          )}
        </div>
      </div>

      {/* Main Layout Container: Three Columns on Large Screens */}
      <div className="relative z-10 w-full max-w-[1400px] flex flex-col lg:flex-row gap-6 items-stretch justify-center h-full max-h-[90vh]">
        
        {/* Left Side: Farm Info Panel */}
        <div className="hidden lg:flex flex-col w-64 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl overflow-y-auto">
          <h3 className="text-xl font-bold text-green-400 mb-6 flex items-center gap-2 border-b border-white/10 pb-2">
            🌾 Farm Area
          </h3>
          <div className="space-y-6 text-sm">
            <div className="space-y-2">
              <p className="text-white font-medium">Plant crops here to earn coins</p>
              <ul className="space-y-3 text-white/70">
                <li className="flex gap-2"><span>💰</span> <span>Each crop: 3 coins</span></li>
                <li className="flex gap-2"><span>⏱️</span> <span>Crops grow over time</span></li>
                <li className="flex gap-2"><span>🔄</span> <span>Harvest for profit</span></li>
              </ul>
            </div>
            <div className="space-y-2 pt-6 border-t border-white/5">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest">Controls</h4>
              <ul className="space-y-3 text-xs text-white/80">
                <li className="flex gap-2"><span>👆</span> <span>Click enemies to attack</span></li>
                <li className="flex gap-2"><span>⌨️</span> <span><b>P</b> - Plant Mode</span></li>
                <li className="flex gap-2"><span>⌨️</span> <span><b>1</b> - Siggy</span></li>
                <li className="flex gap-2"><span>⌨️</span> <span><b>2</b> - Siggy Guardian</span></li>
                <li className="flex gap-2"><span>⌨️</span> <span><b>3</b> - Jez</span></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Center: Main Game Board */}
        <div className="flex-1 flex flex-col bg-black/20 backdrop-blur-sm rounded-2xl border-4 border-white/10 shadow-2xl overflow-hidden min-w-0 md:min-w-[800px]">
          
          {/* Top Info Bar */}
          <div className="flex justify-between items-center p-4 bg-black/60 border-b border-white/10 backdrop-blur-md">
            <h1 className="text-xl md:text-2xl font-bold text-white tracking-wider" style={{textShadow: '0 0 10px rgba(255,255,255,0.3)'}}>
              {GAME_CONFIG.METADATA.name.toUpperCase()}
            </h1>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Current Score</span>
                <span className="text-xl font-bold text-yellow-400">
                  {gameScore.toLocaleString()}
                </span>
              </div>
              
              <div className="flex flex-col items-end border-l border-white/10 pl-6">
                <span className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Farm Coins</span>
                <span className="text-xl font-bold text-green-400 flex items-center gap-2">
                  🪙 {farmCoins.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Phaser Game Surface */}
          <div className="flex-1 relative bg-black/40 min-h-[400px]">
            {!isConnected || !walletAddress ? (
              <div className="absolute inset-0 flex items-center justify-center text-center text-white p-8">
                <div className="max-w-md bg-black/80 backdrop-blur-xl p-10 rounded-3xl border border-white/10 shadow-2xl">
                  <h2 className="text-4xl font-bold mb-6 tracking-tight">🛡️ RIT DEFENSE</h2>
                  <p className="text-white/60 mb-8 text-lg leading-relaxed">The garden is under attack. Connect your wallet to summon your defenders and earn rewards.</p>
                  <Button
                    onClick={() => connect()}
                    className="bg-white text-black hover:bg-white/90 px-10 py-6 text-xl font-bold rounded-full transition-transform active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                  >
                    Connect to Play
                  </Button>
                </div>
              </div>
            ) : gameMode === 'game' && gameStarted ? (
              <ClientWrapper 
                key="defense-game-instance"
                farmCoins={farmCoins}
                addFarmCoins={addFarmCoins}
                gameMode="defense"
                onGameEvent={(event: string, data: any) => {
                  switch (event) {
                    case 'coinsEarned':
                      if (data && typeof data === 'number') addFarmCoins(data);
                      break;
                    case 'enemyDefeated':
                      if (skillTreeManagerRef.current) window.dispatchEvent(new CustomEvent('enemyDefeated', { detail: { score: gameScore } }));
                      break;
                    case 'waveComplete':
                      if (data && typeof data === 'object' && data.wave && data.score) {
                        setGameScore(data.score);
                        toast.success(`Wave ${data.wave} completed!`);
                      }
                      break;
                    case 'scoreUpdate':
                      if (data && typeof data === 'number') {
                        setGameScore(data);
                        if (skillTreeManagerRef.current) window.dispatchEvent(new CustomEvent('scoreUpdate', { detail: { score: data } }));
                      }
                      break;
                    case 'gameOver':
                      toast.success('Game Over! Thanks for playing!');
                      if (onGameEnd && gameScore > 0) onGameEnd(gameScore);
                      break;
                    case 'gameWon':
                      const victoryBonus = 5000;
                      const finalScore = gameScore + victoryBonus;
                      setGameScore(finalScore);
                      toast.success(`Victory! +${victoryBonus} victory bonus!`);
                      if (onGameEnd) onGameEnd(finalScore);
                      break;
                    default: break;
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white text-center flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  <div className="text-sm font-bold tracking-[0.2em] text-white/50 uppercase">Initializing Engine</div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Info (only visible on mobile) */}
          <div className="lg:hidden p-4 bg-black/60 border-t border-white/10 space-y-4">
            <div className="flex justify-between text-[10px] text-white/50 font-bold uppercase tracking-wider">
              <span>🌾 Plant: 3 Coins</span>
              <span>⚔️ Defenders: 25+ Coins</span>
            </div>
          </div>
        </div>

        {/* Right Side: Defenders Info Panel */}
        <div className="hidden lg:flex flex-col w-80 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl overflow-y-auto">
          <h3 className="text-xl font-bold text-blue-400 mb-6 flex items-center gap-2 border-b border-white/10 pb-2">
            🛡️ Ritual Defenders
          </h3>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <h5 className="text-xs font-bold text-yellow-500 uppercase mb-1">Siggy (25)</h5>
                <p className="text-[11px] text-white/70 leading-relaxed">Basic nature magic. Reliable starting defense for the garden.</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <h5 className="text-xs font-bold text-blue-400 uppercase mb-1">Siggy Guardian (50)</h5>
                <p className="text-[11px] text-white/70 leading-relaxed">Frost Guardian. Freezes and slows waves of approaching enemies.</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <h5 className="text-xs font-bold text-red-500 uppercase mb-1">Jez (80)</h5>
                <p className="text-[11px] text-white/70 leading-relaxed">Fire Mage. Delivers rapid fire magic damage to single targets.</p>
              </div>
            </div>
            
            <div className="pt-6 mt-auto">
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-[10px] text-blue-300 font-medium italic">"Place defenders on the right side to prevent enemies from crossing the border."</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}