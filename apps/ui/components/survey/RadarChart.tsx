'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface RadarChartData {
  label: string;
  labelAr: string;
  value: number;
  maxValue: number;
  color: string;
  category: 'critical' | 'moderate' | 'strength';
}

interface RadarChartProps {
  data: RadarChartData[];
  size?: number;
  className?: string;
  animated?: boolean;
  showLabels?: boolean;
  showValues?: boolean;
  language?: 'en' | 'ar';
}

export default function RadarChart({
  data,
  size = 300,
  className = '',
  animated = true,
  showLabels = true,
  showValues = true,
  language = 'en'
}: RadarChartProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const center = size / 2;
  const radius = (size - 80) / 2;
  const angleStep = (2 * Math.PI) / data.length;

  // Generate points for the radar chart
  const generatePoints = (values: number[]) => {
    return values.map((value, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const distance = (value / 5) * radius; // Assuming max value is 5
      const x = center + Math.cos(angle) * distance;
      const y = center + Math.sin(angle) * distance;
      return { x, y, angle, distance };
    }).map(point => `${point.x},${point.y}`).join(' ');
  };

  // Generate background grid circles
  const gridCircles = [1, 2, 3, 4, 5].map(level => (
    <circle
      key={level}
      cx={center}
      cy={center}
      r={(level / 5) * radius}
      fill="none"
      stroke="rgb(203 209 203)"
      strokeWidth="1"
      strokeOpacity={0.3}
    />
  ));

  // Generate axis lines
  const axisLines = data.map((_, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const x2 = center + Math.cos(angle) * radius;
    const y2 = center + Math.sin(angle) * radius;

    return (
      <line
        key={index}
        x1={center}
        y1={center}
        x2={x2}
        y2={y2}
        stroke="rgb(203 209 203)"
        strokeWidth="1"
        strokeOpacity={0.5}
      />
    );
  });

  // Generate data polygon
  const dataPoints = generatePoints(data.map(d => d.value));

  // Generate label positions
  const labelPositions = data.map((item, index) => {
    const angle = angleStep * index - Math.PI / 2;
    const labelRadius = radius + 25;
    const x = center + Math.cos(angle) * labelRadius;
    const y = center + Math.sin(angle) * labelRadius;

    return {
      x,
      y,
      item,
      index,
      anchor: x < center ? 'end' : x > center ? 'start' : 'middle'
    };
  });

  const chartVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1]
      }
    }
  };

  const polygonVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 0.7,
      transition: {
        pathLength: { duration: 2, ease: 'easeOut' },
        opacity: { duration: 0.5, delay: 0.5 }
      }
    }
  };

  const pointVariants = {
    hidden: { scale: 0 },
    visible: (i: number) => ({
      scale: 1,
      transition: {
        delay: 0.5 + i * 0.1,
        type: 'spring',
        stiffness: 500,
        damping: 30
      }
    })
  };

  const labelVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: 1 + i * 0.05,
        duration: 0.4
      }
    })
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Chart Container */}
      <motion.div
        className="relative"
        variants={chartVariants}
        initial={animated ? 'hidden' : 'visible'}
        animate={isVisible ? 'visible' : 'hidden'}
      >
        <svg
          width={size}
          height={size}
          className="drop-shadow-lg"
        >
          {/* Background */}
          <defs>
            <radialGradient id="chartBackground" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgb(var(--emerald-50))" />
              <stop offset="100%" stopColor="rgb(255 255 255)" />
            </radialGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <circle
            cx={center}
            cy={center}
            r={radius + 10}
            fill="url(#chartBackground)"
            stroke="rgb(var(--emerald-200))"
            strokeWidth="2"
          />

          {/* Grid Circles */}
          {gridCircles}

          {/* Axis Lines */}
          {axisLines}

          {/* Data Polygon */}
          <motion.polygon
            points={dataPoints}
            fill="rgb(var(--emerald-500))"
            stroke="rgb(var(--emerald-600))"
            strokeWidth="2"
            variants={polygonVariants}
            initial={animated ? 'hidden' : 'visible'}
            animate={isVisible ? 'visible' : 'hidden'}
            filter="url(#glow)"
            style={{
              fillOpacity: hoveredIndex !== null ? 0.4 : 0.3,
              transition: 'fill-opacity 0.3s ease'
            }}
          />

          {/* Data Points */}
          {data.map((item, index) => {
            const angle = angleStep * index - Math.PI / 2;
            const distance = (item.value / 5) * radius;
            const x = center + Math.cos(angle) * distance;
            const y = center + Math.sin(angle) * distance;

            return (
              <motion.g key={index}>
                {/* Point Glow Effect */}
                <motion.circle
                  cx={x}
                  cy={y}
                  r="8"
                  fill={item.color}
                  opacity="0.3"
                  variants={pointVariants}
                  initial={animated ? 'hidden' : 'visible'}
                  animate={isVisible ? 'visible' : 'hidden'}
                  custom={index}
                />

                {/* Main Point */}
                <motion.circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={item.color}
                  stroke="white"
                  strokeWidth="2"
                  className="cursor-pointer"
                  variants={pointVariants}
                  initial={animated ? 'hidden' : 'visible'}
                  animate={isVisible ? 'visible' : 'hidden'}
                  custom={index}
                  whileHover={{ scale: 1.5 }}
                  onHoverStart={() => setHoveredIndex(index)}
                  onHoverEnd={() => setHoveredIndex(null)}
                />
              </motion.g>
            );
          })}

          {/* Labels */}
          {showLabels && labelPositions.map(({ x, y, item, index, anchor }) => (
            <motion.text
              key={index}
              x={x}
              y={y}
              textAnchor={anchor as any}
              className={`text-xs font-medium ${
                language === 'ar' ? 'arabic-text' : ''
              } ${
                item.category === 'critical' ? 'fill-red-600' :
                item.category === 'moderate' ? 'fill-amber-600' :
                'fill-emerald-600'
              }`}
              variants={labelVariants}
              initial={animated ? 'hidden' : 'visible'}
              animate={isVisible ? 'visible' : 'hidden'}
              custom={index}
            >
              {language === 'ar' ? item.labelAr : item.label}
            </motion.text>
          ))}

          {/* Center Label */}
          <motion.text
            x={center}
            y={center + 5}
            textAnchor="middle"
            className="text-xs font-bold fill-sage-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            Spiritual State
          </motion.text>
        </svg>

        {/* Tooltip */}
        <AnimatePresence>
          {hoveredIndex !== null && (
            <motion.div
              className="absolute pointer-events-none bg-white rounded-lg shadow-lg p-3 border border-emerald-200"
              style={{
                left: labelPositions[hoveredIndex].x,
                top: labelPositions[hoveredIndex].y - 50,
                transform: 'translateX(-50%)'
              }}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              <div className="text-sm font-medium text-sage-900">
                {data[hoveredIndex].label}
              </div>
              <div className="text-xs text-sage-600">
                Score: {data[hoveredIndex].value}/5
              </div>
              <div className={`text-xs font-medium ${
                data[hoveredIndex].category === 'critical' ? 'text-red-600' :
                data[hoveredIndex].category === 'moderate' ? 'text-amber-600' :
                'text-emerald-600'
              }`}>
                {data[hoveredIndex].category === 'critical' ? 'High Risk' :
                 data[hoveredIndex].category === 'moderate' ? 'Moderate Risk' :
                 'Strength'}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Legend */}
      {showValues && (
        <motion.div
          className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.5, duration: 0.5 }}
        >
          {/* Critical Areas */}
          <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-lg font-bold text-red-600">
              {data.filter(d => d.category === 'critical').length}
            </div>
            <div className="text-xs text-red-700 font-medium">Critical Areas</div>
            <div className="text-xs text-red-600">Need Attention</div>
          </div>

          {/* Moderate Areas */}
          <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-lg font-bold text-amber-600">
              {data.filter(d => d.category === 'moderate').length}
            </div>
            <div className="text-xs text-amber-700 font-medium">Moderate Areas</div>
            <div className="text-xs text-amber-600">Room for Growth</div>
          </div>

          {/* Strengths */}
          <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="text-lg font-bold text-emerald-600">
              {data.filter(d => d.category === 'strength').length}
            </div>
            <div className="text-xs text-emerald-700 font-medium">Strengths</div>
            <div className="text-xs text-emerald-600">Well Developed</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}