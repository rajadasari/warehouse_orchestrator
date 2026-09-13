import React from 'react';
import { ShieldCheck, Cpu, Activity } from 'lucide-react';

export const LoginHeroPanel: React.FC = () => {
  return (
    <div
      style={{
        flex: '1.1',
        background: 'linear-gradient(135deg, #060D1A 0%, #0C1A30 50%, #0F2744 100%)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 36px',
        color: '#FFFFFF',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Subtle Cybernetic Grid Pattern Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(59, 130, 246, 0.08) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(59, 130, 246, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          pointerEvents: 'none'
        }}
      />

      {/* Ambient Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, transparent 70%)',
          filter: 'blur(45px)',
          pointerEvents: 'none'
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '-10%',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />

      {/* Top Branding */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '5px 12px',
            borderRadius: '9999px',
            marginBottom: '12px'
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: '#10B981',
              boxShadow: '0 0 8px #10B981'
            }}
          />
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: '#93C5FD'
            }}
          >
            Warehouse Digital World &bull; Facility FAC-BLR-01
          </span>
        </div>

        <h1
          style={{
            fontSize: '22px',
            fontWeight: 800,
            lineHeight: 1.2,
            letterSpacing: '-0.025em',
            marginBottom: '8px',
            maxWidth: '460px',
            color: '#FFFFFF'
          }}
        >
          Next-Gen Autonomous Logistics &amp; Digital Twin.
        </h1>
        <p
          style={{
            fontSize: '12px',
            color: '#BAD0F0',
            lineHeight: 1.5,
            maxWidth: '440px',
            margin: 0
          }}
        >
          Real-time orchestration of ASRS stacker cranes, AGV/AMR robot fleets, and conveyor sortation systems with zero-trust IEC 62443 cyber-physical security.
        </p>
      </div>

      {/* Center Digital Twin Visual Simulation Art */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          margin: '16px 0',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '460px',
            backgroundColor: 'rgba(12, 26, 48, 0.65)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '16px',
            padding: '16px',
            backdropFilter: 'blur(14px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)'
          }}
        >
          {/* Visual HUD Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
              marginBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color="#3B82F6" />
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#F0F5FF' }}>
                LIVE SUB-SYSTEM TELEMETRY
              </span>
            </div>
            <span
              style={{
                fontSize: '10px',
                color: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontWeight: 600
              }}
            >
              ASYNCHRONOUS EVENT LOOP
            </span>
          </div>

          {/* Graphical Representation of Sub-Systems */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px',
              marginBottom: '12px'
            }}
          >
            {[
              { title: 'ASRS High-Bay', status: 'SYNCHRONIZED', color: '#10B981', metric: '6 Cranes Online' },
              { title: 'Conveyor Loop', status: 'ACTIVE', color: '#3B82F6', metric: '18 Spurs OK' },
              { title: 'Fleet Control', status: 'OPTIMAL', color: '#F59E0B', metric: '12 AGVs Active' }
            ].map((node, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'rgba(15, 39, 68, 0.5)',
                  border: '1px solid rgba(59, 130, 246, 0.15)',
                  borderRadius: '10px',
                  padding: '10px 8px',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '10.5px', fontWeight: 600, color: '#EBF3FE', marginBottom: '3px' }}>
                  {node.title}
                </div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: node.color, marginBottom: '2px' }}>
                  {node.status}
                </div>
                <div style={{ fontSize: '8.5px', color: '#8DA2C0' }}>
                  {node.metric}
                </div>
              </div>
            ))}
          </div>

          {/* Visual Data Stream Simulation */}
          <div
            style={{
              backgroundColor: 'rgba(6, 13, 26, 0.6)',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '9.5px',
              fontFamily: 'monospace',
              color: '#60A5FA',
              display: 'flex',
              flexDirection: 'column',
              gap: '3px',
              marginBottom: '10px'
            }}
          >
            <div>[SEC-AUTH] Multi-tier Zero-Trust Architecture Ready</div>
            <div>[WES-CORE] Realtime Dispatch Pipeline: Standby</div>
          </div>

          {/* Subsystem Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {['IEC 62443 Certified', 'OAuth2 / Argon2id', 'Sub-millisecond Bus'].map((txt, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  padding: '3px 7px',
                  fontSize: '9.5px',
                  color: '#BAD0F0'
                }}
              >
                <Cpu size={10} color="#3B82F6" />
                <span>{txt}</span>
              </div>
            ))}
          </div>

          {/* Warehouse Graphic Accent Lines */}
          <div
            style={{
              height: '3px',
              width: '100%',
              borderRadius: '2px',
              background: 'linear-gradient(90deg, #3B82F6 0%, #10B981 50%, #F59E0B 100%)',
              opacity: 0.8
            }}
          />
        </div>
      </div>

      {/* Bottom Security Compliance Notice */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '10.5px',
          color: '#8DA2C0'
        }}
      >
        <ShieldCheck size={15} color="#10B981" />
        <span>Compliant with ISA-95 Level 2/3 &amp; IEC 62443-3-3 Industrial Cybersecurity Standard.</span>
      </div>
    </div>
  );
};
