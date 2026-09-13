import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Hourglass, 
  Send, 
  Layers, 
  RefreshCw
} from 'lucide-react';
import { 
  workflowService, 
  WorkflowInstanceItem, 
  WorkflowExecutionLogItem 
} from '../../../services/workflowService';

interface WorkflowExecutionLogModalProps {
  isOpen: boolean;
  instanceId: string | null;
  workflowCode: string;
  onClose: () => void;
  onResumed?: () => void;
}

export const WorkflowExecutionLogModal: React.FC<WorkflowExecutionLogModalProps> = ({
  isOpen,
  instanceId,
  workflowCode,
  onClose,
  onResumed
}) => {
  const [logs, setLogs] = useState<WorkflowExecutionLogItem[]>([]);
  const [instance, setInstance] = useState<WorkflowInstanceItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<WorkflowExecutionLogItem | null>(null);
  const [callbackSimPayload, setCallbackSimPayload] = useState(
    JSON.stringify({ wmsStatus: 'STORED', destinationAisle: 'A-04', destinationShelf: 'S-12', palletHeightMm: 1450 }, null, 2)
  );
  const [resuming, setResuming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeInstanceId, setActiveInstanceId] = useState<string | null>(instanceId);
  const [instances, setInstances] = useState<WorkflowInstanceItem[]>([]);

  useEffect(() => {
    setActiveInstanceId(instanceId);
  }, [instanceId]);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let instanceList = await workflowService.getInstances(workflowCode);
      if (!instanceList || instanceList.length === 0) {
        // Fallback to all instances so historical executions across workflows can be inspected
        instanceList = await workflowService.getInstances();
      }

      // Sort newest-first by timestamp
      instanceList.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });

      setInstances(instanceList);
      const targetId = activeInstanceId || (instanceList.length > 0 ? instanceList[0].id : null);
      if (!targetId) {
        setLogs([]);
        setInstance(null);
        setSelectedLog(null);
        return;
      }
      setActiveInstanceId(targetId);
      const logList = await workflowService.getInstanceLogs(targetId);
      setLogs(logList);
      const found = instanceList.find(i => i.id === targetId) || null;
      setInstance(found);
      if (logList.length > 0) {
        setSelectedLog(logList[logList.length - 1]);
      } else {
        setSelectedLog(null);
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, instanceId, workflowCode]);

  if (!isOpen) return null;

  const handleSelectInstance = async (id: string) => {
    setActiveInstanceId(id);
    setLoading(true);
    try {
      const logList = await workflowService.getInstanceLogs(id);
      setLogs(logList);
      const found = instances.find(i => i.id === id) || null;
      setInstance(found);
      if (logList.length > 0) {
        setSelectedLog(logList[logList.length - 1]);
      } else {
        setSelectedLog(null);
      }
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateResume = async () => {
    if (!instance?.correlationKey) return;
    setResuming(true);
    try {
      const payload = JSON.parse(callbackSimPayload);
      await workflowService.resumeCallback(instance.correlationKey, payload);
      await fetchData();
      if (onResumed) onResumed();
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to resume callback');
    } finally {
      setResuming(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            color: '#34d399',
            fontSize: '11px',
            fontWeight: 700
          }}>
            <CheckCircle2 size={12} /> SUCCESS
          </span>
        );
      case 'PAUSED_WAITING':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            fontSize: '11px',
            fontWeight: 700
          }}>
            <Hourglass size={12} /> WAITING CALLBACK
          </span>
        );
      case 'FAILED':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            fontSize: '11px',
            fontWeight: 700
          }}>
            <AlertTriangle size={12} /> FAILED
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(3, 7, 18, 0.82)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '950px',
        maxWidth: '100%',
        height: '80vh',
        backgroundColor: '#0f172a',
        borderRadius: '14px',
        border: '1px solid #334155',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#0b1120',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Layers size={20} color="#38bdf8" />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                Workflow Execution Trail
              </h3>
              {instance && getStatusBadge(instance.status)}
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>Instance: <code style={{ color: '#38bdf8' }}>{activeInstanceId ? activeInstanceId.slice(0, 8) + '...' : 'N/A'}</code></span>
              <span>| Pallet: <strong style={{ color: '#f8fafc' }}>{instance?.entityReference || 'N/A'}</strong></span>
              {instances.length > 1 && (
                <select
                  value={activeInstanceId || ''}
                  onChange={(e) => handleSelectInstance(e.target.value)}
                  style={{
                    backgroundColor: '#1e293b',
                    color: '#38bdf8',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  {instances.map(inst => (
                    <option key={inst.id} value={inst.id}>
                      Run #{inst.id.slice(0, 8)} - {inst.status} ({inst.entityReference})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {errorMsg && (
              <span style={{ color: '#f87171', fontSize: '11px', marginRight: '8px' }}>
                {errorMsg}
              </span>
            )}
            <button
              onClick={fetchData}
              disabled={loading}
              title="Refresh logs"
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                minHeight: '48px'
              }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button
              onClick={onClose}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                minHeight: '48px'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {instances.length === 0 && !loading ? (
          <div style={{
            margin: 'auto',
            textAlign: 'center',
            color: '#94a3b8',
            padding: '60px 20px'
          }}>
            <Layers size={42} color="#38bdf8" style={{ margin: '0 auto 16px auto', opacity: 0.8 }} />
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
              No Execution Records Available
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px', maxWidth: '420px', lineHeight: 1.6 }}>
              No simulation runs have been recorded for workflow <strong style={{ color: '#38bdf8' }}>{workflowCode}</strong> yet.
              <br />
              Click &ldquo;Simulate Workflow&rdquo; on the top header to run a real-time simulation and generate step traces.
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            overflow: 'hidden'
          }}>
            {/* Left Step List */}
            <div style={{
              width: '360px',
              borderRight: '1px solid #1e293b',
              overflowY: 'auto',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: '#0b1120'
            }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#64748b',
                marginBottom: '4px'
              }}>
                Execution Steps ({logs.length})
              </div>

              {logs.length === 0 && !loading && (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                  No execution steps recorded for this run.
                </div>
              )}

              {logs.map((logItem) => {
                const isSelected = selectedLog?.id === logItem.id;
                const displayName = logItem.nodeName || logItem.nodeLabel || logItem.nodeId;
                return (
                  <div
                    key={logItem.id}
                    onClick={() => setSelectedLog(logItem)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#1e293b' : '#0f172a',
                      border: isSelected ? '1px solid #38bdf8' : '1px solid #1e293b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      minHeight: '48px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          color: '#64748b',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: '#1e293b'
                        }}>
                          #{logItem.stepSequence}
                        </span>
                        <strong style={{ fontSize: '12px', color: '#f8fafc' }}>
                          {displayName}
                        </strong>
                      </div>
                      {getStatusBadge(logItem.status)}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '10.5px',
                      color: '#64748b'
                    }}>
                      <span>Type: {logItem.nodeType}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} /> {logItem.durationMs}ms
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Log Inspector */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              backgroundColor: '#0f172a'
            }}>
              {selectedLog ? (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155'
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                        Step #{selectedLog.stepSequence}: {selectedLog.nodeName || selectedLog.nodeLabel || selectedLog.nodeId}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        Node ID: <code style={{ color: '#38bdf8' }}>{selectedLog.nodeId}</code> | Type: <span style={{ color: '#e2e8f0' }}>{selectedLog.nodeType}</span> | Executed at: {selectedLog.executedAt}
                      </div>
                    </div>
                    <div>{getStatusBadge(selectedLog.status)}</div>
                  </div>

                  {/* Dedicated API Response Section */}
                  {(selectedLog.nodeType === 'API_MAPPER' || selectedLog.outputData?.apiResponse || selectedLog.outputData?.responseBody) && (
                    <div style={{
                      padding: '14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(59, 130, 246, 0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.35)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          API Response Payload
                        </span>
                        {Boolean(selectedLog.outputData?.httpStatus) && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: Number(selectedLog.outputData?.httpStatus) >= 200 && Number(selectedLog.outputData?.httpStatus) < 300
                              ? 'rgba(16, 185, 129, 0.2)'
                              : 'rgba(239, 68, 68, 0.2)',
                            color: Number(selectedLog.outputData?.httpStatus) >= 200 && Number(selectedLog.outputData?.httpStatus) < 300
                              ? '#34d399'
                              : '#f87171'
                          }}>
                            HTTP {String(selectedLog.outputData?.httpStatus)}
                          </span>
                        )}
                      </div>

                      {Boolean(selectedLog.outputData?.targetEndpoint) && (
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          Endpoint: <code style={{ color: '#38bdf8' }}>{String(selectedLog.outputData?.targetEndpoint)}</code>
                        </div>
                      )}

                      <pre style={{
                        margin: 0,
                        padding: '10px',
                        borderRadius: '6px',
                        backgroundColor: '#030712',
                        border: '1px solid #1e293b',
                        color: '#34d399',
                        fontSize: '11.5px',
                        fontFamily: 'monospace',
                        overflowX: 'auto',
                        maxHeight: '200px'
                      }}>
                        {JSON.stringify(
                          selectedLog.outputData?.apiResponse || 
                          selectedLog.outputData?.responseBody || 
                          selectedLog.outputData?.responseSnapshot || 
                          {}, 
                          null, 
                          2
                        )}
                      </pre>
                    </div>
                  )}

                  {/* Output Data Snapshot */}
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                      Output / Context Delta
                    </div>
                    <pre style={{
                      margin: 0,
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#030712',
                      border: '1px solid #1e293b',
                      color: '#34d399',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      maxHeight: '220px'
                    }}>
                      {JSON.stringify(selectedLog.outputData || {}, null, 2)}
                    </pre>
                  </div>

                  {/* Node Input / Configuration */}
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#94a3b8', marginBottom: '6px' }}>
                      Node Input / Configuration
                    </div>
                    <pre style={{
                      margin: 0,
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: '#030712',
                      border: '1px solid #1e293b',
                      color: '#38bdf8',
                      fontSize: '11.5px',
                      fontFamily: 'monospace',
                      overflowX: 'auto',
                      maxHeight: '160px'
                    }}>
                      {JSON.stringify(selectedLog.inputData || selectedLog.nodeConfig || {}, null, 2)}
                    </pre>
                  </div>

                  {/* Error Details if Failed */}
                  {(selectedLog.errorDetails || selectedLog.errorMessage) && (
                    <div style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid #ef4444',
                      color: '#f87171',
                      fontSize: '12px'
                    }}>
                      <strong>Execution Error:</strong> {selectedLog.errorDetails || selectedLog.errorMessage}
                    </div>
                  )}

                {/* Waiting Callback Simulator */}
                {instance?.status === 'WAITING_CALLBACK' && instance?.correlationKey && (
                  <div style={{
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Hourglass size={18} color="#f59e0b" />
                      <div>
                        <strong style={{ fontSize: '13px', color: '#fbbf24' }}>
                          Workflow Paused Awaiting Callback
                        </strong>
                        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
                          Correlation Key: <code style={{ color: '#fef08a' }}>{instance.correlationKey}</code>
                        </div>
                      </div>
                    </div>

                    <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
                      Simulate third-party WMS sending confirmation webhook to resume the remaining steps:
                    </p>

                    <textarea
                      value={callbackSimPayload}
                      onChange={(e) => setCallbackSimPayload(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%',
                        backgroundColor: '#030712',
                        border: '1px solid #475569',
                        borderRadius: '6px',
                        color: '#f8fafc',
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        padding: '8px',
                        boxSizing: 'border-box'
                      }}
                    />

                    <button
                      onClick={handleSimulateResume}
                      disabled={resuming}
                      style={{
                        alignSelf: 'flex-start',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 18px',
                        backgroundColor: '#f59e0b',
                        color: '#000000',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                        minHeight: '48px'
                      }}
                    >
                      <Send size={15} /> {resuming ? 'Resuming...' : 'Simulate Callback Resumption'}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b',
                fontSize: '13px'
              }}>
                Select a step on the left to inspect logs and context payloads
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};
