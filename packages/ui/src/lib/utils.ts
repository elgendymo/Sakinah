"use client";

/**
 * Utility to get the current text direction
 */
export function getDirection(): 'ltr' | 'rtl' {
  if (typeof document === 'undefined') return 'ltr';
  return document.documentElement.dir as 'ltr' | 'rtl' || 'ltr';
}

/**
 * Hook to track RTL state
 */
import { useState, useEffect } from 'react';

export function useDirection() {
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');

  useEffect(() => {
    const updateDirection = () => {
      setDirection(getDirection());
    };

    updateDirection();

    // Listen for direction changes
    const observer = new MutationObserver(updateDirection);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['dir']
    });

    return () => observer.disconnect();
  }, []);

  return direction;
}
