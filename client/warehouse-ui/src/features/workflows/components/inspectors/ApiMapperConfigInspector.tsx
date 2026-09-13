import React, { useState, useRef } from 'react';
import { Globe, Code, ArrowDownRight, Layers, TableProperties } from 'lucide-react';
import { WorkflowNode } from '../../../../services/workflowService';
import { ApiIntegrationMappingItem } from '../../../../services/dynamicMappingService';
import { ContextVariableChips, ContextVariableItem } from './ContextVariableChips';
import { VisualFieldMappingTable, FieldMappingRow, compileMappingsToJson } from './VisualFieldMappingTable';

interface ApiMapperConfigInspectorProps {
  selectedNode: WorkflowNode;
  onUpdateConfigField: (field: string, value: unknown) => void;
  availableMappings: ApiIntegrationMappingItem[];
  availableVariables: ContextVariableItem[];
}

export const ApiMapperConfigInspector: React.FC<ApiMapperConfigInspectorProps> = ({
  selectedNode,
  onUpdateConfigField,
  availableMappings,
  availableVariables
}) => {
  const config = selectedNode.config || {};
  const [integrationMode, setIntegrationMode] = useState<'CATALOG' | 'CUSTOM'>(
    config.endpointUrl ? 'CUSTOM' : 'CATALOG'
  );
  const [mappingInputMode, setMappingInputMode] = useState<'VISUAL' | 'RAW_JSON'>('VISUAL');

  const payloadTextareaRef = useRef<HTMLTextAreaElement>(null);

  const fieldMappings: FieldMappingRow[] = Array.isArray(config.fieldMappings)
    ? (config.fieldMappings as FieldMappingRow[])
    : [];

  const handleFieldMappingsChange = (updatedMappings: FieldMappingRow[]) => {
    onUpdateConfigField('fieldMappings', updatedMappings);
    const compiled = compileMappingsToJson(updatedMappings);
    onUpdateConfigField('payloadTemplate', compiled);
  };

  const handleMappingCodeChange = (code: string) => {
    onUpdateConfigField('mappingCode', code);
    const found = availableMappings.find(m => m.mappingCode === code);
    if (found) {
      if (found.httpMethod) {
        onUpdateConfigField('httpMethod', found.httpMethod);
      }
      if (found.targetResourceId) {
        onUpdateConfigField('resourceId', found.targetResourceId);
      }
      if (found.endpointUrl) {
        onUpdateConfigField('endpointUrl', found.endpointUrl);
      }

      if (found.httpMethod === 'GET' || found.httpMethod === 'DELETE') {
        onUpdateConfigField('fieldMappings', []);
        onUpdateConfigField('payloadTemplate', '');
      } else if (found.payloadTemplate) {
        try {
          const obj = typeof found.payloadTemplate === 'string' ? JSON.parse(found.payloadTemplate) : found.payloadTemplate;
          if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
            const rows: FieldMappingRow[] = Object.entries(obj).map(([targetField, val]) => {
              const valStr = String(val);
              const tokenMatch = valStr.match(/^\{\{([^}]+)\}\}$/);
              if (tokenMatch) {
                const cleanVar = tokenMatch[1].replace(/^(context\.|pallet\.|item\.)/, '').trim();
                return {
                  targetField,
                  sourceType: 'CONTEXT_VAR',
                  sourceValue: cleanVar
                };
              }
              return {
                targetField,
                sourceType: 'CONSTANT',
                sourceValue: valStr
              };
            });
            onUpdateConfigField('fieldMappings', rows);
            onUpdateConfigField('payloadTemplate', compileMappingsToJson(rows));
          }
        } catch (_) {}
      }
    }
  };

  const handleInsertToken = (token: string) => {
    const currentTemplate = String(config.payloadTemplate || '');
    if (payloadTextareaRef.current) {
      const textarea = payloadTextareaRef.current;
      const start = textarea.selectionStart ?? currentTemplate.length;
      const end = textarea.selectionEnd ?? currentTemplate.length;
      const updated = currentTemplate.substring(0, start) + token + currentTemplate.substring(end);
      onUpdateConfigField('payloadTemplate', updated);
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + token.length, start + token.length);
      }, 50);
    } else {
      onUpdateConfigField('payloadTemplate', currentTemplate ? `${currentTemplate} ${token}` : token);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Integration Mode Switcher */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
          Integration Mode
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            type="button"
            onClick={() => {
              setIntegrationMode('CATALOG');
              if (!config.mappingCode) onUpdateConfigField('mappingCode', 'WMS_PRE_ANNOUNCE');
            }}
            style={{
              padding: '6px 8px',
              backgroundColor: integrationMode === 'CATALOG' ? '#1e3a8a' : '#1e293b',
              border: integrationMode === 'CATALOG' ? '1px solid #3b82f6' : '1px solid #334155',
              borderRadius: '6px',
              color: integrationMode === 'CATALOG' ? '#ffffff' : '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Layers size={13} /> Catalog Mapping
          </button>

          <button
            type="button"
            onClick={() => {
              setIntegrationMode('CUSTOM');
              if (!config.httpMethod) onUpdateConfigField('httpMethod', 'POST');
            }}
            style={{
              padding: '6px 8px',
              backgroundColor: integrationMode === 'CUSTOM' ? '#1e3a8a' : '#1e293b',
              border: integrationMode === 'CUSTOM' ? '1px solid #3b82f6' : '1px solid #334155',
              borderRadius: '6px',
              color: integrationMode === 'CUSTOM' ? '#ffffff' : '#94a3b8',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Globe size={13} /> Custom REST Endpoint
          </button>
        </div>
      </div>

      {/* Catalog Mapping Select */}
      {integrationMode === 'CATALOG' ? (
        <>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Select Pre-Configured API Mapping
            </label>
            <select
              value={String(config.mappingCode || 'WMS_PRE_ANNOUNCE')}
              onChange={(e) => handleMappingCodeChange(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            >
              <option value="WMS_PRE_ANNOUNCE">WMS_PRE_ANNOUNCE (Pre-Announce Inbound)</option>
              <option value="WMS_CREATE_ORDER">WMS_CREATE_ORDER (Create Inbound Order)</option>
              <option value="WMS_STATUS_POLL">WMS_STATUS_POLL (Query Task Status)</option>
              {availableMappings.map(m => (
                <option key={m.id} value={m.mappingCode}>
                  {m.mappingCode} ({m.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
              Target Software Resource ID
            </label>
            <input
              type="text"
              value={String(config.resourceId || 'LOGIQS-AMBIENT-WMS')}
              onChange={(e) => onUpdateConfigField('resourceId', e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#f8fafc',
                fontSize: '12px',
                boxSizing: 'border-box'
              }}
            />
          </div>
        </>
      ) : (
        <>
          {/* Custom Endpoint URL & Method */}
          <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Method
              </label>
              <select
                value={String(config.httpMethod || 'POST')}
                onChange={(e) => onUpdateConfigField('httpMethod', e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 6px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#38bdf8',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  boxSizing: 'border-box'
                }}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                Target Endpoint URL
              </label>
              <input
                type="text"
                value={String(config.endpointUrl || '')}
                onChange={(e) => onUpdateConfigField('endpointUrl', e.target.value)}
                placeholder="http://host:8085/api/v1/resource or {{context.endpoint}}"
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#f8fafc',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* Target API Request Payload Mapping */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '6px'
        }}>
          <label style={{
            fontSize: '11px',
            fontWeight: 700,
            color: '#38bdf8',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.03em'
          }}>
            <TableProperties size={13} />
            API Request Payload Mapping
          </label>

          {/* Mode Switcher: Visual Field Table vs Raw JSON */}
          <div style={{ display: 'flex', backgroundColor: '#1e293b', borderRadius: '5px', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setMappingInputMode('VISUAL')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                backgroundColor: mappingInputMode === 'VISUAL' ? '#0284c7' : 'transparent',
                color: mappingInputMode === 'VISUAL' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <TableProperties size={11} /> Visual Fields
            </button>
            <button
              type="button"
              onClick={() => setMappingInputMode('RAW_JSON')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                backgroundColor: mappingInputMode === 'RAW_JSON' ? '#0284c7' : 'transparent',
                color: mappingInputMode === 'RAW_JSON' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '3px',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Code size={11} /> Raw JSON
            </button>
          </div>
        </div>

        {String(config.httpMethod || 'POST').toUpperCase() === 'GET' ? (
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(56, 189, 248, 0.05)',
            border: '1px dashed rgba(56, 189, 248, 0.3)',
            borderRadius: '6px',
            fontSize: '11.5px',
            color: '#94a3b8'
          }}>
            <p style={{ margin: '0 0 4px 0', color: '#38bdf8', fontWeight: 700 }}>
              ℹ️ HTTP GET Request (No Request Body)
            </p>
            <p style={{ margin: 0, fontSize: '11px', lineHeight: '1.4' }}>
              GET requests retrieve data and do not send a payload body. Parameters can be passed directly as URL tokens in the Target Endpoint URL template (e.g. <code>/api/v1/orders/&#123;&#123;orderId&#125;&#125;</code>).
            </p>
          </div>
        ) : mappingInputMode === 'VISUAL' ? (
          <VisualFieldMappingTable
            mappings={fieldMappings}
            onChangeMappings={handleFieldMappingsChange}
            availableVariables={availableVariables}
            defaultSchemaCode={integrationMode === 'CATALOG' ? (config.mappingCode ? String(config.mappingCode) : undefined) : undefined}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ marginBottom: '4px' }}>
              <ContextVariableChips
                variables={availableVariables}
                onInsertVariable={handleInsertToken}
              />
            </div>

            <textarea
              ref={payloadTextareaRef}
              value={String(
                config.payloadTemplate || 
                (availableVariables.length > 0 
                  ? JSON.stringify(Object.fromEntries(availableVariables.map(v => [v.name, `{{${v.name}}}`])), null, 2)
                  : '{\n  \n}')
              )}
              onChange={(e) => onUpdateConfigField('payloadTemplate', e.target.value)}
              rows={6}
              placeholder="{\n  &quot;field&quot;: &quot;{{upstreamProperty}}&quot;\n}"
              style={{
                width: '100%',
                padding: '8px',
                backgroundColor: '#020617',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#38bdf8',
                fontSize: '11px',
                fontFamily: 'monospace',
                boxSizing: 'border-box',
                resize: 'vertical'
              }}
            />
          </div>
        )}
      </div>

      {/* Output Variable Mapping */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
          <ArrowDownRight size={13} />
          Output Context Variable Name
        </label>
        <input
          type="text"
          value={String(config.outputVariable || 'apiResponse')}
          onChange={(e) => onUpdateConfigField('outputVariable', e.target.value)}
          placeholder="e.g. apiResponse or wmsOrderResult"
          style={{
            width: '100%',
            padding: '7px 10px',
            backgroundColor: '#1e293b',
            border: '1px solid #059669',
            borderRadius: '6px',
            color: '#34d399',
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'monospace',
            boxSizing: 'border-box'
          }}
        />
        <span style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px', display: 'block', lineHeight: 1.3 }}>
          Response is stored in context as <code>{String(config.outputVariable || 'apiResponse')}</code>. Downstream nodes can reference <code>{`{{${String(config.outputVariable || 'apiResponse')}.status}}`}</code>.
        </span>
      </div>
    </div>
  );
};
