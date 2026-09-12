import React from 'react';
import { 
  Users, 
  Moon, 
  Sun, 
  LogOut, 
  Layers, 
  ShieldCheck,
  Boxes,
  SlidersHorizontal,
  Server,
  Send
} from 'lucide-react';

interface SideNavBarProps {
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
  activeItem?: string;
  onSelectNav?: (item: string) => void;
  userName?: string;
  userRole?: string;
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentTheme,
  onToggleTheme,
  onLogout,
  activeItem = 'users',
  onSelectNav,
  userName = 'System Administrator',
  userRole = 'ROLE_ADMIN'
}) => {
  const isLight = currentTheme === 'light';

  // Helper for navigation button styling
  const getNavButtonStyle = (isActive: boolean) => {
    if (isLight) {
      return {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        width: '100%',
        padding: '8px 12px',
        borderRadius: '9px',
        backgroundColor: isActive ? '#FFFFFF' : 'transparent',
        color: isActive ? '#153d77' : 'rgba(255, 255, 255, 0.9)',
        fontWeight: isActive ? 700 : 500,
        fontSize: '12.5px',
        transition: 'all var(--transition-fast)',
        border: isActive ? '1px solid #FFFFFF' : '1px solid transparent',
        boxShadow: isActive ? '0 2px 8px rgba(0, 0, 0, 0.18)' : 'none',
        textAlign: 'left' as const,
        cursor: 'pointer'
      };
    }
    return {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      width: '100%',
      padding: '8px 12px',
      borderRadius: '9px',
      backgroundColor: isActive ? 'var(--bg-sidebar-active)' : 'transparent',
      color: isActive ? 'var(--text-sidebar-active)' : 'var(--text-secondary)',
      fontWeight: isActive ? 600 : 500,
      fontSize: '12.5px',
      transition: 'all var(--transition-fast)',
      border: isActive ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid transparent',
      boxShadow: 'none',
      textAlign: 'left' as const,
      cursor: 'pointer'
    };
  };

  const getIconColor = (isActive: boolean) => {
    if (isLight) {
      return isActive ? '#153d77' : 'rgba(255, 255, 255, 0.9)';
    }
    return isActive ? 'var(--color-primary-500)' : 'currentColor';
  };

  const sectionHeaderColor = isLight ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-disabled)';
  const dividerColor = isLight ? 'rgba(255, 255, 255, 0.16)' : 'var(--border-default)';

  return (
    <aside style={{
      width: '210px',
      minWidth: '210px',
      height: '100vh',
      backgroundColor: isLight ? '#153d77' : 'var(--bg-sidebar)',
      borderRight: isLight ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '16px 12px',
      boxSizing: 'border-box',
      position: 'relative',
      transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
    }}>
      {/* Top Brand / Logo */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 4px 14px 4px',
          borderBottom: `1px solid ${dividerColor}`,
          marginBottom: '14px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: isLight ? '#FFFFFF' : 'linear-gradient(135deg, #2563EB 0%, #3B82F6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isLight ? '#153d77' : '#FFFFFF',
            boxShadow: isLight ? '0 3px 8px rgba(0, 0, 0, 0.15)' : '0 3px 8px rgba(37, 99, 235, 0.25)'
          }}>
            <Layers size={18} />
          </div>
          <div>
            <div style={{
              fontWeight: 700,
              fontSize: '13.5px',
              color: isLight ? '#FFFFFF' : 'var(--text-primary)',
              letterSpacing: '-0.02em',
              lineHeight: 1.15
            }}>
              Orchestrator
            </div>
            <div style={{
              fontSize: '9.5px',
              color: isLight ? 'rgba(255, 255, 255, 0.78)' : 'var(--text-secondary)',
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
          {/* Management Section */}
          <div style={{
            fontSize: '9.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: sectionHeaderColor,
            padding: '4px 8px 2px 8px'
          }}>
            Management
          </div>

          <button
            onClick={() => onSelectNav && onSelectNav('users')}
            style={getNavButtonStyle(activeItem === 'users')}
            onMouseEnter={(e) => {
              if (activeItem !== 'users') {
                e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.14)' : 'var(--bg-surface-subtle)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeItem !== 'users') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Users size={16} color={getIconColor(activeItem === 'users')} />
            <span style={{ flex: 1 }}>Users</span>
            {activeItem === 'users' && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isLight ? '#153d77' : 'var(--color-primary-500)'
              }} />
            )}
          </button>

          {/* Configuration Section (formerly Master Data) */}
          <div style={{
            fontSize: '9.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: sectionHeaderColor,
            padding: '12px 8px 2px 8px'
          }}>
            Configuration
          </div>

          <button
            onClick={() => onSelectNav && onSelectNav('configuration')}
            style={getNavButtonStyle(activeItem === 'configuration' || activeItem === 'master-data')}
            onMouseEnter={(e) => {
              if (activeItem !== 'configuration' && activeItem !== 'master-data') {
                e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.14)' : 'var(--bg-surface-subtle)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeItem !== 'configuration' && activeItem !== 'master-data') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <SlidersHorizontal size={16} color={getIconColor(activeItem === 'configuration' || activeItem === 'master-data')} />
            <span style={{ flex: 1 }}>Master Data</span>
            {(activeItem === 'configuration' || activeItem === 'master-data') && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isLight ? '#153d77' : 'var(--color-primary-500)'
              }} />
            )}
          </button>

          <button
            onClick={() => onSelectNav && onSelectNav('resource-config')}
            style={getNavButtonStyle(activeItem === 'resource-config')}
            onMouseEnter={(e) => {
              if (activeItem !== 'resource-config') {
                e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.14)' : 'var(--bg-surface-subtle)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeItem !== 'resource-config') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Server size={16} color={getIconColor(activeItem === 'resource-config')} />
            <span style={{ flex: 1 }}>Resource Config</span>
            {activeItem === 'resource-config' && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isLight ? '#153d77' : 'var(--color-primary-500)'
              }} />
            )}
          </button>

          {/* Inventory Section (maps to wes.pallet) */}
          <div style={{
            fontSize: '9.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: sectionHeaderColor,
            padding: '12px 8px 2px 8px'
          }}>
            Inventory
          </div>

          <button
            onClick={() => onSelectNav && onSelectNav('inventory')}
            style={getNavButtonStyle(activeItem === 'inventory')}
            onMouseEnter={(e) => {
              if (activeItem !== 'inventory') {
                e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.14)' : 'var(--bg-surface-subtle)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeItem !== 'inventory') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Boxes size={16} color={getIconColor(activeItem === 'inventory')} />
            <span style={{ flex: 1 }}>Inventory</span>
            {activeItem === 'inventory' && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isLight ? '#153d77' : 'var(--color-primary-500)'
              }} />
            )}
          </button>

          {/* WMS Operations Section */}
          <div style={{
            fontSize: '9.5px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: sectionHeaderColor,
            padding: '12px 8px 2px 8px'
          }}>
            WMS Operations
          </div>

          <button
            onClick={() => onSelectNav && onSelectNav('wms-forms')}
            style={getNavButtonStyle(activeItem === 'wms-forms')}
            onMouseEnter={(e) => {
              if (activeItem !== 'wms-forms') {
                e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.14)' : 'var(--bg-surface-subtle)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeItem !== 'wms-forms') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Send size={16} color={getIconColor(activeItem === 'wms-forms')} />
            <span style={{ flex: 1 }}>WMS Forms</span>
            {activeItem === 'wms-forms' && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: isLight ? '#153d77' : 'var(--color-primary-500)'
              }} />
            )}
          </button>
        </nav>
      </div>

      {/* Bottom Controls: User Card, Theme Toggle & Logout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        paddingTop: '12px',
        borderTop: `1px solid ${dividerColor}`
      }}>
        {/* User Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 9px',
          borderRadius: '8px',
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-surface-subtle)',
          border: isLight ? '1px solid rgba(255, 255, 255, 0.2)' : 'none'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: isLight ? '#FFFFFF' : 'var(--color-primary-600)',
            color: isLight ? '#153d77' : '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '11px',
            boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.15)' : 'none'
          }}>
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{
              fontSize: '12px',
              fontWeight: 600,
              color: isLight ? '#FFFFFF' : 'var(--text-primary)',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}>
              {userName}
            </div>
            <div style={{
              fontSize: '10px',
              color: isLight ? '#DBEAFE' : 'var(--color-primary-500)',
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
          backgroundColor: isLight ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-surface-subtle)',
          border: isLight ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
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
            color: isLight ? '#FFFFFF' : 'var(--text-primary)'
          }}>
            {currentTheme === 'dark' ? <Moon size={15} /> : <Sun size={15} color="#FFFFFF" />}
            <span>{currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          </div>

          {/* Toggle pill */}
          <div style={{
            width: '32px',
            height: '18px',
            borderRadius: '10px',
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.3)' : (currentTheme === 'dark' ? 'var(--color-primary-600)' : 'var(--color-neutral-300)'),
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
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)'
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
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.15)' : (currentTheme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2'),
            color: isLight ? '#FFFFFF' : 'var(--color-danger-base)',
            fontWeight: 600,
            fontSize: '12px',
            transition: 'all var(--transition-fast)',
            border: isLight ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(239, 68, 68, 0.2)',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#EF4444';
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.borderColor = '#EF4444';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.15)' : (currentTheme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2');
            e.currentTarget.style.color = isLight ? '#FFFFFF' : 'var(--color-danger-base)';
            e.currentTarget.style.borderColor = isLight ? 'rgba(255, 255, 255, 0.25)' : 'rgba(239, 68, 68, 0.2)';
          }}
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
