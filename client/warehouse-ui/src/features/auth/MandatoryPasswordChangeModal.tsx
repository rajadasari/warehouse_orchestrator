import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  LogOut,
  Sparkles
} from 'lucide-react';
import { changePasswordApi, LoginResponse } from '../../services/authService';

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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Strength check
  const hasMinLength = newPassword.length >= 8;
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
  const notDefault = newPassword !== 'TempIDP@2026!' && newPassword !== currentPassword;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!hasMinLength) {
      setErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (!notDefault) {
      setErrorMsg('New password cannot be the temporary default password or same as current password.');
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(6, 13, 26, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '14px',
        border: '1px solid var(--border-default)',
        width: '410px',
        maxWidth: '100%',
        boxShadow: 'var(--shadow-cloud)',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Mandatory Password Change
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
              IEC 62443-4-2 Identification &amp; Authentication Control
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '11px' }}>
          {/* Notice banner */}
          <div style={{
            padding: '8px 10px',
            borderRadius: '7px',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--text-primary)'
          }}>
            <Sparkles size={14} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              Account <strong>@{username}</strong> was issued an initial temporary password. You must set a permanent private password to continue.
            </div>
          </div>

          {errorMsg && (
            <div style={{
              padding: '7px 10px',
              borderRadius: '7px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger-text)',
              fontSize: '11.5px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Current / Temporary Password *
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '7px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <Lock size={14} color="var(--text-secondary)" />
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                style={{ color: 'var(--text-secondary)', padding: '2px' }}
              >
                {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              New Permanent Password *
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '7px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <Lock size={14} color="var(--text-secondary)" />
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                style={{ color: 'var(--text-secondary)', padding: '2px' }}
              >
                {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Confirm New Password *
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '7px',
              border: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <Lock size={14} color="var(--text-secondary)" />
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  fontSize: '12px',
                  color: 'var(--text-primary)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                style={{ color: 'var(--text-secondary)', padding: '2px' }}
              >
                {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Policy Checklist */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '5px',
            padding: '7px 9px',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-surface-subtle)',
            fontSize: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasMinLength ? '#10B981' : 'var(--text-secondary)' }}>
              <CheckCircle2 size={11} color={hasMinLength ? '#10B981' : 'var(--text-disabled)'} />
              <span>Min 8 characters</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasNumberOrSymbol ? '#10B981' : 'var(--text-secondary)' }}>
              <CheckCircle2 size={11} color={hasNumberOrSymbol ? '#10B981' : 'var(--text-disabled)'} />
              <span>Number / Symbol</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: notDefault ? '#10B981' : 'var(--text-secondary)' }}>
              <CheckCircle2 size={11} color={notDefault ? '#10B981' : 'var(--text-disabled)'} />
              <span>Not initial default</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: passwordsMatch ? '#10B981' : 'var(--text-secondary)' }}>
              <CheckCircle2 size={11} color={passwordsMatch ? '#10B981' : 'var(--text-disabled)'} />
              <span>Passwords match</span>
            </div>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                backgroundColor: 'var(--bg-surface-subtle)'
              }}
            >
              <LogOut size={13} />
              <span>Back to Login</span>
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !hasMinLength || !passwordsMatch || !notDefault}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                borderRadius: '7px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#FFFFFF',
                backgroundColor: 'var(--color-primary-600)',
                cursor: (isSubmitting || !hasMinLength || !passwordsMatch || !notDefault) ? 'not-allowed' : 'pointer',
                opacity: (isSubmitting || !hasMinLength || !passwordsMatch || !notDefault) ? 0.6 : 1,
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
              }}
            >
              {isSubmitting ? (
                <span>Updating...</span>
              ) : (
                <>
                  <span>Save &amp; Enter</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
