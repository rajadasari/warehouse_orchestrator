import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  Radio, 
  Building2, 
  ArrowRight, 
  ShieldCheck, 
  Cpu, 
  Activity, 
  Boxes, 
  Key
} from 'lucide-react';

import { loginApi, LoginResponse } from '../../services/authService';
import { MandatoryPasswordChangeModal } from './MandatoryPasswordChangeModal';

interface LoginPageProps {
  onLoginSuccess: (user: { username: string; fullName: string; role: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<'CREDENTIALS' | 'BADGE'>('CREDENTIALS');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('TempIDP@2026!');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [badgeId, setBadgeId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pendingPasswordChange, setPendingPasswordChange] = useState<{
    required: boolean;
    username: string;
    initialPassword?: string;
  } | null>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await loginApi({
        username,
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

  const handleSsoLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await loginApi({
        username: 'anita.s',
        password: 'TempIDP@2026!',
        authMode: 'CREDENTIALS'
      });
      onLoginSuccess({
        username: res.username,
        fullName: res.fullName,
        role: res.role
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'SSO Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBadgeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeId) return;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const res = await loginApi({
        badgeId,
        authMode: 'BADGE'
      });
      onLoginSuccess({
        username: res.username,
        fullName: res.fullName,
        role: res.role
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'RFID Badge not recognized in database');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      backgroundColor: 'var(--bg-page)',
      overflow: 'hidden'
    }}>
      {/* =========================================================================
          LEFT HERO PANEL: Warehouse Digital World (Inspiring Industrial Hero)
          ========================================================================= */}
      <div style={{
        flex: '1.1',
        background: 'linear-gradient(135deg, #060D1A 0%, #0C1A30 50%, #0F2744 100%)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 36px',
        color: '#FFFFFF',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {/* Subtle Cybernetic Grid Pattern Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(59, 130, 246, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          pointerEvents: 'none'
        }} />

        {/* Ambient Glow Orbs */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, transparent 70%)',
          filter: 'blur(45px)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '10%',
          left: '-10%',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />

        {/* Top Branding */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '5px 12px',
            borderRadius: '9999px',
            marginBottom: '12px'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 8px #10B981'
            }} />
            <span style={{
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: '#93C5FD'
            }}>
              Warehouse Digital World • Facility FAC-BLR-01
            </span>
          </div>

          <h1 style={{
            fontSize: '22px',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.025em',
            marginBottom: '8px',
            maxWidth: '460px',
            color: '#FFFFFF'
          }}>
            Next-Gen Autonomous Logistics &amp; Digital Twin.
          </h1>
          <p style={{
            fontSize: '12px',
            color: '#BAD0F0',
            lineHeight: 1.5,
            maxWidth: '440px',
            margin: 0
          }}>
            Real-time orchestration of ASRS stacker cranes, AGV/AMR robot fleets, and conveyor sortation systems with zero-trust IEC 62443 cyber-physical security.
          </p>
        </div>

        {/* Center Digital Twin Visual Simulation Art */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          margin: '16px 0',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'rgba(12, 26, 48, 0.65)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '16px',
            padding: '16px',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)'
          }}>
            {/* Visual HUD Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '10px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 600, color: '#60A5FA' }}>
                <Cpu size={14} />
                <span>TELEMETRY OUTBOX STREAM</span>
              </div>
              <span style={{
                fontSize: '9.5px',
                color: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                padding: '2px 6px',
                borderRadius: '5px',
                fontWeight: 600
              }}>
                MQTT 5.0 LIVE
              </span>
            </div>

            {/* Simulated Live Plant Nodes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                { title: 'ASRS High-Bay', status: 'CRANE-01 OPERATIONAL', metric: '99.98% Uptime', icon: Boxes, color: '#3B82F6' },
                { title: 'Fleet VDA 5050', status: '14 AGVS IN-TRANSIT', metric: '0 Collisions', icon: Activity, color: '#10B981' },
                { title: 'Conveyor PLC', status: '12 DIVERTS ACTIVE', metric: '1,420 cph', icon: Cpu, color: '#F59E0B' }
              ].map((item, idx) => (
                <div key={idx} style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '9px',
                  padding: '9px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <item.icon size={13} color={item.color} />
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: item.color }} />
                  </div>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#FFFFFF' }}>{item.title}</div>
                  <div style={{ fontSize: '8.5px', color: '#8DA2C0', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {item.status}
                  </div>
                  <div style={{ fontSize: '10.5px', fontWeight: 700, color: item.color }}>
                    {item.metric}
                  </div>
                </div>
              ))}
            </div>

            {/* Warehouse Graphic Accent Lines */}
            <div style={{
              height: '3px',
              width: '100%',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #3B82F6 0%, #10B981 50%, #F59E0B 100%)',
              opacity: 0.8
            }} />
          </div>
        </div>

        {/* Bottom Security Compliance Notice */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '10.5px',
          color: '#8DA2C0'
        }}>
          <ShieldCheck size={15} color="#10B981" />
          <span>Compliant with ISA-95 Level 2/3 &amp; IEC 62443-3-3 Industrial Cybersecurity Standard.</span>
        </div>
      </div>

      {/* =========================================================================
          RIGHT AUTHENTICATION PANEL: Compact & Sleek
          ========================================================================= */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 20px',
        boxSizing: 'border-box',
        backgroundColor: 'var(--bg-page)',
        overflowY: 'auto'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '380px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '16px',
          padding: '24px 28px',
          boxShadow: 'var(--shadow-cloud)',
          border: '1px solid var(--border-default)',
          boxSizing: 'border-box',
          position: 'relative'
        }}>
          {/* Avatar / Top Industrial Badge */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '12px'
          }}>
            <div style={{
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
            }}>
              <Boxes size={22} strokeWidth={2.2} />
            </div>
          </div>

          {/* Heading */}
          <div style={{ textAlign: 'center', marginBottom: '14px' }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '3px'
            }}>
              Welcome Back
            </h2>
            <p style={{
              fontSize: '11.5px',
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Sign in to your Warehouse Digital Twin
            </p>
          </div>

          {/* Quick Switch: Password vs RFID Badge Tap */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-surface-subtle)',
            padding: '3px',
            borderRadius: '9px',
            marginBottom: '14px'
          }}>
            <button
              type="button"
              onClick={() => setAuthMode('CREDENTIALS')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '7px',
                fontSize: '11.5px',
                fontWeight: 600,
                backgroundColor: authMode === 'CREDENTIALS' ? 'var(--bg-surface)' : 'transparent',
                color: authMode === 'CREDENTIALS' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: authMode === 'CREDENTIALS' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
              }}
            >
              <Key size={13} />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('BADGE')}
              style={{
                flex: 1,
                padding: '6px 10px',
                borderRadius: '7px',
                fontSize: '11.5px',
                fontWeight: 600,
                backgroundColor: authMode === 'BADGE' ? 'var(--bg-surface)' : 'transparent',
                color: authMode === 'BADGE' ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: authMode === 'BADGE' ? 'var(--shadow-sm)' : 'none',
                transition: 'all var(--transition-fast)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px'
              }}
            >
              <Radio size={13} />
              <span>RFID Badge</span>
            </button>
          </div>

          {errorMsg && (
            <div style={{
              padding: '8px 12px',
              borderRadius: '7px',
              backgroundColor: 'var(--color-danger-bg)',
              color: 'var(--color-danger-text)',
              fontSize: '11.5px',
              fontWeight: 500,
              marginBottom: '12px'
            }}>
              {errorMsg}
            </div>
          )}

          {/* Form Content */}
          {authMode === 'CREDENTIALS' ? (
            <form onSubmit={handlePasswordLogin}>
              {/* Username / Email Input */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '4px'
                }}>
                  Email or Username
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 11px',
                  borderRadius: '9px',
                  border: '1.2px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  transition: 'border-color var(--transition-fast)'
                }}>
                  <User size={15} color="var(--text-secondary)" />
                  <input
                    type="text"
                    required
                    placeholder="Enter username or email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: '10px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '4px'
                }}>
                  Password
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 11px',
                  borderRadius: '9px',
                  border: '1.2px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  transition: 'border-color var(--transition-fast)'
                }}>
                  <Lock size={15} color="var(--text-secondary)" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      fontSize: '12.5px',
                      color: 'var(--text-primary)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ color: 'var(--text-secondary)', padding: '2px' }}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '11px',
                marginBottom: '14px'
              }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      accentColor: 'var(--color-primary-600)',
                      width: '13px',
                      height: '13px',
                      borderRadius: '3px'
                    }}
                  />
                  <span>Stay signed in (30d)</span>
                </label>
                <a 
                  href="#forgot" 
                  onClick={(e) => { e.preventDefault(); alert('Please contact your shift supervisor or OT security admin to reset credentials.'); }}
                  style={{
                    color: 'var(--color-primary-600)',
                    textDecoration: 'none',
                    fontWeight: 600
                  }}
                >
                  Forgot Password?
                </a>
              </div>

              {/* Sign In Primary Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '9px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  boxShadow: '0 3px 10px rgba(249, 115, 22, 0.35)',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.08)'}
                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* RFID Badge Tap Interface */
            <form onSubmit={handleBadgeLogin} style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                color: 'var(--color-primary-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px auto',
                animation: 'pulse 2s infinite'
              }}>
                <Radio size={28} />
              </div>
              <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Tap Operator RFID Badge
              </h3>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                Hold physical NFC/RFID badge or barcode card against the terminal scanner
              </p>

              <input
                type="text"
                autoFocus
                placeholder="Scan badge or enter serial..."
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '9px',
                  border: '1.2px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  fontSize: '12px',
                  color: 'var(--text-primary)',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  marginBottom: '12px'
                }}
              />

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '9px',
                  backgroundColor: 'var(--color-primary-600)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '12.5px'
                }}
              >
                Simulate Badge Scan
              </button>
            </form>
          )}

          {/* "OR" Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '14px 0',
            gap: '10px'
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-default)' }} />
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-disabled)', textTransform: 'uppercase' }}>
              OR
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-default)' }} />
          </div>

          {/* "Sign in with SSO" Button */}
          <button
            type="button"
            onClick={handleSsoLogin}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 12px',
              borderRadius: '9px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1.2px solid var(--border-strong)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: '12px',
              transition: 'all var(--transition-fast)',
              boxShadow: 'var(--shadow-sm)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-500)';
              e.currentTarget.style.backgroundColor = 'var(--bg-page)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)';
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)';
            }}
          >
            <Building2 size={15} color="var(--color-primary-600)" />
            <span>Sign in with SSO</span>
          </button>

          {/* Quick Demo Fill Helper */}
          <div style={{
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-default)',
            textAlign: 'center'
          }}>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Quick Demo Fill: <button 
                type="button" 
                onClick={() => { setUsername('admin'); setPassword('TempIDP@2026!'); }}
                style={{ color: 'var(--color-primary-600)', fontWeight: 600, textDecoration: 'underline' }}
              >
                admin / TempIDP@2026!
              </button>
            </span>
          </div>
        </div>
      </div>

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
