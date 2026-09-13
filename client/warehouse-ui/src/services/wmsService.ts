export interface PalletPreAnnouncePayload {
  palletLpn: string;
  palletTypeCode: string;
  itemCode?: string;
  skuCode?: string;
  quantity?: number;
  uom?: string;
  lotNumber?: string;
  expiryDate?: string;
  actualWeightKg?: number;
  sourceLocation?: string;
  targetResourceId?: string;
}

export interface WmsPreAnnounceResult {
  successful: boolean;
  preAnnounceId?: string;
  palletLpn?: string;
  errorMessage?: string;
}

export interface CreateOrderPayload {
  clientOrderRef: string;
  orderType: string;
  palletLpn: string;
  itemCode?: string;
  skuCode?: string;
  quantity?: number;
  destinationLocation: string;
}

export interface WmsOrderResult {
  successful: boolean;
  wmsOrderId?: string;
  orderNumber?: string;
  errorMessage?: string;
}

export interface ReserveOrderPayload {
  wmsOrderId: string;
  palletLpn: string;
}

export interface WmsReserveResult {
  successful: boolean;
  reservationId?: string;
  wmsOrderId?: string;
  palletLpn?: string;
  errorMessage?: string;
}

export interface SendToOutboundPayload {
  wmsOrderId: string;
  palletLpn: string;
  targetDockLocation?: string;
}

export interface WmsOutboundResult {
  successful: boolean;
  wmsOrderId?: string;
  palletLpn?: string;
  outboundStageSpur?: string;
  errorMessage?: string;
}

export interface WmsTransactionLog {
  id: string;
  transactionType: string;
  palletLpn?: string;
  orderReference?: string;
  wmsReferenceId?: string;
  status: string;
  details?: string;
  payload?: any;
  responsePayload?: any;
  createdAt: string;
}

export interface WmsTokenStatus {
  resourceId?: string;
  hasToken: boolean;
  tokenPreview?: string;
  endpointUrl?: string;
  targetBaseUrl?: string;
  authEndpoint?: string;
  expiresAt?: string;
  remainingSeconds?: number;
  requiresRefresh?: boolean;
}

const BASE_URL = '/api/v1/wes/wms';

export const wmsService = {
  // Pre-announce
  preAnnounce: async (payload: PalletPreAnnouncePayload): Promise<WmsPreAnnounceResult> => {
    const res = await fetch(`${BASE_URL}/pre-announce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Pre-announce failed: HTTP ${res.status}`);
    }
    return res.json();
  },

  // Create Order
  createOrder: async (payload: CreateOrderPayload): Promise<WmsOrderResult> => {
    const res = await fetch(`${BASE_URL}/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Create order failed: HTTP ${res.status}`);
    }
    return res.json();
  },

  // Reserve Order
  reserveOrder: async (payload: ReserveOrderPayload): Promise<WmsReserveResult> => {
    const res = await fetch(`${BASE_URL}/orders/reserve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Reserve order failed: HTTP ${res.status}`);
    }
    return res.json();
  },

  // Outbound Release
  sendToOutbound: async (payload: SendToOutboundPayload): Promise<WmsOutboundResult> => {
    const res = await fetch(`${BASE_URL}/orders/release`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Outbound release failed: HTTP ${res.status}`);
    }
    return res.json();
  },

  // Transactions Audit Logs
  getTransactions: async (): Promise<WmsTransactionLog[]> => {
    const res = await fetch(`${BASE_URL}/transactions`);
    if (!res.ok) {
      throw new Error(`Failed to load transactions: HTTP ${res.status}`);
    }
    return res.json();
  },

  // Token Diagnostics
  getTokenStatus: async (resourceId?: string): Promise<WmsTokenStatus> => {
    const query = resourceId ? `?resourceId=${encodeURIComponent(resourceId)}` : '';
    const res = await fetch(`${BASE_URL}/auth/status${query}`);
    if (!res.ok) {
      throw new Error(`Failed to get auth status: HTTP ${res.status}`);
    }
    return res.json();
  },

  refreshToken: async (resourceId?: string): Promise<any> => {
    const query = resourceId ? `?resourceId=${encodeURIComponent(resourceId)}` : '';
    const res = await fetch(`${BASE_URL}/auth/refresh${query}`, { method: 'POST' });
    if (!res.ok) {
      throw new Error(`Failed to refresh token: HTTP ${res.status}`);
    }
    return res.json();
  }
};
