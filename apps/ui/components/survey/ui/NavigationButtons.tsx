'use client';

import { motion } from 'framer-motion';
import AnimatedButton from '../../ui/AnimatedButton';

interface NavigationButtonsProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showBack?: boolean;
  loading?: boolean;
  className?: string;
}

export default function NavigationButtons({
  onBack,
  onNext,
  nextLabel = 'Continue',
  nextDisabled = false,
  showBack = true,
  loading = false,
  className = ''
}: NavigationButtonsProps) {
  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  };

  const buttonVariants = {
    initial: { opacity: 0, scale: 0.9 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  return (
    <motion.div
      className={`flex items-center justify-between gap-4 ${className}`}
      variants={containerVariants}
      initial="initial"
      animate="animate"
    >
      {/* Back Button */}
      {showBack && onBack ? (
        <motion.div variants={buttonVariants}>
          <AnimatedButton
            onClick={onBack}
            variant="outline"
            size="lg"
            disabled={loading}
            className="min-w-[120px]"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            }
            iconPosition="left"
          >
            Back
          </AnimatedButton>
        </motion.div>
      ) : (
        <div className="w-[120px]" /> // Spacer to maintain layout
      )}

      {/* Next Button */}
      <motion.div variants={buttonVariants}>
        <AnimatedButton
          onClick={onNext}
          variant="primary"
          size="lg"
          disabled={nextDisabled || loading}
          loading={loading}
          className="min-w-[160px]"
          icon={
            !loading && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )
          }
        >
          {loading ? 'Saving...' : nextLabel}
        </AnimatedButton>
      </motion.div>
    </motion.div>
  );
}