"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface GuideContextType {
  showGuide: boolean;
  currentGuideStep: number;
  guideContent: string;
  setShowGuide: (show: boolean) => void;
  setCurrentGuideStep: (step: number) => void;
  setGuideContent: (content: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetGuide: () => void;
}

const GuideContext = createContext<GuideContextType | undefined>(undefined);

export function GuideProvider({ children }: { children: ReactNode }) {
  const [showGuide, setShowGuide] = useState(false);
  const [currentGuideStep, setCurrentGuideStep] = useState(0);
  const [guideContent, setGuideContent] = useState('');

  const nextStep = () => {
    setCurrentGuideStep(prev => prev + 1);
  };

  const previousStep = () => {
    setCurrentGuideStep(prev => Math.max(0, prev - 1));
  };

  const resetGuide = () => {
    setCurrentGuideStep(0);
    setShowGuide(false);
    setGuideContent('');
  };

  const value: GuideContextType = {
    showGuide,
    currentGuideStep,
    guideContent,
    setShowGuide,
    setCurrentGuideStep,
    setGuideContent,
    nextStep,
    previousStep,
    resetGuide,
  };

  return (
    <GuideContext.Provider value={value}>
      {children}
    </GuideContext.Provider>
  );
}

export function useGuideContext() {
  const context = useContext(GuideContext);
  if (context === undefined) {
    throw new Error('useGuideContext must be used within a GuideProvider');
  }
  return context;
}