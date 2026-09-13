import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export type AlertType = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  type?: AlertType;
  variant?: AlertType;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  variant,
  title,
  icon,
  action,
  onClose,
  children,
  className = ''
}) => {
  const alertType = variant || type || 'info';

  const getDefaultIcon = () => {
    switch (alertType) {
      case 'success':
        return <CheckCircle2 size={16} color="var(--color-success-base)" />;
      case 'warning':
        return <AlertTriangle size={16} color="var(--color-warning-base)" />;
      case 'danger':
        return <AlertCircle size={16} color="var(--color-danger-base)" />;
      case 'info':
      default:
        return <Info size={16} color="var(--color-primary-600)" />;
    }
  };

  return (
    <div className={`alert alert-${alertType} ${className}`}>
      <span style={{ display: 'inline-flex', marginTop: '2px', flexShrink: 0 }}>
        {icon || getDefaultIcon()}
      </span>
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: 700, marginBottom: '2px' }}>{title}</div>}
        <div>{children}</div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px 6px',
            color: 'inherit',
            opacity: 0.7,
            fontWeight: 700,
            fontSize: '14px'
          }}
          title="Dismiss alert"
        >
          ✕
        </button>
      )}
    </div>
  );
};
