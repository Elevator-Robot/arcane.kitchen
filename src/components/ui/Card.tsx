import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Card component based on Meraki UI patterns
 * Adapted for Arcane Kitchen mystical theme
 */
const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
}) => {
  const baseClasses =
    'bg-white dark:bg-[#5C4033]/80 backdrop-blur-sm rounded-xl border border-[#B8B8B8]/30 dark:border-[#3A5A40]/30 shadow-lg transition-all duration-300';

  const hoverClasses = hover
    ? 'hover:shadow-xl hover:border-[#3A5A40]/50 hover:-translate-y-1 cursor-pointer'
    : '';

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`${baseClasses} ${hoverClasses} ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
