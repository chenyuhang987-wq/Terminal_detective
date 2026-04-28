import React, { useState } from 'react';
import AgentLobby from '@/components/game/AgentLobby';
import InvestigationTerminal from '@/components/game/InvestigationTerminal';

export default function TerminalDetective() {
  const [screen, setScreen] = useState('LOBBY');
  const [agentStrategy, setAgentStrategy] = useState(null);

  const handleDeploy = (strategy) => {
    setAgentStrategy(strategy);
    setScreen('GAME');
  };

  if (screen === 'LOBBY') {
    return <AgentLobby onDeploy={handleDeploy} />;
  }

  return (
    <InvestigationTerminal
      agentStrategy={agentStrategy}
      onGameEnd={() => setScreen('LOBBY')}
      onBackToLobby={() => setScreen('LOBBY')}
    />
  );
}