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
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
      <div style={{ position: 'relative', width: 130, height: 130, animation: 'mag-float 4s ease-in-out infinite' }}>
        <svg width="130" height="130" viewBox="0 0 130 130" overflow="visible">
          <defs>
            <radialGradient id="lens-fill" cx="42%" cy="38%" r="55%">
              <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.18" />
              <stop offset="60%" stopColor="#0044aa" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#000020" stopOpacity="0.05" />
            </radialGradient>
            <filter id="mg-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="mg-glow-sm" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <clipPath id="lens-clip">
              <circle cx="50" cy="50" r="30" />
            </clipPath>
          </defs>

          {/* ── Outer orbit ring (spinning dashes) ── */}
          <circle cx="50" cy="50" r="44" fill="none" stroke="#00e5ff" strokeWidth="0.8"
            strokeDasharray="5 6" opacity="0.25"
            style={{ animation: 'mg-ring-cw 12s linear infinite', transformOrigin: '50px 50px' }} />
          <circle cx="50" cy="50" r="38" fill="none" stroke="#ff3aff" strokeWidth="0.6"
            strokeDasharray="3 9" opacity="0.2"
            style={{ animation: 'mg-ring-ccw 9s linear infinite', transformOrigin: '50px 50px' }} />

          {/* ── Lens body ── */}
          <circle cx="50" cy="50" r="30" fill="url(#lens-fill)"
            stroke="#00e5ff" strokeWidth="2.8"
            filter="url(#mg-glow)"
            style={{ animation: 'mg-lens-pulse 2.5s ease-in-out infinite' }} />

          {/* ── Lens inner ring ── */}
          <circle cx="50" cy="50" r="24" fill="none" stroke="#00e5ff" strokeWidth="0.7" opacity="0.3" />

          {/* ── Scan beam sweeping through lens ── */}
          <line x1="20" y1="50" x2="80" y2="50"
            stroke="#00e5ff" strokeWidth="1.5" opacity="0.7"
            clipPath="url(#lens-clip)"
            style={{ animation: 'mg-scan 2s ease-in-out infinite', transformOrigin: '50px 50px' }} />

          {/* ── Lens flare highlight ── */}
          <ellipse cx="38" cy="38" rx="6" ry="3" fill="white" opacity="0.15"
            style={{ animation: 'mg-flare 3s ease-in-out infinite' }} />

          {/* ── Question mark ── */}
          <text x="50" y="58" textAnchor="middle" fontSize="22" fontWeight="900"
            fill="#00e5ff" filter="url(#mg-glow-sm)"
            fontFamily="'Courier New', monospace"
            style={{ animation: 'mg-q 5s ease-in-out infinite' }}>?</text>

          {/* ── Handle ── */}
          <line x1="73" y1="73" x2="104" y2="106"
            stroke="#00e5ff" strokeWidth="6" strokeLinecap="round" filter="url(#mg-glow)" />
          <line x1="73" y1="73" x2="104" y2="106"
            stroke="white" strokeWidth="1.8" strokeLinecap="round" opacity="0.25" />

          {/* ── Pink orbiting dot ── */}
          <circle r="3.5" fill="#ff3aff" filter="url(#mg-glow-sm)">
            <animateMotion dur="2.8s" repeatCount="indefinite"
              path="M 50 16 A 34 34 0 1 1 49.9 16" />
          </circle>

          {/* ── Cyan trailing dot ── */}
          <circle r="2" fill="#00e5ff" opacity="0.8">
            <animateMotion dur="2.8s" repeatCount="indefinite" begin="-1.4s"
              path="M 50 16 A 34 34 0 1 1 49.9 16" />
          </circle>

          {/* ── Yellow spark dot ── */}
          <circle r="1.5" fill="#ffe600" opacity="0.9">
            <animateMotion dur="4s" repeatCount="indefinite" begin="-2s"
              path="M 50 12 A 38 38 0 1 0 49.9 12" />
          </circle>
        </svg>

        <style>{`
          @keyframes mag-float {
            0%,100% { transform: translateY(0) rotate(-3deg) scale(1); }
            50%      { transform: translateY(-12px) rotate(3deg) scale(1.05); }
          }
          @keyframes mg-ring-cw  { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
          @keyframes mg-ring-ccw { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
          @keyframes mg-lens-pulse {
            0%,100% { opacity: 0.85; }
            50%     { opacity: 1; filter: drop-shadow(0 0 16px #00e5ff) drop-shadow(0 0 32px #00e5ff60); }
          }
          @keyframes mg-scan {
            0%   { transform: rotate(-60deg); opacity: 0; }
            15%  { opacity: 0.8; }
            85%  { opacity: 0.6; }
            100% { transform: rotate(60deg); opacity: 0; }
          }
          @keyframes mg-flare {
            0%,100% { opacity: 0.1; }
            50%     { opacity: 0.35; }
          }
          @keyframes mg-q {
            0%,80%,100% { opacity: 1; transform: scale(1); }
            85%          { opacity: 0.1; transform: scale(0.9); }
            90%          { opacity: 0.8; transform: scale(1.05); }
          }
        `}</style>
      </div>
    </div>
  );
}

// ── Animated Title ────────────────────────────────────────────────────────────
function NeonTitle() {
  const line1 = 'TERMINAL';
  const line2 = 'DETECTIVE';
  return (
    <div style={{ textAlign: 'center', marginBottom: 4 }}>
      <MagnifyingGlass />

      {/* Two-line centered title */}
      <div style={{ fontFamily: "'Courier New', monospace", lineHeight: 1.1, marginBottom: 12 }}>
        {[line1, line2].map((word, wi) => (
          <div key={wi} style={{ display: 'block' }}>
            {word.split('').map((ch, li) => {
              const i = wi * 10 + li;
              return (
                <span key={li} style={{
                  display: 'inline-block',
                  fontSize: 'clamp(2.2rem, 7vw, 4rem)',
                  fontWeight: 900,
                  color: '#ff3aff',
                  textShadow: '0 0 8px #ff3aff, 0 0 24px #ff3aff90, 0 0 60px #ff3aff30, 0 0 2px #fff',
                  letterSpacing: '0.22em',
                  animation: `tl-in 0.5s ${i * 0.05}s cubic-bezier(.22,1,.36,1) both, tl-wave 4s ${i * 0.12 + 1.2}s ease-in-out infinite, tl-flicker 8s ${i * 0.4 + 2}s ease-in-out infinite`,
                }}>
                  {ch}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {/* Chromatic underline bar */}
      <div style={{
        height: 2,
        margin: '0 auto 14px',
        width: '70%',
        background: 'linear-gradient(to right, transparent, #ff3aff, #00e5ff, #ff3aff, transparent)',
        boxShadow: '0 0 12px #ff3aff80, 0 0 24px #00e5ff40',
        animation: 'tl-bar 1.2s 0.9s both',
        borderRadius: 2,
      }} />

      {/* LOGIC ARCHITECT subtitle */}
      <div style={{
        color: 'rgba(200,230,255,0.5)',
        letterSpacing: '0.55em',
        fontSize: '0.7rem',
        fontFamily: "'Courier New', monospace",
        marginBottom: 20,
        animation: 'tl-fade 1s 1.2s both',
      }}>
        LOGIC&nbsp;&nbsp;ARCHITECT
      </div>

      {/* Panel label */}
      <div style={{
        display: 'inline-block',
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '0.15em',
        color: '#00e5ff',
        textShadow: '0 0 10px #00e5ff',
        fontFamily: "'Courier New', monospace",
        animation: 'tl-fade 0.8s 1.6s both',
      }}>
        [探员配置面板]
      </div>

      <style>{`
        @keyframes tl-in {
          from { opacity: 0; transform: translateY(-22px) scaleY(1.5) skewX(-6deg); filter: blur(6px); }
          to   { opacity: 1; transform: translateY(0) scaleY(1) skewX(0); filter: blur(0); }
        }
        @keyframes tl-wave {
          0%,100% { transform: translateY(0); }
          50%     { transform: translateY(-4px); }
        }
        @keyframes tl-flicker {
          0%,88%,100% { opacity: 1; }
          90%          { opacity: 0.08; }
          92%          { opacity: 1; }
          94%          { opacity: 0.3; }
          96%          { opacity: 1; }
        }
        @keyframes tl-bar {
          from { opacity: 0; transform: scaleX(0); }
          to   { opacity: 1; transform: scaleX(1); }
        }
        @keyframes tl-fade {
          from { opacity: 0; transform: translateY(8px); }
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