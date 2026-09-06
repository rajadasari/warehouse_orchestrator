import React, { useState, useEffect } from 'react';
import { 
  Search, 
  UserPlus, 
  ShieldCheck, 
  Radio, 
  Lock, 
  AlertTriangle, 
  MoreVertical, 
  Building2, 
  KeyRound, 
  X,
  RefreshCw,
  Loader2,
  Printer,
  Copy,
  Check
} from 'lucide-react';
import { 
  fetchUsersApi, 
  fetchRolesApi, 
  createUserApi, 
  UserItem, 
  RoleItem 
} from '../../services/authService';

const generateOneTimePasskey = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let p1 = '';
  let p2 = '';
  for (let i = 0; i < 4; i++) {
    p1 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  for (let i = 0; i < 3; i++) {
    p2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `WHS-${p1}-${p2}`;
};

export const UserManagementView: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New user form state
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('ROLE_OPERATOR');
  const [newZone, setNewZone] = useState('INBOUND_STAGING');
  const [newBadge, setNewBadge] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // One-Time Handover Passkey state
  const [oneTimePasskey, setOneTimePasskey] = useState(generateOneTimePasskey());
  const [createdHandover, setCreatedHandover] = useState<{
    fullName: string;
    username: string;
    roleName: string;
    defaultZone: string;
    operatorBadgeId?: string;
    passkey: string;
    issuedAt: string;
  } | null>(null);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [usersData, rolesData] = await Promise.all([
        fetchUsersApi(),
        fetchRolesApi()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      if (rolesData.length > 0 && !newRole) {
        setNewRole(rolesData[0].roleCode);
      }
    } catch (err: any) {
      console.error('Failed to load users from DB:', err);
      setErrorMsg(err.message || 'Failed to connect to database');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.operatorBadgeId && user.operatorBadgeId.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newUsername) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const selectedRoleObj = roles.find(r => r.roleCode === newRole);
      const roleDisplayName = selectedRoleObj ? selectedRoleObj.roleName : newRole;

      await createUserApi({
        username: newUsername,
        fullName: newFullName,
        email: newEmail,
        role: newRole,
        facilityId: 'FAC-BLR-01',
        defaultZone: newZone,
        operatorBadgeId: newBadge || undefined,
        password: oneTimePasskey
      });

      // Prepare handover slip data
      setCreatedHandover({
        fullName: newFullName,
        username: newUsername,
        roleName: roleDisplayName,
        defaultZone: newZone,
        operatorBadgeId: newBadge || undefined,
        passkey: oneTimePasskey,
        issuedAt: new Date().toLocaleString()
      });

      setIsAddModalOpen(false);
      setIsHandoverModalOpen(true);

      // Reset form fields and generate fresh passkey for next user
      setNewFullName('');
      setNewUsername('');
      setNewEmail('');
      setNewBadge('');
      setOneTimePasskey(generateOneTimePasskey());
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to provision user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ROLE_ADMIN':
        return { bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)' };
      case 'ROLE_SUPERVISOR':
        return { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)' };
      case 'ROLE_MAINTENANCE':
        return { bg: 'rgba(139, 92, 246, 0.12)', text: '#8B5CF6', border: 'rgba(139, 92, 246, 0.3)' };
      default:
        return { bg: 'rgba(37, 99, 235, 0.12)', text: '#2563EB', border: 'rgba(37, 99, 235, 0.3)' };
    }
  };

  return (
    <div style={{
      padding: '16px 20px',
      maxWidth: '1440px',
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box'
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '4px'
          }}>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              margin: 0
            }}>
              User Management
            </h1>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: 'var(--color-primary-50)',
              color: 'var(--color-primary-600)',
              padding: '2px 6px',
              borderRadius: '9999px',
              border: '1px solid var(--color-primary-200)',
              textTransform: 'uppercase'
            }}>
              auth schema
            </span>
          </div>
          <p style={{
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            IEC 62443 Identification &amp; Use Control • Multi-facility RBAC • Operator RFID Badges
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadData}
            disabled={isLoading}
            title="Reload from PostgreSQL database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: isLoading ? 'wait' : 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
            <span>Refresh DB</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'var(--color-primary-600)',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-700)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-600)'}
          >
            <UserPlus size={15} />
            <span>Provision User</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger-text)',
          fontSize: '11.5px',
          fontWeight: 500,
          marginBottom: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>{errorMsg}</span>
          <button
            onClick={loadData}
            style={{
              textDecoration: 'underline',
              fontWeight: 600,
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              color: 'inherit'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards (Conforming to RFC-0084 analytical standards) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px',
        marginBottom: '16px'
      }}>
        {[
          { label: 'Total Accounts', value: users.length, icon: ShieldCheck, color: 'var(--color-primary-600)' },
          { label: 'Floor Operators', value: users.filter(u => u.role === 'ROLE_OPERATOR').length, icon: Radio, color: '#10B981' },
          { label: 'Shift Supervisors', value: users.filter(u => u.role === 'ROLE_SUPERVISOR').length, icon: KeyRound, color: '#F59E0B' },
          { label: 'Security Lockouts', value: users.filter(u => u.status === 'LOCKED').length, icon: Lock, color: '#EF4444' }
        ].map((card, i) => (
          <div key={i} style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '2px' }}>
                {card.label}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {card.value}
              </div>
            </div>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: card.color
            }}>
              <card.icon size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Controls Bar: Search & Dynamic Role Filters from DB */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '10px 10px 0 0',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        borderBottom: 'none'
      }}>
        {/* Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '5px 10px',
          width: '280px',
          maxWidth: '100%'
        }}>
          <Search size={14} color="var(--text-secondary)" />
          <input
            type="text"
            placeholder="Search name, username, RFID badge..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              width: '100%',
              fontSize: '12px'
            }}
          />
        </div>

        {/* Dynamic Role Filter Buttons from DB */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          {['ALL', ...roles.map(r => r.roleCode)].map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              style={{
                padding: '4px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: roleFilter === role ? 'var(--color-primary-600)' : 'var(--bg-surface-subtle)',
                color: roleFilter === role ? '#FFFFFF' : 'var(--text-secondary)',
                transition: 'all var(--transition-fast)'
              }}
            >
              {role === 'ALL' ? 'All Roles' : (roles.find(r => r.roleCode === role)?.roleName || role.replace('ROLE_', ''))}
            </button>
          ))}
        </div>
      </div>

      {/* User Data Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0 0 10px 10px',
        overflowX: 'auto',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          textAlign: 'left'
        }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <th style={{ padding: '8px 12px' }}>User &amp; Identity</th>
              <th style={{ padding: '8px 12px' }}>Role</th>
              <th style={{ padding: '8px 12px' }}>Facility / Zone</th>
              <th style={{ padding: '8px 12px' }}>RFID Badge</th>
              <th style={{ padding: '8px 12px' }}>Auth Mode</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Last Active</th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <Loader2 size={16} className="spin" />
                    <span>Loading users directly from PostgreSQL database...</span>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  No users match the search filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => {
                const roleBadge = getRoleBadgeStyle(user.role);
                return (
                  <tr key={user.id} style={{
                    borderBottom: '1px solid var(--border-default)',
                    transition: 'background-color var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* User Identity */}
                    <td style={{ padding: '7px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                        <div style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--color-primary-100)',
                          color: 'var(--color-primary-700)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '11px',
                          flexShrink: 0
                        }}>
                          {user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px' }}>{user.fullName}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>@{user.username}</div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        backgroundColor: roleBadge.bg,
                        color: roleBadge.text,
                        border: `1px solid ${roleBadge.border}`
                      }}>
                        {user.roleName}
                      </span>
                    </td>

                    {/* Facility & Zone */}
                    <td style={{ padding: '7px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-primary)', fontWeight: 500, fontSize: '11.5px' }}>
                        <Building2 size={12} color="var(--text-secondary)" />
                        <span>{user.facilityId}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', paddingLeft: '16px' }}>
                        {user.defaultZone}
                      </div>
                    </td>

                    {/* RFID Badge */}
                    <td style={{ padding: '7px 12px' }}>
                      {user.operatorBadgeId ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          backgroundColor: 'var(--bg-surface-subtle)',
                          padding: '2px 6px',
                          borderRadius: '5px',
                          border: '1px solid var(--border-default)'
                        }}>
                          <Radio size={11} color="var(--color-primary-500)" />
                          <span>{user.operatorBadgeId}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-disabled)' }}>Unpaired</span>
                      )}
                    </td>

                    {/* Auth Mode */}
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '5px',
                        backgroundColor: user.ssoProvider === 'AZURE_AD' ? 'rgba(96, 165, 250, 0.15)' : 'var(--bg-surface-subtle)',
                        color: user.ssoProvider === 'AZURE_AD' ? '#3B82F6' : 'var(--text-secondary)'
                      }}>
                        {user.ssoProvider === 'AZURE_AD' ? 'Corporate SSO' : 'Local DB / RFID'}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '7px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: user.status === 'ACTIVE' ? '#10B981' : '#EF4444'
                        }} />
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '11.5px' }}>{user.status}</span>
                      </div>
                      {user.forcePasswordChange && (
                        <div style={{ fontSize: '9.5px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                          <AlertTriangle size={9} />
                          <span>Reset on login</span>
                        </div>
                      )}
                    </td>

                    {/* Last Active */}
                    <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {user.lastLoginAt}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '7px 12px', textAlign: 'right' }}>
                      <button style={{
                        padding: '4px',
                        borderRadius: '5px',
                        color: 'var(--text-secondary)',
                        transition: 'color var(--transition-fast)'
                      }}>
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(6, 13, 26, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '14px',
            border: '1px solid var(--border-default)',
            width: '400px',
            maxWidth: '100%',
            boxShadow: 'var(--shadow-cloud)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-primary-100)',
                  color: 'var(--color-primary-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UserPlus size={14} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Provision Warehouse User
                </div>
              </div>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ color: 'var(--text-secondary)', padding: '2px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddUser} style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '7px',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rpatel"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '7px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Role *
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '7px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  >
                    {roles.map(r => (
                      <option key={r.roleCode} value={r.roleCode}>
                        {r.roleName} ({r.roleCode.replace('ROLE_', '')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && (
                <div style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger-text)',
                  fontSize: '11.5px',
                  fontWeight: 500
                }}>
                  {formError}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Operational Zone
                  </label>
                  <select
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '7px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  >
                    <option value="INBOUND_STAGING">Inbound Staging</option>
                    <option value="HIGH_BAY_ASRS">High-Bay ASRS</option>
                    <option value="CONVEYOR_MEZZANINE">Conveyor Mezzanine</option>
                    <option value="OUTBOUND_DOCK">Outbound Dock</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    RFID Badge Serial
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. BADGE-OP-442"
                    value={newBadge}
                    onChange={(e) => setNewBadge(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '7px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                marginBottom: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <KeyRound size={13} color="var(--color-primary-500)" />
                    One-Time Handover Passkey
                  </span>
                  <button
                    type="button"
                    onClick={() => setOneTimePasskey(generateOneTimePasskey())}
                    style={{
                      fontSize: '10.5px',
                      color: 'var(--color-primary-600)',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <RefreshCw size={11} />
                    Regenerate
                  </button>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-page)',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px dashed var(--border-strong)'
                }}>
                  <span style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '13.5px',
                    letterSpacing: '1px',
                    color: 'var(--color-primary-600)'
                  }}>
                    {oneTimePasskey}
                  </span>
                  <span style={{
                    fontSize: '9.5px',
                    fontWeight: 600,
                    color: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}>
                    Single-Use Code
                  </span>
                </div>
                <p style={{ fontSize: '10px', color: 'var(--text-secondary)', margin: '6px 0 0 0' }}>
                  Supervisor handover voucher will be generated for physical handover to the operator.
                </p>
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-surface-subtle)'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    backgroundColor: 'var(--color-primary-600)',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  {isSubmitting ? 'Provisioning...' : 'Create & Issue Handover Slip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Operator Handover Slip Modal (Practice 1: Supervisor-Assisted Handover) */}
      {isHandoverModalOpen && createdHandover && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(6, 13, 26, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '14px',
            border: '1px solid var(--border-default)',
            width: '100%',
            maxWidth: '460px',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div className="no-print" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  padding: '5px',
                  borderRadius: '7px',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  display: 'flex'
                }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Operator Handover Slip
                  </h3>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    Physical credential handover • IEC 62443-4-2 compliant
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsHandoverModalOpen(false);
                  setCreatedHandover(null);
                }}
                style={{ color: 'var(--text-secondary)', padding: '4px' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Printable Voucher Section */}
            <div className="print-handover-voucher" style={{
              padding: '18px',
              backgroundColor: 'var(--bg-surface)'
            }}>
              {/* Slip Card */}
              <div style={{
                border: '1.5px dashed var(--border-strong)',
                borderRadius: '10px',
                padding: '14px 16px',
                backgroundColor: 'var(--bg-page)'
              }}>
                {/* Voucher Header */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border-default)',
                  paddingBottom: '8px',
                  marginBottom: '10px'
                }}>
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.8px', color: 'var(--text-primary)' }}>
                      FAC-BLR-01 • WAREHOUSE ORCHESTRATOR
                    </span>
                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                      TERMINAL ACCESS HANDOVER VOUCHER
                    </div>
                  </div>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    color: '#2563EB'
                  }}>
                    AIR-GAPPED OT
                  </span>
                </div>

                {/* Operator Details Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '8px 12px',
                  fontSize: '11px',
                  marginBottom: '12px'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '9.5px', display: 'block' }}>OPERATOR NAME</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{createdHandover.fullName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '9.5px', display: 'block' }}>ASSIGNED USERNAME</span>
                    <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{createdHandover.username}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '9.5px', display: 'block' }}>OPERATIONAL ROLE</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{createdHandover.roleName}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '9.5px', display: 'block' }}>ASSIGNED WORK ZONE</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{createdHandover.defaultZone}</strong>
                  </div>
                  {createdHandover.operatorBadgeId && (
                    <div>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '9.5px', display: 'block' }}>RFID BADGE SERIAL</span>
                      <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{createdHandover.operatorBadgeId}</strong>
                    </div>
                  )}
                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '9.5px', display: 'block' }}>ISSUED TIMESTAMP</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>{createdHandover.issuedAt}</span>
                  </div>
                </div>

                {/* Passkey Highlight Box */}
                <div style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1.5px solid var(--color-primary-500)',
                  borderRadius: '8px',
                  padding: '10px',
                  textAlign: 'center',
                  marginBottom: '10px'
                }}>
                  <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--color-primary-600)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '2px' }}>
                    ONE-TIME TEMPORARY PASSKEY
                  </div>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    letterSpacing: '2px',
                    color: 'var(--text-primary)'
                  }}>
                    {createdHandover.passkey}
                  </div>
                </div>

                {/* Compliance & Reset Instruction */}
                <div style={{
                  fontSize: '9.5px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.3',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  padding: '7px 9px',
                  borderRadius: '6px',
                  borderLeft: '3px solid #F59E0B'
                }}>
                  <strong>⚠️ MANDATORY FIRST-LOGIN RESET:</strong> Hand this slip physically to the operator. Upon typing this passkey at any warehouse terminal, the system will immediately require setting a confidential permanent password.
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="no-print" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderTop: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <button
                type="button"
                onClick={() => {
                  const credText = `FACILITY: FAC-BLR-01\nNAME: ${createdHandover.fullName}\nUSERNAME: ${createdHandover.username}\nROLE: ${createdHandover.roleName}\nZONE: ${createdHandover.defaultZone}\nONE-TIME PASSKEY: ${createdHandover.passkey}\nNOTE: Mandatory password reset upon first login.`;
                  navigator.clipboard.writeText(credText);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-strong)'
                }}
              >
                {copiedKey ? <Check size={13} color="#10B981" /> : <Copy size={13} />}
                <span>{copiedKey ? 'Copied Details' : 'Copy Credentials'}</span>
              </button>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    backgroundColor: 'var(--color-primary-600)'
                  }}
                >
                  <Printer size={13} />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsHandoverModalOpen(false);
                    setCreatedHandover(null);
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--bg-surface)'
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
