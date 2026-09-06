export interface RoleItem {
  id: string;
  roleCode: string;
  roleName: string;
  description: string;
  isSystemRole: boolean;
  permissions: string[];
}

export interface UserItem {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  roleName: string;
  permissions: string[];
  facilityId: string;
  defaultZone: string;
  operatorBadgeId?: string;
  ssoProvider: 'LOCAL' | 'AZURE_AD' | 'OKTA';
  status: 'ACTIVE' | 'LOCKED' | 'SUSPENDED';
  forcePasswordChange: boolean;
  failedAttempts: number;
  lastLoginAt: string;
  createdAt?: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  roleName: string;
  permissions: string[];
  facilityId: string;
  defaultZone: string;
  ssoProvider: string;
  status: string;
  forcePasswordChange: boolean;
}

export interface CreateUserPayload {
  username: string;
  fullName: string;
  email?: string;
  role: string;
  facilityId?: string;
  defaultZone?: string;
  operatorBadgeId?: string;
  password?: string;
}

const BASE_URL = '/api/v1/auth';

export async function loginApi(params: {
  username?: string;
  password?: string;
  badgeId?: string;
  authMode?: 'CREDENTIALS' | 'BADGE' | 'SSO';
}): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    let errorMsg = 'Authentication failed';
    try {
      const errorData = await response.json();
      if (errorData?.message) errorMsg = errorData.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function fetchUsersApi(): Promise<UserItem[]> {
  const response = await fetch(`${BASE_URL}/users`, {
    headers: {
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch users: ${response.statusText}`);
  }

  return response.json();
}

export async function fetchRolesApi(): Promise<RoleItem[]> {
  const response = await fetch(`${BASE_URL}/roles`, {
    headers: {
      'Accept': 'application/json',
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch roles: ${response.statusText}`);
  }

  return response.json();
}

export async function createUserApi(payload: CreateUserPayload): Promise<UserItem> {
  const response = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = 'Failed to provision user';
    try {
      const err = await response.json();
      if (err?.message) errorMsg = err.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export interface ChangePasswordPayload {
  username: string;
  currentPassword: string;
  newPassword: string;
}

export async function changePasswordApi(payload: ChangePasswordPayload): Promise<LoginResponse> {
  const response = await fetch(`${BASE_URL}/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorMsg = 'Failed to update password';
    try {
      const err = await response.json();
      if (err?.message) errorMsg = err.message;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

