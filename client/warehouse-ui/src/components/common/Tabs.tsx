import React from 'react';

export interface TabItemDef<T extends string = string> {
  key: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItemDef<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeKey,
  onChange,
  className = ''
}: TabsProps<T>) {
  return (
    <div className={`tab-strip ${className}`} role="tablist">
      {tabs.map(tab => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.icon && <span style={{ display: 'inline-flex' }}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && (
              <span
                style={{
                  fontSize: '9.5px',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: isActive ? 'rgba(37, 99, 235, 0.12)' : 'var(--color-neutral-200)',
                  color: isActive ? 'var(--color-primary-600)' : 'var(--text-secondary)',
                  fontWeight: 600
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
