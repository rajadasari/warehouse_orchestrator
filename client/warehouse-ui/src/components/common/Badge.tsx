import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  icon,
  children,
  className = '',
  ...props
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`} {...props}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
};

export function getStatusBadgeVariant(status?: string | null): BadgeVariant {
  if (!status) return 'neutral';
  const s = status.toUpperCase();

  if (s.includes('SUCCESS') || s === 'STAGED' || s === 'LOADED' || s === 'COMPLETED' || s === 'ACTIVE') {
    return 'success';
  }
  if (s.includes('WARN') || s === 'IN_TRANSIT' || s === 'PROCESSING' || s === 'PENDING' || s === 'HOLD') {
    return 'warning';
  }
  if (s.includes('FAIL') || s.includes('ERR') || s === 'REJECTED' || s === 'CANCELLED') {
    return 'danger';
  }
  if (s.includes('INFO') || s === 'IN_ASRS' || s === 'CREATED' || s === 'RESERVED') {
    return 'info';
  }

  return 'neutral';
}
