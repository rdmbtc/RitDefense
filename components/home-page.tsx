"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import dynamic from 'next/dynamic';


// Dynamically import the defense game component
const DefenseGame = dynamic(() => import('./defense-game'), {
  ssr: false,
  loading: () => <div className="text-white text-center">Loading Defense Game...</div>
});

export default function HomePage() {
  const [gameMode, setGameMode] = useState<'intro' | 'trailer' | 'home' | 'defense'>('intro');
  const [trailerIndex, setTrailerIndex] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const soundEffectRef = useRef<HTMLAudioElement | null>(null);

  // Leaderboard data (stored in localStorage)
  const [leaderboard, setLeaderboard] = useState<{name: string, score: number, date: string}[]>([]);

  // Load leaderboard from localStorage on component mount
  useEffect(() => {
    const savedLeaderboard = localStorage.getItem('mondefense-leaderboard');
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    }
  }, []);

  // Save score to leaderboard
  const saveScore = useCallback((score: number) => {
    const playerName = prompt('Enter your name for the leaderboard:') || 'Anonymous';
    const newEntry = {
      name: playerName,
      score: score,
      date: new Date().toLocaleDateString()
    };
    
    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Keep top 10 scores
    
    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('mondefense-leaderboard', JSON.stringify(updatedLeaderboard));
  }, [leaderboard]);

 

 
 
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(/BG/background_menu.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-6xl font-bold text-white mb-6" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.8)'}}>
          RitDefense
        </h1>
        <p className="text-xl text-blue-200 mb-8" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>
          Strategic tower defense gameplay on Ritual Chain
        </p>
        
        <div className="mb-8">
          <Card className="bg-white/10 backdrop-blur border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Defense Mode</CardTitle>
              <CardDescription className="text-blue-200">
                Pure tower defense action with strategic gameplay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full" 
                size="lg" 
                onClick={() => setGameMode('defense')}
              >
                Start Defense
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="flex justify-center space-x-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-white hover:text-blue-200">
                How to Play
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-900/95 border-white/20 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center mb-4">How to Play MonDefense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold text-blue-300 mb-2">🎯 Objective</h3>
                  <p>Defend your base by strategically placing towers and defeating waves of enemies!</p>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-300 mb-2">🎮 Controls</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• Click to attack enemies directly</li>
                    <li>• Place towers on available spots</li>
                    <li>• Upgrade towers for better damage</li>
                    <li>• Use special abilities wisely</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-300 mb-2">💡 Strategy Tips</h3>
                  <ul className="space-y-1 ml-4">
                    <li>• Focus on chokepoints</li>
                    <li>• Balance offense and defense</li>
                    <li>• Save resources for tough waves</li>
                    <li>• Watch enemy patterns</li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-300 mb-2">🏆 Scoring</h3>
                  <p>Earn points by defeating enemies and surviving waves. Higher waves give more points!</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
        
        </div>
        
        {/* Community Links */}
        <div className="mt-12 flex flex-col items-center space-y-4">
          <div className="text-center text-white/80 text-sm space-y-2">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a 
                href="https://discord.gg/B8hFgQRrq7" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/40 px-4 py-2 rounded-lg border border-indigo-400/30 transition-colors"
              >
                <span className="text-indigo-300">💬</span>
                <span className="text-white font-medium" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>Discord Server</span>
              </a>
              <a 
                href="https://x.com/MonDefenseTD" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/40 px-4 py-2 rounded-lg border border-blue-400/30 transition-colors"
              >
                <span className="text-blue-300">🐦</span>
                <span className="text-white font-medium" style={{textShadow: '1px 1px 2px rgba(0,0,0,0.7)'}}>Official Twitter</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}