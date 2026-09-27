import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Terminal, 
  Play, 
  Search
} from 'lucide-react';
import { RuleSubscriptionItem } from '../types/resourceManagerTypes';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { Modal } from '../../../components/common/Modal';

const DEFAULT_RULES: RuleSubscriptionItem[] = [
  {
    subscriptionId: 'SUB_UPS_BARCODE',
    targetResourceId: 'CONVEYOR_DIVERTER_01',
    propertyName: 'lastScannedBarcode',
    predicateType: 'REGEX_MATCH',
    thresholdOrPattern: '^1Z[0-9A-Z]{16}$',
    actionType: 'METHOD_INVOCATION',
    actionTarget: 'divertToExpressLane()',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    subscriptionId: 'SUB_LOW_BATTERY_AMR',
    targetResourceId: 'AMR_FLEET_04',
    propertyName: 'stateOfChargePct',
    predicateType: 'NUMERIC_LT',
    thresholdOrPattern: '20.0',
    actionType: 'METHOD_INVOCATION',
    actionTarget: 'requestDocking()',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    subscriptionId: 'SUB_CRITICAL_TEMP_ABORT',
    targetResourceId: 'ASRS_CRANE_MAIN',
    propertyName: 'bearingTemperatureC',
    predicateType: 'NUMERIC_GTE',
    thresholdOrPattern: '75.0',
    actionType: 'STATE_TRIGGER',
    actionTarget: 'PackML.ABORT',
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    subscriptionId: 'SUB_PLC_FAULT_TRAP',
    targetResourceId: 'PALLET_CONVEYOR_4',
    propertyName: 'activeFaultCode',
    predicateType: 'REGEX_MATCH',
    thresholdOrPattern: '^E-(FATAL|ESTOP)-.*$',
    actionType: 'ALERT_EVENT',
    actionTarget: 'sounderBeaconAlert()',
    active: true,
    createdAt: new Date().toISOString()
  }
];

export const ResourceRulesTab: React.FC = () => {
  const [rules, setRules] = useState<RuleSubscriptionItem[]>(DEFAULT_RULES);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Regex Sandbox / Test states
  const [testPattern, setTestPattern] = useState('^1Z[0-9A-Z]{16}$');
  const [testInput, setTestInput] = useState('1Z9999999999999999');
  const [testResult, setTestResult] = useState<boolean | null>(null);

  // Form states for creating a rule
  const [subId, setSubId] = useState('');
  const [targetResource, setTargetResource] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [predicateType, setPredicateType] = useState<RuleSubscriptionItem['predicateType']>('REGEX_MATCH');
  const [patternVal, setPatternVal] = useState('');
  const [actionTarget, setActionTarget] = useState('');

  const filteredRules = rules.filter(r => 
    r.subscriptionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.propertyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.targetResourceId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTestRegex = () => {
    try {
      const reg = new RegExp(testPattern);
      setTestResult(reg.test(testInput));
    } catch {
      setTestResult(false);
    }
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subId.trim() || !propertyName.trim() || !patternVal.trim()) return;

    const newRule: RuleSubscriptionItem = {
      subscriptionId: subId.trim().toUpperCase(),
      targetResourceId: targetResource.trim() || undefined,
      propertyName: propertyName.trim(),
      predicateType,
      thresholdOrPattern: patternVal.trim(),
      actionType: 'METHOD_INVOCATION',
      actionTarget: actionTarget.trim() || 'logAlert()',
      active: true,
      createdAt: new Date().toISOString()
    };

    setRules([newRule, ...rules]);
    setSubId('');
    setTargetResource('');
    setPropertyName('');
    setPatternVal('');
    setActionTarget('');
    setIsCreateModalOpen(false);
  };

  const toggleRuleActive = (id: string) => {
    setRules(rules.map(r => r.subscriptionId === id ? { ...r, active: !r.active } : r));
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(r => r.subscriptionId !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', boxSizing: 'border-box' }}>
      {/* Top Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Reactive Rule Subscriptions
            </h2>
            <Badge variant="success">{rules.filter(r => r.active).length} Active</Badge>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Deterministic sub-microsecond predicate evaluations triggering PackML transitions, remote methods, or emergency alerts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '32px', height: '36px', fontSize: '12px', width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handleTestRegex();
              setIsTestModalOpen(true);
            }}
            leftIcon={<Terminal size={14} color="#38bdf8" />}
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            Regex Sandbox
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus size={14} />}
            style={{ minHeight: '48px', minWidth: '48px' }}
          >
            Add Rule
          </Button>
        </div>
      </div>

      {/* Rules Table */}
      <div style={{
        backgroundColor: 'var(--card-bg, #1e293b)',
        border: '1px solid var(--border-color, #334155)',
        borderRadius: '8px',
        overflow: 'hidden',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ overflowX: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                <th style={{ padding: '10px 14px' }}>Subscription ID</th>
                <th style={{ padding: '10px 14px' }}>Target Resource</th>
                <th style={{ padding: '10px 14px' }}>Property</th>
                <th style={{ padding: '10px 14px' }}>Predicate</th>
                <th style={{ padding: '10px 14px' }}>Threshold / Regex</th>
                <th style={{ padding: '10px 14px' }}>Action Dispatched</th>
                <th style={{ padding: '10px 14px' }}>Status</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRules.map(rule => (
                <tr key={rule.subscriptionId} style={{ borderBottom: '1px solid #334155', color: '#f8fafc' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, fontFamily: 'monospace' }}>
                    {rule.subscriptionId}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#93c5fd' }}>
                    {rule.targetResourceId || <span style={{ color: '#fbbf24' }}>* (All Resources)</span>}
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#38bdf8' }}>
                    {rule.propertyName}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      fontSize: '11px',
                      backgroundColor: '#334155',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700
                    }}>
                      {rule.predicateType}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#a7f3d0' }}>
                    {rule.thresholdOrPattern}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>
                    <span style={{ color: '#c084fc' }}>{rule.actionType}:</span> {rule.actionTarget}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button
                      type="button"
                      onClick={() => toggleRuleActive(rule.subscriptionId)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: rule.active ? '#10b981' : '#64748b',
                        fontWeight: 600,
                        fontSize: '12px'
                      }}
                    >
                      {rule.active ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                      {rule.active ? 'ACTIVE' : 'MUTED'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.subscriptionId)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '6px',
                        minWidth: '48px',
                        minHeight: '48px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Delete Rule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRules.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                    No matching rules found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Regex Sandbox Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="Industrial Regex & Predicate Sandbox"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
            Test regular expressions for barcode parsing, SKU masks, or PLC fault strings before deploying live rules.
          </p>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Compiled Regex Pattern</label>
            <input
              type="text"
              className="form-input"
              value={testPattern}
              onChange={(e) => setTestPattern(e.target.value)}
              style={{ width: '100%', height: '36px', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Sample Input Value</label>
            <input
              type="text"
              className="form-input"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              style={{ width: '100%', height: '36px', fontFamily: 'monospace', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
            <Button variant="primary" size="sm" onClick={handleTestRegex} leftIcon={<Play size={14} />}>
              Evaluate Expression
            </Button>

            {testResult !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700 }}>Result:</span>
                {testResult ? (
                  <Badge variant="success">MATCH CONFIRMED (TRUE)</Badge>
                ) : (
                  <Badge variant="danger">NO MATCH (FALSE)</Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Create Rule Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Reactive Rule Subscription"
      >
        <form onSubmit={handleCreateRule} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Subscription ID</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. SUB_CARTON_ROUTING"
              value={subId}
              onChange={(e) => setSubId(e.target.value)}
              style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Target Resource (Optional, leave blank for wildcard)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. CONVEYOR_DIVERTER_01"
              value={targetResource}
              onChange={(e) => setTargetResource(e.target.value)}
              style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Property Name</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. lastScannedBarcode"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Predicate Type</label>
            <select
              className="form-input"
              value={predicateType}
              onChange={(e) => setPredicateType(e.target.value as RuleSubscriptionItem['predicateType'])}
              style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
            >
              <option value="REGEX_MATCH">REGEX_MATCH (Pattern Matching)</option>
              <option value="NUMERIC_LT">NUMERIC_LT (&lt; Less Than)</option>
              <option value="NUMERIC_LTE">NUMERIC_LTE (&le; Less Than or Equal)</option>
              <option value="NUMERIC_GT">NUMERIC_GT (&gt; Greater Than)</option>
              <option value="NUMERIC_GTE">NUMERIC_GTE (&ge; Greater Than or Equal)</option>
              <option value="NUMERIC_EQ">NUMERIC_EQ (== Numeric Equal)</option>
              <option value="EXACT_MATCH">EXACT_MATCH (String / Boolean Match)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Threshold / Regex Pattern</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. ^1Z[0-9A-Z]{16}$ or 20.0"
              value={patternVal}
              onChange={(e) => setPatternVal(e.target.value)}
              style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Action Target / Method</label>
            <input
              type="text"
              required
              className="form-input"
              placeholder="e.g. divertToExpress() or PackML.ABORT"
              value={actionTarget}
              onChange={(e) => setActionTarget(e.target.value)}
              style={{ width: '100%', height: '36px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit">Deploy Rule</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
