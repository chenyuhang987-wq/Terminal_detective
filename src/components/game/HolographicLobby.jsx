import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLang } from '@/lib/lang.jsx';
import { LocalStorage } from '@/game/gameState';
import { DEFAULT_AGENT_CONFIG } from '@/game/caseData';
import { loadProgression, getLevelFromXP, getXPToNextLevel } from '@/game/agentProgression';

// ── Agent definitions ─────────────────────────────────────────────────────────
const AGENT_DEFS = [
  {
    id: 'NEXUS-01', name: 'NEXUS-01', role: 'Lead Investigator',
    roleZh: '首席调查员', icon: '👁️', color: '#00e5ff',
    stance: 'analytical',
    desc: '逻辑主宰：在复杂推理链中获得额外15%逻辑加成。复杂推理优先。',
    traitEn: 'Logic',
    attrs: { logic_power: 78, observation_focus: 60, confusion_resistance: 72, ap_cost_discount: 15, hack_level: 20 },
  },
  {
    id: 'AURORA-09', name: 'AURORA-09', role: 'Forensic Analyst',
    roleZh: '法证分析师', icon: '🔬', color: '#a78bfa',
    stance: 'analytical',
    desc: '精准之眼：证据分析时线索发现率提升20%。观察型行动优先。',
    traitEn: 'Observation',
    attrs: { logic_power: 64, observation_focus: 80, confusion_resistance: 55, ap_cost_discount: 10, hack_level: 20 },
  },
  {
    id: 'CIPHER-47', name: 'CIPHER-47', role: 'Tech Specialist',
    roleZh: '技术专家', icon: '💻', color: '#ff6b35',
    stance: 'cautious',
    desc: '幽灵协议：数字渗透时被发现风险降低30%。黑客类行动优先。',
    traitEn: 'Hacker',
    attrs: { logic_power: 45, observation_focus: 40, confusion_resistance: 68, ap_cost_discount: 20, hack_level: 75 },
  },
];

const PRIORITY_ACTIONS = [
  { id: 'search_area', label: '区域搜索', icon: '🔭', color: '#00e5ff' },
  { id: 'examine_clue', label: '线索检验', icon: '🔍', color: '#a78bfa' },
  { id: 'interrogate_npc', label: 'NPC审讯', icon: '🎤', color: '#ffaa00' },
  { id: 'hack_system', label: '系统入侵', icon: '💾', color: '#ff6b35' },
  { id: 'analyze_forensics', label: '法证分析', icon: '🧪', color: '#00ff88' },
  { id: 'check_alibi', label: '不在场核查', icon: '⏱️', color: '#ff3aff' },
];

function makeDefaultTeam() {
  return AGENT_DEFS.map(a => ({
    agent_id: a.id, role: a.roleZh, base_stance: a.stance,
    ...a.attrs,
    priority_list: PRIORITY_ACTIONS.map(p => p.id),
  }));
}

// ── Particle Canvas — neural network lines ────────────────────────────────────
function ParticleCanvas({ agents, selectedIdx, accentColor }) {
  const canvasRef = useRef(null);
  const particles = useRef([]);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Spawn floating particles
    particles.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: 1 + Math.random() * 2,
      opacity: 0.2 + Math.random() * 0.5,
      color: AGENT_DEFS[Math.floor(Math.random() * 3)].color,
    }));

    // Agent node positions (roughly center positions of holo figures)
    const getNodePositions = () => {
      const w = canvas.width, h = canvas.height;
      return [
        { x: w * 0.25, y: h * 0.55, color: AGENT_DEFS[0].color },
        { x: w * 0.5,  y: h * 0.45, color: AGENT_DEFS[1].color },
        { x: w * 0.75, y: h * 0.55, color: AGENT_DEFS[2].color },
      ];
    };

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const nodes = getNodePositions();

      // Draw inter-agent connection lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0, a.color + '60');
          grad.addColorStop(1, b.color + '60');
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = grad;
          ctx.lineWidth = (i === selectedIdx || j === selectedIdx) ? 1.5 : 0.7;
          ctx.setLineDash([6, 8]);
          ctx.stroke();
          ctx.setLineDash([]);

          // Animated dot traveling along the line
          const t = (Date.now() % 3000) / 3000;
          const tx = a.x + (b.x - a.x) * t;
          const ty = a.y + (b.y - a.y) * t;
          ctx.beginPath();
          ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = a.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = a.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      // Draw particles + connect nearby ones
      particles.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        // Connect to nearest agent node
        nodes.forEach(n => {
          const dx = p.x - n.x, dy = p.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            const alpha = (1 - dist / 140) * 0.35;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(n.x, n.y);
            ctx.strokeStyle = n.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });

        // Particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 200).toString(16).padStart(2, '0');
        ctx.fill();
      });

      // Selected agent halo
      const selNode = nodes[selectedIdx];
      if (selNode) {
        const t = (Date.now() % 2000) / 2000;
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
        ctx.beginPath();
        ctx.arc(selNode.x, selNode.y, 55 + pulse * 15, 0, Math.PI * 2);
        ctx.strokeStyle = selNode.color + '30';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(selNode.x, selNode.y, 40 + pulse * 8, 0, Math.PI * 2);
        ctx.strokeStyle = selNode.color + '50';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, [selectedIdx]);

  return (
    <canvas ref={canvasRef} style={{
      position: 'absolute', inset: 0, width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: 1,
    }} />
  );
}

// ── Holographic Agent Figure ──────────────────────────────────────────────────
function HoloFigure({ agentDef, isSelected, onClick, index, level }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 80);
    return () => clearInterval(id);
  }, []);

  const scanY = ((tick * 2.5) % 110);

  return (
    <div onClick={onClick} style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      cursor: 'pointer', position: 'relative', zIndex: 3,
      transform: isSelected ? 'scale(1.12) translateY(-10px)' : 'scale(1)',
      transition: 'transform 0.35s cubic-bezier(.22,1,.36,1)',
    }}>
      {/* Selected glow aura */}
      {isSelected && (
        <div style={{
          position: 'absolute', inset: -18,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${agentDef.color}25 0%, transparent 70%)`,
          animation: 'aura-pulse 1.8s ease-in-out infinite',
          pointerEvents: 'none',
        }}/>
      )}

      {/* SVG figure */}
      <div style={{
        width: isSelected ? 86 : 66, height: isSelected ? 134 : 112,
        filter: `drop-shadow(0 0 ${isSelected ? 24 : 10}px ${agentDef.color})`,
        transition: 'all 0.35s ease', position: 'relative', overflow: 'hidden',
      }}>
        <svg viewBox="0 0 64 110" width="100%" height="100%">
          <defs>
            <linearGradient id={`hg-${index}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={agentDef.color} stopOpacity="0.95"/>
              <stop offset="100%" stopColor={agentDef.color} stopOpacity="0.08"/>
            </linearGradient>
            <clipPath id={`clip-${index}`}><rect x="0" y="0" width="64" height="110"/></clipPath>
          </defs>
          {/* Body parts */}
          <ellipse cx="32" cy="12" rx="9" ry="10" fill={`url(#hg-${index})`} opacity="0.88"/>
          <path d="M18 24 L46 24 L52 70 L42 70 L40 90 L24 90 L22 70 L12 70Z" fill={`url(#hg-${index})`} opacity="0.78"/>
          <path d="M18 28 L6 55 L10 57 L20 34" fill={`url(#hg-${index})`} opacity="0.6"/>
          <path d="M46 28 L58 55 L54 57 L44 34" fill={`url(#hg-${index})`} opacity="0.6"/>
          <path d="M22 90 L18 108 L26 108 L30 90" fill={`url(#hg-${index})`} opacity="0.65"/>
          <path d="M42 90 L46 108 L38 108 L34 90" fill={`url(#hg-${index})`} opacity="0.65"/>
          {/* Static scan lines */}
          {[18, 32, 46, 60, 74, 88].map((y, i) => (
            <line key={i} x1="6" y1={y} x2="58" y2={y}
              stroke={agentDef.color} strokeWidth="0.5" opacity="0.18"/>
          ))}
          {/* Animated scan beam */}
          <rect x="0" y={scanY} width="64" height="3"
            fill={agentDef.color} opacity="0.35" clipPath={`url(#clip-${index})`}
            style={{ filter: `blur(1px)` }}/>
          {/* Grid overlay */}
          <path d="M0 0 L64 0 M0 55 L64 55 M32 0 L32 110" stroke={agentDef.color} strokeWidth="0.3" opacity="0.12"/>
        </svg>
      </div>

      {/* Name plate */}
      <div style={{ marginTop: 8, textAlign: 'center', fontFamily: 'monospace' }}>
        <div style={{
          fontSize: '0.62rem', fontWeight: 900, color: agentDef.color,
          letterSpacing: '0.08em', textShadow: `0 0 10px ${agentDef.color}`,
        }}>{agentDef.id}</div>
        <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>{agentDef.roleZh}</div>
        <div style={{
          display: 'inline-block', marginTop: 4,
          fontSize: '0.42rem', color: agentDef.color,
          border: `1px solid ${agentDef.color}50`, borderRadius: 3,
          padding: '1px 7px', background: `${agentDef.color}12`,
        }}>Lv.{level} · {agentDef.traitEn}</div>
      </div>

      <style>{`
        @keyframes aura-pulse { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.08)} }
      `}</style>
    </div>
  );
}

// ── Draggable Priority List ───────────────────────────────────────────────────
function PriorityList({ priorityList, onChange }) {
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const getAction = (id) => PRIORITY_ACTIONS.find(a => a.id === id);

  const handleDrop = (targetId) => {
    if (!dragging || dragging === targetId) return;
    const next = [...priorityList];
    const from = next.indexOf(dragging);
    const to = next.indexOf(targetId);
    next.splice(from, 1);
    next.splice(to, 0, dragging);
    onChange(next);
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div>
      <div style={{
        fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace',
        letterSpacing: '0.12em', marginBottom: 8,
      }}>
        ◈ 行动优先级 <span style={{ opacity: 0.5 }}>拖拽排序</span>
      </div>
      {priorityList.map((id, idx) => {
        const action = getAction(id);
        if (!action) return null;
        const isOver = dragOver === id;
        return (
          <div
            key={id}
            draggable
            onDragStart={() => setDragging(id)}
            onDragOver={e => { e.preventDefault(); setDragOver(id); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={() => handleDrop(id)}
            onDragEnd={() => { setDragging(null); setDragOver(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 10px', marginBottom: 4, borderRadius: 8,
              border: `1px solid ${isOver ? action.color : action.color + '25'}`,
              background: isOver ? `${action.color}20` : dragging === id ? `${action.color}10` : 'rgba(255,255,255,0.03)',
              cursor: 'grab', transition: 'all 0.15s',
              transform: isOver ? 'translateX(4px)' : 'none',
              boxShadow: isOver ? `0 0 10px ${action.color}40` : 'none',
              opacity: dragging === id ? 0.5 : 1,
            }}
          >
            <div style={{
              fontSize: '0.48rem', color: 'rgba(255,255,255,0.25)',
              fontFamily: 'monospace', width: 16, textAlign: 'center',
            }}>#{idx + 1}</div>
            <span style={{ fontSize: 14 }}>{action.icon}</span>
            <span style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: action.color, fontWeight: 700, flex: 1 }}>
              {action.label}
            </span>
            <span style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.2)' }}>⠿⠿</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Attribute Slider Row ──────────────────────────────────────────────────────
function AttrSlider({ label, labelZh, value, max, color, isPercent, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <div>
          <div style={{ fontSize: '0.48rem', fontWeight: 700, color, fontFamily: 'monospace', letterSpacing: '0.05em' }}>{label}</div>
          <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{labelZh}</div>
        </div>
        <div style={{ fontSize: '0.78rem', fontWeight: 900, color, fontFamily: 'monospace', textShadow: `0 0 8px ${color}` }}>
          {isPercent ? `${value}%` : `${value}`}
        </div>
      </div>
      <div style={{ position: 'relative', height: 8 }}>
        <div style={{ height: '100%', borderRadius: 4, background: 'rgba(255,255,255,0.07)' }}/>
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: `${isPercent ? (value / max) * 100 : value}%`,
          height: '100%', borderRadius: 4,
          background: `linear-gradient(to right, ${color}55, ${color})`,
          boxShadow: `0 0 8px ${color}80`, transition: 'width 0.2s ease',
        }}/>
        <input type="range" min="0" max={max} value={value}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', top: -2, left: 0, width: '100%', height: 12,
            opacity: 0, cursor: 'pointer', zIndex: 2,
          }}
        />
      </div>
    </div>
  );
}

// ── Left: Team Roster + Priority ──────────────────────────────────────────────
function TeamRosterPanel({ agents, selectedIdx, onSelect, progression, onPriorityChange }) {
  const lvls = AGENT_DEFS.map((_, i) => getLevelFromXP(progression[i]?.xp || 0));
  return (
    <div style={{
      width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 10,
      padding: '12px 0 12px 12px',
    }}>
      {/* Roster card */}
      <div style={{
        border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, overflow: 'hidden',
        background: 'rgba(0,8,24,0.85)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          padding: '7px 12px', borderBottom: '1px solid rgba(0,229,255,0.12)',
          background: 'rgba(0,229,255,0.05)',
          fontSize: '0.52rem', color: '#00e5ff', fontWeight: 700,
          letterSpacing: '0.12em', fontFamily: 'monospace',
        }}>
          TEAM ROSTER · 探员编组
        </div>
        {AGENT_DEFS.map((def, i) => {
          const isSelected = selectedIdx === i;
          const xpInfo = getXPToNextLevel(progression[i]?.xp || 0);
          return (
            <div key={i} onClick={() => onSelect(i)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', cursor: 'pointer',
              borderLeft: `3px solid ${isSelected ? def.color : 'transparent'}`,
              background: isSelected ? `${def.color}12` : 'transparent',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.2s',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                border: `1.5px solid ${def.color}70`,
                background: isSelected ? `${def.color}30` : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.52rem', color: def.color, fontWeight: 900, fontFamily: 'monospace',
                boxShadow: isSelected ? `0 0 10px ${def.color}80` : 'none',
              }}>{lvls[i]}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 11 }}>{def.icon}</span>
                  <span style={{ fontSize: '0.58rem', fontWeight: 700, color: def.color, fontFamily: 'monospace', letterSpacing: '0.04em' }}>{def.id}</span>
                </div>
                <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{def.roleZh}</div>
                {/* XP mini bar */}
                <div style={{ marginTop: 3, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
                  <div style={{ width: `${xpInfo.pct}%`, height: '100%', background: def.color, borderRadius: 1, transition: 'width 0.5s ease' }}/>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Priority list card */}
      <div style={{
        border: '1px solid rgba(167,139,250,0.2)', borderRadius: 12,
        background: 'rgba(0,4,20,0.85)', backdropFilter: 'blur(10px)',
        padding: '10px 12px', flex: 1,
      }}>
        <PriorityList
          priorityList={agents[selectedIdx]?.priority_list || PRIORITY_ACTIONS.map(p => p.id)}
          onChange={(list) => onPriorityChange(selectedIdx, list)}
        />
      </div>
    </div>
  );
}

// ── Center: Holographic Stage ─────────────────────────────────────────────────
function HoloStage({ agents, selectedIdx, onSelect, accentColor, progression }) {
  const lvls = AGENT_DEFS.map((_, i) => getLevelFromXP(progression[i]?.xp || 0));
  const [tick, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 50); return () => clearInterval(id); }, []);
  const synergy = Math.round(
    (agents.reduce((s, a) => s + (a.logic_power || 0) + (a.observation_focus || 0) + (a.confusion_resistance || 0), 0) / (3 * 300)) * 100
  );

  return (
    <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Grid bg */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: `linear-gradient(${accentColor}12 1px, transparent 1px), linear-gradient(90deg, ${accentColor}12 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
        maskImage: 'radial-gradient(ellipse 85% 85% at 50% 50%, black 30%, transparent 100%)',
      }}/>

      {/* Particle network canvas */}
      <ParticleCanvas agents={agents} selectedIdx={selectedIdx} accentColor={accentColor} />

      {/* Case preview floating */}
      <div style={{
        position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
        width: 268, zIndex: 10,
        border: '1px solid rgba(255,58,96,0.35)', borderRadius: 10,
        background: 'rgba(2,4,14,0.92)', backdropFilter: 'blur(10px)',
      }}>
        <div style={{
          padding: '5px 10px', borderBottom: '1px solid rgba(255,58,96,0.2)',
          background: 'rgba(255,58,96,0.07)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.5rem', color: '#ff3860', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
            CASE PREVIEW · 案件预览
          </span>
          <span style={{ fontSize: '0.42rem', color: '#ff3860', border: '1px solid #ff386040', borderRadius: 3, padding: '1px 5px', fontFamily: 'monospace' }}>
            THREAT: HIGH
          </span>
        </div>
        <div style={{ padding: '7px 10px', fontFamily: 'monospace' }}>
          <div style={{ color: '#ff6b35', fontWeight: 700, fontSize: '0.52rem', marginBottom: 3 }}>霓虹血迹 · NEON BLOOD</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.42rem', lineHeight: 1.5, marginBottom: 5 }}>
            高科技大亨在赛博城顶层豪华套房中死亡，电磁脉冲痕迹与神经接口灼伤指向内部人员。
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { label: 'DIFFICULTY', val: '★★★★☆' },
              { label: 'TEAM POWER', val: `${Math.round(synergy * 0.82 + 20)}` },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5,
                padding: '4px 6px', textAlign: 'center',
              }}>
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.38rem' }}>{s.label}</div>
                <div style={{ color: '#ffaa00', fontSize: '0.6rem', fontWeight: 700 }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scan beam */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 2 }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 2,
          background: `linear-gradient(to right, transparent, ${accentColor}60, transparent)`,
          animation: 'scan-beam 4s linear infinite',
        }}/>
      </div>

      {/* Agents on stage */}
      <div style={{
        position: 'absolute', bottom: 80, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end',
        padding: '0 30px', zIndex: 3,
      }}>
        {AGENT_DEFS.map((def, i) => (
          <HoloFigure
            key={i} agentDef={def} isSelected={selectedIdx === i}
            index={i} level={lvls[i]} onClick={() => onSelect(i)}
          />
        ))}
      </div>

      {/* Platform ellipse */}
      <div style={{ position: 'absolute', bottom: 20, left: '10%', right: '10%', zIndex: 2 }}>
        <svg viewBox="0 0 400 50" width="100%" style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="plat-g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity="0.7"/>
              <stop offset="100%" stopColor={accentColor} stopOpacity="0.05"/>
            </linearGradient>
          </defs>
          <ellipse cx="200" cy="14" rx="198" ry="16" fill="url(#plat-g)" opacity="0.85"/>
          <ellipse cx="200" cy="14" rx="198" ry="16" fill="none" stroke={accentColor} strokeWidth="1.2" opacity="0.6"/>
          <ellipse cx="200" cy="14" rx="148" ry="12" fill="none" stroke={accentColor} strokeWidth="0.6" strokeDasharray="6 5" opacity="0.3"
            style={{ animation: 'spin-ring 10s linear infinite', transformOrigin: '200px 14px' }}/>
          {[0, 72, 144, 216, 288].map((angle, i) => {
            const r = (angle * Math.PI) / 180;
            return <circle key={i} cx={200 + 180 * Math.cos(r)} cy={14 + 14 * Math.sin(r)} r="3"
              fill={accentColor} opacity="0.8" style={{ animation: `plat-dot 2.5s ${i * 0.5}s ease-in-out infinite` }}/>;
          })}
          <text x="200" y="38" textAnchor="middle" fill={accentColor} fontSize="6"
            fontFamily="monospace" opacity="0.4" letterSpacing="4">
            AGENT DISPATCH CENTER · AI INVESTIGATION UNIT
          </text>
        </svg>
      </div>

      {/* Synergy readout */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 5,
        fontFamily: 'monospace', fontSize: '0.48rem',
      }}>
        <div style={{ color: 'rgba(255,255,255,0.3)', marginBottom: 2 }}>TEAM SYNERGY</div>
        <div style={{ color: accentColor, fontSize: '0.85rem', fontWeight: 900, textShadow: `0 0 8px ${accentColor}` }}>
          {synergy}%
        </div>
        <div style={{ width: 70, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginTop: 2 }}>
          <div style={{ width: `${synergy}%`, height: '100%', background: accentColor, borderRadius: 2, boxShadow: `0 0 6px ${accentColor}` }}/>
        </div>
      </div>

      <style>{`
        @keyframes scan-beam { 0%{top:-2px;opacity:0.8} 90%{opacity:0.3} 100%{top:100%;opacity:0} }
        @keyframes spin-ring { from{stroke-dashoffset:0} to{stroke-dashoffset:100} }
        @keyframes plat-dot { 0%,100%{opacity:0.3} 50%{opacity:1} }
      `}</style>
    </div>
  );
}

// ── Right: Attribute Config ───────────────────────────────────────────────────
function AttributePanel({ agent, agentDef, onUpdate }) {
  const attrs = [
    { key: 'logic_power', label: 'LOGIC POWER', labelZh: '逻辑强度', color: '#00e5ff', max: 100 },
    { key: 'observation_focus', label: 'OBSERVATION', labelZh: '观察专注', color: '#a78bfa', max: 100 },
    { key: 'confusion_resistance', label: 'ANTI-CHAOS', labelZh: '抗干扰', color: '#00ff88', max: 100 },
    { key: 'ap_cost_discount', label: 'AP DISCOUNT', labelZh: '行动折扣', color: '#ffaa00', max: 30, isPercent: true },
    { key: 'hack_level', label: 'HACK LEVEL', labelZh: '黑客等级', color: '#ff6b35', max: 100 },
  ];

  return (
    <div style={{
      width: 230, flexShrink: 0, padding: '12px 12px 12px 0',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{
        border: `1px solid ${agentDef.color}35`, borderRadius: 12, overflow: 'hidden',
        background: 'rgba(0,8,24,0.85)', backdropFilter: 'blur(10px)',
        flex: 1,
      }}>
        {/* Header */}
        <div style={{
          padding: '7px 12px', borderBottom: `1px solid ${agentDef.color}20`,
          background: `${agentDef.color}07`,
        }}>
          <div style={{ fontSize: '0.52rem', color: '#00e5ff', fontWeight: 700, letterSpacing: '0.12em', fontFamily: 'monospace', marginBottom: 5 }}>
            ATTRIBUTE CONFIG · 属性配置
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '4px 8px', border: `1px solid ${agentDef.color}45`,
            borderRadius: 6, background: `${agentDef.color}12`,
          }}>
            <span style={{ fontSize: 16 }}>{agentDef.icon}</span>
            <div>
              <div style={{ fontSize: '0.6rem', color: agentDef.color, fontWeight: 900, fontFamily: 'monospace' }}>{agentDef.id}</div>
              <div style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{agentDef.roleZh}</div>
            </div>
          </div>
        </div>

        {/* Attrs */}
        <div style={{ padding: '12px 12px' }}>
          {attrs.map(attr => (
            <AttrSlider
              key={attr.key}
              label={attr.label} labelZh={attr.labelZh}
              value={agent?.[attr.key] || 0} max={attr.max}
              color={attr.color} isPercent={attr.isPercent}
              onChange={val => onUpdate({ ...agent, [attr.key]: val })}
            />
          ))}

          {/* Trait card */}
          <div style={{
            marginTop: 8, padding: '8px 10px',
            border: `1px solid ${agentDef.color}25`, borderRadius: 8,
            background: `${agentDef.color}07`,
          }}>
            <div style={{ fontSize: '0.48rem', color: agentDef.color, fontWeight: 700, fontFamily: 'monospace', marginBottom: 4 }}>
              ◎ AGENT TRAIT
            </div>
            <div style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', lineHeight: 1.55 }}>
              {agentDef.desc}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Status Bar ────────────────────────────────────────────────────────────────
function StatusBar() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
  return (
    <div style={{
      height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', borderBottom: '1px solid rgba(0,229,255,0.15)',
      background: 'rgba(0,0,0,0.65)', fontFamily: 'monospace', fontSize: '0.5rem', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#00e5ff', fontWeight: 900, letterSpacing: '0.15em', fontSize: '0.62rem' }}>TD</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: 10 }}>
          USER: <span style={{ color: '#00e5ff' }}>ARCHITECT</span>
        </span>
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>架构师控制台</span>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>SYSTEM: <span style={{ color: '#00ff88' }}>● ONLINE</span></span>
        <span style={{ color: 'rgba(255,255,255,0.3)' }}>DATA: <span style={{ color: '#00e5ff' }}>2.45 TB/S</span></span>
        <span style={{ color: '#00e5ff', fontWeight: 700 }}>
          {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ── Deploy Controls ───────────────────────────────────────────────────────────
function DeployControls({ onDeploy, onSave, onLoad }) {
  const [deploying, setDeploying] = useState(false);
  const handleDeploy = async () => {
    setDeploying(true);
    await new Promise(r => setTimeout(r, 700));
    onDeploy();
  };

  const btns = [
    { label: 'SAVE\n保存', icon: '💾', onClick: onSave, color: '#00e5ff' },
    { label: 'LOAD\n加载', icon: '📂', onClick: onLoad, color: '#a78bfa' },
    { label: 'RELOAD\n重载', icon: '🔄', onClick: () => window.location.reload(), color: '#ffaa00' },
    { label: 'TUTORIAL\n教程', icon: '❓', onClick: () => {}, color: 'rgba(255,255,255,0.35)' },
  ];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
      borderTop: '1px solid rgba(0,229,255,0.15)', background: 'rgba(0,0,0,0.75)', flexShrink: 0,
    }}>
      {btns.map((b, i) => (
        <button key={i} onClick={b.onClick} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          padding: '6px 14px', borderRadius: 8, border: `1px solid ${b.color}40`,
          background: `${b.color}08`, color: b.color, cursor: 'pointer',
          fontFamily: 'monospace', fontSize: '0.44rem', whiteSpace: 'pre-line', textAlign: 'center',
          transition: 'all 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = `${b.color}18`}
          onMouseLeave={e => e.currentTarget.style.background = `${b.color}08`}
        >
          <span style={{ fontSize: 15 }}>{b.icon}</span>
          {b.label}
        </button>
      ))}

      {/* Main deploy */}
      <button onClick={handleDeploy} disabled={deploying} style={{
        flex: 1, maxWidth: 320, marginLeft: 'auto',
        padding: '11px 24px', borderRadius: 10,
        border: `2px solid ${deploying ? 'rgba(0,229,255,0.3)' : '#00e5ffaa'}`,
        background: deploying
          ? 'rgba(0,229,255,0.15)'
          : 'linear-gradient(135deg, rgba(0,80,160,0.7) 0%, rgba(0,200,255,0.45) 100%)',
        color: '#fff', cursor: deploying ? 'wait' : 'pointer',
        fontFamily: 'monospace', fontWeight: 900, fontSize: '0.78rem', letterSpacing: '0.2em',
        textShadow: '0 0 12px rgba(0,229,255,0.9)',
        boxShadow: '0 0 24px rgba(0,200,255,0.35), 0 0 50px rgba(0,200,255,0.1)',
        transition: 'all 0.3s', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to right, transparent, rgba(0,229,255,0.12), transparent)',
          animation: 'btn-shimmer 2.2s linear infinite',
        }}/>
        <span style={{ position: 'relative', zIndex: 1 }}>
          {deploying ? '⟳  DEPLOYING...' : '▶  DEPLOY AGENTS · 部署探员'}
        </span>
      </button>
      <style>{`@keyframes btn-shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}`}</style>
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
  const [selectedIdx, setSelectedIdx] = useState(1);

  const accentColor = '#00e5ff';

  const updateAgent = useCallback((updated) => {
    setAgents(prev => prev.map((a, i) => i === selectedIdx ? updated : a));
  }, [selectedIdx]);

  const updatePriority = useCallback((idx, list) => {
    setAgents(prev => prev.map((a, i) => i === idx ? { ...a, priority_list: list } : a));
  }, []);

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
        ap_cost_discount: agents.reduce((s, a) => s + (a.ap_cost_discount || 0), 0) / 90,
      },
      priority_list: agents[selectedIdx]?.priority_list || PRIORITY_ACTIONS.map(p => p.id),
    };
    onDeploy(teamConfig);
  };

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(ellipse at 30% 15%, #050e22 0%, #020810 55%, #010408 100%)',
      fontFamily: "'Courier New', monospace", color: 'white',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
      }}/>

      {/* Corner brackets */}
      {[
        { top: 0, left: 0, borderTop: '2px solid #00e5ff40', borderLeft: '2px solid #00e5ff40' },
        { top: 0, right: 0, borderTop: '2px solid #a78bfa40', borderRight: '2px solid #a78bfa40' },
        { bottom: 54, left: 0, borderBottom: '2px solid #00e5ff40', borderLeft: '2px solid #00e5ff40' },
        { bottom: 54, right: 0, borderBottom: '2px solid #a78bfa40', borderRight: '2px solid #a78bfa40' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 36, height: 36, pointerEvents: 'none', zIndex: 10, ...s }}/>
      ))}

      <StatusBar />

      {/* Title */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '7px 20px', borderBottom: '1px solid rgba(0,229,255,0.1)',
        background: 'rgba(0,0,0,0.35)', flexShrink: 0, zIndex: 1,
      }}>
        <div>
          <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace', letterSpacing: '0.2em' }}>
            TERMINAL DETECTIVE · AGENT DISPATCH CENTER
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 900, color: '#00e5ff', textShadow: '0 0 14px #00e5ff80', fontFamily: 'monospace', letterSpacing: '0.06em' }}>
              全息探员大厅
            </span>
            <span style={{ fontSize: '0.56rem', color: 'rgba(0,229,255,0.45)', fontFamily: 'monospace', letterSpacing: '0.15em' }}>
              HOLOGRAPHIC AGENT LOBBY
            </span>
          </div>
        </div>
        <div style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace', textAlign: 'right', lineHeight: 1.6 }}>
          配置AI探员团队，拖拽排序行动优先级<br/>
          优化属性组合，为案件调查做充分准备
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <TeamRosterPanel
          agents={agents} selectedIdx={selectedIdx}
          onSelect={setSelectedIdx} progression={progression}
          onPriorityChange={updatePriority}
        />
        <HoloStage
          agents={agents} selectedIdx={selectedIdx}
          onSelect={setSelectedIdx} accentColor={accentColor}
          progression={progression}
        />
        <AttributePanel
          agent={agents[selectedIdx]}
          agentDef={AGENT_DEFS[selectedIdx]}
          onUpdate={updateAgent}
        />
      </div>

      <DeployControls
        onDeploy={handleDeploy}
        onSave={() => LocalStorage.saveTeamConfig(agents)}
        onLoad={() => { const s = LocalStorage.loadTeamConfig(); if (s) setAgents(s); }}
      />
    </div>
  );
}