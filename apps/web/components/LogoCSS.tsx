import React from 'react';
import Image from 'next/image';
import styles from './Logo.module.css';

interface LogoCSSProps {
  src?: string;
  alt?: string;
  size?: 'small' | 'medium' | 'large' | 'xl' | 'responsive';
  className?: string;
  animated?: boolean;
}

const LogoCSS: React.FC<LogoCSSProps> = ({
  src = '/logo.png', // Updated to use the new PNG logo
  alt = 'Sakinah Logo',
  size = 'medium',
  className = '',
  animated = true
}) => {
  const sizeClass = styles[`logo-${size}`] || styles['logo-medium'];
  const imageClass = animated ? styles['logo-image'] : styles['logo-static'];

  return (
    <div className={`${styles['logo-container']} ${className}`}>
      <Image
        src={src}
        alt={alt}
        width={size === 'responsive' ? 100 : getSizeNumber(size)}
        height={size === 'responsive' ? 100 : getSizeNumber(size)}
        className={`${imageClass} ${sizeClass}`}
        priority
      />
    </div>
  );
};

// Helper function to get numeric size for Image component
function getSizeNumber(size: string): number {
  switch (size) {
    case 'small': return 40;
    case 'medium': return 80;
    case 'large': return 120;
    case 'xl': return 160;
    default: return 80;
  }
}

export default LogoCSS;
