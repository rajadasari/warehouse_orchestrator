import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Columns, Search, X, Tag } from 'lucide-react';
import { Button } from '../../../components/common/Button';

export interface PalletColumnDefinition {
  key: string;
  label: string;
  group: 'Standard' | 'Custom Property';
  required?: boolean;
}

export interface PalletColumnPickerProps {
  columns: PalletColumnDefinition[];
  visibleColumns: Record<string, boolean>;
  isColVisible: (key: string) => boolean;
  toggleColVisible: (key: string) => void;
  setAllColumnsVisibility: (visible: boolean) => void;
  showCoreOnly: () => void;
  showCustomOnly: () => void;
  resetDefaultColumns: () => void;
  customPropsCount: number;
}

export const PalletColumnPicker: React.FC<PalletColumnPickerProps> = ({
  columns,
  isColVisible,
  toggleColVisible,
  setAllColumnsVisibility,
  showCoreOnly,
  showCustomOnly,
  resetDefaultColumns,
  customPropsCount
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const activeVisibleCount = useMemo(() => {
    return columns.filter(c => isColVisible(c.key)).length;
  }, [columns, isColVisible]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredStandard = useMemo(() => {
    return columns
      .filter(c => c.group === 'Standard')
      .filter(c => !search || c.label.toLowerCase().includes(search.toLowerCase()));
  }, [columns, search]);

  const filteredCustom = useMemo(() => {
    return columns
      .filter(c => c.group === 'Custom Property')
      .filter(c => !search || c.label.toLowerCase().includes(search.toLowerCase()));
  }, [columns, search]);

  return (
    <div ref={popoverRef} style={{ position: 'relative' }}>
      <Button
        variant={isOpen ? 'primary' : 'outline'}
        size="sm"
        leftIcon={<Columns size={13} />}
        onClick={() => setIsOpen(!isOpen)}
        title="Select which standard and custom property columns to display in grid"
      >
        <span>Columns</span>
        <span style={{
          backgroundColor: isOpen ? 'rgba(255, 255, 255, 0.25)' : 'var(--bg-surface-subtle)',
          color: isOpen ? '#FFFFFF' : 'var(--text-secondary)',
          border: isOpen ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid var(--border-default)',
          borderRadius: '9999px',
          fontSize: '10px',
          padding: '0 6px',
          fontWeight: 700,
          marginLeft: '4px'
        }}>
          {activeVisibleCount}/{columns.length}
        </span>
      </Button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          width: '340px',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-strong)',
          borderRadius: '10px',
          boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.18), 0 6px 12px -3px rgba(0, 0, 0, 0.1)',
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 12px',
            backgroundColor: 'var(--bg-surface-subtle)',
            borderBottom: '1px solid var(--border-default)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Columns size={13} color="var(--color-primary-600)" />
              <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                Grid Columns
              </span>
              <span style={{
                fontSize: '10px',
                color: 'var(--color-primary-600)',
                backgroundColor: 'var(--color-primary-50)',
                padding: '1px 5px',
                borderRadius: '4px',
                fontWeight: 600
              }}>
                {activeVisibleCount} active
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-secondary)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Quick Presets */}
          <div style={{
            display: 'flex',
            gap: '5px',
            padding: '8px 10px',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-default)',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              onClick={() => setAllColumnsVisibility(true)}
              style={{
                padding: '3px 7px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
            >
              All ({columns.length})
            </button>
            <button
              type="button"
              onClick={showCoreOnly}
              style={{
                padding: '3px 7px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface-subtle)',
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: 'pointer',
                color: 'var(--text-primary)'
              }}
            >
              Core Only
            </button>
            <button
              type="button"
              onClick={showCustomOnly}
              style={{
                padding: '3px 7px',
                borderRadius: '4px',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                fontSize: '10.5px',
                fontWeight: 600,
                cursor: 'pointer',
                color: '#B45309'
              }}
            >
              Custom Props ({customPropsCount})
            </button>
            <button
              type="button"
              onClick={resetDefaultColumns}
              style={{
                padding: '3px 7px',
                borderRadius: '4px',
                border: '1px solid var(--border-default)',
                backgroundColor: 'transparent',
                fontSize: '10.5px',
                fontWeight: 500,
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                marginLeft: 'auto'
              }}
            >
              Reset
            </button>
          </div>

          {/* Search Filter */}
          <div style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-default)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--bg-surface-subtle)',
              borderRadius: '5px',
              padding: '3px 8px',
              border: '1px solid var(--border-default)'
            }}>
              <Search size={11} color="var(--text-disabled)" />
              <input
                type="text"
                placeholder="Find column..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '11px',
                  color: 'var(--text-primary)',
                  width: '100%'
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-secondary)' }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          {/* Column Checkboxes */}
          <div style={{
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px'
          }}>
            {filteredStandard.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: 'var(--text-secondary)',
                  padding: '4px 6px',
                  letterSpacing: '0.04em'
                }}>
                  Standard Columns ({filteredStandard.length})
                </div>
                {filteredStandard.map(col => {
                  const checked = isColVisible(col.key);
                  return (
                    <div
                      key={col.key}
                      onClick={() => !col.required && toggleColVisible(col.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 8px',
                        borderRadius: '5px',
                        cursor: col.required ? 'default' : 'pointer',
                        backgroundColor: checked ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                        transition: 'background-color var(--transition-fast)'
                      }}
                      onMouseEnter={e => {
                        if (!col.required) e.currentTarget.style.backgroundColor = checked ? 'rgba(37, 99, 235, 0.09)' : 'var(--bg-surface-subtle)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = checked ? 'rgba(37, 99, 235, 0.05)' : 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={col.required}
                          onChange={() => {}}
                          style={{
                            accentColor: 'var(--color-primary-600)',
                            cursor: col.required ? 'default' : 'pointer',
                            width: '13px',
                            height: '13px'
                          }}
                        />
                        <span style={{
                          fontSize: '11px',
                          fontWeight: checked ? 600 : 400,
                          color: checked ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}>
                          {col.label}
                        </span>
                      </div>
                      {col.required && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: '3px',
                          backgroundColor: 'var(--color-primary-100)',
                          color: 'var(--color-primary-700)'
                        }}>
                          REQUIRED
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {filteredCustom.length > 0 && (
              <div>
                <div style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#B45309',
                  padding: '4px 6px',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Tag size={10} />
                  <span>Custom Properties ({filteredCustom.length})</span>
                </div>
                {filteredCustom.map(col => {
                  const checked = isColVisible(col.key);
                  return (
                    <div
                      key={col.key}
                      onClick={() => toggleColVisible(col.key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 8px',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        backgroundColor: checked ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                        transition: 'background-color var(--transition-fast)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = checked ? 'rgba(245, 158, 11, 0.14)' : 'var(--bg-surface-subtle)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = checked ? 'rgba(245, 158, 11, 0.08)' : 'transparent';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {}}
                          style={{
                            accentColor: '#D97706',
                            cursor: 'pointer',
                            width: '13px',
                            height: '13px'
                          }}
                        />
                        <span style={{
                          fontSize: '11px',
                          fontWeight: checked ? 600 : 400,
                          color: checked ? 'var(--text-primary)' : 'var(--text-secondary)'
                        }}>
                          {col.label}
                        </span>
                      </div>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 600,
                        padding: '1px 4px',
                        borderRadius: '3px',
                        backgroundColor: 'rgba(245, 158, 11, 0.12)',
                        color: '#B45309',
                        fontFamily: 'monospace'
                      }}>
                        CUSTOM
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {filteredStandard.length === 0 && filteredCustom.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
                No columns match &quot;{search}&quot;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
