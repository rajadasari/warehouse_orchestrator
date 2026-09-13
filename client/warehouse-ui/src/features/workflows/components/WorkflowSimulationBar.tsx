import React, { useState } from 'react';
import { 
  Play, 
  Hourglass, 
  CheckCircle2, 
  AlertCircle, 
  ListTree, 
  Send, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { 
  workflowService, 
  WorkflowInstanceItem 
} from '../../../services/workflowService';

interface WorkflowSimulationBarProps {
  workflowCode: string;
  onExecutionUpdated: (instance: WorkflowInstanceItem) => void;
  onOpenLogModal: (instanceId: string) => void;
  currentInstance: WorkflowInstanceItem | null;
  onBeforeTrigger?: () => Promise<void>;
}

export const WorkflowSimulationBar: React.FC<WorkflowSimulationBarProps> = ({
  workflowCode,
  onExecutionUpdated,
  onOpenLogModal,
  currentInstance,
  onBeforeTrigger
}) => {
  const [palletLpn, setPalletLpn] = useState('PLT-AUTO-1001');
  const [sku, setSku] = useState('SKU-AMBIENT-01');
  const [quantity, setQuantity] = useState(24);
  const [isRunning, setIsRunning] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunSimulation = async () => {
    setIsRunning(true);
    setErrorMsg(null);
    try {
      if (onBeforeTrigger) {
        await onBeforeTrigger();
      }
      const res = await workflowService.triggerWorkflow({
        workflowCode,
        entityReference: palletLpn.trim(),
        initialContext: {
          palletLpn: palletLpn.trim(),
          sku: sku.trim(),
          quantity: Number(quantity),
          sourceLocation: 'INBOUND-CONVEYOR-01',
          scanTimestamp: new Date().toISOString()
        }
      });
      onExecutionUpdated(res);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Workflow trigger failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleQuickResume = async () => {
    if (!currentInstance?.correlationKey) return;
    setIsResuming(true);
    setErrorMsg(null);
    try {
      const res = await workflowService.resumeCallback(currentInstance.correlationKey, {
        wmsStatus: 'STORED',
        allocatedAisle: 'AISLE-B-02',
        allocatedShelf: 'SHELF-04',
        confirmationTimestamp: new Date().toISOString()
      });
      onExecutionUpdated(res);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Callback resume failed');
    } finally {
      setIsResuming(false);
    }
  };

  return (
    <div style={{
      height: '60px',
      minHeight: '60px',
      backgroundColor: '#0b1120',
      borderTop: '1px solid #1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      gap: '16px',
      userSelect: 'none',
      zIndex: 40
    }}>
      {/* Simulation Inputs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} color="#38bdf8" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Live Simulator:
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8' }}>Pallet LPN:</label>
          <input
            type="text"
            value={palletLpn}
            onChange={(e) => setPalletLpn(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8' }}>SKU:</label>
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            style={{ ...inputStyle, width: '130px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8' }}>Qty:</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            style={{ ...inputStyle, width: '60px' }}
          />
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isRunning}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            fontSize: '12px',
            fontWeight: 700,
            cursor: isRunning ? 'not-allowed' : 'pointer',
            minHeight: '48px',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
          }}
        >
          {isRunning ? (
            <>
              <RefreshCw size={14} className="animate-spin" /> Running...
            </>
          ) : (
            <>
              <Play size={14} /> Run Simulation
            </>
          )}
        </button>
      </div>

      {/* Execution Status & Callback Action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {errorMsg && (
          <span style={{ fontSize: '11.5px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={14} /> {errorMsg}
          </span>
        )}

        {currentInstance && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Instance:</span>
              <span style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: currentInstance.status === 'COMPLETED'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : currentInstance.status === 'WAITING_CALLBACK'
                    ? 'rgba(245, 158, 11, 0.2)'
                    : currentInstance.status === 'FAILED'
                      ? 'rgba(239, 68, 68, 0.2)'
                      : 'rgba(56, 189, 248, 0.2)',
                color: currentInstance.status === 'COMPLETED'
                  ? '#34d399'
                  : currentInstance.status === 'WAITING_CALLBACK'
                    ? '#fbbf24'
                    : currentInstance.status === 'FAILED'
                      ? '#f87171'
                      : '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {currentInstance.status === 'COMPLETED' && <CheckCircle2 size={13} />}
                {currentInstance.status === 'WAITING_CALLBACK' && <Hourglass size={13} />}
                {currentInstance.status}
              </span>
            </div>

            {/* Quick Resume Button for ASYNC_GATE */}
            {currentInstance.status === 'WAITING_CALLBACK' && (
              <button
                onClick={handleQuickResume}
                disabled={isResuming}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  backgroundColor: '#f59e0b',
                  color: '#000000',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: isResuming ? 'not-allowed' : 'pointer',
                  minHeight: '48px'
                }}
              >
                <Send size={13} /> {isResuming ? 'Resuming...' : 'Simulate Callback Resumption'}
              </button>
            )}

            <button
              onClick={() => onOpenLogModal(currentInstance.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: '48px'
              }}
            >
              <ListTree size={14} /> View Step Audit Logs
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '6px',
  color: '#f8fafc',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box'
};
