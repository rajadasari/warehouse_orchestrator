import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  leftIcon,
  rightIcon,
  iconPosition = 'left',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const effectiveLeftIcon = leftIcon || (iconPosition === 'left' ? icon : undefined);
  const effectiveRightIcon = rightIcon || (iconPosition === 'right' ? icon : undefined);

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 size={size === 'sm' ? 12 : 15} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />}
      {!isLoading && effectiveLeftIcon && effectiveLeftIcon}
      {children && <span>{children}</span>}
      {!isLoading && effectiveRightIcon && effectiveRightIcon}
    </button>
  );
};
