import React, { useState, useRef } from 'react';
import { LocalStorage } from '@/game/gameState';
import { DEFAULT_AGENT_CONFIG } from '@/game/caseData';

// ── Constants ───────────────────────────────────────────────────────────────
const AGENT_COLORS  = ['#00e5ff', '#ff6b6b', '#a78bfa'];
const AGENT_BG      = ['rgba(0,229,255,0.10)', 'rgba(255,107,107,0.10)', 'rgba(167,139,250,0.10)'];
const AGENT_BORDER  = ['rgba(0,229,255,0.45)', 'rgba(255,107,107,0.45)', 'rgba(167,139,250,0.45)'];
const AGENT_ICONS   = ['👁️', '🔥', '⚙️'];
const AGENT_NAMES   = ['隼目', '破心', '精算'];
const AGENT_SUBTYPES = ['观察型', '审讯型', '分析型'];
const STANCES       = ['analytical', 'aggressive', 'cautious'];

const NETWORK_STEPS = [
  { id: 'observe',     label: '观察现场',     icon: '👁️', desc: '扫描周围物品与环境线索' },
  { id: 'interrogate', label: '问询关键人物', icon: '🗣️', desc: '找离死者最近的人问话' },
  { id: 'confront',   label: '交叉验证与拆穿', icon: '⚡', desc: '口供与物品线索矛盾时立刻拆穿' },
];

const SUB_MODULES = [
  { id: 'physical_scan',  label: '物理扫描', icon: '🔍' },
  { id: 'digital_trace',  label: '数字追踪', icon: '💾' },
  { id: 'emotion_read',   label: '情绪读取', icon: '🧠' },
  { id: 'timeline_check', label: '时间线核查', icon: '🕒' },
  { id: 'alibi_crack',    label: '不在场破解', icon: '🔓' },
  { id: 'evidence_chain', label: '证据链构建', icon: '🔗' },
];

const TOTAL_POOL = 100;

function makeDefaultAgent(idx) {
  return {
    agent_id: AGENT_NAMES[idx],
    role: AGENT_SUBTYPES[idx],
    base_stance: STANCES[idx % STANCES.length],
    logic_power: Math.round(TOTAL_POOL / 3),
    observation_focus: Math.round(TOTAL_POOL / 3),
    network: { observe: [], interrogate: [], confront: [] },
    custom_rules: [],
  };
}

// ── Floating star particles ─────────────────────────────────────────────────
function StarField() {
  const stars = useRef(
    Array.from({ length: 55 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: 1.5 + Math.random() * 3.5,
      color: ['#ff3aff', '#00e5ff', '#a3ff47', '#ffe600', '#ff3860', '#fff'][Math.floor(Math.random() * 6)],
      dur: 3 + Math.random() * 5,
      delay: Math.random() * 6,
    }))
  );
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {stars.current.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.r, height: p.r,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.r * 3}px ${p.color}`,
            animation: `star-twinkle ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes star-twinkle {
          from { opacity: 0.15; transform: scale(0.8); }
          to   { opacity: 0.9;  transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

// ── Animated Magnifying Glass ────────────────────────────────────────────────
function MagnifyingGlass() {
  return (
    <div className="flex justify-center mb-6">
      <div style={{ position: 'relative', width: 100, height: 100, animation: 'mag-float 3s ease-in-out infinite' }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <defs>
            <filter id="glow-cyan">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-cyan-strong">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          {/* Outer pulsing ring */}
          <circle cx="40" cy="40" r="30" fill="none" stroke="#00e5ff" strokeWidth="1"
            strokeDasharray="6 4" opacity="0.35"
            style={{ animation: 'mag-ring-spin 8s linear infinite', transformOrigin: '40px 40px' }} />

          {/* Main lens circle */}
          <circle cx="40" cy="40" r="22" fill="rgba(0,229,255,0.04)" stroke="#00e5ff" strokeWidth="2.5"
            filter="url(#glow-cyan-strong)"
            style={{ animation: 'mag-pulse 2s ease-in-out infinite' }} />

          {/* Inner shimmer */}
          <circle cx="40" cy="40" r="16" fill="none" stroke="#00e5ff" strokeWidth="0.8" opacity="0.25" />

          {/* Question mark */}
          <text x="40" y="47" textAnchor="middle" fontSize="20" fontWeight="bold"
            fill="#00e5ff" filter="url(#glow-cyan)"
            style={{ animation: 'mag-q-flicker 4s ease-in-out infinite', fontFamily: 'monospace' }}>?</text>

          {/* Handle */}
          <line x1="57" y1="57" x2="80" y2="82" stroke="#00e5ff" strokeWidth="5"
            strokeLinecap="round" filter="url(#glow-cyan)" />
          {/* Handle highlight */}
          <line x1="57" y1="57" x2="80" y2="82" stroke="white" strokeWidth="1.5"
            strokeLinecap="round" opacity="0.3" />

          {/* Orbiting dot */}
          <circle r="3" fill="#ff3aff" filter="url(#glow-cyan)"
            style={{ animation: 'mag-orbit 2.5s linear infinite', transformOrigin: '40px 40px' }}>
            <animateMotion dur="2.5s" repeatCount="indefinite"
              path="M 40 14 A 26 26 0 1 1 39.9 14" />
          </circle>

          {/* Second orbiting dot (offset) */}
          <circle r="2" fill="#00e5ff" opacity="0.7"
            style={{ animation: 'mag-orbit2 3.5s linear infinite', transformOrigin: '40px 40px' }}>
            <animateMotion dur="3.5s" repeatCount="indefinite" begin="-1.5s"
              path="M 40 14 A 26 26 0 1 0 39.9 14" />
          </circle>
        </svg>

        <style>{`
          @keyframes mag-float {
            0%, 100% { transform: translateY(0px) rotate(-2deg); }
            50%       { transform: translateY(-10px) rotate(2deg); }
          }
          @keyframes mag-pulse {
            0%, 100% { opacity: 0.85; }
            50%       { opacity: 1; filter: drop-shadow(0 0 12px #00e5ff); }
          }
          @keyframes mag-ring-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes mag-q-flicker {
            0%, 90%, 100% { opacity: 1; }
            92%           { opacity: 0.2; }
            94%           { opacity: 1; }
            96%           { opacity: 0.4; }
          }
        `}</style>
      </div>
    </div>
  );
}

// ── Animated Title Letters ────────────────────────────────────────────────────
function GlitchTitle() {
  const title = 'TERMINAL  DETECTIVE';
  return (
    <h1
      className="font-black leading-none mb-3 select-none"
      style={{
        fontSize: 'clamp(2rem, 6vw, 3.4rem)',
        letterSpacing: '0.18em',
        fontFamily: "'Courier New', monospace",
      }}
    >
      {title.split('').map((ch, i) => (
        <span
          key={i}
          style={{
            color: '#ff3aff',
            textShadow: '0 0 10px #ff3aff, 0 0 30px #ff3aff80, 0 0 60px #ff3aff30, 0 0 2px #fff',
            display: 'inline-block',
            animation: `title-letter-in 0.4s ${i * 0.045}s both, title-neon-flicker 6s ${i * 0.3 + 1}s ease-in-out infinite`,
          }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
      <style>{`
        @keyframes title-letter-in {
          from { opacity: 0; transform: translateY(-18px) scaleY(1.4); filter: blur(4px); }
          to   { opacity: 1; transform: translateY(0) scaleY(1); filter: blur(0); }
        }
        @keyframes title-neon-flicker {
          0%, 85%, 100% { opacity: 1; }
          87%            { opacity: 0.15; }
          89%            { opacity: 1; }
          91%            { opacity: 0.35; }
          93%            { opacity: 1; }
        }
      `}</style>
    </h1>
  );
}

// ── Neon Title ──────────────────────────────────────────────────────────────
function NeonTitle() {
  return (
    <div className="text-center mb-1 select-none">
      <MagnifyingGlass />
      <GlitchTitle />

      {/* LOGIC ARCHITECT */}
      <div
        className="text-xs font-light mb-6"
        style={{
          color: 'rgba(200,230,255,0.5)',
          letterSpacing: '0.55em',
          fontFamily: "'Courier New', monospace",
          animation: 'logic-fade-in 1.2s 0.8s both',
        }}
      >
        LOGIC&nbsp;&nbsp;ARCHITECT
      </div>

      {/* Panel label */}
      <div
        className="inline-block text-sm font-bold tracking-widest"
        style={{
          color: '#00e5ff',
          textShadow: '0 0 8px #00e5ff',
          fontFamily: "'Courier New', monospace",
          animation: 'logic-fade-in 0.8s 1.5s both',
        }}
      >
        [探员配置面板]
      </div>

      <style>{`
        @keyframes logic-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ── Agent Card ──────────────────────────────────────────────────────────────
function AgentCard({ agent, idx, isActive, onClick }) {
  const color = AGENT_COLORS[idx];
  const pct = Math.round(agent.logic_power || 0);
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1.5 py-4 px-2 rounded-xl border-2 transition-all duration-300"
      style={{
        borderColor: isActive ? color : 'rgba(255,255,255,0.08)',
        backgroundColor: isActive ? AGENT_BG[idx] : 'rgba(255,255,255,0.02)',
        boxShadow: isActive ? `0 0 20px ${color}50, inset 0 0 16px ${color}10` : 'none',
        transform: isActive ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      <div className="text-2xl" style={{ filter: isActive ? `drop-shadow(0 0 8px ${color})` : 'none' }}>
        {AGENT_ICONS[idx]}
      </div>
      <div className="text-sm font-bold" style={{ color: isActive ? color : 'rgba(255,255,255,0.55)', textShadow: isActive ? `0 0 8px ${color}` : 'none' }}>
        {agent.agent_id}
      </div>
      <div className="text-xs" style={{ color: isActive ? color + 'cc' : 'rgba(255,255,255,0.3)' }}>
        {agent.role}
      </div>
      <div className="text-xs font-bold" style={{ color: isActive ? color : 'rgba(255,255,255,0.3)' }}>
        {pct}%
      </div>
    </button>
  );
}

// ── Slider row ──────────────────────────────────────────────────────────────
function AttrRow({ label, value, max, color, onChange }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</span>
        <span className="font-bold" style={{ color }}>{value}<span className="opacity-40">/{max}</span></span>
      </div>
      <div className="relative h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
        <div className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${(value / max) * 100}%`, background: `linear-gradient(to right, ${color}88, ${color})`, boxShadow: `0 0 8px ${color}80` }} />
        <input type="range" min={0} max={max} value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </div>
    </div>
  );
}

// ── Module tag ──────────────────────────────────────────────────────────────
function ModuleTag({ mod, active, color, canAdd, onToggle }) {
  return (
    <button onClick={onToggle}
      className="px-2 py-1 rounded-lg text-xs border transition-all"
      style={{
        borderColor: active ? color : 'rgba(255,255,255,0.1)',
        backgroundColor: active ? color + '22' : 'rgba(255,255,255,0.03)',
        color: active ? color : (canAdd ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'),
        cursor: (active || canAdd) ? 'pointer' : 'not-allowed',
        opacity: (!active && !canAdd) ? 0.3 : 1,
      }}
    >
      {mod.icon} {mod.label}
    </button>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function MultiAgentConsole({ onDeploy }) {
  const [agents, setAgents] = useState(() => {
    const saved = LocalStorage.loadTeamConfig();
    if (saved && Array.isArray(saved) && saved.length === 3) return saved;
    return [0, 1, 2].map(makeDefaultAgent);
  });
  const [activeAgent, setActiveAgent] = useState(0);
  const [newCond, setNewCond] = useState('');
  const [newAct,  setNewAct]  = useState('');

  const agent = agents[activeAgent];
  const color = AGENT_COLORS[activeAgent];

  const updateAgent = (field, value) =>
    setAgents(prev => prev.map((a, i) => i === activeAgent ? { ...a, [field]: value } : a));

  const clampedAttr = (idx, field, val) => {
    const others = agents.reduce((s, a, i) => i !== idx ? s + (a[field] || 0) : s, 0);
    return Math.max(0, Math.min(TOTAL_POOL - others, val));
  };

  const toggleModule = (stepId, modId) => {
    setAgents(prev => prev.map((a, i) => {
      if (i !== activeAgent) return a;
      const net = { ...a.network };
      const mods = net[stepId] || [];
      net[stepId] = mods.includes(modId)
        ? mods.filter(m => m !== modId)
        : mods.length < 3 ? [...mods, modId] : mods;
      return { ...a, network: net };
    }));
  };

  const addRule = () => {
    if (!newCond || !newAct) return;
    updateAgent('custom_rules', [...(agent.custom_rules || []), { condition: newCond, action: newAct }]);
    setNewCond(''); setNewAct('');
  };

  const handleDeploy = () => {
    LocalStorage.saveTeamConfig(agents);
    const teamConfig = {
      ...DEFAULT_AGENT_CONFIG,
      agent_id: agents.map(a => a.agent_id).join('+'),
      role: 'Multi_Agent_Team',
      base_stance: agents[0].base_stance,
      team: agents,
      combat_attributes: {
        logic_power: Math.max(...agents.map(a => a.logic_power)),
        observation_focus: Math.max(...agents.map(a => a.observation_focus || 0)),
      },
      engine_modifiers: {
        confusion_resistance: agents.reduce((s, a) => s + a.logic_power, 0) / 300,
        ap_cost_discount: agents.reduce((s, a) => s + (a.observation_focus || 0), 0) / 500,
      },
      custom_rules: agents.flatMap(a => a.custom_rules || []),
    };
    onDeploy(teamConfig);
  };

  const attrTotal = agents.reduce((s, a) => s + (a.logic_power || 0), 0);
  const poolOk = attrTotal <= TOTAL_POOL;

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-start py-10 px-4 overflow-y-auto"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #0b1a30 0%, #070d1d 55%, #03060f 100%)',
        fontFamily: "'Courier New', monospace",
        color: 'white',
      }}
    >
      <StarField />

      <div className="relative z-10 w-full max-w-xl">

        {/* ── Neon Title Section ── */}
        <NeonTitle />

        <div className="mt-8 space-y-4">

          {/* ── Agent Team Panel ── */}
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: 'rgba(0,229,255,0.18)', backgroundColor: 'rgba(10,20,40,0.7)' }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span>🕵️</span>
                <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>探员编队</span>
              </div>
              <div
                className="px-3 py-0.5 rounded-full text-xs font-bold border"
                style={{
                  borderColor: poolOk ? '#00e5ff60' : '#ff386060',
                  backgroundColor: poolOk ? '#00e5ff15' : '#ff386015',
                  color: poolOk ? '#00e5ff' : '#ff3860',
                }}
              >
                属性池：{attrTotal}%
              </div>
            </div>

            {/* Agent cards */}
            <div className="flex gap-3">
              {agents.map((a, i) => (
                <AgentCard key={i} agent={a} idx={i} isActive={activeAgent === i} onClick={() => setActiveAgent(i)} />
              ))}
            </div>
          </div>

          {/* ── Agent Config Panel ── */}
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: AGENT_BORDER[activeAgent], backgroundColor: 'rgba(10,20,40,0.7)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <span>👤</span>
              <span className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>探员配置</span>
              <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: color + '22', color }}>
                {AGENT_ICONS[activeAgent]} {agent.agent_id}
              </span>
              <div className="ml-auto flex gap-1">
                {STANCES.map(s => (
                  <button key={s}
                    onClick={() => updateAgent('base_stance', s)}
                    className="px-2 py-0.5 text-xs rounded-lg border transition-all"
                    style={{
                      borderColor: agent.base_stance === s ? color : 'rgba(255,255,255,0.1)',
                      backgroundColor: agent.base_stance === s ? color + '22' : 'transparent',
                      color: agent.base_stance === s ? color : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {s === 'analytical' ? '分析' : s === 'aggressive' ? '强攻' : '谨慎'}
                  </button>
                ))}
              </div>
            </div>

            {/* Attribute sliders */}
            <div className="mb-5">
              <div className="text-xs font-bold tracking-widest mb-3" style={{ color: color + 'aa' }}>◈ 属性分配</div>
              <AttrRow
                label="逻辑推理 LOGIC"
                value={agent.logic_power || 0}
                max={TOTAL_POOL}
                color={color}
                onChange={val => {
                  setAgents(prev => prev.map((a, i) =>
                    i === activeAgent ? { ...a, logic_power: clampedAttr(activeAgent, 'logic_power', val) } : a
                  ));
                }}
              />
              <AttrRow
                label="观察力 OBSERVATION"
                value={agent.observation_focus || 0}
                max={TOTAL_POOL}
                color={color}
                onChange={val => {
                  setAgents(prev => prev.map((a, i) =>
                    i === activeAgent ? { ...a, observation_focus: clampedAttr(activeAgent, 'observation_focus', val) } : a
                  ));
                }}
              />
            </div>

            {/* Network steps */}
            <div className="mb-5">
              <div className="text-xs font-bold tracking-widest mb-3" style={{ color: color + 'aa' }}>◈ 能力行动网络</div>
              {NETWORK_STEPS.map(step => {
                const mods = agent.network?.[step.id] || [];
                return (
                  <div key={step.id} className="mb-3 p-3 rounded-xl border"
                    style={{ borderColor: color + '22', backgroundColor: 'rgba(0,0,0,0.25)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{step.icon}</span>
                      <span className="text-xs font-bold" style={{ color }}>{step.label}</span>
                      <span className="ml-auto text-xs opacity-30">{mods.length}/3 模块</span>
                    </div>
                    <div className="text-xs opacity-25 mb-2">{step.desc}</div>
                    <div className="flex flex-wrap gap-1">
                      {SUB_MODULES.map(mod => (
                        <ModuleTag key={mod.id} mod={mod}
                          active={mods.includes(mod.id)}
                          color={color}
                          canAdd={mods.length < 3}
                          onToggle={() => toggleModule(step.id, mod.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* IF-THEN rules */}
            <div>
              <div className="text-xs font-bold tracking-widest mb-2" style={{ color: color + 'aa' }}>◈ IF-THEN 行动指令</div>
              <div className="space-y-1 mb-2 max-h-28 overflow-y-auto">
                {(agent.custom_rules || []).map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg text-xs"
                    style={{ backgroundColor: color + '10', border: `1px solid ${color}20` }}>
                    <span className="flex-1 opacity-70">IF {rule.condition} → {rule.action}</span>
                    <button
                      onClick={() => updateAgent('custom_rules', (agent.custom_rules || []).filter((_, i) => i !== idx))}
                      className="opacity-30 hover:opacity-80" style={{ color: '#ff3860' }}>✕</button>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                <input value={newCond} onChange={e => setNewCond(e.target.value)}
                  placeholder="IF: 条件 (e.g. NPC拒绝回答)"
                  className="w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs outline-none"
                  style={{ borderColor: color + '40', color: 'rgba(255,255,255,0.7)' }} />
                <input value={newAct} onChange={e => setNewAct(e.target.value)}
                  placeholder="THEN: 行动 (e.g. 立刻出示证据)"
                  className="w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs outline-none"
                  style={{ borderColor: color + '40', color: 'rgba(255,255,255,0.7)' }} />
                <button onClick={addRule}
                  className="w-full py-1.5 rounded-lg text-xs border transition-all hover:opacity-80"
                  style={{ borderColor: color + '60', color, backgroundColor: color + '10' }}>
                  + 添加指令
                </button>
              </div>
            </div>
          </div>

          {/* ── Deploy ── */}
          <button
            onClick={handleDeploy}
            className="w-full py-4 rounded-2xl text-base font-black tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #00c8ff 0%, #ff3aff 100%)',
              boxShadow: '0 0 40px rgba(0,200,255,0.45), 0 0 80px rgba(255,58,255,0.25)',
              color: '#fff',
              textShadow: '0 0 12px rgba(255,255,255,0.6)',
              border: 'none',
              letterSpacing: '0.2em',
            }}
          >
            ▶ 开始执行
          </button>
        </div>
      </div>
    </div>
  );
}