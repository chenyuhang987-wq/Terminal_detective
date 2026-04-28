import React, { useState } from 'react';

// Default zone layout for Case 1 (fallback)
const DEFAULT_ZONE_LAYOUT = {
  zone_datacenter: { x: 50, y: 18, label: '数据中心', sublabel: '案发现场', icon: '💻', color: '#ff3860' },
  zone_lobby:      { x: 20, y: 60, label: '大堂',     sublabel: '监控中心', icon: '📹', color: '#00e5ff' },
  zone_lab:        { x: 80, y: 60, label: '私人实验室', sublabel: '黑客入口', icon: '🔬', color: '#a78bfa' },
  zone_balcony:    { x: 50, y: 85, label: '天台阳台', sublabel: '逃离路线', icon: '🌃', color: '#ffaa00' },
};

const DEFAULT_CONNECTIONS = [
  ['zone_datacenter','zone_lobby'],['zone_datacenter','zone_lab'],
  ['zone_datacenter','zone_balcony'],['zone_lobby','zone_balcony'],['zone_lab','zone_balcony'],
];

const DEFAULT_CLUE_ZONE_MAP = {
  c_01: 'zone_datacenter', c_02: 'zone_datacenter', c_07: 'zone_datacenter',
  c_03: 'zone_lobby', c_08: 'zone_lobby',
  c_04: 'zone_lab', c_05: 'zone_lab', c_secret_99: 'zone_lab',
  c_06: 'zone_balcony',
};

export default function MiniMap({ gameState, caseData, agentPath, accentColor }) {
  const [expanded, setExpanded] = useState(false);

  const zoneLayout    = caseData?.zone_layout || DEFAULT_ZONE_LAYOUT;
  const connections   = caseData?.zone_connections || DEFAULT_CONNECTIONS;
  const clueZoneMap   = caseData?.zone_clue_map || DEFAULT_CLUE_ZONE_MAP;

  const currentZone = agentPath?.[agentPath.length - 1] || Object.keys(zoneLayout)[0];
  const visitedZones = new Set(agentPath || []);

  // Clues per zone
  const zoneClues = {};
  Object.keys(zoneLayout).forEach(z => { zoneClues[z] = []; });
  (gameState?.unlocked_clues || []).forEach(id => {
    // Check case-specific map first, then default
    const z = clueZoneMap[id];
    if (z && zoneClues[z]) zoneClues[z].push(id);
  });

  const W = expanded ? 280 : 180;
  const H = expanded ? 200 : 130;

  return (
    <div
      style={{
        position: 'relative',
        width: W,
        background: 'rgba(2,6,18,0.92)',
        border: `1px solid ${accentColor}30`,
        borderRadius: 12,
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        boxShadow: `0 0 20px ${accentColor}15`,
        transition: 'all 0.3s ease',
        fontFamily: 'monospace',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1 cursor-pointer"
        style={{ borderBottom: `1px solid ${accentColor}20`, background: `${accentColor}08` }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ fontSize: '0.55rem', color: accentColor, fontWeight: 700, letterSpacing: '0.1em' }}>
          ◈ 小地图
        </span>
        <span style={{ fontSize: '0.5rem', color: `${accentColor}60` }}>
          {expanded ? '▲ 收起' : '▼ 展开'}
        </span>
      </div>

      {/* SVG map */}
      <div style={{ position: 'relative', height: H, transition: 'height 0.3s ease' }}>
        {/* Grid bg */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.08 }}>
          <defs>
            <pattern id="mm-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={accentColor} strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mm-grid)" />
        </svg>

        {/* Connection lines */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          {connections.map(([a, b]) => {
            const zA = zoneLayout[a];
            const zB = zoneLayout[b];
            if (!zA || !zB) return null;
            const bothVisited = visitedZones.has(a) && visitedZones.has(b);
            return (
              <line
                key={`${a}-${b}`}
                x1={`${zA.x}%`} y1={`${zA.y}%`}
                x2={`${zB.x}%`} y2={`${zB.y}%`}
                stroke={bothVisited ? accentColor : 'rgba(255,255,255,0.1)'}
                strokeWidth={bothVisited ? 1.5 : 0.8}
                strokeDasharray={bothVisited ? '5 3' : '3 5'}
                style={{ filter: bothVisited ? `drop-shadow(0 0 3px ${accentColor})` : 'none' }}
              />
            );
          })}
        </svg>

        {/* Zone nodes */}
        {Object.entries(zoneLayout).map(([zk, zd]) => {
          const isCurrent  = zk === currentZone;
          const isVisited  = visitedZones.has(zk);
          const clueCount  = zoneClues[zk]?.length || 0;
          const color      = isCurrent ? zd.color : isVisited ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)';

          return (
            <div
              key={zk}
              style={{
                position: 'absolute',
                left: `${zd.x}%`, top: `${zd.y}%`,
                transform: 'translate(-50%,-50%)',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              {/* Node circle */}
              <div style={{
                width: isCurrent ? 22 : 16,
                height: isCurrent ? 22 : 16,
                borderRadius: '50%',
                border: `${isCurrent ? 2 : 1}px solid ${color}`,
                background: isCurrent ? `${zd.color}30` : isVisited ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                boxShadow: isCurrent ? `0 0 12px ${zd.color}80` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: isCurrent ? 11 : 8,
                transition: 'all 0.3s',
                animation: isCurrent ? 'mm-pulse 1.8s ease-in-out infinite' : 'none',
              }}>
                {zd.icon}
              </div>

              {/* Clue badge */}
              {clueCount > 0 && (
                <div style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 12, height: 12, borderRadius: '50%',
                  background: '#ffaa00', color: '#000',
                  fontSize: '0.4rem', fontWeight: 900,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 6px #ffaa0080',
                }}>
                  {clueCount}
                </div>
              )}

              {/* Label (only when expanded) */}
              {expanded && (
                <div style={{
                  marginTop: 3,
                  fontSize: '0.45rem',
                  color: color,
                  textShadow: isCurrent ? `0 0 6px ${zd.color}` : 'none',
                  whiteSpace: 'nowrap',
                  fontWeight: isCurrent ? 700 : 400,
                  maxWidth: 60,
                  textAlign: 'center',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {zd.label}
                </div>
              )}
            </div>
          );
        })}

        {/* Legend (expanded only) */}
        {expanded && (
          <div style={{
            position: 'absolute', bottom: 6, left: 6,
            display: 'flex', flexDirection: 'column', gap: 2,
          }}>
            {[
              { color: accentColor, label: '当前位置' },
              { color: 'rgba(255,255,255,0.6)', label: '已调查' },
              { color: 'rgba(255,255,255,0.2)', label: '未探索' },
              { color: '#ffaa00', label: '线索' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: item.color }} />
                <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom stats strip */}
      <div style={{
        padding: '3px 8px',
        borderTop: `1px solid ${accentColor}15`,
        display: 'flex', justifyContent: 'space-between',
        fontSize: '0.45rem', color: `${accentColor}70`, fontFamily: 'monospace',
      }}>
        <span>🗺 {visitedZones.size}/{Object.keys(zoneLayout).length} 区域</span>
        <span>🔍 {gameState?.unlocked_clues?.length || 0} 线索</span>
        <span>⚡ AP {gameState?.action_points_left || 0}</span>
      </div>

      <style>{`
        @keyframes mm-pulse {
          0%,100% { box-shadow: 0 0 12px currentColor; transform: scale(1); }
          50%      { box-shadow: 0 0 20px currentColor; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}