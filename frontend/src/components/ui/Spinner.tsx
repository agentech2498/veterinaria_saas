import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div 
        className={`${sizes[size]} rounded-full border-slate-200 dark:border-slate-700 border-t-[#14b8a6] animate-spin`}
      />
    </div>
  );
};

export const FullPageLoader = () => (
  <div className="flex flex-col h-screen items-center justify-center bg-bg-app text-text-primary gap-4">
    <Spinner size="lg" />
    <span className="text-sm font-medium animate-pulse text-slate-500">Cargando...</span>
  </div>
);
