import React, { useState, useEffect } from 'react';
import AgentLobby from '@/components/game/AgentLobby';
import InvestigationTerminal from '@/components/game/InvestigationTerminal';

const SCREENS = {
  SPLASH: 'SPLASH',
  LOBBY: 'LOBBY',
  GAME: 'GAME',
};

export default function TerminalDetective() {
  const [screen, setScreen] = useState(SCREENS.SPLASH);
  const [agentStrategy, setAgentStrategy] = useState(null);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleDeploy = (strategy) => {
    setAgentStrategy(strategy);
    setScreen(SCREENS.GAME);
  };

  if (screen === SCREENS.SPLASH) {
    return <SplashScreen onEnter={() => setScreen(SCREENS.LOBBY)} ready={splashDone} />;
  }

  if (screen === SCREENS.LOBBY) {
    return <AgentLobby onDeploy={handleDeploy} />;
  }

  return (
    <InvestigationTerminal
      agentStrategy={agentStrategy}
      onGameEnd={() => setScreen(SCREENS.LOBBY)}
      onBackToLobby={() => setScreen(SCREENS.LOBBY)}
    />
  );
}

function SplashScreen({ onEnter, ready }) {
  const [lines, setLines] = useState([]);
  const bootSequence = [
    '> INITIALIZING TERMINAL DETECTIVE SYSTEM...',
    '> Loading case database: [████████████] 100%',
    '> LLM Bridge established. Gemini online.',
    '> ReAct Engine v2.1: READY',
    '> Agent deployment chamber: READY',
    '',
    '> ALL SYSTEMS NOMINAL.',
    '> AWAITING ARCHITECT INPUT...',
  ];

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < bootSequence.length) {
        setLines(prev => [...prev, bootSequence[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 220);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 50% 0%, #0b1a30 0%, #070d1d 55%, #03060f 100%)',
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* Star particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => {
          const colors = ['#ff3aff','#00e5ff','#a3ff47','#ffe600','#ff3860','#ffffff'];
          const c = colors[i % colors.length];
          return (
            <div key={i} className="absolute rounded-full"
              style={{
                left: `${(i * 7.3 + 11) % 100}%`,
                top: `${(i * 13.7 + 5) % 100}%`,
                width: 2 + (i % 3),
                height: 2 + (i % 3),
                backgroundColor: c,
                boxShadow: `0 0 ${4 + (i % 4)}px ${c}`,
                animation: `star-sp-twinkle ${3 + (i % 4)}s ${(i * 0.3) % 5}s ease-in-out infinite alternate`,
              }} />
          );
        })}
        <style>{`
          @keyframes star-sp-twinkle {
            from { opacity: 0.15; } to { opacity: 0.85; }
          }
          @keyframes scan-sp {
            0% { top: -2px; } 100% { top: 100%; }
          }
        `}</style>
      </div>

      {/* Scan beam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute left-0 right-0 h-px opacity-20"
          style={{ backgroundColor: '#00e5ff', boxShadow: '0 0 16px #00e5ff', animation: 'scan-sp 5s linear infinite' }} />
      </div>

      <div className="relative z-10 max-w-xl w-full text-center">
        {/* Magnifying glass */}
        <div className="flex justify-center mb-6">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="32" cy="32" r="22" fill="none" stroke="#00e5ff" strokeWidth="3"
              style={{ filter: 'drop-shadow(0 0 8px #00e5ff)' }} />
            <text x="32" y="39" textAnchor="middle" fontSize="20" fill="#00e5ff"
              style={{ filter: 'drop-shadow(0 0 6px #00e5ff)' }}>?</text>
            <line x1="48" y1="48" x2="68" y2="70" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 8px #00e5ff)' }} />
            <path d="M 18 20 A 28 28 0 0 1 50 16" fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="4 4" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="font-black tracking-[0.18em] leading-none mb-3"
          style={{
            fontSize: 'clamp(2.2rem, 7vw, 3.8rem)',
            color: '#ff3aff',
            textShadow: '0 0 10px #ff3aff, 0 0 30px #ff3aff80, 0 0 60px #ff3aff30, 0 0 2px #fff',
            letterSpacing: '0.18em',
          }}>
          TERMINAL&nbsp;&nbsp;DETECTIVE
        </h1>
        <div className="tracking-[0.55em] text-xs font-light mb-8"
          style={{ color: 'rgba(200,230,255,0.45)', letterSpacing: '0.5em' }}>
          LOGIC&nbsp;&nbsp;ARCHITECT
        </div>

        {/* Boot log */}
        <div className="text-left p-4 rounded-xl border mb-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', borderColor: '#00e5ff18', minHeight: 160 }}>
          {lines.map((line, i) => (
            <div key={i} className="text-xs leading-6" style={{
              color: line && (line.includes('NOMINAL') || line.includes('READY')) ? '#00ff88'
                : !line ? 'transparent' : '#00e5ff70',
              fontFamily: 'monospace',
            }}>
              {line || '\u00A0'}
            </div>
          ))}
          {!ready && <span className="animate-pulse" style={{ color: '#00e5ff' }}>▊</span>}
        </div>

        {ready && (
          <button onClick={onEnter}
            className="px-12 py-4 text-sm font-bold tracking-[0.25em] rounded-xl border-2 transition-all hover:scale-105 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00c8ff 0%, #ff3aff 100%)',
              border: 'none',
              color: '#fff',
              boxShadow: '0 0 30px rgba(0,200,255,0.4), 0 0 60px rgba(255,58,255,0.2)',
              textShadow: '0 0 10px rgba(255,255,255,0.5)',
            }}>
            ▶ ENTER SYSTEM
          </button>
        )}

        <div className="mt-5 text-xs opacity-25" style={{ color: '#00e5ff' }}>
          YOU ARE THE ARCHITECT · BUILD THE DETECTIVE · SOLVE THE CASE
        </div>
      </div>
    </div>
  );
}