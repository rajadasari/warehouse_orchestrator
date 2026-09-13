import React, { forwardRef } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  options?: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
  children?: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  required,
  error,
  hint,
  options,
  placeholder,
  className = '',
  containerClassName = '',
  id,
  children,
  ...props
}, ref) => {
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/\s+/g, '-')}` : undefined);

  return (
    <div className={`form-group ${containerClassName}`}>
      {label && (
        <label htmlFor={selectId} className={`form-label ${required ? 'form-label-required' : ''}`}>
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`form-select ${error ? 'form-select-error' : ''} ${className}`}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options
          ? options.map(opt => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
      {error && <span className="form-error-text">{error}</span>}
      {!error && hint && <span className="form-hint-text">{hint}</span>}
    </div>
  );
});

Select.displayName = 'Select';
