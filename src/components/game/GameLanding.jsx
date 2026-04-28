import React, { useEffect, useRef, useState } from 'react';

// ── Animated matrix rain background ──────────────────────────────────────────
function MatrixRain({ color = '#00ff88' }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ΑΒΓΔΨΩαβγδψω∑∞§#@!'.split('');
    const fontSize = 13;
    const cols = Math.floor(canvas.width / fontSize);
    const drops = Array(cols).fill(1).map(() => Math.random() * -50);

    const tick = () => {
      ctx.fillStyle = 'rgba(3,6,15,0.18)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = color + '55';
      ctx.font = `${fontSize}px monospace`;
      drops.forEach((y, i) => {
        const ch = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(ch, i * fontSize, y * fontSize);
        if (y * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5;
      });
    };
    const id = setInterval(tick, 50);
    return () => { clearInterval(id); window.removeEventListener('resize', resize); };
  }, [color]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.55 }} />;
}

// ── Glowing scanline overlay ──────────────────────────────────────────────────
function Scanlines() {
  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.18) 2px, rgba(0,0,0,0.18) 4px)',
      zIndex: 1,
    }} />
  );
}

// ── Floating holographic data cards ──────────────────────────────────────────
const FEATURE_CARDS = [
  { icon: '🧠', title: '神经推理引擎', desc: 'ReAct 多阶段思维链，动态适应每一条证据链', color: '#00e5ff' },
  { icon: '🕵️', title: '多智能体编队', desc: '三名专属探员协同部署，技能互补触发连击增益', color: '#a78bfa' },
  { icon: '🗺', title: '动态案件流程图', desc: '可视化调查路径，拖拽节点优化优先级策略', color: '#ff3aff' },
  { icon: '⚡', title: '实时协同特效', desc: '粒子数据流 · AP 奖励连击 · 三重协同爆发', color: '#ffaa00' },
];

function FeatureCard({ icon, title, desc, color, delay }) {
  return (
    <div style={{
      border: `1px solid ${color}30`,
      background: `linear-gradient(135deg, ${color}08 0%, rgba(0,0,0,0.4) 100%)`,
      borderRadius: 16,
      padding: '20px 18px',
      backdropFilter: 'blur(8px)',
      animation: `card-in 0.6s ${delay}s cubic-bezier(.22,1,.36,1) both`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Corner accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0,
        width: 40, height: 40,
        borderTop: `2px solid ${color}`,
        borderLeft: `2px solid ${color}`,
        borderRadius: '14px 0 0 0',
        opacity: 0.6,
      }} />
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'monospace', color, marginBottom: 6, letterSpacing: '0.04em' }}>
        {title}
      </div>
      <div style={{ fontSize: '0.68rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
        {desc}
      </div>
    </div>
  );
}

// ── Animated title logo ───────────────────────────────────────────────────────
function TitleLogo() {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 3500 + Math.random() * 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ textAlign: 'center', position: 'relative', zIndex: 2 }}>
      {/* Case badge */}
      <div style={{
        display: 'inline-block',
        border: '1px solid rgba(0,229,255,0.4)',
        borderRadius: 6,
        padding: '3px 14px',
        fontSize: '0.6rem',
        fontFamily: 'monospace',
        color: 'rgba(0,229,255,0.7)',
        letterSpacing: '0.3em',
        marginBottom: 24,
        background: 'rgba(0,229,255,0.06)',
        animation: 'badge-blink 3s ease-in-out infinite',
      }}>
        ◈ CASE FILE · LVL_01 · OMEGA DIFFICULTY
      </div>

      {/* Main title */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <h1 style={{
          fontSize: 'clamp(3rem, 10vw, 6.5rem)',
          fontWeight: 900,
          fontFamily: 'monospace',
          lineHeight: 1,
          letterSpacing: '0.05em',
          margin: 0,
          background: 'linear-gradient(135deg, #ff3aff 0%, #00e5ff 50%, #ff3aff 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'title-shimmer 4s linear infinite',
          filter: glitch ? 'blur(2px)' : 'none',
          transform: glitch ? 'translateX(3px)' : 'none',
          transition: 'filter 0.05s, transform 0.05s',
        }}>
          TERMINAL
        </h1>
        <h1 style={{
          fontSize: 'clamp(3rem, 10vw, 6.5rem)',
          fontWeight: 900,
          fontFamily: 'monospace',
          lineHeight: 1,
          letterSpacing: '0.05em',
          margin: 0,
          background: 'linear-gradient(135deg, #00e5ff 0%, #ff3aff 50%, #00e5ff 100%)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          animation: 'title-shimmer 4s linear infinite reverse',
          filter: glitch ? 'blur(1px)' : 'none',
          transform: glitch ? 'translateX(-2px)' : 'none',
          transition: 'filter 0.05s, transform 0.05s',
        }}>
          DETECTIVE
        </h1>
        {/* Glitch red ghost */}
        {glitch && (
          <h1 style={{
            position: 'absolute', inset: 0,
            fontSize: 'clamp(3rem, 10vw, 6.5rem)',
            fontWeight: 900, fontFamily: 'monospace',
            lineHeight: 1, letterSpacing: '0.05em',
            margin: 0, color: '#ff3860',
            opacity: 0.4,
            transform: 'translateX(-4px) translateY(2px)',
            clipPath: 'polygon(0 30%, 100% 30%, 100% 55%, 0 55%)',
          }}>TERMINAL</h1>
        )}
      </div>

      {/* Subtitle */}
      <div style={{
        marginTop: 16,
        fontSize: '0.75rem',
        fontFamily: 'monospace',
        color: 'rgba(200,230,255,0.45)',
        letterSpacing: '0.4em',
        animation: 'fade-in 1.5s 0.5s both',
      }}>
        霓虹血迹 · NEON BLOOD · 2157
      </div>

      {/* Divider line */}
      <div style={{
        height: 1, margin: '24px auto',
        width: '60%',
        background: 'linear-gradient(to right, transparent, #ff3aff, #00e5ff, #ff3aff, transparent)',
        boxShadow: '0 0 12px #ff3aff60',
        animation: 'fade-in 1s 0.8s both',
      }} />
    </div>
  );
}

// ── Stats row ─────────────────────────────────────────────────────────────────
function StatRow() {
  const stats = [
    { label: '调查区域', value: '4', unit: 'ZONES' },
    { label: '嫌疑人', value: '3', unit: 'SUSPECTS' },
    { label: '隐藏线索', value: '9', unit: 'CLUES' },
    { label: '难度评级', value: 'Ω', unit: 'OMEGA' },
  ];
  return (
    <div style={{
      display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap',
      animation: 'fade-in 1s 1s both',
      position: 'relative', zIndex: 2,
    }}>
      {stats.map((s, i) => (
        <div key={i} style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: 900, fontFamily: 'monospace',
            color: '#00e5ff',
            textShadow: '0 0 20px #00e5ff80',
            lineHeight: 1,
          }}>{s.value}</div>
          <div style={{ fontSize: '0.5rem', fontFamily: 'monospace', color: 'rgba(0,229,255,0.5)', letterSpacing: '0.2em', marginTop: 2 }}>
            {s.unit}
          </div>
          <div style={{ fontSize: '0.55rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Terminal typing preview ───────────────────────────────────────────────────
const PREVIEW_LINES = [
  { t: '◈ TURN 1 — OBSERVATION PHASE', c: '#a78bfa' },
  { t: '> 现场：47层数据中心，Victor Zhao 陈尸地板。神经接口有EMP灼痕。', c: '#00e5ff' },
  { t: '◈ THINK — 神经推理链激活...', c: '#a78bfa' },
  { t: '检测到高压电磁脉冲特征，推断凶器为改装EMP设备。', c: '#bf5fff' },
  { t: '▶ ACTION ISSUED: [SEARCH_AREA]', c: '#00ff88' },
  { t: '🔍 NEW EVIDENCE: 🧾 染血收据 — 时间戳 23:05，高压电容购买记录', c: '#00ff88' },
  { t: '⚡ AP +2 · COMBO SYNERGY · 情报·解密', c: '#ffaa00' },
];

function TerminalPreview() {
  const [visibleLines, setVisibleLines] = useState(0);
  useEffect(() => {
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= PREVIEW_LINES.length) { clearInterval(t); setTimeout(() => setVisibleLines(0), 1500); }
    }, 700);
    return () => clearInterval(t);
  }, []);

  // Re-animate when reset to 0
  useEffect(() => {
    if (visibleLines !== 0) return;
    let i = 0;
    const t = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= PREVIEW_LINES.length) { clearInterval(t); setTimeout(() => setVisibleLines(0), 1500); }
    }, 700);
    return () => clearInterval(t);
  }, [visibleLines === 0]);

  return (
    <div style={{
      border: '1px solid rgba(0,229,255,0.15)',
      borderRadius: 12,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)',
      padding: '14px 18px',
      fontFamily: 'monospace',
      fontSize: '0.68rem',
      lineHeight: 1.8,
      maxWidth: 560,
      margin: '0 auto',
      animation: 'fade-in 1s 1.2s both',
      position: 'relative', zIndex: 2,
    }}>
      <div style={{ color: 'rgba(0,229,255,0.4)', fontSize: '0.55rem', letterSpacing: '0.2em', marginBottom: 8 }}>
        ● TERMINAL PREVIEW · LIVE
      </div>
      {PREVIEW_LINES.slice(0, visibleLines).map((l, i) => (
        <div key={i} style={{ color: l.c }}>{l.t}</div>
      ))}
      <span style={{ color: '#00ff88', animation: 'cursor-blink 1s step-end infinite' }}>▊</span>
    </div>
  );
}

// ── CTA Button ────────────────────────────────────────────────────────────────
function StartButton({ onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ textAlign: 'center', position: 'relative', zIndex: 2, animation: 'fade-in 1s 1.5s both' }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding: '18px 60px',
          fontSize: '1rem',
          fontWeight: 900,
          fontFamily: 'monospace',
          letterSpacing: '0.2em',
          color: '#fff',
          background: hover
            ? 'linear-gradient(135deg, #ff3aff 0%, #00e5ff 100%)'
            : 'linear-gradient(135deg, #00c8ff 0%, #ff3aff 100%)',
          border: 'none',
          borderRadius: 14,
          cursor: 'pointer',
          transition: 'all 0.3s',
          boxShadow: hover
            ? '0 0 60px rgba(255,58,255,0.6), 0 0 120px rgba(0,229,255,0.3)'
            : '0 0 30px rgba(0,200,255,0.4), 0 0 60px rgba(255,58,255,0.2)',
          transform: hover ? 'scale(1.06)' : 'scale(1)',
          textShadow: '0 0 12px rgba(255,255,255,0.6)',
        }}
      >
        ▶ 开始调查
      </button>
      <div style={{ marginTop: 10, fontSize: '0.55rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.2em' }}>
        CONFIGURE YOUR AGENT TEAM FIRST
      </div>
    </div>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────────
export default function GameLanding({ onStart }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at 30% 20%, #0a0a2e 0%, #03060f 60%)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Matrix rain */}
      <MatrixRain color="#00e5ff" />
      <Scanlines />

      {/* Corner decorations */}
      {[
        { top: 0, left: 0, bT: '2px solid #ff3aff', bL: '2px solid #ff3aff', bTR: 0, bBL: 0 },
        { top: 0, right: 0, bT: '2px solid #00e5ff', bR: '2px solid #00e5ff', bTL: 0, bBR: 0 },
        { bottom: 0, left: 0, bB: '2px solid #00e5ff', bL: '2px solid #00e5ff' },
        { bottom: 0, right: 0, bB: '2px solid #ff3aff', bR: '2px solid #ff3aff' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'fixed', ...s, width: 50, height: 50, pointerEvents: 'none', zIndex: 10 }} />
      ))}

      {/* Top status bar */}
      <div style={{
        position: 'relative', zIndex: 2,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px',
        borderBottom: '1px solid rgba(0,229,255,0.1)',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        fontFamily: 'monospace', fontSize: '0.6rem',
      }}>
        <div style={{ color: 'rgba(0,229,255,0.6)', letterSpacing: '0.15em' }}>TERMINAL DETECTIVE · SYSTEM v2.1.57</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {['● ONLINE', '◈ SECURE', '⚡ READY'].map((s, i) => (
            <span key={i} style={{
              color: i === 0 ? '#00ff88' : i === 1 ? '#00e5ff' : '#ffaa00',
              animation: `badge-blink ${2 + i * 0.5}s ease-in-out infinite`,
            }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1, position: 'relative', zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        gap: 36,
      }}>
        <TitleLogo />
        <StatRow />
        <TerminalPreview />
        <StartButton onClick={onStart} />

        {/* Feature cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          width: '100%',
          maxWidth: 900,
          animation: 'fade-in 1s 1.8s both',
        }}>
          {FEATURE_CARDS.map((c, i) => (
            <FeatureCard key={i} {...c} delay={1.8 + i * 0.12} />
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'relative', zIndex: 2,
        textAlign: 'center', padding: '12px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        fontFamily: 'monospace', fontSize: '0.5rem',
        color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em',
      }}>
        MULTI·AGENT·INVESTIGATIVE·PLATFORM · POWERED BY NEURAL REASONING ENGINE
      </div>

      <style>{`
        @keyframes title-shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes badge-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}