'use client';

import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  variant?: 'card' | 'text' | 'button' | 'question' | 'result';
  count?: number;
  className?: string;
}

export default function SkeletonLoader({
  variant = 'card',
  count = 1,
  className = ''
}: SkeletonLoaderProps) {
  const skeletonVariants = {
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
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3
      }
    }
  };

  const shimmerVariants = {
    initial: { x: '-100%' },
    animate: {
      x: '100%',
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: 'linear'
      }
    }
  };

  const renderSkeleton = () => {
    switch (variant) {
      case 'question':
        return (
          <div className="card-islamic rounded-2xl p-6 shadow-lg">
            {/* Question Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-sage-200 skeleton" />
                <div className="w-48 h-6 rounded bg-sage-200 skeleton" />
              </div>
              <div className="w-6 h-6 rounded-full bg-sage-200 skeleton" />
            </div>

            {/* Question Text */}
            <div className="space-y-2 mb-6">
              <div className="w-full h-4 rounded bg-sage-200 skeleton" />
              <div className="w-5/6 h-4 rounded bg-sage-200 skeleton" />
              <div className="w-4/6 h-4 rounded bg-sage-200 skeleton" />
            </div>

            {/* Likert Scale */}
            <div className="flex justify-between mb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-sage-200 skeleton" />
                  <div className="w-16 h-3 rounded bg-sage-200 skeleton" />
                </div>
              ))}
            </div>
          </div>
        );

      case 'result':
        return (
          <div className="card-islamic rounded-2xl p-8 shadow-lg">
            {/* Chart Placeholder */}
            <div className="w-full h-64 rounded-lg bg-sage-200 skeleton mb-6" />

            {/* Results Title */}
            <div className="w-48 h-8 rounded bg-sage-200 skeleton mx-auto mb-4" />

            {/* Result Items */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-sage-200 skeleton" />
                  <div className="flex-1 h-4 rounded bg-sage-200 skeleton" />
                  <div className="w-16 h-4 rounded bg-sage-200 skeleton" />
                </div>
              ))}
            </div>
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <div className="w-full h-4 rounded bg-sage-200 skeleton" />
            <div className="w-5/6 h-4 rounded bg-sage-200 skeleton" />
            <div className="w-4/6 h-4 rounded bg-sage-200 skeleton" />
          </div>
        );

      case 'button':
        return (
          <div className="w-32 h-10 rounded-lg bg-sage-200 skeleton" />
        );

      case 'card':
      default:
        return (
          <div className="card-islamic rounded-2xl p-6 shadow-lg">
            <div className="space-y-3">
              <div className="w-3/4 h-6 rounded bg-sage-200 skeleton" />
              <div className="w-full h-4 rounded bg-sage-200 skeleton" />
              <div className="w-5/6 h-4 rounded bg-sage-200 skeleton" />
              <div className="w-full h-4 rounded bg-sage-200 skeleton" />
              <div className="flex gap-3 mt-4">
                <div className="w-24 h-10 rounded-lg bg-sage-200 skeleton" />
                <div className="w-24 h-10 rounded-lg bg-sage-200 skeleton" />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      className={className}
      variants={skeletonVariants}
      initial="initial"
      animate="animate"
    >
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          variants={itemVariants}
          className={count > 1 ? 'mb-4' : ''}
        >
          <div className="relative overflow-hidden">
            {renderSkeleton()}

            {/* Shimmer Overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
            />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

// Loading State Component for Survey Pages
export function SurveyLoadingState() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Progress Bar Skeleton */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="w-32 h-4 rounded bg-sage-200 skeleton" />
          <div className="w-12 h-4 rounded bg-sage-200 skeleton" />
        </div>
        <div className="w-full h-3 rounded-full bg-sage-200 skeleton" />
      </div>

      {/* Question Cards */}
      <SkeletonLoader variant="question" count={2} />

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <SkeletonLoader variant="button" />
        <SkeletonLoader variant="button" />
      </div>
    </div>
  );
}

// Results Loading State
export function ResultsLoadingState() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Title Skeleton */}
      <div className="text-center mb-8">
        <div className="w-64 h-10 rounded bg-sage-200 skeleton mx-auto mb-3" />
        <div className="w-48 h-6 rounded bg-sage-200 skeleton mx-auto" />
      </div>

      {/* Results Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <SkeletonLoader variant="result" />
        <div className="space-y-4">
          <SkeletonLoader variant="card" count={2} />
        </div>
      </div>
    </div>
  );
}