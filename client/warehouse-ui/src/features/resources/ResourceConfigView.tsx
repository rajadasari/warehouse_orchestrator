import React, { useState, useEffect, useMemo } from 'react';
import { 
  Server, 
  Plus, 
  Search, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Globe, 
  Copy, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Key,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Zap,
  Sliders,
  Layers,
  Cpu,
  Laptop,
  HardDrive
} from 'lucide-react';
import { 
  resourceService, 
  ResourceItem, 
  CreateResourcePayload 
} from '../../services/resourceService';

export interface SoftwarePropRow {
  key: string;
  value: string;
  isSecret: boolean;
  useForAuth: boolean;
  showSecret?: boolean;
}

export const ResourceConfigView: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // View Details Modal State
  const [selectedResourceDetails, setSelectedResourceDetails] = useState<ResourceItem | null>(null);

  // Auth Testing State
  const [isTestingAuth, setIsTestingAuth] = useState<boolean>(false);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authResult, setAuthResult] = useState<any>(null);

  const handleTestWmsAuth = async (targetResourceId?: string) => {
    setIsTestingAuth(true);
    setAuthResult(null);
    try {
      const res = await resourceService.testWmsAuth(targetResourceId);
      setAuthResult(res);
      setAuthModalOpen(true);
    } catch (err: any) {
      alert(`Authentication failed: ${err.message}`);
    } finally {
      setIsTestingAuth(false);
    }
  };

  // Method / Auth Configuration Modal State
  const [methodModalResource, setMethodModalResource] = useState<ResourceItem | null>(null);
  const [methodAuthType, setMethodAuthType] = useState<string>('OAUTH2_BEARER');
  const [methodTokenPath, setMethodTokenPath] = useState<string>('/WMS.Api/api/authentication');
  const [methodClientIdMode, setMethodClientIdMode] = useState<'PROPERTY' | 'DIRECT'>('PROPERTY');
  const [methodClientIdProp, setMethodClientIdProp] = useState<string>('clientId');
  const [methodClientIdDirect, setMethodClientIdDirect] = useState<string>('');
  const [methodClientSecretMode, setMethodClientSecretMode] = useState<'PROPERTY' | 'DIRECT'>('PROPERTY');
  const [methodClientSecretProp, setMethodClientSecretProp] = useState<string>('clientSecret');
  const [methodClientSecretDirect, setMethodClientSecretDirect] = useState<string>('');
  const [methodApiKeyHeader, setMethodApiKeyHeader] = useState<string>('X-API-KEY');
  const [methodApiKeyMode, setMethodApiKeyMode] = useState<'PROPERTY' | 'DIRECT'>('DIRECT');
  const [methodApiKeyProp, setMethodApiKeyProp] = useState<string>('apiKey');
  const [methodApiKeyDirect, setMethodApiKeyDirect] = useState<string>('');
  const [methodBasicUserMode, setMethodBasicUserMode] = useState<'PROPERTY' | 'DIRECT'>('DIRECT');
  const [methodBasicUserProp, setMethodBasicUserProp] = useState<string>('username');
  const [methodBasicUserDirect, setMethodBasicUserDirect] = useState<string>('');
  const [methodBasicPassMode, setMethodBasicPassMode] = useState<'PROPERTY' | 'DIRECT'>('DIRECT');
  const [methodBasicPassProp, setMethodBasicPassProp] = useState<string>('password');
  const [methodBasicPassDirect, setMethodBasicPassDirect] = useState<string>('');
  const [showMethodSecret, setShowMethodSecret] = useState<boolean>(false);
  const [isSavingMethod, setIsSavingMethod] = useState<boolean>(false);
  const [methodTestResult, setMethodTestResult] = useState<{ success: boolean; message: string; tokenSnippet?: string } | null>(null);
  const [isTestingMethod, setIsTestingMethod] = useState<boolean>(false);

  // Open Method Modal
  const handleOpenMethodModal = (res: ResourceItem) => {
    setMethodModalResource(res);
    setMethodTestResult(null);
    setShowMethodSecret(false);

    const props = res.customProperties || {};
    const existingAuth = (props.auth && typeof props.auth === 'object') ? props.auth : {};

    const detectedMethod = existingAuth.method 
      || props.authMethod 
      || ((props.clientId || props.clientSecret) ? 'OAUTH2_BEARER' : 'OAUTH2_BEARER');
    setMethodAuthType(String(detectedMethod));

    setMethodTokenPath(String(props.tokenPath || existingAuth.tokenPath || '/WMS.Api/api/authentication'));

    // Client ID
    if (existingAuth.clientIdProperty && props[existingAuth.clientIdProperty] !== undefined) {
      setMethodClientIdMode('PROPERTY');
      setMethodClientIdProp(existingAuth.clientIdProperty);
      setMethodClientIdDirect(String(props[existingAuth.clientIdProperty] || ''));
    } else if (props.clientId !== undefined) {
      setMethodClientIdMode('PROPERTY');
      setMethodClientIdProp('clientId');
      setMethodClientIdDirect(String(props.clientId));
    } else {
      setMethodClientIdMode('DIRECT');
      setMethodClientIdDirect('');
      setMethodClientIdProp('clientId');
    }

    // Client Secret
    if (existingAuth.clientSecretProperty && props[existingAuth.clientSecretProperty] !== undefined) {
      setMethodClientSecretMode('PROPERTY');
      setMethodClientSecretProp(existingAuth.clientSecretProperty);
      setMethodClientSecretDirect(String(props[existingAuth.clientSecretProperty] || ''));
    } else if (props.clientSecret !== undefined) {
      setMethodClientSecretMode('PROPERTY');
      setMethodClientSecretProp('clientSecret');
      setMethodClientSecretDirect(String(props.clientSecret));
    } else {
      setMethodClientSecretMode('DIRECT');
      setMethodClientSecretDirect('');
      setMethodClientSecretProp('clientSecret');
    }

    // API Key
    setMethodApiKeyHeader(String(props.apiKeyHeader || existingAuth.header || 'X-API-KEY'));
    if (props.apiKeyValue !== undefined) {
      setMethodApiKeyMode('PROPERTY');
      setMethodApiKeyProp('apiKeyValue');
      setMethodApiKeyDirect(String(props.apiKeyValue));
    } else {
      setMethodApiKeyMode('DIRECT');
      setMethodApiKeyDirect(String(existingAuth.key || ''));
    }

    // Basic Auth
    if (props.username !== undefined) {
      setMethodBasicUserMode('PROPERTY');
      setMethodBasicUserProp('username');
      setMethodBasicUserDirect(String(props.username));
    } else {
      setMethodBasicUserMode('DIRECT');
      setMethodBasicUserDirect(String(existingAuth.username || ''));
    }

    if (props.password !== undefined) {
      setMethodBasicPassMode('PROPERTY');
      setMethodBasicPassProp('password');
      setMethodBasicPassDirect(String(props.password));
    } else {
      setMethodBasicPassMode('DIRECT');
      setMethodBasicPassDirect(String(existingAuth.password || ''));
    }
  };

  // Test Authentication directly inside Method Modal
  const handleTestMethodAuth = async () => {
    if (!methodModalResource) return;
    setIsTestingMethod(true);
    setMethodTestResult(null);
    try {
      const updatedProps: Record<string, any> = { ...(methodModalResource.customProperties || {}) };
      const resolvedClientId = methodClientIdMode === 'PROPERTY' 
        ? (updatedProps[methodClientIdProp] !== undefined ? String(updatedProps[methodClientIdProp]) : methodClientIdDirect)
        : methodClientIdDirect;

      const resolvedClientSecret = methodClientSecretMode === 'PROPERTY'
        ? (updatedProps[methodClientSecretProp] !== undefined ? String(updatedProps[methodClientSecretProp]) : methodClientSecretDirect)
        : methodClientSecretDirect;

      const baseUrl = methodModalResource.ip || updatedProps.ip || updatedProps.baseUrl || '';

      const res = await resourceService.testAuthConnection({
        resourceId: methodModalResource.resourceId,
        baseUrl: baseUrl,
        tokenPath: methodTokenPath,
        clientId: resolvedClientId,
        clientSecret: resolvedClientSecret
      });

      if (res.success) {
        setMethodTestResult({
          success: true,
          message: res.message || 'Authentication verified successfully! Active token acquired and cached in memory.',
          tokenSnippet: res.token ? res.token.substring(0, 48) + '...' : undefined
        });
      } else {
        setMethodTestResult({
          success: false,
          message: res.error || res.message || 'Authentication failed. Check credentials and endpoint URL.'
        });
      }
    } catch (err: any) {
      setMethodTestResult({
        success: false,
        message: err.message || 'Authentication failed. Check endpoint URL and credentials.'
      });
    } finally {
      setIsTestingMethod(false);
    }
  };

  // Save Method & Authentication Configuration
  const handleSaveMethodConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!methodModalResource) return;

    setIsSavingMethod(true);
    try {
      const updatedProps: Record<string, any> = { ...(methodModalResource.customProperties || {}) };

      if (methodAuthType === 'OAUTH2_BEARER') {
        const resolvedClientId = methodClientIdMode === 'PROPERTY' 
          ? (updatedProps[methodClientIdProp] !== undefined ? updatedProps[methodClientIdProp] : methodClientIdDirect)
          : methodClientIdDirect;

        const resolvedClientSecret = methodClientSecretMode === 'PROPERTY'
          ? (updatedProps[methodClientSecretProp] !== undefined ? updatedProps[methodClientSecretProp] : methodClientSecretDirect)
          : methodClientSecretDirect;

        // Ensure direct keys are stored in customProperties so backend ResourceManager can read them
        if (resolvedClientId) updatedProps.clientId = resolvedClientId;
        if (resolvedClientSecret) updatedProps.clientSecret = resolvedClientSecret;
        if (methodTokenPath) updatedProps.tokenPath = methodTokenPath;
        updatedProps.authMethod = 'OAUTH2_BEARER';

        updatedProps.auth = {
          method: 'OAUTH2_BEARER',
          tokenPath: methodTokenPath,
          clientIdMode: methodClientIdMode,
          clientIdProperty: methodClientIdMode === 'PROPERTY' ? methodClientIdProp : undefined,
          clientIdValue: resolvedClientId,
          clientSecretMode: methodClientSecretMode,
          clientSecretProperty: methodClientSecretMode === 'PROPERTY' ? methodClientSecretProp : undefined,
          clientSecretValue: resolvedClientSecret
        };
      } else if (methodAuthType === 'API_KEY') {
        const resolvedKey = methodApiKeyMode === 'PROPERTY'
          ? (updatedProps[methodApiKeyProp] !== undefined ? updatedProps[methodApiKeyProp] : methodApiKeyDirect)
          : methodApiKeyDirect;

        updatedProps.apiKeyHeader = methodApiKeyHeader;
        if (resolvedKey) updatedProps.apiKeyValue = resolvedKey;
        updatedProps.authMethod = 'API_KEY';
        updatedProps.auth = {
          method: 'API_KEY',
          header: methodApiKeyHeader,
          keyMode: methodApiKeyMode,
          keyProperty: methodApiKeyMode === 'PROPERTY' ? methodApiKeyProp : undefined,
          keyValue: resolvedKey
        };
      } else if (methodAuthType === 'BASIC_AUTH') {
        const resolvedUser = methodBasicUserMode === 'PROPERTY'
          ? (updatedProps[methodBasicUserProp] !== undefined ? updatedProps[methodBasicUserProp] : methodBasicUserDirect)
          : methodBasicUserDirect;

        const resolvedPass = methodBasicPassMode === 'PROPERTY'
          ? (updatedProps[methodBasicPassProp] !== undefined ? updatedProps[methodBasicPassProp] : methodBasicPassDirect)
          : methodBasicPassDirect;

        if (resolvedUser) updatedProps.username = resolvedUser;
        if (resolvedPass) updatedProps.password = resolvedPass;
        updatedProps.authMethod = 'BASIC_AUTH';
        updatedProps.auth = {
          method: 'BASIC_AUTH',
          userMode: methodBasicUserMode,
          userProperty: methodBasicUserMode === 'PROPERTY' ? methodBasicUserProp : undefined,
          username: resolvedUser,
          passMode: methodBasicPassMode,
          passProperty: methodBasicPassMode === 'PROPERTY' ? methodBasicPassProp : undefined,
          password: resolvedPass
        };
      } else {
        updatedProps.authMethod = 'NONE';
        updatedProps.auth = { method: 'NONE' };
      }

      const payload: CreateResourcePayload = {
        resourceId: methodModalResource.resourceId,
        name: methodModalResource.name,
        type: methodModalResource.type,
        status: methodModalResource.status,
        ip: methodModalResource.ip,
        customProperties: updatedProps
      };

      await resourceService.updateResource(methodModalResource.resourceId, payload);
      try {
        const authCheck = await resourceService.authorizeResource(methodModalResource.resourceId);
        if (authCheck.success) {
          setSuccessMessage(`Authentication configured and active token cached in memory for '${methodModalResource.resourceId}'`);
        } else {
          setSuccessMessage(`Saved for '${methodModalResource.resourceId}'. Note: ${authCheck.error || authCheck.message}`);
        }
      } catch (authErr: any) {
        setSuccessMessage(`Authentication method and properties saved for resource '${methodModalResource.resourceId}'`);
      }
      setMethodModalResource(null);
      await loadResources();
    } catch (err: any) {
      alert(`Error saving method configuration: ${err.message}`);
    } finally {
      setIsSavingMethod(false);
    }
  };

  // Software Dynamic Properties Row Interface
  interface SoftwarePropRow {
    key: string;
    value: string;
    isSecret: boolean;
    useForAuth: boolean;
    showSecret?: boolean;
  }

  // Form State
  const [formResourceId, setFormResourceId] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<string>('SOFTWARE');
  const [formStatus, setFormStatus] = useState<string>('ACTIVE');
  const [formIp, setFormIp] = useState<string>('');
  const [formAuthMethod, setFormAuthMethod] = useState<string>('OAUTH2_BEARER');
  const [formTokenPath, setFormTokenPath] = useState<string>('/WMS.Api/api/authentication');
  const [formTokenResponseField, setFormTokenResponseField] = useState<string>('accessToken');
  const [formApiKeyHeader, setFormApiKeyHeader] = useState<string>('X-API-KEY');
  const [formApiKeyValue, setFormApiKeyValue] = useState<string>('');
  const [formUsername, setFormUsername] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [customPropRows, setCustomPropRows] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ]);
  const [softwareProps, setSoftwareProps] = useState<SoftwarePropRow[]>([
    { key: 'clientId', value: '', isSecret: false, useForAuth: true },
    { key: 'clientSecret', value: '', isSecret: true, useForAuth: true }
  ]);

  const handleAddSoftwareProp = () => {
    setSoftwareProps(prev => [...prev, { key: '', value: '', isSecret: false, useForAuth: false }]);
  };

  const handleRemoveSoftwareProp = (index: number) => {
    setSoftwareProps(prev => prev.filter((_, i) => i !== index));
  };

  const handleSoftwarePropChange = (index: number, field: keyof SoftwarePropRow, val: any) => {
    setSoftwareProps(prev => prev.map((row, i) => i === index ? { ...row, [field]: val } : row));
  };

  // Live Auth Payload Preview for Software
  const liveAuthPayload = useMemo(() => {
    const payload: Record<string, any> = {};
    softwareProps.forEach(p => {
      if (p.useForAuth && p.key.trim()) {
        payload[p.key.trim()] = p.isSecret && !p.showSecret ? '••••••••' : (p.value || '');
      }
    });
    return payload;
  }, [softwareProps]);

  // Load Resources
  const loadResources = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await resourceService.getResources();
      setResources(data);
    } catch (err: any) {
      console.error('Failed to load resources:', err);
      setErrorMessage(err.message || 'Failed to load resources from WES backend');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, []);

  // Quick auto-dismiss notification
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Filtered dataset
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        res.resourceId.toLowerCase().includes(query) ||
        res.name.toLowerCase().includes(query) ||
        (res.ip && res.ip.toLowerCase().includes(query)) ||
        res.type.toLowerCase().includes(query);

      const t = res.type.toUpperCase();
      let matchesType = true;
      if (selectedType === 'SOFTWARE') matchesType = (t === 'SOFTWARE' || t === 'WMS');
      else if (selectedType === 'PLC') matchesType = (t === 'PLC');
      else if (selectedType === 'DEVICES') matchesType = (t === 'DEVICE' || t === 'DEVICES' || t === 'EQUIPMENT');
      else if (selectedType === 'HARDWARE') matchesType = (t === 'HARDWARE');
      else if (selectedType !== 'ALL') matchesType = (t === selectedType.toUpperCase());

      const matchesStatus = selectedStatus === 'ALL' || res.status.toUpperCase() === selectedStatus.toUpperCase();

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [resources, searchQuery, selectedType, selectedStatus]);

  // Stat calculations
  const stats = useMemo(() => {
    const total = resources.length;
    const software = resources.filter(r => ['SOFTWARE', 'WMS'].includes(r.type.toUpperCase())).length;
    const plc = resources.filter(r => r.type.toUpperCase() === 'PLC').length;
    const devices = resources.filter(r => ['DEVICE', 'DEVICES', 'EQUIPMENT'].includes(r.type.toUpperCase())).length;
    const hardware = resources.filter(r => r.type.toUpperCase() === 'HARDWARE').length;
    const active = resources.filter(r => r.status.toUpperCase() === 'ACTIVE').length;
    return { total, software, plc, devices, hardware, active };
  }, [resources]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setFormResourceId('');
    setFormName('');
    let defaultType = 'SOFTWARE';
    if (selectedType === 'PLC') defaultType = 'PLC';
    else if (selectedType === 'DEVICES') defaultType = 'EQUIPMENT';
    else if (selectedType === 'HARDWARE') defaultType = 'HARDWARE';
    setFormType(defaultType);
    setFormStatus('ACTIVE');
    setFormIp('');
    setFormAuthMethod('OAUTH2_BEARER');
    setFormTokenPath('/WMS.Api/api/authentication');
    setFormTokenResponseField('accessToken');
    setFormApiKeyHeader('X-API-KEY');
    setFormApiKeyValue('');
    setFormUsername('');
    setFormPassword('');
    setCustomPropRows([{ key: '', value: '' }]);
    setSoftwareProps([
      { key: 'clientId', value: '', isSecret: false, useForAuth: true },
      { key: 'clientSecret', value: '', isSecret: true, useForAuth: true }
    ]);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (res: ResourceItem) => {
    setIsEditing(true);
    setFormResourceId(res.resourceId);
    setFormName(res.name);
    setFormType(res.type);
    setFormStatus(res.status);
    setFormIp(res.ip || '');

    const props = res.customProperties || {};
    const existingAuth = (props.auth && typeof props.auth === 'object') ? props.auth : {};
    const detectedMethod = existingAuth.method || props.authMethod || ((props.clientId || props.clientSecret) ? 'OAUTH2_BEARER' : 'NONE');
    setFormAuthMethod(String(detectedMethod));
    setFormTokenPath(String(props.tokenPath || existingAuth.tokenPath || '/WMS.Api/api/authentication'));
    setFormTokenResponseField(String(props.tokenResponseField || existingAuth.tokenResponseField || 'accessToken'));
    setFormApiKeyHeader(String(props.apiKeyHeader || existingAuth.header || 'X-API-KEY'));
    setFormApiKeyValue(String(props.apiKeyValue || existingAuth.keyValue || ''));
    setFormUsername(String(props.username || existingAuth.username || ''));
    setFormPassword(String(props.password || existingAuth.password || ''));

    // Populate softwareProps table
    const swRows: SoftwarePropRow[] = [];
    if (Array.isArray(props.properties)) {
      props.properties.forEach((p: any) => {
        if (p && p.key) {
          swRows.push({
            key: String(p.key),
            value: p.value !== undefined ? String(p.value) : '',
            isSecret: Boolean(p.isSecret),
            useForAuth: Boolean(p.useForAuth)
          });
        }
      });
    }
    if (swRows.length === 0) {
      if (props.clientId) {
        swRows.push({ key: 'clientId', value: String(props.clientId), isSecret: false, useForAuth: true });
      }
      if (props.clientSecret) {
        swRows.push({ key: 'clientSecret', value: String(props.clientSecret), isSecret: true, useForAuth: true });
      }
    }
    if (swRows.length === 0) {
      swRows.push({ key: 'clientId', value: '', isSecret: false, useForAuth: true });
      swRows.push({ key: 'clientSecret', value: '', isSecret: true, useForAuth: true });
    }
    setSoftwareProps(swRows);

    const rows: Array<{ key: string; value: string }> = [];
    if (res.customProperties) {
      Object.entries(res.customProperties).forEach(([k, v]) => {
        if (!['ip', 'ipAddress', 'host', 'port', 'protocol', 'auth', 'authMethod', 'tokenPath', 'tokenResponseField', 'clientId', 'clientSecret', 'apiKeyHeader', 'apiKeyValue', 'username', 'password', 'properties'].includes(k)) {
          rows.push({ key: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) });
        }
      });
    }
    if (rows.length === 0) {
      rows.push({ key: '', value: '' });
    }
    setCustomPropRows(rows);
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formResourceId.trim() || !formName.trim() || !formType.trim()) {
      alert('Please provide Resource ID, Resource Name, and Type');
      return;
    }

    setIsSaving(true);
    try {
      const customProps: Record<string, any> = {};

      if (formType.toUpperCase() === 'SOFTWARE' || formType.toUpperCase() === 'WMS') {
        const propList: Array<{ key: string; value: any; isSecret: boolean; useForAuth: boolean }> = [];
        const authPayload: Record<string, any> = {};

        softwareProps.forEach(row => {
          if (row.key.trim()) {
            const k = row.key.trim();
            let val: any = row.value.trim();
            if (val === 'true') val = true;
            else if (val === 'false') val = false;
            else if (!isNaN(Number(val)) && val !== '') val = Number(val);

            propList.push({
              key: k,
              value: val,
              isSecret: Boolean(row.isSecret),
              useForAuth: Boolean(row.useForAuth)
            });

            customProps[k] = val; // mirror for legacy compatibility

            if (row.useForAuth) {
              authPayload[k] = val;
            }
          }
        });

        customProps.properties = propList;

        if (formAuthMethod === 'OAUTH2_BEARER') {
          customProps.authMethod = 'OAUTH2_BEARER';
          customProps.tokenPath = formTokenPath.trim();
          customProps.tokenResponseField = formTokenResponseField.trim() || 'accessToken';
          customProps.auth = {
            method: 'OAUTH2_BEARER',
            tokenPath: formTokenPath.trim() || '/WMS.Api/api/authentication',
            tokenResponseField: formTokenResponseField.trim() || 'accessToken',
            requestPayload: authPayload
          };
          if (authPayload.clientId) customProps.clientId = authPayload.clientId;
          if (authPayload.clientSecret) customProps.clientSecret = authPayload.clientSecret;
        } else if (formAuthMethod === 'API_KEY') {
          customProps.apiKeyHeader = formApiKeyHeader.trim();
          customProps.apiKeyValue = formApiKeyValue.trim();
          customProps.authMethod = 'API_KEY';
          customProps.auth = {
            method: 'API_KEY',
            header: formApiKeyHeader.trim(),
            keyValue: formApiKeyValue.trim()
          };
        } else if (formAuthMethod === 'BASIC_AUTH') {
          customProps.username = formUsername.trim();
          customProps.password = formPassword.trim();
          customProps.authMethod = 'BASIC_AUTH';
          customProps.auth = {
            method: 'BASIC_AUTH',
            username: formUsername.trim(),
            password: formPassword.trim()
          };
        } else {
          customProps.authMethod = 'NONE';
          customProps.auth = { method: 'NONE' };
        }
      } else {
        // Non-software resources use general customPropRows
        customPropRows.forEach(row => {
          if (row.key.trim()) {
            const val = row.value.trim();
            if (val === 'true') customProps[row.key.trim()] = true;
            else if (val === 'false') customProps[row.key.trim()] = false;
            else if (!isNaN(Number(val)) && val !== '') customProps[row.key.trim()] = Number(val);
            else {
              try {
                customProps[row.key.trim()] = JSON.parse(val);
              } catch {
                customProps[row.key.trim()] = val;
              }
            }
          }
        });
      }

      const payload: CreateResourcePayload = {
        resourceId: formResourceId.trim(),
        name: formName.trim(),
        type: formType.trim().toUpperCase(),
        status: formStatus.trim().toUpperCase(),
        ip: formIp.trim() || undefined,
        customProperties: customProps
      };

      if (isEditing) {
        await resourceService.updateResource(formResourceId.trim(), payload);
        setSuccessMessage(`Resource '${formResourceId.trim()}' updated successfully`);
      } else {
        await resourceService.createResource(payload);
        setSuccessMessage(`Resource '${formResourceId.trim()}' created successfully`);
      }

      setIsModalOpen(false);
      await loadResources();
    } catch (err: any) {
      alert(`Error saving resource: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Resource
  const handleDeleteResource = async (resourceId: string) => {
    if (!window.confirm(`Are you sure you want to delete resource '${resourceId}'?`)) {
      return;
    }
    try {
      await resourceService.deleteResource(resourceId);
      setSuccessMessage(`Resource '${resourceId}' deleted successfully`);
      await loadResources();
    } catch (err: any) {
      alert(`Failed to delete resource: ${err.message}`);
    }
  };

  // Copy IP to Clipboard
  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(ip);
    setTimeout(() => setCopiedIp(null), 2000);
  };

  // Add / Remove custom property rows
  const handleAddPropRow = () => {
    setCustomPropRows(prev => [...prev, { key: '', value: '' }]);
  };

  const handleRemovePropRow = (index: number) => {
    setCustomPropRows(prev => prev.filter((_, i) => i !== index));
  };

  const handlePropChange = (index: number, field: 'key' | 'value', value: string) => {
    setCustomPropRows(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  // Helper for Type Badge Colors
  const getTypeBadgeStyle = (type: string) => {
    const t = type.toUpperCase();
    if (t === 'SOFTWARE' || t === 'WMS') {
      return {
        bg: 'rgba(124, 58, 237, 0.12)',
        color: '#8B5CF6',
        border: '1px solid rgba(139, 92, 246, 0.28)'
      };
    }
    if (t === 'PLC' || t === 'EQUIPMENT') {
      return {
        bg: 'rgba(14, 165, 233, 0.12)',
        color: '#0284C7',
        border: '1px solid rgba(2, 132, 199, 0.28)'
      };
    }
    return {
      bg: 'rgba(37, 99, 235, 0.12)',
      color: '#2563EB',
      border: '1px solid rgba(37, 99, 235, 0.28)'
    };
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-page)',
      color: 'var(--text-primary)'
    }}>
      {/* Top Header Bar */}
      <header style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-default)',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
          }}>
            <Server size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Resource Configuration
            </h1>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
              Manage WMS interfaces, PLCs, software nodes, hardware resources, and IP mappings
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadResources}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => handleTestWmsAuth()}
            disabled={isTestingAuth}
            title="Authenticate with /WMS.Api/api/authentication and inspect cached Bearer token"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              backgroundColor: 'rgba(139, 92, 246, 0.1)',
              color: '#8B5CF6',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Key size={14} className={isTestingAuth ? 'animate-spin' : ''} />
            <span>{isTestingAuth ? 'Authenticating...' : 'Test WMS Auth'}</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
            }}
          >
            <Plus size={16} />
            <span>Add Resource</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Success Alert */}
        {successMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#059669',
            fontSize: '13px'
          }}>
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#DC2626',
            fontSize: '13px'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Metrics Counter Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px'
        }}>
          {/* Card 1: Total */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Resources
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {stats.total}
            </div>
          </div>

          {/* Card 2: Software / WMS */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Software & WMS Nodes
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#8B5CF6', marginTop: '4px' }}>
              {stats.software}
            </div>
          </div>

          {/* Card 3: Hardware / PLC */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Hardware & PLCs
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0284C7', marginTop: '4px' }}>
              {stats.hardware}
            </div>
          </div>

          {/* Card 4: Active */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '10px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Systems
            </div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
              {stats.active}
            </div>
          </div>
        </div>

        {/* Category Tabs: Software, PLC, Devices, Hardware Resources */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '2px solid var(--border-default)',
          paddingBottom: '0px',
          overflowX: 'auto',
          marginTop: '4px'
        }}>
          {[
            { id: 'ALL', label: 'All Resources', icon: Layers, count: stats.total },
            { id: 'SOFTWARE', label: 'Software', icon: Cpu, count: stats.software },
            { id: 'PLC', label: 'PLC', icon: Sliders, count: stats.plc },
            { id: 'DEVICES', label: 'Devices', icon: Laptop, count: stats.devices },
            { id: 'HARDWARE', label: 'Hardware Resources', icon: HardDrive, count: stats.hardware },
          ].map(tab => {
            const isActive = selectedType === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedType(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '8px 8px 0 0',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #2563EB' : '3px solid transparent',
                  backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                  color: isActive ? '#2563EB' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13.5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                  marginBottom: '-2px'
                }}
              >
                <Icon size={16} color={isActive ? '#2563EB' : 'var(--text-secondary)'} />
                <span>{tab.label}</span>
                <span style={{
                  padding: '2px 7px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: isActive ? 'rgba(37, 99, 235, 0.15)' : 'var(--bg-surface-subtle)',
                  color: isActive ? '#2563EB' : 'var(--text-secondary)'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          padding: '12px 16px',
          borderRadius: '10px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)'
        }}>
          {/* Search Box */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-subtle)',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '6px 12px',
            minWidth: '280px'
          }}>
            <Search size={15} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search by ID, Name, IP, or Type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                color: 'var(--text-primary)',
                fontSize: '13px',
                width: '100%'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Type & Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Type:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '7px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Types</option>
                <option value="SOFTWARE">Software</option>
                <option value="PLC">PLC</option>
                <option value="DEVICES">Devices</option>
                <option value="HARDWARE">Hardware Resources</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '7px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="MAINTENANCE">Maintenance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Resources Table */}
        <div style={{
          borderRadius: '10px',
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px', gap: '10px' }}>
              <Loader2 size={24} className="animate-spin" color="#2563EB" />
              <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Loading resources from WES backend...</span>
            </div>
          ) : filteredResources.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Server size={36} color="var(--text-disabled)" style={{ margin: '0 auto 12px auto' }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                No resources found
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {searchQuery ? 'Try adjusting your search or filters' : 'Get started by creating your first resource'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleOpenCreateModal}
                  style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add Resource
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  color: 'var(--text-secondary)'
                }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Resource ID</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>IP Address</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600 }}>Custom Properties</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResources.map((res) => {
                  const typeStyle = getTypeBadgeStyle(res.type);
                  const isCopied = copiedIp === res.ip;

                  return (
                    <tr
                      key={res.id}
                      style={{
                        borderBottom: '1px solid var(--border-default)',
                        transition: 'background-color var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-subtle)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Resource ID */}
                      <td style={{ padding: '14px 16px', fontWeight: 600 }}>
                        <span style={{
                          fontFamily: 'monospace',
                          padding: '3px 7px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-surface-subtle)',
                          border: '1px solid var(--border-default)',
                          fontSize: '12px',
                          color: '#2563EB'
                        }}>
                          {res.resourceId}
                        </span>
                      </td>

                      {/* Name */}
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {res.name}
                      </td>

                      {/* Type Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '4px 9px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          backgroundColor: typeStyle.bg,
                          color: typeStyle.color,
                          border: typeStyle.border
                        }}>
                          {res.type}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            backgroundColor: res.status.toUpperCase() === 'ACTIVE' ? '#10B981' : '#94A3B8'
                          }} />
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 500,
                            color: res.status.toUpperCase() === 'ACTIVE' ? '#10B981' : 'var(--text-secondary)'
                          }}>
                            {res.status}
                          </span>
                        </div>
                      </td>

                      {/* IP Address */}
                      <td style={{ padding: '14px 16px' }}>
                        {res.ip ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Globe size={13} color="var(--text-secondary)" />
                            <span style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 500 }}>
                              {res.ip}
                            </span>
                            <button
                              onClick={() => handleCopyIp(res.ip!)}
                              title="Copy IP"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: '2px',
                                color: isCopied ? '#10B981' : 'var(--text-secondary)'
                              }}
                            >
                              {isCopied ? <Check size={13} /> : <Copy size={13} />}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-disabled)', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      {/* Custom Properties */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {res.customProperties && Object.keys(res.customProperties).length > 0 ? (
                            <>
                              {Object.entries(res.customProperties)
                                .slice(0, 2)
                                .map(([k, v]) => (
                                  <span
                                    key={k}
                                    style={{
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      backgroundColor: 'var(--bg-surface-subtle)',
                                      border: '1px solid var(--border-default)',
                                      color: 'var(--text-secondary)'
                                    }}
                                  >
                                    <strong style={{ color: 'var(--text-primary)' }}>{k}:</strong> {String(v)}
                                  </span>
                                ))}
                              {Object.keys(res.customProperties).length > 2 && (
                                <button
                                  onClick={() => setSelectedResourceDetails(res)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    fontSize: '11px',
                                    color: '#2563EB',
                                    cursor: 'pointer',
                                    fontWeight: 600
                                  }}
                                >
                                  +{Object.keys(res.customProperties).length - 2} more
                                </button>
                              )}
                            </>
                          ) : (
                            <span style={{ color: 'var(--text-disabled)', fontSize: '12px' }}>None</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleOpenMethodModal(res)}
                            title="Configure Methods & Authentication"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 9px',
                              borderRadius: '6px',
                              border: '1px solid rgba(234, 179, 8, 0.4)',
                              backgroundColor: 'rgba(234, 179, 8, 0.1)',
                              color: '#D97706',
                              cursor: 'pointer',
                              fontSize: '11.5px',
                              fontWeight: 600
                            }}
                          >
                            <Key size={13} />
                            <span>Methods</span>
                          </button>
                          <button
                            onClick={() => setSelectedResourceDetails(res)}
                            title="View Details"
                            style={{
                              border: '1px solid var(--border-default)',
                              background: 'var(--bg-surface)',
                              color: 'var(--text-secondary)',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '11.5px',
                              fontWeight: 500
                            }}
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(res)}
                            title="Edit Resource"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#2563EB',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteResource(res.resourceId)}
                            title="Delete Resource"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#EF4444',
                              cursor: 'pointer',
                              padding: '4px'
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CREATE / EDIT RESOURCE MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: (formType === 'SOFTWARE' || formType === 'WMS') ? '740px' : '560px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflow: 'hidden',
            transition: 'max-width 0.2s ease'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  {isEditing ? `Edit Resource: ${formResourceId}` : 'Add New Resource'}
                </h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Configure warehouse software, WMS, PLC, or hardware nodes
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveResource} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                
                {/* Resource ID */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Resource ID *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    placeholder="e.g. LOGIQS-AMBIENT-WMS"
                    value={formResourceId}
                    onChange={(e) => setFormResourceId(e.target.value.toUpperCase())}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: isEditing ? 'var(--bg-surface-subtle)' : 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      boxSizing: 'border-box'
                    }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Unique identifier used across WES execution and task routing
                  </span>
                </div>

                {/* Resource Name */}
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Resource Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Logiqs Ambient WMS"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Row: Type & Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Type *
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="SOFTWARE">Software / WMS</option>
                      <option value="PLC">PLC Controller</option>
                      <option value="EQUIPMENT">Device / Equipment</option>
                      <option value="HARDWARE">Hardware Resource</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Status *
                    </label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="MAINTENANCE">MAINTENANCE</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Form Sections: Software / WMS vs Hardware / PLC / Devices */}
                {(formType.toUpperCase() === 'SOFTWARE' || formType.toUpperCase() === 'WMS') ? (
                  <>
                    {/* Base URL */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Base URL (e.g. http://10.21.37.11:5000 or https://api.wms.internal) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required
                          placeholder="e.g. http://10.21.37.11:5000 or https://api.wms.internal"
                          value={formIp}
                          onChange={(e) => setFormIp(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px 8px 32px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box'
                          }}
                        />
                        <Globe size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>
                        Enter the full URL including scheme (http:// or https://) or IP:port. The scheme is preserved for API communication.
                      </span>
                    </div>

                    {/* Authentication & Credentials Section */}
                    <div style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#2563EB' }}>
                          <Key size={15} />
                          <span>Authentication & Properties</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Dynamic software auth schema
                        </span>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                          Auth Method
                        </label>
                        <select
                          value={formAuthMethod}
                          onChange={(e) => setFormAuthMethod(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--text-primary)',
                            fontSize: '12.5px'
                          }}
                        >
                          <option value="OAUTH2_BEARER">OAuth 2.0 / Dynamic Bearer Token</option>
                          <option value="API_KEY">API Key Header</option>
                          <option value="BASIC_AUTH">HTTP Basic Authentication</option>
                          <option value="NONE">No Authentication (Open Endpoint)</option>
                        </select>
                      </div>

                      {formAuthMethod === 'OAUTH2_BEARER' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                                Token Endpoint Path
                              </label>
                              <input
                                type="text"
                                placeholder="e.g. /WMS.Api/api/authentication"
                                value={formTokenPath}
                                onChange={(e) => setFormTokenPath(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-default)',
                                  backgroundColor: 'var(--bg-page)',
                                  color: 'var(--text-primary)',
                                  fontSize: '12.5px',
                                  fontFamily: 'monospace',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>

                            <div>
                              <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                                Token Response Field
                              </label>
                              <input
                                type="text"
                                placeholder="accessToken (or access_token, token)"
                                value={formTokenResponseField}
                                onChange={(e) => setFormTokenResponseField(e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '7px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-default)',
                                  backgroundColor: 'var(--bg-page)',
                                  color: 'var(--text-primary)',
                                  fontSize: '12.5px',
                                  fontFamily: 'monospace',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </div>
                          </div>

                          {/* Resource Properties Table */}
                          <div style={{
                            marginTop: '2px',
                            border: '1px solid var(--border-default)',
                            borderRadius: '8px',
                            backgroundColor: 'var(--bg-page)',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              padding: '10px 12px',
                              borderBottom: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-surface-subtle)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                                  Resource Properties Table
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  Configure dynamic properties. Check <strong>Use for Auth?</strong> to include in auth request body.
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleAddSoftwareProp}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: '#2563EB',
                                  color: '#ffffff',
                                  border: 'none',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                <Plus size={13} />
                                <span>Add Property</span>
                              </button>
                            </div>

                            <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '11px' }}>
                                    <th style={{ padding: '8px 10px', fontWeight: 600, width: '32%' }}>Property Key</th>
                                    <th style={{ padding: '8px 10px', fontWeight: 600, width: '36%' }}>Property Value</th>
                                    <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center', width: '12%' }}>Secret?</th>
                                    <th style={{ padding: '8px 10px', fontWeight: 600, textAlign: 'center', width: '12%' }}>Use for Auth?</th>
                                    <th style={{ padding: '8px 6px', fontWeight: 600, textAlign: 'center', width: '8%' }}>Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {softwareProps.length === 0 ? (
                                    <tr>
                                      <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                                        No properties added yet. Click "+ Add Property" to add properties.
                                      </td>
                                    </tr>
                                  ) : (
                                    softwareProps.map((prop, idx) => (
                                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-default)' }}>
                                        <td style={{ padding: '6px 10px' }}>
                                          <input
                                            type="text"
                                            placeholder="e.g. clientId, username, grant_type"
                                            value={prop.key}
                                            onChange={(e) => handleSoftwarePropChange(idx, 'key', e.target.value)}
                                            style={{
                                              width: '100%',
                                              padding: '5px 8px',
                                              borderRadius: '5px',
                                              border: '1px solid var(--border-default)',
                                              backgroundColor: 'var(--bg-page)',
                                              color: 'var(--text-primary)',
                                              fontSize: '11.5px',
                                              fontFamily: 'monospace',
                                              boxSizing: 'border-box'
                                            }}
                                          />
                                        </td>
                                        <td style={{ padding: '6px 10px' }}>
                                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                              type={prop.isSecret && !prop.showSecret ? 'password' : 'text'}
                                              placeholder={prop.isSecret ? '••••••••' : 'Property value'}
                                              value={prop.value}
                                              onChange={(e) => handleSoftwarePropChange(idx, 'value', e.target.value)}
                                              style={{
                                                width: '100%',
                                                padding: prop.isSecret ? '5px 28px 5px 8px' : '5px 8px',
                                                borderRadius: '5px',
                                                border: '1px solid var(--border-default)',
                                                backgroundColor: 'var(--bg-page)',
                                                color: 'var(--text-primary)',
                                                fontSize: '11.5px',
                                                boxSizing: 'border-box'
                                              }}
                                            />
                                            {prop.isSecret && (
                                              <button
                                                type="button"
                                                onClick={() => handleSoftwarePropChange(idx, 'showSecret', !prop.showSecret)}
                                                style={{
                                                  position: 'absolute',
                                                  right: '6px',
                                                  border: 'none',
                                                  background: 'transparent',
                                                  cursor: 'pointer',
                                                  color: 'var(--text-secondary)',
                                                  padding: 0,
                                                  display: 'flex',
                                                  alignItems: 'center'
                                                }}
                                                title={prop.showSecret ? 'Hide secret' : 'Show secret'}
                                              >
                                                {prop.showSecret ? <EyeOff size={13} /> : <Eye size={13} />}
                                              </button>
                                            )}
                                          </div>
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                          <input
                                            type="checkbox"
                                            checked={prop.isSecret}
                                            onChange={(e) => handleSoftwarePropChange(idx, 'isSecret', e.target.checked)}
                                            style={{ cursor: 'pointer' }}
                                            title="Mask value as secret"
                                          />
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                          <input
                                            type="checkbox"
                                            checked={prop.useForAuth}
                                            onChange={(e) => handleSoftwarePropChange(idx, 'useForAuth', e.target.checked)}
                                            style={{ cursor: 'pointer' }}
                                            title="Include in authentication payload"
                                          />
                                        </td>
                                        <td style={{ padding: '6px 6px', textAlign: 'center' }}>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveSoftwareProp(idx)}
                                            style={{
                                              border: 'none',
                                              background: 'transparent',
                                              color: '#EF4444',
                                              cursor: 'pointer',
                                              padding: '4px',
                                              borderRadius: '4px'
                                            }}
                                            title="Remove property"
                                          >
                                            <Trash2 size={13} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>

                            {/* Live Auth Payload Preview */}
                            <div style={{
                              padding: '10px 12px',
                              borderTop: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-surface-subtle)'
                            }}>
                              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Zap size={12} color="#F59E0B" />
                                <span>Generated Auth POST Request Payload:</span>
                              </div>
                              <pre style={{
                                margin: 0,
                                padding: '8px',
                                borderRadius: '6px',
                                backgroundColor: '#0F172A',
                                color: '#38BDF8',
                                fontSize: '11px',
                                fontFamily: 'monospace',
                                overflowX: 'auto',
                                maxHeight: '90px'
                              }}>
                                {JSON.stringify(liveAuthPayload, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}

                      {formAuthMethod === 'API_KEY' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Header Name</label>
                            <input
                              type="text"
                              value={formApiKeyHeader}
                              onChange={(e) => setFormApiKeyHeader(e.target.value)}
                              placeholder="X-API-KEY"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '12.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>API Key Value</label>
                            <input
                              type="text"
                              value={formApiKeyValue}
                              onChange={(e) => setFormApiKeyValue(e.target.value)}
                              placeholder="API Key"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '12.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}

                      {formAuthMethod === 'BASIC_AUTH' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Username</label>
                            <input
                              type="text"
                              value={formUsername}
                              onChange={(e) => setFormUsername(e.target.value)}
                              placeholder="Username"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '12.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Password</label>
                            <input
                              type="password"
                              value={formPassword}
                              onChange={(e) => setFormPassword(e.target.value)}
                              placeholder="••••••••"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '12.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* IP Address / Host with Port for Hardware / PLC / Devices */}
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                        Server Address / Host IP (e.g. 10.21.37.11:5000) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 10.21.37.11:5000"
                          value={formIp}
                          onChange={(e) => setFormIp(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px 8px 32px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box'
                          }}
                        />
                        <Globe size={15} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                      </div>
                    </div>

                    {/* Authentication Section for Hardware / PLC */}
                    <div style={{
                      padding: '14px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-surface-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: 700, color: '#2563EB' }}>
                          <Key size={15} />
                          <span>Authentication Configuration</span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Device connection credentials
                        </span>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                          Auth Method
                        </label>
                        <select
                          value={formAuthMethod}
                          onChange={(e) => setFormAuthMethod(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--text-primary)',
                            fontSize: '12.5px'
                          }}
                        >
                          <option value="NONE">No Authentication (Open / Industrial)</option>
                          <option value="API_KEY">API Key Header</option>
                          <option value="BASIC_AUTH">HTTP Basic Authentication</option>
                          <option value="OAUTH2_BEARER">OAuth 2.0 Bearer Token</option>
                        </select>
                      </div>

                      {formAuthMethod === 'BASIC_AUTH' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Username</label>
                            <input
                              type="text"
                              value={formUsername}
                              onChange={(e) => setFormUsername(e.target.value)}
                              placeholder="Username"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '12.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Password</label>
                            <input
                              type="password"
                              value={formPassword}
                              onChange={(e) => setFormPassword(e.target.value)}
                              placeholder="••••••••"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '12.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}

                      {formAuthMethod === 'API_KEY' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>Header Name</label>
                            <input
                              type="text"
                              value={formApiKeyHeader}
                              onChange={(e) => setFormApiKeyHeader(e.target.value)}
                              placeholder="X-API-KEY"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '12.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>API Key Value</label>
                            <input
                              type="text"
                              value={formApiKeyValue}
                              onChange={(e) => setFormApiKeyValue(e.target.value)}
                              placeholder="API Key"
                              style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', fontSize: '12.5px', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dynamic Custom Properties Section for Hardware/PLC */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 600 }}>
                          Custom Hardware Properties
                        </label>
                        <button
                          type="button"
                          onClick={handleAddPropRow}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: 'none',
                            background: 'transparent',
                            color: '#2563EB',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={13} />
                          <span>Add Property</span>
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {customPropRows.map((row, index) => (
                          <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="text"
                              placeholder="Property Key (e.g. port, rack, slot)"
                              value={row.key}
                              onChange={(e) => handlePropChange(index, 'key', e.target.value)}
                              style={{
                                flex: 1,
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-page)',
                                color: 'var(--text-primary)',
                                fontSize: '12px'
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Value (e.g. 502, 1, 0)"
                              value={row.value}
                              onChange={(e) => handlePropChange(index, 'value', e.target.value)}
                              style={{
                                flex: 1.5,
                                padding: '6px 10px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-page)',
                                color: 'var(--text-primary)',
                                fontSize: '12px'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePropRow(index)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#EF4444',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  <span>{isEditing ? 'Save Changes' : 'Create Resource'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESOURCE DETAILS INSPECT MODAL */}
      {selectedResourceDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '500px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  {selectedResourceDetails.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedResourceDetails(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Resource ID:</span>
                <div style={{ fontWeight: 600, fontFamily: 'monospace', color: '#2563EB' }}>
                  {selectedResourceDetails.resourceId}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Type:</span>
                <div style={{ fontWeight: 600 }}>{selectedResourceDetails.type}</div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                <div style={{ fontWeight: 600, color: selectedResourceDetails.status === 'ACTIVE' ? '#10B981' : 'inherit' }}>
                  {selectedResourceDetails.status}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>IP Address:</span>
                <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                  {selectedResourceDetails.ip || '—'}
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                All Custom Properties (JSON):
              </span>
              <pre style={{
                margin: 0,
                padding: '12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-default)',
                fontSize: '12px',
                fontFamily: 'monospace',
                overflowX: 'auto',
                color: 'var(--text-primary)'
              }}>
                {JSON.stringify(selectedResourceDetails.customProperties || {}, null, 2)}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                onClick={() => setSelectedResourceDetails(null)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WMS AUTHENTICATION TOKEN INSPECTOR MODAL */}
      {authModalOpen && authResult && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: authResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: authResult.success ? '#10B981' : '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {authResult.success ? <Shield size={18} /> : <AlertCircle size={18} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                    WMS Authentication Status
                  </h3>
                  <span style={{ fontSize: '11.5px', color: authResult.success ? '#10B981' : '#EF4444', fontWeight: 600 }}>
                    ● {authResult.success ? 'Token Active & Saved in Memory' : 'Authentication Rejected / Error'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAuthModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              padding: '12px 14px',
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-default)',
              fontSize: '12.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div><strong>Resource:</strong> <code style={{ color: '#2563EB' }}>{authResult.status?.resourceId || 'Default'}</code></div>
              <div><strong>Endpoint:</strong> <code style={{ color: '#2563EB' }}>POST {authResult.status?.authEndpoint || '/WMS.Api/api/authentication'}</code></div>
              <div><strong>Target Host:</strong> <code>{authResult.status?.targetBaseUrl || '—'}</code></div>
              <div><strong>Header Format:</strong> <code style={{ color: '#8B5CF6' }}>{authResult.status?.headerFormat || 'Bearer <token>'}</code></div>
              {authResult.status?.expiresAt && <div><strong>Expires At:</strong> <code>{authResult.status.expiresAt}</code></div>}
              {authResult.error && (
                <div style={{ color: '#EF4444', marginTop: '4px', wordBreak: 'break-all' }}>
                  <strong>Server Response / Error:</strong> {authResult.error}
                </div>
              )}
            </div>

            {authResult.token && (
              <div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Active Access Token (In-Memory Bearer):
                </span>
                <pre style={{
                  margin: 0,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-default)',
                  fontSize: '11.5px',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  color: 'var(--text-primary)'
                }}>
                  {authResult.token}
                </pre>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                onClick={() => setAuthModalOpen(false)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESOURCE METHODS & AUTHENTICATION MODAL */}
      {methodModalResource && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '620px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '92vh',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(234, 179, 8, 0.15)',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Key size={18} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                    Methods & Authentication Config
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                      {methodModalResource.resourceId}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      • {methodModalResource.name}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMethodModalResource(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveMethodConfig} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                
                {/* Section Banner */}
                <div style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(37, 99, 235, 0.05)',
                  border: '1px solid rgba(37, 99, 235, 0.2)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}>
                  <Sliders size={18} color="#2563EB" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    <strong>Authentication Method & Properties:</strong> Select the method used to connect and authenticate against this resource. You can select properties defined in this resource or enter direct values.
                  </div>
                </div>

                {/* Authentication Method Dropdown */}
                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, marginBottom: '6px' }}>
                    Authentication Method *
                  </label>
                  <select
                    value={methodAuthType}
                    onChange={(e) => {
                      setMethodAuthType(e.target.value);
                      setMethodTestResult(null);
                    }}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="OAUTH2_BEARER">OAuth 2.0 / Bearer Token (Logiqs WMS, Cloud API)</option>
                    <option value="API_KEY">API Key / Custom Header (e.g. X-API-KEY)</option>
                    <option value="BASIC_AUTH">HTTP Basic Authentication (Username & Password)</option>
                    <option value="NONE">No Authentication (Open / Internal Network)</option>
                  </select>
                </div>

                {/* METHOD TYPE: OAUTH2_BEARER */}
                {methodAuthType === 'OAUTH2_BEARER' && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>
                      <Lock size={14} />
                      <span>OAuth 2.0 Bearer Token Settings</span>
                    </div>

                    {/* Token Endpoint URL */}
                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                        Token Endpoint Path / URL *
                      </label>
                      <input
                        type="text"
                        required
                        value={methodTokenPath}
                        onChange={(e) => setMethodTokenPath(e.target.value)}
                        placeholder="/WMS.Api/api/authentication"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '12.5px',
                          fontFamily: 'monospace',
                          boxSizing: 'border-box'
                        }}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Relative to Resource Host (e.g. <code>{methodModalResource.ip?.startsWith('http') ? methodModalResource.ip : `http://${methodModalResource.ip || 'your-server'}`}{methodTokenPath}</code>)
                      </span>
                    </div>

                    {/* Client ID Property Selector & Feasibility */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 600 }}>
                          Client ID Property Feasibility
                        </label>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                          <button
                            type="button"
                            onClick={() => setMethodClientIdMode('PROPERTY')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: methodClientIdMode === 'PROPERTY' ? '#2563EB' : 'var(--text-secondary)',
                              fontWeight: methodClientIdMode === 'PROPERTY' ? 700 : 400,
                              cursor: 'pointer',
                              textDecoration: methodClientIdMode === 'PROPERTY' ? 'underline' : 'none'
                            }}
                          >
                            Select Resource Property
                          </button>
                          <span>|</span>
                          <button
                            type="button"
                            onClick={() => setMethodClientIdMode('DIRECT')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: methodClientIdMode === 'DIRECT' ? '#2563EB' : 'var(--text-secondary)',
                              fontWeight: methodClientIdMode === 'DIRECT' ? 700 : 400,
                              cursor: 'pointer',
                              textDecoration: methodClientIdMode === 'DIRECT' ? 'underline' : 'none'
                            }}
                          >
                            Direct Value
                          </button>
                        </div>
                      </div>

                      {methodClientIdMode === 'PROPERTY' ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select
                            value={methodClientIdProp}
                            onChange={(e) => {
                              setMethodClientIdProp(e.target.value);
                              const existing = methodModalResource.customProperties?.[e.target.value];
                              if (existing !== undefined) setMethodClientIdDirect(String(existing));
                            }}
                            style={{
                              flex: 1,
                              padding: '7px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--text-primary)',
                              fontSize: '12.5px'
                            }}
                          >
                            <option value="clientId">Property: 'clientId'</option>
                            {Object.keys(methodModalResource.customProperties || {})
                              .filter(k => k !== 'clientId' && k !== 'clientSecret' && k !== 'auth')
                              .map(k => (
                                <option key={k} value={k}>Property: '{k}'</option>
                              ))}
                          </select>
                          <input
                            type="text"
                            placeholder="Current Value"
                            value={methodClientIdDirect || (methodModalResource.customProperties?.[methodClientIdProp] !== undefined ? String(methodModalResource.customProperties[methodClientIdProp]) : '')}
                            onChange={(e) => setMethodClientIdDirect(e.target.value)}
                            style={{
                              flex: 1.2,
                              padding: '7px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--text-primary)',
                              fontSize: '12.5px'
                            }}
                          />
                        </div>
                      ) : (
                        <input
                          type="text"
                          placeholder="e.g. logiqs-client-01"
                          value={methodClientIdDirect}
                          onChange={(e) => setMethodClientIdDirect(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-default)',
                            backgroundColor: 'var(--bg-page)',
                            color: 'var(--text-primary)',
                            fontSize: '12.5px',
                            boxSizing: 'border-box'
                          }}
                        />
                      )}
                    </div>

                    {/* Client Secret Property Selector & Feasibility */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 600 }}>
                          Client Secret Property Feasibility
                        </label>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                          <button
                            type="button"
                            onClick={() => setMethodClientSecretMode('PROPERTY')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: methodClientSecretMode === 'PROPERTY' ? '#2563EB' : 'var(--text-secondary)',
                              fontWeight: methodClientSecretMode === 'PROPERTY' ? 700 : 400,
                              cursor: 'pointer',
                              textDecoration: methodClientSecretMode === 'PROPERTY' ? 'underline' : 'none'
                            }}
                          >
                            Select Resource Property
                          </button>
                          <span>|</span>
                          <button
                            type="button"
                            onClick={() => setMethodClientSecretMode('DIRECT')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: methodClientSecretMode === 'DIRECT' ? '#2563EB' : 'var(--text-secondary)',
                              fontWeight: methodClientSecretMode === 'DIRECT' ? 700 : 400,
                              cursor: 'pointer',
                              textDecoration: methodClientSecretMode === 'DIRECT' ? 'underline' : 'none'
                            }}
                          >
                            Direct Value
                          </button>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {methodClientSecretMode === 'PROPERTY' && (
                          <select
                            value={methodClientSecretProp}
                            onChange={(e) => {
                              setMethodClientSecretProp(e.target.value);
                              const existing = methodModalResource.customProperties?.[e.target.value];
                              if (existing !== undefined) setMethodClientSecretDirect(String(existing));
                            }}
                            style={{
                              flex: 1,
                              padding: '7px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--text-primary)',
                              fontSize: '12.5px'
                            }}
                          >
                            <option value="clientSecret">Property: 'clientSecret'</option>
                            {Object.keys(methodModalResource.customProperties || {})
                              .filter(k => k !== 'clientId' && k !== 'clientSecret' && k !== 'auth')
                              .map(k => (
                                <option key={k} value={k}>Property: '{k}'</option>
                              ))}
                          </select>
                        )}
                        <div style={{ flex: methodClientSecretMode === 'PROPERTY' ? 1.2 : 1, position: 'relative' }}>
                          <input
                            type={showMethodSecret ? 'text' : 'password'}
                            placeholder="Secret value"
                            value={methodClientSecretDirect || (methodModalResource.customProperties?.[methodClientSecretProp] !== undefined ? String(methodModalResource.customProperties[methodClientSecretProp]) : '')}
                            onChange={(e) => setMethodClientSecretDirect(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '7px 32px 7px 10px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-default)',
                              backgroundColor: 'var(--bg-page)',
                              color: 'var(--text-primary)',
                              fontSize: '12.5px',
                              boxSizing: 'border-box'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowMethodSecret(!showMethodSecret)}
                            style={{
                              position: 'absolute',
                              right: '8px',
                              top: '7px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {showMethodSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* METHOD TYPE: API_KEY */}
                {methodAuthType === 'API_KEY' && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#8B5CF6' }}>
                      <Lock size={14} />
                      <span>API Key / Header Settings</span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                        Header Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={methodApiKeyHeader}
                        onChange={(e) => setMethodApiKeyHeader(e.target.value)}
                        placeholder="X-API-KEY or Authorization"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '12.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                        API Key Value / Property
                      </label>
                      <input
                        type="text"
                        value={methodApiKeyDirect}
                        onChange={(e) => setMethodApiKeyDirect(e.target.value)}
                        placeholder="Enter API Key Value"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '12.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* METHOD TYPE: BASIC_AUTH */}
                {methodAuthType === 'BASIC_AUTH' && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    padding: '16px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                      <Lock size={14} />
                      <span>HTTP Basic Authentication</span>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                        Username
                      </label>
                      <input
                        type="text"
                        value={methodBasicUserDirect}
                        onChange={(e) => setMethodBasicUserDirect(e.target.value)}
                        placeholder="admin"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '12.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '4px' }}>
                        Password
                      </label>
                      <input
                        type="password"
                        value={methodBasicPassDirect}
                        onChange={(e) => setMethodBasicPassDirect(e.target.value)}
                        placeholder="••••••••"
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: 'var(--bg-page)',
                          color: 'var(--text-primary)',
                          fontSize: '12.5px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* METHOD TYPE: NONE */}
                {methodAuthType === 'NONE' && (
                  <div style={{
                    padding: '14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(100, 116, 139, 0.08)',
                    border: '1px solid var(--border-default)',
                    fontSize: '12.5px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5
                  }}>
                    <strong>Open Endpoints:</strong> No authentication tokens or authorization headers will be sent for this resource. Requests will be dispatched directly to target endpoints without credentials.
                  </div>
                )}

                {/* LIVE METHOD TEST SECTION */}
                <div style={{
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Live Authentication Verification
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Verify credentials against resource endpoint before saving
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleTestMethodAuth}
                      disabled={isTestingMethod}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        border: '1px solid rgba(37, 99, 235, 0.3)',
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        color: '#2563EB',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: isTestingMethod ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {isTestingMethod ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                      <span>{isTestingMethod ? 'Verifying...' : 'Test Auth Method'}</span>
                    </button>
                  </div>

                  {methodTestResult && (
                    <div style={{
                      marginTop: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: methodTestResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${methodTestResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}>
                      {methodTestResult.success ? (
                        <CheckCircle2 size={16} color="#059669" style={{ marginTop: '2px', flexShrink: 0 }} />
                      ) : (
                        <AlertCircle size={16} color="#DC2626" style={{ marginTop: '2px', flexShrink: 0 }} />
                      )}
                      <div style={{ fontSize: '11.5px', color: methodTestResult.success ? '#059669' : '#DC2626' }}>
                        <div>{methodTestResult.message}</div>
                        {methodTestResult.tokenSnippet && (
                          <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-primary)' }}>
                            Token: {methodTestResult.tokenSnippet}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '10px'
              }}>
                <button
                  type="button"
                  onClick={() => setMethodModalResource(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingMethod}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isSavingMethod ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSavingMethod ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{isSavingMethod ? 'Saving...' : 'Save Method Configuration'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
