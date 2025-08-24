import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className = '',
  ...props
}) => {
  const baseClasses = 'w-full text-base font-serif bg-gradient-to-r from-stone-800/80 via-green-900/20 to-stone-800/80 backdrop-blur-lg border border-green-400/40 rounded-xl px-6 py-4 text-emerald-200 placeholder-stone-500/60 focus:outline-none focus:border-green-400/80 focus:shadow-lg focus:shadow-green-500/20 focus:text-emerald-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-green-300 flex items-center">
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </label>
      )}
      <input
        className={`${baseClasses} ${error ? 'border-red-400/60 focus:border-red-400/80' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="text-red-300 text-sm flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;