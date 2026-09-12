import React, { useState, useEffect, useMemo } from 'react';
import { 
  Server, 
  Plus, 
  Search, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Globe, 
  Copy, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Key,
  Shield
} from 'lucide-react';
import { 
  resourceService, 
  ResourceItem, 
  CreateResourcePayload 
} from '../../services/resourceService';

export const ResourceConfigView: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // View Details Modal State
  const [selectedResourceDetails, setSelectedResourceDetails] = useState<ResourceItem | null>(null);

  // Auth Testing State
  const [isTestingAuth, setIsTestingAuth] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authResult, setAuthResult] = useState<any>(null);

  const handleTestWmsAuth = async () => {
    setIsTestingAuth(true);
    setAuthResult(null);
    try {
      const res = await resourceService.testWmsAuth();
      setAuthResult(res);
      setAuthModalOpen(true);
    } catch (err: any) {
      alert(`Authentication failed: ${err.message}`);
    } finally {
      setIsTestingAuth(false);
    }
  };

  // Form State
  const [formResourceId, setFormResourceId] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<string>('SOFTWARE');
  const [formStatus, setFormStatus] = useState<string>('ACTIVE');
  const [formIp, setFormIp] = useState<string>('');
  const [customPropRows, setCustomPropRows] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ]);

  // Load Resources
  const loadResources = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await resourceService.getResources();
      setResources(data);
    } catch (err: any) {
      console.error('Failed to load resources:', err);
      setErrorMessage(err.message || 'Failed to load resources from WES backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  // Quick auto-dismiss notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filtered dataset
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        res.resourceId.toLowerCase().includes(query) ||
        res.name.toLowerCase().includes(query) ||
        (res.ip && res.ip.toLowerCase().includes(query)) ||
        res.type.toLowerCase().includes(query);

      const matchesType = selectedType === 'ALL' || res.type.toUpperCase() === selectedType.toUpperCase();
      const matchesStatus = selectedStatus === 'ALL' || res.status.toUpperCase() === selectedStatus.toUpperCase();

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [resources, searchQuery, selectedType, selectedStatus]);

  // Stat calculations
  const stats = useMemo(() => {
    const total = resources.length;
    const software = resources.filter(r => r.type.toUpperCase() === 'SOFTWARE' || r.type.toUpperCase() === 'WMS').length;
    const hardware = resources.filter(r => r.type.toUpperCase() === 'HARDWARE' || r.type.toUpperCase() === 'PLC' || r.type.toUpperCase() === 'EQUIPMENT').length;
    const active = resources.filter(r => r.status.toUpperCase() === 'ACTIVE').length;
    return { total, software, hardware, active };
  }, [resources]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setFormResourceId('');
    setFormName('');
    setFormType('SOFTWARE');
    setFormStatus('ACTIVE');
    setFormIp('');
    setCustomPropRows([{ key: '', value: '' }]);
    setIsModalOpen(true);
  };

  // Quick Pre-fill for Logiqs Ambient WMS
  const handlePreFillLogiqsWms = () => {
    setFormResourceId('LOGIQS-AMBIENT-WMS');
    setFormName('Logiqs Ambient WMS');
    setFormType('SOFTWARE');
    setFormStatus('ACTIVE');
    setFormIp('192.168.1.100');
    setCustomPropRows([
      { key: 'port', value: '8089' },
      { key: 'protocol', value: 'REST' },
      { key: 'environment', value: 'PRODUCTION' },
      { key: 'vendor', value: 'Logiqs' }
    ]);
  };

  // Open Edit Modal
  const handleOpenEditModal = (res: ResourceItem) => {
    setIsEditing(true);
    setFormResourceId(res.resourceId);
    setFormName(res.name);
    setFormType(res.type);
    setFormStatus(res.status);
    setFormIp(res.ip || '');

    const rows: Array<{ key: string; value: string }> = [];
    if (res.customProperties) {
      Object.entries(res.customProperties).forEach(([k, v]) => {
        if (k !== 'ip' && k !== 'ipAddress') {
          rows.push({ key: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) });
        }
      });
    }
    if (rows.length === 0) {
      rows.push({ key: '', value: '' });
    }
    setCustomPropRows(rows);
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formResourceId.trim() || !formName.trim() || !formType.trim()) {
      alert('Please provide Resource ID, Resource Name, and Type');
      return;
    }

    setIsSaving(true);
    try {
      const customProps: Record<string, any> = {};
      customPropRows.forEach(row => {
        if (row.key.trim()) {
          const val = row.value.trim();
          if (val === 'true') customProps[row.key.trim()] = true;
          else if (val === 'false') customProps[row.key.trim()] = false;
          else if (!isNaN(Number(val)) && val !== '') customProps[row.key.trim()] = Number(val);
          else {
            try {
              customProps[row.key.trim()] = JSON.parse(val);
            } catch {
              customProps[row.key.trim()] = val;
            }
          }
        }
      });

      const payload: CreateResourcePayload = {
        resourceId: formResourceId.trim(),
        name: formName.trim(),
        type: formType.trim().toUpperCase(),
        status: formStatus.trim().toUpperCase(),
        ip: formIp.trim() || undefined,
        customProperties: customProps
      };

      if (isEditing) {
        await resourceService.updateResource(formResourceId.trim(), payload);
        setSuccessMessage(`Resource '${formResourceId.trim()}' updated successfully`);
      } else {
        await resourceService.createResource(payload);
        setSuccessMessage(`Resource '${formResourceId.trim()}' created successfully`);
      }

      setIsModalOpen(false);
      await loadResources();
    } catch (err: any) {
      alert(`Error saving resource: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Resource
  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm(`Are you sure you want to delete resource '${resourceId}'?`)) {
      return;
    }
    try {
      await resourceService.deleteResource(resourceId);
      setSuccessMessage(`Resource '${resourceId}' deleted successfully`);
      await loadResources();
    } catch (err: any) {
      alert(`Failed to delete resource: ${err.message}`);
    }
  };

  // Copy IP to Clipboard
  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Add / Remove custom property rows
  const handleAddPropRow = () => {
    setCustomPropRows(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemovePropRow = (index: number) => {
    setCustomPropRows(prev => prev.filter((_, i) => i !== index));
  };

  const handlePropChange = (index: number, field: 'key' | 'value', value: string) => {
    setCustomPropRows(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Helper for Type Badge Colors
  const getTypeBadgeStyle = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'SOFTWARE' || t === 'WMS') {
      return {
        bg: 'rgba(124, 58, 237, 0.12)',
        color: '#8B5CF6',
        border: '1px solid rgba(139, 92, 246, 0.28)'
      };
    }
    if (t === 'PLC' || t === 'EQUIPMENT') {
      return {
        bg: 'rgba(14, 165, 233, 0.12)',
        color: '#0284C7',
        border: '1px solid rgba(2, 132, 199, 0.28)'
      };
    }
    return {
      bg: 'rgba(37, 99, 235, 0.12)',
      color: '#2563EB',
      border: '1px solid rgba(37, 99, 235, 0.28)'
    };
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-page)',
      color: 'var(--text-primary)'
    }}>
      {/* Top Header Bar */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>
            <Server size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Resource Configuration
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              Manage WMS interfaces, PLCs, software nodes, hardware resources, and IP mappings
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadResources}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleTestWmsAuth}
            disabled={isTestingAuth}
            title="Authenticate with /WMS.Api/api/authentication and inspect cached Bearer token"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              color: '#8B5CF6',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Key size={14} className={isTestingAuth ? 'animate-spin' : ''} />
            <span>{isTestingAuth ? 'Authenticating...' : 'Test WMS Auth'}</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Plus size={16} />
            <span>Add Resource</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Success Alert */}
        {successMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#059669',
            fontSize: '13px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#DC2626',
            fontSize: '13px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Metrics Counter Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px'
        }}>
          {/* Card 1: Total */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Resources
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {stats.total}
            </div>
          </div>

          {/* Card 2: Software / WMS */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Software & WMS Nodes
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#8B5CF6', marginTop: '4px' }}>
              {stats.software}
            </div>
          </div>

          {/* Card 3: Hardware / PLC */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Hardware & PLCs
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
              {stats.hardware}
            </div>
          </div>

          {/* Card 4: Active */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Systems
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
              {stats.active}
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)'
        }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '6px 12px',
            minWidth: '280px'
          }}>
            <Search size={15} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search by ID, Name, IP, or Type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '13px',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '7px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Types</option>
                <option value="SOFTWARE">Software / WMS</option>
                <option value="HARDWARE">Hardware</option>
                <option value="PLC">PLC</option>
                <option value="EQUIPMENT">Equipment</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '7px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resources Table */}
        <div style={{
          borderRadius: '10px',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', gap: '10px' }}>
              <Loader2 size={24} className="animate-spin" color="#2563EB" />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading resources from WES backend...</span>
            </div>
          ) : filteredResources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Server size={36} color="var(--text-disabled)" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No resources found
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {searchQuery ? 'Try adjusting your search or filters' : 'Get started by creating your first resource'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleOpenCreateModal}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add Resource
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-secondary)'
                }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Resource ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>IP Address</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Custom Properties</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((res) => {
                  const typeStyle = getTypeBadgeStyle(res.type);
                  const isCopied = copiedIp === res.ip;

                  return (
                    <tr
                      key={res.id}
                      style={{
                        borderBottom: '1px solid var(--border-default)',
                        transition: 'background-color var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Resource ID */}
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        <span style={{
                          fontFamily: 'monospace',
                          padding: '3px 7px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-default)',
                          fontSize: '12px',
                          color: '#2563EB'
                        }}>
                          {res.resourceId}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {res.name}
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 9px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          backgroundColor: typeStyle.bg,
                          color: typeStyle.color,
                          border: typeStyle.border
                        }}>
                          {res.type}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: res.status.toUpperCase() === 'ACTIVE' ? '#10B981' : '#94A3B8'
                          }} />
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: res.status.toUpperCase() === 'ACTIVE' ? '#10B981' : 'var(--text-secondary)'
                          }}>
                            {res.status}
                          </span>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td style={{ padding: '14px 16px' }}>
                        {res.ip ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Globe size={13} color="var(--text-secondary)" />
                            <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>
                              {res.ip}
                            </span>
                            <button
                              onClick={() => handleCopyIp(res.ip!)}
                              title="Copy IP"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: '2px',
                                color: isCopied ? '#10B981' : 'var(--text-secondary)'
                              }}
                            >
                              {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Custom Properties */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {res.customProperties && Object.keys(res.customProperties).length > 0 ? (
                            <>
                              {Object.entries(res.customProperties)
                                .slice(0, 2)
                                .map(([k, v]) => (
                                  <span
                                    key={k}
                                    style={{
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      backgroundColor: 'var(--bg-surface-subtle)',
                                      border: '1px solid var(--border-default)',
                                      color: 'var(--text-secondary)'
                                    }}
                                  >
                                    <strong style={{ color: 'var(--text-primary)' }}>{k}:</strong> {String(v)}
                                  </span>
                                ))}
                              {Object.keys(res.customProperties).length > 2 && (
                                <button
                                  onClick={() => setSelectedResourceDetails(res)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '11px',
                                    color: '#2563EB',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                  }}
                                >
                                  +{Object.keys(res.customProperties).length - 2} more
                                </button>
                              )}
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-disabled)', fontSize: '12px' }}>None</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => setSelectedResourceDetails(res)}
                            title="View Details"
                            style={{
                              border: '1px solid var(--border-default)',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-secondary)',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '11.5px',
                              fontWeight: 500
                            }}
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(res)}
                            title="Edit Resource"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#2563EB',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteResource(res.resourceId)}
                            title="Delete Resource"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE / EDIT RESOURCE MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  {isEditing ? `Edit Resource: ${formResourceId}` : 'Add New Resource'}
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Configure warehouse software, WMS, PLC, or hardware nodes
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Fill Preset Ribbon (Only for new resource) */}
            {!isEditing && (
              <div style={{
                padding: '8px 20px',
                backgroundColor: 'var(--bg-surface-subtle)',
                borderBottom: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  Quick Preset:
                </span>
                <button
                  type="button"
                  onClick={handlePreFillLogiqsWms}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(37, 99, 235, 0.3)',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    color: '#2563EB',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Pre-fill "Logiqs Ambient WMS"
                </button>
              </div>
            )}

            {/* Modal Form Content */}
            <form onSubmit={handleSaveResource} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Resource ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Resource ID *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    placeholder="e.g. LOGIQS-AMBIENT-WMS"
                    value={formResourceId}
                    onChange={(e) => setFormResourceId(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: isEditing ? 'var(--bg-surface-subtle)' : 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Unique identifier used across WES execution and task routing
                  </span>
                </div>

                {/* Resource Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Resource Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Logiqs Ambient WMS"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Row: Type & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Type *
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="SOFTWARE">Software / WMS</option>
                      <option value="HARDWARE">Hardware</option>
                      <option value="PLC">PLC Controller</option>
                      <option value="EQUIPMENT">Automation Equipment</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Status *
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                  </div>
                </div>

                {/* IP Address */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    IP Address
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="e.g. 192.168.1.100"
                      value={formIp}
                      onChange={(e) => setFormIp(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px 8px 32px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontFamily: 'monospace',
                        boxSizing: 'border-box'
                      }}
                    />
                    <Globe size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                  </div>
                </div>

                {/* Dynamic Custom Properties Section */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600 }}>
                      Custom Properties
                    </label>
                    <button
                      type="button"
                      onClick={handleAddPropRow}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        border: 'none',
                        background: 'transparent',
                        color: '#2563EB',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={13} />
                      <span>Add Property</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {customPropRows.map((row, index) => (
                      <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="text"
                          placeholder="Property Key (e.g. port)"
                          value={row.key}
                          onChange={(e) => handlePropChange(index, 'key', e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--text-primary)',
                            fontSize: '12px'
                          }}
                        />
                        <input
                          type="text"
                          placeholder="Value (e.g. 8089)"
                          value={row.value}
                          onChange={(e) => handlePropChange(index, 'value', e.target.value)}
                          style={{
                            flex: 1.5,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--text-primary)',
                            fontSize: '12px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePropRow(index)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>{isEditing ? 'Save Changes' : 'Create Resource'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOURCE DETAILS INSPECT MODAL */}
      {selectedResourceDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '500px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  {selectedResourceDetails.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedResourceDetails(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Resource ID:</span>
                <div style={{ fontWeight: 600, fontFamily: 'monospace', color: '#2563EB' }}>
                  {selectedResourceDetails.resourceId}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                <div style={{ fontWeight: 600 }}>{selectedResourceDetails.type}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <div style={{ fontWeight: 600, color: selectedResourceDetails.status === 'ACTIVE' ? '#10B981' : 'inherit' }}>
                  {selectedResourceDetails.status}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>IP Address:</span>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {selectedResourceDetails.ip || '—'}
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                All Custom Properties (JSON):
              </span>
              <pre style={{
                margin: 0,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                fontSize: '12px',
                fontFamily: 'monospace',
                overflowX: 'auto',
                color: 'var(--text-primary)'
              }}>
                {JSON.stringify(selectedResourceDetails.customProperties || {}, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                onClick={() => setSelectedResourceDetails(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WMS AUTHENTICATION TOKEN INSPECTOR MODAL */}
      {authModalOpen && authResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Shield size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                    WMS Authentication Status
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 600 }}>
                    ● Token Active & Saved in Memory
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAuthModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              fontSize: '12.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div><strong>Endpoint:</strong> <code style={{ color: '#2563EB' }}>POST /WMS.Api/api/authentication</code></div>
              <div><strong>Target Host:</strong> <code>{authResult.status?.targetBaseUrl}</code></div>
              <div><strong>Header Format:</strong> <code style={{ color: '#8B5CF6' }}>{authResult.status?.headerFormat}</code></div>
              <div><strong>Expires At:</strong> <code>{authResult.status?.expiresAt || 'Active'}</code></div>
            </div>

            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Active Access Token (In-Memory Bearer):
              </span>
              <pre style={{
                margin: 0,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                fontSize: '11.5px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                whiteSpace: 'pre-wrap',
                maxHeight: '120px',
                overflowY: 'auto',
                color: 'var(--text-primary)'
              }}>
                {authResult.token}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                onClick={() => setAuthModalOpen(false)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
