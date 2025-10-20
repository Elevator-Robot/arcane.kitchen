import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Badge component based on Meraki UI patterns
 * Adapted for Arcane Kitchen mystical theme
 */
const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  const baseClasses =
    'inline-flex items-center font-medium rounded-full transition-all duration-200';

  const variantClasses = {
    primary: 'bg-[#3A5A40]/10 text-[#3A5A40] border border-[#3A5A40]/30',
    secondary: 'bg-[#6C4AB6]/10 text-[#6C4AB6] border border-[#6C4AB6]/30',
    success: 'bg-[#3A5A40]/10 text-[#3A5A40] border border-[#3A5A40]/30',
    warning: 'bg-[#D4A017]/10 text-[#D4A017] border border-[#D4A017]/30',
    danger: 'bg-[#B33939]/10 text-[#B33939] border border-[#B33939]/30',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
