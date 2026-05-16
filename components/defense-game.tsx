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
import {
  Sprout, Coins, Clock, RefreshCw, Keyboard, MousePointerClick,
  Shield, Snowflake, Flame, Crown, Leaf, Info,
} from 'lucide-react';
import { SubmitScoreModal } from '@/components/submit-score-modal';
import type { Address } from 'viem';



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

  // Submit-score modal state (game-over screen)
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitState, setSubmitState] = useState<{ score: number; isWin: boolean } | null>(null);

  // Bridge: the in-Phaser "Submit Score" button dispatches this event so the
  // React EIP-712 SubmitScoreModal opens with the correct score / outcome.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<{ score?: number; isWin?: boolean }>).detail || {};
      const score = typeof detail.score === 'number' ? detail.score : gameScore;
      const isWin = !!detail.isWin;
      setSubmitState({ score, isWin });
      setSubmitOpen(true);
    };
    window.addEventListener('ritdefense:openSubmitModal', handler as EventListener);
    return () => window.removeEventListener('ritdefense:openSubmitModal', handler as EventListener);
  }, [gameScore]);
  
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

  // Always-current ref for the latest handleScoreSubmission. Lets the effects
  // below depend on stable values (e.g. gameMode) without rebuilding the
  // window.secureSubmitScore bridge on every render. Without this, the bridge
  // effect re-attached every render and the setState calls inside it caused
  // React error #185 (Maximum update depth exceeded) in production.
  const handleScoreSubmissionRef = useRef(handleScoreSubmission);
  useEffect(() => {
    handleScoreSubmissionRef.current = handleScoreSubmission;
  }, [handleScoreSubmission]);

  // One-shot init when entering 'game' mode: set up window flags, skill tree
  // manager, game start time, and reset the submission flag. Runs only when
  // gameMode itself flips, NOT on every render.
  useEffect(() => {
    if (gameMode !== 'game') return;
    if (typeof window === 'undefined') return;

    window._defenseMode = true;
    window._farmMode = false;

    if (!window.skillTreeManager) {
      const SkillTreeManager = require('./skill-tree/SkillTreeManager').default;
      window.skillTreeManager = new SkillTreeManager();
    }
    skillTreeManagerRef.current = window.skillTreeManager;

    setGameStartTime(Date.now());
    setHasSubmittedScore(false);
  }, [gameMode]);

  // Long-lived bridge: legacy in-game submit button dispatches a
  // 'gameScoreSubmission' window event; we forward it to the latest
  // handleScoreSubmission via the ref above. Mounted once per game session.
  useEffect(() => {
    if (gameMode !== 'game' || typeof window === 'undefined') return;

    const onScoreEvent = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { score, transactionCount, gameStateHash } = customEvent.detail || {};
      try {
        await handleScoreSubmissionRef.current?.(score, transactionCount, gameStateHash);
      } catch (error) {
        console.error('Error in secure score submission:', error);
      }
    };

    window.addEventListener('gameScoreSubmission', onScoreEvent);

    window.secureSubmitScore = (score: number, transactionCount: number, gameStateHash: string) => {
      if (typeof score !== 'number' || score < 0 || score > 999999) {
        console.warn('Invalid score parameter blocked');
        return false;
      }
      if (typeof transactionCount !== 'number' || transactionCount < 0 || transactionCount > 100) {
        console.warn('Invalid transaction count parameter blocked');
        return false;
      }
      window.dispatchEvent(
        new CustomEvent('gameScoreSubmission', {
          detail: { score, transactionCount, gameStateHash },
        }),
      );
      return true;
    };

    return () => {
      window.removeEventListener('gameScoreSubmission', onScoreEvent);
      if (window.secureSubmitScore) {
        delete window.secureSubmitScore;
      }
    };
  }, [gameMode]);

  useEffect(() => {
    // On unmount of <DefenseGame> only: tear down global flags, the Phaser
    // game instance, and any pending audio. Empty deps array — this MUST be
    // stable, otherwise we re-enter the same React #185 (infinite update)
    // bug that this commit fixes.
    return () => {
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
          if (backgroundMusicPlayPromise.current) {
            backgroundMusicPlayPromise.current.catch(() => {}).then(() => {
              if (backgroundMusicRef.current) backgroundMusicRef.current.pause();
              backgroundMusicPlayPromise.current = null;
            });
          } else {
            backgroundMusicRef.current.pause();
            backgroundMusicPlayPromise.current = null;
          }
        } catch {}
      }
      if (soundEffectRef.current) {
        try {
          if (soundEffectPlayPromise.current) {
            soundEffectPlayPromise.current.catch(() => {}).then(() => {
              if (soundEffectRef.current) soundEffectRef.current.pause();
              soundEffectPlayPromise.current = null;
            });
          } else {
            soundEffectRef.current.pause();
            soundEffectPlayPromise.current = null;
          }
        } catch {}
      }
    };
  }, []);



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

  // Helper: tear down chapter audio and jump straight into the game.
  // Used by the "Skip Chapter" button on both desktop and mobile. The
  // wallet check is intentionally NOT here — players can skip the intro
  // freely and connect their wallet only when they want to submit a score.
  const skipToGame = () => {
    const goToGame = () => {
      setGameMode('game');
      setGameStarted(true);
    };

    if (!backgroundMusicRef.current) {
      goToGame();
      return;
    }

    try {
      const stopAndGo = () => {
        try {
          if (backgroundMusicRef.current) {
            backgroundMusicRef.current.pause();
            backgroundMusicRef.current.currentTime = 0;
          }
        } catch {
          /* ignore */
        }
        backgroundMusicPlayPromise.current = null;
        goToGame();
      };

      if (backgroundMusicPlayPromise.current) {
        backgroundMusicPlayPromise.current.catch(() => {}).then(stopAndGo);
      } else {
        stopAndGo();
      }
    } catch {
      goToGame();
    }
  };

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
        <div className="absolute top-4 md:top-8 left-4 md:left-8 z-20 flex flex-col gap-2">
          <button
            type="button"
            aria-label="Skip Chapter"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              skipToGame();
            }}
            // Mirror onClick on touchEnd as well — iOS Safari occasionally
            // swallows synthesized clicks on absolutely-positioned controls
            // sitting over a parent that has its own onClick.
            onTouchEnd={(e) => {
              e.stopPropagation();
              e.preventDefault();
              skipToGame();
            }}
            // Some Android Chrome builds need pointerup as the final fallback.
            onPointerUp={(e) => {
              e.stopPropagation();
            }}
            style={{ touchAction: 'manipulation' }}
            className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-black/70 px-4 py-2.5 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/15 active:bg-white/25 md:min-h-0 min-h-[44px] min-w-[120px]"
          >
            Skip Chapter
          </button>
          
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
        <div className="hidden lg:flex flex-col w-72 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950/80 to-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Farm header */}
          <div className="relative px-5 pt-5 pb-4 border-b border-white/5">
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 30% 0%, rgba(34,197,94,0.35), transparent 60%)',
              }}
            />
            <div className="relative flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/15 text-emerald-300">
                <Sprout className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">Farm Area</h3>
                <p className="text-[11px] text-emerald-200/80">Plant. Grow. Profit.</p>
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
            {/* Stat rows */}
            <ul className="space-y-2">
              <li className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-400/15 text-amber-300">
                  <Coins className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-white/40">Reward</p>
                  <p className="text-sm font-semibold text-white">3 coins / crop</p>
                </div>
              </li>
              <li className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-400/15 text-sky-300">
                  <Clock className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-white/40">Growth</p>
                  <p className="text-sm font-semibold text-white">Crops mature over time</p>
                </div>
              </li>
              <li className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-fuchsia-400/15 text-fuchsia-300">
                  <RefreshCw className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wider text-white/40">Loop</p>
                  <p className="text-sm font-semibold text-white">Harvest, replant, repeat</p>
                </div>
              </li>
            </ul>

            {/* Controls section */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Keyboard className="h-3.5 w-3.5 text-white/50" />
                <h4 className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/50">
                  Controls
                </h4>
                <div className="ml-auto h-px flex-1 bg-white/10" />
              </div>
              <ul className="space-y-1.5 text-xs text-white/85">
                <ControlRow icon={<MousePointerClick className="h-3.5 w-3.5" />} label="Click enemies to attack" />
                <ControlRow keyHint="P" label="Plant Mode" tone="emerald" />
                <ControlRow keyHint="1" label="Siggy" tone="amber" />
                <ControlRow keyHint="2" label="Siggy Guardian" tone="sky" />
                <ControlRow keyHint="3" label="Jez" tone="rose" />
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
                      if (gameScore > 0) {
                        setSubmitState({ score: gameScore, isWin: false });
                        setSubmitOpen(true);
                      }
                      if (onGameEnd && gameScore > 0) onGameEnd(gameScore);
                      break;
                    case 'gameWon':
                      const victoryBonus = 5000;
                      const finalScore = gameScore + victoryBonus;
                      setGameScore(finalScore);
                      toast.success(`Victory! +${victoryBonus} victory bonus!`);
                      setSubmitState({ score: finalScore, isWin: true });
                      setSubmitOpen(true);
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
        <div className="hidden lg:flex flex-col w-80 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950/80 to-slate-900/60 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Defenders header */}
          <div className="relative px-5 pt-5 pb-4 border-b border-white/5">
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 70% 0%, rgba(99,102,241,0.4), transparent 60%)',
              }}
            />
            <div className="relative flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-500/15 text-indigo-300">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white leading-tight">Ritual Defenders</h3>
                <p className="text-[11px] text-indigo-200/80">Place. Hold the line.</p>
              </div>
            </div>
          </div>

          {/* Scrollable cards */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-3">
              <DefenderCard
                name="Siggy"
                cost={25}
                role="Nature Mage"
                description="Reliable starting defense. Steady damage with a healing aura."
                icon={<Leaf className="h-4 w-4" />}
                tone="emerald"
              />
              <DefenderCard
                name="Siggy Guardian"
                cost={50}
                role="Frost Guardian"
                description="Slows and freezes incoming waves. Great crowd control."
                icon={<Snowflake className="h-4 w-4" />}
                tone="sky"
              />
              <DefenderCard
                name="Jez"
                cost={80}
                role="Fire Mage"
                description="Rapid burst damage and burning trails for chokepoints."
                icon={<Flame className="h-4 w-4" />}
                tone="rose"
              />
              <DefenderCard
                name="Josh"
                cost={150}
                role="Champion"
                description="Premium divine magic with massive damage and reach."
                icon={<Crown className="h-4 w-4" />}
                tone="amber"
                premium
              />
            </div>

            {/* Tip / hint card */}
            <div className="mt-4 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-indigo-300" />
                <p className="text-[11px] leading-relaxed text-indigo-100/85">
                  Place defenders along the right border to stop enemies before they cross.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Game-over: submit score modal */}
      <SubmitScoreModal
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        score={submitState?.score ?? 0}
        isWin={submitState?.isWin ?? false}
        player={(walletAddress as Address | null) ?? null}
        onConnect={() => connect()}
      />
    </div>
  );
}


// -------------------- Side panel helpers --------------------

type Tone = 'emerald' | 'amber' | 'sky' | 'rose' | 'indigo';

const toneStyles: Record<
  Tone,
  { keyBg: string; keyText: string; ring: string; iconBg: string; iconText: string; cardRing: string; cardBg: string; }
> = {
  emerald: {
    keyBg: 'bg-emerald-500/15',
    keyText: 'text-emerald-200',
    ring: 'ring-emerald-400/40',
    iconBg: 'bg-emerald-500/15',
    iconText: 'text-emerald-300',
    cardRing: 'border-emerald-400/20',
    cardBg: 'bg-emerald-500/5',
  },
  amber: {
    keyBg: 'bg-amber-400/15',
    keyText: 'text-amber-200',
    ring: 'ring-amber-300/40',
    iconBg: 'bg-amber-400/15',
    iconText: 'text-amber-300',
    cardRing: 'border-amber-300/25',
    cardBg: 'bg-amber-400/5',
  },
  sky: {
    keyBg: 'bg-sky-500/15',
    keyText: 'text-sky-200',
    ring: 'ring-sky-400/40',
    iconBg: 'bg-sky-500/15',
    iconText: 'text-sky-300',
    cardRing: 'border-sky-400/25',
    cardBg: 'bg-sky-500/5',
  },
  rose: {
    keyBg: 'bg-rose-500/15',
    keyText: 'text-rose-200',
    ring: 'ring-rose-400/40',
    iconBg: 'bg-rose-500/15',
    iconText: 'text-rose-300',
    cardRing: 'border-rose-400/25',
    cardBg: 'bg-rose-500/5',
  },
  indigo: {
    keyBg: 'bg-indigo-500/15',
    keyText: 'text-indigo-200',
    ring: 'ring-indigo-400/40',
    iconBg: 'bg-indigo-500/15',
    iconText: 'text-indigo-300',
    cardRing: 'border-indigo-400/25',
    cardBg: 'bg-indigo-500/5',
  },
};

function ControlRow({
  icon,
  keyHint,
  label,
  tone = 'indigo',
}: {
  icon?: React.ReactNode;
  keyHint?: string;
  label: string;
  tone?: Tone;
}) {
  const t = toneStyles[tone];
  return (
    <li className="flex items-center gap-2.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5">
      {keyHint ? (
        <kbd
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-bold ${t.keyBg} ${t.keyText} ring-1 ${t.ring}`}
        >
          {keyHint}
        </kbd>
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/5 text-white/70 ring-1 ring-white/10">
          {icon}
        </span>
      )}
      <span className="truncate">{label}</span>
    </li>
  );
}

function DefenderCard({
  name,
  cost,
  role,
  description,
  icon,
  tone,
  premium = false,
}: {
  name: string;
  cost: number;
  role: string;
  description: string;
  icon: React.ReactNode;
  tone: Tone;
  premium?: boolean;
}) {
  const t = toneStyles[tone];
  return (
    <div
      className={`group relative overflow-hidden rounded-xl border ${t.cardRing} ${t.cardBg} p-3 transition-colors hover:bg-white/[0.06]`}
    >
      {premium && (
        <span className="absolute right-2 top-2 rounded-full border border-amber-300/40 bg-amber-300/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-200">
          Premium
        </span>
      )}
      <div className="flex items-start gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.iconBg} ${t.iconText} ring-1 ${t.ring}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h5 className="text-sm font-bold text-white">{name}</h5>
            <span className="rounded-md bg-white/5 px-1.5 py-0.5 text-[10px] font-mono tabular-nums text-white/70 ring-1 ring-white/10">
              {cost}🪙
            </span>
          </div>
          <p className={`mt-0.5 text-[10px] uppercase tracking-wider ${t.iconText}`}>{role}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/70">{description}</p>
        </div>
      </div>
    </div>
  );
}
