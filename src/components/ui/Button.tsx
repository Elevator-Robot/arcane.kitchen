import React from 'react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'danger-soft'
    | 'ghost'
    | 'choice'
    | 'image'
    | 'banner'
    | 'overlay'
    | 'menu'
    | 'unstyled';
  size?: 'sm' | 'md' | 'lg' | 'icon' | 'none';
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      children,
      className = '',
      disabled,
      type = 'button',
      'aria-busy': ariaBusy,
      ...props
    },
    ref
  ) => {
    const baseClasses = ['image', 'menu', 'unstyled'].includes(variant)
      ? 'relative'
      : 'relative inline-flex items-center justify-center gap-2 font-semibold';

    const variantClasses = {
      primary: 'ak-button-primary',
      secondary: 'ak-button-secondary',
      danger: 'ak-button-danger',
      'danger-soft': 'ak-button-danger-soft',
      ghost: 'ak-button-ghost',
      choice: 'ak-button-choice',
      image: 'ak-button-image',
      banner: 'ak-banner-action',
      overlay: 'ak-button-secondary ak-button-on-dark',
      menu: 'ak-menu-item',
      unstyled: '',
    };

    const sizeClasses = {
      sm: 'min-h-10 px-3 py-2 text-sm',
      md: 'min-h-11 px-5 py-2.5 text-sm',
      lg: 'min-h-12 px-6 py-3 text-base',
      icon: 'h-10 w-10 shrink-0 p-2',
      none: '',
    };

    return (
      <button
        data-ak-button=""
        ref={ref}
        type={type}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        disabled={disabled || isLoading}
        aria-busy={isLoading || ariaBusy || undefined}
        {...props}
      >
        {isLoading && (
          <span
            aria-hidden="true"
            className="inline-block h-4 w-4 shrink-0 align-middle border-2 border-current border-r-transparent rounded-full animate-spin"
          />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
