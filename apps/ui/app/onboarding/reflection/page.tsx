'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import PageContainer from '@/components/PageContainer';
import ProgressIndicator from '@/components/survey/ui/ProgressIndicator';
import NavigationButtons from '@/components/survey/ui/NavigationButtons';
import { useSurveyLanguage } from '@/components/survey/hooks/useSurveyLanguage';
import { useSurveyState } from '@/components/survey/hooks/useSurveyState';
import type { ReflectionPreview } from '@sakinah/types';

export default function ReflectionPage() {
  const router = useRouter();
  const { language, translations, t } = useSurveyLanguage();
  const {
    state,
    updateReflection,
    setCurrentPhase,
    saveToAPI,
    isLoading
  } = useSurveyState();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [preview, setPreview] = useState<ReflectionPreview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Set current phase on mount
  useEffect(() => {
    setCurrentPhase(3);
  }, [setCurrentPhase]);

  // Validation logic - memoized to prevent infinite re-renders
  const validateReflection = useCallback(() => {
    const errors: string[] = [];

    if (!state.reflectionAnswers.strongestStruggle.trim()) {
      errors.push('Please describe your strongest struggle');
    } else if (state.reflectionAnswers.strongestStruggle.trim().length < 10) {
      errors.push('Description must be at least 10 characters');
    } else if (state.reflectionAnswers.strongestStruggle.trim().length > 500) {
      errors.push('Description cannot exceed 500 characters');
    }

    if (!state.reflectionAnswers.dailyHabit.trim()) {
      errors.push('Please describe a daily habit');
    } else if (state.reflectionAnswers.dailyHabit.trim().length < 10) {
      errors.push('Habit description must be at least 10 characters');
    } else if (state.reflectionAnswers.dailyHabit.trim().length > 500) {
      errors.push('Habit description cannot exceed 500 characters');
    }

    return { isValid: errors.length === 0, errors };
  }, [state.reflectionAnswers]);

  // Update validation errors when validation changes
  useEffect(() => {
    const validation = validateReflection();
    setValidationErrors(validation.errors);
  }, [validateReflection]);

  // Auto-save when reflection answers change
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (hasUnsavedChanges && state.reflectionAnswers.strongestStruggle && state.reflectionAnswers.dailyHabit) {
        if (validateReflection().isValid) {
          setAutoSaveStatus('saving');
          try {
            await saveToAPI(3);
            setAutoSaveStatus('saved');
            setHasUnsavedChanges(false);
            setTimeout(() => setAutoSaveStatus('idle'), 2000);
          } catch (error) {
            setAutoSaveStatus('error');
            setTimeout(() => setAutoSaveStatus('idle'), 3000);
          }
        }
      }
    }, 1000); // Auto-save after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [state.reflectionAnswers, hasUnsavedChanges, saveToAPI]);

  const handleStrongestStruggleChange = (value: string) => {
    updateReflection('strongestStruggle', value);
    setHasUnsavedChanges(true);
    setShowPreview(false); // Hide preview when user is editing
  };

  const handleDailyHabitChange = (value: string) => {
    updateReflection('dailyHabit', value);
    setHasUnsavedChanges(true);
    setShowPreview(false); // Hide preview when user is editing
  };

  const generatePreview = async () => {
    if (!validateReflection().isValid) return;

    setShowPreview(true);

    // Simulate AI preview generation based on reflection answers
    // This is a simplified version as mentioned in the requirements
    const mockPreview: ReflectionPreview = {
      personalizedHabits: [
        t('mockPreview.personalizedHabits.morningDhikr'),
        t('mockPreview.personalizedHabits.eveningReflection'),
        t('mockPreview.personalizedHabits.dailyGratitude')
      ],
      takhliyahFocus: [
        t('mockPreview.takhliyahFocus.purificationFromEnvy'),
        t('mockPreview.takhliyahFocus.overcomingArrogance')
      ],
      tahliyahFocus: [
        t('mockPreview.tahliyahFocus.cultivatingPatience'),
        t('mockPreview.tahliyahFocus.developingTawakkul')
      ]
    };

    setPreview(mockPreview);
  };

  const handleContinue = async () => {
    if (!validateReflection().isValid) return;

    // Save before proceeding
    const saveSuccess = await saveToAPI(3);
    if (saveSuccess) {
      router.push('/onboarding/results');
    } else {
      console.error('Failed to save reflection responses');
    }
  };

  const handleBack = () => {
    router.push('/onboarding/phase2');
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const headerVariants = {
    initial: { opacity: 0, y: -20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    }
  };

  const validation = validateReflection();
  const isComplete = validation.isValid;
  const currentProgress = 75 + (isComplete ? 25 : 0); // 75% base + 25% for completion

  return (
    <PageContainer
      maxWidth="lg"
      padding="lg"
      className="min-h-screen"
    >
      <motion.div
        className="max-w-3xl mx-auto"
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {/* Progress Indicator */}
        <ProgressIndicator
          currentPhase={4}
          totalPhases={4}
          percentage={currentProgress}
        />

        {/* Page Header */}
        <motion.div
          className="text-center mb-8"
          variants={headerVariants}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-sage-900 mb-2">
            {translations.pages.reflection.title}
          </h1>
          <p className="text-sage-600 max-w-2xl mx-auto leading-relaxed">
            {translations.pages.reflection.subtitle}
          </p>

        </motion.div>

        {/* Reflection Questions */}
        <motion.div className="space-y-6 mb-8">
          {/* Question 1: Strongest Struggle */}
          <motion.div
            className="card-islamic rounded-2xl border-2 border-sage-300 p-6"
            variants={cardVariants}
          >
            <div className={`mb-4 ${language === 'ar' ? 'text-right' : ''}`}>
              <h3 className={`text-lg font-semibold text-sage-900 mb-2 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                1. {translations.reflection.strongestStruggle.label}
              </h3>
              <p className={`text-sage-600 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
                {translations.reflection.strongestStruggle.description}
              </p>
            </div>

            <textarea
              value={state.reflectionAnswers.strongestStruggle}
              onChange={(e) => handleStrongestStruggleChange(e.target.value)}
              placeholder={translations.reflection.strongestStruggle.placeholder}
              className={`
                w-full p-4 border border-sage-200 rounded-lg
                focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300
                transition-all duration-200 resize-none
                ${language === 'ar' ? 'arabic-body text-right' : ''}
              `}
              rows={4}
              maxLength={500}
            />
            <div className={`flex justify-between items-center mt-2 text-xs text-sage-500 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <span>
                {state.reflectionAnswers.strongestStruggle.length}/500 {t('common.characters')}
              </span>
              <span>
                {t('common.minimumCharacters')}
              </span>
            </div>
          </motion.div>

          {/* Question 2: Daily Habit */}
          <motion.div
            className="card-islamic rounded-2xl border-2 border-sage-300 p-6"
            variants={cardVariants}
          >
            <div className={`mb-4 ${language === 'ar' ? 'text-right' : ''}`}>
              <h3 className={`text-lg font-semibold text-sage-900 mb-2 ${language === 'ar' ? 'arabic-heading' : ''}`}>
                {t('reflection.dailyHabit.label')}
              </h3>
              <p className={`text-sage-600 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
                {t('reflection.dailyHabit.description')}
              </p>
            </div>

            <textarea
              value={state.reflectionAnswers.dailyHabit}
              onChange={(e) => handleDailyHabitChange(e.target.value)}
              placeholder={t('reflection.dailyHabit.placeholder')}
              className={`
                w-full p-4 border border-sage-200 rounded-lg
                focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300
                transition-all duration-200 resize-none
                ${language === 'ar' ? 'arabic-body text-right' : ''}
              `}
              rows={4}
              maxLength={500}
            />
            <div className={`flex justify-between items-center mt-2 text-xs text-sage-500 ${language === 'ar' ? 'flex-row-reverse' : ''}`}>
              <span>
                {state.reflectionAnswers.dailyHabit.length}/500 {t('common.characters')}
              </span>
              <span>
                {t('common.minimumCharacters')}
              </span>
            </div>
          </motion.div>
        </motion.div>

        {/* Generate Preview Button */}
        {isComplete && !showPreview && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-center"
          >
            <motion.button
              onClick={generatePreview}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('reflection.preview.generateAI')}
            </motion.button>
          </motion.div>
        )}

        {/* AI Preview */}
        <AnimatePresence>
          {showPreview && preview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200">
                <h3 className={`text-lg font-semibold text-emerald-900 mb-4 ${language === 'ar' ? 'arabic-heading text-right' : ''}`}>
                  {t('reflection.preview.personalizedPlan')}
                </h3>

                {/* Personalized Habits */}
                <div className="mb-6">
                  <h4 className={`font-medium text-emerald-800 mb-2 ${language === 'ar' ? 'arabic-heading text-right' : ''}`}>
                    {t('reflection.preview.habitRecommendations')}
                  </h4>
                  <ul className={`space-y-1 ${language === 'ar' ? 'text-right' : ''}`}>
                    {preview.personalizedHabits.map((habit, index) => (
                      <li key={index} className={`text-emerald-700 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
                        • {habit}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Takhliyah Focus */}
                <div className="mb-6">
                  <h4 className={`font-medium text-emerald-800 mb-2 ${language === 'ar' ? 'arabic-heading text-right' : ''}`}>
                    {t('reflection.preview.takhliyahFocus')}
                  </h4>
                  <ul className={`space-y-1 ${language === 'ar' ? 'text-right' : ''}`}>
                    {preview.takhliyahFocus.map((focus, index) => (
                      <li key={index} className={`text-emerald-700 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
                        • {focus}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tahliyah Focus */}
                <div>
                  <h4 className={`font-medium text-emerald-800 mb-2 ${language === 'ar' ? 'arabic-heading text-right' : ''}`}>
                    {t('reflection.preview.tahliyahFocus')}
                  </h4>
                  <ul className={`space-y-1 ${language === 'ar' ? 'text-right' : ''}`}>
                    {preview.tahliyahFocus.map((focus, index) => (
                      <li key={index} className={`text-emerald-700 text-sm ${language === 'ar' ? 'arabic-body' : ''}`}>
                        • {focus}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`mt-4 text-xs text-emerald-600 ${language === 'ar' ? 'text-right arabic-body' : ''}`}>
                  {t('reflection.preview.previewNote')}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation Messages */}
        {validationErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
          >
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  {t('reflection.validation.completeQuestions')}
                </h3>
                <ul className="text-sm text-red-700">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Auto-save Status */}
        {autoSaveStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`flex items-center gap-2 text-sm p-3 rounded-lg mb-6 ${
              autoSaveStatus === 'saving'
                ? 'bg-blue-50 text-blue-700'
                : autoSaveStatus === 'saved'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {autoSaveStatus === 'saving' && (
              <motion.div
                className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            )}
            {autoSaveStatus === 'saved' && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            {autoSaveStatus === 'error' && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span>
              {autoSaveStatus === 'saving' && t('status.saving')}
              {autoSaveStatus === 'saved' && t('status.saved')}
              {autoSaveStatus === 'error' && t('status.error')}
            </span>
          </motion.div>
        )}

        {/* Navigation */}
        <motion.div
          variants={{
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.4 } }
          }}
        >
          <NavigationButtons
            onBack={handleBack}
            onNext={handleContinue}
            nextLabel={t('reflection.navigation.viewResults')}
            nextDisabled={!isComplete}
            loading={isLoading}
            showBack={true}
          />
        </motion.div>

        {/* Progress Summary */}
        <motion.div
          className="mt-8 text-center text-sm text-sage-500"
          variants={{
            initial: { opacity: 0 },
            animate: { opacity: 1, transition: { duration: 0.5, delay: 0.6 } }
          }}
        >
          <p>
            {t('reflection.navigation.reflectionPhase')} {isComplete ? t('common.complete') : t('common.inProgress')}
            {isComplete && ` • ${t('reflection.navigation.readyToView')}`}
          </p>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}