import React, { useState, useEffect, useRef } from 'react';
import { useLang } from '@/lib/lang.jsx';
import { LocalStorage } from '@/game/gameState';
import { DEFAULT_AGENT_CONFIG } from '@/game/caseData';
import { loadProgression, saveProgression, getLevelFromXP } from '@/game/agentProgression';

// ── Agent definitions ─────────────────────────────────────────────────────────
const AGENT_DEFS = [
  {
    id: 'NEXUS-01', name: 'NEXUS-01', role: 'Lead Investigator',
    roleZh: '首席调查员', icon: '🕵️', color: '#00e5ff',
    stance: 'analytical', level: 28,
    desc: 'Logic Domination: Gain 15% additional Logic Power in complex inference chains.',
    descZh: '逻辑主宰：在复杂推理链中获得额外15%逻辑加成。',
    trait: '逻辑型', traitEn: 'Logic',
  },
  {
    id: 'AURORA-09', name: 'AURORA-09', role: 'Forensic Analyst',
    roleZh: '法证分析师', icon: '🔬', color: '#a78bfa',
    stance: 'analytical', level: 24,
    desc: 'Precision Eye: Increases clue discovery rate by 20% in evidence analysis.',
    descZh: '精准之眼：证据分析时线索发现率提升20%。',
    trait: '观察型', traitEn: 'Observation',
  },
  {
    id: 'CIPHER-47', name: 'CIPHER-47', role: 'Tech Specialist',
    roleZh: '技术专家', icon: '💻', color: '#ff6b35',
    stance: 'cautious', level: 23,
    desc: 'Ghost Protocol: Reduces detection risk by 30% during digital infiltration.',
    descZh: '幽灵协议：数字渗透时被发现风险降低30%。',
    trait: '黑客型', traitEn: 'Hacker',
  },
];

const STANCE_OPTIONS = ['analytical', 'aggressive', 'cautious'];

function makeDefaultTeam() {
  return AGENT_DEFS.map(a => ({
    agent_id: a.id, role: a.roleZh, base_stance: a.stance,
    logic_power: a.id === 'NEXUS-01' ? 78 : a.id === 'AURORA-09' ? 64 : 45,
    observation_focus: a.id === 'AURORA-09' ? 80 : a.id === 'NEXUS-01' ? 60 : 40,
    confusion_resistance: a.id === 'NEXUS-01' ? 72 : a.id === 'AURORA-09' ? 55 : 68,
    ap_cost_discount: a.id === 'CIPHER-47' ? 20 : a.id === 'NEXUS-01' ? 15 : 10,
    hack_level: a.id === 'CIPHER-47' ? 75 : 20,
  }));
}

// ── Holographic Agent Figure ──────────────────────────────────────────────────
function HoloFigure({ agent, agentDef, isSelected, onClick, index }) {
  const yOffset = index === 1 ? -20 : 0;
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        cursor: 'pointer', position: 'relative',
        transform: `translateY(${yOffset}px)`,
        transition: 'all 0.3s ease',
      }}
    >
      {/* Holo figure body */}
      <div style={{
        width: isSelected ? 80 : 64, height: isSelected ? 130 : 110,
        position: 'relative',
        filter: `drop-shadow(0 0 ${isSelected ? 20 : 10}px ${agentDef.color})`,
        transition: 'all 0.3s ease',
      }}>
        {/* Body silhouette */}
        <svg viewBox="0 0 64 110" width="100%" height="100%">
          <defs>
            <linearGradient id={`holo-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={agentDef.color} stopOpacity="0.9"/>
              <stop offset="100%" stopColor={agentDef.color} stopOpacity="0.1"/>
            </linearGradient>
            <filter id={`glow-${index}`}>
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* Head */}
          <ellipse cx="32" cy="12" rx="9" ry="10" fill={`url(#holo-${index})`} filter={`url(#glow-${index})`} opacity="0.85"/>
          {/* Body */}
          <path d="M 18 24 L 46 24 L 52 70 L 42 70 L 40 90 L 24 90 L 22 70 L 12 70 Z"
            fill={`url(#holo-${index})`} filter={`url(#glow-${index})`} opacity="0.75"/>
          {/* Arms */}
          <path d="M 18 28 L 6 55 L 10 57 L 20 34" fill={`url(#holo-${index})`} opacity="0.6"/>
          <path d="M 46 28 L 58 55 L 54 57 L 44 34" fill={`url(#holo-${index})`} opacity="0.6"/>
          {/* Legs */}
          <path d="M 22 90 L 18 108 L 26 108 L 30 90" fill={`url(#holo-${index})`} opacity="0.65"/>
          <path d="M 42 90 L 46 108 L 38 108 L 34 90" fill={`url(#holo-${index})`} opacity="0.65"/>
          {/* Scan lines */}
          {[20, 35, 50, 65, 80].map((y, i) => (
            <line key={i} x1="8" y1={y} x2="56" y2={y}
              stroke={agentDef.color} strokeWidth="0.4" opacity="0.3"
              style={{ animation: `scan-line 2s ${i * 0.3}s ease-in-out infinite` }}
            />
          ))}
        </svg>

        {/* Selection ring */}
        {isSelected && (
          <div style={{
            position: 'absolute', inset: -6, borderRadius: '50%',
            border: `2px solid ${agentDef.color}`,
            animation: 'holo-ring 1.5s ease-in-out infinite',
            pointerEvents: 'none',
          }}/>
        )}
      </div>

      {/* Name plate */}
      <div style={{
        marginTop: 8, textAlign: 'center',
        fontFamily: 'monospace',
      }}>
        <div style={{
          fontSize: '0.6rem', fontWeight: 900, color: agentDef.color,
          letterSpacing: '0.1em', textShadow: `0 0 8px ${agentDef.color}`,
        }}>{agentDef.id}</div>
        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
          {agentDef.roleZh}
        </div>
        <div style={{
          fontSize: '0.45rem', color: agentDef.color, opacity: 0.7,
          border: `1px solid ${agentDef.color}40`, borderRadius: 3,
          padding: '1px 6px', marginTop: 3,
          background: `${agentDef.color}10`,
        }}>
          Lv.{agentDef.level} · {agentDef.trait}
        </div>
      </div>

      <style>{`
        @keyframes scan-line { 0%,100%{opacity:0.15} 50%{opacity:0.5} }
        @keyframes holo-ring { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.15);opacity:0.2} }
      `}</style>
    </div>
  );
}

// ── Platform / Stage ──────────────────────────────────────────────────────────
function HoloPlatform({ agents, selectedIdx, onSelect, accentColor }) {
  return (
    <div style={{
      position: 'relative', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end', flex: 1,
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(${accentColor}15 1px, transparent 1px),
          linear-gradient(90deg, ${accentColor}15 1px, transparent 1px)
        `,
        backgroundSize: '30px 30px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 40%, transparent 100%)',
      }}/>

      {/* Scanning beam */}
      <div style={{
        position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: `linear-gradient(to right, transparent, ${accentColor}80, transparent)`,
          animation: 'scan-beam 3s linear infinite',
        }}/>
      </div>

      {/* Agent figures */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 24, paddingBottom: 16,
        position: 'relative', zIndex: 2,
      }}>
        {AGENT_DEFS.map((def, i) => (
          <HoloFigure
            key={i} agentDef={def} agent={agents[i]}
            isSelected={selectedIdx === i} index={i}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>

      {/* Platform base */}
      <div style={{ position: 'relative', zIndex: 2, width: '80%' }}>
        <svg viewBox="0 0 300 40" width="100%">
          <defs>
            <linearGradient id="plat-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.6"/>
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          <ellipse cx="150" cy="10" rx="148" ry="14" fill="url(#plat-grad)" opacity="0.8"/>
          <ellipse cx="150" cy="10" rx="148" ry="14" fill="none" stroke={accentColor} strokeWidth="1" opacity="0.5"/>
          {/* Inner ring */}
          <ellipse cx="150" cy="10" rx="110" ry="10" fill="none" stroke={accentColor} strokeWidth="0.5" strokeDasharray="4 4" opacity="0.3"
            style={{ animation: 'spin-ring 8s linear infinite', transformOrigin: '150px 10px' }}/>
          {/* Particles */}
          {[0, 60, 120, 180, 240, 300].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x = 150 + 130 * Math.cos(rad);
            const y = 10 + 11 * Math.sin(rad);
            return <circle key={i} cx={x} cy={y} r="2" fill={accentColor} opacity="0.7"
              style={{ animation: `plat-dot 2s ${i * 0.3}s ease-in-out infinite` }}/>;
          })}
          {/* Label */}
          <text x="150" y="30" textAnchor="middle" fill={accentColor} fontSize="5"
            fontFamily="monospace" opacity="0.5" letterSpacing="3">
            AGENT ASSEMBLY PLATFORM · 探员组装平台
          </text>
        </svg>
      </div>

      {/* Team synergy */}
      <div style={{
        position: 'absolute', bottom: 8, left: 8,
        fontSize: '0.5rem', fontFamily: 'monospace',
        color: accentColor, opacity: 0.7,
      }}>
        TEAM SYNERGY <span style={{ fontSize: '0.7rem', fontWeight: 900 }}>82%</span>
        <div style={{ width: 60, height: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 1, marginTop: 2 }}>
          <div style={{ width: '82%', height: '100%', background: accentColor, borderRadius: 1, boxShadow: `0 0 4px ${accentColor}` }}/>
        </div>
      </div>

      <style>{`
        @keyframes scan-beam { 0%{top:-2px;opacity:0.8} 90%{opacity:0.4} 100%{top:100%;opacity:0} }
        @keyframes spin-ring { from{stroke-dashoffset:0} to{stroke-dashoffset:100} }
        @keyframes plat-dot { 0%,100%{opacity:0.3;r:1.5} 50%{opacity:1;r:3} }
      `}</style>
    </div>
  );
}

// ── Team Roster Panel (left) ──────────────────────────────────────────────────
function TeamRoster({ agents, selectedIdx, onSelect, progression }) {
  return (
    <div style={{
      width: 200, flexShrink: 0,
      border: '1px solid rgba(0,229,255,0.2)',
      borderRadius: 12, overflow: 'hidden',
      background: 'rgba(0,8,24,0.8)',
      backdropFilter: 'blur(8px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(0,229,255,0.15)',
        background: 'rgba(0,229,255,0.05)',
      }}>
        <div style={{ fontSize: '0.55rem', color: '#00e5ff', fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'monospace' }}>
          TEAM ROSTER · 探员编组
        </div>
        <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', marginTop: 2 }}>
          DEPLOYMENT ORDER 部署顺序
        </div>
      </div>

      {/* Agent slots */}
      {AGENT_DEFS.map((def, i) => {
        const lvl = getLevelFromXP(progression[i]?.xp || 0);
        const isSelected = selectedIdx === i;
        return (
          <div key={i} onClick={() => onSelect(i)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', cursor: 'pointer',
            borderLeft: `3px solid ${isSelected ? def.color : 'transparent'}`,
            background: isSelected ? `${def.color}10` : 'transparent',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            transition: 'all 0.2s',
          }}>
            {/* Order number */}
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: `1px solid ${def.color}60`,
              background: isSelected ? `${def.color}25` : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.5rem', color: def.color, fontWeight: 900,
              flexShrink: 0, fontFamily: 'monospace',
            }}>
              {String(i + 1).padStart(2, '0')}
            </div>

            {/* Agent info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12 }}>{def.icon}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 700, color: def.color, fontFamily: 'monospace' }}>{def.id}</span>
              </div>
              <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{def.roleZh}</div>
            </div>

            {/* Level badge */}
            <div style={{
              fontSize: '0.45rem', color: 'rgba(255,255,255,0.4)',
              fontFamily: 'monospace', flexShrink: 0,
            }}>
              Lv.{agentDef => agentDef.level}{def.level}
            </div>
          </div>
        );
      })}

      {/* Add agent placeholder */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 12px', opacity: 0.3,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '1px dashed rgba(255,255,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)',
        }}>+</div>
        <span style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>ADD AGENT 添加探员</span>
      </div>
    </div>
  );
}

// ── Attribute Config Panel (right) ────────────────────────────────────────────
function AttributeConfig({ agent, agentDef, onUpdate }) {
  const attrs = [
    { key: 'logic_power', label: 'LOGIC POWER', labelZh: '逻辑强度', color: '#00e5ff', desc: '影响推理链的稳定性与准确率。' },
    { key: 'observation_focus', label: 'OBSERVATION FOCUS', labelZh: '观察专注', color: '#a78bfa', desc: '影响线索发现率与细节捕捉能力。' },
    { key: 'confusion_resistance', label: 'CONFUSION RESISTANCE', labelZh: '抗干扰能力', color: '#00ff88', desc: '降低被错误信息导偏的概率。' },
    { key: 'ap_cost_discount', label: 'AP COST DISCOUNT', labelZh: '行动折扣', color: '#ffaa00', isPercent: true, desc: '降低每次行动消耗AP。' },
  ];

  return (
    <div style={{
      width: 220, flexShrink: 0,
      border: '1px solid rgba(0,229,255,0.2)',
      borderRadius: 12, overflow: 'hidden',
      background: 'rgba(0,8,24,0.8)',
      backdropFilter: 'blur(8px)',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: '1px solid rgba(0,229,255,0.15)',
        background: 'rgba(0,229,255,0.05)',
      }}>
        <div style={{ fontSize: '0.55rem', color: '#00e5ff', fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'monospace' }}>
          ATTRIBUTE CONFIGURATION · 属性配置
        </div>
        {/* Selected agent */}
        <div style={{
          marginTop: 6, padding: '4px 8px',
          border: `1px solid ${agentDef.color}40`,
          borderRadius: 6, background: `${agentDef.color}10`,
          fontSize: '0.55rem', color: agentDef.color, fontFamily: 'monospace',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span>{agentDef.icon}</span>
          <span style={{ fontWeight: 700 }}>{agentDef.id}</span>
          <span style={{ opacity: 0.5, marginLeft: 'auto' }}>SELECTED</span>
        </div>
      </div>

      {/* Attributes */}
      <div style={{ padding: '10px 12px' }}>
        {attrs.map(attr => {
          const val = agent?.[attr.key] || 0;
          return (
            <div key={attr.key} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div>
                  <div style={{ fontSize: '0.5rem', fontWeight: 700, color: attr.color, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                    {attr.label}
                  </div>
                  <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                    {attr.labelZh}
                  </div>
                </div>
                <div style={{
                  fontSize: '0.75rem', fontWeight: 900, color: attr.color,
                  fontFamily: 'monospace', textShadow: `0 0 8px ${attr.color}`,
                }}>
                  {attr.isPercent ? `${val}%` : `${val}/100`}
                </div>
              </div>
              {/* Slider */}
              <div style={{ position: 'relative', height: 6 }}>
                <div style={{ height: '100%', borderRadius: 3, background: 'rgba(255,255,255,0.08)' }}/>
                <div style={{
                  position: 'absolute', top: 0, left: 0,
                  width: `${attr.isPercent ? val * 5 : val}%`,
                  height: '100%', borderRadius: 3,
                  background: `linear-gradient(to right, ${attr.color}80, ${attr.color})`,
                  boxShadow: `0 0 6px ${attr.color}80`,
                  transition: 'width 0.3s ease',
                }}/>
                <input type="range" min="0" max={attr.isPercent ? 20 : 100} value={val}
                  onChange={e => onUpdate({ ...agent, [attr.key]: Number(e.target.value) })}
                  style={{
                    position: 'absolute', top: -3, left: 0, width: '100%', height: 12,
                    opacity: 0, cursor: 'pointer', zIndex: 2,
                  }}
                />
              </div>
              <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', marginTop: 3 }}>
                {attr.desc}
              </div>
            </div>
          );
        })}

        {/* Agent trait */}
        <div style={{
          marginTop: 8, padding: '8px',
          border: `1px solid ${agentDef.color}25`,
          borderRadius: 8, background: `${agentDef.color}06`,
        }}>
          <div style={{ fontSize: '0.48rem', color: agentDef.color, fontWeight: 700, fontFamily: 'monospace', marginBottom: 4 }}>
            AGENT TRAIT · 探员特性
          </div>
          <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', lineHeight: 1.5 }}>
            {agentDef.descZh}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Case Preview Panel ────────────────────────────────────────────────────────
function CasePreview({ accentColor }) {
  return (
    <div style={{
      position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
      width: 280, zIndex: 5,
      border: '1px solid rgba(255,58,96,0.3)',
      borderRadius: 10, overflow: 'hidden',
      background: 'rgba(0,4,12,0.9)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,58,96,0.2)', background: 'rgba(255,58,96,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.5rem', color: '#ff3860', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
            CASE PREVIEW · 案件预览
          </div>
          <div style={{ fontSize: '0.45rem', color: '#ff3860', border: '1px solid #ff386050', borderRadius: 3, padding: '1px 6px', fontFamily: 'monospace' }}>
            THREAT: HIGH
          </div>
        </div>
      </div>
      <div style={{ padding: '8px 10px', fontSize: '0.5rem', fontFamily: 'monospace' }}>
        <div style={{ color: '#ff6b35', fontWeight: 700, marginBottom: 3 }}>霓虹血迹 · NEON BLOOD</div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.42rem', lineHeight: 1.5, marginBottom: 6 }}>
          高科技大亨在赛博城市顶层豪华套房中被发现死亡，电磁脉冲痕迹与神经接口灼伤指向内部人员犯罪。
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          {[
            { label: 'EST. DIFFICULTY', val: '★★★★★' },
            { label: 'TEAM POWER', val: '78' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '4px 6px', textAlign: 'center' }}>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.4rem' }}>{s.label}</div>
              <div style={{ color: '#ffaa00', fontSize: '0.6rem', fontWeight: 700 }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.25)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 4 }}>
          OBJECTIVES · 任务目标
        </div>
        {['锁定真凶并提交完整指控报告', '发现隐藏线索 c_secret_99', '保持混乱值低于 75%'].map((obj, i) => (
          <div key={i} style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
            • {obj}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top Status Bar ────────────────────────────────────────────────────────────
function StatusBar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px',
      borderBottom: '1px solid rgba(0,229,255,0.15)',
      background: 'rgba(0,0,0,0.6)',
      fontFamily: 'monospace', fontSize: '0.5rem',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ color: '#00e5ff', fontWeight: 900, letterSpacing: '0.15em', fontSize: '0.6rem' }}>
          TD
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 10 }}>
          USER: <span style={{ color: '#00e5ff' }}>ARCHITECT</span>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)' }}>架构师控制台</div>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>SYSTEM STATUS: <span style={{ color: '#00ff88' }}>● ONLINE</span></span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>DATA STREAM: <span style={{ color: '#00e5ff' }}>2.45 TB/S</span></span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>SESSION ID: <span style={{ color: '#a78bfa' }}>TD-{time.toISOString().slice(0,10).replace(/-/g,'')}</span></span>
        <span style={{ color: '#00e5ff', fontWeight: 700 }}>
          {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ── Deploy Controls (bottom bar) ──────────────────────────────────────────────
function DeployControls({ onDeploy, onSave, onLoad }) {
  const [deploying, setDeploying] = useState(false);

  const handleDeploy = async () => {
    setDeploying(true);
    await new Promise(r => setTimeout(r, 600));
    onDeploy();
  };

  const btns = [
    { label: 'SAVE CONFIG\n保存配置', icon: '💾', onClick: onSave, color: '#00e5ff' },
    { label: 'LOAD CHECKPOINT\n加载存档', icon: '📂', onClick: onLoad, color: '#a78bfa' },
    { label: 'HOT RELOAD\n热重载', icon: '🔄', onClick: () => window.location.reload(), color: '#ffaa00' },
    { label: 'TUTORIAL\n教程', icon: '❓', onClick: () => {}, color: 'rgba(255,255,255,0.4)' },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 16px',
      borderTop: '1px solid rgba(0,229,255,0.15)',
      background: 'rgba(0,0,0,0.7)',
      flexShrink: 0,
    }}>
      {btns.map((b, i) => (
        <button key={i} onClick={b.onClick} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
          padding: '6px 12px', borderRadius: 8,
          border: `1px solid ${b.color}40`,
          background: `${b.color}08`,
          color: b.color, cursor: 'pointer',
          fontFamily: 'monospace', fontSize: '0.45rem',
          whiteSpace: 'pre-line', textAlign: 'center',
          transition: 'all 0.2s',
        }}>
          <span style={{ fontSize: 14 }}>{b.icon}</span>
          {b.label}
        </button>
      ))}

      {/* Main deploy button */}
      <button
        onClick={handleDeploy}
        disabled={deploying}
        style={{
          flex: 1, maxWidth: 280, marginLeft: 8,
          padding: '10px 24px', borderRadius: 10,
          border: '2px solid #00e5ff80',
          background: deploying
            ? 'rgba(0,229,255,0.2)'
            : 'linear-gradient(135deg, rgba(0,100,180,0.6) 0%, rgba(0,200,255,0.4) 100%)',
          color: '#fff', cursor: 'pointer',
          fontFamily: 'monospace', fontWeight: 900,
          fontSize: '0.75rem', letterSpacing: '0.2em',
          textShadow: '0 0 10px rgba(0,229,255,0.8)',
          boxShadow: '0 0 20px rgba(0,200,255,0.3), 0 0 40px rgba(0,200,255,0.1)',
          transition: 'all 0.3s',
          position: 'relative', overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, transparent, rgba(0,229,255,0.1), transparent)', animation: 'btn-shimmer 2s linear infinite' }}/>
        {deploying ? '⟳ DEPLOYING...' : '▶ DEPLOY AGENTS\n部署探员'}
      </button>

      <style>{`
        @keyframes btn-shimmer { from{transform:translateX(-100%)} to{transform:translateX(100%)} }
      `}</style>
    </div>
  );
}

// ── Main HolographicLobby ─────────────────────────────────────────────────────
export default function HolographicLobby({ onDeploy }) {
  const [agents, setAgents] = useState(() => {
    const saved = LocalStorage.loadTeamConfig();
    if (saved && Array.isArray(saved) && saved.length === 3) return saved;
    return makeDefaultTeam();
  });
  const [progression] = useState(() => loadProgression());
  const [selectedIdx, setSelectedIdx] = useState(1); // NEXUS-01 center is idx 1 (Lead)

  const accentColor = '#00e5ff';

  const updateAgent = (updated) => {
    setAgents(prev => prev.map((a, i) => i === selectedIdx ? updated : a));
  };

  const handleDeploy = () => {
    LocalStorage.saveTeamConfig(agents);
    const teamConfig = {
      ...DEFAULT_AGENT_CONFIG,
      agent_id: agents.map(a => a.agent_id).join('+'),
      role: 'Multi_Agent_Team',
      base_stance: agents[selectedIdx]?.base_stance || 'analytical',
      team: agents,
      combat_attributes: {
        logic_power: Math.max(...agents.map(a => a.logic_power || 0)),
        observation_focus: Math.max(...agents.map(a => a.observation_focus || 0)),
        hack_level: Math.max(...agents.map(a => a.hack_level || 0)),
      },
      engine_modifiers: {
        confusion_resistance: agents.reduce((s, a) => s + (a.confusion_resistance || 0), 0) / 300,
        ap_cost_discount: agents.reduce((s, a) => s + (a.ap_cost_discount || 0), 0) / 60,
      },
    };
    onDeploy(teamConfig);
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(ellipse at 30% 10%, #060d1f 0%, #020610 60%, #010408 100%)',
      fontFamily: "'Courier New', monospace",
      color: 'white', overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Scanlines overlay */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.12) 2px, rgba(0,0,0,0.12) 4px)',
      }}/>

      {/* Corner decorations */}
      {[
        { top: 0, left: 0, borderTop: '2px solid #00e5ff40', borderLeft: '2px solid #00e5ff40' },
        { top: 0, right: 0, borderTop: '2px solid #a78bfa40', borderRight: '2px solid #a78bfa40' },
        { bottom: 32, left: 0, borderBottom: '2px solid #00e5ff40', borderLeft: '2px solid #00e5ff40' },
        { bottom: 32, right: 0, borderBottom: '2px solid #a78bfa40', borderRight: '2px solid #a78bfa40' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 40, height: 40, pointerEvents: 'none', zIndex: 10, ...s }}/>
      ))}

      {/* Status bar */}
      <StatusBar />

      {/* Title bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px',
        borderBottom: '1px solid rgba(0,229,255,0.1)',
        background: 'rgba(0,0,0,0.3)',
        flexShrink: 0, zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', letterSpacing: '0.2em' }}>TERMINAL DETECTIVE · LOGIC ARCHITECT</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#00e5ff', textShadow: '0 0 12px #00e5ff', fontFamily: 'monospace', letterSpacing: '0.05em' }}>全息探员大厅</span>
              <span style={{ fontSize: '0.6rem', color: 'rgba(0,229,255,0.5)', fontFamily: 'monospace', letterSpacing: '0.15em' }}>HOLOGRAPHIC AGENT LOBBY</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', maxWidth: 300, textAlign: 'right', lineHeight: 1.5 }}>
          在调查任务开始前，配置并优化你的AI探员团队。<br/>
          合理分配属性与优先级，打造最优逻辑组合，迎接未知挑战。
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1,
      }}>
        {/* Left: Team Roster */}
        <div style={{ width: 210, flexShrink: 0, padding: '12px 0 12px 12px', overflowY: 'auto' }}>
          <TeamRoster
            agents={agents} selectedIdx={selectedIdx}
            onSelect={setSelectedIdx} progression={progression}
          />
        </div>

        {/* Center: Holographic Stage */}
        <div style={{
          flex: 1, position: 'relative', display: 'flex', flexDirection: 'column',
          padding: '8px 12px',
        }}>
          {/* Case preview floating panel */}
          <CasePreview accentColor={accentColor} />

          {/* Holo platform takes up center */}
          <HoloPlatform
            agents={agents} selectedIdx={selectedIdx}
            onSelect={setSelectedIdx} accentColor={accentColor}
          />
        </div>

        {/* Right: Attribute Config */}
        <div style={{ width: 230, flexShrink: 0, padding: '12px 12px 12px 0', overflowY: 'auto' }}>
          <AttributeConfig
            agent={agents[selectedIdx]}
            agentDef={AGENT_DEFS[selectedIdx]}
            onUpdate={updateAgent}
          />
        </div>
      </div>

      {/* Deploy controls */}
      <DeployControls
        onDeploy={handleDeploy}
        onSave={() => { LocalStorage.saveTeamConfig(agents); }}
        onLoad={() => {
          const saved = LocalStorage.loadTeamConfig();
          if (saved) setAgents(saved);
        }}
      />
    </div>
  );
}