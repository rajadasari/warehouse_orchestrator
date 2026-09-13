import React from 'react';
import { 
  Sliders, 
  ChevronDown, 
  ChevronRight, 
  RefreshCw, 
  Check, 
  Eye, 
  Copy, 
  Play, 
  Send 
} from 'lucide-react';
import { Button } from '../../../components/common/Button';

export interface MappingTestRunnerProps {
  testVariablesJson: string;
  setTestVariablesJson: (val: string) => void;
  showVariablesEditor: boolean;
  setShowVariablesEditor: (val: boolean) => void;
  detectedUrlVars: string[];
  formEndpointUrl: string;
  buildContextFromUrl: (url: string, mergeWithExisting?: boolean, currentJson?: string) => string;
  handleLivePreview: () => Promise<void>;
  isPreviewLoading: boolean;
  previewResult: string | null;
  previewError: string | null;
  handleTestRun: () => Promise<void>;
  isTestRunLoading: boolean;
  testRunResult: any;
  testRunError: string | null;
  copiedText: string | null;
  copyToClipboard: (text: string, label: string) => void;
}

export const MappingTestRunner: React.FC<MappingTestRunnerProps> = ({
  testVariablesJson,
  setTestVariablesJson,
  showVariablesEditor,
  setShowVariablesEditor,
  detectedUrlVars,
  formEndpointUrl,
  buildContextFromUrl,
  handleLivePreview,
  isPreviewLoading,
  previewResult,
  previewError,
  handleTestRun,
  isTestRunLoading,
  testRunResult,
  testRunError,
  copiedText,
  copyToClipboard
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      borderLeft: '1px solid var(--border-default)',
      paddingLeft: '20px'
    }}>
      {/* 1. Simulation Variables (Test Context) Panel */}
      <div style={{
        backgroundColor: 'var(--bg-surface-subtle)',
        borderRadius: '10px',
        border: '1px solid var(--border-default)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setShowVariablesEditor(!showVariablesEditor)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={16} color="#818CF8" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Simulation Variables (Test Context)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {showVariablesEditor ? 'Collapse' : 'Expand'}
            </span>
            {showVariablesEditor ? <ChevronDown size={14} color="var(--text-secondary)" /> : <ChevronRight size={14} color="var(--text-secondary)" />}
          </div>
        </div>

        {showVariablesEditor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '2px' }}>
            {/* Detected URL Variables bar & Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>URL Variables:</span>
                {detectedUrlVars.length > 0 ? (
                  detectedUrlVars.map(v => (
                    <span
                      key={v}
                      style={{
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                        color: '#38BDF8',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        border: '1px solid rgba(56, 189, 248, 0.25)'
                      }}
                    >
                      {`{${v}}`}
                    </span>
                  ))
                ) : (
                  <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    None detected in path
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTestVariablesJson(buildContextFromUrl(formEndpointUrl, false))}
                  title="Reset all variable values to defaults based on the current URL"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#818CF8',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <RefreshCw size={11} />
                  <span>Reset Defaults</span>
                </button>
                {detectedUrlVars.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setTestVariablesJson(buildContextFromUrl(formEndpointUrl, true, testVariablesJson))}
                    title="Sync missing URL variables into test context while keeping your edits"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#10B981',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}
                  >
                    <Check size={11} />
                    <span>Sync URL</span>
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={4}
              value={testVariablesJson}
              onChange={(e) => setTestVariablesJson(e.target.value)}
              placeholder='{\n  "palletId": "PAL-9901"\n}'
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: '#0F172A',
                color: '#FCD34D',
                fontSize: '11px',
                fontFamily: 'Consolas, Monaco, monospace',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
              Variables are auto-generated from path variables in the Endpoint URL. Edit values directly to test substitution.
            </div>
          </div>
        )}
      </div>

      {/* 2. Live Evaluated Payload Panel */}
      <div style={{
        backgroundColor: 'var(--bg-surface-subtle)',
        borderRadius: '10px',
        border: '1px solid var(--border-default)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={16} color="var(--color-primary-600, #2563EB)" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Live Evaluated Payload</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleLivePreview}
              isLoading={isPreviewLoading}
              icon={<Eye size={12} />}
            >
              Live Preview
            </Button>
            {previewResult && (
              <button
                type="button"
                onClick={() => copyToClipboard(previewResult, 'preview')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {copiedText === 'preview' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                {copiedText === 'preview' ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        </div>

        {previewError && (
          <div style={{ fontSize: '11px', color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '6px 8px', borderRadius: '4px' }}>
            {previewError}
          </div>
        )}

        <pre style={{
          backgroundColor: '#090D16',
          padding: '10px 12px',
          borderRadius: '6px',
          fontSize: '11px',
          fontFamily: 'monospace',
          color: '#A7F3D0',
          maxHeight: '160px',
          overflowY: 'auto',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          {previewResult || '// Click "Live Preview" to inspect substituted dynamic fields'}
        </pre>
      </div>

      {/* 3. Dry-Run / Test Dispatch Box */}
      <div style={{
        backgroundColor: 'var(--bg-surface-subtle)',
        borderRadius: '10px',
        border: '1px solid var(--border-default)',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Play size={16} color="#10B981" />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Dry-Run / Live API Test</span>
          </div>

          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={handleTestRun}
            isLoading={isTestRunLoading}
            icon={<Send size={12} />}
          >
            Test Dispatch
          </Button>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          Resolves base URL from selected resource custom properties & tests payload delivery.
        </div>

        {testRunError && (
          <div style={{ fontSize: '11px', color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '6px 8px', borderRadius: '4px' }}>
            {testRunError}
          </div>
        )}

        {testRunResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Status Code:</span>
              <span style={{
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: testRunResult.statusCode >= 200 && testRunResult.statusCode < 300
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
                color: testRunResult.statusCode >= 200 && testRunResult.statusCode < 300 ? '#10B981' : '#EF4444'
              }}>
                HTTP {testRunResult.statusCode}
              </span>
            </div>

            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Target URL: </span>
              <code style={{ fontSize: '10px', color: '#60A5FA' }}>{testRunResult.targetUrl}</code>
            </div>

            {testRunResult.error && (
              <div style={{
                fontSize: '11px',
                color: '#EF4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                {testRunResult.error}
              </div>
            )}

            {String(testRunResult.responsePayload || '').trim().toLowerCase().startsWith('<!doctype html') && (
              <div style={{
                fontSize: '11px',
                color: '#F59E0B',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                lineHeight: '1.4'
              }}>
                <strong>Server Notice:</strong> The target server returned an HTML page. {testRunResult.statusCode === 405 ? 'The remote endpoint does not allow this HTTP method. Please verify the HTTP Method (e.g. POST vs GET) or check for missing/extra trailing slashes in Endpoint URL.' : 'Ensure "Accept: application/json" is included in headers.'}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Response Body:</span>
              <button
                type="button"
                onClick={() => copyToClipboard(testRunResult.responsePayload, 'response')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                {copiedText === 'response' ? 'Copied' : 'Copy Response'}
              </button>
            </div>

            <pre style={{
              backgroundColor: '#090D16',
              padding: '8px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: testRunResult.statusCode >= 200 && testRunResult.statusCode < 300 ? '#10B981' : '#F87171',
              maxHeight: '160px',
              overflowY: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              {testRunResult.responsePayload || '(Empty Response)'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
