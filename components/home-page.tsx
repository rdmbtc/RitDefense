"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import dynamic from 'next/dynamic';
import {
  Shield, Swords, Trophy, Sparkles, Crown,
  PlayCircle, Info, Heart, ScrollText
} from 'lucide-react';

const DefenseGame = dynamic(() => import('./defense-game'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center text-white text-center bg-black">
      Loading Defense Game...
    </div>
  )
});

type LeaderboardEntry = { name: string; score: number; date: string };

export default function HomePage() {
  const [gameMode, setGameMode] = useState<'home' | 'defense'>('home');
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const soundEffectRef = useRef<HTMLAudioElement | null>(null);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('ritdefense-leaderboard');
      if (saved) setLeaderboard(JSON.parse(saved));
    } catch (e) {
      // ignore corrupt local data
    }
  }, []);

  const saveScore = useCallback((score: number) => {
    if (typeof window === 'undefined') return;
    const playerName = window.prompt('Enter your name for the leaderboard:') || 'Anonymous';
    const newEntry: LeaderboardEntry = {
      name: playerName,
      score,
      date: new Date().toLocaleDateString(),
    };

    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLeaderboard(updatedLeaderboard);
    try {
      localStorage.setItem('ritdefense-leaderboard', JSON.stringify(updatedLeaderboard));
    } catch (e) {
      // localStorage may be unavailable; non-fatal
    }
  }, [leaderboard]);

  if (gameMode === 'defense') {
    return <DefenseGame onBack={() => setGameMode('home')} onGameEnd={saveScore} />;
  }

  // ----- Leaderboard placeholder data (used until backend is wired up) -----
  const placeholderLeaderboard: LeaderboardEntry[] = [
    { name: 'rdmnad', score: 18450, date: '—' },
    { name: 'Siggy.eth', score: 15220, date: '—' },
    { name: 'Jez', score: 12080, date: '—' },
    { name: 'Josh', score: 9990, date: '—' },
    { name: 'You?', score: 0, date: '—' },
  ];
  const displayLeaderboard = leaderboard.length > 0 ? leaderboard : placeholderLeaderboard;

  return (
    <div
      className="relative min-h-screen w-full text-white"
      style={{
        backgroundImage: 'url(/BG/background_menu.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* Color-grading overlay so text and cards stay readable on any bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-slate-950/60 to-black/85 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 10%, rgba(99,102,241,0.35), transparent 45%), radial-gradient(circle at 80% 90%, rgba(236,72,153,0.25), transparent 50%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        {/* Header */}
        <header className="mb-12 text-center">
          <Badge
            variant="secondary"
            className="mb-4 border border-white/15 bg-white/10 text-white/80 backdrop-blur"
          >
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Tower defense on Ritual Chain
          </Badge>
          <h1
            className="bg-gradient-to-br from-white via-blue-100 to-indigo-300 bg-clip-text text-6xl sm:text-7xl font-extrabold tracking-tight text-transparent"
            style={{ filter: 'drop-shadow(0 4px 20px rgba(99,102,241,0.35))' }}
          >
            RitDefense
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base sm:text-lg text-white/75">
            Hold the line for the Ritual Community. Place defenders, master skills, climb the ladder.
          </p>
        </header>

        {/* Main grid: hero CTA on the left, leaderboard on the right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6 lg:gap-8">
          {/* Hero / Start panel */}
          <Card className="overflow-hidden border-white/10 bg-white/[0.04] backdrop-blur-xl">
            <div className="relative">
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 80% 0%, rgba(99,102,241,0.45), transparent 55%)',
                }}
              />
              <CardHeader className="relative z-10 pb-2">
                <div className="flex items-center gap-2 text-indigo-300">
                  <Shield className="h-5 w-5" />
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    Defense Mode
                  </span>
                </div>
                <CardTitle className="mt-1 text-3xl font-bold text-white">
                  Defend the Ritual
                </CardTitle>
                <CardDescription className="text-white/70">
                  Pure tower defense action — strategic placement, evolving waves, special abilities.
                </CardDescription>
              </CardHeader>

              <CardContent className="relative z-10 space-y-5">
                {/* Feature pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { icon: Swords, label: '4 Defenders' },
                    { icon: Sparkles, label: 'Skill Tree' },
                    { icon: Crown, label: 'Skins' },
                    { icon: Trophy, label: 'Leaderboard' },
                  ].map(({ icon: Icon, label }) => (
                    <div
                      key={label}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs sm:text-sm text-white/80"
                    >
                      <Icon className="h-4 w-4 text-indigo-300" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <Button
                  size="lg"
                  className="group relative h-14 w-full overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-base font-semibold text-white shadow-lg shadow-indigo-900/40 transition-transform hover:scale-[1.01]"
                  onClick={() => setGameMode('defense')}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <PlayCircle className="h-5 w-5" />
                    Start Defense
                  </span>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent translate-x-[-100%] transition-transform duration-700 group-hover:translate-x-[100%]" />
                </Button>

                {/* Secondary actions */}
                <div className="flex flex-wrap gap-3">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                      >
                        <Info className="mr-2 h-4 w-4" />
                        How to Play
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md border-white/10 bg-slate-950/95 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold">
                          How to Play RitDefense
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 text-sm">
                        <Section title="🎯 Objective">
                          Defend your base by strategically placing defenders and surviving as many waves as you can.
                        </Section>
                        <Section title="🎮 Controls">
                          <ul className="ml-4 list-disc space-y-1">
                            <li>Click enemies to attack directly</li>
                            <li>Use the toolbar to place defenders</li>
                            <li>Upgrade defenders for better damage</li>
                            <li>Trigger special abilities to clear waves</li>
                          </ul>
                        </Section>
                        <Section title="💡 Strategy">
                          <ul className="ml-4 list-disc space-y-1">
                            <li>Cover chokepoints first</li>
                            <li>Mix defender types for synergy</li>
                            <li>Save coins for the harder waves</li>
                            <li>Watch enemy patterns and adapt</li>
                          </ul>
                        </Section>
                        <Section title="🏆 Scoring">
                          Earn points for every enemy you defeat and every wave you survive. Higher waves give better rewards.
                        </Section>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                      >
                        <ScrollText className="mr-2 h-4 w-4" />
                        Patch Notes
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md border-white/10 bg-slate-950/95 text-white">
                      <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold">
                          What's New
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 text-sm text-white/80">
                        <PatchItem
                          title="Roster rename"
                          body="Defenders are now Siggy, Siggy Guardian, Jez, and Josh. Skins renamed to Stefan, Dunken, Flash, and Val Alexander."
                        />
                        <PatchItem
                          title="Skin overlay"
                          body="Fixed duplicate panels and added click-outside to close."
                        />
                        <PatchItem
                          title="Audio"
                          body="Default SFX volume reduced for a friendlier mix."
                        />
                        <PatchItem
                          title="UI"
                          body="Brand new home page layout with leaderboard preview."
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </div>
          </Card>

          {/* Leaderboard panel (placeholder) */}
          <Card className="border-white/10 bg-white/[0.04] backdrop-blur-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-300" />
                  <CardTitle className="text-xl font-bold text-white">
                    Leaderboard
                  </CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="border border-amber-300/30 bg-amber-300/10 text-amber-200"
                >
                  Preview
                </Badge>
              </div>
              <CardDescription className="text-white/60">
                Top defenders. Online ranking is coming soon — these are local placeholders.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <ol className="divide-y divide-white/5 rounded-lg border border-white/10 bg-black/20">
                {displayLeaderboard.slice(0, 5).map((entry, index) => (
                  <li
                    key={`${entry.name}-${index}`}
                    className="flex items-center gap-3 px-3 py-2.5"
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        index === 0
                          ? 'bg-amber-300/20 text-amber-200 ring-1 ring-amber-300/40'
                          : index === 1
                          ? 'bg-zinc-300/15 text-zinc-200 ring-1 ring-zinc-300/30'
                          : index === 2
                          ? 'bg-orange-400/15 text-orange-200 ring-1 ring-orange-400/30'
                          : 'bg-white/5 text-white/60 ring-1 ring-white/10'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {entry.name}
                      </p>
                      <p className="text-[11px] text-white/50">{entry.date}</p>
                    </div>
                    <span className="text-sm font-mono tabular-nums text-white/80">
                      {entry.score.toLocaleString()}
                    </span>
                  </li>
                ))}
              </ol>

              <p className="mt-4 text-center text-xs text-white/40">
                Online leaderboard coming in a future patch.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <footer className="mt-14">
          <Separator className="mb-6 bg-white/10" />
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <p className="text-xs text-white/50">
              © {new Date().getFullYear()} RitDefense
            </p>
            <p className="flex items-center gap-1.5 text-sm text-white/70">
              Build by{' '}
              <a
                href="https://x.com/rdmnad"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-white underline decoration-indigo-300/60 underline-offset-2 hover:text-indigo-200"
              >
                @rdmnad
              </a>
              <Heart className="h-3.5 w-3.5 text-rose-400" /> Special for Ritual Community
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-indigo-300">{title}</h3>
      <div className="text-white/85">{children}</div>
    </div>
  );
}

function PatchItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border border-white/5 bg-white/5 p-3">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-xs text-white/70">{body}</p>
    </div>
  );
}
