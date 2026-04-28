import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LocalStorage } from '@/game/gameState';
import { DEFAULT_AGENT_CONFIG } from '@/game/caseData';

// ── Constants ───────────────────────────────────────────────────────────────
const AGENT_COLORS = ['#00e5ff', '#ff6b6b', '#a78bfa'];
const AGENT_BG = ['rgba(0,229,255,0.08)', 'rgba(255,107,107,0.08)', 'rgba(167,139,250,0.08)'];
const AGENT_BORDER = ['rgba(0,229,255,0.35)', 'rgba(255,107,107,0.35)', 'rgba(167,139,250,0.35)'];
const AGENT_ICONS = ['🦅', '💔', '⚙️'];
const AGENT_NAMES = ['隼目', '破心', '精算'];
const AGENT_ROLES = ['调查专家', '审讯专家', '分析大师'];
const STANCES = ['analytical', 'aggressive', 'cautious'];

const NETWORK_STEPS = [
  { id: 'observe', label: '观察现场', icon: '👁️', desc: '扫描周围物品与环境线索' },
  { id: 'interrogate', label: '问询关键人物', icon: '🗣️', desc: '找离死者最近的人问话' },
  { id: 'confront', label: '交叉验证与拆穿', icon: '⚡', desc: '口供与物品线索矛盾时立刻拆穿' },
];

const SUB_MODULES = [
  { id: 'physical_scan', label: '物理扫描', icon: '🔍' },
  { id: 'digital_trace', label: '数字追踪', icon: '💾' },
  { id: 'emotion_read', label: '情绪读取', icon: '🧠' },
  { id: 'timeline_check', label: '时间线核查', icon: '🕒' },
  { id: 'alibi_crack', label: '不在场破解', icon: '🔓' },
  { id: 'evidence_chain', label: '证据链构建', icon: '🔗' },
];

const TOTAL_POOL = 100;

function makeDefaultAgent(idx) {
  return {
    agent_id: AGENT_NAMES[idx],
    role: AGENT_ROLES[idx],
    base_stance: STANCES[idx % STANCES.length],
    logic_power: [50, 30, 20][idx],
    observation_focus: [40, 35, 25][idx],
    agility: [30, 40, 30][idx],
    resolve: [35, 30, 35][idx],
    network: { observe: [], interrogate: [], confront: [] },
    custom_rules: [],
  };
}

// ── Floating Particles Background ──────────────────────────────────────────
function FloatingParticles() {
  const particles = useRef(
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      r: 3 + Math.random() * 5,
      color: ['#ff3860', '#00e5ff', '#a78bfa', '#ffaa00', '#00ff88'][Math.floor(Math.random() * 5)],
      dur: 4 + Math.random() * 6,
      delay: Math.random() * 5,
      dx: (Math.random() - 0.5) * 30,
      dy: (Math.random() - 0.5) * 30,
    }))
  );
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {particles.current.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.r,
            height: p.r,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.r * 2}px ${p.color}`,
            opacity: 0.7,
            animation: `float-particle-${p.id % 5} ${p.dur}s ${p.delay}s ease-in-out infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-particle-0 { from { transform: translate(0,0); opacity:0.3; } to { transform: translate(20px,-25px); opacity:0.8; } }
        @keyframes float-particle-1 { from { transform: translate(0,0); opacity:0.5; } to { transform: translate(-15px,20px); opacity:0.9; } }
        @keyframes float-particle-2 { from { transform: translate(0,0); opacity:0.4; } to { transform: translate(25px,15px); opacity:0.7; } }
        @keyframes float-particle-3 { from { transform: translate(0,0); opacity:0.6; } to { transform: translate(-20px,-10px); opacity:0.4; } }
        @keyframes float-particle-4 { from { transform: translate(0,0); opacity:0.3; } to { transform: translate(10px,30px); opacity:0.8; } }
      `}</style>
    </div>
  );
}

// ── Agent Card (top selector) ───────────────────────────────────────────────
function AgentCard({ agent, idx, isActive, onClick, totalLogic, totalObs }) {
  const color = AGENT_COLORS[idx];
  const logicPct = Math.round(agent.logic_power);
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 transition-all duration-300"
      style={{
        borderColor: isActive ? color : 'rgba(255,255,255,0.08)',
        backgroundColor: isActive ? AGENT_BG[idx] : 'rgba(255,255,255,0.02)',
        boxShadow: isActive ? `0 0 24px ${color}40, inset 0 0 20px ${color}10` : 'none',
        transform: isActive ? 'scale(1.04)' : 'scale(1)',
      }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2"
        style={{
          borderColor: color,
          backgroundColor: AGENT_BG[idx],
          boxShadow: isActive ? `0 0 16px ${color}60` : 'none',
        }}
      >
        {AGENT_ICONS[idx]}
      </div>
      <div className="text-sm font-bold" style={{ color: isActive ? color : 'rgba(255,255,255,0.5)' }}>
        {agent.agent_id}
      </div>
      <div className="text-xs opacity-50">{agent.role}</div>
      <div
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ backgroundColor: color + '20', color }}
      >
        逻辑 {logicPct}%
      </div>
    </button>
  );
}

// ── Attr Row Slider ─────────────────────────────────────────────────────────
function AttrRow({ label, value, max, color, onChange }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
        <span className="font-bold" style={{ color }}>{value}<span className="opacity-40">/{max}</span></span>
      </div>
      <div className="relative h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{
            width: `${(value / max) * 100}%`,
            background: `linear-gradient(to right, ${color}99, ${color})`,
            boxShadow: `0 0 8px ${color}80`,
          }}
        />
        <input
          type="range" min={0} max={max} value={value}
          onChange={e => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
}

// ── Network Module Toggle ───────────────────────────────────────────────────
function ModuleTag({ mod, active, color, canAdd, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="px-2 py-1 rounded-lg text-xs border transition-all"
      style={{
        borderColor: active ? color : 'rgba(255,255,255,0.1)',
        backgroundColor: active ? color + '20' : 'rgba(255,255,255,0.03)',
        color: active ? color : (canAdd ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'),
        cursor: (active || canAdd) ? 'pointer' : 'not-allowed',
        opacity: (!active && !canAdd) ? 0.3 : 1,
      }}
    >
      {mod.icon} {mod.label}
    </button>
  );
}

// ── Pool Status Badge ───────────────────────────────────────────────────────
function PoolBadge({ total, label }) {
  const ok = total <= TOTAL_POOL;
  return (
    <div
      className="px-3 py-1 rounded-full text-xs font-bold border"
      style={{
        borderColor: ok ? '#00ff8860' : '#ff386060',
        backgroundColor: ok ? '#00ff8815' : '#ff386015',
        color: ok ? '#00ff88' : '#ff3860',
      }}
    >
      {label}：{total}%
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function MultiAgentConsole({ onDeploy }) {
  const [agents, setAgents] = useState(() => {
    const saved = LocalStorage.loadTeamConfig();
    if (saved && Array.isArray(saved) && saved.length === 3) return saved;
    return [0, 1, 2].map(makeDefaultAgent);
  });
  const [activeAgent, setActiveAgent] = useState(0);

  const agent = agents[activeAgent];
  const color = AGENT_COLORS[activeAgent];

  const updateAgent = (field, value) => {
    setAgents(prev => prev.map((a, i) => i === activeAgent ? { ...a, [field]: value } : a));
  };

  const updateAttr = (idx, field, val) => {
    setAgents(prev => prev.map((a, i) => i === idx ? { ...a, [field]: val } : a));
  };

  const clampedAttr = (idx, field, val, agents) => {
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

  const [newCond, setNewCond] = useState('');
  const [newAct, setNewAct] = useState('');
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
        observation_focus: Math.max(...agents.map(a => a.observation_focus)),
      },
      engine_modifiers: {
        confusion_resistance: agents.reduce((s, a) => s + a.logic_power, 0) / 300,
        ap_cost_discount: agents.reduce((s, a) => s + a.observation_focus, 0) / 500,
      },
      custom_rules: agents.flatMap(a => a.custom_rules || []),
    };
    onDeploy(teamConfig);
  };

  const logicTotal = agents.reduce((s, a) => s + (a.logic_power || 0), 0);
  const obsTotal = agents.reduce((s, a) => s + (a.observation_focus || 0), 0);

  return (
    <div
      className="min-h-screen relative flex flex-col items-center justify-start py-10 px-4 overflow-y-auto"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #0d1f3c 0%, #060b18 50%, #000 100%)',
        fontFamily: "'Courier New', monospace",
        color: 'white',
      }}
    >
      <FloatingParticles />

      <div className="relative z-10 w-full max-w-2xl">

        {/* ── Title ── */}
        <div className="text-center mb-8">
          <div className="text-xs tracking-[0.4em] mb-2" style={{ color: 'rgba(0,229,255,0.5)' }}>
            TERMINAL DETECTIVE — MULTI-AGENT SYSTEM
          </div>
          <div
            className="text-3xl font-black tracking-widest mb-1"
            style={{ color: '#00e5ff', textShadow: '0 0 30px #00e5ff80, 0 0 60px #00e5ff30' }}
          >
            [ 探员配置面板 ]
          </div>
          <div className="text-xs opacity-30">构建你的三人侦探小队 · 分配属性 · 设计行动网络</div>
        </div>

        {/* ── Agent Team Cards ── */}
        <div
          className="rounded-2xl border p-4 mb-4"
          style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">🕵️</span>
              <span className="text-sm font-bold" style={{ color: '#00e5ff' }}>探员编队</span>
            </div>
            <div className="flex gap-2">
              <PoolBadge total={logicTotal} label="逻辑池" />
              <PoolBadge total={obsTotal} label="观察池" />
            </div>
          </div>
          <div className="flex gap-3">
            {agents.map((a, i) => (
              <AgentCard
                key={i}
                agent={a}
                idx={i}
                isActive={activeAgent === i}
                onClick={() => setActiveAgent(i)}
                totalLogic={logicTotal}
                totalObs={obsTotal}
              />
            ))}
          </div>
        </div>

        {/* ── Agent Detail Config ── */}
        <div
          className="rounded-2xl border p-5 mb-4"
          style={{
            borderColor: AGENT_BORDER[activeAgent],
            backgroundColor: AGENT_BG[activeAgent],
          }}
        >
          {/* Agent header */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-2"
              style={{ borderColor: color, backgroundColor: color + '15' }}
            >
              {AGENT_ICONS[activeAgent]}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-40">代号</span>
                <input
                  value={agent.agent_id}
                  onChange={e => updateAgent('agent_id', e.target.value)}
                  className="bg-transparent border-b text-base font-bold outline-none"
                  style={{ borderColor: color + '50', color }}
                />
              </div>
              <div className="text-xs opacity-40 mt-0.5">{agent.role}</div>
            </div>
            <div className="flex gap-1">
              {STANCES.map(s => (
                <button
                  key={s}
                  onClick={() => updateAgent('base_stance', s)}
                  className="px-2 py-1 text-xs rounded-lg border transition-all"
                  style={{
                    borderColor: agent.base_stance === s ? color : 'rgba(255,255,255,0.1)',
                    backgroundColor: agent.base_stance === s ? color + '20' : 'transparent',
                    color: agent.base_stance === s ? color : 'rgba(255,255,255,0.3)',
                  }}
                >
                  {s === 'analytical' ? '分析' : s === 'aggressive' ? '强攻' : '谨慎'}
                </button>
              ))}
            </div>
          </div>

          {/* Attribute sliders */}
          <div className="mb-4">
            <div className="text-xs font-bold tracking-widest mb-3 opacity-50">◈ 属性分配</div>
            <AttrRow
              label="逻辑推理 LOGIC"
              value={agent.logic_power || 0}
              max={TOTAL_POOL}
              color={color}
              onChange={val => {
                const clamped = clampedAttr(activeAgent, 'logic_power', val, agents);
                updateAttr(activeAgent, 'logic_power', clamped);
              }}
            />
            <AttrRow
              label="观察力 OBSERVATION"
              value={agent.observation_focus || 0}
              max={TOTAL_POOL}
              color={color}
              onChange={val => {
                const clamped = clampedAttr(activeAgent, 'observation_focus', val, agents);
                updateAttr(activeAgent, 'observation_focus', clamped);
              }}
            />
          </div>

          {/* Network steps */}
          <div>
            <div className="text-xs font-bold tracking-widest mb-3 opacity-50">◈ 能力行动网络</div>
            {NETWORK_STEPS.map(step => {
              const mods = agent.network?.[step.id] || [];
              return (
                <div
                  key={step.id}
                  className="mb-3 p-3 rounded-xl border"
                  style={{ borderColor: color + '25', backgroundColor: 'rgba(0,0,0,0.2)' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>{step.icon}</span>
                    <span className="text-xs font-bold" style={{ color }}>{step.label}</span>
                    <span className="ml-auto text-xs opacity-30">{mods.length}/3 模块</span>
                  </div>
                  <div className="text-xs opacity-30 mb-2">{step.desc}</div>
                  <div className="flex flex-wrap gap-1">
                    {SUB_MODULES.map(mod => (
                      <ModuleTag
                        key={mod.id}
                        mod={mod}
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
            <div className="text-xs font-bold tracking-widest mb-2 opacity-50">◈ IF-THEN 行动指令</div>
            <div className="space-y-1 mb-2 max-h-28 overflow-y-auto">
              {(agent.custom_rules || []).map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-lg text-xs"
                  style={{ backgroundColor: color + '10', border: `1px solid ${color}20` }}
                >
                  <span className="flex-1 opacity-70">IF {rule.condition} → {rule.action}</span>
                  <button
                    onClick={() => updateAgent('custom_rules', (agent.custom_rules || []).filter((_, i) => i !== idx))}
                    className="opacity-30 hover:opacity-80"
                    style={{ color: '#ff3860' }}
                  >✕</button>
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <input
                value={newCond}
                onChange={e => setNewCond(e.target.value)}
                placeholder="IF: 条件 (e.g. NPC拒绝回答)"
                className="w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs outline-none"
                style={{ borderColor: color + '40', color: 'rgba(255,255,255,0.7)' }}
              />
              <input
                value={newAct}
                onChange={e => setNewAct(e.target.value)}
                placeholder="THEN: 行动 (e.g. 立刻出示证据)"
                className="w-full bg-transparent border rounded-lg px-3 py-1.5 text-xs outline-none"
                style={{ borderColor: color + '40', color: 'rgba(255,255,255,0.7)' }}
              />
              <button
                onClick={addRule}
                className="w-full py-1.5 rounded-lg text-xs border transition-all hover:opacity-80"
                style={{ borderColor: color + '60', color, backgroundColor: color + '10' }}
              >
                + 添加指令
              </button>
            </div>
          </div>
        </div>

        {/* ── Deploy Button ── */}
        <button
          onClick={handleDeploy}
          className="w-full py-5 rounded-2xl text-base font-black tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #00c8ff, #bf5fff)',
            boxShadow: '0 0 40px rgba(0,200,255,0.5), 0 0 80px rgba(191,95,255,0.3)',
            color: 'white',
            textShadow: '0 0 10px rgba(255,255,255,0.5)',
            border: 'none',
          }}
        >
          开始执行
        </button>
      </div>
    </div>
  );
}