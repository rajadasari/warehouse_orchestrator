import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  SlidersHorizontal, 
  Edit2, 
  Trash2, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowUpDown, 
  Layers 
} from 'lucide-react';
import { 
  masterDataService, 
  PalletType 
} from '../../../services/masterDataService';
import { Button } from '../../../components/common/Button';
import { Modal } from '../../../components/common/Modal';
import { Badge } from '../../../components/common/Badge';

export interface PalletTypesTabProps {
  palletTypes: PalletType[];
  onRefresh: () => void;
}

export const PalletTypesTab: React.FC<PalletTypesTabProps> = ({
  palletTypes,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showColFilters, setShowColFilters] = useState(false);
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'code',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add Pallet Type Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPtCode, setNewPtCode] = useState('');
  const [newPtName, setNewPtName] = useState('');
  const [newPtMaterial, setNewPtMaterial] = useState<'WOOD' | 'PLASTIC' | 'METAL' | 'COMPOSITE'>('WOOD');
  const [newPtTareWeight, setNewPtTareWeight] = useState(25);
  const [newPtLength, setNewPtLength] = useState(1200);
  const [newPtWidth, setNewPtWidth] = useState(800);
  const [newPtHeight, setNewPtHeight] = useState(144);
  const [newPtMaxPayload, setNewPtMaxPayload] = useState(1500);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Pallet Type Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPtId, setEditingPtId] = useState('');
  const [editPtCode, setEditPtCode] = useState('');
  const [editPtName, setEditPtName] = useState('');
  const [editPtMaterial, setEditPtMaterial] = useState<'WOOD' | 'PLASTIC' | 'METAL' | 'COMPOSITE'>('WOOD');
  const [editPtTareWeight, setEditPtTareWeight] = useState(25);
  const [editPtLength, setEditPtLength] = useState(1200);
  const [editPtWidth, setEditPtWidth] = useState(800);
  const [editPtHeight, setEditPtHeight] = useState(144);
  const [editPtMaxPayload, setEditPtMaxPayload] = useState(1500);

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
    setNewPtCode('');
    setNewPtName('');
    setNewPtMaterial('WOOD');
    setNewPtTareWeight(25);
    setNewPtLength(1200);
    setNewPtWidth(800);
    setNewPtHeight(144);
    setNewPtMaxPayload(1500);
    setIsAddModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPtCode || !newPtName) return;
    setIsSubmitting(true);
    try {
      await masterDataService.createPalletType({
        code: newPtCode.toUpperCase().trim(),
        name: newPtName.trim(),
        material: newPtMaterial,
        tareWeightKg: Number(newPtTareWeight),
        lengthMm: Number(newPtLength),
        widthMm: Number(newPtWidth),
        heightMm: Number(newPtHeight),
        maxPayloadKg: Number(newPtMaxPayload)
      });
      setIsAddModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create pallet type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (pt: PalletType) => {
    setEditingPtId(pt.id);
    setEditPtCode(pt.code);
    setEditPtName(pt.name);
    setEditPtMaterial((pt.material as any) || 'WOOD');
    setEditPtTareWeight(pt.tareWeightKg || 25);
    setEditPtLength(pt.lengthMm || 1200);
    setEditPtWidth(pt.widthMm || 800);
    setEditPtHeight(pt.heightMm || 144);
    setEditPtMaxPayload(pt.maxPayloadKg || 1500);
    setIsEditModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPtId || !editPtCode || !editPtName) return;
    setIsSubmitting(true);
    try {
      await masterDataService.updatePalletType(editingPtId, {
        code: editPtCode.toUpperCase().trim(),
        name: editPtName.trim(),
        material: editPtMaterial,
        tareWeightKg: Number(editPtTareWeight),
        lengthMm: Number(editPtLength),
        widthMm: Number(editPtWidth),
        heightMm: Number(editPtHeight),
        maxPayloadKg: Number(editPtMaxPayload)
      });
      setIsEditModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update pallet type');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (pt: PalletType) => {
    if (!window.confirm(`Are you sure you want to delete pallet type "${pt.code} - ${pt.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await masterDataService.deletePalletType(pt.id);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete pallet type');
    }
  };

  const filteredTypes = useMemo(() => {
    return palletTypes.filter(pt => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesGlobal = 
          pt.code.toLowerCase().includes(q) ||
          pt.name.toLowerCase().includes(q) ||
          pt.material.toLowerCase().includes(q);
        if (!matchesGlobal) return false;
      }

      for (const [key, rawVal] of Object.entries(colFilters)) {
        if (!rawVal) continue;
        const val = rawVal.toLowerCase().trim();
        if (key === 'code' && !pt.code.toLowerCase().includes(val)) return false;
        if (key === 'name' && !pt.name.toLowerCase().includes(val)) return false;
        if (key === 'material' && !pt.material.toLowerCase().includes(val)) return false;
        if (key === 'tareWeightKg' && !String(pt.tareWeightKg || '').includes(val)) return false;
        if (key === 'maxPayloadKg' && !String(pt.maxPayloadKg || '').includes(val)) return false;
      }
      return true;
    }).sort((a, b) => {
      const valA: any = (a as any)[sortConfig.key] ?? '';
      const valB: any = (b as any)[sortConfig.key] ?? '';
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }
      return sortConfig.direction === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });
  }, [palletTypes, searchQuery, colFilters, sortConfig]);

  const totalRecords = filteredTypes.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRecords);
  const pagedTypes = filteredTypes.slice(startIndex, endIndex);

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
              placeholder="Search pallet types by code, name..."
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

          <Button
            variant={showColFilters ? 'primary' : 'outline'}
            size="sm"
            leftIcon={<SlidersHorizontal size={12} />}
            onClick={() => setShowColFilters(!showColFilters)}
          >
            Filters
          </Button>

          {(searchQuery || Object.keys(colFilters).length > 0) && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<X size={12} />}
              onClick={() => {
                setSearchQuery('');
                setColFilters({});
                setCurrentPage(1);
              }}
              style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              Clear Filters
            </Button>
          )}
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
            Add Pallet Type
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
              <th onClick={() => handleSort('code')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Carrier Code {getSortIcon('code')}
                </div>
              </th>
              <th onClick={() => handleSort('name')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Carrier Name {getSortIcon('name')}
                </div>
              </th>
              <th onClick={() => handleSort('material')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Material {getSortIcon('material')}
                </div>
              </th>
              <th onClick={() => handleSort('tareWeightKg')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Tare Wt (kg) {getSortIcon('tareWeightKg')}
                </div>
              </th>
              <th style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                Dimensions (L x W x H mm)
              </th>
              <th onClick={() => handleSort('maxPayloadKg')} style={{ padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Max Payload (kg) {getSortIcon('maxPayloadKg')}
                </div>
              </th>
              <th style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
            </tr>

            {showColFilters && (
              <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                {['code', 'name', 'material', 'tareWeightKg', 'dims', 'maxPayloadKg'].map(key => (
                  <th key={key} style={{ padding: '3px 6px' }}>
                    {key !== 'dims' ? (
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={colFilters[key] || ''}
                        onChange={e => {
                          setColFilters(prev => ({ ...prev, [key]: e.target.value }));
                          setCurrentPage(1);
                        }}
                        style={{
                          width: '100%',
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    ) : null}
                  </th>
                ))}
                <th style={{ padding: '3px 6px' }} />
              </tr>
            )}
          </thead>

          <tbody>
            {pagedTypes.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <Layers size={28} style={{ opacity: 0.35, margin: '0 auto 8px auto', display: 'block' }} />
                  <div>No pallet types found matching criteria.</div>
                </td>
              </tr>
            ) : (
              pagedTypes.map(pt => (
                <tr
                  key={pt.id}
                  style={{ borderBottom: '1px solid var(--border-default)', transition: 'background-color var(--transition-fast)' }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary-600)' }}>
                    {pt.code}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {pt.name}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge variant="info">
                      {pt.material}
                    </Badge>
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                    {pt.tareWeightKg} kg
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {pt.lengthMm} × {pt.widthMm} × {pt.heightMm}
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-primary-600)' }}>
                    {pt.maxPayloadKg} kg
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => openEdit(pt)}
                        title="Edit Pallet Type"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--color-primary-600)',
                          padding: '3px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(pt)}
                        title="Delete Pallet Type"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#EF4444',
                          padding: '3px 6px',
                          borderRadius: '4px'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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
        <div>Showing {totalRecords === 0 ? 0 : startIndex + 1} to {endIndex} of {totalRecords} pallet types</div>
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

      {/* Add Pallet Type Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Pallet Carrier Type"
        subtitle="Create carrier specification in wes.pallet_type_master"
      >
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Carrier Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EURO_PLT"
                value={newPtCode}
                onChange={e => setNewPtCode(e.target.value.toUpperCase())}
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
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Carrier Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Standard Euro Pallet (EPAL 1)"
                value={newPtName}
                onChange={e => setNewPtName(e.target.value)}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Carrier Material
              </label>
              <select
                value={newPtMaterial}
                onChange={e => setNewPtMaterial(e.target.value as any)}
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
                <option value="WOOD">Wood</option>
                <option value="PLASTIC">Plastic</option>
                <option value="METAL">Metal</option>
                <option value="COMPOSITE">Composite</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Tare Weight (kg) *
              </label>
              <input
                type="number"
                min={1}
                step="0.1"
                required
                value={newPtTareWeight}
                onChange={e => setNewPtTareWeight(parseFloat(e.target.value) || 1)}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Length (mm) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={newPtLength}
                onChange={e => setNewPtLength(parseInt(e.target.value, 10) || 1)}
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
                Width (mm) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={newPtWidth}
                onChange={e => setNewPtWidth(parseInt(e.target.value, 10) || 1)}
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
                Height (mm) *
              </label>
              <input
                type="number"
                min={1}
                required
                value={newPtHeight}
                onChange={e => setNewPtHeight(parseInt(e.target.value, 10) || 1)}
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
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
              Maximum Safe Payload (kg) *
            </label>
            <input
              type="number"
              min={1}
              required
              value={newPtMaxPayload}
              onChange={e => setNewPtMaxPayload(parseInt(e.target.value, 10) || 1)}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Create Pallet Type
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Pallet Type Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Pallet Carrier Type"
        subtitle={`Updating ${editPtCode}`}
      >
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Carrier Code *
              </label>
              <input
                type="text"
                required
                value={editPtCode}
                onChange={e => setEditPtCode(e.target.value.toUpperCase())}
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
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Carrier Name *
              </label>
              <input
                type="text"
                required
                value={editPtName}
                onChange={e => setEditPtName(e.target.value)}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Carrier Material
              </label>
              <select
                value={editPtMaterial}
                onChange={e => setEditPtMaterial(e.target.value as any)}
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
                <option value="WOOD">Wood</option>
                <option value="PLASTIC">Plastic</option>
                <option value="METAL">Metal</option>
                <option value="COMPOSITE">Composite</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Tare Weight (kg)
              </label>
              <input
                type="number"
                min={1}
                step="0.1"
                required
                value={editPtTareWeight}
                onChange={e => setEditPtTareWeight(parseFloat(e.target.value) || 1)}
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
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
                Length (mm)
              </label>
              <input
                type="number"
                min={1}
                required
                value={editPtLength}
                onChange={e => setEditPtLength(parseInt(e.target.value, 10) || 1)}
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
                Width (mm)
              </label>
              <input
                type="number"
                min={1}
                required
                value={editPtWidth}
                onChange={e => setEditPtWidth(parseInt(e.target.value, 10) || 1)}
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
                Height (mm)
              </label>
              <input
                type="number"
                min={1}
                required
                value={editPtHeight}
                onChange={e => setEditPtHeight(parseInt(e.target.value, 10) || 1)}
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
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '3px' }}>
              Maximum Safe Payload (kg)
            </label>
            <input
              type="number"
              min={1}
              required
              value={editPtMaxPayload}
              onChange={e => setEditPtMaxPayload(parseInt(e.target.value, 10) || 1)}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
