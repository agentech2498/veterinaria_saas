import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { 
      className = '', 
      variant = 'primary', 
      size = 'md', 
      icon: Icon, 
      iconPosition = 'left', 
      isLoading, 
      children, 
      disabled, 
      ...props 
    }, 
    ref
  ) => {
    
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const variants = {
      primary: 'bg-[#14b8a6] text-white hover:bg-[#0d9488] focus:ring-[#14b8a6] border border-transparent shadow-sm hover:shadow-md',
      secondary: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 focus:ring-slate-200 shadow-sm',
      danger: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-transparent hover:bg-red-100 dark:hover:bg-red-500/20 focus:ring-red-500',
      outline: 'bg-transparent text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:border-[#14b8a6] hover:text-[#14b8a6] focus:ring-[#14b8a6]',
      ghost: 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 focus:ring-slate-200 hover:text-slate-900 dark:hover:text-white border border-transparent'
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2 gap-2',
      lg: 'text-base px-6 py-3 gap-2.5'
    };

    const iconSizes = {
      sm: 14,
      md: 16,
      lg: 18
    };

    const isInteractive = !disabled && !isLoading;

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${isInteractive && variant === 'primary' ? 'hover:-translate-y-0.5' : ''} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        
        {!isLoading && Icon && iconPosition === 'left' && <Icon size={iconSizes[size]} />}
        
        <span>{children}</span>
        
        {!isLoading && Icon && iconPosition === 'right' && <Icon size={iconSizes[size]} />}
      </button>
    );
  }
);
Button.displayName = 'Button';
