import React, { useState, useEffect } from 'react';
import AgentLobby from '../src/components/game/AgentLobby';
import InvestigationTerminal from '../src/components/game/InvestigationTerminal';
import { LocalStorage } from '../src/game/gameState';

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
    const timer = setTimeout(() => setSplashDone(true), 3200);
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
    '> Connecting to 4SAPI neural network...',
    '> LLM Bridge established. Gemini online.',
    '> Mounting ReAct Engine v2.1...',
    '> Evidence board WebGL context: READY',
    '> Encryption protocols: ACTIVE',
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
    }, 260);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at center, #050a1a 0%, #000 100%)',
        fontFamily: "'Courier New', monospace",
      }}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute border-r border-cyan-500"
            style={{ left: `${i * 5}%`, top: 0, bottom: 0, opacity: 0.3 }} />
        ))}
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="absolute border-b border-cyan-500"
            style={{ top: `${i * 5}%`, left: 0, right: 0, opacity: 0.3 }} />
        ))}
      </div>

      {/* Scanning beam */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute left-0 right-0 h-px opacity-30"
          style={{
            backgroundColor: '#00ffff',
            boxShadow: '0 0 20px #00ffff',
            animation: 'scanBeam 4s linear infinite',
          }}
        />
      </div>

      <div className="relative z-10 max-w-2xl w-full text-center">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-xs tracking-[0.5em] mb-4 opacity-60" style={{ color: '#00ffff' }}>
            ◈ CLASSIFIED SYSTEM ◈
          </div>
          <h1
            className="text-5xl md:text-7xl font-black tracking-widest mb-2"
            style={{
              color: '#00ffff',
              textShadow: '0 0 30px #00ffff, 0 0 60px #00ffff40, 0 0 100px #00ffff20',
              letterSpacing: '0.15em',
            }}
          >
            TERMINAL
          </h1>
          <h1
            className="text-5xl md:text-7xl font-black tracking-widest"
            style={{
              color: '#ff3860',
              textShadow: '0 0 30px #ff3860, 0 0 60px #ff386040',
              letterSpacing: '0.15em',
            }}
          >
            DETECTIVE
          </h1>
          <div className="text-xs tracking-[0.3em] mt-4 opacity-60" style={{ color: '#bf5fff' }}>
            逻辑架构师 · LOGIC ARCHITECT · v2.1.57
          </div>
        </div>

        {/* Boot terminal */}
        <div
          className="text-left p-4 rounded-lg border mb-8 min-h-[220px]"
          style={{
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderColor: '#00ffff20',
            boxShadow: 'inset 0 0 30px rgba(0,255,255,0.05)',
          }}
        >
          {lines.map((line, i) => (
            <div
              key={i}
              className="text-xs leading-6"
              style={{
                color: line.includes('NOMINAL') || line.includes('READY') ? '#00ff88'
                  : line.includes('ERROR') ? '#ff3860'
                  : line === '' ? 'transparent'
                  : '#00ffff80',
                fontFamily: 'monospace',
              }}
            >
              {line || '\u00A0'}
            </div>
          ))}
          {!ready && (
            <span className="animate-pulse" style={{ color: '#00ffff' }}>▊</span>
          )}
        </div>

        {/* Enter button */}
        {ready && (
          <button
            onClick={onEnter}
            className="px-12 py-4 text-sm font-bold tracking-[0.3em] rounded-lg border-2 transition-all hover:scale-105 active:scale-95"
            style={{
              borderColor: '#00ffff',
              color: '#00ffff',
              backgroundColor: 'rgba(0,255,255,0.1)',
              boxShadow: '0 0 30px rgba(0,255,255,0.3), inset 0 0 20px rgba(0,255,255,0.05)',
              textShadow: '0 0 10px #00ffff',
              animation: 'pulseBtn 2s ease-in-out infinite',
            }}
          >
            ▶ ENTER SYSTEM
          </button>
        )}

        <div className="mt-6 text-xs opacity-30" style={{ color: '#00ffff' }}>
          YOU ARE THE ARCHITECT · BUILD THE DETECTIVE · SOLVE THE CASE
        </div>
      </div>

      <style>{`
        @keyframes scanBeam {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes pulseBtn {
          0%, 100% { box-shadow: 0 0 30px rgba(0,255,255,0.3), inset 0 0 20px rgba(0,255,255,0.05); }
          50% { box-shadow: 0 0 50px rgba(0,255,255,0.6), inset 0 0 30px rgba(0,255,255,0.1); }
        }
        @keyframes glitchLine {
          0% { transform: translateX(0); opacity: 1; }
          50% { transform: translateX(${Math.random() * 10}px); }
          100% { transform: translateX(0); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}