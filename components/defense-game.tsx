"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useGameContext } from "@/context/game-context";
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { useAccount, useConnectModal } from 'wagmi';
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
  const { isConnected, address: walletAddress } = useAccount();
  const { openConnectModal } = useConnectModal();
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
      openConnectModal?.();
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
                openConnectModal?.();
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
      className="min-h-screen"
      style={{
        backgroundImage: 'url(/BG/background_menu.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Header with back button and game info */}
      <div className="absolute top-4 left-4 z-50">
        <Button 
          onClick={handleBackToMenu}
          variant="outline"
          className="bg-white/10 backdrop-blur border-white/20 text-white hover:bg-white/20"
        >
          ← Back to Menu
        </Button>
      </div>
      
      <div className="absolute top-4 right-4 z-50 flex gap-4 items-center">
        {/* Authentication Status */}
        <div className="bg-white/10 backdrop-blur border-white/20 rounded-lg px-4 py-2">
          {!isConnected ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="bg-blue-600/80 hover:bg-blue-700/80 text-white border-blue-500/50"
                onClick={() => openConnectModal?.()}
              >
                Connect Wallet
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {walletAddress ? (
                <span className="text-white text-sm">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
              ) : (
                <span className="text-white text-sm">Connected</span>
              )}
            </div>
          )}
        </div>
        
        {/* Score Display */}
        <div className="relative">
          <div className="bg-white/10 backdrop-blur border-white/20 rounded-lg px-4 py-2">
            <span className="text-white font-bold" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>
              Score: {gameScore > 0 ? gameScore.toLocaleString() : '0'}
            </span>
          </div>
        </div>

        {/* Skill Tree Button */}
      
        

      </div>

      {/* Game Title */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50">
        <h1 className="text-2xl font-bold text-white text-center" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
          {GAME_CONFIG.METADATA.name}
        </h1>
      </div>

      {/* Game Container */}
      <div className="w-full h-screen flex items-center justify-center">
        {!isConnected || !walletAddress ? (
          <div className="text-center text-white">
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4">🛡️ Rit Defense</h2>
              <p className="text-lg mb-6">Connect your wallet to start playing!</p>
              <Button
                onClick={() => openConnectModal?.()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
              >
                Connect Wallet
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
              // Handle game events
              switch (event) {
                case 'coinsEarned':
                  if (data && typeof data === 'number') {
                    // Add coins for game mechanics, but score is handled by scoreUpdate event
                    addFarmCoins(data);
                  }
                  break;
                case 'enemyDefeated':
                  // Forward enemy defeat events to skill tree manager
                  if (skillTreeManagerRef.current) {
                    // Dispatch browser event for skill tree manager to catch
                    window.dispatchEvent(new CustomEvent('enemyDefeated', {
                      detail: { score: gameScore }
                    }));
                  }
                  break;
                case 'waveComplete':
                  if (data && typeof data === 'object' && data.wave && data.score) {
                    // Sync with the actual Phaser game score instead of calculating separately
                    setGameScore(data.score);
                    toast.success(`Wave ${data.wave} completed!`);
                  }
                  break;
                case 'scoreUpdate':
                  if (data && typeof data === 'number') {
                    // Sync React score with Phaser game score
                    setGameScore(data);
                    
                    // Forward score updates to skill tree manager
                    if (skillTreeManagerRef.current) {
                      window.dispatchEvent(new CustomEvent('scoreUpdate', {
                        detail: { score: data }
                      }));
                    }
                  }
                  break;
                case 'gameOver':
                  toast.success('Game Over! Thanks for playing!');
                  if (onGameEnd && gameScore > 0) {
                    onGameEnd(gameScore);
                  }
                  // Score submission is handled by the Phaser game's submit button
                  break;
                case 'gameWon':
                  const victoryBonus = 5000;
                  const finalScore = gameScore + victoryBonus;
                  setGameScore(finalScore);
                  toast.success(`Victory! +${victoryBonus} victory bonus!`);
                  if (onGameEnd) {
                    onGameEnd(finalScore);
                  }
                  // Score submission is handled by the Phaser game's submit button
                  break;
                default:
                  break;
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-center">
              <div className="mb-4">Initializing Defense Game...</div>
              <div className="animate-pulse">🛡️</div>
            </div>
          </div>
        )}
      </div>

      {/* Game Instructions Overlay (initially hidden, can be toggled) */}
      <div className="absolute bottom-4 left-4 z-50">
        <div className="bg-black/50 backdrop-blur rounded-lg p-3 text-white text-sm max-w-xs">
          <div className="font-bold mb-2" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.8)'}}>Controls:</div>
          <div style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>👆 Click enemies to attack</div>
          <div style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>P - Plant crops mode</div>
          <div style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>1 - CHOG Defender (25 coins)</div>
          <div style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>2 - MOLANDAK Guardian (50 coins)</div>
        </div>
      </div>

      {/* Bug Report Button - Bottom Right */}
      <div className="absolute bottom-4 right-4 z-50">
        <Button
          onClick={() => window.open('https://discord.gg/B8hFgQRrq7', '_blank')}
          variant="outline"
          size="sm"
          className="bg-red-600/80 hover:bg-red-500/90 border-red-400/50 text-white backdrop-blur-sm transition-all duration-200 hover:scale-105 shadow-lg"
          title="Report bugs in our Discord server"
        >
          <span className="text-xs font-medium">🐛 Report Bug</span>
        </Button>
      </div>

     
    </div>
  );
}