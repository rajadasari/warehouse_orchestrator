import React, { useState } from 'react';
import { User, Lock, ArrowRight, Building2, Boxes } from 'lucide-react';
import { loginApi, LoginResponse } from '../../services/authService';
import { MandatoryPasswordChangeModal } from './MandatoryPasswordChangeModal';
import { LoginHeroPanel } from './components/LoginHeroPanel';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Alert } from '../../components/common/Alert';
import { Modal } from '../../components/common/Modal';

interface LoginPageProps {
  onLoginSuccess: (user: { username: string; fullName: string; role: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingPasswordChange, setPendingPasswordChange] = useState<{
    required: boolean;
    username: string;
    initialPassword?: string;
  } | null>(null);

  // Corporate SSO Dialog State
  const [isSsoModalOpen, setIsSsoModalOpen] = useState(false);
  const [ssoCorporateEmail, setSsoCorporateEmail] = useState('');
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoError, setSsoError] = useState<string | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await loginApi({
        username: username.trim(),
        password,
        authMode: 'CREDENTIALS'
      });

      if (res.forcePasswordChange) {
        setPendingPasswordChange({
          required: true,
          username: res.username,
          initialPassword: password
        });
        return;
      }

      onLoginSuccess({
        username: res.username,
        fullName: res.fullName,
        role: res.role
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCorporateSsoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssoCorporateEmail.trim()) return;

    setSsoLoading(true);
    setSsoError(null);

    try {
      // Dynamic federated login initiation via corporate identity provider
      const res = await loginApi({
        username: ssoCorporateEmail.trim(),
        password: '',
        authMode: 'SSO'
      });

      setIsSsoModalOpen(false);
      onLoginSuccess({
        username: res.username,
        fullName: res.fullName,
        role: res.role
      });
    } catch (err: any) {
      setSsoError(err.message || 'Corporate SSO authentication was rejected by identity provider.');
    } finally {
      setSsoLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg-page)',
        overflow: 'hidden'
      }}
    >
      {/* LEFT INDUSTRIAL DIGITAL TWIN PANEL */}
      <LoginHeroPanel />

      {/* RIGHT AUTHENTICATION PANEL */}
      <div
        style={{
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px 20px',
          boxSizing: 'border-box',
          backgroundColor: 'var(--bg-page)',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '380px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '16px',
            padding: '24px 28px',
            boxShadow: 'var(--shadow-cloud)',
            border: '1px solid var(--border-default)',
            boxSizing: 'border-box',
            position: 'relative'
          }}
        >
          {/* Avatar / Brand Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.3)',
                border: '3px solid var(--bg-surface)'
              }}
            >
              <Boxes size={22} strokeWidth={2.2} />
            </div>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                marginBottom: '3px'
              }}
            >
              Welcome Back
            </h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
              Sign in to your Warehouse Digital Twin
            </p>
          </div>

          {errorMsg && (
            <Alert type="danger" className="mb-3">
              {errorMsg}
            </Alert>
          )}

          {/* Credentials Form */}
          <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              label="Email or Username"
              required
              prefixIcon={<User size={15} />}
              placeholder="Enter username or email"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              showPasswordToggle
              required
              prefixIcon={<Lock size={15} />}
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />

            {/* Forgot Password Notice */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px' }}>
              <a
                href="#forgot"
                onClick={e => {
                  e.preventDefault();
                  alert('Please contact your shift supervisor or OT security admin to reset credentials.');
                }}
                style={{
                  color: 'var(--color-primary-600)',
                  textDecoration: 'none',
                  fontWeight: 600
                }}
              >
                Forgot Password?
              </a>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              icon={<ArrowRight size={15} />}
              iconPosition="right"
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                borderColor: '#EA580C',
                boxShadow: '0 3px 10px rgba(249, 115, 22, 0.35)'
              }}
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '16px 0',
              gap: '10px'
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-default)' }} />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text-disabled)',
                textTransform: 'uppercase'
              }}
            >
              OR
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-default)' }} />
          </div>

          {/* Enterprise Corporate SSO Initiation */}
          <Button
            type="button"
            variant="secondary"
            size="md"
            icon={<Building2 size={15} color="var(--color-primary-600)" />}
            onClick={() => {
              setSsoCorporateEmail('');
              setSsoError(null);
              setIsSsoModalOpen(true);
            }}
            style={{ width: '100%' }}
          >
            Sign in with Corporate SSO
          </Button>
        </div>
      </div>

      {/* Enterprise Single Sign-On Modal */}
      <Modal
        isOpen={isSsoModalOpen}
        onClose={() => setIsSsoModalOpen(false)}
        title="Enterprise Single Sign-On"
        subtitle="Authenticate via Azure AD, Okta, or Keycloak OIDC"
        maxWidth="420px"
      >
        <form onSubmit={handleCorporateSsoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Alert type="info">
            Enter your corporate identity email address to initiate federated authentication with your organization's IdP.
          </Alert>

          {ssoError && (
            <Alert type="danger">
              {ssoError}
            </Alert>
          )}

          <Input
            label="Corporate Email Address"
            type="email"
            required
            placeholder="e.g. operator@company.com"
            value={ssoCorporateEmail}
            onChange={e => setSsoCorporateEmail(e.target.value)}
            prefixIcon={<Building2 size={14} />}
            autoFocus
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsSsoModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={ssoLoading}
              icon={<ArrowRight size={13} />}
              iconPosition="right"
            >
              Continue with SSO
            </Button>
          </div>
        </form>
      </Modal>

      {/* Mandatory First-Time Password Change Modal (IEC 62443-4-2) */}
      {pendingPasswordChange?.required && (
        <MandatoryPasswordChangeModal
          username={pendingPasswordChange.username}
          initialPassword={pendingPasswordChange.initialPassword}
          onPasswordChanged={(res: LoginResponse) => {
            setPendingPasswordChange(null);
            onLoginSuccess({
              username: res.username,
              fullName: res.fullName,
              role: res.role
            });
          }}
          onCancel={() => setPendingPasswordChange(null)}
        />
      )}
    </div>
  );
};
