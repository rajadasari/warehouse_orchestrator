import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ArrowRight,
  ExternalLink,
  Info,
  Check,
  Layers,
  Cpu,
  Server,
  Network,
  Box,
  Radio,
  HardDrive,
  Search,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { Button } from '../../../components/common/Button';
import { Badge } from '../../../components/common/Badge';
import { ResourceTemplateItem } from '../../../services/resourceTemplateService';

export const STANDARD_CATEGORIES = [
  'GENERAL',
  'PHYSICAL',
  'OT_DEVICE',
  'SOFTWARE',
  'CONTROLLER',
  'LOGICAL',
  'DEVICE',
  'HARDWARE'
] as const;

export interface Step1IdentityProps {
  availableTemplates: ResourceTemplateItem[];
  selectedTemplates: ResourceTemplateItem[];
  onToggleTemplate: (template: ResourceTemplateItem) => void;
  category: string;
  onChangeCategory: (val: string) => void;
  type?: string;
  onChangeType?: (val: string) => void;
  resourceId: string;
  onChangeResourceId: (val: string) => void;
  name: string;
  onChangeName: (val: string) => void;
  application?: string;
  onChangeApplication?: (val: string) => void;
  description: string;
  onChangeDescription: (val: string) => void;
  documentationUrl: string;
  onChangeDocumentationUrl: (val: string) => void;
  status: string;
  onChangeStatus: (val: string) => void;
  isEditing: boolean;
  onNext: () => void;
}

export const Step1Identity: React.FC<Step1IdentityProps> = ({
  availableTemplates,
  selectedTemplates,
  onToggleTemplate,
  category,
  onChangeCategory,
  type,
  resourceId,
  onChangeResourceId,
  name,
  onChangeName,
  description,
  onChangeDescription,
  documentationUrl,
  onChangeDocumentationUrl,
  status,
  onChangeStatus,
  isEditing,
  onNext
}) => {
  // Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isDropdownOpen]);

  // Category icon helper
  const getCategoryIcon = (cat: string) => {
    switch (cat.toUpperCase()) {
      case 'GENERAL':
        return <Layers size={15} />;
      case 'PHYSICAL':
        return <Cpu size={15} />;
      case 'OT_DEVICE':
        return <Radio size={15} />;
      case 'SOFTWARE':
        return <Server size={15} />;
      case 'CONTROLLER':
        return <Network size={15} />;
      case 'LOGICAL':
        return <Box size={15} />;
      case 'DEVICE':
        return <Radio size={15} />;
      case 'HARDWARE':
        return <HardDrive size={15} />;
      default:
        return <Layers size={15} />;
    }
  };

  // Group templates by category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STANDARD_CATEGORIES.forEach(c => { counts[c] = 0; });
    availableTemplates.forEach(t => {
      const cat = (t.category || 'GENERAL').toUpperCase();
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [availableTemplates]);

  // Filter templates for the currently active category
  const templatesForCategory = useMemo(() => {
    const activeCat = (category || 'GENERAL').toUpperCase();
    return availableTemplates.filter(t => (t.category || 'GENERAL').toUpperCase() === activeCat);
  }, [availableTemplates, category]);

  // Search filtered templates inside the dropdown
  const filteredInDropdown = useMemo(() => {
    if (!dropdownSearch.trim()) return templatesForCategory;
    const q = dropdownSearch.toLowerCase().trim();
    return templatesForCategory.filter(t =>
      t.templateCode.toLowerCase().includes(q) ||
      t.templateName.toLowerCase().includes(q) ||
      (t.resourceType && t.resourceType.toLowerCase().includes(q)) ||
      (t.description && t.description.toLowerCase().includes(q))
    );
  }, [templatesForCategory, dropdownSearch]);

  const selectedCodes = useMemo(() => {
    return new Set(selectedTemplates.map(t => t.templateCode));
  }, [selectedTemplates]);

  const isOtDevice = (category || 'GENERAL').toUpperCase() === 'OT_DEVICE';

  const isValid = Boolean(
    resourceId.trim() && 
    name.trim() && 
    (selectedTemplates.length > 0 || isEditing)
  );

  const formatCategoryLabel = (cat: string) => {
    if (cat.toUpperCase() === 'OT_DEVICE') return 'OT Device';
    return cat;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Category & Multi-Template Blueprint Selection */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '16px'
        }}
      >
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
            1. Operational Category Selection <span style={{ color: '#EF4444' }}>*</span>
          </label>
          <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Choose an operational category to view and multi-select matching templates. All selected templates must belong to this category to ensure service and property compatibility.
          </p>
        </div>

        {/* Category Pill Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
          {STANDARD_CATEGORIES.map(cat => {
            const count = categoryCounts[cat] || 0;
            const isSelected = (category || 'GENERAL').toUpperCase() === cat;
            return (
              <button
                key={cat}
                type="button"
                disabled={isEditing}
                onClick={() => {
                  onChangeCategory(cat);
                  setDropdownSearch('');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: isEditing ? 'not-allowed' : 'pointer',
                  border: isSelected ? '1.5px solid #38BDF8' : '1px solid var(--border-default)',
                  backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'var(--bg-surface-subtle)',
                  color: isSelected ? '#38BDF8' : 'var(--text-primary)',
                  transition: 'all 0.15s ease'
                }}
              >
                {getCategoryIcon(cat)}
                <span>{formatCategoryLabel(cat)}</span>
                <span
                  style={{
                    fontSize: '10.5px',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? '#38BDF8' : 'var(--border-default)',
                    color: isSelected ? '#000' : 'var(--text-secondary)',
                    fontWeight: 600
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 2. Multi-Select Template Dropdown & Selected Blueprints */}
        <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '16px' }} ref={dropdownRef}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                2. Select Template{isOtDevice ? '' : 's'} for [{formatCategoryLabel(category || 'GENERAL')}] ({isOtDevice ? 'Single-Select Enforced' : 'Multi-Select Supported'}) <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                {isOtDevice
                  ? 'OT Device category requires single template selection to preserve fieldbus driver and protocol address integrity.'
                  : 'Select one or more templates from the dropdown. Similar services from other templates are inherited without duplicating logic.'}
              </p>
            </div>
            {selectedTemplates.length > 0 && (
              <Badge variant="info">
                {selectedTemplates.length} Template{selectedTemplates.length > 1 ? 's' : ''} Selected
              </Badge>
            )}
          </div>

          {templatesForCategory.length === 0 ? (
            <div style={{
              padding: '14px',
              borderRadius: '6px',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px dashed var(--border-default)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              textAlign: 'center'
            }}>
              No registered templates found for category <strong>{category || 'GENERAL'}</strong>.
              <br />
              Please choose another category above or register templates in Template Management.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Dropdown Input / Trigger */}
              <div
                onClick={() => setIsDropdownOpen(prev => !prev)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: `1.5px solid ${isDropdownOpen ? '#38BDF8' : 'var(--border-default)'}`,
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: isDropdownOpen ? '0 0 0 3px rgba(56, 189, 248, 0.15)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <Search size={15} color="var(--text-secondary)" />
                  {selectedTemplates.length === 0 ? (
                    <span style={{ color: 'var(--text-secondary)' }}>
                      Click to search & select templates in {category || 'GENERAL'}...
                    </span>
                  ) : (
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedTemplates.length} template{selectedTemplates.length > 1 ? 's' : ''} selected: ({selectedTemplates.map(t => t.templateCode).join(', ')})
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                  {isDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Popover Menu with Search & Checkbox Items */}
              {isDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                    padding: '8px',
                    maxHeight: '340px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  {/* Search Bar inside popover */}
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
                    <input
                      type="text"
                      autoFocus
                      value={dropdownSearch}
                      onChange={e => setDropdownSearch(e.target.value)}
                      placeholder={`Search ${templatesForCategory.length} templates in ${category}...`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        width: '100%',
                        padding: '8px 10px 8px 32px',
                        borderRadius: '6px',
                        border: '1px solid var(--border-default)',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Template Items List */}
                  <div style={{ overflowY: 'auto', maxHeight: '250px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {filteredInDropdown.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        No templates matching "{dropdownSearch}".
                      </div>
                    ) : (
                      filteredInDropdown.map(tpl => {
                        const isChecked = selectedCodes.has(tpl.templateCode);
                        const servicesCount = tpl.methodsSchema?.length ?? 0;
                        const propCount = tpl.propertySchema?.length ?? Object.keys(tpl.defaultProperties || {}).length;

                        return (
                          <div
                            key={tpl.templateCode}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTemplate(tpl);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              backgroundColor: isChecked ? 'rgba(56, 189, 248, 0.1)' : 'transparent',
                              border: `1px solid ${isChecked ? 'rgba(56, 189, 248, 0.4)' : 'transparent'}`,
                              transition: 'background-color 0.15s ease'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                              <div
                                style={{
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '4px',
                                  border: `1.5px solid ${isChecked ? '#38BDF8' : 'var(--border-default)'}`,
                                  backgroundColor: isChecked ? '#38BDF8' : 'transparent',
                                  color: '#000',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}
                              >
                                {isChecked && <Check size={13} strokeWidth={3} />}
                              </div>

                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {tpl.templateName}
                                  </span>
                                  <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#38BDF8' }}>
                                    ({tpl.templateCode})
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  <span>⚡ {servicesCount} Services</span>
                                  <span>•</span>
                                  <span>⚙ {propCount} Props</span>
                                  <span>•</span>
                                  <span>{tpl.resourceType || 'GENERIC'}</span>
                                </div>
                              </div>
                            </div>

                            <Badge variant={tpl.systemTemplate ? 'info' : 'neutral'} style={{ fontSize: '10px', padding: '1px 6px', flexShrink: 0 }}>
                              {tpl.systemTemplate ? 'System' : 'Custom'}
                            </Badge>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Selected Templates Cards Display (Whatever is selected is displayed with remove button) */}
          {selectedTemplates.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Selected Blueprint Composition ({selectedTemplates.length}):
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  First selected is primary blueprint; subsequent blueprints inherit non-colliding services.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
                {selectedTemplates.map((tpl, idx) => {
                  const servicesCount = tpl.methodsSchema?.length ?? 0;
                  const propCount = tpl.propertySchema?.length ?? Object.keys(tpl.defaultProperties || {}).length;

                  return (
                    <div
                      key={tpl.templateCode}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '6px',
                        border: `1.5px solid ${idx === 0 ? '#38BDF8' : 'var(--border-default)'}`,
                        backgroundColor: idx === 0 ? 'rgba(56, 189, 248, 0.08)' : 'var(--bg-surface-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {tpl.templateName}
                            </span>
                            {idx === 0 && (
                              <Badge variant="info" style={{ fontSize: '9.5px', padding: '1px 5px' }}>Primary</Badge>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#38BDF8' }}>
                            {tpl.templateCode}
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          title="Remove template"
                          onClick={() => onToggleTemplate(tpl)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                        {tpl.description || 'Pre-configured blueprint.'}
                      </p>

                      <div style={{ display: 'flex', gap: '8px', fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        <span>⚡ {servicesCount} Services</span>
                        <span>•</span>
                        <span>⚙ {propCount} Props</span>
                        <span>•</span>
                        <span>Class: {tpl.resourceType || 'GENERIC'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedTemplates.length === 0 && !isEditing && (
            <div style={{ marginTop: '10px', fontSize: '11.5px', color: '#EF4444' }}>
              * Please select at least one template from the dropdown to instantiate your resource.
            </div>
          )}
        </div>
      </div>

      {/* 2. Resource Definition & System Identity */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          borderRadius: '8px',
          padding: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Resource Definition & System Identity
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Assign resource identifier, human-friendly name, runtime classification, and industrial domain.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '14px'
          }}
        >
          {/* Resource ID */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Resource ID <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={resourceId}
              disabled={isEditing}
              onChange={e => onChangeResourceId(e.target.value.toUpperCase())}
              placeholder="e.g. AMR_001, CRANE_02, LINE_CONVEYOR"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: isEditing ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontFamily: 'monospace',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Resource Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => onChangeName(e.target.value)}
              placeholder="e.g. High-Bay Stacker Crane Alpha"
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          {/* Operational Category (Locked to selected category) */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Operational Category (Anchored)
            </label>
            <input
              type="text"
              value={formatCategoryLabel(category || 'GENERAL')}
              disabled
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: '#38BDF8',
                fontSize: '12px',
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          {/* Resource Type (Inherited from Template) */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Resource Type / Archetype Class (Inherited)
            </label>
            <input
              type="text"
              value={selectedTemplates[0]?.resourceType || type || 'GENERIC'}
              disabled
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'monospace',
                fontWeight: 600,
                outline: 'none'
              }}
            />
          </div>

          {/* Status */}
          <div>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Initial Operational Status
            </label>
            <select
              value={status}
              onChange={e => onChangeStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                outline: 'none'
              }}
            >
              <option value="ACTIVE">ACTIVE / AVAILABLE</option>
              <option value="MAINTENANCE">MAINTENANCE / CALIBRATING</option>
              <option value="INACTIVE">INACTIVE / OFFLINE</option>
            </select>
          </div>

          {/* Documentation URL */}
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Documentation / Spec URL (Linked for AI & Engineers)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={documentationUrl}
                onChange={e => onChangeDocumentationUrl(e.target.value)}
                placeholder="https://wiki.company.internal/specs/crane-asrs.html"
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-default)',
                  backgroundColor: 'var(--bg-surface)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none'
                }}
              />
              {documentationUrl && (
                <a
                  href={documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-default)',
                    backgroundColor: 'var(--bg-surface-subtle)',
                    color: '#38BDF8',
                    textDecoration: 'none',
                    fontSize: '12px'
                  }}
                >
                  <ExternalLink size={13} />
                  Open Spec
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        <div style={{ marginTop: '14px' }}>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
            Operational Description
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={e => onChangeDescription(e.target.value)}
            placeholder="Operational notes, business role, physical warehouse location..."
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>
      </div>

      {/* Info Notice about Step 2 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          borderRadius: '6px',
          backgroundColor: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}
      >
        <Info size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
        <span>
          Inherited properties and services from all selected templates will be combined in Step 2 and Step 3.
        </span>
      </div>

      {/* Footer Navigation */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
        <Button
          type="button"
          variant="primary"
          onClick={onNext}
          disabled={!isValid}
          rightIcon={<ArrowRight size={14} />}
          style={{ minHeight: '44px', padding: '0 24px' }}
        >
          Proceed to Properties
        </Button>
      </div>
    </div>
  );
};
