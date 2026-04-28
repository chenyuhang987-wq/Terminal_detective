import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LocalStorage } from '@/game/gameState';
import { DEFAULT_AGENT_CONFIG } from '@/game/caseData';

// ── Constants ──────────────────────────────────────────────────────────────
const AGENT_COLORS = ['#00ffff', '#ff3860', '#bf5fff'];
const AGENT_ICONS = ['🕵️', '🔬', '💻'];
const AGENT_ROLE_LABELS = ['主侦探 Lead', '法证 Forensic', '黑客 Hacker'];
const STANCES = ['analytical', 'aggressive', 'cautious'];

const NETWORK_STEPS = [
  { id: 'observe', label: '第一步：观察现场', icon: '👁️', desc: '扫描周围物品与环境线索' },
  { id: 'interrogate', label: '第二步：问询关键人物', icon: '🗣️', desc: '找离死者最近的人问话' },
  { id: 'confront', label: '第三步：交叉验证与拆穿', icon: '⚡', desc: '若口供与物品线索矛盾，立刻拆穿' },
];

const SUB_MODULES = [
  { id: 'physical_scan', label: '物理扫描', icon: '🔍', desc: '扫描物理痕迹' },
  { id: 'digital_trace', label: '数字追踪', icon: '💾', desc: '追踪数字足迹' },
  { id: 'emotion_read', label: '情绪读取', icon: '🧠', desc: '分析情绪反应' },
  { id: 'timeline_check', label: '时间线核查', icon: '🕒', desc: '验证时间线' },
  { id: 'alibi_crack', label: '不在场证明破解', icon: '🔓', desc: '逻辑拆穿不在场' },
  { id: 'evidence_chain', label: '证据链构建', icon: '🔗', desc: '串联关键证据' },
];

const TOTAL_ATTRS = 100; // total pool per attribute across 3 agents

function makeDefaultAgent(idx) {
  return {
    agent_id: `AGENT-${['ALPHA', 'BETA', 'GAMMA'][idx]}`,
    role: AGENT_ROLE_LABELS[idx],
    base_stance: STANCES[0],
    logic_power: idx === 0 ? 50 : idx === 1 ? 30 : 20,
    observation_focus: idx === 0 ? 40 : idx === 1 ? 40 : 20,
    network: {
      observe: [],
      interrogate: [],
      confront: [],
    },
    custom_rules: [],
  };
}

// ── Data Flow Animation Canvas ──────────────────────────────────────────────
function DataFlowCanvas({ agents, activeAgent }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const frameRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;

    // 3 agent orb positions
    const positions = [
      { x: W * 0.2, y: H * 0.5 },
      { x: W * 0.5, y: H * 0.25 },
      { x: W * 0.8, y: H * 0.5 },
    ];

    // Spawn particles along edges
    function spawnParticle(from, to, color) {
      particlesRef.current.push({
        x: positions[from].x, y: positions[from].y,
        tx: positions[to].x, ty: positions[to].y,
        color, t: 0, speed: 0.008 + Math.random() * 0.006,
      });
    }

    const spawnInterval = setInterval(() => {
      [[0,1],[1,2],[0,2]].forEach(([a, b]) => {
        spawnParticle(a, b, AGENT_COLORS[a]);
        spawnParticle(b, a, AGENT_COLORS[b]);
      });
    }, 400);

    function draw() {
      ctx.clearRect(0, 0, W, H);

      // Draw connecting lines
      [[0,1],[1,2],[0,2]].forEach(([a, b]) => {
        const grad = ctx.createLinearGradient(positions[a].x, positions[a].y, positions[b].x, positions[b].y);
        grad.addColorStop(0, AGENT_COLORS[a] + '60');
        grad.addColorStop(1, AGENT_COLORS[b] + '60');
        ctx.beginPath();
        ctx.moveTo(positions[a].x, positions[a].y);
        ctx.lineTo(positions[b].x, positions[b].y);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw orbs
      positions.forEach((pos, i) => {
        const isActive = i === activeAgent;
        const color = AGENT_COLORS[i];
        const radius = isActive ? 28 : 20;

        // Glow
        const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 2.5);
        grd.addColorStop(0, color + '60');
        grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core circle
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = isActive ? 3 : 1.5;
        ctx.stroke();

        // Icon text
        ctx.font = `${isActive ? 20 : 14}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(AGENT_ICONS[i], pos.x, pos.y);

        // Label
        ctx.font = '9px monospace';
        ctx.fillStyle = color;
        ctx.fillText(agents[i]?.agent_id || `AGENT-${i}`, pos.x, pos.y + radius + 14);
      });

      // Move & draw particles
      particlesRef.current = particlesRef.current.filter(p => p.t <= 1);
      particlesRef.current.forEach(p => {
        p.t += p.speed;
        const cx = p.x + (p.tx - p.x) * p.t;
        const cy = p.y + (p.ty - p.y) * p.t;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = p.color + 'cc';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fillStyle = p.color + '30';
        ctx.fill();
      });

      frameRef.current = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(frameRef.current);
      clearInterval(spawnInterval);
    };
  }, [activeAgent, agents]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 160, display: 'block' }}
    />
  );
}

// ── Network Builder for one step ───────────────────────────────────────────
function NetworkStep({ step, agentIdx, modules, onToggle, color }) {
  const active = modules.filter(m => step.id && true); // just display

  return (
    <div
      className="p-3 rounded-lg border mb-2"
      style={{ borderColor: color + '40', backgroundColor: color + '08' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span>{step.icon}</span>
        <span className="text-xs font-bold tracking-wider" style={{ color }}>{step.label}</span>
      </div>
      <div className="text-xs opacity-40 mb-2">{step.desc}</div>
      {/* Sub-module slots */}
      <div className="flex flex-wrap gap-1">
        {SUB_MODULES.map(mod => {
          const isOn = modules.includes(mod.id);
          const count = modules.length;
          const canAdd = isOn || count < 3;
          return (
            <button
              key={mod.id}
              onClick={() => canAdd || isOn ? onToggle(step.id, mod.id) : null}
              title={mod.desc}
              className="px-2 py-1 rounded text-xs border transition-all"
              style={{
                borderColor: isOn ? color : color + '30',
                backgroundColor: isOn ? color + '25' : 'transparent',
                color: isOn ? color : (canAdd ? color + '60' : '#ffffff20'),
                cursor: canAdd || isOn ? 'pointer' : 'not-allowed',
                opacity: !canAdd && !isOn ? 0.35 : 1,
              }}
            >
              {mod.icon} {mod.label}
            </button>
          );
        })}
      </div>
      <div className="text-xs mt-1 opacity-30" style={{ color }}>
        已选 {modules.length}/3 子模块
      </div>
    </div>
  );
}

// ── Attribute Distributor ──────────────────────────────────────────────────
function AttrDistributor({ agents, attrKey, label, color, onChange }) {
  const total = agents.reduce((s, a) => s + (a[attrKey] || 0), 0);

  const handleChange = (idx, val) => {
    const others = agents.map((a, i) => i === idx ? 0 : (a[attrKey] || 0));
    const othersSum = others.reduce((s, v) => s + v, 0);
    const newVal = Math.max(0, Math.min(TOTAL_ATTRS - othersSum, val));
    onChange(idx, attrKey, newVal);
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold tracking-widest opacity-70">{label}</span>
        <span className="text-xs" style={{ color: total === TOTAL_ATTRS ? '#00ff88' : '#ffaa00' }}>
          {total}/{TOTAL_ATTRS}
        </span>
      </div>
      {agents.map((agent, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <span className="text-xs w-20 opacity-60" style={{ color: AGENT_COLORS[i] }}>
            {AGENT_ICONS[i]} {agent.agent_id?.split('-')[1] || `A${i+1}`}
          </span>
          <div className="flex-1 relative h-5 flex items-center">
            <div className="w-full h-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
            <div className="absolute h-1 rounded left-0"
              style={{
                width: `${(agent[attrKey] || 0)}%`,
                backgroundColor: AGENT_COLORS[i],
                boxShadow: `0 0 6px ${AGENT_COLORS[i]}`,
              }} />
            <input
              type="range" min={0} max={TOTAL_ATTRS}
              value={agent[attrKey] || 0}
              onChange={e => handleChange(i, parseInt(e.target.value))}
              className="absolute w-full h-5 opacity-0 cursor-pointer"
            />
            <div className="absolute w-2.5 h-2.5 rounded-full border-2 pointer-events-none"
              style={{
                left: `calc(${agent[attrKey] || 0}% - 5px)`,
                borderColor: AGENT_COLORS[i],
                backgroundColor: '#0a0f1e',
                boxShadow: `0 0 8px ${AGENT_COLORS[i]}`,
              }} />
          </div>
          <span className="text-xs w-8 text-right font-bold" style={{ color: AGENT_COLORS[i] }}>
            {agent[attrKey] || 0}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function MultiAgentConsole({ onDeploy }) {
  const [agents, setAgents] = useState(() => {
    const saved = LocalStorage.loadTeamConfig();
    if (saved && Array.isArray(saved) && saved.length === 3) return saved;
    return [0, 1, 2].map(makeDefaultAgent);
  });
  const [activeAgent, setActiveAgent] = useState(0);
  const [saved, setSaved] = useState(false);

  const agent = agents[activeAgent];
  const color = AGENT_COLORS[activeAgent];

  const updateAgent = useCallback((idx, field, value) => {
    setAgents(prev => prev.map((a, i) => i === idx ? { ...a, [field]: value } : a));
  }, []);

  const updateAttr = useCallback((agentIdx, attrKey, val) => {
    setAgents(prev => prev.map((a, i) => i === agentIdx ? { ...a, [attrKey]: val } : a));
  }, []);

  const toggleModule = useCallback((stepId, modId) => {
    setAgents(prev => prev.map((a, i) => {
      if (i !== activeAgent) return a;
      const net = { ...a.network };
      const mods = net[stepId] || [];
      if (mods.includes(modId)) {
        net[stepId] = mods.filter(m => m !== modId);
      } else if (mods.length < 3) {
        net[stepId] = [...mods, modId];
      }
      return { ...a, network: net };
    }));
  }, [activeAgent]);

  const handleDeploy = () => {
    LocalStorage.saveTeamConfig(agents);
    // Build a combined strategy from agents, with the first as "lead"
    const lead = agents[0];
    const teamConfig = {
      ...DEFAULT_AGENT_CONFIG,
      agent_id: agents.map(a => a.agent_id).join('+'),
      role: 'Multi_Agent_Team',
      base_stance: lead.base_stance,
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
  const allValid = logicTotal <= TOTAL_ATTRS && obsTotal <= TOTAL_ATTRS;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at top, #0a0f2e 0%, #04080f 60%, #000 100%)',
        fontFamily: "'Courier New', monospace",
        color: 'white',
      }}
    >
      {/* Header */}
      <div className="text-center py-6 border-b" style={{ borderColor: 'rgba(0,255,255,0.15)' }}>
        <div className="text-xs tracking-[0.4em] mb-1" style={{ color: '#00ffff60' }}>
          MULTI-AGENT SYSTEM CONSOLE · v2.1
        </div>
        <h1 className="text-2xl font-black tracking-widest" style={{ color: '#00ffff', textShadow: '0 0 20px #00ffff60' }}>
          群体博弈指挥台
        </h1>
        <div className="text-xs opacity-40 mt-1">构建你的三人侦探小队，分配能力，设计行动网络</div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* LEFT: Data flow + Agent tabs + Attribute distribution */}
        <div className="lg:w-80 border-r flex flex-col" style={{ borderColor: 'rgba(0,255,255,0.1)' }}>

          {/* Data Flow Canvas */}
          <div className="border-b p-2" style={{ borderColor: 'rgba(0,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="text-xs tracking-widest mb-1 opacity-40 text-center">◈ 数据流交汇图</div>
            <DataFlowCanvas agents={agents} activeAgent={activeAgent} />
          </div>

          {/* Agent selector tabs */}
          <div className="flex border-b" style={{ borderColor: 'rgba(0,255,255,0.1)' }}>
            {agents.map((a, i) => (
              <button
                key={i}
                onClick={() => setActiveAgent(i)}
                className="flex-1 py-3 text-xs font-bold transition-all"
                style={{
                  borderBottom: activeAgent === i ? `2px solid ${AGENT_COLORS[i]}` : '2px solid transparent',
                  color: activeAgent === i ? AGENT_COLORS[i] : '#ffffff30',
                  backgroundColor: activeAgent === i ? AGENT_COLORS[i] + '10' : 'transparent',
                }}
              >
                {AGENT_ICONS[i]}<br />
                <span className="text-xs opacity-70">{a.agent_id?.split('-')[1] || `A${i+1}`}</span>
              </button>
            ))}
          </div>

          {/* Attribute distribution */}
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="text-xs font-bold tracking-widest mb-3 opacity-60">◈ 能力值分配 (总计100)</div>

            <AttrDistributor
              agents={agents}
              attrKey="logic_power"
              label="逻辑推理 LOGIC"
              color="#00ffff"
              onChange={updateAttr}
            />
            <AttrDistributor
              agents={agents}
              attrKey="observation_focus"
              label="观察力 OBSERVATION"
              color="#bf5fff"
              onChange={updateAttr}
            />

            {/* Validation */}
            <div className="mt-3 p-2 rounded text-xs text-center"
              style={{
                backgroundColor: allValid ? '#00ff8820' : '#ff386020',
                border: `1px solid ${allValid ? '#00ff8850' : '#ff386050'}`,
                color: allValid ? '#00ff88' : '#ff3860',
              }}>
              {allValid ? '✓ 属性分配有效' : '⚠ 属性总值不可超过100'}
            </div>
          </div>
        </div>

        {/* RIGHT: Agent detail config */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Agent header bar */}
          <div
            className="px-6 py-4 border-b flex items-center gap-4"
            style={{ borderColor: color + '30', backgroundColor: color + '08' }}
          >
            <div className="text-3xl" style={{ filter: `drop-shadow(0 0 12px ${color})` }}>
              {AGENT_ICONS[activeAgent]}
            </div>
            <div className="flex-1">
              <input
                value={agent.agent_id}
                onChange={e => updateAgent(activeAgent, 'agent_id', e.target.value)}
                className="bg-transparent border-b text-lg font-bold outline-none w-full"
                style={{ borderColor: color + '50', color }}
              />
              <div className="text-xs opacity-40 mt-1">{AGENT_ROLE_LABELS[activeAgent]}</div>
            </div>
            {/* Stance */}
            <div className="flex gap-1">
              {STANCES.map(s => (
                <button
                  key={s}
                  onClick={() => updateAgent(activeAgent, 'base_stance', s)}
                  className="px-2 py-1 text-xs rounded border transition-all"
                  style={{
                    borderColor: agent.base_stance === s ? color : color + '30',
                    backgroundColor: agent.base_stance === s ? color + '25' : 'transparent',
                    color: agent.base_stance === s ? color : color + '50',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Network builder */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs font-bold tracking-widest mb-3" style={{ color }}>
              ◈ 能力网络构建 — {agent.agent_id}
            </div>
            <div className="text-xs opacity-40 mb-4">
              为该探员设计行动逻辑网络：每步最多添加 3 个子模块，指导 AI 在侦探场景中的决策顺序。
            </div>

            {NETWORK_STEPS.map(step => (
              <NetworkStep
                key={step.id}
                step={step}
                agentIdx={activeAgent}
                modules={agent.network?.[step.id] || []}
                onToggle={toggleModule}
                color={color}
              />
            ))}

            {/* IF-THEN quick rules */}
            <div className="mt-4 p-3 rounded-lg border" style={{ borderColor: color + '30', backgroundColor: color + '05' }}>
              <div className="text-xs font-bold tracking-widest mb-2" style={{ color }}>◈ IF-THEN 行动指令</div>
              {(agent.custom_rules || []).map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-1 text-xs p-2 rounded"
                  style={{ backgroundColor: color + '10', border: `1px solid ${color}20` }}>
                  <span className="flex-1" style={{ color: color + 'cc' }}>
                    IF {rule.condition} → {rule.action}
                  </span>
                  <button
                    onClick={() => updateAgent(activeAgent, 'custom_rules',
                      (agent.custom_rules || []).filter((_, i) => i !== idx))}
                    style={{ color: '#ff3860' }} className="opacity-50 hover:opacity-100">✕</button>
                </div>
              ))}
              <AddRuleInline
                color={color}
                onAdd={(rule) => updateAgent(activeAgent, 'custom_rules', [...(agent.custom_rules || []), rule])}
              />
            </div>
          </div>

          {/* Deploy */}
          <div className="p-4 border-t" style={{ borderColor: 'rgba(0,255,255,0.15)' }}>
            <button
              onClick={handleDeploy}
              className="w-full py-4 rounded-xl text-sm font-black tracking-widest border-2 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                borderColor: '#00ffff',
                color: '#00ffff',
                backgroundColor: 'rgba(0,255,255,0.1)',
                boxShadow: '0 0 30px rgba(0,255,255,0.4), inset 0 0 20px rgba(0,255,255,0.05)',
                textShadow: '0 0 15px #00ffff',
              }}
            >
              ◈ 部署三人侦探小队 · BEGIN INVESTIGATION
            </button>
            {saved && (
              <div className="text-center text-xs mt-2" style={{ color: '#00ff88' }}>
                ✓ 小队配置已保存
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Small helper to add a new rule inline
function AddRuleInline({ color, onAdd }) {
  const [cond, setCond] = useState('');
  const [act, setAct] = useState('');
  const add = () => {
    if (!cond || !act) return;
    onAdd({ condition: cond, action: act });
    setCond(''); setAct('');
  };
  return (
    <div className="space-y-1 mt-2">
      <input
        value={cond} onChange={e => setCond(e.target.value)}
        placeholder="IF: 条件 (e.g. NPC拒绝回答)"
        className="w-full bg-transparent border rounded px-2 py-1 text-xs outline-none"
        style={{ borderColor: color + '40', color: color + 'cc' }}
      />
      <input
        value={act} onChange={e => setAct(e.target.value)}
        placeholder="THEN: 行动 (e.g. 立刻出示证据)"
        className="w-full bg-transparent border rounded px-2 py-1 text-xs outline-none"
        style={{ borderColor: color + '40', color: color + 'cc' }}
      />
      <button onClick={add}
        className="w-full py-1 text-xs rounded border transition-all"
        style={{ borderColor: color + '60', color, backgroundColor: color + '15' }}>
        + 添加指令
      </button>
    </div>
  );
}