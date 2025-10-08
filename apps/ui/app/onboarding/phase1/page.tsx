'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import PageContainer from '@/components/PageContainer';
import ProgressIndicator from '@/components/survey/ui/ProgressIndicator';
import QuestionCard from '@/components/survey/ui/QuestionCard';
import NavigationButtons from '@/components/survey/ui/NavigationButtons';
import { useSurveyLanguage } from '@/components/survey/hooks/useSurveyLanguage';
import { useSurveyValidation } from '@/components/survey/hooks/useSurveyValidation';
import { useSurveyState } from '@/components/survey/hooks/useSurveyState';
import { getQuestionsByPhase } from '@/components/survey/data/surveyQuestions';
import type { LikertScore } from '@sakinah/types';

export default function Phase1Page() {
  const router = useRouter();
  const { language, toggleLanguage, getLocalizedText } = useSurveyLanguage();
  const {
    state,
    updateResponse,
    setCurrentPhase,
    saveToAPI,
    isLoading
  } = useSurveyState();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Get Phase 1 questions
  const phase1Questions = getQuestionsByPhase(1);

  // Convert state responses to validation format
  const validationResponses = Object.fromEntries(
    Object.entries(state.responses).map(([key, value]) => [
      key,
      { score: value.score, note: value.note }
    ])
  );

  const { validation, canAdvanceToNextPhase } = useSurveyValidation({
    currentPhase: 1,
    responses: validationResponses,
  });

  // Set current phase on mount
  useEffect(() => {
    setCurrentPhase(1);
  }, [setCurrentPhase]);

  // Auto-save when responses change
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (hasUnsavedChanges && Object.keys(state.responses).length > 0) {
        setAutoSaveStatus('saving');
        try {
          await saveToAPI(1);
          setAutoSaveStatus('saved');
          setHasUnsavedChanges(false);
          setTimeout(() => setAutoSaveStatus('idle'), 2000);
        } catch (error) {
          setAutoSaveStatus('error');
          setTimeout(() => setAutoSaveStatus('idle'), 3000);
        }
      }
    }, 1000); // Auto-save after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [state.responses, hasUnsavedChanges, saveToAPI]);

  const handleResponseChange = (questionId: string, score: LikertScore) => {
    const existingNote = state.responses[questionId]?.note || '';
    updateResponse(questionId, score, existingNote);
    setHasUnsavedChanges(true);
  };

  const handleNoteChange = (questionId: string, note: string) => {
    const existingScore = state.responses[questionId]?.score;
    if (existingScore) {
      updateResponse(questionId, existingScore, note);
      setHasUnsavedChanges(true);
    }
  };

  const handleContinue = async () => {
    if (!canAdvanceToNextPhase) return;

    // Save before proceeding
    const saveSuccess = await saveToAPI(1);
    if (saveSuccess) {
      router.push('/onboarding/phase2');
    } else {
      // Handle save error - maybe show a toast or retry
      console.error('Failed to save Phase 1 responses');
    }
  };

  const handleBack = () => {
    router.push('/onboarding/welcome');
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

  const completedQuestions = Object.keys(state.responses).filter(
    questionId => phase1Questions.some(q => q.questionId === questionId)
  ).length;

  const currentProgress = (completedQuestions / phase1Questions.length) * 25 + 25; // 25% base + 25% for completion

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
          currentPhase={2}
          totalPhases={4}
          percentage={currentProgress}
        />

        {/* Page Header */}
        <motion.div
          className="text-center mb-8"
          variants={headerVariants}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-sage-900 mb-2">
            {getLocalizedText('Inner Heart Assessment', 'تقييم القلب الداخلي')}
          </h1>
          <p className="text-sage-600 max-w-2xl mx-auto leading-relaxed">
            {getLocalizedText(
              'Reflect honestly on your inner spiritual state. These questions help identify areas for spiritual purification.',
              'تأمل بصدق في حالتك الروحية الداخلية. هذه الأسئلة تساعد في تحديد المجالات التي تحتاج إلى تطهير روحي.'
            )}
          </p>

          {/* Language Toggle */}
          <motion.button
            onClick={toggleLanguage}
            className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-2 mx-auto"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            {language === 'en' ? 'عربي' : 'English'}
          </motion.button>
        </motion.div>

        {/* Questions */}
        <motion.div
          className="space-y-6 mb-8"
          variants={containerVariants}
        >
          {phase1Questions.map((question, index) => (
            <motion.div
              key={question.id}
              variants={{
                initial: { opacity: 0, y: 20 },
                animate: {
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.5,
                    delay: index * 0.1,
                    ease: "easeOut"
                  }
                }
              }}
            >
              <QuestionCard
                question={question}
                value={state.responses[question.questionId]?.score || null}
                note={state.responses[question.questionId]?.note || ''}
                onChange={(score) => handleResponseChange(question.questionId, score)}
                onNoteChange={(note) => handleNoteChange(question.questionId, note)}
                language={language}
                autoSave={true}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* Validation Messages */}
        {validation.errors.length > 0 && (
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
                <h3 className="text-sm font-medium text-red-800 mb-1">Please complete all questions</h3>
                <ul className="text-sm text-red-700">
                  {validation.errors.map((error, index) => (
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
              {autoSaveStatus === 'saving' && 'Saving responses...'}
              {autoSaveStatus === 'saved' && 'All responses saved'}
              {autoSaveStatus === 'error' && 'Failed to save - will retry'}
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
            nextLabel={`Continue to Phase 2 (${completedQuestions}/${phase1Questions.length})`}
            nextDisabled={!canAdvanceToNextPhase}
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
            Completed: {completedQuestions} of {phase1Questions.length} questions
            {canAdvanceToNextPhase && ' • Ready to continue!'}
          </p>
        </motion.div>
      </motion.div>
    </PageContainer>
  );
}