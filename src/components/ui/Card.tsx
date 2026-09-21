import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Shared parchment surface for the sanctuary design language.
 */
const Card: React.FC<CardProps> = ({
  children,
  className = '',
  hover = false,
  padding = 'md',
}) => {
  const baseClasses = 'ak-panel transition-shadow duration-200';

  const hoverClasses = hover
    ? 'hover:shadow-lg hover:border-[var(--theme-border-strong)]'
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
