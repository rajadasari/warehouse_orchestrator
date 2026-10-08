import React, { useState } from 'react';
import { 
  Play, 
  Terminal, 
  Activity, 
  Copy, 
  Check 
} from 'lucide-react';
import { MethodTraceLog } from '../../types/resourceEnums';

interface ServiceMethodTestBenchProps {
  methodName: string;
  inputs: Array<{ name: string; type: string; defaultValue?: string }>;
  testParams: Record<string, string>;
  setTestParams: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  testProperties?: Record<string, string>;
  setTestProperties?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isExecuting: boolean;
  testResult: {
    success: boolean;
    data?: unknown;
    traceLogs: MethodTraceLog[];
    executionTimeMs?: number;
    error?: string;
  } | null;
  enableTraceLogs: boolean;
  setEnableTraceLogs: (enabled: boolean) => void;
  onRunTest: () => void;
}

export const ServiceMethodTestBench: React.FC<ServiceMethodTestBenchProps> = ({
  methodName,
  inputs,
  testParams,
  setTestParams,
  testProperties,
  setTestProperties,
  isExecuting,
  testResult,
  enableTraceLogs,
  setEnableTraceLogs,
  onRunTest
}) => {
  const [activeTab, setActiveTab] = useState<'LOGS' | 'RESULT'>('LOGS');
  const [copiedLog, setCopiedLog] = useState(false);

  const handleCopyLogs = () => {
    if (!testResult) return;
    const txt = testResult.traceLogs.map(l => `[${l.timestamp}] [${l.phase}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(txt);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  return (
    <div style={{
      height: '240px',
      backgroundColor: '#0c1222',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Test Dock Control Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid #1e293b',
        backgroundColor: '#0f172a'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
            <Terminal size={14} color="#38bdf8" /> Test Bench: <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{methodName || 'Untitled'}</span>
          </span>

          {/* Test Input Fields */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {inputs.map(inp => (
              <div key={inp.name} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>{inp.name}:</span>
                <input
                  type="text"
                  value={testParams[inp.name] ?? ''}
                  onChange={e => setTestParams({ ...testParams, [inp.name]: e.target.value })}
                  style={{
                    width: '65px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                />
              </div>
            ))}

            {/* Twin State Properties (properties.getOrDefault(...)) */}
            {testProperties && Object.keys(testProperties).length > 0 && setTestProperties && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', borderLeft: '1px solid #334155' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>properties:</span>
                {Object.keys(testProperties).map(propKey => (
                  <div key={propKey} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#f59e0b', fontFamily: 'monospace' }}>{propKey}:</span>
                    <input
                      type="text"
                      value={testProperties[propKey] ?? ''}
                      onChange={e => setTestProperties({ ...testProperties, [propKey]: e.target.value })}
                      style={{
                        width: '65px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#f8fafc',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Diagnostic Trace Toggle */}
          <button
            type="button"
            onClick={() => setEnableTraceLogs(!enableTraceLogs)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '4px',
              backgroundColor: enableTraceLogs ? '#10b98120' : '#334155',
              color: enableTraceLogs ? '#34d399' : '#94a3b8',
              border: enableTraceLogs ? '1px solid #10b98140' : '1px solid #475569',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Activity size={12} />
            {enableTraceLogs ? 'Diagnostic Logs: ON' : 'Diagnostic Logs: OFF'}
          </button>

          {/* Run Button */}
          <button
            type="button"
            onClick={onRunTest}
            disabled={isExecuting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '6px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '12px',
              cursor: isExecuting ? 'not-allowed' : 'pointer',
              opacity: isExecuting ? 0.7 : 1
            }}
          >
            <Play size={13} fill="#ffffff" />
            {isExecuting ? 'Running...' : 'Run Test'}
          </button>

          {testResult && (
            <span style={{
              fontSize: '11px',
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: testResult.success ? '#10b98120' : '#ef444420',
              color: testResult.success ? '#34d399' : '#f87171',
              border: `1px solid ${testResult.success ? '#10b98140' : '#ef444440'}`,
              fontWeight: 600
            }}>
              {testResult.success ? `200 OK (${testResult.executionTimeMs ?? 0.8}ms)` : 'ERROR'}
            </span>
          )}
        </div>
      </div>

      {/* Terminal Header & Log View */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 16px',
        backgroundColor: '#070b14',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('LOGS')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'LOGS' ? '#38bdf8' : '#64748b',
              fontWeight: activeTab === 'LOGS' ? 700 : 400,
              fontSize: '11px',
              cursor: 'pointer',
              borderBottom: activeTab === 'LOGS' ? '2px solid #38bdf8' : 'none',
              paddingBottom: '2px'
            }}
          >
            Microsecond Terminal Trace ({testResult?.traceLogs.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RESULT')}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === 'RESULT' ? '#38bdf8' : '#64748b',
              fontWeight: activeTab === 'RESULT' ? 700 : 400,
              fontSize: '11px',
              cursor: 'pointer',
              borderBottom: activeTab === 'RESULT' ? '2px solid #38bdf8' : 'none',
              paddingBottom: '2px'
            }}
          >
            Result JSON
          </button>
        </div>

        {testResult && (
          <button
            type="button"
            onClick={handleCopyLogs}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: '10.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer'
            }}
          >
            {copiedLog ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
            {copiedLog ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>

      {/* Terminal Body */}
      <div style={{
        flex: 1,
        backgroundColor: '#050811',
        padding: '10px 16px',
        overflowY: 'auto',
        fontFamily: 'Consolas, monospace',
        fontSize: '11.5px',
        lineHeight: '1.5'
      }}>
        {activeTab === 'LOGS' ? (
          testResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {testResult.traceLogs.map((log, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#64748b', minWidth: '60px' }}>{log.timestamp}</span>
                  <span style={{
                    color: log.level === 'SUCCESS' ? '#34d399' : log.level === 'ERROR' ? '#f87171' : log.level === 'WARN' ? '#fbbf24' : '#38bdf8',
                    fontWeight: 600,
                    minWidth: '90px'
                  }}>
                    [{log.phase}]
                  </span>
                  <span style={{ color: '#e2e8f0' }}>{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#475569', fontStyle: 'italic' }}>
              Click &quot;Run Test&quot; above to compile and execute Java bytecode in real-time RAM with microsecond telemetry.
            </div>
          )
        ) : (
          <pre style={{ margin: 0, color: '#38bdf8' }}>
            {testResult ? JSON.stringify(testResult.data, null, 2) : '// No test run executed yet'}
          </pre>
        )}
      </div>
    </div>
  );
};
