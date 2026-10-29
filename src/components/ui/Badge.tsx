import React from 'react';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
}) => {
  return (
    <span className={`text-xs text-slate-700 font-medium ${className}`}>
      {children}
    </span>
  );
};
