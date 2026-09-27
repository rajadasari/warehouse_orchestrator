import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: number;
  label: string;
  description: string;
}

export interface StudioStepperProps {
  steps: StepItem[];
  currentStep: number;
  onSelectStep: (stepId: number) => void;
  isStepComplete: (stepId: number) => boolean;
  isEditing?: boolean;
}

export const StudioStepper: React.FC<StudioStepperProps> = ({
  steps,
  currentStep,
  onSelectStep,
  isStepComplete,
  isEditing = false
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '8px',
        overflowX: 'auto',
        flexShrink: 0
      }}
    >
      {steps.map((s, idx) => {
        const isActive = currentStep === s.id;
        const isCompleted = isStepComplete(s.id);
        const canClick = isEditing || isCompleted || s.id <= currentStep + 1;

        return (
          <React.Fragment key={s.id}>
            {idx > 0 && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  minWidth: '24px',
                  backgroundColor: isCompleted
                    ? 'var(--color-primary-500, #10B981)'
                    : 'var(--border-default)'
                }}
              />
            )}
            <button
              type="button"
              onClick={() => canClick && onSelectStep(s.id)}
              disabled={!canClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 14px',
                minHeight: '48px',
                borderRadius: '6px',
                border: isActive
                  ? '1.5px solid var(--color-primary-500, #38BDF8)'
                  : '1px solid var(--border-default)',
                backgroundColor: isActive
                  ? 'rgba(56, 189, 248, 0.08)'
                  : 'var(--bg-surface-subtle)',
                cursor: canClick ? 'pointer' : 'not-allowed',
                opacity: canClick ? 1 : 0.6,
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: isCompleted
                    ? '#10B981'
                    : isActive
                    ? 'var(--color-primary-500, #38BDF8)'
                    : 'var(--border-default)',
                  color: '#FFFFFF'
                }}
              >
                {isCompleted ? <Check size={14} /> : s.id}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: isActive
                      ? 'var(--color-primary-400, #38BDF8)'
                      : 'var(--text-primary)'
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-secondary)'
                  }}
                >
                  {s.description}
                </div>
              </div>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
};
