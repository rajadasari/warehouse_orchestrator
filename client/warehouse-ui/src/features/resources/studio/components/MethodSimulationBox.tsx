import React, { useState } from 'react';
import { Play, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '../../../../components/common/Button';

export interface SimulationResult {
  success: boolean;
  statusCode: number;
  executionTimeMs: number;
  responsePayload: string;
  targetUrl: string;
  error?: string;
}

export interface MethodSimulationBoxProps {
  /** Fully resolved URL to display. */
  resolvedUrl: string;
  /** Callback fired when user clicks "Test & Simulate". */
  onSimulate: () => Promise<SimulationResult>;
  disabled?: boolean;
}

export const MethodSimulationBox: React.FC<MethodSimulationBoxProps> = ({
  resolvedUrl,
  onSimulate,
  disabled = false,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const startTime = performance.now();
      const res = await onSimulate();
      const elapsed = performance.now() - startTime;
      setResult({
        ...res,
        executionTimeMs: res.executionTimeMs ?? Math.round(elapsed),
      });
    } catch (err: unknown) {
      setResult({
        success: false,
        statusCode: 0,
        executionTimeMs: 0,
        responsePayload: err instanceof Error ? err.message : String(err),
        targetUrl: resolvedUrl,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const statusColor = result
    ? result.success && result.statusCode >= 200 && result.statusCode < 300
      ? '#10B981'
      : '#EF4444'
    : 'var(--text-secondary)';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px 14px',
        borderRadius: '6px',
        border: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-surface-subtle)',
      }}
    >
      {/* Resolved URL Preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--text-secondary)',
          }}
        >
          Target:
        </span>
        <code
          style={{
            fontSize: '11.5px',
            fontFamily: 'monospace',
            color: 'var(--text-primary)',
            wordBreak: 'break-all',
          }}
        >
          {resolvedUrl || 'URL not configured'}
        </code>
      </div>

      {/* Simulate Button */}
      <Button
        type="button"
        variant="primary"
        onClick={handleRun}
        disabled={disabled || isRunning || !resolvedUrl}
        leftIcon={
          isRunning
            ? <Loader2 size={16} className="animate-spin" />
            : <Play size={16} />
        }
        style={{
          minHeight: '48px',
          padding: '0 24px',
          backgroundColor: '#10B981',
          borderColor: '#10B981',
          fontWeight: 700,
          fontSize: '13px',
          letterSpacing: '0.03em',
        }}
      >
        {isRunning ? 'Dispatching...' : '▶  Test & Simulate'}
      </Button>

      {/* Result Telemetry */}
      {result && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px 12px',
            borderRadius: '6px',
            border: `1px solid ${statusColor}30`,
            backgroundColor: `${statusColor}08`,
          }}
        >
          {/* Status Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Status badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: 'monospace',
                backgroundColor: `${statusColor}18`,
                color: statusColor,
              }}
            >
              {result.success
                ? <CheckCircle2 size={14} />
                : <XCircle size={14} />
              }
              {result.statusCode > 0 ? `${result.statusCode} ${result.success ? 'OK' : 'ERR'}` : 'FAILED'}
            </div>

            {/* Latency */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11.5px',
                color: 'var(--text-secondary)',
              }}
            >
              <Clock size={13} />
              {result.executionTimeMs}ms
            </div>

            {/* Error summary */}
            {result.error && (
              <span style={{ fontSize: '11px', color: '#EF4444' }}>
                {result.error}
              </span>
            )}
          </div>

          {/* Response JSON */}
          <div
            style={{
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: '4px',
              padding: '8px 10px',
            }}
          >
            <pre
              style={{
                margin: 0,
                fontFamily: 'monospace',
                fontSize: '11px',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {formatJson(result.responsePayload)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

/** Attempts to pretty-print JSON, falls back to raw text. */
function formatJson(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}
