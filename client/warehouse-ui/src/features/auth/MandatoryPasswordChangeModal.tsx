import React, { useState } from 'react';
import { ShieldAlert, Lock, CheckCircle2, ArrowRight, LogOut, Sparkles } from 'lucide-react';
import { changePasswordApi, LoginResponse } from '../../services/authService';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';

interface MandatoryPasswordChangeModalProps {
  username: string;
  initialPassword?: string;
  onPasswordChanged: (response: LoginResponse) => void;
  onCancel: () => void;
}

export const MandatoryPasswordChangeModal: React.FC<MandatoryPasswordChangeModalProps> = ({
  username,
  initialPassword = '',
  onPasswordChanged,
  onCancel
}) => {
  const [currentPassword, setCurrentPassword] = useState(initialPassword);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Policy validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const notCurrent = newPassword.length > 0 && newPassword !== currentPassword;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isValid = hasMinLength && hasNumberOrSymbol && notCurrent && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!hasMinLength) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (!notCurrent) {
      setErrorMsg('New password cannot be the same as your current temporary password.');
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg('The new passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await changePasswordApi({
        username,
        currentPassword,
        newPassword
      });
      onPasswordChanged(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      maxWidth="420px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: 'var(--color-danger-base)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ShieldAlert size={16} />
          </div>
          <div>Mandatory Password Change</div>
        </div>
      }
      subtitle="IEC 62443-4-2 Identification & Authentication Control"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Notice banner */}
        <Alert type="warning" icon={<Sparkles size={14} color="#F59E0B" />}>
          Account <strong>@{username}</strong> was issued a temporary password. You must set a permanent private password to continue.
        </Alert>

        {errorMsg && (
          <Alert type="danger">
            {errorMsg}
          </Alert>
        )}

        {/* Current Password */}
        <Input
          label="Current / Temporary Password"
          type="password"
          required
          showPasswordToggle
          prefixIcon={<Lock size={14} />}
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          placeholder="Current password"
        />

        {/* New Password */}
        <Input
          label="New Permanent Password"
          type="password"
          required
          showPasswordToggle
          prefixIcon={<Lock size={14} />}
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="At least 8 characters"
        />

        {/* Confirm Password */}
        <Input
          label="Confirm New Password"
          type="password"
          required
          showPasswordToggle
          prefixIcon={<Lock size={14} />}
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Re-enter new password"
        />

        {/* Policy Checklist */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            padding: '8px 10px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface-subtle)',
            fontSize: '10.5px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasMinLength ? 'var(--color-success-base)' : 'var(--text-secondary)' }}>
            <CheckCircle2 size={11} color={hasMinLength ? 'var(--color-success-base)' : 'var(--text-disabled)'} />
            <span>Min 8 characters</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasNumberOrSymbol ? 'var(--color-success-base)' : 'var(--text-secondary)' }}>
            <CheckCircle2 size={11} color={hasNumberOrSymbol ? 'var(--color-success-base)' : 'var(--text-disabled)'} />
            <span>Number / Symbol</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: notCurrent ? 'var(--color-success-base)' : 'var(--text-secondary)' }}>
            <CheckCircle2 size={11} color={notCurrent ? 'var(--color-success-base)' : 'var(--text-disabled)'} />
            <span>Different from current</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: passwordsMatch ? 'var(--color-success-base)' : 'var(--text-secondary)' }}>
            <CheckCircle2 size={11} color={passwordsMatch ? 'var(--color-success-base)' : 'var(--text-disabled)'} />
            <span>Passwords match</span>
          </div>
        </div>

        {/* Modal Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            icon={<LogOut size={13} />}
            onClick={onCancel}
          >
            Back to Login
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="md"
            icon={<ArrowRight size={14} />}
            iconPosition="right"
            isLoading={isSubmitting}
            disabled={!isValid || isSubmitting}
          >
            Save &amp; Enter
          </Button>
        </div>
      </form>
    </Modal>
  );
};
