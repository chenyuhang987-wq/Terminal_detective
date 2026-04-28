import React, { useState, useEffect } from 'react';
import { LocalStorage } from '@/game/gameState';
import { DEFAULT_AGENT_CONFIG } from '@/game/caseData';

const STANCES = ['aggressive', 'cautious', 'analytical'];
const ROLES = ['Lead_Investigator', 'Forensic_Analyst', 'Hacker'];

export default function AgentLobby({ onDeploy }) {
  const [config, setConfig] = useState(() => LocalStorage.loadStrategy() || { ...DEFAULT_AGENT_CONFIG });
  const [customRules, setCustomRules] = useState(config.custom_rules || []);
  const [newRule, setNewRule] = useState({ condition: '', action: '' });
  const [saved, setSaved] = useState(false);

  const logicPower = config.combat_attributes?.logic_power ?? 70;
  const obsFocus = config.combat_attributes?.observation_focus ?? 60;

  const pulseRate = (100 - logicPower) * 0.05 + 1;
  const auraH = Math.round((obsFocus / 100) * 200); // 0=red, 200=blue-green
  const auraColor = `hsl(${auraH + 160}, 100%, 60%)`;

  const update = (path, value) => {
    setConfig(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      // Derive engine_modifiers
      if (path.includes('logic_power')) {
        next.engine_modifiers.confusion_resistance = next.combat_attributes.logic_power / 100;
      }
      return next;
    });
  };

  const save = () => {
    const payload = { ...config, custom_rules: customRules };
    LocalStorage.saveStrategy(payload);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    return payload;
  };

  const deploy = () => {
    const payload = save();
    onDeploy(payload);
  };

  const addRule = () => {
    if (!newRule.condition || !newRule.action) return;
    setCustomRules(r => [...r, { ...newRule }]);
    setNewRule({ condition: '', action: '' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{
        background: 'radial-gradient(ellipse at top, #0a0f2e 0%, #04080f 60%, #000 100%)',
        fontFamily: "'Courier New', monospace",
      }}>

      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-xs tracking-[0.4em] mb-2" style={{ color: '#00ffff80' }}>
          TERMINAL DETECTIVE — SYSTEM v2.1.57
        </div>
        <h1 className="text-3xl font-bold tracking-widest mb-1"
          style={{ color: '#00ffff', textShadow: '0 0 30px #00ffff80' }}>
          AGENT DEPLOYMENT
        </h1>
        <div className="text-xs tracking-widest opacity-50" style={{ color: '#00ffff' }}>
          HOLOGRAPHIC CONFIGURATION TERMINAL
        </div>
      </div>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Agent Hologram */}
        <div className="flex flex-col items-center gap-6">
          {/* Hologram Agent Display */}
          <div className="relative flex items-center justify-center"
            style={{ width: 220, height: 220 }}>
            {/* Outer rings */}
            {[1, 0.75, 0.5].map((scale, i) => (
              <div key={i} className="absolute rounded-full border"
                style={{
                  width: 220 * scale, height: 220 * scale,
                  borderColor: `${auraColor}${Math.round(30 + i * 20).toString(16)}`,
                  boxShadow: `0 0 ${20 - i * 5}px ${auraColor}30`,
                  animation: `spin ${3 + i * 2}s linear infinite${i % 2 ? ' reverse' : ''}`,
                  top: `${(1 - scale) * 110}px`,
                  left: `${(1 - scale) * 110}px`,
                }} />
            ))}

            {/* Core agent orb */}
            <div className="absolute rounded-full flex items-center justify-center"
              style={{
                width: 100, height: 100,
                background: `radial-gradient(circle at 40% 35%, ${auraColor}40, rgba(0,0,0,0.8) 70%)`,
                border: `2px solid ${auraColor}`,
                boxShadow: `0 0 40px ${auraColor}60, inset 0 0 30px ${auraColor}20`,
                animation: `breathe ${pulseRate}s ease-in-out infinite`,
              }}>
              <span className="text-4xl">🤖</span>
            </div>

            {/* Data streams */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => (
              <div key={i} className="absolute w-1 rounded-full"
                style={{
                  height: 20,
                  backgroundColor: auraColor,
                  boxShadow: `0 0 6px ${auraColor}`,
                  transformOrigin: '50% 110px',
                  transform: `rotate(${deg}deg)`,
                  opacity: 0.4 + (i % 3) * 0.2,
                  animation: `pulse ${pulseRate * 0.5}s ${i * 0.1}s ease-in-out infinite`,
                  top: 0, left: '50%', marginLeft: '-2px',
                }} />
            ))}
          </div>

          {/* Agent ID & Role */}
          <div className="w-full space-y-3">
            <div>
              <label className="text-xs tracking-widest mb-1 block" style={{ color: auraColor }}>
                AGENT DESIGNATION
              </label>
              <input
                className="w-full bg-transparent border rounded px-3 py-2 text-sm outline-none"
                style={{ borderColor: `${auraColor}60`, color: auraColor }}
                value={config.agent_id}
                onChange={e => update('agent_id', e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs tracking-widest mb-1 block" style={{ color: auraColor }}>
                OPERATIONAL ROLE
              </label>
              <div className="flex gap-2">
                {ROLES.map(r => (
                  <button key={r} onClick={() => update('role', r)}
                    className="flex-1 px-2 py-1 text-xs rounded border transition-all"
                    style={{
                      borderColor: config.role === r ? auraColor : `${auraColor}30`,
                      backgroundColor: config.role === r ? `${auraColor}20` : 'transparent',
                      color: config.role === r ? auraColor : `${auraColor}60`,
                      boxShadow: config.role === r ? `0 0 10px ${auraColor}40` : 'none',
                    }}>
                    {r.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs tracking-widest mb-1 block" style={{ color: auraColor }}>
                BASE STANCE
              </label>
              <div className="flex gap-2">
                {STANCES.map(s => (
                  <button key={s} onClick={() => update('base_stance', s)}
                    className="flex-1 px-2 py-1 text-xs rounded border capitalize transition-all"
                    style={{
                      borderColor: config.base_stance === s ? auraColor : `${auraColor}30`,
                      backgroundColor: config.base_stance === s ? `${auraColor}20` : 'transparent',
                      color: config.base_stance === s ? auraColor : `${auraColor}60`,
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Attribute Sliders & Rules */}
        <div className="space-y-4">
          {/* Sliders */}
          <div className="rounded-lg border p-4 space-y-4"
            style={{ borderColor: `${auraColor}30`, backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="text-xs tracking-widest mb-2" style={{ color: auraColor }}>
              ◈ NEURAL ATTRIBUTE MATRIX
            </div>

            {[
              { label: 'LOGIC POWER', path: 'combat_attributes.logic_power', val: logicPower, desc: 'Confusion resistance, deduction depth' },
              { label: 'OBSERVATION FOCUS', path: 'combat_attributes.observation_focus', val: obsFocus, desc: 'Clue detection rate, NPC read accuracy' },
            ].map(attr => (
              <div key={attr.path}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: auraColor }}>{attr.label}</span>
                  <span style={{ color: auraColor }}>{attr.val}<span className="opacity-40">/100</span></span>
                </div>
                <input type="range" min={0} max={100} value={attr.val}
                  onChange={e => update(attr.path, parseInt(e.target.value))}
                  className="w-full h-1 rounded-full cursor-pointer appearance-none"
                  style={{
                    background: `linear-gradient(to right, ${auraColor} ${attr.val}%, rgba(255,255,255,0.1) ${attr.val}%)`,
                    accentColor: auraColor,
                  }} />
                <div className="text-xs mt-1 opacity-40" style={{ color: auraColor }}>{attr.desc}</div>
              </div>
            ))}

            {/* Derived stats */}
            <div className="border-t pt-3 grid grid-cols-2 gap-2"
              style={{ borderColor: `${auraColor}20` }}>
              {[
                { label: 'Confusion Resistance', val: `${Math.round(logicPower)}%` },
                { label: 'Pulse Rate', val: `${pulseRate.toFixed(1)}s` },
              ].map(s => (
                <div key={s.label} className="text-center p-2 rounded"
                  style={{ backgroundColor: `${auraColor}10`, border: `1px solid ${auraColor}20` }}>
                  <div className="text-xs opacity-50 mb-1" style={{ color: auraColor }}>{s.label}</div>
                  <div className="text-sm font-bold" style={{ color: auraColor }}>{s.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* IF-THEN Rules */}
          <div className="rounded-lg border p-4"
            style={{ borderColor: `${auraColor}30`, backgroundColor: 'rgba(0,0,0,0.4)' }}>
            <div className="text-xs tracking-widest mb-3" style={{ color: auraColor }}>
              ◈ BEHAVIORAL RULE ENGINE
            </div>
            <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
              {customRules.map((rule, i) => (
                <div key={i} className="text-xs p-2 rounded flex items-start justify-between gap-2"
                  style={{ backgroundColor: `${auraColor}10`, border: `1px solid ${auraColor}20` }}>
                  <div style={{ color: `${auraColor}cc` }}>
                    <span className="opacity-60">IF </span>{rule.condition}
                    <span className="opacity-60"> → </span>{rule.action}
                  </div>
                  <button onClick={() => setCustomRules(r => r.filter((_, j) => j !== i))}
                    className="opacity-40 hover:opacity-100 flex-shrink-0" style={{ color: '#ff3860' }}>✕</button>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <input placeholder="IF: condition (e.g. NPC refuses to answer)"
                className="w-full bg-transparent border rounded px-2 py-1 text-xs outline-none"
                style={{ borderColor: `${auraColor}40`, color: `${auraColor}cc` }}
                value={newRule.condition}
                onChange={e => setNewRule(r => ({ ...r, condition: e.target.value }))} />
              <input placeholder="THEN: action (e.g. present evidence)"
                className="w-full bg-transparent border rounded px-2 py-1 text-xs outline-none"
                style={{ borderColor: `${auraColor}40`, color: `${auraColor}cc` }}
                value={newRule.action}
                onChange={e => setNewRule(r => ({ ...r, action: e.target.value }))} />
              <button onClick={addRule}
                className="w-full py-1 text-xs rounded border transition-all hover:opacity-80"
                style={{ borderColor: `${auraColor}60`, color: auraColor, backgroundColor: `${auraColor}15` }}>
                + ADD RULE
              </button>
            </div>
          </div>

          {/* Deploy Button */}
          <button onClick={deploy}
            className="w-full py-4 rounded-lg text-sm font-bold tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${auraColor}30, ${auraColor}10)`,
              border: `2px solid ${auraColor}`,
              color: auraColor,
              boxShadow: `0 0 30px ${auraColor}40, inset 0 0 20px ${auraColor}10`,
              textShadow: `0 0 10px ${auraColor}`,
            }}>
            ▶ DEPLOY AGENT TO FIELD
          </button>
          {saved && (
            <div className="text-center text-xs" style={{ color: auraColor }}>
              ✓ Configuration saved to local memory
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 40px ${auraColor}60, inset 0 0 30px ${auraColor}20; }
          50% { transform: scale(1.06); box-shadow: 0 0 60px ${auraColor}80, inset 0 0 40px ${auraColor}30; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}