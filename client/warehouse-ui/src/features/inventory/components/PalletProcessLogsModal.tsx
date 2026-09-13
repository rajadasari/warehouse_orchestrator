import React, { useState, useEffect } from 'react';
import { 
  History, 
  Clock, 
  MapPin, 
  Tag, 
  PlusCircle, 
  Trash2, 
  Send, 
  Loader2, 
  Plus 
} from 'lucide-react';
import { 
  masterDataService, 
  PalletInventoryItem, 
  PalletProcessLogItem 
} from '../../../services/masterDataService';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Badge, getStatusBadgeVariant } from '../../../components/common/Badge';

export interface PalletProcessLogsModalProps {
  pallet: PalletInventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onLogRecorded?: () => void;
}

export const PalletProcessLogsModal: React.FC<PalletProcessLogsModalProps> = ({
  pallet,
  isOpen,
  onClose,
  onLogRecorded
}) => {
  const [logs, setLogs] = useState<PalletProcessLogItem[]>([]);
  const [currentPallet, setCurrentPallet] = useState<PalletInventoryItem | null>(pallet);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [stage, setStage] = useState<'SCALE' | 'ROUTED' | 'STORED' | 'DISPATCH' | 'CUSTOM'>('SCALE');
  const [customStage, setCustomStage] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [properties, setProperties] = useState<{ key: string; value: string }[]>([]);

  useEffect(() => {
    setCurrentPallet(pallet);
    if (pallet && isOpen) {
      setLocation(pallet.currentLocation || 'SCALE-01');
      setStatus(pallet.status || 'IN_TRANSIT');
      setStage('SCALE');
      setCustomStage('');
      setNotes('');
      setProperties([]);
      fetchLogs(pallet.id);
    }
  }, [pallet, isOpen]);

  const fetchLogs = async (palletId: string) => {
    setIsLoadingLogs(true);
    try {
      const data = await masterDataService.getPalletProcessLogs(palletId);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load process logs:', err);
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleRecordCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPallet) return;

    const resolvedStage = stage === 'CUSTOM' ? customStage.trim().toUpperCase() : stage;
    if (!resolvedStage) {
      alert('Please specify a Process Stage.');
      return;
    }
    if (resolvedStage.length > 10) {
      alert('Process stage must be 10 characters or less (e.g. INBOUND, SCALE, ROUTED, STORED, DISPATCH).');
      return;
    }

    const propsObj: Record<string, any> = {};
    for (const p of properties) {
      const trimmedKey = p.key.trim();
      if (trimmedKey) {
        let val: any = p.value.trim();
        if (val.toLowerCase() === 'true') val = true;
        else if (val.toLowerCase() === 'false') val = false;
        else if (!isNaN(Number(val)) && val !== '') val = Number(val);
        propsObj[trimmedKey] = val;
      }
    }

    setIsSubmitting(true);
    try {
      const created = await masterDataService.recordPalletProcessLog(currentPallet.id, {
        processStage: resolvedStage,
        location: location.trim() || undefined,
        status: status.trim() || undefined,
        properties: Object.keys(propsObj).length > 0 ? propsObj : undefined,
        notes: notes.trim() || undefined
      });

      setLogs(prev => [created, ...prev]);

      // Update local pallet snapshot
      const updatedPallet = {
        ...currentPallet,
        status: status.trim() || currentPallet.status,
        currentLocation: location.trim() || currentPallet.currentLocation,
        customAttributes: {
          ...(currentPallet.customAttributes || {}),
          ...propsObj
        }
      };
      setCurrentPallet(updatedPallet);

      setProperties([]);
      setNotes('');
      if (onLogRecorded) {
        onLogRecorded();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record process checkpoint');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !currentPallet) return null;

  const stageColors: Record<string, { bg: string; text: string; border: string }> = {
    INBOUND: { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563EB', border: 'rgba(59, 130, 246, 0.3)' },
    SCALE: { bg: 'rgba(245, 158, 11, 0.12)', text: '#D97706', border: 'rgba(245, 158, 11, 0.3)' },
    ROUTED: { bg: 'rgba(139, 92, 246, 0.12)', text: '#7C3AED', border: 'rgba(139, 92, 246, 0.3)' },
    STORED: { bg: 'rgba(16, 185, 129, 0.12)', text: '#059669', border: 'rgba(16, 185, 129, 0.3)' },
    DISPATCH: { bg: 'rgba(14, 165, 233, 0.12)', text: '#0284C7', border: 'rgba(14, 165, 233, 0.3)' }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="860px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="var(--color-primary-600)" />
          <span>Pallet Process Journey &amp; Properties</span>
          <span style={{
            fontFamily: 'monospace',
            fontWeight: 700,
            fontSize: '12px',
            padding: '2px 8px',
            borderRadius: '5px',
            backgroundColor: 'var(--color-primary-600)',
            color: '#FFFFFF'
          }}>
            {currentPallet.palletLpn}
          </span>
        </div>
      }
      subtitle="Track milestones, location changes, and point-in-time custom properties from wes.pallet_process_log"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Active Pallet Overview Card */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '10px',
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-page)',
          border: '1px solid var(--border-default)'
        }}>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Current Status
            </span>
            <div style={{ marginTop: '3px' }}>
              <Badge variant={getStatusBadgeVariant(currentPallet.status)}>
                {currentPallet.status}
              </Badge>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Current Location
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px', fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
              <MapPin size={12} color="var(--color-primary-600)" />
              <span>{currentPallet.currentLocation || 'UNASSIGNED'}</span>
            </div>
          </div>

          <div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Load Type / Cargo
            </span>
            <div style={{ marginTop: '3px', fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
              {currentPallet.loadType || 'MATERIAL_WITH_SKU'}
              {currentPallet.itemName && ` (${currentPallet.itemName})`}
            </div>
          </div>

          <div>
            <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Gross Weight
            </span>
            <div style={{ marginTop: '3px', fontWeight: 600, fontSize: '12px', color: 'var(--text-primary)' }}>
              {currentPallet.actualWeightKg != null ? `${currentPallet.actualWeightKg} kg` : '—'}
            </div>
          </div>
        </div>

        {/* Accumulated Active Properties Snapshot */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '8px',
          backgroundColor: 'rgba(245, 158, 11, 0.04)',
          border: '1px solid rgba(245, 158, 11, 0.20)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={13} color="#D97706" />
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#B45309' }}>
                Active Pallet Properties Snapshot (from wes.pallet.custom_attributes)
              </span>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Accumulated latest state across all journey steps
            </span>
          </div>

          {currentPallet.customAttributes && Object.keys(currentPallet.customAttributes).length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {Object.entries(currentPallet.customAttributes).map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    fontSize: '11px'
                  }}
                >
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#B45309' }}>{k}</span>
                  <span style={{ color: 'var(--border-default)' }}>=</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              No custom properties accumulated yet. Log a checkpoint below to add properties like scale_weight, inspection notes, seal numbers, etc.
            </div>
          )}
        </div>

        {/* Split Layout: Timeline on Left, Checkpoint Logger on Right */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
          {/* Timeline */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: 'var(--bg-page)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid var(--border-default)',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={13} color="var(--color-primary-600)" />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Journey Milestones ({logs.length})
                </span>
              </div>
              {isLoadingLogs && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--color-primary-600)' }} />}
            </div>

            {isLoadingLogs ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
                <Loader2 size={16} className="animate-spin" style={{ margin: '0 auto 6px auto' }} />
                Loading process logs...
              </div>
            ) : logs.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px' }}>
                No process milestones recorded for this pallet yet.
              </div>
            ) : (
              <div style={{
                position: 'relative',
                paddingLeft: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{
                  position: 'absolute',
                  left: '5px',
                  top: '8px',
                  bottom: '8px',
                  width: '2px',
                  backgroundColor: 'var(--border-default)'
                }} />

                {logs.map((log, idx) => {
                  const color = stageColors[log.processStage] || {
                    bg: 'var(--bg-surface-subtle)',
                    text: 'var(--text-primary)',
                    border: 'var(--border-default)'
                  };

                  return (
                    <div key={log.id || idx} style={{ position: 'relative' }}>
                      <div style={{
                        position: 'absolute',
                        left: '-16px',
                        top: '4px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: color.text,
                        border: '2px solid var(--bg-surface)',
                        boxShadow: '0 0 0 1px var(--border-default)'
                      }} />

                      <div style={{
                        padding: '8px 10px',
                        borderRadius: '7px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-default)',
                        fontSize: '11px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                          <span style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '10.5px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: color.bg,
                            color: color.text,
                            border: `1px solid ${color.border}`
                          }}>
                            {log.processStage}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Just now'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10.5px', color: 'var(--text-secondary)' }}>
                          {log.location && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                              <MapPin size={10} />
                              {log.location}
                            </span>
                          )}
                          {log.status && (
                            <span style={{
                              fontSize: '9.5px',
                              fontWeight: 600,
                              padding: '1px 5px',
                              borderRadius: '3px',
                              backgroundColor: 'var(--bg-surface-subtle)',
                              color: 'var(--text-primary)'
                            }}>
                              {log.status}
                            </span>
                          )}
                        </div>

                        {log.notes && (
                          <div style={{ fontSize: '10.5px', color: 'var(--text-primary)', fontStyle: 'italic', marginTop: '2px' }}>
                            &quot;{log.notes}&quot;
                          </div>
                        )}

                        {log.propertiesSnapshot && Object.keys(log.propertiesSnapshot).length > 0 && (
                          <div style={{
                            marginTop: '4px',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-surface-subtle)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '4px'
                          }}>
                            {Object.entries(log.propertiesSnapshot).map(([k, v]) => (
                              <span key={k} style={{
                                fontSize: '9.5px',
                                fontFamily: 'monospace',
                                color: 'var(--text-primary)'
                              }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{k}:</span>{' '}
                                <b>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</b>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Form to Log Next Checkpoint */}
          <div style={{
            backgroundColor: 'var(--bg-page)',
            padding: '14px',
            borderRadius: '10px',
            border: '1px solid var(--border-default)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <PlusCircle size={14} color="#16A34A" />
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Log Next Process Checkpoint
              </span>
            </div>

            <form onSubmit={handleRecordCheckpoint} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Process Stage (VARCHAR(10)) *
                </label>
                <select
                  value={stage}
                  onChange={e => setStage(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '11.5px',
                    outline: 'none'
                  }}
                >
                  <option value="SCALE">SCALE (Dimension &amp; Weight Check)</option>
                  <option value="ROUTED">ROUTED (Conveyor Junction)</option>
                  <option value="STORED">STORED (ASRS Rack Location)</option>
                  <option value="DISPATCH">DISPATCH (Outbound Staging)</option>
                  <option value="CUSTOM">Custom Code (&lt;=10 chars)</option>
                </select>

                {stage === 'CUSTOM' && (
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. AUDIT, WRAP"
                    value={customStage}
                    onChange={e => setCustomStage(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      marginTop: '4px',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. SCALE-01"
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                    Status
                  </label>
                  <input
                    type="text"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    placeholder="e.g. IN_TRANSIT"
                    style={{
                      width: '100%',
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '11px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '3px' }}>
                  Milestone Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Scale reading verified; within tolerance"
                  style={{
                    width: '100%',
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Add Stage Properties (JSONB)
                  </label>
                  <button
                    type="button"
                    onClick={() => setProperties(prev => [...prev, { key: '', value: '' }])}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '10.5px',
                      color: 'var(--color-primary-600)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      padding: '2px 4px'
                    }}
                  >
                    <Plus size={11} />
                    <span>Add Property</span>
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {properties.map((prop, pIdx) => (
                    <div key={pIdx} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="text"
                        placeholder="Property (e.g. scale_kg)"
                        value={prop.key}
                        onChange={e => {
                          const val = e.target.value;
                          setProperties(prev => prev.map((item, i) => i === pIdx ? { ...item, key: val } : item));
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '10.5px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Value (e.g. 1045.2)"
                        value={prop.value}
                        onChange={e => {
                          const val = e.target.value;
                          setProperties(prev => prev.map((item, i) => i === pIdx ? { ...item, value: val } : item));
                        }}
                        style={{
                          flex: 1,
                          padding: '4px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-primary)',
                          fontSize: '10.5px',
                          fontFamily: 'monospace'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setProperties(prev => prev.filter((_, i) => i !== pIdx))}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-secondary)',
                          padding: '2px'
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {properties.length === 0 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-disabled)', fontStyle: 'italic' }}>
                      Optional: Click &quot;+ Add Property&quot; to append stage-specific properties (e.g. scanner_result, scale_kg, bay_id).
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                variant="success"
                size="sm"
                isLoading={isSubmitting}
                leftIcon={<Send size={13} />}
                style={{ marginTop: '4px' }}
              >
                Record Checkpoint &amp; Merge Properties
              </Button>
            </form>
          </div>
        </div>
      </div>
    </Modal>
  );
};
