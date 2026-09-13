import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Minus, 
  Maximize2, 
  RotateCcw, 
  Grid, 
  Trash2, 
  ChevronsUpDown 
} from 'lucide-react';
import { 
  WorkflowNode, 
  WorkflowEdge 
} from '../../../services/workflowService';
import { CanvasViewport } from '../types';
import { WorkflowNodeCard, NODE_WIDTH, getNodeIo, getReachableUpstreamNodes } from './canvas/WorkflowNodeCard';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  activeExecutionNodeId?: string | null;
  triggeringNodeId?: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onEdgesChange: (edges: WorkflowEdge[]) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (node: WorkflowNode) => void;
  onOpenInspector: (node: WorkflowNode) => void;
  onTriggerNode?: (node: WorkflowNode) => void;
}

const GRID_SNAP = 16;
const PORT_OFFSET_Y = 43;

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  edges,
  selectedNodeId,
  activeExecutionNodeId,
  triggeringNodeId,
  onSelectNode,
  onNodesChange,
  onEdgesChange,
  onDeleteNode,
  onDuplicateNode,
  onOpenInspector,
  onTriggerNode
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Viewport State
  const [viewport, setViewport] = useState<CanvasViewport>({
    zoom: 1,
    panX: 80,
    panY: 80
  });
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Interaction States
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Edge Creation State
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState({ x: 0, y: 0 });
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // Expansion State: Set of node IDs whose I/O drawer is expanded
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  const handleToggleExpand = (nodeId: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const handleToggleExpandAll = () => {
    if (expandedNodeIds.size > 0) {
      setExpandedNodeIds(new Set());
    } else {
      setExpandedNodeIds(new Set(nodes.map(n => n.id)));
    }
  };

  const getUpstreamOutputsForNode = (targetNodeId: string) => {
    // Strictly retrieve outputs ONLY from nodes reachable upstream via connection edges
    const upstreamNodes = getReachableUpstreamNodes(targetNodeId, nodes, edges);
    if (upstreamNodes.length === 0) {
      return [];
    }

    const list: Array<{ name: string; sourceNodeLabel: string; type?: string }> = [];
    upstreamNodes.forEach(n => {
      const { outputs } = getNodeIo(n);
      outputs.forEach(o => {
        if (!list.some(item => item.name === o.name)) {
          list.push({
            name: o.name,
            sourceNodeLabel: n.label,
            type: o.type
          });
        }
      });
    });
    return list;
  };

  const handleMapProperty = (nodeId: string, targetField: string, sourceValue: string) => {
    const updatedNodes = nodes.map(n => {
      if (n.id !== nodeId) return n;
      const cfg = { ...(n.config || {}) };
      const currentMappings = Array.isArray(cfg.fieldMappings) ? [...cfg.fieldMappings] : [];
      const existingIdx = currentMappings.findIndex((m: { targetField: string }) => m.targetField === targetField);
      if (existingIdx >= 0) {
        currentMappings[existingIdx] = { targetField, sourceType: 'CONTEXT_VAR', sourceValue };
      } else {
        currentMappings.push({ targetField, sourceType: 'CONTEXT_VAR', sourceValue });
      }
      cfg.fieldMappings = currentMappings;

      if (n.type === 'API_MAPPER') {
        const obj: Record<string, string> = {};
        currentMappings.forEach((m: { targetField: string; sourceValue: string }) => {
          obj[m.targetField] = `{{${m.sourceValue}}}`;
        });
        cfg.payloadTemplate = JSON.stringify(obj, null, 2);
      }
      return { ...n, config: cfg };
    });
    onNodesChange(updatedNodes);
  };

  // Convert screen coordinates to canvas space
  const screenToCanvas = (screenX: number, screenY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = (screenX - rect.left - viewport.panX) / viewport.zoom;
    const y = (screenY - rect.top - viewport.panY) / viewport.zoom;
    return { x, y };
  };

  // Native Wheel Zoom with passive: false to prevent browser console violation
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setViewport(prev => {
        const newZoom = Math.min(Math.max(prev.zoom * zoomFactor, 0.4), 2.2);
        const newPanX = mouseX - (mouseX - prev.panX) * (newZoom / prev.zoom);
        const newPanY = mouseY - (mouseY - prev.panY) * (newZoom / prev.zoom);
        return { zoom: newZoom, panX: newPanX, panY: newPanY };
      });
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  // Canvas Mouse Down (Panning or Deselection)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - viewport.panX, y: e.clientY - viewport.panY });
      onSelectNode(null);
      setSelectedEdgeId(null);
    }
  };

  // Global Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setMouseCanvasPos(canvasPos);

    if (isPanning) {
      setViewport(prev => ({
        ...prev,
        panX: e.clientX - panStart.x,
        panY: e.clientY - panStart.y
      }));
    } else if (draggingNodeId) {
      let nextX = canvasPos.x - dragOffset.x;
      let nextY = canvasPos.y - dragOffset.y;

      if (snapToGrid) {
        nextX = Math.round(nextX / GRID_SNAP) * GRID_SNAP;
        nextY = Math.round(nextY / GRID_SNAP) * GRID_SNAP;
      }

      const updated = nodes.map(n => n.id === draggingNodeId ? { ...n, x: nextX, y: nextY } : n);
      onNodesChange(updated);
    }
  };

  // Global Mouse Up
  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);

    // If we were dragging a connection line and dropped on a target node
    if (connectingSourceId && hoveredTargetId && connectingSourceId !== hoveredTargetId) {
      const edgeExists = edges.some(
        e => e.source === connectingSourceId && e.target === hoveredTargetId
      );
      if (!edgeExists) {
        const newEdge: WorkflowEdge = {
          id: `edge_${Date.now().toString(36)}`,
          source: connectingSourceId,
          target: hoveredTargetId
        };
        onEdgesChange([...edges, newEdge]);

        // Auto-expand target node so user immediately sees inputs, outputs, and mapped properties
        setExpandedNodeIds(prev => new Set(prev).add(hoveredTargetId));

        // Auto-match any target node inputs with source node outputs
        const srcNode = nodes.find(n => n.id === connectingSourceId);
        const tgtNode = nodes.find(n => n.id === hoveredTargetId);
        if (srcNode && tgtNode) {
          const { outputs: srcOutputs } = getNodeIo(srcNode);
          const { inputs: tgtInputs } = getNodeIo(tgtNode);
          tgtInputs.forEach(inp => {
            const matched = srcOutputs.find(o => 
              o.name.toLowerCase() === inp.name.toLowerCase() ||
              (inp.name.toLowerCase().includes('lpn') && o.name.toLowerCase().includes('lpn')) ||
              (inp.name.toLowerCase().includes('sku') && o.name.toLowerCase().includes('sku')) ||
              ((inp.name.toLowerCase().includes('qty') || inp.name.toLowerCase().includes('quantity')) &&
               (o.name.toLowerCase().includes('qty') || o.name.toLowerCase().includes('quantity')))
            );
            if (matched) {
              handleMapProperty(tgtNode.id, inp.name, matched.name);
            }
          });
        }
      }
    }
    setConnectingSourceId(null);
    setHoveredTargetId(null);
  };

  // Node Drag Start
  const handleNodeMouseDown = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    onSelectNode(node.id);
    setSelectedEdgeId(null);
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: canvasPos.x - node.x,
      y: canvasPos.y - node.y
    });
  };

  // Start Drawing Edge from Port
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setConnectingSourceId(nodeId);
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setMouseCanvasPos(canvasPos);
  };

  // Fit View
  const handleFitView = () => {
    if (nodes.length === 0 || !containerRef.current) return;
    const minX = Math.min(...nodes.map(n => n.x));
    const maxX = Math.max(...nodes.map(n => n.x + NODE_WIDTH));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxY = Math.max(...nodes.map(n => n.y + 120));

    const rect = containerRef.current.getBoundingClientRect();
    const graphWidth = maxX - minX + 160;
    const graphHeight = maxY - minY + 160;

    const zoom = Math.min(
      Math.max(Math.min(rect.width / graphWidth, rect.height / graphHeight), 0.5),
      1.2
    );

    const panX = (rect.width - graphWidth * zoom) / 2 - (minX - 80) * zoom;
    const panY = (rect.height - graphHeight * zoom) / 2 - (minY - 80) * zoom;

    setViewport({ zoom, panX, panY });
  };

  // Safe coordinate accessors with fallback
  const getNodeCoordX = (node: WorkflowNode): number => {
    if (typeof node.x === 'number' && Number.isFinite(node.x)) return node.x;
    if (node.position && typeof node.position.x === 'number' && Number.isFinite(node.position.x)) return node.position.x;
    return 80;
  };

  const getNodeCoordY = (node: WorkflowNode): number => {
    if (typeof node.y === 'number' && Number.isFinite(node.y)) return node.y;
    if (node.position && typeof node.position.y === 'number' && Number.isFinite(node.position.y)) return node.position.y;
    return 180;
  };

  // Calculate Bezier Path between 2 nodes
  const calculateEdgePath = (srcNode: WorkflowNode, tgtNode: WorkflowNode) => {
    const srcX = getNodeCoordX(srcNode) + NODE_WIDTH;
    const srcY = getNodeCoordY(srcNode) + PORT_OFFSET_Y;
    const tgtX = getNodeCoordX(tgtNode);
    const tgtY = getNodeCoordY(tgtNode) + PORT_OFFSET_Y;

    const dx = Math.max(Math.abs(tgtX - srcX) * 0.45, 40);
    return `M ${srcX} ${srcY} C ${srcX + dx} ${srcY}, ${tgtX - dx} ${tgtY}, ${tgtX} ${tgtY}`;
  };

  // Calculate temporary connecting line
  const activeConnectingPath = useMemo(() => {
    if (!connectingSourceId) return null;
    const srcNode = nodes.find(n => n.id === connectingSourceId);
    if (!srcNode) return null;

    const srcX = getNodeCoordX(srcNode) + NODE_WIDTH;
    const srcY = getNodeCoordY(srcNode) + PORT_OFFSET_Y;
    const tgtX = Number.isFinite(mouseCanvasPos.x) ? mouseCanvasPos.x : srcX;
    const tgtY = Number.isFinite(mouseCanvasPos.y) ? mouseCanvasPos.y : srcY;

    const dx = Math.max(Math.abs(tgtX - srcX) * 0.45, 30);
    return `M ${srcX} ${srcY} C ${srcX + dx} ${srcY}, ${tgtX - dx} ${tgtY}, ${tgtX} ${tgtY}`;
  }, [connectingSourceId, mouseCanvasPos, nodes]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        flex: 1,
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#090d16',
        backgroundImage: `radial-gradient(rgba(51, 65, 85, 0.4) 1.2px, transparent 1.2px)`,
        backgroundSize: `${24 * viewport.zoom}px ${24 * viewport.zoom}px`,
        backgroundPosition: `${viewport.panX}px ${viewport.panY}px`,
        cursor: isPanning ? 'grabbing' : 'default',
        userSelect: 'none'
      }}
    >
      {/* HUD Controls Toolbar */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: '#0f172a',
        padding: '6px 10px',
        borderRadius: '10px',
        border: '1px solid #1e293b',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)'
      }}>
        <button
          title="Zoom In"
          onClick={() => setViewport(v => ({ ...v, zoom: Math.min(v.zoom * 1.15, 2.2) }))}
          style={hudButtonStyle}
        >
          <Plus size={15} />
        </button>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', minWidth: '40px', textAlign: 'center' }}>
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          title="Zoom Out"
          onClick={() => setViewport(v => ({ ...v, zoom: Math.max(v.zoom * 0.85, 0.4) }))}
          style={hudButtonStyle}
        >
          <Minus size={15} />
        </button>
        <div style={{ width: '1px', height: '18px', backgroundColor: '#334155', margin: '0 4px' }} />
        <button
          title="Fit to Screen"
          onClick={handleFitView}
          style={hudButtonStyle}
        >
          <Maximize2 size={15} />
        </button>
        <button
          title="Reset View"
          onClick={() => setViewport({ zoom: 1, panX: 80, panY: 80 })}
          style={hudButtonStyle}
        >
          <RotateCcw size={15} />
        </button>
        <button
          title={`Snap to Grid: ${snapToGrid ? 'ON' : 'OFF'}`}
          onClick={() => setSnapToGrid(!snapToGrid)}
          style={{
            ...hudButtonStyle,
            backgroundColor: snapToGrid ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            color: snapToGrid ? '#38bdf8' : '#94a3b8'
          }}
        >
          <Grid size={15} />
        </button>
        <button
          title={expandedNodeIds.size > 0 ? "Collapse All Node I/O Drawers" : "Expand All Node I/O Drawers"}
          onClick={handleToggleExpandAll}
          style={{
            ...hudButtonStyle,
            backgroundColor: expandedNodeIds.size > 0 ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
            color: expandedNodeIds.size > 0 ? '#38bdf8' : '#94a3b8'
          }}
        >
          <ChevronsUpDown size={15} />
        </button>
      </div>

      {/* Main Canvas Transform Layer */}
      <div style={{
        transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
        transformOrigin: '0 0',
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none'
      }}>
        {/* SVG Layer for Connections */}
        <svg style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '5000px',
          height: '5000px',
          overflow: 'visible',
          pointerEvents: 'none'
        }}>
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="8"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
            </marker>
            <marker
              id="arrowhead-active"
              markerWidth="10"
              markerHeight="7"
              refX="8"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" />
            </marker>
          </defs>

          {/* Render Committed Edges */}
          {edges.map(edge => {
            const srcNode = nodes.find(n => n.id === edge.source);
            const tgtNode = nodes.find(n => n.id === edge.target);
            if (!srcNode || !tgtNode) return null;

            const pathData = calculateEdgePath(srcNode, tgtNode);
            const isSelected = selectedEdgeId === edge.id;
            const isEdgeActive = activeExecutionNodeId === srcNode.id || activeExecutionNodeId === tgtNode.id;

            return (
              <g key={edge.id} style={{ pointerEvents: 'auto', cursor: 'pointer' }}>
                {/* Thick invisible stroke for easier click selection */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.id);
                    onSelectNode(null);
                  }}
                />
                {/* Visible Edge */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={isSelected ? '#f43f5e' : isEdgeActive ? '#38bdf8' : '#475569'}
                  strokeWidth={isSelected ? 3 : 2}
                  strokeDasharray={isEdgeActive ? '5,5' : 'none'}
                  markerEnd={isEdgeActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                  style={{
                    transition: 'stroke 0.2s, stroke-width 0.2s',
                    filter: isEdgeActive ? 'drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))' : 'none'
                  }}
                />
              </g>
            );
          })}

          {/* Active Drawing Edge */}
          {activeConnectingPath && (
            <path
              d={activeConnectingPath}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="6,4"
              markerEnd="url(#arrowhead-active)"
              style={{ filter: 'drop-shadow(0 0 8px rgba(56, 189, 248, 0.7))' }}
            />
          )}
        </svg>

        {/* Nodes Layer */}
        {nodes.map(node => (
          <WorkflowNodeCard
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isActive={activeExecutionNodeId === node.id}
            isExpanded={expandedNodeIds.has(node.id)}
            onToggleExpand={handleToggleExpand}
            onMouseDown={handleNodeMouseDown}
            onMouseEnter={() => {
              if (connectingSourceId && connectingSourceId !== node.id) {
                setHoveredTargetId(node.id);
              }
            }}
            onMouseLeave={() => {
              if (hoveredTargetId === node.id) {
                setHoveredTargetId(null);
              }
            }}
            onOpenInspector={onOpenInspector}
            onDuplicateNode={onDuplicateNode}
            onDeleteNode={onDeleteNode}
            onTriggerNode={onTriggerNode}
            triggeringNodeId={triggeringNodeId}
            onPortMouseDown={handlePortMouseDown}
            hoveredTargetId={hoveredTargetId}
            upstreamOutputs={getUpstreamOutputsForNode(node.id)}
            onMapProperty={handleMapProperty}
            getNodeCoordX={getNodeCoordX}
            getNodeCoordY={getNodeCoordY}
          />
        ))}
      </div>

      {/* Edge Deletion Floating Button */}
      {selectedEdgeId && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 60,
          backgroundColor: '#1e293b',
          border: '1px solid #ef4444',
          padding: '8px 16px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
        }}>
          <span style={{ fontSize: '12px', color: '#f8fafc' }}>
            Selected Connection: <strong>{selectedEdgeId}</strong>
          </span>
          <button
            onClick={() => {
              onEdgesChange(edges.filter(e => e.id !== selectedEdgeId));
              setSelectedEdgeId(null);
            }}
            style={{
              padding: '6px 12px',
              backgroundColor: '#ef4444',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              fontSize: '11.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Trash2 size={13} /> Delete Connection
          </button>
        </div>
      )}
    </div>
  );
};

const hudButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  padding: '6px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease'
};
