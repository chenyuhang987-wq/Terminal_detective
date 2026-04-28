import React, { useState } from 'react';
import AgentLobby from '@/components/game/AgentLobby';
import InvestigationTerminal from '@/components/game/InvestigationTerminal';
import GameLanding from '@/components/game/GameLanding';
import CaseSelect from '@/components/game/CaseSelect';

export default function TerminalDetective() {
  const [screen, setScreen] = useState('LANDING');
  const [agentStrategy, setAgentStrategy] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);

  const handleDeploy = (strategy) => {
    setAgentStrategy(strategy);
    setScreen('CASE_SELECT');
  };

  const handleCaseSelect = (caseData) => {
    setSelectedCase(caseData);
    setScreen('GAME');
  };

  if (screen === 'LANDING')     return <GameLanding onStart={() => setScreen('LOBBY')} />;
  if (screen === 'LOBBY')       return <AgentLobby onDeploy={handleDeploy} />;
  if (screen === 'CASE_SELECT') return (
    <CaseSelect
      onSelect={handleCaseSelect}
      onBack={() => setScreen('LOBBY')}
    />
  );

  return (
    <InvestigationTerminal
      agentStrategy={agentStrategy}
      selectedCase={selectedCase}
      onGameEnd={() => setScreen('LANDING')}
      onBackToLobby={() => setScreen('LOBBY')}
    />
  );
}