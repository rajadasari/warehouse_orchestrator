import React, { useState } from 'react';
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
  Send,
  Network,
  GitMerge,
  Database,
  ChevronLeft,
  ChevronRight,
  FileCode,
  Sliders
} from 'lucide-react';

interface SideNavBarProps {
  currentTheme: 'light' | 'dark';
  onToggleTheme: () => void;
  onLogout: () => void;
  activeItem?: string;
  onSelectNav?: (item: string) => void;
  userName?: string;
  userRole?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface NavChildConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive: (active: string) => boolean;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive: (active: string) => boolean;
  children?: NavChildConfig[];
}

interface NavSection {
  title: string;
  items: NavItemConfig[];
}

export const SideNavBar: React.FC<SideNavBarProps> = ({
  currentTheme,
  onToggleTheme,
  onLogout,
  activeItem = 'users',
  onSelectNav,
  userName = 'System Administrator',
  userRole = 'ROLE_ADMIN',
  collapsed: controlledCollapsed,
  onToggleCollapse
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const isCollapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalCollapsed(prev => {
        const next = !prev;
        localStorage.setItem('sidebar_collapsed', String(next));
        return next;
      });
    }
  };

  const isLight = currentTheme === 'light';

  // Navigation structure definition
  const sections: NavSection[] = [
    {
      title: 'Management',
      items: [
        {
          id: 'users',
          label: 'Users',
          icon: <Users size={17} />,
          isActive: (a) => a === 'users'
        }
      ]
    },
    {
      title: 'Configuration',
      items: [
        {
          id: 'configuration',
          label: 'Master Data',
          icon: <SlidersHorizontal size={17} />,
          isActive: (a) => a === 'configuration' || a === 'master-data'
        },
        {
          id: 'resource-manager',
          label: 'Resource Manager',
          icon: <Server size={17} />,
          isActive: (a) => a === 'resource-manager' || a === 'resource-config' || a === 'template-definer' || a === 'resource-composer',
          children: [
            {
              id: 'template-definer',
              label: 'Template Definer',
              icon: <FileCode size={15} />,
              isActive: (a) => a === 'template-definer'
            },
            {
              id: 'resource-composer',
              label: 'Resource Composer',
              icon: <Sliders size={15} />,
              isActive: (a) => a === 'resource-composer' || a === 'resource-manager' || a === 'resource-config'
            }
          ]
        },
        {
          id: 'api-mappings',
          label: 'API Mapper',
          icon: <Network size={17} />,
          isActive: (a) => a === 'api-mappings'
        },
        {
          id: 'workflows',
          label: 'Workflows',
          icon: <GitMerge size={17} />,
          isActive: (a) => a === 'workflows'
        },
        {
          id: 'database-config',
          label: 'Database Settings',
          icon: <Database size={17} />,
          isActive: (a) => a === 'database-config'
        }
      ]
    },
    {
      title: 'Inventory',
      items: [
        {
          id: 'inventory',
          label: 'Inventory',
          icon: <Boxes size={17} />,
          isActive: (a) => a === 'inventory' || a === 'custom-fields'
        }
      ]
    },
    {
      title: 'WMS Operations',
      items: [
        {
          id: 'wms-forms',
          label: 'WMS Forms',
          icon: <Send size={17} />,
          isActive: (a) => a === 'wms-forms'
        }
      ]
    }
  ];

  // Helper for navigation button styling
  const getNavButtonStyle = (active: boolean) => {
    if (isLight) {
      return {
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: isCollapsed ? '0px' : '10px',
        width: '100%',
        padding: isCollapsed ? '12px 0' : '8px 12px',
        borderRadius: '9px',
        backgroundColor: active ? '#FFFFFF' : 'transparent',
        color: active ? '#153d77' : 'rgba(255, 255, 255, 0.9)',
        fontWeight: active ? 700 : 500,
        fontSize: '12.5px',
        transition: 'all var(--transition-fast)',
        border: active ? '1px solid #FFFFFF' : '1px solid transparent',
        boxShadow: active ? '0 2px 8px rgba(0, 0, 0, 0.18)' : 'none',
        textAlign: 'left' as const,
        cursor: 'pointer',
        minHeight: '48px',
        boxSizing: 'border-box' as const
      };
    }
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: isCollapsed ? 'center' : 'flex-start',
      gap: isCollapsed ? '0px' : '10px',
      width: '100%',
      padding: isCollapsed ? '12px 0' : '8px 12px',
      borderRadius: '9px',
      backgroundColor: active ? 'var(--bg-sidebar-active)' : 'transparent',
      color: active ? 'var(--text-sidebar-active)' : 'var(--text-secondary)',
      fontWeight: active ? 600 : 500,
      fontSize: '12.5px',
      transition: 'all var(--transition-fast)',
      border: active ? '1px solid rgba(37, 99, 235, 0.25)' : '1px solid transparent',
      boxShadow: active ? '0 0 12px rgba(37, 99, 235, 0.15)' : 'none',
      textAlign: 'left' as const,
      cursor: 'pointer',
      minHeight: '48px',
      boxSizing: 'border-box' as const
    };
  };

  const getIconColor = (active: boolean) => {
    if (isLight) {
      return active ? '#153d77' : 'rgba(255, 255, 255, 0.9)';
    }
    return active ? 'var(--color-primary-500)' : 'currentColor';
  };

  const sectionHeaderColor = isLight ? 'rgba(255, 255, 255, 0.7)' : 'var(--text-disabled)';
  const dividerColor = isLight ? 'rgba(255, 255, 255, 0.16)' : 'var(--border-default)';

  return (
    <aside style={{
      width: isCollapsed ? '68px' : '210px',
      minWidth: isCollapsed ? '68px' : '210px',
      height: '100vh',
      backgroundColor: isLight ? '#153d77' : 'var(--bg-sidebar)',
      borderRight: isLight ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: isCollapsed ? '14px 8px' : '16px 12px',
      boxSizing: 'border-box',
      position: 'relative',
      transition: 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.22s cubic-bezier(0.4, 0, 0.2, 1), background-color var(--transition-normal), border-color var(--transition-normal)',
      userSelect: 'none',
      zIndex: 100
    }}>
      {/* Top Header: Brand + Collapse/Expand Button */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between',
          gap: '8px',
          padding: isCollapsed ? '0 0 12px 0' : '0 4px 14px 4px',
          borderBottom: `1px solid ${dividerColor}`,
          marginBottom: '12px'
        }}>
          {/* Logo & Brand Name */}
          <div 
            onClick={isCollapsed ? toggleCollapse : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: isCollapsed ? 'pointer' : 'default'
            }}
            title={isCollapsed ? 'Click to expand sidebar' : undefined}
          >
            <div style={{
              width: '34px',
              height: '34px',
              minWidth: '34px',
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

            {!isCollapsed && (
              <div style={{ overflow: 'hidden' }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: '13.5px',
                  color: isLight ? '#FFFFFF' : 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap'
                }}>
                  Orchestrator
                </div>
                <div style={{
                  fontSize: '9.5px',
                  color: isLight ? 'rgba(255, 255, 255, 0.78)' : 'var(--text-secondary)',
                  fontWeight: 500,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap'
                }}>
                  Warehouse Twin
                </div>
              </div>
            )}
          </div>

          {/* Collapse / Expand Toggle Button */}
          {!isCollapsed && (
            <button
              onClick={toggleCollapse}
              title="Collapse sidebar"
              style={{
                width: '32px',
                height: '32px',
                minWidth: '32px',
                minHeight: '32px',
                borderRadius: '8px',
                backgroundColor: isLight ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-surface-subtle)',
                border: isLight ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-default)',
                color: isLight ? '#FFFFFF' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.25)' : 'var(--color-primary-600)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-surface-subtle)';
                e.currentTarget.style.color = isLight ? '#FFFFFF' : 'var(--text-secondary)';
              }}
            >
              <ChevronLeft size={16} />
            </button>
          )}
        </div>

        {/* Collapsed Expand Quick Action Button */}
        {isCollapsed && (
          <button
            onClick={toggleCollapse}
            title="Expand sidebar"
            style={{
              width: '100%',
              height: '34px',
              minHeight: '34px',
              marginBottom: '10px',
              borderRadius: '8px',
              backgroundColor: isLight ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-surface-subtle)',
              border: isLight ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-default)',
              color: isLight ? '#FFFFFF' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.25)' : 'var(--color-primary-600)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-surface-subtle)';
              e.currentTarget.style.color = isLight ? '#FFFFFF' : 'var(--text-secondary)';
            }}
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* Navigation Sections */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {sections.map(section => (
            <React.Fragment key={section.title}>
              {/* Section Header or Divider */}
              {!isCollapsed ? (
                <div style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: sectionHeaderColor,
                  padding: '10px 8px 3px 8px'
                }}>
                  {section.title}
                </div>
              ) : (
                <div style={{
                  height: '1px',
                  backgroundColor: dividerColor,
                  margin: '6px 4px'
                }} />
              )}

              {/* Section Items */}
              {section.items.map(item => {
                const active = item.isActive(activeItem);
                const hasChildren = Boolean(item.children && item.children.length > 0);
                return (
                  <React.Fragment key={item.id}>
                    <button
                      title={isCollapsed ? item.label : undefined}
                      onClick={() => onSelectNav && onSelectNav(item.id)}
                      style={getNavButtonStyle(active)}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.14)' : 'var(--bg-surface-subtle)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      <span style={{ color: getIconColor(active), display: 'flex', alignItems: 'center' }}>
                        {item.icon}
                      </span>

                      {!isCollapsed && (
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.label}
                        </span>
                      )}

                      {!isCollapsed && active && (
                        <span style={{
                          width: '6px',
                          height: '6px',
                          minWidth: '6px',
                          borderRadius: '50%',
                          backgroundColor: isLight ? '#153d77' : 'var(--color-primary-500)'
                        }} />
                      )}
                    </button>

                    {/* Render Child Sub-Items (e.g. Template Definer, Resource Composer) */}
                    {!isCollapsed && hasChildren && item.children && (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        paddingLeft: '14px',
                        marginLeft: '12px',
                        borderLeft: isLight ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-default)',
                        marginTop: '2px',
                        marginBottom: '4px'
                      }}>
                        {item.children.map(child => {
                          const childActive = child.isActive(activeItem);
                          return (
                            <button
                              key={child.id}
                              onClick={() => onSelectNav && onSelectNav(child.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                width: '100%',
                                padding: '6px 10px',
                                borderRadius: '7px',
                                backgroundColor: childActive 
                                  ? (isLight ? '#FFFFFF' : 'var(--bg-sidebar-active)') 
                                  : 'transparent',
                                color: childActive 
                                  ? (isLight ? '#153d77' : 'var(--text-sidebar-active)') 
                                  : (isLight ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-secondary)'),
                                fontWeight: childActive ? 600 : 500,
                                fontSize: '11.5px',
                                border: childActive ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent',
                                textAlign: 'left',
                                cursor: 'pointer',
                                minHeight: '36px',
                                transition: 'all var(--transition-fast)'
                              }}
                              onMouseEnter={(e) => {
                                if (!childActive) {
                                  e.currentTarget.style.backgroundColor = isLight ? 'rgba(255, 255, 255, 0.12)' : 'var(--bg-surface-subtle)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!childActive) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                }
                              }}
                            >
                              <span style={{ color: childActive ? (isLight ? '#153d77' : 'var(--color-primary-500)') : 'currentColor' }}>
                                {child.icon}
                              </span>
                              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {child.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Bottom Controls: User Card, Theme Toggle & Logout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingTop: '12px',
        borderTop: `1px solid ${dividerColor}`
      }}>
        {/* User Card */}
        <div
          title={isCollapsed ? `${userName} (${userRole})` : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: isCollapsed ? '0px' : '8px',
            padding: isCollapsed ? '8px 0' : '7px 9px',
            borderRadius: '8px',
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-surface-subtle)',
            border: isLight ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
            minHeight: '44px',
            boxSizing: 'border-box'
          }}
        >
          <div style={{
            width: '28px',
            height: '28px',
            minWidth: '28px',
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

          {!isCollapsed && (
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
                gap: '3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                <ShieldCheck size={11} />
                {userRole}
              </div>
            </div>
          )}
        </div>

        {/* Light/Dark Mode Switch */}
        <div
          title={isCollapsed ? (currentTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode') : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: isCollapsed ? '10px 0' : '7px 10px',
            borderRadius: '9px',
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.15)' : 'var(--bg-surface-subtle)',
            border: isLight ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
            cursor: 'pointer',
            minHeight: '44px',
            boxSizing: 'border-box'
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
            {!isCollapsed && <span>{currentTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>}
          </div>

          {!isCollapsed && (
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
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          title={isCollapsed ? 'Logout' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isCollapsed ? '0px' : '8px',
            width: '100%',
            padding: isCollapsed ? '12px 0' : '8px',
            borderRadius: '9px',
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.15)' : (currentTheme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2'),
            color: isLight ? '#FFFFFF' : 'var(--color-danger-base)',
            fontWeight: 600,
            fontSize: '12px',
            transition: 'all var(--transition-fast)',
            border: isLight ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid rgba(239, 68, 68, 0.2)',
            cursor: 'pointer',
            minHeight: '48px',
            boxSizing: 'border-box'
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
          {!isCollapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};
