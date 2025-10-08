'use client';

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { LikertScore } from '@sakinah/types';

// Accessible Likert Scale with keyboard navigation and screen reader support
interface AccessibleLikertScaleProps {
  value: LikertScore | null;
  onChange: (value: LikertScore) => void;
  disabled?: boolean;
  questionId: string;
  labels?: string[];
  ariaLabel?: string;
  className?: string;
}

export function AccessibleLikertScale({
  value,
  onChange,
  disabled = false,
  questionId,
  labels = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'],
  ariaLabel = 'Rate your response',
  className = ''
}: AccessibleLikertScaleProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus first button when component mounts
    if (buttonRefs.current[0] && !value) {
      buttonRefs.current[0].focus();
    }
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let newIndex = index;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = Math.max(0, index - 1);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = Math.min(4, index + 1);
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = 4;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onChange((index + 1) as LikertScore);
        return;
    }

    if (newIndex !== index) {
      buttonRefs.current[newIndex]?.focus();
      setFocusedIndex(newIndex);
    }
  };

  const handleClick = (score: LikertScore) => {
    onChange(score);
    // Announce the selection to screen readers
    const announcement = `Selected ${score}, ${labels[score - 1]}`;
    announceToScreenReader(announcement);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Likert Scale Group */}
      <div
        ref={groupRef}
        role="radiogroup"
        aria-labelledby={`${questionId}-likert-label`}
        aria-describedby={`${questionId}-likert-description`}
        className="focus-within:ring-2 focus-within:ring-emerald-500 focus-within:ring-opacity-50 rounded-lg p-2"
      >
        {/* Hidden label for screen readers */}
        <div id={`${questionId}-likert-label`} className="sr-only">
          {ariaLabel}
        </div>

        <div id={`${questionId}-likert-description`} className="sr-only">
          Use arrow keys to navigate. Press Enter or Space to select. Scale from 1 (Never) to 5 (Always).
        </div>

        {/* Scale Buttons */}
        <div className="flex justify-between gap-2 md:gap-4">
          {[1, 2, 3, 4, 5].map((score) => (
            <motion.button
              key={score}
              ref={(el) => {
                buttonRefs.current[score - 1] = el;
              }}
              type="button"
              role="radio"
              aria-checked={value === score}
              aria-label={`${score} out of 5, ${labels[score - 1]}`}
              onClick={() => handleClick(score as LikertScore)}
              onKeyDown={(e) => handleKeyDown(e, score - 1)}
              onFocus={() => setFocusedIndex(score - 1)}
              onBlur={() => setFocusedIndex(null)}
              disabled={disabled}
              className={`
                relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all
                focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                ${value === score
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'bg-white border-2 border-sage-300 text-sage-700 hover:border-emerald-400 hover:bg-emerald-50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${focusedIndex === score - 1 ? 'ring-2 ring-emerald-400' : ''}
                min-w-[60px] md:min-w-[80px]
              `}
              whileTap={!disabled ? { scale: 0.95 } : {}}
              whileHover={!disabled ? { scale: 1.05 } : {}}
            >
              {/* Number */}
              <span className="text-lg font-bold">
                {score}
              </span>

              {/* Visual indicator for selected state */}
              {value === score && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-3 h-3 bg-white rounded-full"
                >
                  <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </motion.div>
              )}

              {/* Label - visible on larger screens */}
              <span className="text-xs font-medium hidden md:block text-center leading-tight">
                {labels[score - 1]}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Mobile Labels */}
      <div className="flex justify-between text-xs text-sage-600 md:hidden px-2">
        <span>{labels[0]}</span>
        <span>{labels[2]}</span>
        <span>{labels[4]}</span>
      </div>

      {/* Selected Value Announcement */}
      {value && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-2 bg-emerald-50 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <span className="text-sm font-medium text-emerald-700">
            Selected: {value} - {labels[value - 1]}
          </span>
        </motion.div>
      )}
    </div>
  );
}

// Accessible Progress Indicator with proper ARIA support
interface AccessibleProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  stepLabels?: string[];
  className?: string;
}

export function AccessibleProgressIndicator({
  currentStep,
  totalSteps,
  percentage,
  stepLabels = [],
  className = ''
}: AccessibleProgressIndicatorProps) {
  const progressId = `progress-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`space-y-3 ${className}`} role="region" aria-labelledby={`${progressId}-label`}>
      {/* Progress Label */}
      <div id={`${progressId}-label`} className="flex items-center justify-between">
        <span className="text-sm font-medium text-sage-700">
          Progress: {stepLabels[currentStep - 1] || `Step ${currentStep}`}
        </span>
        <span className="text-sm font-bold text-emerald-600">
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          aria-labelledby={`${progressId}-label`}
          className="w-full h-3 bg-sage-200 rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Step Indicators */}
        <div className="absolute inset-0 flex items-center justify-between px-2">
          {Array.from({ length: totalSteps }, (_, i) => {
            const stepNum = i + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div
                key={i}
                className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                  ${isCompleted
                    ? 'bg-emerald-600 border-emerald-700 text-white'
                    : isCurrent
                    ? 'bg-emerald-500 border-emerald-600 text-white'
                    : 'bg-white border-sage-300 text-sage-600'
                  }
                `}
                role="presentation"
                aria-hidden="true"
              >
                {isCompleted ? (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Description for Screen Readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Currently on step {currentStep} of {totalSteps}: {stepLabels[currentStep - 1] || `Step ${currentStep}`}
      </div>
    </div>
  );
}

// Skip Link Component for Keyboard Navigation
export function SkipLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4
                 bg-emerald-600 text-white px-4 py-2 rounded-lg z-50
                 focus:outline-none focus:ring-2 focus:ring-emerald-300"
    >
      {children}
    </a>
  );
}

// Accessible Form Field with proper labeling
interface AccessibleFormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function AccessibleFormField({
  id,
  label,
  required = false,
  error,
  hint,
  children,
  className = ''
}: AccessibleFormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block text-sm font-medium text-sage-700">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-sage-600">
          {hint}
        </p>
      )}

      <div className="relative">
        {children}
      </div>

      {error && (
        <p id={errorId} className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Screen Reader Announcement Utility
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.setAttribute('class', 'sr-only');
  announcement.textContent = message;

  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Focus Management Hook
export function useFocusManagement() {
  const [lastFocusedElement, setLastFocusedElement] = useState<HTMLElement | null>(null);

  const saveFocus = () => {
    setLastFocusedElement(document.activeElement as HTMLElement);
  };

  const restoreFocus = () => {
    if (lastFocusedElement && lastFocusedElement.focus) {
      lastFocusedElement.focus();
    }
  };

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  };

  return { saveFocus, restoreFocus, trapFocus };
}