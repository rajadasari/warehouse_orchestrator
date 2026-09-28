import { WorkflowNodeType } from '../../services/workflowService';

export interface PaletteItem {
  type: WorkflowNodeType;
  label: string;
  category: 'TRIGGER' | 'LOGIC' | 'INTEGRATION' | 'GATE' | 'STATE' | 'MATH' | 'TERMINAL' | 'EQUIPMENT' | 'COMPOSED';
  description: string;
  defaultConfig: Record<string, unknown>;
  iconName: string;
  badgeColor: string;
  accentBorder: string;
  glowColor: string;
}

export const NODE_TYPE_METADATA: Record<WorkflowNodeType, {
  color: string;
  bgLight: string;
  bgDark: string;
  borderDark: string;
  glow: string;
  icon: string;
  tag: string;
}> = {
  TRIGGER: {
    color: '#06b6d4', // Cyan
    bgLight: 'rgba(6, 182, 212, 0.12)',
    bgDark: 'rgba(6, 182, 212, 0.15)',
    borderDark: 'rgba(6, 182, 212, 0.45)',
    glow: 'rgba(6, 182, 212, 0.35)',
    icon: 'PlayCircle',
    tag: 'TRIGGER'
  },
  VALIDATION: {
    color: '#a855f7', // Purple
    bgLight: 'rgba(168, 85, 247, 0.12)',
    bgDark: 'rgba(168, 85, 247, 0.15)',
    borderDark: 'rgba(168, 85, 247, 0.45)',
    glow: 'rgba(168, 85, 247, 0.35)',
    icon: 'CheckCircle2',
    tag: 'VALIDATION'
  },
  API_MAPPER: {
    color: '#3b82f6', // Electric Blue
    bgLight: 'rgba(59, 130, 246, 0.12)',
    bgDark: 'rgba(59, 130, 246, 0.15)',
    borderDark: 'rgba(59, 130, 246, 0.45)',
    glow: 'rgba(59, 130, 246, 0.35)',
    icon: 'Network',
    tag: 'API MAPPER'
  },
  RESOURCE_ACTION: {
    color: '#10b981', // Emerald
    bgLight: 'rgba(16, 185, 129, 0.12)',
    bgDark: 'rgba(16, 185, 129, 0.15)',
    borderDark: 'rgba(16, 185, 129, 0.45)',
    glow: 'rgba(16, 185, 129, 0.35)',
    icon: 'Cpu',
    tag: 'RESOURCE ACTION'
  },
  COMPOSED: {
    color: '#8b5cf6', // Violet
    bgLight: 'rgba(139, 92, 246, 0.12)',
    bgDark: 'rgba(139, 92, 246, 0.15)',
    borderDark: 'rgba(139, 92, 246, 0.45)',
    glow: 'rgba(139, 92, 246, 0.35)',
    icon: 'Boxes',
    tag: 'COMPOSED'
  },
  ASYNC_GATE: {
    color: '#f59e0b', // Amber
    bgLight: 'rgba(245, 158, 11, 0.12)',
    bgDark: 'rgba(245, 158, 11, 0.15)',
    borderDark: 'rgba(245, 158, 11, 0.45)',
    glow: 'rgba(245, 158, 11, 0.35)',
    icon: 'Hourglass',
    tag: 'ASYNC GATE'
  },
  STATE_MUTATION: {
    color: '#10b981', // Emerald
    bgLight: 'rgba(16, 185, 129, 0.12)',
    bgDark: 'rgba(16, 185, 129, 0.15)',
    borderDark: 'rgba(16, 185, 129, 0.45)',
    glow: 'rgba(16, 185, 129, 0.35)',
    icon: 'Database',
    tag: 'STATE MUTATION'
  },
  MATH_OPERATION: {
    color: '#6366f1', // Indigo
    bgLight: 'rgba(99, 102, 241, 0.12)',
    bgDark: 'rgba(99, 102, 241, 0.15)',
    borderDark: 'rgba(99, 102, 241, 0.45)',
    glow: 'rgba(99, 102, 241, 0.35)',
    icon: 'Calculator',
    tag: 'MATH / CALC'
  },
  DECISION: {
    color: '#ec4899', // Pink
    bgLight: 'rgba(236, 72, 153, 0.12)',
    bgDark: 'rgba(236, 72, 153, 0.15)',
    borderDark: 'rgba(236, 72, 153, 0.45)',
    glow: 'rgba(236, 72, 153, 0.35)',
    icon: 'GitBranch',
    tag: 'DECISION'
  },
  TERMINATOR: {
    color: '#ef4444', // Crimson
    bgLight: 'rgba(239, 68, 68, 0.12)',
    bgDark: 'rgba(239, 68, 68, 0.15)',
    borderDark: 'rgba(239, 68, 68, 0.45)',
    glow: 'rgba(239, 68, 68, 0.35)',
    icon: 'Flag',
    tag: 'TERMINATOR'
  }
};

export const PALETTE_ITEMS: PaletteItem[] = [
  {
    type: 'TRIGGER',
    label: 'Pallet Ingest Scan',
    category: 'TRIGGER',
    description: 'Fires when an operator scans or submits pallet data on shop-floor HMI',
    defaultConfig: {
      triggerEvent: 'INBOUND_PALLET_SCANNED',
      sourceChannel: 'HMI_OPERATOR_FORM',
      requireLpn: true
    },
    iconName: 'PlayCircle',
    badgeColor: '#06b6d4',
    accentBorder: '#0891b2',
    glowColor: 'rgba(6, 182, 212, 0.4)'
  },
  {
    type: 'TRIGGER',
    label: 'Manual Click Trigger',
    category: 'TRIGGER',
    description: 'Fires instantly when an operator clicks the manual trigger button on the canvas node or HMI',
    defaultConfig: {
      triggerType: 'MANUAL_CLICK',
      triggerEvent: 'MANUAL_OPERATOR_CLICK',
      sourceChannel: 'MANUAL_CLICK',
      manualFields: []
    },
    iconName: 'MousePointerClick',
    badgeColor: '#06b6d4',
    accentBorder: '#0891b2',
    glowColor: 'rgba(6, 182, 212, 0.4)'
  },
  {
    type: 'TRIGGER',
    label: 'Custom Webhook / Event',
    category: 'TRIGGER',
    description: 'Listens for an inbound HTTP webhook, MQTT topic, or internal event',
    defaultConfig: {
      triggerEvent: 'CUSTOM_INBOUND_EVENT',
      sourceChannel: 'EXTERNAL_WEBHOOK'
    },
    iconName: 'Radio',
    badgeColor: '#06b6d4',
    accentBorder: '#0891b2',
    glowColor: 'rgba(6, 182, 212, 0.4)'
  },
  {
    type: 'VALIDATION',
    label: 'Master Data Check',
    category: 'LOGIC',
    description: 'Validates SKU, height profile, and dimensional limits against Master Data',
    defaultConfig: {
      validationType: 'PALLET_MASTER_DATA',
      rejectOnMissingSku: true,
      strictDimensions: false
    },
    iconName: 'CheckCircle2',
    badgeColor: '#a855f7',
    accentBorder: '#9333ea',
    glowColor: 'rgba(168, 85, 247, 0.4)'
  },
  {
    type: 'STATE_MUTATION',
    label: 'Mutate Pallet State',
    category: 'STATE',
    description: 'Updates pallet inventory status (e.g. IN_TRANSIT, AVAILABLE, QUARANTINED)',
    defaultConfig: {
      entityType: 'PALLET',
      status: 'IN_TRANSIT',
      location: 'AIR-LOCK-IN-01'
    },
    iconName: 'Database',
    badgeColor: '#10b981',
    accentBorder: '#059669',
    glowColor: 'rgba(168, 85, 129, 0.4)'
  },
  {
    type: 'API_MAPPER',
    label: 'Dynamic API Mapper',
    category: 'INTEGRATION',
    description: 'Transforms context and dispatches request via configured dynamic API mapping',
    defaultConfig: {
      httpMethod: 'POST',
      mappingCode: '',
      endpointUrl: '',
      outputVariable: 'apiResponse'
    },
    iconName: 'Network',
    badgeColor: '#3b82f6',
    accentBorder: '#2563eb',
    glowColor: 'rgba(59, 130, 246, 0.4)'
  },
  {
    type: 'ASYNC_GATE',
    label: 'Await Webhook / Callback',
    category: 'GATE',
    description: 'Pauses workflow execution until WMS/external system calls back with correlation ID',
    defaultConfig: {
      waitEvent: 'WMS_PALLET_CONFIRMATION',
      timeoutSeconds: 300,
      pollingFallback: false,
      pollingIntervalSec: 10
    },
    iconName: 'Hourglass',
    badgeColor: '#f59e0b',
    accentBorder: '#d97706',
    glowColor: 'rgba(245, 158, 11, 0.4)'
  },
  {
    type: 'DECISION',
    label: 'Conditional Branch',
    category: 'LOGIC',
    description: 'Branches execution flow based on condition (e.g. profile OK vs Profile Divert)',
    defaultConfig: {
      conditionExpression: 'context.status == "SUCCESS"',
      trueBranchLabel: 'Approved',
      falseBranchLabel: 'Divert / Reject'
    },
    iconName: 'GitBranch',
    badgeColor: '#ec4899',
    accentBorder: '#db2777',
    glowColor: 'rgba(236, 72, 153, 0.4)'
  },
  {
    type: 'MATH_OPERATION',
    label: 'Math & Arithmetic',
    category: 'MATH',
    description: 'Performs arithmetic calculation (add, subtract, multiply, divide, percent) on context variables',
    defaultConfig: {
      operation: 'ADD',
      operandA: '',
      operandB: '1',
      outputVariable: 'calculatedTotal'
    },
    iconName: 'Calculator',
    badgeColor: '#6366f1',
    accentBorder: '#4f46e5',
    glowColor: 'rgba(99, 102, 241, 0.4)'
  },
  {
    type: 'MATH_OPERATION',
    label: 'Gross Weight Calc',
    category: 'MATH',
    description: 'Calculates total gross weight: Tare weight + Net payload weight',
    defaultConfig: {
      operation: 'ADD',
      operandA: 'context.tareWeight',
      operandB: 'context.netWeight',
      outputVariable: 'grossWeightKg'
    },
    iconName: 'Calculator',
    badgeColor: '#6366f1',
    accentBorder: '#4f46e5',
    glowColor: 'rgba(99, 102, 241, 0.4)'
  },
  {
    type: 'TERMINATOR',
    label: 'Complete Workflow',
    category: 'TERMINAL',
    description: 'Marks workflow execution successfully finished with final context payload',
    defaultConfig: {
      completionStatus: 'COMPLETED',
      notifyOperator: true
    },
    iconName: 'Flag',
    badgeColor: '#ef4444',
    accentBorder: '#dc2626',
    glowColor: 'rgba(239, 68, 68, 0.4)'
  },
  {
    type: 'STATE_MUTATION',
    label: 'PLC Conveyor Route',
    category: 'STATE',
    description: 'Updates pallet routing to conveyor infeed / crane pickup station',
    defaultConfig: {
      entityType: 'PALLET',
      status: 'AVAILABLE',
      location: 'CONVEYOR-ROUTE-B01'
    },
    iconName: 'Database',
    badgeColor: '#10b981',
    accentBorder: '#059669',
    glowColor: 'rgba(16, 185, 129, 0.4)'
  },
  {
    type: 'TERMINATOR',
    label: 'Divert / Reject Hold',
    category: 'TERMINAL',
    description: 'Terminates workflow and diverts pallet to quarantine QA inspection lane',
    defaultConfig: {
      completionStatus: 'QUARANTINED',
      notifyOperator: true
    },
    iconName: 'Flag',
    badgeColor: '#ef4444',
    accentBorder: '#dc2626',
    glowColor: 'rgba(239, 68, 68, 0.4)'
  },
  {
    type: 'RESOURCE_ACTION',
    label: 'Resource Action',
    category: 'EQUIPMENT',
    description: 'Invoke an inherited or custom method on an industrial resource or API gateway',
    defaultConfig: {
      resourceCode: '',
      methodName: '',
      parameters: {},
      timeoutMs: 5000
    },
    iconName: 'Cpu',
    badgeColor: '#10b981',
    accentBorder: '#059669',
    glowColor: 'rgba(16, 185, 129, 0.4)'
  },
  {
    type: 'COMPOSED',
    label: 'Composed Step',
    category: 'COMPOSED',
    description: 'Reusable composite or user-defined step from template library',
    defaultConfig: {
      templateCode: '',
      parameters: {}
    },
    iconName: 'Boxes',
    badgeColor: '#8b5cf6',
    accentBorder: '#7c3aed',
    glowColor: 'rgba(139, 92, 246, 0.4)'
  }
];

export interface CanvasViewport {
  zoom: number;
  panX: number;
  panY: number;
}
