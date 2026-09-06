import React from 'react';
import { 
  Users, 
  Moon, 
  Sun, 
  LogOut, 
  Layers, 
  ShieldCheck
} from 'lucide-react';

interface SideNavBarProps {
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
  activeItem?: string;
  userName?: string;
  userRole?: string;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentTheme,
  onToggleTheme,
  onLogout,
  activeItem = 'users',
  userName = 'System Administrator',
  userRole = 'ROLE_ADMIN'
}) => {
  return (
    <aside style={{
      width: '210px',
      minWidth: '210px',
      height: '100vh',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px 12px',
      boxSizing: 'border-box',
      position: 'relative',
      transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
    }}>
      {/* Top Brand / Logo matching reference */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 4px 14px 4px',
          borderBottom: '1px solid var(--border-default)',
          marginBottom: '14px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 3px 8px rgba(37, 99, 235, 0.25)'
          }}>
            <Layers size={18} />
          </div>
          <div>
            <div style={{
              fontWeight: 700,
              fontSize: '13.5px',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15
            }}>
              Orchestrator
            </div>
            <div style={{
              fontSize: '9.5px',
              color: 'var(--text-secondary)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Warehouse Twin
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{
            fontSize: '9.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'var(--text-disabled)',
            padding: '4px 8px 2px 8px'
          }}>
            Management
          </div>

          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              padding: '8px 12px',
              borderRadius: '9px',
              backgroundColor: activeItem === 'users' ? 'var(--bg-sidebar-active)' : 'transparent',
              color: activeItem === 'users' ? 'var(--text-sidebar-active)' : 'var(--text-secondary)',
              fontWeight: activeItem === 'users' ? 600 : 500,
              fontSize: '12.5px',
              transition: 'all var(--transition-fast)',
              border: activeItem === 'users' ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid transparent',
              textAlign: 'left'
            }}
          >
            <Users size={16} color={activeItem === 'users' ? 'var(--color-primary-500)' : 'currentColor'} />
            <span style={{ flex: 1 }}>Users</span>
            {activeItem === 'users' && (
              <span style={{
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-500)'
              }} />
            )}
          </button>
        </nav>
      </div>

      {/* Bottom Controls: Theme Toggle & Logout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border-default)'
      }}>
        {/* User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 8px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-subtle)'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'var(--color-primary-600)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '11px'
          }}>
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}>
              {userName}
            </div>
            <div style={{
              fontSize: '10px',
              color: 'var(--color-primary-500)',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}>
              <ShieldCheck size={11} />
              {userRole}
            </div>
          </div>
        </div>

        {/* Light/Dark Mode Switch */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7px 10px',
          borderRadius: '9px',
          backgroundColor: 'var(--bg-surface-subtle)',
          cursor: 'pointer'
        }}
        onClick={onToggleTheme}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--text-primary)'
          }}>
            {currentTheme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
            <span>{currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>

          {/* Toggle pill */}
          <div style={{
            width: '32px',
            height: '18px',
            borderRadius: '10px',
            backgroundColor: currentTheme === 'dark' ? 'var(--color-primary-600)' : 'var(--color-neutral-300)',
            position: 'relative',
            transition: 'background-color var(--transition-fast)'
          }}>
            <div style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              position: 'absolute',
              top: '2px',
              left: currentTheme === 'dark' ? '16px' : '2px',
              transition: 'left var(--transition-fast)',
              boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '8px',
            borderRadius: '9px',
            backgroundColor: currentTheme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
            color: 'var(--color-danger-base)',
            fontWeight: 600,
            fontSize: '12px',
            transition: 'all var(--transition-fast)',
            border: '1px solid rgba(239, 68, 68, 0.2)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-danger-base)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = currentTheme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2';
            e.currentTarget.style.color = 'var(--color-danger-base)';
          }}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
