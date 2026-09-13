import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  UserPlus, 
  ShieldCheck, 
  Radio, 
  Lock, 
  MoreVertical, 
  Building2, 
  KeyRound, 
  X,
  RefreshCw,
  Loader2,
  Printer,
  Copy,
  Check,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
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

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'fullName', direction: 'asc' });

  // Column Filters State (Strict text search, no dropdowns)
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Sorting helper
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown size={11} color="var(--text-disabled)" style={{ opacity: 0.6 }} />;
    }
    return sortConfig.direction === 'asc' ? (
      <ChevronUp size={11} color="var(--color-primary-500)" />
    ) : (
      <ChevronDown size={11} color="var(--color-primary-500)" />
    );
  };

  // Column filter change
  const handleColFilterChange = (colKey: string, value: string) => {
    setColFilters(prev => ({ ...prev, [colKey]: value }));
    setCurrentPage(1);
  };

  const activeColFilterCount = useMemo(() => {
    return Object.values(colFilters).filter(v => v && v.trim() !== '').length;
  }, [colFilters]);

  const handleClearAllFilters = () => {
    setColFilters({});
    setSearchQuery('');
    setRoleFilter('ALL');
    setCurrentPage(1);
  };

  // Column filter header cell component (strictly search input, no dropdowns)
  const ColumnFilterCell = ({
    colKey,
    placeholder = 'Search...'
  }: {
    colKey: string;
    placeholder?: string;
  }) => {
    const val = colFilters[colKey] || '';
    return (
      <th style={{
        padding: '3px 6px',
        backgroundColor: 'var(--bg-surface-subtle)',
        borderBottom: '1px solid var(--border-default)',
        fontWeight: 'normal'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder={placeholder}
            value={val}
            onChange={e => handleColFilterChange(colKey, e.target.value)}
            style={{
              width: '100%',
              height: '21px',
              fontSize: '10px',
              padding: '1px 16px 1px 5px',
              backgroundColor: val ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-surface)',
              border: val ? '1px solid var(--color-primary-500)' : '1px solid var(--border-default)',
              borderRadius: '3px',
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          {val ? (
            <button
              onClick={() => handleColFilterChange(colKey, '')}
              title="Clear column search"
              style={{
                position: 'absolute',
                right: '3px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={10} />
            </button>
          ) : null}
        </div>
      </th>
    );
  };

  // Filtered & Sorted Pipeline
  const processedUsers = useMemo(() => {
    const filtered = users.filter(user => {
      // Global search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal = 
          user.fullName.toLowerCase().includes(q) ||
          user.username.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.role.toLowerCase().includes(q) ||
          user.roleName.toLowerCase().includes(q) ||
          user.defaultZone.toLowerCase().includes(q) ||
          (user.operatorBadgeId && user.operatorBadgeId.toLowerCase().includes(q)) ||
          user.ssoProvider.toLowerCase().includes(q) ||
          user.status.toLowerCase().includes(q);
        if (!matchesGlobal) return false;
      }

      // Role filter button
      if (roleFilter !== 'ALL' && user.role !== roleFilter) {
        return false;
      }

      // Column filters
      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'user' && !user.fullName.toLowerCase().includes(val) && !user.username.toLowerCase().includes(val) && !user.email.toLowerCase().includes(val)) return false;
        if (key === 'role' && !user.roleName.toLowerCase().includes(val) && !user.role.toLowerCase().includes(val)) return false;
        if (key === 'facility' && !user.defaultZone.toLowerCase().includes(val) && !user.facilityId.toLowerCase().includes(val)) return false;
        if (key === 'badge' && !(user.operatorBadgeId || '').toLowerCase().includes(val)) return false;
        if (key === 'authMode' && !user.ssoProvider.toLowerCase().includes(val)) return false;
        if (key === 'status' && !user.status.toLowerCase().includes(val)) return false;
        if (key === 'lastActive' && !(user.lastLoginAt || '').toLowerCase().includes(val)) return false;
      }
      return true;
    });

    if (sortConfig) {
      return [...filtered].sort((a, b) => {
        let valA: any = '';
        let valB: any = '';
        switch (sortConfig.key) {
          case 'user':
          case 'fullName':
            valA = a.fullName || '';
            valB = b.fullName || '';
            break;
          case 'role':
            valA = a.roleName || a.role || '';
            valB = b.roleName || b.role || '';
            break;
          case 'facility':
          case 'defaultZone':
            valA = a.defaultZone || '';
            valB = b.defaultZone || '';
            break;
          case 'badge':
          case 'operatorBadgeId':
            valA = a.operatorBadgeId || '';
            valB = b.operatorBadgeId || '';
            break;
          case 'authMode':
          case 'ssoProvider':
            valA = a.ssoProvider || '';
            valB = b.ssoProvider || '';
            break;
          case 'status':
            valA = a.status || '';
            valB = b.status || '';
            break;
          case 'lastActive':
          case 'lastLoginAt':
            valA = a.lastLoginAt || '';
            valB = b.lastLoginAt || '';
            break;
          default:
            valA = (a as any)[sortConfig.key] || '';
            valB = (b as any)[sortConfig.key] || '';
        }
        if (typeof valA === 'string') {
          return sortConfig.direction === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }
        return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });
    }

    return filtered;
  }, [users, searchQuery, roleFilter, colFilters, sortConfig]);

  // Pagination calculations
  const totalRecords = processedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedUsers = processedUsers.slice(startIndex, endIndex);
  const recordsLeftToView = Math.max(0, totalRecords - endIndex);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newUsername) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const selectedRoleObj = roles.find(r => r.roleCode === newRole);
      const roleDisplayName = selectedRoleObj ? selectedRoleObj.roleName : newRole;

      await createUserApi({
        username: newUsername.trim(),
        fullName: newFullName.trim(),
        email: newEmail.trim() || undefined,
        role: newRole,
        facilityId: 'FAC-BLR-01',
        defaultZone: newZone,
        operatorBadgeId: newBadge.trim() || undefined,
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
      padding: '10px 16px 4px 16px',
      maxWidth: '1440px',
      margin: '0 auto',
      width: '100%',
      height: '100%',
      maxHeight: '100%',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '8px',
        flexWrap: 'wrap',
        gap: '12px',
        flexShrink: 0
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
        gap: '8px',
        marginBottom: '8px',
        flexShrink: 0
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
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        borderBottom: 'none',
        flexShrink: 0
      }}>
        {/* Left Side: Search & Role Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Search Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '4px 8px',
            width: '240px',
            maxWidth: '100%'
          }}>
            <Search size={13} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search users, roles, badges..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                background: 'none',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                width: '100%',
                fontSize: '11.5px'
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <X size={12} color="var(--text-secondary)" />
              </button>
            )}
          </div>

          {/* Dynamic Role Filter Buttons from DB */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {['ALL', ...roles.map(r => r.roleCode)].map((role) => (
              <button
                key={role}
                onClick={() => {
                  setRoleFilter(role);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  backgroundColor: roleFilter === role ? 'var(--color-primary-600)' : 'var(--bg-surface-subtle)',
                  color: roleFilter === role ? '#FFFFFF' : 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {role === 'ALL' ? 'All Roles' : (roles.find(r => r.roleCode === role)?.roleName || role.replace('ROLE_', ''))}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Column Filters Toggle, Clear Filters, Rows Per Page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Column Filter Toggle Button */}
          <button
            onClick={() => setShowColFilters(!showColFilters)}
            title="Toggle column-level search filters"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid',
              borderColor: showColFilters ? 'var(--color-primary-500)' : 'var(--border-default)',
              backgroundColor: showColFilters ? 'rgba(37, 99, 235, 0.1)' : 'var(--bg-surface)',
              color: showColFilters ? 'var(--color-primary-500)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <SlidersHorizontal size={12} />
            <span>Col Filters</span>
            {activeColFilterCount > 0 && (
              <span style={{
                backgroundColor: 'var(--color-primary-600)',
                color: '#FFFFFF',
                borderRadius: '9999px',
                padding: '0 4px',
                fontSize: '9px',
                fontWeight: 700
              }}>
                {activeColFilterCount}
              </span>
            )}
          </button>

          {/* Reset All Filters Button */}
          {(activeColFilterCount > 0 || searchQuery || roleFilter !== 'ALL') && (
            <button
              onClick={handleClearAllFilters}
              title="Clear all active global, role and column filters"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                color: '#EF4444',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <X size={12} />
              <span>Clear Filters ({activeColFilterCount + (searchQuery ? 1 : 0) + (roleFilter !== 'ALL' ? 1 : 0)})</span>
            </button>
          )}

          {/* Page Size Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                borderRadius: '5px',
                padding: '2px 5px',
                color: 'var(--text-primary)',
                fontSize: '11px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Data Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0 0 10px 10px',
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '12px',
          textAlign: 'left'
        }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-subtle)' }}>
            <tr style={{
              borderBottom: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              color: 'var(--text-secondary)',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <th onClick={() => handleSort('fullName')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  User &amp; Identity {getSortIcon('fullName')}
                </div>
              </th>
              <th onClick={() => handleSort('role')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Role {getSortIcon('role')}
                </div>
              </th>
              <th onClick={() => handleSort('defaultZone')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Facility / Zone {getSortIcon('defaultZone')}
                </div>
              </th>
              <th onClick={() => handleSort('operatorBadgeId')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  RFID Badge {getSortIcon('operatorBadgeId')}
                </div>
              </th>
              <th onClick={() => handleSort('ssoProvider')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Auth Mode {getSortIcon('ssoProvider')}
                </div>
              </th>
              <th onClick={() => handleSort('status')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Status {getSortIcon('status')}
                </div>
              </th>
              <th onClick={() => handleSort('lastLoginAt')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Last Active {getSortIcon('lastLoginAt')}
                </div>
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
            </tr>
            {showColFilters && (
              <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                <ColumnFilterCell colKey="user" placeholder="Search user..." />
                <ColumnFilterCell colKey="role" placeholder="Search role..." />
                <ColumnFilterCell colKey="facility" placeholder="Search zone..." />
                <ColumnFilterCell colKey="badge" placeholder="Search badge..." />
                <ColumnFilterCell colKey="authMode" placeholder="Search auth..." />
                <ColumnFilterCell colKey="status" placeholder="Search status..." />
                <ColumnFilterCell colKey="lastActive" placeholder="Search login..." />
                <th style={{ padding: '3px 6px', backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }} />
              </tr>
            )}
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
            ) : pagedUsers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                  No users match the search filter.
                </td>
              </tr>
            ) : (
              pagedUsers.map((user) => {
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Building2 size={13} color="var(--text-secondary)" />
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '11.5px' }}>{user.facilityId}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', padding: '1px 4px', borderRadius: '3px', backgroundColor: 'var(--bg-surface-subtle)' }}>
                          {user.defaultZone}
                        </span>
                      </div>
                    </td>

                    {/* RFID Badge */}
                    <td style={{ padding: '7px 12px' }}>
                      {user.operatorBadgeId ? (
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'var(--color-primary-600)',
                          backgroundColor: 'var(--color-primary-50)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--color-primary-200)'
                        }}>
                          {user.operatorBadgeId}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-disabled)' }}>None</span>
                      )}
                    </td>

                    {/* Auth Mode */}
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        backgroundColor: user.ssoProvider === 'LOCAL' ? 'rgba(100, 116, 139, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                        color: user.ssoProvider === 'LOCAL' ? '#64748B' : '#2563EB'
                      }}>
                        {user.ssoProvider}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '7px 12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: user.status === 'ACTIVE' ? '#10B981' : '#EF4444'
                      }}>
                        <span style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: user.status === 'ACTIVE' ? '#10B981' : '#EF4444'
                        }} />
                        {user.status}
                      </span>
                    </td>

                    {/* Last Active */}
                    <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
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

      {/* ENTERPRISE PAGINATION CONTROLS BAR (Docked) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 4px 2px 4px',
        fontSize: '11.5px',
        color: 'var(--text-secondary)',
        flexWrap: 'wrap',
        gap: '10px',
        flexShrink: 0,
        borderTop: '1px solid var(--border-default)',
        marginTop: '4px'
      }}>
        {/* Record count info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>
            Showing <strong style={{ color: 'var(--text-primary)' }}>{totalRecords === 0 ? 0 : startIndex + 1}</strong> to <strong style={{ color: 'var(--text-primary)' }}>{endIndex}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalRecords}</strong> users
          </span>
          <span style={{ color: 'var(--text-disabled)' }}>•</span>
          <span>
            Page <strong style={{ color: 'var(--text-primary)' }}>{safeCurrentPage}</strong> of <strong style={{ color: 'var(--text-primary)' }}>{totalPages}</strong>
          </span>
          {recordsLeftToView > 0 && (
            <span style={{
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: 'var(--color-primary-500)',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '10.5px'
            }}>
              {recordsLeftToView} remaining to view
            </span>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage === 1}
            title="First Page"
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: safeCurrentPage === 1 ? 'var(--text-disabled)' : 'var(--text-primary)',
              cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronsLeft size={13} />
          </button>

          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={safeCurrentPage === 1}
            title="Previous Page"
            style={{
              padding: '4px 8px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: safeCurrentPage === 1 ? 'var(--text-disabled)' : 'var(--text-primary)',
              cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <ChevronLeft size={13} />
            <span>Prev</span>
          </button>

          {/* Page Number Pills */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
            .map((p, idx, arr) => (
              <React.Fragment key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span style={{ padding: '0 2px', color: 'var(--text-disabled)' }}>...</span>
                )}
                <button
                  onClick={() => setCurrentPage(p)}
                  style={{
                    minWidth: '26px',
                    height: '24px',
                    padding: '0 6px',
                    borderRadius: '5px',
                    border: '1px solid',
                    borderColor: safeCurrentPage === p ? 'var(--color-primary-600)' : 'var(--border-default)',
                    backgroundColor: safeCurrentPage === p ? 'var(--color-primary-600)' : 'var(--bg-surface)',
                    color: safeCurrentPage === p ? '#FFFFFF' : 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: safeCurrentPage === p ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {p}
                </button>
              </React.Fragment>
            ))}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage === totalPages}
            title="Next Page"
            style={{
              padding: '4px 8px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: safeCurrentPage === totalPages ? 'var(--text-disabled)' : 'var(--text-primary)',
              cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            <span>Next</span>
            <ChevronRight size={13} />
          </button>

          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={safeCurrentPage === totalPages}
            title="Last Page"
            style={{
              padding: '4px 6px',
              borderRadius: '5px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: safeCurrentPage === totalPages ? 'var(--text-disabled)' : 'var(--text-primary)',
              cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronsRight size={13} />
          </button>
        </div>
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
                  <strong>MANDATORY FIRST-LOGIN RESET:</strong> Hand this slip physically to the operator. Upon typing this passkey at any warehouse terminal, the system will immediately require setting a confidential permanent password.
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
