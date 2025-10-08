'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExpandMore, ExpandLess, Notes } from '@mui/icons-material';
import type { LikertScore } from '@sakinah/types';
import LikertScale from './LikertScale';

interface QuestionCardProps {
  number: number;
  titleEn: string;
  titleAr: string;
  questionEn: string;
  questionAr: string;
  value: LikertScore | null;
  onChange: (value: LikertScore) => void;
  note?: string;
  onNoteChange: (note: string) => void;
  language?: 'en' | 'ar';
  disabled?: boolean;
  className?: string;
  showBilingualToggle?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export default function QuestionCard({
  number,
  titleEn,
  titleAr,
  questionEn,
  questionAr,
  value,
  onChange,
  note = '',
  onNoteChange,
  language = 'en',
  disabled = false,
  className = '',
  showBilingualToggle = true,
  variant = 'default'
}: QuestionCardProps) {
  const [showSecondLanguage, setShowSecondLanguage] = useState(false);
  const [showNoteField, setShowNoteField] = useState(Boolean(note));
  // const [isExpanded, setIsExpanded] = useState(false);

  const isRTL = language === 'ar';
  const primaryTitle = language === 'ar' ? titleAr : titleEn;
  const primaryQuestion = language === 'ar' ? questionAr : questionEn;
  const secondaryTitle = language === 'ar' ? titleEn : titleAr;
  const secondaryQuestion = language === 'ar' ? questionEn : questionAr;

  const cardVariants = {
    initial: { opacity: 0, y: 20, scale: 0.95 },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.95,
      transition: { duration: 0.2 }
    }
  };

  const contentVariants = {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  };

  const expandVariants = {
    collapsed: { height: 0, opacity: 0 },
    expanded: {
      height: "auto",
      opacity: 1,
      transition: {
        height: { duration: 0.3, ease: "easeOut" },
        opacity: { duration: 0.2, delay: 0.1 }
      }
    }
  };

  const noteFieldVariants = {
    hidden: { opacity: 0, height: 0, y: -10 },
    visible: {
      opacity: 1,
      height: "auto",
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  const getCompletionStatus = () => {
    if (value) return 'completed';
    return 'pending';
  };

  const getCardBorderColor = () => {
    const status = getCompletionStatus();
    if (disabled) return 'border-sage-200';
    if (status === 'completed') return 'border-emerald-300 shadow-emerald-100/50';
    return 'border-sage-300 hover:border-emerald-200';
  };

  const renderDefault = () => (
    <motion.div
      className={`
        card-islamic rounded-2xl border-2 transition-all duration-300
        ${getCardBorderColor()}
        ${disabled ? 'opacity-60' : 'hover:shadow-lg'}
        ${className}
        ${isRTL ? 'rtl' : ''}
      `}
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={!disabled ? { y: -2 } : {}}
    >
      {/* Question Header */}
      <div className="p-6 pb-4">
        <motion.div
          className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
          variants={contentVariants}
        >
          {/* Question Number and Status */}
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <motion.div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                ${getCompletionStatus() === 'completed'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-sage-100 text-sage-600 border-2 border-sage-300'
                }
              `}
              animate={
                getCompletionStatus() === 'completed'
                  ? { scale: [1, 1.1, 1] }
                  : {}
              }
              transition={{ duration: 0.3 }}
            >
              {getCompletionStatus() === 'completed' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                number
              )}
            </motion.div>

            <div>
              <h3 className={`text-lg font-semibold text-sage-900 ${isRTL ? 'arabic-heading' : ''}`}>
                {primaryTitle}
              </h3>
              {getCompletionStatus() === 'completed' && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-sm text-emerald-600 font-medium"
                >
                  {language === 'ar' ? 'مكتمل' : 'Completed'}
                </motion.span>
              )}
            </div>
          </div>

          {/* Language Toggle */}
          {showBilingualToggle && (
            <motion.button
              type="button"
              onClick={() => setShowSecondLanguage(!showSecondLanguage)}
              className="text-sage-500 hover:text-emerald-600 transition-colors p-2 rounded-lg hover:bg-emerald-50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {showSecondLanguage ? <ExpandLess /> : <ExpandMore />}
            </motion.button>
          )}
        </motion.div>

        {/* Primary Question */}
        <motion.p
          className={`text-sage-700 leading-relaxed mb-6 ${isRTL ? 'arabic-body text-right' : ''}`}
          variants={contentVariants}
        >
          {primaryQuestion}
        </motion.p>

        {/* Secondary Language (Expandable) */}
        <AnimatePresence>
          {showSecondLanguage && (
            <motion.div
              variants={expandVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
              className="overflow-hidden"
            >
              <div className="mb-6 p-4 bg-sage-50 rounded-xl border border-sage-200">
                <h4 className={`font-medium text-sage-800 mb-2 ${language === 'ar' ? '' : 'arabic-heading text-right'}`}>
                  {secondaryTitle}
                </h4>
                <p className={`text-sage-600 ${language === 'ar' ? '' : 'arabic-body text-right'}`}>
                  {secondaryQuestion}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Likert Scale */}
        <motion.div variants={contentVariants} className="mb-6">
          <LikertScale
            value={value}
            onChange={onChange}
            disabled={disabled}
            language={language}
            variant="default"
          />
        </motion.div>

        {/* Note Section */}
        <motion.div variants={contentVariants}>
          {/* Note Toggle Button */}
          <motion.button
            type="button"
            onClick={() => setShowNoteField(!showNoteField)}
            className={`
              flex items-center gap-2 text-sm font-medium transition-colors
              ${showNoteField || note
                ? 'text-emerald-600 hover:text-emerald-700'
                : 'text-sage-500 hover:text-sage-600'
              }
              ${isRTL ? 'flex-row-reverse' : ''}
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Notes sx={{ fontSize: 18 }} />
            <span className={isRTL ? 'arabic-text' : ''}>
              {language === 'ar' ? 'إضافة ملاحظة' : 'Add note'}
              {note && ` (${note.length} ${language === 'ar' ? 'حرف' : 'chars'})`}
            </span>
          </motion.button>

          {/* Note Field */}
          <AnimatePresence>
            {showNoteField && (
              <motion.div
                variants={noteFieldVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="overflow-hidden"
              >
                <textarea
                  value={note}
                  onChange={(e) => onNoteChange(e.target.value)}
                  placeholder={language === 'ar' ? 'اكتب ملاحظتك هنا...' : 'Write your note here...'}
                  className={`
                    w-full mt-3 p-3 border border-sage-200 rounded-lg
                    focus:ring-2 focus:ring-emerald-300/50 focus:border-emerald-300
                    transition-all duration-200 resize-none
                    ${isRTL ? 'arabic-body text-right' : ''}
                  `}
                  rows={3}
                  maxLength={500}
                  disabled={disabled}
                />
                <div className={`text-xs text-sage-500 mt-1 ${isRTL ? 'text-left' : 'text-right'}`}>
                  {note.length}/500
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );

  const renderCompact = () => (
    <motion.div
      className={`
        card-islamic rounded-xl border transition-all duration-300 p-4
        ${getCardBorderColor()}
        ${disabled ? 'opacity-60' : 'hover:shadow-md'}
        ${className}
        ${isRTL ? 'rtl' : ''}
      `}
      variants={cardVariants}
      initial="initial"
      animate="animate"
    >
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center font-bold
          ${getCompletionStatus() === 'completed'
            ? 'bg-emerald-600 text-white'
            : 'bg-sage-100 text-sage-600'
          }
        `}>
          {getCompletionStatus() === 'completed' ? '✓' : number}
        </div>

        <div className="flex-1">
          <p className={`text-sm font-medium text-sage-800 mb-2 ${isRTL ? 'arabic-body text-right' : ''}`}>
            {primaryTitle}
          </p>
          <LikertScale
            value={value}
            onChange={onChange}
            disabled={disabled}
            language={language}
            variant="compact"
            showLabels={false}
          />
        </div>
      </div>
    </motion.div>
  );

  switch (variant) {
    case 'compact':
      return renderCompact();
    case 'detailed':
      return renderDefault(); // Could be enhanced further
    default:
      return renderDefault();
  }
}