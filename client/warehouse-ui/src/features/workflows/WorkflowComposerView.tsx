import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Save, 
  Plus, 
  GitMerge, 
  Check, 
  AlertCircle,
  Play,
  ListTree,
  Send,
  CheckCircle2,
  Hourglass,
  RefreshCw
} from 'lucide-react';
import { 
  workflowService, 
  WorkflowDefinitionItem, 
  WorkflowNode, 
  WorkflowEdge, 
  WorkflowInstanceItem 
} from '../../services/workflowService';
import { PaletteItem } from './types';
import { NodePalette } from './components/NodePalette';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { NodeInspectorPanel } from './components/NodeInspectorPanel';
import { WorkflowExecutionLogModal } from './components/WorkflowExecutionLogModal';
import { ContextVariableItem } from './components/inspectors/ContextVariableChips';
import { getReachableUpstreamNodes } from './components/canvas/WorkflowNodeCard';

export const WorkflowComposerView: React.FC = () => {
  // Definitions State
  const [definitions, setDefinitions] = useState<WorkflowDefinitionItem[]>([]);
  const [currentDefinition, setCurrentDefinition] = useState<WorkflowDefinitionItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Canvas Graph State
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [triggeringNodeId, setTriggeringNodeId] = useState<string | null>(null);

  // Execution & Simulation State
  const [currentInstance, setCurrentInstance] = useState<WorkflowInstanceItem | null>(null);
  const [logModalInstanceId, setLogModalInstanceId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isResumingCallback, setIsResumingCallback] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // Dynamically compute upstream context variables available for mapping strictly for the selected node.
  // Until a node is connected to an upstream source via edges, NO properties are allowed.
  const availableVariables = useMemo<ContextVariableItem[]>(() => {
    if (!selectedNodeId) return [];

    // Find reachable upstream nodes via directed graph edges
    const upstreamNodes = getReachableUpstreamNodes(selectedNodeId, nodes, edges);
    if (upstreamNodes.length === 0) {
      return [];
    }

    const vars: ContextVariableItem[] = [];

    upstreamNodes.forEach(n => {
      const cfg = n.config || {};
      if (n.type === 'TRIGGER') {
        if (Array.isArray(cfg.manualFields) && cfg.manualFields.length > 0) {
          (cfg.manualFields as Array<{ name: string; type?: string; value?: unknown }>).forEach(f => {
            if (f.name && !vars.some(v => v.name === f.name)) {
              vars.push({
                name: f.name,
                type: f.type || 'string',
                sourceNodeLabel: n.label,
                sampleValue: String(f.value ?? '')
              });
            }
          });
        } else if (Array.isArray(cfg.fields) && cfg.fields.length > 0) {
          (cfg.fields as Array<{ name: string; type?: string }>).forEach(f => {
            if (f.name && !vars.some(v => v.name === f.name)) {
              vars.push({
                name: f.name,
                type: f.type || 'string',
                sourceNodeLabel: n.label
              });
            }
          });
        }
      } else if (n.type === 'MATH_OPERATION') {
        const outVar = String(cfg.outputVariable || 'calculatedTotal');
        if (!vars.some(v => v.name === outVar)) {
          vars.push({ name: outVar, type: 'number', sourceNodeLabel: n.label });
        }
      } else if (n.type === 'API_MAPPER') {
        const outVar = String(cfg.outputVariable || 'apiResponse');
        if (!vars.some(v => v.name === outVar)) {
          vars.push({ name: outVar, type: 'object', sourceNodeLabel: n.label });
          vars.push({ name: `${outVar}.status`, type: 'number', sourceNodeLabel: n.label });
        }
      } else if (n.type === 'ASYNC_GATE') {
        ['wmsStatus', 'allocatedAisle', 'allocatedShelf'].forEach(k => {
          if (!vars.some(v => v.name === k)) {
            vars.push({ name: k, type: 'string', sourceNodeLabel: n.label });
          }
        });
      } else if (n.type === 'VALIDATION') {
        if (!vars.some(v => v.name === 'validationOutcome')) {
          vars.push({ name: 'validationOutcome', type: 'string', sourceNodeLabel: n.label });
        }
      } else if (n.type === 'STATE_MUTATION') {
        if (!vars.some(v => v.name === 'palletStatus')) {
          vars.push({ name: 'palletStatus', type: 'string', sourceNodeLabel: n.label });
        }
      }
    });

    return vars;
  }, [selectedNodeId, nodes, edges]);

  // Helper to normalize nodes ensuring valid x, y numbers
  const normalizeNodes = (rawNodes: unknown[]): WorkflowNode[] => {
    if (!Array.isArray(rawNodes)) return [];
    return rawNodes.map((n, idx) => {
      const nodeObj = n as Record<string, unknown>;
      const pos = (nodeObj.position || {}) as Record<string, unknown>;
      const x = typeof nodeObj.x === 'number'
        ? nodeObj.x
        : (typeof pos.x === 'number' ? pos.x : 80 + idx * 300);
      const y = typeof nodeObj.y === 'number'
        ? nodeObj.y
        : (typeof pos.y === 'number' ? pos.y : 200);

      return {
        id: String(nodeObj.id || `node_${idx}`),
        type: (nodeObj.type as WorkflowNode['type']) || 'TRIGGER',
        label: String(nodeObj.label || 'Node'),
        sublabel: nodeObj.sublabel ? String(nodeObj.sublabel) : undefined,
        x,
        y,
        config: (nodeObj.config && typeof nodeObj.config === 'object')
          ? (nodeObj.config as Record<string, unknown>)
          : {}
      };
    });
  };

  const normalizeEdges = (rawEdges: unknown[]): WorkflowEdge[] => {
    if (!Array.isArray(rawEdges)) return [];
    return rawEdges.map((e, idx) => {
      const edgeObj = e as Record<string, unknown>;
      return {
        id: String(edgeObj.id || `edge_${idx}`),
        source: String(edgeObj.source || ''),
        target: String(edgeObj.target || ''),
        label: edgeObj.label ? String(edgeObj.label) : undefined,
        condition: edgeObj.condition ? String(edgeObj.condition) : undefined
      };
    });
  };

  // Load All Definitions on Mount
  const loadDefinitions = useCallback(async (selectCode?: string) => {
    setLoading(true);
    try {
      const list = await workflowService.getAllDefinitions();
      setDefinitions(list);

      const target = selectCode 
        ? list.find(d => d.workflowCode === selectCode) 
        : list[0];

      if (target) {
        setCurrentDefinition(target);
        setNodes(normalizeNodes(target.canvasGraph?.nodes || []));
        setEdges(normalizeEdges(target.canvasGraph?.edges || []));
      }
    } catch (e: unknown) {
      setSaveNotice({
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to load workflow definitions'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefinitions();
  }, [loadDefinitions]);

  // Handle Switch Definition
  const handleSelectDefinition = (code: string) => {
    const target = definitions.find(d => d.workflowCode === code);
    if (target) {
      setCurrentDefinition(target);
      setNodes(normalizeNodes(target.canvasGraph?.nodes || []));
      setEdges(normalizeEdges(target.canvasGraph?.edges || []));
      setSelectedNodeId(null);
      setIsInspectorOpen(false);
      setCurrentInstance(null);
    }
  };

  // Create New Workflow
  const handleCreateNewWorkflow = () => {
    const code = prompt('Enter unique Workflow Code (e.g. WF_OUTBOUND_PICK_V1):');
    if (!code || !code.trim()) return;
    const name = prompt('Enter Workflow Display Name:', code.trim());

    const initialNodes: WorkflowNode[] = [
      {
        id: 'node_trigger',
        type: 'TRIGGER',
        label: 'Workflow Start',
        x: 100,
        y: 200,
        config: { triggerEvent: `${code.trim()}_STARTED`, sourceChannel: 'HMI_OPERATOR' }
      },
      {
        id: 'node_end',
        type: 'TERMINATOR',
        label: 'End Process',
        x: 600,
        y: 200,
        config: { completionStatus: 'COMPLETED' }
      }
    ];

    const initialEdges: WorkflowEdge[] = [
      {
        id: 'edge_start_end',
        source: 'node_trigger',
        target: 'node_end'
      }
    ];

    const newDef: WorkflowDefinitionItem = {
      workflowCode: code.trim().toUpperCase(),
      name: name ? name.trim() : code.trim(),
      category: 'GENERAL',
      active: true,
      canvasGraph: {
        nodes: initialNodes,
        edges: initialEdges
      }
    };

    setCurrentDefinition(newDef);
    setNodes(initialNodes);
    setEdges(initialEdges);
    setDefinitions(prev => [newDef, ...prev.filter(d => d.workflowCode !== newDef.workflowCode)]);
  };

  // Ensure current canvas definition is saved to backend before execution
  const ensureWorkflowSaved = async (): Promise<WorkflowDefinitionItem> => {
    if (!currentDefinition) throw new Error('No active workflow definition');
    const updated: WorkflowDefinitionItem = {
      ...currentDefinition,
      canvasGraph: {
        nodes,
        edges
      }
    };
    const saved = await workflowService.saveDefinition(updated);
    setCurrentDefinition(saved);
    setDefinitions(prev => {
      const idx = prev.findIndex(d => d.workflowCode === saved.workflowCode);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    return saved;
  };

  // Save Workflow
  const handleSaveWorkflow = async () => {
    if (!currentDefinition) return;
    setSaving(true);
    setSaveNotice(null);
    try {
      const saved = await ensureWorkflowSaved();
      setSaveNotice({ type: 'success', message: `Workflow '${saved.name}' saved successfully!` });
      setTimeout(() => setSaveNotice(null), 3500);
    } catch (e: unknown) {
      setSaveNotice({
        type: 'error',
        message: e instanceof Error ? e.message : 'Failed to save workflow'
      });
    } finally {
      setSaving(false);
    }
  };

  // Add Node From Palette with clean non-overlapping spacing
  const handleAddNode = (item: PaletteItem) => {
    const newId = `node_${item.type.toLowerCase()}_${Date.now().toString(36)}`;

    // Find rightmost node to place next node with 60px gap (220px width + 60px = 280px step)
    let newX = 80;
    let newY = 200;
    if (nodes.length > 0) {
      const maxX = Math.max(...nodes.map(n => n.x));
      const rightNode = nodes.find(n => n.x === maxX);
      newX = maxX + 280;
      newY = rightNode ? rightNode.y : 200;

      // Wrap to next row if too far right
      if (newX > 2400) {
        newX = 80;
        const maxY = Math.max(...nodes.map(n => n.y));
        newY = maxY + 160;
      }
    }

    const newNode: WorkflowNode = {
      id: newId,
      type: item.type,
      label: item.label,
      x: newX,
      y: newY,
      config: { ...item.defaultConfig }
    };
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newId);
    setIsInspectorOpen(true);
  };

  // Palette Drag-and-Drop
  const handlePaletteDragStart = (e: React.DragEvent, item: PaletteItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    try {
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      const item: PaletteItem = JSON.parse(data);
      const rect = e.currentTarget.getBoundingClientRect();
      const newId = `node_${item.type.toLowerCase()}_${Date.now().toString(36)}`;

      // Calculate canvas coordinates (accounting for 280px sidebar)
      const rawX = e.clientX - rect.left - 280;
      const rawY = e.clientY - rect.top;

      let dropX = Math.max(Math.round(rawX / 16) * 16, 40);
      let dropY = Math.max(Math.round(rawY / 16) * 16, 40);

      // Collision avoidance: keep minimum 240px x 110px clearance from existing nodes
      const isOverlapping = (x: number, y: number) => 
        nodes.some(n => Math.abs(n.x - x) < 240 && Math.abs(n.y - y) < 110);
      
      while (isOverlapping(dropX, dropY)) {
        dropX += 280;
      }

      const newNode: WorkflowNode = {
        id: newId,
        type: item.type,
        label: item.label,
        x: dropX,
        y: dropY,
        config: { ...item.defaultConfig }
      };
      setNodes(prev => [...prev, newNode]);
      setSelectedNodeId(newId);
      setIsInspectorOpen(true);
    } catch {
      // ignore
    }
  };

  // Node Selection & Inspector
  const handleSelectNode = (nodeId: string | null) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setIsInspectorOpen(true);
    }
  };

  const handleUpdateNode = (updated: WorkflowNode) => {
    setNodes(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setIsInspectorOpen(false);
    }
  };

  const handleDuplicateNode = (node: WorkflowNode) => {
    const copyId = `node_${node.type.toLowerCase()}_${Date.now().toString(36)}`;
    const copyNode: WorkflowNode = {
      ...node,
      id: copyId,
      label: `${node.label} (Copy)`,
      x: node.x + 280, // Clean 60px gap beside original node
      y: node.y,
      config: JSON.parse(JSON.stringify(node.config))
    };
    setNodes(prev => [...prev, copyNode]);
    setSelectedNodeId(copyId);
  };

  // Execute Trigger from Canvas Node or Inspector
  const handleTriggerNode = async (node: WorkflowNode) => {
    if (!currentDefinition) return;
    setTriggeringNodeId(node.id);
    try {
      // Auto-save definition first so backend DB contains the latest nodes and edges
      const activeDef = await ensureWorkflowSaved();

      // Extract custom manual fields or raw JSON payload from node config
      let customPayload: Record<string, unknown> = {};
      if (Array.isArray(node.config.manualFields)) {
        (node.config.manualFields as Array<{ name: string; value: unknown }>).forEach(f => {
          if (f.name) customPayload[f.name] = f.value;
        });
      }
      if (node.config.initialPayload && typeof node.config.initialPayload === 'object') {
        customPayload = { ...customPayload, ...node.config.initialPayload };
      } else if (typeof node.config.rawJsonPayload === 'string') {
        try {
          const parsed = JSON.parse(node.config.rawJsonPayload);
          if (typeof parsed === 'object' && parsed !== null) {
            customPayload = { ...customPayload, ...parsed };
          }
        } catch (_) {}
      }

      const palletLpn = String(customPayload.palletLpn || node.config.palletLpn || node.config.entityReference || 'PLT-MANUAL-001');
      const sku = String(customPayload.sku || node.config.sku || 'SKU-AMBIENT-01');
      const quantity = Number(customPayload.quantity ?? node.config.quantity ?? 1);
      const entityRef = String(customPayload.entityReference || palletLpn);

      const res = await workflowService.triggerWorkflow({
        workflowCode: activeDef.workflowCode,
        entityReference: entityRef.trim(),
        initialContext: {
          ...customPayload,
          ...node.config,
          palletLpn: palletLpn.trim(),
          sku: sku.trim(),
          quantity,
          sourceChannel: String(node.config.sourceChannel || 'MANUAL_CLICK'),
          triggeredByNodeId: node.id,
          triggerEvent: String(node.config.triggerEvent || 'MANUAL_OPERATOR_CLICK'),
          scanTimestamp: new Date().toISOString()
        }
      });
      setCurrentInstance(res);
      setLogModalInstanceId(res.id);
      if (res.currentNodeId) {
        setSelectedNodeId(res.currentNodeId);
      }
      setSaveNotice({
        type: 'success',
        message: `Manual trigger executed for ${entityRef} (Instance: ${res.id.slice(0, 8)}...)`
      });
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (e: unknown) {
      setSaveNotice({
        type: 'error',
        message: e instanceof Error ? e.message : 'Manual trigger execution failed'
      });
    } finally {
      setTriggeringNodeId(null);
    }
  };

  // Run real-time simulation from top header
  const handleRunSimulation = async () => {
    if (!currentDefinition) return;
    setIsSimulating(true);
    setSaveNotice(null);
    try {
      const activeDef = await ensureWorkflowSaved();
      const res = await workflowService.triggerWorkflow({
        workflowCode: activeDef.workflowCode,
        entityReference: 'PLT-SIM-1001',
        initialContext: {
          palletLpn: 'PLT-SIM-1001',
          sku: 'SKU-AMBIENT-01',
          quantity: 24,
          sourceLocation: 'INBOUND-CONVEYOR-01',
          scanTimestamp: new Date().toISOString()
        }
      });
      setCurrentInstance(res);
      setLogModalInstanceId(res.id);
      if (res.currentNodeId) {
        setSelectedNodeId(res.currentNodeId);
      }
      setSaveNotice({
        type: 'success',
        message: `Simulation ${res.status === 'WAITING_CALLBACK' ? 'paused at ASYNC Gate' : res.status.toLowerCase()} (Instance: ${res.id.slice(0, 8)}...)`
      });
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (e: unknown) {
      setSaveNotice({
        type: 'error',
        message: e instanceof Error ? e.message : 'Workflow simulation failed'
      });
    } finally {
      setIsSimulating(false);
    }
  };

  // Quick Resume Callback for ASYNC_GATE
  const handleQuickResume = async () => {
    if (!currentInstance?.correlationKey) return;
    setIsResumingCallback(true);
    setSaveNotice(null);
    try {
      const res = await workflowService.resumeCallback(currentInstance.correlationKey, {
        wmsStatus: 'STORED',
        allocatedAisle: 'AISLE-B-02',
        allocatedShelf: 'SHELF-04',
        confirmationTimestamp: new Date().toISOString()
      });
      setCurrentInstance(res);
      setLogModalInstanceId(res.id);
      if (res.currentNodeId) {
        setSelectedNodeId(res.currentNodeId);
      }
      setSaveNotice({
        type: 'success',
        message: `Callback resumed! Workflow status: ${res.status}`
      });
      setTimeout(() => setSaveNotice(null), 4000);
    } catch (e: unknown) {
      setSaveNotice({
        type: 'error',
        message: e instanceof Error ? e.message : 'Callback resume failed'
      });
    } finally {
      setIsResumingCallback(false);
    }
  };

  const handleOpenLogModal = (instanceId?: string) => {
    setLogModalInstanceId(instanceId || currentInstance?.id || null);
    setIsLogModalOpen(true);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      backgroundColor: '#090d16',
      color: '#f8fafc'
    }}>
      {/* Top Composer Header */}
      <div style={{
        height: '62px',
        minHeight: '62px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 18px',
        boxSizing: 'border-box',
        zIndex: 50
      }}>
        {/* Left Title & Workflow Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
            }}>
              <GitMerge size={19} />
            </div>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '-0.01em',
                lineHeight: 1.2
              }}>
                Process & Workflow Studio
              </h2>
              <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                Visual Canvas Orchestrator & Execution Engine
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '28px', backgroundColor: '#334155' }} />

          {/* Workflow Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            {/* Workflow Selector */}
            <select
              value={currentDefinition?.workflowCode || ''}
              disabled={loading}
              onChange={(e) => handleSelectDefinition(e.target.value)}
              style={{
                backgroundColor: '#1e293b',
                color: '#f8fafc',
                border: '1px solid #334155',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none',
                minWidth: '220px',
                minHeight: '48px'
              }}
            >
              {definitions.map(d => (
                <option key={d.workflowCode} value={d.workflowCode}>
                  {d.name} ({d.workflowCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Header: Status Indicators & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Notification / Toast */}
          {saveNotice && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: saveNotice.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              border: saveNotice.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
              color: saveNotice.type === 'success' ? '#34d399' : '#f87171',
              fontSize: '12px',
              fontWeight: 600
            }}>
              {saveNotice.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
              {saveNotice.message}
            </div>
          )}

          {/* Current Execution Status Badge */}
          {currentInstance && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: currentInstance.status === 'COMPLETED'
                ? 'rgba(16, 185, 129, 0.15)'
                : currentInstance.status === 'WAITING_CALLBACK'
                  ? 'rgba(245, 158, 11, 0.15)'
                  : currentInstance.status === 'FAILED'
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(56, 189, 248, 0.15)',
              border: `1px solid ${
                currentInstance.status === 'COMPLETED'
                  ? '#10b981'
                  : currentInstance.status === 'WAITING_CALLBACK'
                    ? '#f59e0b'
                    : currentInstance.status === 'FAILED'
                      ? '#ef4444'
                      : '#38bdf8'
              }`,
              color: currentInstance.status === 'COMPLETED'
                ? '#34d399'
                : currentInstance.status === 'WAITING_CALLBACK'
                  ? '#fbbf24'
                  : currentInstance.status === 'FAILED'
                    ? '#f87171'
                    : '#38bdf8',
              fontSize: '11.5px',
              fontWeight: 700
            }}>
              {currentInstance.status === 'COMPLETED' && <CheckCircle2 size={13} />}
              {currentInstance.status === 'WAITING_CALLBACK' && <Hourglass size={13} />}
              {currentInstance.status === 'FAILED' && <AlertCircle size={13} />}
              {currentInstance.status === 'RUNNING' && <RefreshCw size={13} className="animate-spin" />}
              <span>{currentInstance.status}</span>
            </div>
          )}

          {/* Resume ASYNC Gate Button (shown only when instance is paused at callback) */}
          {currentInstance?.status === 'WAITING_CALLBACK' && (
            <button
              onClick={handleQuickResume}
              disabled={isResumingCallback}
              title="Simulate external WMS callback to resume ASYNC Gate"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: '#f59e0b',
                color: '#000000',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: isResumingCallback ? 'not-allowed' : 'pointer',
                minHeight: '48px',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
              }}
            >
              <Send size={13} /> {isResumingCallback ? 'Resuming...' : 'Resume ASYNC Gate'}
            </button>
          )}

          {/* 1. New Workflow Button */}
          <button
            onClick={handleCreateNewWorkflow}
            title="Create a new blank workflow definition"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#38bdf8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            <Plus size={15} /> New Workflow
          </button>

          {/* 2. Save Workflow Button */}
          <button
            onClick={handleSaveWorkflow}
            disabled={saving}
            title="Persist canvas nodes and routing graph to database"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              minHeight: '48px'
            }}
          >
            {saving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Workflow'}
          </button>

          {/* 3. Simulate Workflow Button */}
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating}
            title="Run end-to-end workflow simulation engine"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: isSimulating ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              minHeight: '48px'
            }}
          >
            {isSimulating ? <RefreshCw size={15} className="animate-spin" /> : <Play size={15} />}
            {isSimulating ? 'Simulating...' : 'Simulate Workflow'}
          </button>

          {/* 4. Execution Logs Button */}
          <button
            onClick={() => handleOpenLogModal()}
            title="Inspect execution trace and node audit logs"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f8fafc',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: '48px'
            }}
          >
            <ListTree size={15} color="#38bdf8" /> Execution Logs
          </button>
        </div>
      </div>

      {/* Main Canvas Workspace */}
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleCanvasDrop}
        style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        {/* Left Node Palette */}
        <NodePalette
          onAddNode={handleAddNode}
          onDragStart={handlePaletteDragStart}
        />

        {/* Center Interactive Workflow Canvas */}
        <WorkflowCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          activeExecutionNodeId={currentInstance?.currentNodeId}
          triggeringNodeId={triggeringNodeId}
          onSelectNode={handleSelectNode}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onDeleteNode={handleDeleteNode}
          onDuplicateNode={handleDuplicateNode}
          onTriggerNode={handleTriggerNode}
          onOpenInspector={(node) => {
            setSelectedNodeId(node.id);
            setIsInspectorOpen(true);
          }}
        />

        {/* Dynamically compute available upstream context variables */}
        {/* Right Node Inspector Flyout */}
        {isInspectorOpen && selectedNode && (
          <NodeInspectorPanel
            selectedNode={selectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onTriggerNode={handleTriggerNode}
            isTriggering={triggeringNodeId === selectedNode.id}
            availableVariables={availableVariables}
            onClose={() => setIsInspectorOpen(false)}
          />
        )}
      </div>

      {/* Step Audit Log Modal */}
      <WorkflowExecutionLogModal
        isOpen={isLogModalOpen}
        instanceId={logModalInstanceId}
        workflowCode={currentDefinition?.workflowCode || ''}
        onClose={() => setIsLogModalOpen(false)}
        onResumed={() => {
          if (currentDefinition) {
            workflowService.getInstances(currentDefinition.workflowCode)
              .then(list => {
                const found = list.find(i => i.id === logModalInstanceId);
                if (found) setCurrentInstance(found);
              });
          }
        }}
      />
    </div>
  );
};
