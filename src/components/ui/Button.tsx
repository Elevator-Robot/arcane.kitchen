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
    primary:
      'bg-gradient-to-r from-[#6d28d9] via-[#5b21b6] to-[#4338ca] hover:from-[#7c3aed] hover:via-[#6d28d9] hover:to-[#4f46e5] text-white border border-violet-400/60 hover:border-violet-300/70 shadow-lg shadow-violet-900/50 hover:shadow-violet-500/30 backdrop-blur-lg',
    secondary:
      'bg-gradient-to-r from-stone-800/60 via-green-900/30 to-amber-900/40 hover:from-stone-700/80 hover:via-green-800/50 hover:to-amber-800/60 backdrop-blur-lg border border-green-400/40 hover:border-green-400/70 text-stone-100 hover:text-green-200 shadow-lg shadow-green-500/20 hover:shadow-green-500/40',
    danger:
      'bg-gradient-to-r from-red-900/30 via-red-800/40 to-red-900/30 hover:from-red-800/50 hover:via-red-700/60 hover:to-red-800/50 border border-red-600/50 hover:border-red-500/70 text-red-300 hover:text-red-200 shadow-lg shadow-red-900/30 hover:shadow-red-500/20',
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
      {...props}
    >
      {/* Mystical background particles */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1 right-2 w-0.5 h-0.5 bg-green-300 rounded-full animate-pulse"></div>
        <div
          className="absolute bottom-1 left-3 w-0.5 h-0.5 bg-amber-300 rounded-full animate-ping"
          style={{ animationDelay: '1s' }}
        ></div>
      </div>

      <span className="relative z-10 flex items-center">
        {isLoading && (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
        )}
        {children}
      </span>
    </button>
  );
};

export default Button;
