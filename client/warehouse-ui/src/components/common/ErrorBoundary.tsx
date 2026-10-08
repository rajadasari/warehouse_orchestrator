import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { Button } from './Button';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log to console for diagnostic monitoring
    console.error('Unhandled runtime component failure caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  private handleCopy = (): void => {
    const { error, errorInfo } = this.state;
    const diagnosticPayload = [
      `Error: ${error?.message ?? 'Unknown error'}`,
      `Stack:\n${error?.stack ?? 'No stack available'}`,
      `Component Stack:\n${errorInfo?.componentStack ?? 'No component stack available'}`,
    ].join('\n\n');

    navigator.clipboard.writeText(diagnosticPayload).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    });
  };

  public override render(): ReactNode {
    const { hasError, error, errorInfo, showDetails, copied } = this.state;
    const { children, fallbackTitle = 'Module Rendering Error', fallbackMessage } = this.props;

    if (hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            margin: '1.5rem',
            padding: '1.5rem',
            borderRadius: '8px',
            backgroundColor: '#1e1e24',
            border: '1px solid #dc2626',
            color: '#f3f4f6',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
            fontFamily: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: 'rgba(220, 38, 38, 0.15)',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <AlertOctagon size={24} />
            </div>

            <div style={{ flex: 1 }}>
              <h3
                style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.125rem',
                  fontWeight: 600,
                  color: '#f87171',
                }}
              >
                {fallbackTitle}
              </h3>
              <p
                style={{
                  margin: '0 0 1rem 0',
                  fontSize: '0.875rem',
                  color: '#9ca3af',
                  lineHeight: 1.5,
                }}
              >
                {fallbackMessage ||
                  'An unexpected runtime exception interrupted this component. Safety guards isolated the fault to maintain system integrity.'}
              </p>

              {error?.message && (
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    marginBottom: '1rem',
                    borderRadius: '6px',
                    backgroundColor: '#111827',
                    border: '1px solid #374151',
                    fontSize: '0.8125rem',
                    fontFamily: 'monospace',
                    color: '#fca5a5',
                    wordBreak: 'break-word',
                  }}
                >
                  <strong>Fault:</strong> {error.message}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={this.handleReset}
                  leftIcon={<RefreshCw size={14} />}
                >
                  Retry Component
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={this.toggleDetails}
                  leftIcon={showDetails ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                >
                  {showDetails ? 'Hide Diagnostics' : 'Show Diagnostics'}
                </Button>

                {showDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleCopy}
                    leftIcon={copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  >
                    {copied ? 'Copied' : 'Copy Diagnostics'}
                  </Button>
                )}
              </div>

              {showDetails && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    backgroundColor: '#0b0f19',
                    border: '1px solid #1f2937',
                    maxHeight: '260px',
                    overflowY: 'auto',
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      fontSize: '0.75rem',
                      fontFamily: 'Consolas, Monaco, monospace',
                      color: '#d1d5db',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {error?.stack}
                    {errorInfo?.componentStack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}