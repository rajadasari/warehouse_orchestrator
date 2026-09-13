import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface JsonViewerProps {
  data: any;
  title?: string;
  maxHeight?: string;
  className?: string;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title,
  maxHeight = '320px',
  className = ''
}) => {
  const [copied, setCopied] = useState(false);

  const formattedText = (() => {
    if (!data) return '{}';
    if (typeof data === 'string') {
      try {
        return JSON.stringify(JSON.parse(data), null, 2);
      } catch {
        return data;
      }
    }
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  })();

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={className}
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #1e293b',
        backgroundColor: '#0b1320'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 12px',
          backgroundColor: '#070f1d',
          borderBottom: '1px solid #1e293b',
          fontSize: '11px',
          color: '#94a3b8'
        }}
      >
        <span>{title || 'JSON Payload'}</span>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            color: copied ? '#10b981' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '2px 6px',
            borderRadius: '4px'
          }}
          title="Copy payload to clipboard"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '12px',
          maxHeight,
          overflowY: 'auto',
          color: '#7dd3fc',
          fontFamily: 'SFMono-Regular, Consolas, monospace',
          fontSize: '11.5px',
          lineHeight: '1.45',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}
      >
        {formattedText}
      </pre>
    </div>
  );
};
