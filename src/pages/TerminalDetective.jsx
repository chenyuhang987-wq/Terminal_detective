import React, { useState } from 'react';
import AgentLobby from '@/components/game/AgentLobby';
import InvestigationTerminal from '@/components/game/InvestigationTerminal';
import GameLanding from '@/components/game/GameLanding';

export default function TerminalDetective() {
  const [screen, setScreen] = useState('LANDING');
  const [agentStrategy, setAgentStrategy] = useState(null);

  const handleDeploy = (strategy) => {
    setAgentStrategy(strategy);
    setScreen('GAME');
  };

  if (screen === 'LANDING') return <GameLanding onStart={() => setScreen('LOBBY')} />;
  if (screen === 'LOBBY')   return <AgentLobby onDeploy={handleDeploy} />;

  return (
    <InvestigationTerminal
      agentStrategy={agentStrategy}
      onGameEnd={() => setScreen('LANDING')}
      onBackToLobby={() => setScreen('LOBBY')}
    />
  );
}