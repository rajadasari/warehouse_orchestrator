import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Network, 
  Plus, 
  Search, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Copy, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Code2,
  Play,
  Sparkles,
  Eye,
  Server,
  Send,
  ShieldCheck,
  Zap,
  Globe,
  Sliders,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { 
  dynamicMappingService, 
  ApiIntegrationMappingItem, 
  SchemaDictionary 
} from '../../services/dynamicMappingService';
import { fetchResourcesApi, resourceService, ResourceItem } from '../../services/resourceService';

export const ApiMappingManagerView: React.FC = () => {
  const [mappings, setMappings] = useState<ApiIntegrationMappingItem[]>([]);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [dictionary, setDictionary] = useState<SchemaDictionary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedResourceFilter, setSelectedResourceFilter] = useState<string>('ALL');
  const [selectedOperationFilter, setSelectedOperationFilter] = useState<string>('ALL');

  // Modal / Editor State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form Fields
  const [formMappingCode, setFormMappingCode] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formOperationType, setFormOperationType] = useState<string>('PRE_ANNOUNCE');
  const [formTargetResourceId, setFormTargetResourceId] = useState<string>('');
  const [formHttpMethod, setFormHttpMethod] = useState<string>('POST');
  const [formEndpointUrl, setFormEndpointUrl] = useState<string>('/api/v1/orders/pre-announce');
  const [formHeadersTemplate, setFormHeadersTemplate] = useState<string>('{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer <token>"\n}');
  const [formPayloadTemplate, setFormPayloadTemplate] = useState<string>('{\n  "palletId": "{{pallet.lpn}}",\n  "type": "{{pallet.palletType}}",\n  "weightKg": {{pallet.currentWeightKg}},\n  "facilityId": "{{resource.customProperties.facility_code}}",\n  "clientId": "{{resource.customProperties.wms_client_id}}",\n  "timestamp": "{{fn.now}}"\n}');
  const [formActive, setFormActive] = useState<boolean>(true);

  // Field Palette Category Tab
  const [activeDictionaryTab, setActiveDictionaryTab] = useState<'pallet' | 'resource' | 'auth' | 'item' | 'functions'>('pallet');
  const payloadTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Preview State
  const [previewResult, setPreviewResult] = useState<string | null>(null);
  const [previewResolvedUrl, setPreviewResolvedUrl] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Dynamic Test Context State (Generic JSON variables for preview & test dispatch)
  const [testVariablesJson, setTestVariablesJson] = useState<string>(
    '{\n  "palletId": "PAL-9901",\n  "orderId": "ORD-5001",\n  "status": "ACTIVE"\n}'
  );
  const [showVariablesEditor, setShowVariablesEditor] = useState<boolean>(true);

  // Test Run State
  const [testRunResult, setTestRunResult] = useState<any>(null);
  const [isTestRunLoading, setIsTestRunLoading] = useState<boolean>(false);
  const [testRunError, setTestRunError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Resource Auth State inside API Mapper
  const [resourceAuthStatus, setResourceAuthStatus] = useState<any>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const checkResourceAuth = async (targetResId: string) => {
    if (!targetResId) {
      setResourceAuthStatus(null);
      return;
    }
    try {
      const status = await resourceService.getResourceTokenStatus(targetResId);
      setResourceAuthStatus(status);
    } catch {
      setResourceAuthStatus(null);
    }
  };

  const handleAuthResource = async () => {
    if (!formTargetResourceId) return;
    setIsAuthenticating(true);
    try {
      const res = await resourceService.authorizeResource(formTargetResourceId);
      setResourceAuthStatus(res.status || { hasToken: res.success, lastError: res.error || res.message });
      if (res.success) {
        setSuccessMessage(`Resource '${formTargetResourceId}' authenticated! Real token stored in WES memory.`);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setTestRunError(`Auth failed for ${formTargetResourceId}: ${res.error || res.message}`);
      }
    } catch (err: any) {
      setResourceAuthStatus({ hasToken: false, lastError: err.message });
      setTestRunError(`Auth error: ${err.message}`);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [mappingsData, resourcesData, dictData] = await Promise.all([
        dynamicMappingService.getMappings(),
        fetchResourcesApi(),
        dynamicMappingService.getFieldDictionary().catch(() => null)
      ]);
      setMappings(mappingsData);
      setResources(resourcesData);
      if (dictData) setDictionary(dictData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load API mappings and resources');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter(m => {
      const matchesSearch = 
        m.mappingCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.endpointUrl.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesResource = 
        selectedResourceFilter === 'ALL' || 
        m.targetResourceId === selectedResourceFilter;

      const matchesOperation = 
        selectedOperationFilter === 'ALL' || 
        m.operationType === selectedOperationFilter;

      return matchesSearch && matchesResource && matchesOperation;
    });
  }, [mappings, searchQuery, selectedResourceFilter, selectedOperationFilter]);

  // Insert token chip into payload textarea at current cursor position
  const handleInsertToken = (token: string) => {
    const placeholder = `{{${token}}}`;
    const textarea = payloadTextareaRef.current;
    if (!textarea) {
      setFormPayloadTemplate(prev => prev + placeholder);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formPayloadTemplate;
    const newText = text.substring(0, start) + placeholder + text.substring(end);
    setFormPayloadTemplate(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 50);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId(null);
    const defaultResource = resources.length > 0 ? resources[0].resourceId : '';
    setFormMappingCode(`MAP_${Date.now().toString().slice(-6)}`);
    setFormName('Custom Pre-Announce Mapping');
    setFormDescription('Dynamic template mapping for WMS outbound pre-announce payload');
    setFormOperationType('PRE_ANNOUNCE');
    setFormTargetResourceId(defaultResource);
    setFormHttpMethod('POST');
    setFormEndpointUrl('/api/v1/orders/pre-announce');
    setFormHeadersTemplate('{\n  "Content-Type": "application/json",\n  "Authorization": "Bearer <token>"\n}');
    setFormPayloadTemplate('{\n  "palletId": "{{pallet.lpn}}",\n  "type": "{{pallet.palletType}}",\n  "weightKg": {{pallet.currentWeightKg}},\n  "facilityId": "{{resource.customProperties.facility_code}}",\n  "clientId": "{{resource.customProperties.wms_client_id}}",\n  "timestamp": "{{fn.now}}"\n}');
    setFormActive(true);
    setPreviewResult(null);
    setPreviewResolvedUrl(null);
    setPreviewError(null);
    setTestRunResult(null);
    setTestRunError(null);
    checkResourceAuth(defaultResource);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (mapping: ApiIntegrationMappingItem) => {
    setIsEditing(true);
    setEditingId(mapping.id);
    setFormMappingCode(mapping.mappingCode);
    setFormName(mapping.name);
    setFormDescription(mapping.description || '');
    setFormOperationType(mapping.operationType);
    setFormTargetResourceId(mapping.targetResourceId);
    setFormHttpMethod(mapping.httpMethod);
    setFormEndpointUrl(mapping.endpointUrl);
    setFormHeadersTemplate(
      typeof mapping.headersTemplate === 'string' 
        ? mapping.headersTemplate 
        : JSON.stringify(mapping.headersTemplate, null, 2)
    );
    setFormPayloadTemplate(
      typeof mapping.payloadTemplate === 'string' 
        ? mapping.payloadTemplate 
        : JSON.stringify(mapping.payloadTemplate, null, 2)
    );
    setFormActive(mapping.active);
    setPreviewResult(null);
    setPreviewResolvedUrl(null);
    setPreviewError(null);
    setTestRunResult(null);
    setTestRunError(null);
    checkResourceAuth(mapping.targetResourceId);
    setIsModalOpen(true);
  };

  // Handle Save
  const handleSave = async () => {
    if (!formMappingCode.trim() || !formName.trim() || !formEndpointUrl.trim()) {
      alert('Mapping Code, Name, and Endpoint URL are required.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: Partial<ApiIntegrationMappingItem> = {
        mappingCode: formMappingCode.trim(),
        name: formName.trim(),
        description: formDescription.trim(),
        operationType: formOperationType,
        targetResourceId: formTargetResourceId.trim(),
        httpMethod: formHttpMethod,
        endpointUrl: formEndpointUrl.trim(),
        headersTemplate: formHeadersTemplate.trim(),
        payloadTemplate: formPayloadTemplate.trim(),
        conditionRules: '[]',
        active: formActive
      };

      if (isEditing && editingId) {
        await dynamicMappingService.updateMapping(editingId, payload);
        setSuccessMessage(`Mapping '${formMappingCode}' updated successfully`);
      } else {
        await dynamicMappingService.createMapping(payload);
        setSuccessMessage(`Mapping '${formMappingCode}' created successfully`);
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(`Error saving mapping: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Mapping
  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete mapping '${code}'?`)) {
      return;
    }
    try {
      await dynamicMappingService.deleteMapping(id);
      setSuccessMessage(`Mapping '${code}' deleted successfully`);
      await loadData();
    } catch (err: any) {
      alert(`Failed to delete mapping: ${err.message}`);
    }
  };

  // Live Preview Payload & Endpoint URL Resolution
  const handleLivePreview = async () => {
    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewResult(null);
    setPreviewResolvedUrl(null);
    try {
      let parsedContext: Record<string, any> | undefined = undefined;
      if (testVariablesJson && testVariablesJson.trim()) {
        try {
          parsedContext = JSON.parse(testVariablesJson.trim());
        } catch (err: any) {
          setPreviewError(`Invalid Test Context JSON: ${err.message}`);
          setIsPreviewLoading(false);
          return;
        }
      }

      const res = await dynamicMappingService.previewPayload({
        resourceId: formTargetResourceId || undefined,
        endpointUrl: formEndpointUrl,
        payloadTemplate: formPayloadTemplate,
        testContext: parsedContext
      });

      if (res.success) {
        setPreviewResolvedUrl(res.resolvedUrl || null);
        try {
          const parsed = JSON.parse(res.resolvedPayload);
          setPreviewResult(JSON.stringify(parsed, null, 2));
        } catch {
          setPreviewResult(res.resolvedPayload);
        }
      } else {
        setPreviewError('Failed to resolve dynamic tokens.');
      }
    } catch (err: any) {
      setPreviewError(err.message || 'Preview generation failed');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Dry-run / Test Run API
  const handleTestRun = async () => {
    setIsTestRunLoading(true);
    setTestRunError(null);
    setTestRunResult(null);
    try {
      let parsedContext: Record<string, any> | undefined = undefined;
      if (testVariablesJson && testVariablesJson.trim()) {
        try {
          parsedContext = JSON.parse(testVariablesJson.trim());
        } catch (err: any) {
          setTestRunError(`Invalid Test Context JSON: ${err.message}`);
          setIsTestRunLoading(false);
          return;
        }
      }

      const res = await dynamicMappingService.testRun({
        resourceId: formTargetResourceId || undefined,
        httpMethod: formHttpMethod,
        endpointUrl: formEndpointUrl,
        headersTemplate: formHeadersTemplate,
        payloadTemplate: formPayloadTemplate,
        testContext: parsedContext
      });
      setTestRunResult(res);
      if (res.targetUrl) {
        setPreviewResolvedUrl(res.targetUrl);
      }
    } catch (err: any) {
      setTestRunError(err.message || 'Test run failed');
    } finally {
      setIsTestRunLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getMethodBadgeStyle = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)' };
      case 'POST': return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', border: '1px solid rgba(59, 130, 246, 0.3)' };
      case 'PUT': return { bg: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'PATCH': return { bg: 'rgba(139, 92, 246, 0.15)', color: '#8B5CF6', border: '1px solid rgba(139, 92, 246, 0.3)' };
      case 'DELETE': return { bg: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)' };
      default: return { bg: 'rgba(100, 116, 139, 0.15)', color: '#94A3B8', border: '1px solid rgba(100, 116, 139, 0.3)' };
    }
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
            background: 'linear-gradient(135deg, #6366F1 0%, #4338CA 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <Network size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
              Dynamic API Mappings & Payload Engine
            </h1>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Build, test, and persist no-code WMS API templates with real-time field token mapping
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={loadData}
            disabled={isLoading}
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
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            onClick={handleOpenCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--color-primary-600, #4F46E5)',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
              transition: 'all var(--transition-fast)'
            }}
          >
            <Plus size={16} />
            New API Mapping
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Alerts */}
        {errorMessage && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#EF4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
            <X size={16} style={{ cursor: 'pointer' }} onClick={() => setErrorMessage(null)} />
          </div>
        )}

        {successMessage && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{successMessage}</span>
            </div>
            <X size={16} style={{ cursor: 'pointer' }} onClick={() => setSuccessMessage(null)} />
          </div>
        )}

        {/* Filter and Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 18px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '10px',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderRadius: '6px',
            padding: '6px 12px',
            flex: '1 1 240px',
            border: '1px solid var(--border-subtle)'
          }}>
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by mapping code, name, URL..."
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
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target Resource:</span>
            <select
              value={selectedResourceFilter}
              onChange={(e) => setSelectedResourceFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Resources</option>
              {resources.map(r => (
                <option key={r.resourceId} value={r.resourceId}>
                  {r.name} ({r.resourceId})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Operation:</span>
            <select
              value={selectedOperationFilter}
              onChange={(e) => setSelectedOperationFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">All Operations</option>
              <option value="PRE_ANNOUNCE">PRE_ANNOUNCE</option>
              <option value="CREATE_ORDER">CREATE_ORDER</option>
              <option value="RESERVE_ORDER">RESERVE_ORDER</option>
              <option value="OUTBOUND_RELEASE">OUTBOUND_RELEASE</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>
          </div>
        </div>

        {/* Mappings Table */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '10px',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code2 size={18} color="var(--color-primary-500)" />
              <span style={{ fontSize: '14px', fontWeight: 600 }}>
                Configured API Mappings ({filteredMappings.length})
              </span>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <div>Loading mappings and schemas...</div>
            </div>
          ) : filteredMappings.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Network size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 500 }}>No API Mappings Found</div>
              <p style={{ fontSize: '13px', maxWidth: '400px', margin: '8px auto 16px auto' }}>
                Create your first dynamic API mapper to easily build JSON payloads without coding!
              </p>
              <button
                onClick={handleOpenCreate}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--color-primary-600, #4F46E5)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Create API Mapping
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-surface-subtle)', borderBottom: '1px solid var(--border-default)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Code & Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Operation</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Target Resource</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Method & Endpoint</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMappings.map((m) => {
                    const methodStyle = getMethodBadgeStyle(m.httpMethod);
                    return (
                      <tr
                        key={m.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          transition: 'background-color var(--transition-fast)'
                        }}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: m.active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(100, 116, 139, 0.15)',
                            color: m.active ? '#10B981' : '#94A3B8'
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: m.active ? '#10B981' : '#94A3B8'
                            }} />
                            {m.active ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                            {m.mappingCode}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            color: '#6366F1',
                            border: '1px solid rgba(99, 102, 241, 0.25)'
                          }}>
                            {m.operationType}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Server size={14} color="var(--text-muted)" />
                            <span style={{ fontWeight: 500 }}>
                              {m.targetResourceId || 'Default / Any'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              fontFamily: 'monospace',
                              backgroundColor: methodStyle.bg,
                              color: methodStyle.color,
                              border: methodStyle.border
                            }}>
                              {m.httpMethod}
                            </span>
                            <span style={{
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              color: 'var(--text-secondary)'
                            }}>
                              {m.endpointUrl}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            <button
                              onClick={() => handleOpenEdit(m)}
                              title="Edit Mapping"
                              style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-default)',
                                backgroundColor: 'var(--bg-surface-subtle)',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id, m.mappingCode)}
                              title="Delete Mapping"
                              style={{
                                padding: '6px',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                                color: '#EF4444',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal Drawer */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '12px',
            width: '94%',
            maxWidth: '1200px',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border-default)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--bg-surface-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Network size={20} color="var(--color-primary-500)" />
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    {isEditing ? `Edit Mapping: ${formMappingCode}` : 'Create New API Mapping'}
                  </h2>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                    Define dynamic placeholders like <code style={{ color: '#818CF8' }}>{"{{pallet.lpn}}"}</code> or <code style={{ color: '#818CF8' }}>{"{{resource.customProperties.clientID}}"}</code>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Split 2 Columns */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px 24px',
              display: 'grid',
              gridTemplateColumns: 'minmax(420px, 1.2fr) minmax(380px, 1fr)',
              gap: '24px'
            }}>
              {/* Left Column: Form & Payload Editor */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Basic Meta Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Mapping Code *
                    </label>
                    <input
                      type="text"
                      disabled={isEditing}
                      value={formMappingCode}
                      onChange={(e) => setFormMappingCode(e.target.value)}
                      placeholder="e.g. LOGIQS_PREANNOUNCE"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: isEditing ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Mapping Name *
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Logiqs Ambient Pre-Announce"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                    />
                  </div>
                </div>

                {/* Resource & Operation Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 100px', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Target Resource *
                      </label>
                      {formTargetResourceId && (
                        <button
                          type="button"
                          onClick={handleAuthResource}
                          disabled={isAuthenticating}
                          title="Authenticate against resource using configured properties"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2563EB',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: isAuthenticating ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          {isAuthenticating ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                          <span>{isAuthenticating ? 'Authenticating...' : 'Authenticate Now'}</span>
                        </button>
                      )}
                    </div>
                    <select
                      value={formTargetResourceId}
                      onChange={(e) => {
                        setFormTargetResourceId(e.target.value);
                        checkResourceAuth(e.target.value);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                    >
                      <option value="">Any / Global Default</option>
                      {resources.map(r => (
                        <option key={r.resourceId} value={r.resourceId}>
                          {r.name} ({r.resourceId})
                        </option>
                      ))}
                    </select>

                    {/* Dynamic Auth Indicator for Selected Resource */}
                    {formTargetResourceId && resourceAuthStatus && (
                      <div style={{
                        marginTop: '5px',
                        padding: '4px 8px',
                        borderRadius: '5px',
                        backgroundColor: (resourceAuthStatus.hasToken || resourceAuthStatus.success) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${(resourceAuthStatus.hasToken || resourceAuthStatus.success) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        fontSize: '10.5px',
                        color: (resourceAuthStatus.hasToken || resourceAuthStatus.success) ? '#10B981' : '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px'
                      }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(resourceAuthStatus.hasToken || resourceAuthStatus.success)
                            ? `✓ Token Active: ${resourceAuthStatus.tokenPreview || 'Valid in WES'}`
                            : `✕ Auth Error: ${resourceAuthStatus.error || resourceAuthStatus.lastError || 'No token'}`}
                        </span>
                        <button
                          type="button"
                          onClick={handleAuthResource}
                          disabled={isAuthenticating}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'inherit',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            fontSize: '10px'
                          }}
                        >
                          Retry
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Operation Type *
                    </label>
                    <select
                      value={formOperationType}
                      onChange={(e) => setFormOperationType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                    >
                      <option value="PRE_ANNOUNCE">PRE_ANNOUNCE</option>
                      <option value="CREATE_ORDER">CREATE_ORDER</option>
                      <option value="RESERVE_ORDER">RESERVE_ORDER</option>
                      <option value="OUTBOUND_RELEASE">OUTBOUND_RELEASE</option>
                      <option value="CUSTOM">CUSTOM</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      Active
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormActive(!formActive)}
                      style={{
                        width: '100%',
                        padding: '8px 0',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: formActive ? '1px solid #10B981' : '1px solid var(--border-default)',
                        backgroundColor: formActive ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-surface-subtle)',
                        color: formActive ? '#10B981' : 'var(--text-muted)'
                      }}
                    >
                      {formActive ? 'ACTIVE' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* HTTP Method & Endpoint URL */}
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                      HTTP Method
                    </label>
                    <select
                      value={formHttpMethod}
                      onChange={(e) => setFormHttpMethod(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontWeight: 600
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Endpoint URL Path *
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Path Vars:</span>
                        {['{id}', '{status}', '{type}', '{code}'].map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setFormEndpointUrl(prev => `${prev.replace(/\/$/, '')}/${v}`)}
                            style={{
                              background: 'none',
                              border: '1px solid var(--border-default)',
                              borderRadius: '4px',
                              padding: '1px 5px',
                              fontSize: '10px',
                              fontFamily: 'monospace',
                              color: '#38BDF8',
                              cursor: 'pointer',
                              backgroundColor: 'rgba(56, 189, 248, 0.08)'
                            }}
                            title={`Append ${v} to URL path`}
                          >
                            +{v}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="text"
                      value={formEndpointUrl}
                      onChange={(e) => setFormEndpointUrl(e.target.value)}
                      placeholder="/api/v1/entities/{id}/status"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Supports dynamic path variables like <code>&#123;id&#125;</code> and query parameters like <code>?status=&#123;status&#125;</code>.
                    </div>
                  </div>
                </div>

                {/* Field Palette / Available Tokens Chip Bar */}
                <div style={{
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-surface-subtle)',
                  border: '1px solid var(--border-default)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600 }}>
                      <Sparkles size={14} color="#818CF8" />
                      <span>Insert Dynamic Field Tokens:</span>
                    </div>
                    {/* Category tabs */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['pallet', 'resource', 'auth', 'item', 'functions'] as const).map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setActiveDictionaryTab(tab)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: 'none',
                            fontSize: '10px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                            backgroundColor: activeDictionaryTab === tab ? '#6366F1' : 'transparent',
                            color: activeDictionaryTab === tab ? '#FFFFFF' : 'var(--text-muted)'
                          }}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Token chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                    {dictionary && (dictionary as Record<string, any>)[activeDictionaryTab] ? (
                      ((dictionary as Record<string, any>)[activeDictionaryTab] || []).map((item: any) => (
                        <button
                          key={item.field}
                          type="button"
                          onClick={() => handleInsertToken(item.field)}
                          title={`${item.description} (Click to insert)`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '14px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            backgroundColor: 'rgba(99, 102, 241, 0.12)',
                            color: '#818CF8',
                            border: '1px solid rgba(99, 102, 241, 0.25)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.25)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.12)'}
                        >
                          <span>+{item.field}</span>
                        </button>
                      ))
                    ) : (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Loading token dictionary...
                      </div>
                    )}
                  </div>
                </div>

                {/* Payload Template Editor */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      JSON Payload Template (Must be valid JSON after token substitution)
                    </label>
                    <button
                      type="button"
                      onClick={handleLivePreview}
                      disabled={isPreviewLoading}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--color-primary-500)',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      <Eye size={12} />
                      {isPreviewLoading ? 'Evaluating...' : 'Live Preview'}
                    </button>
                  </div>
                  <textarea
                    ref={payloadTextareaRef}
                    rows={11}
                    value={formPayloadTemplate}
                    onChange={(e) => setFormPayloadTemplate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: '#0F172A',
                      color: '#38BDF8',
                      fontSize: '12px',
                      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                      lineHeight: '1.5',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>

                {/* Headers Template */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Headers Template (JSON format)
                  </label>
                  <textarea
                    rows={3}
                    value={formHeadersTemplate}
                    onChange={(e) => setFormHeadersTemplate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-default)',
                      backgroundColor: '#0F172A',
                      color: '#94A3B8',
                      fontSize: '12px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <ShieldCheck size={13} />
                    <span>Backend automatically replaces &apos;&lt;token&gt;&apos; with the live Bearer token — no manual secret management needed.</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Evaluation & Dry Run Inspector */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                borderLeft: '1px solid var(--border-default)',
                paddingLeft: '20px'
              }}>
                {/* 1. Live Resolved Endpoint URL Panel */}
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
                      <Globe size={16} color="var(--color-primary-500)" />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Live Resolved Endpoint</span>
                    </div>
                    {previewResolvedUrl && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(previewResolvedUrl, 'url')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '11px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {copiedText === 'url' ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
                        {copiedText === 'url' ? 'Copied' : 'Copy URL'}
                      </button>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#090D16',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    color: previewResolvedUrl ? '#38BDF8' : 'var(--text-muted)',
                    wordBreak: 'break-all'
                  }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      flexShrink: 0,
                      ...getMethodBadgeStyle(formHttpMethod)
                    }}>
                      {formHttpMethod}
                    </span>
                    <span style={{ flex: 1 }}>
                      {previewResolvedUrl || formEndpointUrl || '// Dynamic endpoint path'}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '10.5px',
                    color: previewResolvedUrl && (previewResolvedUrl.includes('{') || previewResolvedUrl.includes('}')) ? '#F59E0B' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {previewResolvedUrl && (previewResolvedUrl.includes('{') || previewResolvedUrl.includes('}')) ? (
                      <>
                        <AlertCircle size={12} color="#F59E0B" />
                        <span>Contains unresolved path variables. Edit simulation variables below.</span>
                      </>
                    ) : (
                      <span>Substitutes path variables e.g. <code>&#123;id&#125;</code> and base URL dynamically.</span>
                    )}
                  </div>
                </div>

                {/* 2. Simulation Variables (Test Context) Panel */}
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
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {showVariablesEditor ? 'Collapse' : 'Expand'}
                      </span>
                      {showVariablesEditor ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronRight size={14} color="var(--text-muted)" />}
                    </div>
                  </div>

                  {showVariablesEditor && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          Generic key-value JSON for path variables and payload tokens:
                        </span>
                        <button
                          type="button"
                          onClick={() => setTestVariablesJson('{\n  "palletId": "PAL-9901",\n  "orderId": "ORD-5001",\n  "status": "ACTIVE"\n}')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#818CF8',
                            fontSize: '10.5px',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }}
                        >
                          Reset Sample
                        </button>
                      </div>
                      <textarea
                        rows={4}
                        value={testVariablesJson}
                        onChange={(e) => setTestVariablesJson(e.target.value)}
                        placeholder='{\n  "id": "1004",\n  "status": "ACTIVE"\n}'
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-default)',
                          backgroundColor: '#0F172A',
                          color: '#FCD34D',
                          fontSize: '11px',
                          fontFamily: 'Consolas, Monaco, monospace',
                          resize: 'vertical'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* 3. Live Evaluated Payload Panel */}
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
                      <Eye size={16} color="var(--color-primary-500)" />
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Live Evaluated Payload</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleLivePreview}
                        disabled={isPreviewLoading}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(99, 102, 241, 0.12)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#818CF8',
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        {isPreviewLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                        {isPreviewLoading ? 'Evaluating...' : 'Live Preview'}
                      </button>
                      {previewResult && (
                        <button
                          onClick={() => copyToClipboard(previewResult, 'preview')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
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

                {/* Dry-Run / Test Dispatch Box */}
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

                    <button
                      type="button"
                      onClick={handleTestRun}
                      disabled={isTestRunLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        backgroundColor: '#10B981',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {isTestRunLoading ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      {isTestRunLoading ? 'Sending...' : 'Test Dispatch'}
                    </button>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
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
                        <span style={{ color: 'var(--text-muted)' }}>Status Code:</span>
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
                        <span style={{ color: 'var(--text-muted)' }}>Target URL: </span>
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

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Response Body:</span>
                        <button
                          onClick={() => copyToClipboard(testRunResult.responsePayload, 'response')}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
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
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
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
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--color-primary-600, #4F46E5)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)'
                }}
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {isSaving ? 'Saving...' : isEditing ? 'Update Mapping' : 'Save Mapping'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
