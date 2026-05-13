import { useState, useEffect } from 'react';

// Hook to manage unified nickname across the application
export function useUnifiedNickname() {
  const [nickname, setNickname] = useState<string>('');

  // Load nickname from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedNickname = localStorage.getItem('player-nickname');
      if (savedNickname) {
        setNickname(savedNickname);
      }
    }
  }, []);

  // Save nickname to localStorage when it changes
  const updateNickname = (newNickname: string) => {
    setNickname(newNickname);
    if (typeof window !== 'undefined') {
      localStorage.setItem('player-nickname', newNickname);
    }
  };

  return {
    nickname,
    setNickname: updateNickname,
  };
}