import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '', size = 'md' }) => {
  
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full';
  
  const sizes = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1'
  };

  const variants = {
    success: 'bg-[#d1fae5] dark:bg-[rgba(16,185,129,0.1)] text-[#047857] dark:text-[#34d399] border border-[#a7f3d0] dark:border-[rgba(16,185,129,0.2)]',
    warning: 'bg-[#fef3c7] dark:bg-[rgba(245,158,11,0.1)] text-[#b45309] dark:text-[#fbbf24] border border-[#fde68a] dark:border-[rgba(245,158,11,0.2)]',
    error: 'bg-[#fee2e2] dark:bg-[rgba(239,68,68,0.1)] text-[#b91c1c] dark:text-[#f87171] border border-[#fecaca] dark:border-[rgba(239,68,68,0.2)]',
    info: 'bg-[#dbeafe] dark:bg-[rgba(59,130,246,0.1)] text-[#1d4ed8] dark:text-[#60a5fa] border border-[#bfdbfe] dark:border-[rgba(59,130,246,0.2)]',
    default: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
  };

  return (
    <span className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
