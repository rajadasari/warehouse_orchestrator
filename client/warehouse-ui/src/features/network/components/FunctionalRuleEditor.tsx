import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  Search,
  Tag
} from 'lucide-react';
import type {
  RuleTopology,
  ComparisonOperator,
  FunctionalRuleCondition,
  FunctionalRuleAction,
  FunctionalRule,
  DeviceTag,
  ThresholdDataType
} from '../types';

// --- Props ---

interface FunctionalRuleEditorProps {
  channelId: string;
  editingRule: FunctionalRule | null;
  availableTags: DeviceTag[];
  onSave: (ruleData: Partial<FunctionalRule>) => void;
  onCancel: () => void;
}

// --- Searchable Tag Dropdown ---

interface SearchableTagSelectProps {
  tags: DeviceTag[];
  selectedNodeId: string;
  onSelect: (nodeId: string, dataType: string) => void;
  placeholder?: string;
}

const SearchableTagSelect: React.FC<SearchableTagSelectProps> = ({
  tags,
  selectedNodeId,
  onSelect,
  placeholder = 'Search and select a tag…',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags;
    const q = search.toLowerCase();
    return tags.filter(t =>
      t.nodeId.toLowerCase().includes(q)
      || t.name.toLowerCase().includes(q)
      || t.folder.toLowerCase().includes(q)
    );
  }, [tags, search]);

  const selectedTag = useMemo(() => tags.find(t => t.nodeId === selectedNodeId), [tags, selectedNodeId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    setSearch('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSelect = (tag: DeviceTag) => {
    onSelect(tag.nodeId, tag.dataType);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        style={{
          width: '100%',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          color: selectedTag ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontSize: '11.5px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '6px',
          minHeight: '36px',
          textAlign: 'left',
          outline: 'none',
        }}
      >
        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedTag ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={11} color="#3B82F6" />
              <span>{selectedTag.name}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>({selectedTag.nodeId})</span>
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </div>
        <ChevronDown size={13} color="var(--text-secondary)" />
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 999,
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          maxHeight: '280px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Search input */}
          <div style={{
            padding: '8px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <Search size={13} color="var(--text-secondary)" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by name, nodeId, or folder…"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ overflowY: 'auto', maxHeight: '230px' }}>
            {filteredTags.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                No tags found matching "{search}"
              </div>
            ) : (
              filteredTags.map(tag => (
                <button
                  key={tag.nodeId}
                  type="button"
                  onClick={() => handleSelect(tag)}
                  style={{
                    width: '100%',
                    padding: '7px 10px',
                    border: 'none',
                    backgroundColor: tag.nodeId === selectedNodeId ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    textAlign: 'left',
                    borderBottom: '1px solid var(--border-default)',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => { if (tag.nodeId !== selectedNodeId) e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)'; }}
                  onMouseLeave={e => { if (tag.nodeId !== selectedNodeId) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Tag size={12} color={tag.nodeId === selectedNodeId ? '#3B82F6' : 'var(--text-secondary)'} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {tag.name}
                    </div>
                    <div style={{
                      fontSize: '10px', color: 'var(--text-secondary)',
                      fontFamily: 'monospace',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {tag.nodeId}
                    </div>
                  </div>
                  <span style={{ fontSize: '9.5px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {tag.folder}
                  </span>
                  <span style={{
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontSize: '9px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    color: '#8B5CF6',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    whiteSpace: 'nowrap',
                  }}>
                    {tag.dataType}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// --- Data Type Info Badge ---

const DataTypeBadge: React.FC<{ dataType: string }> = ({ dataType }) => (
  <span style={{
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 700,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    color: '#8B5CF6',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    whiteSpace: 'nowrap',
    minHeight: '26px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    letterSpacing: '0.3px',
  }}>
    {dataType || '—'}
  </span>
);

// --- Constants ---

const TOPOLOGIES: { value: RuleTopology; label: string; desc: string }[] = [
  { value: 'SINGLE_READ_SINGLE_WRITE', label: '1:1 — Single Read → Single Write', desc: 'Read one tag, evaluate, write one tag' },
  { value: 'SINGLE_READ_MULTI_WRITE', label: '1:N — Single Read → Multi Write', desc: 'Read one tag, evaluate, write to multiple tags' },
  { value: 'MULTI_READ_MULTI_WRITE', label: 'N:N — Multi Read → Multi Write', desc: 'Read multiple tags (AND), write to multiple tags' },
  { value: 'MULTI_READ_SINGLE_WRITE', label: 'N:1 — Multi Read → Single Write', desc: 'Read multiple tags (AND), write to one tag' },
];

const NUMERIC_OPS: { value: ComparisonOperator; label: string; symbol: string }[] = [
  { value: 'EQUALS', label: 'Equals', symbol: '==' },
  { value: 'NOT_EQUALS', label: 'Not Equals', symbol: '!=' },
  { value: 'GREATER_THAN', label: 'Greater Than', symbol: '>' },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Greater or Equal', symbol: '>=' },
  { value: 'LESS_THAN', label: 'Less Than', symbol: '<' },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Less or Equal', symbol: '<=' },
];

const STRING_OPS: { value: ComparisonOperator; label: string }[] = [
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'STARTS_WITH', label: 'Starts With' },
  { value: 'ENDS_WITH', label: 'Ends With' },
  { value: 'REGEX_MATCH', label: 'Regex Match' },
];

const ALL_OPS = [...NUMERIC_OPS.map(o => ({ value: o.value, label: `${o.symbol}  ${o.label}` })), ...STRING_OPS];

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: '6px',
  border: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  fontSize: '12.5px',
  fontFamily: 'inherit',
  outline: 'none',
  minHeight: '36px',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none' as const,
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  marginBottom: '4px',
  display: 'block',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
};

/** Maps OPC UA data types to the persistence threshold data type */
function mapOpcDataType(opcType: string): ThresholdDataType {
  const upper = (opcType ?? '').toUpperCase();
  if (upper === 'BOOLEAN') return 'BOOLEAN';
  if (upper === 'INT16' || upper === 'INT32') return 'INTEGER';
  if (upper === 'INT64') return 'LONG';
  if (upper === 'FLOAT') return 'FLOAT';
  if (upper === 'DOUBLE') return 'DOUBLE';
  return 'STRING';
}

const emptyCondition = (): FunctionalRuleCondition => ({
  sourceNodeId: '',
  operator: 'EQUALS',
  thresholdValue: '',
  thresholdDataType: 'STRING',
});

const emptyAction = (): FunctionalRuleAction => ({
  targetNodeId: '',
  writeValue: '',
  writeDataType: 'STRING',
});

// --- Main Editor Component ---

export const FunctionalRuleEditor: React.FC<FunctionalRuleEditorProps> = ({
  editingRule,
  availableTags,
  onSave,
  onCancel,
}) => {
  const [ruleName, setRuleName] = useState('');
  const [topology, setTopology] = useState<RuleTopology>('SINGLE_READ_SINGLE_WRITE');
  const [description, setDescription] = useState('');
  const [isReactive, setIsReactive] = useState(false);
  const [executionMode, setExecutionMode] = useState<'CONTINUOUS' | 'ONE_SHOT'>('CONTINUOUS');
  const [conditions, setConditions] = useState<FunctionalRuleCondition[]>([emptyCondition()]);
  const [actions, setActions] = useState<FunctionalRuleAction[]>([emptyAction()]);

  useEffect(() => {
    if (editingRule) {
      setRuleName(editingRule.ruleName);
      setTopology(editingRule.topology);
      setDescription(editingRule.description ?? '');
      setIsReactive(editingRule.isReactive);
      setExecutionMode(editingRule.executionMode ?? 'CONTINUOUS');
      setConditions(editingRule.conditions.length > 0 ? editingRule.conditions : [emptyCondition()]);
      setActions(editingRule.actions.length > 0 ? editingRule.actions : [emptyAction()]);
    }
  }, [editingRule]);

  const isSingleRead = topology === 'SINGLE_READ_SINGLE_WRITE' || topology === 'SINGLE_READ_MULTI_WRITE';
  const isSingleWrite = topology === 'SINGLE_READ_SINGLE_WRITE' || topology === 'MULTI_READ_SINGLE_WRITE';

  /** Resolves the OPC UA data type for a given nodeId from browsed tags */
  const resolveDataType = useCallback((nodeId: string): string => {
    const tag = availableTags.find(t => t.nodeId === nodeId);
    return tag?.dataType ?? 'Variant';
  }, [availableTags]);

  const handleConditionTagSelect = useCallback((idx: number, nodeId: string, dataType: string) => {
    setConditions(prev => prev.map((c, i) => i === idx
      ? { ...c, sourceNodeId: nodeId, thresholdDataType: mapOpcDataType(dataType) }
      : c
    ));
  }, []);

  const handleActionTagSelect = useCallback((idx: number, nodeId: string, dataType: string) => {
    setActions(prev => prev.map((a, i) => i === idx
      ? { ...a, targetNodeId: nodeId, writeDataType: mapOpcDataType(dataType) }
      : a
    ));
  }, []);

  const updateConditionField = useCallback((idx: number, field: keyof FunctionalRuleCondition, value: string) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  }, []);

  const updateActionField = useCallback((idx: number, field: keyof FunctionalRuleAction, value: string) => {
    setActions(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  }, []);

  const addCondition = useCallback(() => {
    if (!isSingleRead) setConditions(prev => [...prev, emptyCondition()]);
  }, [isSingleRead]);

  const addAction = useCallback(() => {
    if (!isSingleWrite) setActions(prev => [...prev, emptyAction()]);
  }, [isSingleWrite]);

  const removeCondition = useCallback((idx: number) => {
    setConditions(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }, []);

  const removeAction = useCallback((idx: number) => {
    setActions(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  }, []);

  const handleTopologyChange = useCallback((newTopo: RuleTopology) => {
    setTopology(newTopo);
    const sr = newTopo === 'SINGLE_READ_SINGLE_WRITE' || newTopo === 'SINGLE_READ_MULTI_WRITE';
    const sw = newTopo === 'SINGLE_READ_SINGLE_WRITE' || newTopo === 'MULTI_READ_SINGLE_WRITE';
    if (sr) setConditions(prev => [prev[0] ?? emptyCondition()]);
    if (sw) setActions(prev => [prev[0] ?? emptyAction()]);
  }, []);

  const handleSave = () => {
    const valid = ruleName.trim()
      && conditions.every(c => c.sourceNodeId.trim() && c.thresholdValue.trim())
      && actions.every(a => a.targetNodeId.trim() && a.writeValue.trim());
    if (!valid) return;

    onSave({
      ruleName: ruleName.trim(),
      topology,
      description: description.trim() || undefined,
      isReactive,
      executionMode,
      isEnabled: true,
      conditions,
      actions,
    });
  };

  const selectedTopo = TOPOLOGIES.find(t => t.value === topology);

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border-default)',
      borderRadius: '10px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '18px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {editingRule ? 'Edit Functional Rule' : 'New Functional Rule'}
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={onCancel} style={{
            padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-default)',
            backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '12px',
            fontWeight: 600, cursor: 'pointer', minHeight: '36px',
          }}>Cancel</button>
          <button type="button" onClick={handleSave} style={{
            padding: '6px 14px', borderRadius: '6px', border: 'none',
            backgroundColor: '#10B981', color: '#fff', fontSize: '12px',
            fontWeight: 600, cursor: 'pointer', minHeight: '36px',
          }}>{editingRule ? 'Update Rule' : 'Create Rule'}</button>
        </div>
      </div>

      {/* Rule Name + Topology */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Rule Name</label>
          <input
            type="text"
            value={ruleName}
            onChange={e => setRuleName(e.target.value)}
            placeholder="e.g. Temperature Protection"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>Topology</label>
          <div style={{ position: 'relative' }}>
            <select
              value={topology}
              onChange={e => handleTopologyChange(e.target.value as RuleTopology)}
              style={selectStyle}
            >
              {TOPOLOGIES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
          </div>
          {selectedTopo && (
            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '3px' }}>
              {selectedTopo.desc}
            </div>
          )}
        </div>
      </div>

      {/* Description + Reactive */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', alignItems: 'start' }}>
        <div>
          <label style={labelStyle}>Description</label>
          <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
            padding: '8px 12px', borderRadius: '6px',
            backgroundColor: isReactive ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface-subtle)',
            border: `1px solid ${isReactive ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-default)'}`,
            minHeight: '36px',
          }}>
            <input type="checkbox" checked={isReactive} onChange={e => setIsReactive(e.target.checked)} style={{ accentColor: '#10B981' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: isReactive ? '#10B981' : 'var(--text-secondary)' }}>
              Reactive (Auto-trigger)
            </span>
          </label>
          {isReactive && (
            <div style={{
              display: 'flex', gap: '6px', backgroundColor: 'var(--bg-surface-subtle)',
              padding: '3px', borderRadius: '6px', border: '1px solid var(--border-default)'
            }}>
              <button
                type="button"
                onClick={() => setExecutionMode('CONTINUOUS')}
                style={{
                  flex: 1, padding: '4px 8px', borderRadius: '4px', border: 'none',
                  fontSize: '10.5px', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: executionMode === 'CONTINUOUS' ? '#10B981' : 'transparent',
                  color: executionMode === 'CONTINUOUS' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'background 0.15s',
                }}
              >
                Continuous
              </button>
              <button
                type="button"
                onClick={() => setExecutionMode('ONE_SHOT')}
                style={{
                  flex: 1, padding: '4px 8px', borderRadius: '4px', border: 'none',
                  fontSize: '10.5px', fontWeight: 600, cursor: 'pointer',
                  backgroundColor: executionMode === 'ONE_SHOT' ? '#8B5CF6' : 'transparent',
                  color: executionMode === 'ONE_SHOT' ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'background 0.15s',
                }}
              >
                One-Time
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Available Tags Indicator */}
      <div style={{
        padding: '6px 10px', borderRadius: '6px',
        backgroundColor: availableTags.length > 0 ? 'rgba(59, 130, 246, 0.06)' : 'rgba(245, 158, 11, 0.06)',
        border: `1px solid ${availableTags.length > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)'}`,
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '10.5px', color: availableTags.length > 0 ? '#3B82F6' : '#F59E0B', fontWeight: 600,
      }}>
        <Tag size={11} />
        {availableTags.length > 0
          ? `${availableTags.length} browsed tags available for selection`
          : 'No browsed tags — click Sync on the Live Tag Explorer tab first'}
      </div>

      {/* Conditions Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ ...labelStyle, marginBottom: 0, color: '#3B82F6' }}>
            IF Conditions (Read Source Tags) — {isSingleRead ? 'Single' : 'Multi'} Read
          </label>
          {!isSingleRead && (
            <button type="button" onClick={addCondition} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-default)',
              backgroundColor: 'transparent', color: '#3B82F6', fontSize: '11px',
              fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={12} /> Add Condition
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {conditions.map((cond, idx) => (
            <div key={idx} style={{
              padding: '10px 12px',
              backgroundColor: 'var(--bg-surface-subtle)',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {/* Row 1: Tag select + data type badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <SearchableTagSelect
                    tags={availableTags}
                    selectedNodeId={cond.sourceNodeId}
                    onSelect={(nodeId, dt) => handleConditionTagSelect(idx, nodeId, dt)}
                    placeholder="Select source tag…"
                  />
                </div>
                <DataTypeBadge dataType={cond.sourceNodeId ? resolveDataType(cond.sourceNodeId) : ''} />
                {conditions.length > 1 && (
                  <button type="button" onClick={() => removeCondition(idx)} style={{
                    width: '32px', height: '32px', borderRadius: '6px', border: 'none',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {/* Row 2: Operator + Threshold value */}
              <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <select
                    value={cond.operator}
                    onChange={e => updateConditionField(idx, 'operator', e.target.value)}
                    style={{ ...selectStyle, fontSize: '11.5px' }}
                  >
                    {ALL_OPS.map(op => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
                </div>
                <input
                  type="text"
                  value={cond.thresholdValue}
                  onChange={e => updateConditionField(idx, 'thresholdValue', e.target.value)}
                  placeholder="Threshold value (e.g. 75.0, true, RUNNING)"
                  style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11.5px' }}
                />
              </div>
            </div>
          ))}
        </div>
        {conditions.length > 1 && (
          <div style={{ marginTop: '4px', fontSize: '10px', color: '#F59E0B', fontWeight: 600 }}>
            All conditions must pass (AND logic)
          </div>
        )}
      </div>

      {/* Actions Section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ ...labelStyle, marginBottom: 0, color: '#10B981' }}>
            THEN Actions (Write Target Tags) — {isSingleWrite ? 'Single' : 'Multi'} Write
          </label>
          {!isSingleWrite && (
            <button type="button" onClick={addAction} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--border-default)',
              backgroundColor: 'transparent', color: '#10B981', fontSize: '11px',
              fontWeight: 600, cursor: 'pointer',
            }}>
              <Plus size={12} /> Add Action
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {actions.map((act, idx) => (
            <div key={idx} style={{
              padding: '10px 12px',
              backgroundColor: 'var(--bg-surface-subtle)',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {/* Row 1: Tag select + data type badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <SearchableTagSelect
                    tags={availableTags.filter(t => t.writable)}
                    selectedNodeId={act.targetNodeId}
                    onSelect={(nodeId, dt) => handleActionTagSelect(idx, nodeId, dt)}
                    placeholder="Select target tag (writable only)…"
                  />
                </div>
                <DataTypeBadge dataType={act.targetNodeId ? resolveDataType(act.targetNodeId) : ''} />
                {actions.length > 1 && (
                  <button type="button" onClick={() => removeAction(idx)} style={{
                    width: '32px', height: '32px', borderRadius: '6px', border: 'none',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {/* Row 2: Write value */}
              <input
                type="text"
                value={act.writeValue}
                onChange={e => updateActionField(idx, 'writeValue', e.target.value)}
                placeholder="Value to write (e.g. true, 0, STOP)"
                style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '11.5px' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
