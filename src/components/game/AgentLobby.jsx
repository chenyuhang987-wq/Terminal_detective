import React from 'react';
import MultiAgentConsole from '@/components/game/MultiAgentConsole';

export default function AgentLobby({ onDeploy }) {
  return <MultiAgentConsole onDeploy={onDeploy} />;
}