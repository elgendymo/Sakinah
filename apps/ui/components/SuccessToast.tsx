'use client';

import { useEffect, useState } from 'react';
import { Celebration } from '@mui/icons-material';

interface SuccessToastProps {
  message: string;
  icon?: React.ReactNode;
  onDismiss: () => void;
  duration?: number;
}

export function SuccessToast({
  message,
  icon = <Celebration sx={{ fontSize: 32, color: '#10b981' }} />,
  onDismiss,
  duration = 4000
}: SuccessToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Fade in animation
    setTimeout(() => setIsVisible(true), 100);

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-out
        ${isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
        }
      `}
    >
      <div className="bg-white rounded-xl shadow-2xl border border-emerald-200 overflow-hidden">
        {/* Success gradient header */}
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-green-500"></div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Animated icon */}
            <div className="flex-shrink-0">
              <div className={`
                transition-transform duration-500 ease-out
                ${isVisible ? 'animate-bounce' : ''}
              `}>
                {icon}
              </div>
            </div>

            {/* Message content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className={`
              h-full bg-gradient-to-r from-emerald-400 to-green-500
              transition-all duration-100 ease-linear
              ${isVisible ? 'animate-progress-bar' : 'w-full'}
            `}
            style={{
              animation: isVisible ? `shrink ${duration}ms linear` : undefined
            }}
          />
        </div>
      </div>

      {/* Custom keyframes for progress bar animation */}
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// Success Toast Hook for easy usage
export function useSuccessToast() {
  const [toast, setToast] = useState<{
    message: string;
    icon?: React.ReactNode;
  } | null>(null);

  const showToast = (message: string, icon?: React.ReactNode) => {
    setToast({ message, icon });
  };

  const hideToast = () => {
    setToast(null);
  };

  const ToastComponent = toast ? (
    <SuccessToast
      message={toast.message}
      icon={toast.icon}
      onDismiss={hideToast}
    />
  ) : null;

  return {
    showToast,
    hideToast,
    ToastComponent
  };
}