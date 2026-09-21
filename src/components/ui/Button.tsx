import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses =
    'font-medium rounded-xl transition-all duration-300 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center';

  const variantClasses = {
    primary: 'ak-button-primary',
    secondary: 'ak-button-secondary',
    danger: 'ak-button-danger',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      <span className="relative z-10 flex items-center">
        {isLoading && (
          <span
            aria-hidden="true"
            className="w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin mr-2"
          />
        )}
        {children}
      </span>
    </button>
  );
};

export default Button;
