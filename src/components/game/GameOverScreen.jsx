import React, { useEffect, useState, useRef } from 'react';
import {
  getLevelFromXP, getXPToNextLevel, SKILL_TREES, LEVEL_XP_TABLE, MAX_LEVEL,
  loadProgression, saveProgression, addXPAll,
} from '@/game/agentProgression';

// ── XP formula ────────────────────────────────────────────────────────────────
const SCORE_XP = { S: 300, A: 220, B: 150, C: 80, D: 30 };
const SCORE_TITLES = {
  S: '至尊侦探', A: '精英探员', B: '资深调查官', C: '初级探员', D: '见习侦探',
};

function calcXPGain(judgeResult, gameState, caseData) {
  const base = SCORE_XP[judgeResult?.score] || 0;
  const cluePct = gameState.unlocked_clues.length / (caseData?.clue_dictionary?.length || 1);
  const clueBonus = Math.round(cluePct * 60);
  const apEfficiency = gameState.action_points_left; // leftover AP
  const apBonus = Math.min(apEfficiency * 5, 80);
  const confusionCtrl = Math.max(0, 100 - gameState.confusion_score);
  const confusionBonus = Math.round((confusionCtrl / 100) * 50);
  const noBSoD = gameState.confusion_score < 100 ? 40 : 0;
  const passed = judgeResult?.is_passed ? 0 : -50;

  return {
    base,
    clueBonus,
    apBonus,
    confusionBonus,
    noBSoD,
    passed,
    total: Math.max(0, base + clueBonus + apBonus + confusionBonus + noBSoD + passed),
  };
}

// ── Animated number counter ───────────────────────────────────────────────────
function Counter({ target, duration = 1200, color = '#00e5ff', prefix = '', suffix = '' }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      setVal(Math.round(pct * target));
      if (pct < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target]);
  return <span style={{ color, fontFamily: 'monospace', fontWeight: 900 }}>{prefix}{val}{suffix}</span>;
}

// ── XP Bar with level-up flash ────────────────────────────────────────────────
function XPBar({ oldXP, newXP, color, agentIdx, agentName }) {
  const [displayed, setDisplayed] = useState(oldXP);
  const [levelUps, setLevelUps] = useState([]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    // Animate XP filling + detect level crossings
    const crossings = [];
    for (let lvl = 1; lvl <= MAX_LEVEL; lvl++) {
      if (LEVEL_XP_TABLE[lvl] > oldXP && LEVEL_XP_TABLE[lvl] <= newXP) {
        crossings.push(lvl);
      }
    }
    setLevelUps(crossings);

    let start = null;
    const dur = 1800;
    const step = (ts) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / dur, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setDisplayed(Math.round(oldXP + ease * (newXP - oldXP)));
      if (pct < 1) requestAnimationFrame(step);
      else setFlash(true);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [oldXP, newXP]);

  const level = getLevelFromXP(displayed);
  const { current, needed, pct } = getXPToNextLevel(displayed);
  const isMax = level >= MAX_LEVEL;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Agent row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          border: `2px solid ${color}`,
          background: `${color}20`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'monospace', fontWeight: 900, fontSize: '0.75rem',
          color, flexShrink: 0,
          boxShadow: flash ? `0 0 20px ${color}` : `0 0 8px ${color}60`,
          transition: 'box-shadow 0.5s',
        }}>{level}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ color, fontSize: '0.7rem', fontFamily: 'monospace', fontWeight: 700 }}>{agentName}</span>
            <span style={{ color: `${color}80`, fontSize: '0.6rem', fontFamily: 'monospace' }}>
              {isMax ? 'MAX' : `${current}/${needed} XP`}
            </span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: isMax ? '100%' : `${pct}%`,
              background: `linear-gradient(to right, ${color}60, ${color})`,
              boxShadow: `0 0 8px ${color}`,
              transition: 'width 0.1s',
            }} />
          </div>
        </div>
      </div>

      {/* Level-up badges */}
      {levelUps.map(lvl => {
        const skill = SKILL_TREES[agentIdx]?.find(s => s.unlock_level === lvl);
        return (
          <div key={lvl} style={{
            marginLeft: 42, marginBottom: 4,
            padding: '4px 10px',
            borderRadius: 8,
            border: `1px solid ${color}60`,
            background: `${color}12`,
            display: 'flex', alignItems: 'center', gap: 8,
            animation: 'level-pop 0.5s cubic-bezier(.22,1,.36,1) both',
          }}>
            <span style={{ fontSize: 16 }}>⬆️</span>
            <div>
              <div style={{ color, fontSize: '0.65rem', fontFamily: 'monospace', fontWeight: 700 }}>
                LEVEL UP → Lv.{lvl}
              </div>
              {skill && (
                <div style={{ color: `${color}99`, fontSize: '0.58rem', fontFamily: 'monospace' }}>
                  {skill.icon} {skill.name} 解锁：{skill.desc}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Score grade ring ──────────────────────────────────────────────────────────
function ScoreRing({ score, isPassed }) {
  const colors = { S: '#00ff88', A: '#00e5ff', B: '#ffaa00', C: '#ff6600', D: '#ff3860' };
  const color = colors[score] || '#888';
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 200); }, []);
  return (
    <div style={{
      width: 110, height: 110, borderRadius: '50%',
      border: `3px solid ${color}`,
      background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 40px ${color}60, inset 0 0 20px ${color}10`,
      transform: visible ? 'scale(1)' : 'scale(0.3)',
      opacity: visible ? 1 : 0,
      transition: 'all 0.6s cubic-bezier(.22,1,.36,1)',
    }}>
      <div style={{ fontSize: '3rem', fontWeight: 900, fontFamily: 'monospace', color, textShadow: `0 0 20px ${color}`, lineHeight: 1 }}>
        {score}
      </div>
      <div style={{ fontSize: '0.5rem', fontFamily: 'monospace', color: `${color}80`, letterSpacing: '0.15em', marginTop: 2 }}>
        {isPassed ? 'SOLVED' : 'FAILED'}
      </div>
    </div>
  );
}

// ── Main GameOverScreen ───────────────────────────────────────────────────────
export default function GameOverScreen({ judgeResult, gameState, caseData, agentStrategy, onReturnToLobby, onReturnToLanding }) {
  const xpGain = calcXPGain(judgeResult, gameState, caseData);
  const [oldProg] = useState(() => loadProgression());
  const [newProg, setNewProg] = useState(null);
  const [phase, setPhase] = useState('summary'); // summary → xp → done

  useEffect(() => {
    // Save new XP after a short delay for dramatic effect
    const t = setTimeout(() => {
      const updated = addXPAll(oldProg, xpGain.total);
      saveProgression(updated);
      setNewProg(updated);
      setPhase('xp');
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  const agentNames = ['隼目', '破心', '幽灵'];
  const agentColors = ['#00e5ff', '#ff6b6b', '#a78bfa'];
  const score = judgeResult?.score || 'D';
  const isPassed = !!judgeResult?.is_passed;

  const scoreTitle = SCORE_TITLES[score] || '见习侦探';
  const mainColor = isPassed ? '#00ff88' : '#ff3860';

  const BONUS_ROWS = [
    { label: '案件评分奖励', val: xpGain.base, color: '#00e5ff' },
    { label: `线索收集（${gameState.unlocked_clues.length}/${caseData?.clue_dictionary?.length}）`, val: xpGain.clueBonus, color: '#a78bfa' },
    { label: `剩余AP效率（${gameState.action_points_left}AP）`, val: xpGain.apBonus, color: '#ffaa00' },
    { label: `混乱控制（${gameState.confusion_score}%）`, val: xpGain.confusionBonus, color: '#00ff88' },
    { label: '无崩溃奖励', val: xpGain.noBSoD, color: '#ff3aff' },
    ...(xpGain.passed < 0 ? [{ label: '破案失败惩罚', val: xpGain.passed, color: '#ff3860' }] : []),
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 10%, #0a0020 0%, #03060f 60%)',
      fontFamily: "'Courier New', monospace",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '32px 16px',
      overflowY: 'auto',
      color: '#fff',
    }}>
      {/* Scanlines */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.15) 2px,rgba(0,0,0,0.15) 4px)',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 680 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28, animation: 'go-in 0.6s cubic-bezier(.22,1,.36,1) both' }}>
          <div style={{
            display: 'inline-block', border: `1px solid ${mainColor}50`,
            borderRadius: 6, padding: '3px 14px', fontSize: '0.55rem',
            fontFamily: 'monospace', color: `${mainColor}80`,
            letterSpacing: '0.25em', marginBottom: 12,
            background: `${mainColor}08`,
          }}>
            ◈ CASE CLOSED · {caseData?.case_id || 'NEON_BLOOD_01'} · {new Date().toLocaleDateString('zh-CN')}
          </div>
          <h1 style={{
            fontSize: 'clamp(1.8rem, 5vw, 3rem)',
            fontWeight: 900, margin: 0,
            background: isPassed
              ? 'linear-gradient(135deg, #00ff88 0%, #00e5ff 100%)'
              : 'linear-gradient(135deg, #ff3860 0%, #ff6600 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '0.08em',
          }}>
            {isPassed ? '◈ 案件终结' : '◈ 调查失败'}
          </h1>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginTop: 6, letterSpacing: '0.2em' }}>
            {caseData?.title} · {caseData?.subtitle}
          </div>
        </div>

        {/* Score + critique */}
        <div style={{
          display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 24,
          animation: 'go-in 0.6s 0.15s cubic-bezier(.22,1,.36,1) both',
          flexWrap: 'wrap',
        }}>
          <ScoreRing score={score} isPassed={isPassed} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ color: mainColor, fontSize: '0.75rem', fontWeight: 700, marginBottom: 4, letterSpacing: '0.08em' }}>
              {scoreTitle}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', lineHeight: 1.6, marginBottom: 10 }}>
              {judgeResult?.critique || '调查记录已归档。'}
            </div>
            {/* Mini stats */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[
                { label: '总回合', val: gameState.turn_count || '—' },
                { label: '发现线索', val: `${gameState.unlocked_clues.length}/${caseData?.clue_dictionary?.length}` },
                { label: '剩余AP', val: gameState.action_points_left },
                { label: '混乱峰值', val: `${gameState.confusion_score}%` },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ color: mainColor, fontSize: '1rem', fontWeight: 900 }}>{s.val}</div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.5rem', letterSpacing: '0.1em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* XP breakdown */}
        <div style={{
          border: '1px solid rgba(0,229,255,0.15)',
          borderRadius: 14,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          padding: '18px 20px',
          marginBottom: 20,
          animation: 'go-in 0.6s 0.3s cubic-bezier(.22,1,.36,1) both',
        }}>
          <div style={{ color: 'rgba(0,229,255,0.7)', fontSize: '0.6rem', letterSpacing: '0.2em', marginBottom: 14 }}>
            ◈ 经验值结算
          </div>
          {BONUS_ROWS.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.68rem' }}>{r.label}</span>
              <span style={{
                color: r.val < 0 ? '#ff3860' : r.color,
                fontWeight: 700, fontSize: '0.75rem', fontFamily: 'monospace',
              }}>
                {r.val >= 0 ? '+' : ''}{r.val} XP
              </span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.7rem', fontWeight: 700 }}>总计获得</span>
            <span style={{ color: '#00ff88', fontSize: '1.1rem', fontWeight: 900, fontFamily: 'monospace', textShadow: '0 0 12px #00ff88' }}>
              {phase === 'xp' || phase === 'done'
                ? <Counter target={xpGain.total} suffix=" XP" color="#00ff88" />
                : `+${xpGain.total} XP`}
            </span>
          </div>
        </div>

        {/* Agent XP bars */}
        {phase === 'xp' && newProg && (
          <div style={{
            border: '1px solid rgba(167,139,250,0.2)',
            borderRadius: 14,
            background: 'rgba(0,0,0,0.5)',
            padding: '18px 20px',
            marginBottom: 20,
            animation: 'go-in 0.5s cubic-bezier(.22,1,.36,1) both',
          }}>
            <div style={{ color: 'rgba(167,139,250,0.8)', fontSize: '0.6rem', letterSpacing: '0.2em', marginBottom: 14 }}>
              ◈ 探员晋升档案
            </div>
            {agentNames.map((name, i) => (
              <XPBar
                key={i}
                agentIdx={i}
                agentName={name}
                color={agentColors[i]}
                oldXP={oldProg[i]?.xp || 0}
                newXP={newProg[i]?.xp || 0}
              />
            ))}
          </div>
        )}

        {/* Rank title banner */}
        {phase === 'xp' && (
          <div style={{
            textAlign: 'center', marginBottom: 20,
            animation: 'go-in 0.6s 0.3s cubic-bezier(.22,1,.36,1) both',
          }}>
            <div style={{
              display: 'inline-block',
              border: `2px solid ${mainColor}60`,
              borderRadius: 12,
              padding: '10px 28px',
              background: `${mainColor}10`,
              backdropFilter: 'blur(8px)',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.55rem', letterSpacing: '0.2em', marginBottom: 4 }}>
                本局评定称号
              </div>
              <div style={{ color: mainColor, fontSize: '1.2rem', fontWeight: 900, fontFamily: 'monospace', textShadow: `0 0 16px ${mainColor}` }}>
                {scoreTitle}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', animation: 'go-in 0.6s 0.5s cubic-bezier(.22,1,.36,1) both' }}>
          <button
            onClick={onReturnToLobby}
            style={{
              padding: '14px 36px',
              fontSize: '0.8rem', fontWeight: 900, fontFamily: 'monospace',
              letterSpacing: '0.15em', color: '#fff',
              background: 'linear-gradient(135deg, #00c8ff 0%, #a78bfa 100%)',
              border: 'none', borderRadius: 12, cursor: 'pointer',
              boxShadow: '0 0 30px rgba(0,200,255,0.4)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.target.style.transform = 'scale(1)'}
          >
            ↺ 重新配置编队
          </button>
          <button
            onClick={onReturnToLanding}
            style={{
              padding: '14px 36px',
              fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace',
              letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 12, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.borderColor = 'rgba(255,255,255,0.4)'; e.target.style.color = '#fff'; }}
            onMouseLeave={e => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.color = 'rgba(255,255,255,0.6)'; }}
          >
            ← 返回主页
          </button>
        </div>
      </div>

      <style>{`
        @keyframes go-in {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes level-pop {
          from { opacity: 0; transform: scale(0.8) translateX(-8px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}