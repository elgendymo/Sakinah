'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LikertScore } from '@sakinah/types';
import type { SurveyQuestion } from '../types';
import LikertScale from './LikertScale';

interface QuestionCardProps {
  question: SurveyQuestion;
  value: LikertScore | null;
  note: string;
  onChange: (value: LikertScore) => void;
  onNoteChange: (note: string) => void;
  language: 'en' | 'ar';
  disabled?: boolean;
  autoSave?: boolean;
  className?: string;
}

export default function QuestionCard({
  question,
  value,
  note,
  onChange,
  onNoteChange,
  language,
  disabled = false,
  autoSave = true,
  className = ''
}: QuestionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNote, setShowNote] = useState(!!note || value === 4 || value === 5);

  const handleScoreChange = (newValue: LikertScore) => {
    onChange(newValue);

    // Show note field for high scores
    if (newValue >= 4) {
      setShowNote(true);
    }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    hover: {
      y: -4,
      scale: 1.02,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  const contentVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  const noteVariants = {
    initial: { opacity: 0, height: 0 },
    animate: {
      opacity: 1,
      height: "auto",
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      height: 0,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  };

  const title = language === 'ar' ? question.titleAr : question.titleEn;
  const questionText = language === 'ar' ? question.questionAr : question.questionEn;
  const isAnswered = value !== null;

  return (
    <motion.div
      className={`card-islamic rounded-2xl p-6 shadow-lg ${
        isAnswered ? 'ring-2 ring-emerald-200 bg-emerald-50/30' : 'bg-white'
      } ${className}`}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover={!disabled ? "hover" : "animate"}
      layout
    >
      <motion.div
        variants={contentVariants}
        initial="initial"
        animate="animate"
      >
        {/* Question Header */}
        <motion.div
          className="flex items-start justify-between mb-4"
          variants={itemVariants}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${isAnswered
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sage-200 text-sage-600'
                }
              `}>
                {question.order}
              </div>
              <h3 className={`text-lg font-bold ${
                language === 'ar' ? 'arabic-text text-right' : ''
              } ${isAnswered ? 'text-emerald-800' : 'text-sage-900'}`}>
                {title}
              </h3>
            </div>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-sage-500 hover:text-sage-700 transition-colors"
            >
              {isExpanded ? 'Show Less' : `Show ${language === 'en' ? 'Arabic' : 'English'}`}
            </button>
          </div>

          {/* Answer Status Indicator */}
          {isAnswered && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-emerald-600"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </motion.div>
          )}
        </motion.div>

        {/* Question Text */}
        <motion.div
          variants={itemVariants}
          className="mb-6"
        >
          <p className={`text-sage-700 leading-relaxed ${
            language === 'ar' ? 'arabic-text text-right' : ''
          }`}>
            {questionText}
          </p>

          {/* Bilingual Text Toggle */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 pt-3 border-t border-sage-200"
              >
                <p className={`text-sage-600 text-sm leading-relaxed ${
                  language === 'en' ? 'arabic-text text-right' : ''
                }`}>
                  {language === 'en' ? question.questionAr : question.questionEn}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Likert Scale */}
        <motion.div
          variants={itemVariants}
          className="mb-6"
        >
          <LikertScale
            value={value}
            onChange={handleScoreChange}
            disabled={disabled}
          />
        </motion.div>

        {/* Optional Note Field */}
        <AnimatePresence>
          {showNote && (
            <motion.div
              variants={noteVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="overflow-hidden"
            >
              <motion.div
                variants={itemVariants}
                className="space-y-2"
              >
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-sage-700">
                    Personal Notes (Optional)
                  </label>
                  {!note && value !== null && value < 4 && (
                    <button
                      type="button"
                      onClick={() => setShowNote(false)}
                      className="text-xs text-sage-500 hover:text-sage-700"
                    >
                      Hide
                    </button>
                  )}
                </div>

                <textarea
                  value={note}
                  onChange={(e) => onNoteChange(e.target.value)}
                  placeholder="Add any personal thoughts or specific examples..."
                  className="w-full p-3 border border-sage-300 rounded-lg focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition-colors resize-none text-sm"
                  rows={3}
                  maxLength={1000}
                  disabled={disabled}
                />

                <div className="flex justify-between text-xs text-sage-500">
                  <span>This helps personalize your recommendations</span>
                  <span>{note.length}/1000</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Note Button (when note field is hidden) */}
        {!showNote && (
          <motion.button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            variants={itemVariants}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add personal note
          </motion.button>
        )}

        {/* Auto-save Indicator */}
        {autoSave && isAnswered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-1 text-xs text-emerald-600 mt-3"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Auto-saved
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}