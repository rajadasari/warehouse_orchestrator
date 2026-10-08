import React from 'react';
import { RefreshCw, ShieldAlert, KeyRound, Hash } from 'lucide-react';

export interface TokenRefreshConfig {
  responseTokenProperty?: string;
  invalidationStatusCodes?: string; // e.g. "401, 403, 419"
  invalidationBodyMatch?: string;   // e.g. "TOKEN_EXPIRED"
  maxRetries?: number;              // 1, 2, 3
}

export interface TokenLifecycleCardProps {
  config: TokenRefreshConfig;
  onChange: (updated: TokenRefreshConfig) => void;
  disabled?: boolean;
}

export const TokenLifecycleCard: React.FC<TokenLifecycleCardProps> = ({
  config,
  onChange,
  disabled = false,
}) => {
  const responseTokenProperty = config.responseTokenProperty ?? 'accessToken';
  const invalidationStatusCodes = config.invalidationStatusCodes ?? '401, 403';
  const invalidationBodyMatch = config.invalidationBodyMatch ?? '';
  const maxRetries = config.maxRetries ?? 1;

  const handleChange = (field: keyof TokenRefreshConfig, value: unknown) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '14px',
        borderRadius: '8px',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        backgroundColor: 'rgba(56, 189, 248, 0.04)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={15} color="#38BDF8" />
          <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38BDF8' }}>
            Token Lifecycle & Reactive Auto-Refresh
          </span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
          Configurable Expiry Triggers (Zero Hardcoding)
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {/* Response Token Property Name */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <KeyRound size={12} color="#10B981" />
            Response Token Property *
          </label>
          <input
            type="text"
            value={responseTokenProperty}
            onChange={e => handleChange('responseTokenProperty', e.target.value)}
            disabled={disabled}
            placeholder="accessToken or access_token"
            style={inputStyle(disabled)}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            JSON key in login response containing the token string.
          </span>
        </div>

        {/* Invalidation Status Codes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Hash size={12} color="#F59E0B" />
            Re-Auth HTTP Status Codes *
          </label>
          <input
            type="text"
            value={invalidationStatusCodes}
            onChange={e => handleChange('invalidationStatusCodes', e.target.value)}
            disabled={disabled}
            placeholder="e.g. 401, 403, 419"
            style={inputStyle(disabled)}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Comma-separated HTTP codes that trigger token re-authentication.
          </span>
        </div>

        {/* Optional Body Match Pattern */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ShieldAlert size={12} color="#EC4899" />
            Response Body Match (Optional)
          </label>
          <input
            type="text"
            value={invalidationBodyMatch}
            onChange={e => handleChange('invalidationBodyMatch', e.target.value)}
            disabled={disabled}
            placeholder='e.g. TOKEN_EXPIRED or "code": 401'
            style={inputStyle(disabled)}
          />
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Error text or JSON keyword indicating the token has expired.
          </span>
        </div>

        {/* Max Re-Auth Retries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Max Re-Auth Retries
          </label>
          <select
            value={maxRetries}
            onChange={e => handleChange('maxRetries', Number(e.target.value))}
            disabled={disabled}
            style={inputStyle(disabled)}
          >
            <option value={1}>1 Retry (Recommended)</option>
            <option value={2}>2 Retries</option>
            <option value={3}>3 Retries</option>
          </select>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
            Safety limit to prevent cascading login loops on invalid credentials.
          </span>
        </div>
      </div>
    </div>
  );
};

const inputStyle = (disabled: boolean): React.CSSProperties => ({
  padding: '7px 10px',
  borderRadius: '6px',
  border: '1px solid var(--border-default)',
  backgroundColor: disabled ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  fontFamily: 'monospace',
  outline: 'none',
  minHeight: '36px',
  boxSizing: 'border-box',
});
