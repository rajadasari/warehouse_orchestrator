import React, { useState } from 'react';
import { 
  Search, 
  PlayCircle, 
  Radio, 
  CheckCircle2, 
  Database, 
  Network, 
  Hourglass, 
  GitBranch, 
  Flag,
  ChevronRight,
  Plus,
  Calculator,
  MousePointerClick
} from 'lucide-react';
import { PALETTE_ITEMS, PaletteItem } from '../types';

interface NodePaletteProps {
  onAddNode: (item: PaletteItem) => void;
  onDragStart: (e: React.DragEvent, item: PaletteItem) => void;
}

export const NodePalette: React.FC<NodePaletteProps> = ({ onAddNode, onDragStart }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'All Nodes' },
    { id: 'TRIGGER', label: 'Triggers' },
    { id: 'MATH', label: 'Math' },
    { id: 'LOGIC', label: 'Logic' },
    { id: 'STATE', label: 'State' },
    { id: 'INTEGRATION', label: 'APIs' },
    { id: 'GATE', label: 'Gates' },
    { id: 'TERMINAL', label: 'Finish' }
  ];

  const filteredItems = PALETTE_ITEMS.filter(item => {
    const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'PlayCircle': return <PlayCircle size={18} />;
      case 'Radio': return <Radio size={18} />;
      case 'CheckCircle2': return <CheckCircle2 size={18} />;
      case 'Database': return <Database size={18} />;
      case 'Network': return <Network size={18} />;
      case 'Hourglass': return <Hourglass size={18} />;
      case 'Calculator': return <Calculator size={18} />;
      case 'GitBranch': return <GitBranch size={18} />;
      case 'Flag': return <Flag size={18} />;
      case 'MousePointerClick': return <MousePointerClick size={18} />;
      default: return <PlayCircle size={18} />;
    }
  };

  return (
    <div style={{
      width: '280px',
      minWidth: '280px',
      height: '100%',
      backgroundColor: '#0f172a',
      borderRight: '1px solid #1e293b',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 14px 12px 14px',
        borderBottom: '1px solid #1e293b'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: '#94a3b8'
          }}>
            Node Palette
          </div>
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: '#1e293b',
            color: '#38bdf8',
            fontWeight: 600
          }}>
            {PALETTE_ITEMS.length} Blocks
          </span>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#1e293b',
          borderRadius: '8px',
          padding: '6px 10px',
          border: '1px solid #334155'
        }}>
          <Search size={14} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search block types..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '12px',
              width: '100%'
            }}
          />
        </div>
      </div>

      {/* Category Pills */}
      <div style={{
        display: 'flex',
        gap: '6px',
        overflowX: 'auto',
        padding: '10px 14px',
        borderBottom: '1px solid #1e293b',
        scrollbarWidth: 'none'
      }}>
        {categories.map(c => {
          const isSelected = selectedCategory === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              style={{
                flexShrink: 0,
                padding: '5px 12px',
                borderRadius: '6px',
                border: isSelected ? '1px solid #38bdf8' : '1px solid #1e293b',
                backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
                color: isSelected ? '#38bdf8' : '#94a3b8',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Palette List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxSizing: 'border-box'
      }}>
        {filteredItems.map(item => (
          <div
            key={item.label + item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item)}
            onClick={() => onAddNode(item)}
            style={{
              flexShrink: 0,
              width: '100%',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderLeft: `4px solid ${item.badgeColor}`,
              cursor: 'grab',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              transition: 'all 0.18s ease',
              boxSizing: 'border-box'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#24334d';
              e.currentTarget.style.borderColor = item.badgeColor;
              e.currentTarget.style.boxShadow = `0 4px 14px ${item.glowColor}`;
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#1e293b';
              e.currentTarget.style.borderColor = '#334155';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: item.badgeColor
              }}>
                {getIcon(item.iconName)}
                <span style={{
                  fontSize: '12.5px',
                  fontWeight: 600,
                  color: '#f8fafc'
                }}>
                  {item.label}
                </span>
              </div>
              <button
                title="Click to add node"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px'
                }}
              >
                <Plus size={14} />
              </button>
            </div>

            <p style={{
              margin: 0,
              fontSize: '11px',
              color: '#94a3b8',
              lineHeight: 1.35
            }}>
              {item.description}
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '4px',
              fontSize: '10px',
              color: '#64748b'
            }}>
              <span style={{
                textTransform: 'uppercase',
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: item.badgeColor
              }}>
                {item.type}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                Drag or Click <ChevronRight size={10} />
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
