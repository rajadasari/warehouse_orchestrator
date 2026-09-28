import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Play,
  Trash2,
  Edit3,
  Zap,
  ZapOff,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  RefreshCw
} from 'lucide-react';
import { networkService } from '../networkService';
import { FunctionalRuleEditor } from './FunctionalRuleEditor';
import type {
  NetworkDeviceChannel,
  DeviceTag,
  FunctionalRule,
  FunctionalRuleExecutionResult
} from '../types';

interface FunctionalSupportPanelProps {
  channel: NetworkDeviceChannel;
}

const TOPOLOGY_LABELS: Record<string, { label: string; badge: string; color: string }> = {
  SINGLE_READ_SINGLE_WRITE: { label: 'Single Read → Single Write', badge: '1:1', color: '#3B82F6' },
  SINGLE_READ_MULTI_WRITE: { label: 'Single Read → Multi Write', badge: '1:N', color: '#8B5CF6' },
  MULTI_READ_MULTI_WRITE: { label: 'Multi Read → Multi Write', badge: 'N:N', color: '#F59E0B' },
  MULTI_READ_SINGLE_WRITE: { label: 'Multi Read → Single Write', badge: 'N:1', color: '#10B981' },
};

export const FunctionalSupportPanel: React.FC<FunctionalSupportPanelProps> = ({ channel }) => {
  const [rules, setRules] = useState<FunctionalRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<FunctionalRule | null>(null);
  const [executionResults, setExecutionResults] = useState<Record<string, FunctionalRuleExecutionResult>>({});
  const [executingRuleId, setExecutingRuleId] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<DeviceTag[]>([]);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await networkService.getRules(channel.id);
      setRules(data);
    } finally {
      setIsLoading(false);
    }
  }, [channel.id]);

  const loadTags = useCallback(async () => {
    const tags = await networkService.syncChannelData(channel.id);
    setAvailableTags(tags);
  }, [channel.id]);

  useEffect(() => {
    loadRules();
    loadTags();
  }, [loadRules, loadTags]);

  const handleSave = useCallback(async (ruleData: Partial<FunctionalRule>) => {
    if (editingRule) {
      const updated = await networkService.updateRule(channel.id, editingRule.id, ruleData);
      if (updated) {
        setRules(prev => prev.map(r => r.id === editingRule.id ? updated : r));
      }
    } else {
      const created = await networkService.createRule(channel.id, ruleData);
      if (created) {
        setRules(prev => [created, ...prev]);
      }
    }
    setShowEditor(false);
    setEditingRule(null);
  }, [channel.id, editingRule]);

  const handleDelete = useCallback(async (ruleId: string) => {
    await networkService.deleteRule(channel.id, ruleId);
    setRules(prev => prev.filter(r => r.id !== ruleId));
  }, [channel.id]);

  const handleExecute = useCallback(async (ruleId: string) => {
    setExecutingRuleId(ruleId);
    try {
      const result = await networkService.executeRule(channel.id, ruleId);
      if (result) {
        setExecutionResults(prev => ({ ...prev, [ruleId]: result }));
        setRules(prev => prev.map(r => r.id === ruleId ? {
          ...r,
          lastExecutedAt: new Date().toISOString(),
          lastExecutionStatus: result.allConditionsPassed ? 'PASSED' : 'CONDITIONS_FAILED'
        } : r));
      }
    } finally {
      setExecutingRuleId(null);
    }
  }, [channel.id]);

  const handleToggleReactive = useCallback(async (rule: FunctionalRule) => {
    const updated = await networkService.toggleReactive(channel.id, rule.id, !rule.isReactive);
    if (updated) {
      setRules(prev => prev.map(r => r.id === rule.id ? updated : r));
    }
  }, [channel.id]);

  const handleEdit = useCallback((rule: FunctionalRule) => {
    setEditingRule(rule);
    setShowEditor(true);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowRightLeft size={16} color="#8B5CF6" />
            Functional Support — Conditional Tag Rules
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Configure read → evaluate → write pipelines with math/string comparison operators.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={loadRules} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border-default)',
            backgroundColor: 'transparent', color: 'var(--text-secondary)', fontSize: '12px',
            fontWeight: 600, cursor: 'pointer', minHeight: '36px',
          }}>
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button type="button" onClick={() => { setEditingRule(null); setShowEditor(true); }} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '6px', border: 'none',
            backgroundColor: '#10B981', color: '#fff', fontSize: '12px',
            fontWeight: 600, cursor: 'pointer', minHeight: '36px',
          }}>
            <Plus size={14} /> New Rule
          </button>
        </div>
      </div>

      {/* Topology Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {Object.entries(TOPOLOGY_LABELS).map(([key, topo]) => {
          const count = rules.filter(r => r.topology === key).length;
          return (
            <div key={key} style={{
              padding: '10px 12px', borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span style={{
                    padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                    backgroundColor: `${topo.color}20`, color: topo.color, border: `1px solid ${topo.color}40`,
                  }}>{topo.badge}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {topo.label}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: '16px', fontWeight: 700, color: topo.color }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Editor (inline) */}
      {showEditor && (
        <FunctionalRuleEditor
          channelId={channel.id}
          editingRule={editingRule}
          availableTags={availableTags}
          onSave={handleSave}
          onCancel={() => { setShowEditor(false); setEditingRule(null); }}
        />
      )}

      {/* Rules List */}
      {rules.length === 0 && !isLoading && !showEditor && (
        <div style={{
          padding: '40px 24px', backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)', borderRadius: '8px',
          textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
        }}>
          <ArrowRightLeft size={36} color="var(--text-secondary)" />
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            No Functional Rules Configured
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '400px' }}>
            Create conditional read/write rules to automate OPC UA tag operations with math and string comparison operators.
          </div>
        </div>
      )}

      {rules.map(rule => {
        const topo = TOPOLOGY_LABELS[rule.topology] ?? TOPOLOGY_LABELS.SINGLE_READ_SINGLE_WRITE;
        const execResult = executionResults[rule.id];
        const isExecuting = executingRuleId === rule.id;

        return (
          <div key={rule.id} style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '10px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            {/* Rule Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
                  backgroundColor: `${topo.color}20`, color: topo.color, border: `1px solid ${topo.color}40`,
                }}>{topo.badge}</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {rule.ruleName}
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '1px' }}>
                    {topo.label}
                    {rule.description ? ` — ${rule.description}` : ''}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Reactive badge */}
                <button
                  type="button"
                  onClick={() => handleToggleReactive(rule)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 10px', borderRadius: '12px',
                    border: `1px solid ${rule.isReactive ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-default)'}`,
                    backgroundColor: rule.isReactive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                    color: rule.isReactive ? '#10B981' : 'var(--text-secondary)',
                    fontSize: '10.5px', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  {rule.isReactive ? <Zap size={11} /> : <ZapOff size={11} />}
                  {rule.isReactive ? 'Reactive' : 'Manual'}
                </button>

                {/* Execution mode badge */}
                {rule.isReactive && (
                  <span style={{
                    padding: '3px 7px', borderRadius: '10px', fontSize: '9.5px', fontWeight: 700,
                    backgroundColor: rule.executionMode === 'ONE_SHOT' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    color: rule.executionMode === 'ONE_SHOT' ? '#8B5CF6' : '#10B981',
                    border: `1px solid ${rule.executionMode === 'ONE_SHOT' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                  }}>
                    {rule.executionMode === 'ONE_SHOT' ? '1-Shot' : 'Continuous'}
                  </span>
                )}

                {/* Status badge */}
                {rule.lastExecutionStatus && (
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600,
                    backgroundColor: rule.lastExecutionStatus === 'PASSED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: rule.lastExecutionStatus === 'PASSED' ? '#10B981' : '#EF4444',
                    border: `1px solid ${rule.lastExecutionStatus === 'PASSED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                  }}>
                    {rule.lastExecutionStatus === 'PASSED' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                    {rule.lastExecutionStatus}
                  </span>
                )}
              </div>
            </div>

            {/* Conditions + Actions Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{
                padding: '10px 12px', borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#3B82F6', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  IF Conditions ({rule.conditions.length})
                </div>
                {rule.conditions.map((cond, idx) => (
                  <div key={idx} style={{
                    fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-primary)',
                    padding: '3px 0',
                    borderBottom: idx < rule.conditions.length - 1 ? '1px dashed var(--border-default)' : 'none',
                  }}>
                    <span style={{ color: '#38BDF8' }}>{cond.sourceNodeId}</span>
                    {' '}
                    <span style={{ color: '#F59E0B', fontWeight: 700 }}>{cond.operator}</span>
                    {' '}
                    <span style={{ color: '#10B981' }}>{cond.thresholdValue}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px', marginLeft: '4px' }}>({cond.thresholdDataType})</span>
                  </div>
                ))}
              </div>

              <div style={{
                padding: '10px 12px', borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#10B981', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  THEN Actions ({rule.actions.length})
                </div>
                {rule.actions.map((act, idx) => (
                  <div key={idx} style={{
                    fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-primary)',
                    padding: '3px 0',
                    borderBottom: idx < rule.actions.length - 1 ? '1px dashed var(--border-default)' : 'none',
                  }}>
                    <span style={{ color: '#38BDF8' }}>{act.targetNodeId}</span>
                    {' ← '}
                    <span style={{ color: '#10B981', fontWeight: 700 }}>{act.writeValue}</span>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px', marginLeft: '4px' }}>({act.writeDataType})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Execution Result (if present) */}
            {execResult && (
              <div style={{
                padding: '10px 12px', borderRadius: '6px',
                backgroundColor: execResult.allConditionsPassed ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                border: `1px solid ${execResult.allConditionsPassed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {execResult.allConditionsPassed
                    ? <CheckCircle2 size={14} color="#10B981" />
                    : <XCircle size={14} color="#EF4444" />}
                  <span style={{
                    fontSize: '12px', fontWeight: 700,
                    color: execResult.allConditionsPassed ? '#10B981' : '#EF4444',
                  }}>
                    {execResult.allConditionsPassed ? 'All Conditions Passed — Writes Executed' : 'Conditions Not Met — No Writes'}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={10} /> {execResult.durationMs}ms
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  {execResult.conditionResults.map((cr, idx) => (
                    <div key={idx} style={{
                      fontFamily: 'monospace', fontSize: '10.5px',
                      color: cr.passed ? '#10B981' : '#EF4444',
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      {cr.passed ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                      {cr.sourceNodeId}: {String(cr.actualValue)} {cr.operator} {String(cr.threshold)}
                    </div>
                  ))}
                </div>
                {execResult.errorMessage && (
                  <div style={{ fontSize: '11px', color: '#EF4444', marginTop: '6px' }}>
                    Error: {execResult.errorMessage}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex', gap: '8px', paddingTop: '8px',
              borderTop: '1px solid var(--border-default)',
            }}>
              <button type="button" onClick={() => handleExecute(rule.id)} disabled={isExecuting} style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px 12px', borderRadius: '6px', border: 'none',
                backgroundColor: '#3B82F6', color: '#fff', fontSize: '12px',
                fontWeight: 600, cursor: isExecuting ? 'wait' : 'pointer',
                opacity: isExecuting ? 0.7 : 1, minHeight: '38px',
              }}>
                <Play size={13} /> {isExecuting ? 'Executing...' : 'Execute Now'}
              </button>
              <button type="button" onClick={() => handleEdit(rule)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '8px 14px', borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)', color: 'var(--text-primary)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer', minHeight: '38px',
              }}>
                <Edit3 size={13} /> Edit
              </button>
              <button type="button" onClick={() => handleDelete(rule.id)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: '38px', height: '38px', borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: 'rgba(239, 68, 68, 0.08)', color: '#EF4444',
                cursor: 'pointer',
              }}>
                <Trash2 size={14} />
              </button>
            </div>

            {/* Last executed timestamp */}
            {rule.lastExecutedAt && (
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={10} /> Last executed: {new Date(rule.lastExecutedAt).toLocaleString()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
