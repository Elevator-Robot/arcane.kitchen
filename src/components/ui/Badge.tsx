import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Compact metadata and status labels using the shared sanctuary palette.
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
    primary:
      'bg-[var(--theme-focus)] text-[var(--theme-accent-strong)] border border-[var(--theme-accent)]/20',
    secondary:
      'bg-[var(--theme-surface-alt)] text-[var(--theme-text-muted)] border border-[var(--theme-border)]',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-900 border border-amber-200',
    danger: 'bg-red-50 text-red-800 border border-red-200',
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
