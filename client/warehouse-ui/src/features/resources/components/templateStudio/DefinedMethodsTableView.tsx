import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  Zap, 
  Cpu, 
  Globe, 
  Calculator, 
  Activity, 
  Layers,
  ArrowRight,
  Database
} from 'lucide-react';
import { MethodDefinition } from '../../types/resourceEnums';

interface DefinedMethodsTableViewProps {
  methods: MethodDefinition[];
  onOpenInIde: (index: number) => void;
  onAddMethod: () => void;
  onRemoveMethod: (index: number) => void;
  onQuickTest?: (method: MethodDefinition) => void;
}

export const DefinedMethodsTableView: React.FC<DefinedMethodsTableViewProps> = ({
  methods,
  onOpenInIde,
  onAddMethod,
  onRemoveMethod,
  onQuickTest
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = ['ALL', 'CALCULATION', 'HARDWARE', 'API', 'LOGIC', 'CUSTOM'];

  const filteredMethods = methods.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.displayName && m.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.description && m.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = 
      selectedCategory === 'ALL' || 
      (m.category && m.category.toUpperCase() === selectedCategory);

    return matchesSearch && matchesCategory;
  });

  const getCategoryBadgeStyle = (category?: string) => {
    const cat = (category || 'LOGIC').toUpperCase();
    switch (cat) {
      case 'HARDWARE':
        return { bg: '#10b98120', text: '#34d399', border: '#10b98140', icon: <Cpu size={11} /> };
      case 'API':
        return { bg: '#3b82f620', text: '#60a5fa', border: '#3b82f640', icon: <Globe size={11} /> };
      case 'CALCULATION':
        return { bg: '#8b5cf620', text: '#a78bfa', border: '#8b5cf640', icon: <Calculator size={11} /> };
      case 'DIAGNOSTIC':
        return { bg: '#f59e0b20', text: '#fbbf24', border: '#f59e0b40', icon: <Activity size={11} /> };
      default:
        return { bg: '#06b6d420', text: '#22d3ee', border: '#06b6d440', icon: <Layers size={11} /> };
    }
  };

  const getRuntimeLabel = (method: MethodDefinition) => {
    if (method.language === 'PYTHON' || (method as unknown as { pythonCode?: string })?.pythonCode) {
      return { label: 'Python PyCode < 150µs', icon: <Zap size={11} color="#10b981" /> };
    }
    if (method.javaCode || method.language === 'JAVA') {
      return { label: 'Java Bytecode < 1µs', icon: <Zap size={11} color="#34d399" /> };
    }
    const cat = (method.category || '').toUpperCase();
    if (cat === 'HARDWARE') {
      return { label: 'OPC-UA Tag Read/Write', icon: <Cpu size={11} color="#22d3ee" /> };
    }
    if (cat === 'API') {
      return { label: 'REST HTTP Dispatch', icon: <Globe size={11} color="#60a5fa" /> };
    }
    return { label: 'In-Memory RAM', icon: <Layers size={11} color="#94a3b8" /> };
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#090d16',
      border: '1px solid #1e293b',
      borderRadius: '10px',
      overflow: 'hidden',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* ------------------------------------------------------------- */}
      {/* Top Filter & Search Bar */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        backgroundColor: '#0f172a',
        borderBottom: '1px solid #1e293b',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '6px 12px',
          width: '280px'
        }}>
          <Search size={14} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search methods by name or tag..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '12px',
              width: '100%'
            }}
          />
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #3b82f6' : '1px solid #334155',
                  backgroundColor: isSelected ? '#1e3a8a' : '#1e293b',
                  color: isSelected ? '#93c5fd' : '#94a3b8',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {cat.charAt(0) + cat.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>

        {/* New Method Action */}
        <button
          type="button"
          onClick={onAddMethod}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '6px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            minHeight: '36px'
          }}
        >
          <Plus size={14} /> New Service
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Table Header */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '220px 130px 180px 1fr 180px 140px',
        padding: '10px 18px',
        backgroundColor: '#0c1222',
        borderBottom: '1px solid #1e293b',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.05em',
        color: '#94a3b8',
        textTransform: 'uppercase'
      }}>
        <div>Service</div>
        <div>Category</div>
        <div>Runtime</div>
        <div>Inputs (Signature)</div>
        <div>Output Target</div>
        <div style={{ textAlign: 'right' }}>Actions</div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Table Rows Body */}
      {/* ------------------------------------------------------------- */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {filteredMethods.length === 0 ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '12.5px'
          }}>
            No services match the selected filter. Click &quot;New Service&quot; to define one.
          </div>
        ) : (
          filteredMethods.map((m, idx) => {
            const badge = getCategoryBadgeStyle(m.category);
            const runtime = getRuntimeLabel(m);
            const originalIndex = methods.indexOf(m);

            return (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '220px 130px 180px 1fr 180px 140px',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderBottom: '1px solid #1e293b',
                  backgroundColor: idx % 2 === 0 ? '#090d16' : '#0c1222',
                  minHeight: '56px',
                  transition: 'background-color 0.15s ease'
                }}
              >
                {/* Method Name & Display Title */}
                <div>
                  <div style={{
                    fontSize: '12.5px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: '#f8fafc'
                  }}>
                    {m.name || 'UNTITLED_METHOD'}
                  </div>
                  {m.displayName && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {m.displayName}
                    </div>
                  )}
                </div>

                {/* Category Badge */}
                <div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: badge.bg,
                    color: badge.text,
                    border: `1px solid ${badge.border}`,
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.04em'
                  }}>
                    {badge.icon}
                    {m.category || 'LOGIC'}
                  </span>
                </div>

                {/* Runtime Engine */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#cbd5e1' }}>
                  {runtime.icon}
                  <span>{runtime.label}</span>
                </div>

                {/* Inputs Signature */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                  {m.inputs && m.inputs.length > 0 ? (
                    m.inputs.map((inp, i) => (
                      <span
                        key={i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          fontSize: '10.5px',
                          fontFamily: 'monospace',
                          color: '#38bdf8'
                        }}
                      >
                        {inp.name}: <span style={{ color: '#94a3b8' }}>{inp.type}</span>
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
                      [0 inputs]
                    </span>
                  )}
                </div>

                {/* Output Target */}
                <div>
                  {m.storeResultToProperty ? (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      color: '#f59e0b'
                    }}>
                      <ArrowRight size={11} color="#64748b" />
                      <Database size={11} />
                      #{`{properties.${m.storeResultToProperty}}`}
                    </div>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Pure Return ({m.outputType || 'OBJECT'})
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => onOpenInIde(originalIndex >= 0 ? originalIndex : idx)}
                    title="Open in 3-Column IDE"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      backgroundColor: '#1e3a8a30',
                      border: '1px solid #3b82f650',
                      color: '#60a5fa',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Edit3 size={11} /> IDE
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onQuickTest) onQuickTest(m);
                      else onOpenInIde(originalIndex >= 0 ? originalIndex : idx);
                    }}
                    title="Run Test"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '5px 8px',
                      borderRadius: '5px',
                      backgroundColor: '#10b98120',
                      border: '1px solid #10b98140',
                      color: '#34d399',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    <Play size={11} fill="#34d399" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveMethod(originalIndex >= 0 ? originalIndex : idx)}
                    title="Delete Service"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      padding: '6px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Bottom Status Bar */}
      {/* ------------------------------------------------------------- */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 18px',
        backgroundColor: '#0c1222',
        borderTop: '1px solid #1e293b',
        fontSize: '11px',
        color: '#94a3b8'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>Showing <strong>{filteredMethods.length}</strong> of <strong>{methods.length}</strong> methods</span>
          <span style={{ color: '#1e293b' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
            <Zap size={11} /> Sub-microsecond RAM execution
          </span>
          <span style={{ color: '#1e293b' }}>|</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60a5fa' }}>
            <Database size={11} /> Zero SQL load
          </span>
        </div>
      </div>
    </div>
  );
};
