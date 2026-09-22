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
  id,
  'aria-describedby': describedBy,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const baseClasses =
    'ak-input w-full min-h-12 rounded-xl px-4 py-3 text-base placeholder:text-[var(--theme-text-muted)] disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="flex items-center text-sm font-semibold text-[var(--theme-text)]"
        >
          {icon && <span className="mr-2">{icon}</span>}
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          [describedBy, error ? errorId : undefined]
            .filter(Boolean)
            .join(' ') || undefined
        }
        className={`${baseClasses} ${error ? 'border-red-600' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-red-700 text-sm flex items-center">
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
