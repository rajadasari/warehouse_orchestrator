import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Plus, 
  RefreshCw, 
  Loader2, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  Check, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Database,
  Layers,
  Box,
  Cpu
} from 'lucide-react';
import { 
  masterDataService, 
  CustomAttributeItem, 
  CreateCustomAttributePayload 
} from '../../services/masterDataService';

export const CustomFieldsView: React.FC = () => {
  const [attributes, setAttributes] = useState<CustomAttributeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Global & Scope Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [targetEntityFilter, setTargetEntityFilter] = useState<'ALL' | 'ITEM' | 'SKU' | 'HANDLING_STRATEGY' | 'PALLET'>('ALL');

  // Column Filters
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'targetEntity',
    direction: 'asc'
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [newTargetEntity, setNewTargetEntity] = useState<'ITEM' | 'SKU' | 'HANDLING_STRATEGY' | 'PALLET'>('ITEM');
  const [newAttributeCode, setNewAttributeCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDataType, setNewDataType] = useState<'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'SELECT_ONE' | 'MULTI_SELECT'>('STRING');
  const [newUnitOfMeasure, setNewUnitOfMeasure] = useState('');
  const [newAppliesToCategory, setNewAppliesToCategory] = useState('ALL');
  const [newIsRequired, setNewIsRequired] = useState(false);
  const [newDefaultValue, setNewDefaultValue] = useState('');
  const [newAllowedOptions, setNewAllowedOptions] = useState('');
  const [newMinValue, setNewMinValue] = useState<string>('');
  const [newMaxValue, setNewMaxValue] = useState<string>('');
  const [newSortOrder, setNewSortOrder] = useState(10);

  // Load data strictly from Backend API (wes.custom_attribute_definition in PostgreSQL)
  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await masterDataService.getCustomAttributes();
      setAttributes(data || []);
    } catch (err: any) {
      console.error('Failed to load custom attributes from database:', err);
      setErrorMsg(err.message || 'Failed to load custom attribute definitions from database.');
      setAttributes([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sorting helper
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
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
    setTargetEntityFilter('ALL');
    setCurrentPage(1);
  };

  // Filter Cell Component
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

  // Filter & Sort Pipeline
  const processedAttributes = useMemo(() => {
    const filtered = attributes.filter(attr => {
      // Global search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal = 
          attr.attributeCode.toLowerCase().includes(q) ||
          attr.label.toLowerCase().includes(q) ||
          (attr.description && attr.description.toLowerCase().includes(q)) ||
          attr.targetEntity.toLowerCase().includes(q) ||
          attr.dataType.toLowerCase().includes(q) ||
          (attr.unitOfMeasure && attr.unitOfMeasure.toLowerCase().includes(q)) ||
          attr.appliesToCategory.toLowerCase().includes(q) ||
          (attr.allowedOptions && attr.allowedOptions.join(' ').toLowerCase().includes(q));
        if (!matchesGlobal) return false;
      }

      // Entity filter pills
      if (targetEntityFilter !== 'ALL' && attr.targetEntity !== targetEntityFilter) {
        return false;
      }

      // Column filters
      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'targetEntity' && !attr.targetEntity.toLowerCase().includes(val)) return false;
        if (key === 'attribute' && !attr.attributeCode.toLowerCase().includes(val) && !attr.label.toLowerCase().includes(val)) return false;
        if (key === 'dataType' && !attr.dataType.toLowerCase().includes(val)) return false;
        if (key === 'unitOfMeasure' && !(attr.unitOfMeasure || '').toLowerCase().includes(val)) return false;
        if (key === 'category' && !attr.appliesToCategory.toLowerCase().includes(val)) return false;
        if (key === 'rules') {
          const reqStr = attr.isRequired ? 'required yes' : 'optional no';
          const opts = (attr.allowedOptions || []).join(' ').toLowerCase();
          const dVal = String(attr.defaultValue || '').toLowerCase();
          if (!reqStr.includes(val) && !opts.includes(val) && !dVal.includes(val)) return false;
        }
        if (key === 'status') {
          const statusStr = attr.isActive ? 'active enabled true' : 'inactive disabled false';
          if (!statusStr.includes(val)) return false;
        }
        if (key === 'sortOrder' && !String(attr.sortOrder).includes(val)) return false;
      }
      return true;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      let valA: any = (a as any)[sortConfig.key] ?? '';
      let valB: any = (b as any)[sortConfig.key] ?? '';

      if (typeof valA === 'string') {
        return sortConfig.direction === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      if (typeof valA === 'boolean') {
        const numA = valA ? 1 : 0;
        const numB = valB ? 1 : 0;
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }
      return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [attributes, searchQuery, targetEntityFilter, colFilters, sortConfig]);

  // Pagination Calculations
  const totalRecords = processedAttributes.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedAttributes = processedAttributes.slice(startIndex, endIndex);
  const recordsLeftToView = Math.max(0, totalRecords - endIndex);

  // Toggle Active Status
  const handleToggleActive = (attr: CustomAttributeItem) => {
    setAttributes(prev => prev.map(item => {
      if (item.id === attr.id) {
        return { ...item, isActive: !item.isActive };
      }
      return item;
    }));
  };

  // Add Custom Field Handler
  const handleAddCustomAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttributeCode || !newLabel) {
      setFormError('Attribute code and display label are required.');
      return;
    }

    // Format code as lowercase snake_case
    const formattedCode = newAttributeCode.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');

    setIsSubmitting(true);
    setFormError(null);

    const payload: CreateCustomAttributePayload = {
      targetEntity: newTargetEntity,
      attributeCode: formattedCode,
      label: newLabel.trim(),
      description: newDescription.trim() || undefined,
      dataType: newDataType,
      unitOfMeasure: newUnitOfMeasure.trim() || undefined,
      appliesToCategory: newAppliesToCategory.trim() || 'ALL',
      isRequired: newIsRequired,
      defaultValue: newDefaultValue.trim() || undefined,
      allowedOptions: newAllowedOptions.trim() ? newAllowedOptions.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      minValue: newMinValue ? Number(newMinValue) : undefined,
      maxValue: newMaxValue ? Number(newMaxValue) : undefined,
      isActive: true,
      sortOrder: Number(newSortOrder) || 10
    };

    try {
      // Save directly to PostgreSQL database via WES API
      const createdItem = await masterDataService.createCustomAttribute(payload);
      setAttributes(prev => [createdItem, ...prev]);
      setIsAddModalOpen(false);

      // Reset form
      setNewAttributeCode('');
      setNewLabel('');
      setNewDescription('');
      setNewUnitOfMeasure('');
      setNewDefaultValue('');
      setNewAllowedOptions('');
      setNewMinValue('');
      setNewMaxValue('');
      setNewIsRequired(false);
      setNewSortOrder(10);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create custom attribute definition.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Scope Badge Renderer
  const getScopeBadge = (entity: string) => {
    switch (entity) {
      case 'ITEM':
        return {
          bg: 'rgba(37, 99, 235, 0.12)',
          text: 'var(--color-primary-600)',
          border: 'rgba(37, 99, 235, 0.25)',
          label: 'Material Master (ITEM)',
          icon: <Box size={11} />
        };
      case 'SKU':
        return {
          bg: 'rgba(16, 185, 129, 0.12)',
          text: '#059669',
          border: 'rgba(16, 185, 129, 0.25)',
          label: 'Packaging (SKU)',
          icon: <Layers size={11} />
        };
      case 'HANDLING_STRATEGY':
        return {
          bg: 'rgba(139, 92, 246, 0.12)',
          text: '#7C3AED',
          border: 'rgba(139, 92, 246, 0.25)',
          label: 'Pallet Strategy',
          icon: <Cpu size={11} />
        };
      case 'PALLET':
        return {
          bg: 'rgba(245, 158, 11, 0.12)',
          text: '#D97706',
          border: 'rgba(245, 158, 11, 0.25)',
          label: 'Pallet Dynamic',
          icon: <Box size={11} />
        };
      default:
        return {
          bg: 'var(--bg-surface-subtle)',
          text: 'var(--text-secondary)',
          border: 'var(--border-default)',
          label: entity,
          icon: <Database size={11} />
        };
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '16px 20px',
      boxSizing: 'border-box',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-page)'
    }}>
      {/* 1. Header Section (Title, wes.custom_attribute_definition tag, Refresh & Add buttons) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        flexShrink: 0
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              Custom Field Definitions
            </h1>
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              fontFamily: 'monospace',
              backgroundColor: 'var(--color-primary-50)',
              color: 'var(--color-primary-600)',
              padding: '2px 7px',
              borderRadius: '9999px',
              border: '1px solid var(--color-primary-200)',
              textTransform: 'uppercase'
            }}>
              wes.custom_attribute_definition
            </span>
          </div>
          <p style={{
            fontSize: '11.5px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Dynamic extensible EAV fields for Material Master (ITEM), Packaging (SKU), and Handling Strategies (TI / HI)
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={loadData}
            disabled={isLoading}
            title="Reload custom attributes from PostgreSQL wes database"
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
              transition: 'all var(--transition-fast)',
              cursor: 'pointer',
              border: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-700)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-600)'}
          >
            <Plus size={15} />
            <span>Define Custom Field</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner (if any) */}
      {errorMsg && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: 'var(--color-danger-bg)',
          color: 'var(--color-danger-text)',
          fontSize: '11.5px',
          fontWeight: 500,
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
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

      {/* 2. Controls Bar (Global search, scope filter pills, column filters toggle, clear filters, page size) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        gap: '12px',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        {/* Left Side: Search + Scope Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
          {/* Global Search Input */}
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
              placeholder="Search code, label, UoM..."
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
              <button 
                onClick={() => setSearchQuery('')} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                title="Clear global search"
              >
                <X size={12} color="var(--text-secondary)" />
              </button>
            )}
          </div>

          {/* Scope Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            {[
              { key: 'ALL', label: 'All Scopes' },
              { key: 'ITEM', label: 'Material (ITEM)' },
              { key: 'SKU', label: 'Packaging (SKU)' },
              { key: 'HANDLING_STRATEGY', label: 'Pallet Strategy' },
              { key: 'PALLET', label: 'Pallet Dynamic' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setTargetEntityFilter(tab.key as any);
                  setCurrentPage(1);
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  backgroundColor: targetEntityFilter === tab.key ? 'var(--color-primary-600)' : 'var(--bg-surface-subtle)',
                  color: targetEntityFilter === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right Side: Column Filters Toggle, Clear Filters, Rows Selector */}
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
          {(activeColFilterCount > 0 || searchQuery || targetEntityFilter !== 'ALL') && (
            <button
              onClick={handleClearAllFilters}
              title="Clear all active filters"
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
              <span>Clear Filters ({activeColFilterCount + (searchQuery ? 1 : 0) + (targetEntityFilter !== 'ALL' ? 1 : 0)})</span>
            </button>
          )}

          {/* Rows Per Page Selector */}
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

      {/* 3. Data Table (Strictly mapped to wes.custom_attribute_definition) */}
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
              <th onClick={() => handleSort('targetEntity')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Scope Level {getSortIcon('targetEntity')}
                </div>
              </th>
              <th onClick={() => handleSort('attributeCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Attribute Code &amp; Label {getSortIcon('attributeCode')}
                </div>
              </th>
              <th onClick={() => handleSort('dataType')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Data Type {getSortIcon('dataType')}
                </div>
              </th>
              <th onClick={() => handleSort('unitOfMeasure')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  UoM {getSortIcon('unitOfMeasure')}
                </div>
              </th>
              <th onClick={() => handleSort('appliesToCategory')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Category Scope {getSortIcon('appliesToCategory')}
                </div>
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Validation &amp; Options
              </th>
              <th onClick={() => handleSort('sortOrder')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Order {getSortIcon('sortOrder')}
                </div>
              </th>
              <th onClick={() => handleSort('isActive')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Status {getSortIcon('isActive')}
                </div>
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                Actions
              </th>
            </tr>

            {/* Optional Column Search Row */}
            {showColFilters && (
              <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                <ColumnFilterCell colKey="targetEntity" placeholder="Filter scope..." />
                <ColumnFilterCell colKey="attribute" placeholder="Filter code/label..." />
                <ColumnFilterCell colKey="dataType" placeholder="Filter type..." />
                <ColumnFilterCell colKey="unitOfMeasure" placeholder="Filter UoM..." />
                <ColumnFilterCell colKey="category" placeholder="Filter category..." />
                <ColumnFilterCell colKey="rules" placeholder="Filter rules/opts..." />
                <ColumnFilterCell colKey="sortOrder" placeholder="Filter order..." />
                <ColumnFilterCell colKey="status" placeholder="Filter status..." />
                <th style={{ padding: '3px 6px', backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }} />
              </tr>
            )}
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={9} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <Loader2 size={16} className="spin" />
                    <span>Loading definitions from wes.custom_attribute_definition...</span>
                  </div>
                </td>
              </tr>
            ) : pagedAttributes.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {attributes.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Database size={28} style={{ opacity: 0.35, color: 'var(--text-secondary)' }} />
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                        No records in wes.custom_attribute_definition
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', maxWidth: '400px' }}>
                        The database table currently contains 0 records. Click &quot;Define Custom Field&quot; above to create a new custom attribute definition.
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px' }}>
                      No custom attributes match your current search filters.
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              pagedAttributes.map((attr) => {
                const scope = getScopeBadge(attr.targetEntity);
                return (
                  <tr
                    key={attr.id}
                    style={{
                      borderBottom: '1px solid var(--border-default)',
                      transition: 'background-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* 1. Scope Level */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        backgroundColor: scope.bg,
                        color: scope.text,
                        border: `1px solid ${scope.border}`
                      }}>
                        {scope.icon}
                        {attr.targetEntity}
                      </span>
                    </td>

                    {/* 2. Attribute Code & Label */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontWeight: 600,
                            fontFamily: 'monospace',
                            color: 'var(--color-primary-600)',
                            fontSize: '11.5px'
                          }}>
                            {attr.attributeCode}
                          </span>
                          {attr.isRequired && (
                            <span style={{
                              fontSize: '9px',
                              fontWeight: 700,
                              color: '#EF4444',
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              padding: '1px 4px',
                              borderRadius: '3px',
                              border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}>
                              REQ
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px' }}>
                          {attr.label}
                        </div>
                        {attr.description && (
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {attr.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 3. Data Type */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-default)',
                        fontFamily: 'monospace'
                      }}>
                        {attr.dataType}
                      </span>
                    </td>

                    {/* 4. Unit of Measure */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      {attr.unitOfMeasure ? (
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          color: 'var(--color-primary-600)',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          {attr.unitOfMeasure}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-disabled)', fontSize: '11px' }}>—</span>
                      )}
                    </td>

                    {/* 5. Category Scope */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '10.5px',
                        color: 'var(--text-secondary)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-surface-subtle)'
                      }}>
                        {attr.appliesToCategory || 'ALL'}
                      </span>
                    </td>

                    {/* 6. Validation & Options */}
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '260px' }}>
                        {attr.allowedOptions && attr.allowedOptions.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                            {attr.allowedOptions.slice(0, 3).map((opt, i) => (
                              <span key={i} style={{
                                fontSize: '9.5px',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                backgroundColor: 'var(--bg-surface-subtle)',
                                border: '1px solid var(--border-default)',
                                color: 'var(--text-secondary)'
                              }}>
                                {opt}
                              </span>
                            ))}
                            {attr.allowedOptions.length > 3 && (
                              <span style={{ fontSize: '9.5px', color: 'var(--text-disabled)' }}>
                                +{attr.allowedOptions.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : attr.minValue !== undefined || attr.maxValue !== undefined ? (
                          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                            Range: [{attr.minValue ?? '0'} — {attr.maxValue ?? '∞'}]
                          </span>
                        ) : attr.validationRegex ? (
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                            regex: {attr.validationRegex}
                          </span>
                        ) : (
                          <span style={{ fontSize: '10.5px', color: 'var(--text-disabled)' }}>
                            Default: {attr.defaultValue !== undefined ? String(attr.defaultValue) : 'None'}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 7. Sort Order */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 600,
                        fontSize: '11px',
                        color: 'var(--text-secondary)'
                      }}>
                        #{attr.sortOrder}
                      </span>
                    </td>

                    {/* 8. Status */}
                    <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleToggleActive(attr)}
                        title={`Click to ${attr.isActive ? 'deactivate' : 'activate'}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 7px',
                          borderRadius: '9999px',
                          fontSize: '10.5px',
                          fontWeight: 600,
                          backgroundColor: attr.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(156, 163, 175, 0.12)',
                          color: attr.isActive ? '#059669' : '#6B7280',
                          border: attr.isActive ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(156, 163, 175, 0.25)'
                        }}>
                          <span style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: attr.isActive ? '#10B981' : '#9CA3AF'
                          }} />
                          {attr.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </button>
                    </td>

                    {/* 9. Actions */}
                    <td style={{ padding: '8px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleToggleActive(attr)}
                        title={attr.isActive ? 'Disable field' : 'Enable field'}
                        style={{
                          padding: '3px 6px',
                          backgroundColor: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-default)',
                          borderRadius: '4px',
                          color: 'var(--text-secondary)',
                          fontSize: '10.5px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        {attr.isActive ? <ToggleRight size={13} color="#10B981" /> : <ToggleLeft size={13} color="#9CA3AF" />}
                        <span>Toggle</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Pagination Footer (Matching User Management UX) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        fontSize: '11px',
        color: 'var(--text-secondary)',
        flexShrink: 0
      }}>
        <div>
          Showing <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalRecords === 0 ? 0 : startIndex + 1}</span> to{' '}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{endIndex}</span> of{' '}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalRecords}</span> definitions
          {recordsLeftToView > 0 && ` (${recordsLeftToView} remaining)`}
        </div>

        {/* Page Nav Buttons */}
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

          {/* Page Pills */}
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

      {/* 5. Add Custom Field Modal Dialog */}
      {isAddModalOpen && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            width: '540px',
            maxWidth: '92vw',
            maxHeight: '88vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-default)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Define Custom Field Attribute
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Maps directly to PostgreSQL table <code style={{ color: 'var(--color-primary-500)' }}>wes.custom_attribute_definition</code>
                </span>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddCustomAttribute} style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {formError && (
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger-text)',
                  fontSize: '11.5px',
                  fontWeight: 500
                }}>
                  {formError}
                </div>
              )}

              {/* Target Entity Scope */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Target Entity Scope *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[
                    { id: 'ITEM', label: 'Material (ITEM)', desc: 'Product level attributes' },
                    { id: 'SKU', label: 'Packaging (SKU)', desc: 'Pack level attributes' },
                    { id: 'HANDLING_STRATEGY', label: 'Strategy', desc: 'Palletization rules' },
                    { id: 'PALLET', label: 'Pallet Load', desc: 'Live unit properties' }
                  ].map(opt => (
                    <div
                      key={opt.id}
                      onClick={() => setNewTargetEntity(opt.id as any)}
                      style={{
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: newTargetEntity === opt.id ? 'var(--color-primary-600)' : 'var(--border-default)',
                        backgroundColor: newTargetEntity === opt.id ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-surface-subtle)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: '11px', color: newTargetEntity === opt.id ? 'var(--color-primary-600)' : 'var(--text-primary)' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '9.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {opt.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attribute Code & Display Label */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Attribute Code (JSON Key) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. storage_temp_min"
                    value={newAttributeCode}
                    onChange={(e) => setNewAttributeCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    UI Display Label *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Min Storage Temperature"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Data Type & Unit of Measure */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Data Type *
                  </label>
                  <select
                    value={newDataType}
                    onChange={(e) => setNewDataType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="STRING">STRING (Text input)</option>
                    <option value="NUMBER">NUMBER (Integer or Decimal)</option>
                    <option value="BOOLEAN">BOOLEAN (Yes / No Toggle)</option>
                    <option value="DATE">DATE (Timestamp / ISO)</option>
                    <option value="SELECT_ONE">SELECT_ONE (Single Choice)</option>
                    <option value="MULTI_SELECT">MULTI_SELECT (Multi Tag)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Unit of Measure (UoM)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. °C, kg, mm, Hours, %"
                    value={newUnitOfMeasure}
                    onChange={(e) => setNewUnitOfMeasure(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Allowed Options (if SELECT) */}
              {(newDataType === 'SELECT_ONE' || newDataType === 'MULTI_SELECT') && (
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Allowed Options (comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AMBIENT, CHILLED_4C, FROZEN_NEG18C"
                    value={newAllowedOptions}
                    onChange={(e) => setNewAllowedOptions(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              {/* Min & Max Value (if NUMBER) */}
              {newDataType === 'NUMBER' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Min Value
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 0"
                      value={newMinValue}
                      onChange={(e) => setNewMinValue(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 9px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Max Value
                    </label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={newMaxValue}
                      onChange={(e) => setNewMaxValue(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '7px 9px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '11.5px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Category Scope & Sort Order */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Category Scope
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ALL, FOOD, RAW_MATERIAL"
                    value={newAppliesToCategory}
                    onChange={(e) => setNewAppliesToCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Sort Order Priority
                  </label>
                  <input
                    type="number"
                    value={newSortOrder}
                    onChange={(e) => setNewSortOrder(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '7px 9px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Description / Operational Help Text
                </label>
                <textarea
                  rows={2}
                  placeholder="Explain why this custom field is required and how operators should fill it..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 9px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '11.5px',
                    boxSizing: 'border-box',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Mandatory Required Checkbox */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)'
              }}>
                <input
                  type="checkbox"
                  id="reqCheckbox"
                  checked={newIsRequired}
                  onChange={(e) => setNewIsRequired(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="reqCheckbox" style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>
                  Mandatory Required Field (Validation enforced upon item &amp; SKU creation)
                </label>
              </div>

              {/* Modal Footer Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-default)'
              }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer'
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
                    border: 'none',
                    backgroundColor: 'var(--color-primary-600)',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSubmitting ? <Loader2 size={13} className="spin" /> : <Check size={13} />}
                  <span>Save Definition</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
