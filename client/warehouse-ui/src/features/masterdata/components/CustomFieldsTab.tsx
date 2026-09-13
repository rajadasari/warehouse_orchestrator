import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  Tag 
} from 'lucide-react';
import { 
  masterDataService, 
  CustomAttributeDef 
} from '../../../services/masterDataService';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Badge } from '../../../components/common/Badge';

export interface CustomFieldsTabProps {
  customAttrs: CustomAttributeDef[];
  onRefresh: () => void;
}

export const CustomFieldsTab: React.FC<CustomFieldsTabProps> = ({
  customAttrs,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [targetEntityFilter, setTargetEntityFilter] = useState('ALL');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'targetEntity',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Attribute Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAttrEntity, setNewAttrEntity] = useState<'ITEM' | 'SKU' | 'HANDLING_STRATEGY' | 'PALLET'>('ITEM');
  const [newAttrCode, setNewAttrCode] = useState('');
  const [newAttrLabel, setNewAttrLabel] = useState('');
  const [newAttrType, setNewAttrType] = useState<'STRING' | 'NUMBER' | 'BOOLEAN' | 'SELECT_ONE'>('STRING');
  const [newAttrUom, setNewAttrUom] = useState('');
  const [newAttrOptions, setNewAttrOptions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={11} color="var(--text-disabled)" style={{ opacity: 0.5 }} />;
    return sortConfig.direction === 'asc' 
      ? <ChevronUp size={11} color="var(--color-primary-500)" /> 
      : <ChevronDown size={11} color="var(--color-primary-500)" />;
  };

  const openAdd = () => {
    setNewAttrEntity('ITEM');
    setNewAttrCode('');
    setNewAttrLabel('');
    setNewAttrType('STRING');
    setNewAttrUom('');
    setNewAttrOptions('');
    setIsAddModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttrCode || !newAttrLabel) return;
    setIsSubmitting(true);
    try {
      const optionsArray = newAttrOptions
        ? newAttrOptions.split(',').map(o => o.trim()).filter(Boolean)
        : undefined;

      await masterDataService.createCustomAttribute({
        targetEntity: newAttrEntity,
        attributeCode: newAttrCode.toLowerCase().trim().replace(/\s+/g, '_'),
        label: newAttrLabel.trim(),
        dataType: newAttrType,
        unitOfMeasure: newAttrUom.trim() || undefined,
        allowedOptions: optionsArray,
        isActive: true
      });
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to define custom field');
    } finally {
      setIsSubmitting(false);
    }
  };


  const filteredAttrs = useMemo(() => {
    return customAttrs.filter(attr => {
      if (targetEntityFilter !== 'ALL' && attr.targetEntity !== targetEntityFilter) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          attr.attributeCode.toLowerCase().includes(q) ||
          attr.label.toLowerCase().includes(q) ||
          attr.targetEntity.toLowerCase().includes(q) ||
          attr.dataType.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => {
      const valA: any = (a as any)[sortConfig.key] ?? '';
      const valB: any = (b as any)[sortConfig.key] ?? '';
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [customAttrs, searchQuery, targetEntityFilter, sortConfig]);

  const totalRecords = filteredAttrs.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedAttrs = filteredAttrs.slice(startIndex, endIndex);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Controls Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderBottom: 'none',
        borderRadius: '10px 10px 0 0',
        gap: '12px',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-default)',
            borderRadius: '6px',
            padding: '4px 10px',
            width: '260px'
          }}>
            <Search size={13} color="var(--text-disabled)" />
            <input
              type="text"
              placeholder="Search custom fields by code, label..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '11.5px',
                color: 'var(--text-primary)',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-secondary)' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Entity Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {[
              { id: 'ALL', label: 'All Entities' },
              { id: 'ITEM', label: 'Item' },
              { id: 'SKU', label: 'SKU' },
              { id: 'HANDLING_STRATEGY', label: 'Strategy' },
              { id: 'PALLET', label: 'Pallet' },
            ].map(pill => {
              const active = targetEntityFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => {
                    setTargetEntityFilter(pill.id);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    border: active ? '1px solid var(--color-primary-500)' : '1px solid var(--border-default)',
                    backgroundColor: active ? 'var(--color-primary-50)' : 'transparent',
                    color: active ? 'var(--color-primary-600)' : 'var(--text-secondary)'
                  }}
                >
                  {pill.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                outline: 'none'
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={13} />}
            onClick={openAdd}
          >
            Define Custom Field
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: '0 0 10px 10px',
        flex: 1,
        minHeight: 0,
        overflow: 'auto'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'var(--bg-surface-subtle)' }}>
            <tr style={{
              borderBottom: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              <th onClick={() => handleSort('targetEntity')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Target Entity {getSortIcon('targetEntity')}
                </div>
              </th>
              <th onClick={() => handleSort('attributeCode')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Attribute Code {getSortIcon('attributeCode')}
                </div>
              </th>
              <th onClick={() => handleSort('label')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Display Label {getSortIcon('label')}
                </div>
              </th>
              <th onClick={() => handleSort('dataType')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Data Type {getSortIcon('dataType')}
                </div>
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Unit of Measure
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Allowed Options
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Active
              </th>
            </tr>
          </thead>

          <tbody>
            {pagedAttrs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Tag size={28} style={{ opacity: 0.35, margin: '0 auto 8px auto', display: 'block' }} />
                  <div>No custom fields found matching criteria.</div>
                </td>
              </tr>
            ) : (
              pagedAttrs.map(attr => (
                <tr
                  key={attr.id}
                  style={{ borderBottom: '1px solid var(--border-default)', transition: 'background-color var(--transition-fast)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant="info">
                      {attr.targetEntity}
                    </Badge>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#B45309' }}>
                    {attr.attributeCode}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {attr.label}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      backgroundColor: 'var(--bg-surface-subtle)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-secondary)'
                    }}>
                      {attr.dataType}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                    {attr.unitOfMeasure || '—'}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                    {attr.allowedOptions && attr.allowedOptions.length > 0 ? attr.allowedOptions.join(', ') : '—'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant={attr.isActive !== false ? 'success' : 'neutral'}>
                      {attr.isActive !== false ? 'YES' : 'NO'}
                    </Badge>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderTop: 'none',
        borderRadius: '0 0 10px 10px',
        fontSize: '11.5px',
        color: 'var(--text-secondary)',
        flexShrink: 0
      }}>
        <div>Showing {totalRecords === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRecords} attributes</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => setCurrentPage(1)} disabled={safePage <= 1} style={{ padding: '3px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronsLeft size={13} />
          </button>
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage <= 1} style={{ padding: '3px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', cursor: safePage <= 1 ? 'not-allowed' : 'pointer' }}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ padding: '0 6px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Page {safePage} of {totalPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} style={{ padding: '3px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}>
            <ChevronRight size={13} />
          </button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={safePage >= totalPages} style={{ padding: '3px 6px', border: '1px solid var(--border-default)', borderRadius: '4px', background: 'var(--bg-surface-subtle)', cursor: safePage >= totalPages ? 'not-allowed' : 'pointer' }}>
            <ChevronsRight size={13} />
          </button>
        </div>
      </div>

      {/* Add Custom Field Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Define Custom Field"
        subtitle="Register dynamic column in wes.custom_attribute_definition"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Target Entity *
              </label>
              <select
                value={newAttrEntity}
                onChange={e => setNewAttrEntity(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="ITEM">ITEM (Materials Master)</option>
                <option value="SKU">SKU (Packaging SKU)</option>
                <option value="HANDLING_STRATEGY">HANDLING_STRATEGY</option>
                <option value="PALLET">PALLET (LPN Container)</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Attribute Code (Snake Case) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. coffee_roast_level"
                value={newAttrCode}
                onChange={e => setNewAttrCode(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Display Label *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Roast Level"
                value={newAttrLabel}
                onChange={e => setNewAttrLabel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Data Type
              </label>
              <select
                value={newAttrType}
                onChange={e => setNewAttrType(e.target.value as any)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              >
                <option value="STRING">Text (String)</option>
                <option value="NUMBER">Numeric (Number)</option>
                <option value="BOOLEAN">Boolean (Yes/No)</option>
                <option value="SELECT_ONE">Dropdown (Select One)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Unit of Measure (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. °C, KG, MM"
                value={newAttrUom}
                onChange={e => setNewAttrUom(e.target.value.toUpperCase())}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            {newAttrType === 'SELECT_ONE' && (
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                  Options (Comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Light, Medium, Dark"
                  value={newAttrOptions}
                  onChange={e => setNewAttrOptions(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Attribute Definition
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
