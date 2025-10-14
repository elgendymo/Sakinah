'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSurveyProgress } from '../../hooks/useSurveyProgress';
import PageContainer from '@/components/PageContainer';

interface SurveyProgressGuardProps {
  children: React.ReactNode;
  requiredPhase: number;
  phaseName: string;
}

/**
 * Component that guards survey pages and enforces phase progression
 */
export default function SurveyProgressGuard({
  children,
  requiredPhase,
  phaseName
}: SurveyProgressGuardProps) {
  const {
    progress,
    loading,
    error,
    canAccessPhase,
    getRedirectPath,
    isPhaseAccessDenied
  } = useSurveyProgress();

  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading && progress) {
      if (!canAccessPhase(requiredPhase)) {
        setShowAccessDenied(true);
        // Redirect after a brief delay to show the access denied message
        const timer = setTimeout(() => {
          router.push(getRedirectPath());
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
    // Return cleanup function for all code paths
    return () => {};
  }, [loading, progress, requiredPhase, canAccessPhase, getRedirectPath, router]);

  // Show loading state
  if (loading) {
    return (
      <PageContainer
        maxWidth="md"
        padding="xl"
        className="flex items-center justify-center min-h-screen"
      >
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-sage-600">Loading survey progress...</p>
        </motion.div>
      </PageContainer>
    );
  }

  // Show error state
  if (error) {
    return (
      <PageContainer
        maxWidth="md"
        padding="xl"
        className="flex items-center justify-center min-h-screen"
      >
        <motion.div
          className="text-center card-islamic p-8 rounded-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-sage-900 mb-4">
            Unable to Load Survey Progress
          </h2>
          <p className="text-sage-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Try Again
          </button>
        </motion.div>
      </PageContainer>
    );
  }

  // Show access denied state
  if (showAccessDenied || isPhaseAccessDenied || (progress && !canAccessPhase(requiredPhase))) {
    const nextPhase = progress?.nextAvailablePhase || 0;
    const phaseNames = {
      0: 'Welcome',
      1: 'Phase 1',
      2: 'Phase 2',
      3: 'Reflection',
      4: 'Results'
    };

    return (
      <PageContainer
        maxWidth="md"
        padding="xl"
        className="flex items-center justify-center min-h-screen"
      >
        <motion.div
          className="text-center card-islamic p-8 rounded-2xl max-w-md"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-amber-600 text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-sage-900 mb-4">
            Phase Access Restricted
          </h2>
          <p className="text-sage-600 mb-4">
            You cannot access <strong>{phaseName}</strong> yet. Please complete the previous phases first.
          </p>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-emerald-800">
              <strong>Next available:</strong> {phaseNames[nextPhase as keyof typeof phaseNames]}
            </p>
            {progress && (
              <div className="mt-2">
                <div className="text-xs text-emerald-700 mb-1">
                  Progress: {progress.progressPercentage}%
                </div>
                <div className="w-full bg-emerald-100 rounded-full h-2">
                  <div
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.progressPercentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-sage-500 mb-4">
            Redirecting you to the correct phase...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 mx-auto"></div>
        </motion.div>
      </PageContainer>
    );
  }

  // Show survey completed state if trying to access non-results page
  if (progress?.isCompleted && requiredPhase !== 4) {
    return (
      <PageContainer
        maxWidth="md"
        padding="xl"
        className="flex items-center justify-center min-h-screen"
      >
        <motion.div
          className="text-center card-islamic p-8 rounded-2xl max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-emerald-600 text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-sage-900 mb-4">
            Survey Already Completed
          </h2>
          <p className="text-sage-600 mb-6">
            You have already completed the Tazkiyah Discovery Survey. View your results to see your personalized recommendations.
          </p>
          <button
            onClick={() => router.push('/onboarding/results')}
            className="btn-primary w-full"
          >
            View Results
          </button>
        </motion.div>
      </PageContainer>
    );
  }

  // Render children if all checks pass
  return <>{children}</>;
}

/**
 * HOC for wrapping survey pages with progress guard
 */
export function withSurveyProgressGuard<T extends object>(
  Component: React.ComponentType<T>,
  requiredPhase: number,
  phaseName: string
) {
  return function GuardedComponent(props: T) {
    return (
      <SurveyProgressGuard requiredPhase={requiredPhase} phaseName={phaseName}>
        <Component {...props} />
      </SurveyProgressGuard>
    );
  };
}