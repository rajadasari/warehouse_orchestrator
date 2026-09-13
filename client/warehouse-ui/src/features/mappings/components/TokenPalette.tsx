import React from 'react';
import { Sparkles } from 'lucide-react';
import { SchemaDictionary } from '../../../services/dynamicMappingService';

export type DictionaryCategory = 'pallet' | 'resource' | 'auth' | 'item' | 'functions';

export interface TokenPaletteProps {
  dictionary: SchemaDictionary | null;
  activeTab: DictionaryCategory;
  onTabChange: (tab: DictionaryCategory) => void;
  onInsertToken: (field: string) => void;
}

export const TokenPalette: React.FC<TokenPaletteProps> = ({
  dictionary,
  activeTab,
  onTabChange,
  onInsertToken
}) => {
  const categories: DictionaryCategory[] = ['pallet', 'resource', 'auth', 'item', 'functions'];

  return (
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
          {categories.map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => onTabChange(tab)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: 'none',
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--color-primary-600, #4F46E5)' : 'transparent',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  transition: 'background-color var(--transition-fast)'
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Token chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
        {dictionary && (dictionary as Record<string, any>)[activeTab] ? (
          ((dictionary as Record<string, any>)[activeTab] || []).map((item: any) => (
            <button
              key={item.field}
              type="button"
              onClick={() => onInsertToken(item.field)}
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
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.25)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.12)'}
            >
              <span>+{item.field}</span>
            </button>
          ))
        ) : (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Loading token dictionary...
          </div>
        )}
      </div>
    </div>
  );
};
