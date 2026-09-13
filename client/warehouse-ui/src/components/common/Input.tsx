import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  required,
  error,
  hint,
  prefixIcon,
  suffixIcon,
  showPasswordToggle = false,
  type = 'text',
  className = '',
  containerClassName = '',
  id,
  ...props
}, ref) => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPasswordType = type === 'password';
  const effectiveType = isPasswordType && showPasswordToggle
    ? (isPasswordVisible ? 'text' : 'password')
    : type;

  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  const renderSuffix = () => {
    if (showPasswordToggle && isPasswordType) {
      return (
        <button
          type="button"
          onClick={() => setIsPasswordVisible(prev => !prev)}
          tabIndex={-1}
          aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
          style={{
            background: 'none',
            border: 'none',
            padding: '2px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          {isPasswordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      );
    }
    return suffixIcon || null;
  };

  const hasSuffix = Boolean(suffixIcon || (showPasswordToggle && isPasswordType));

  return (
    <div className={`form-group ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className={`form-label ${required ? 'form-label-required' : ''}`}>
          {label}
        </label>
      )}
      <div className="input-wrapper">
        {prefixIcon && <span className="input-icon-prefix">{prefixIcon}</span>}
        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          className={`form-input ${prefixIcon ? 'has-prefix' : ''} ${hasSuffix ? 'has-suffix' : ''} ${error ? 'form-input-error' : ''} ${className}`}
          {...props}
        />
        {hasSuffix && <span className="input-icon-suffix">{renderSuffix()}</span>}
      </div>
      {error && <span className="form-error-text">{error}</span>}
      {!error && hint && <span className="form-hint-text">{hint}</span>}
    </div>
  );
});

Input.displayName = 'Input';
