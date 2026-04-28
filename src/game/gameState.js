// ═══════════════════════════════════════════════════════════════════════════
// core_state.js — Single Source of Truth
// All game state lives here. No component may mutate state directly.
// ═══════════════════════════════════════════════════════════════════════════

import { Case_Data_Lvl_01, DEFAULT_AGENT_CONFIG } from './caseData';

// ── Initial State Factory ─────────────────────────────────────────────────
export function createInitialGameState(caseData = Case_Data_Lvl_01) {
  return {
    case_id: caseData.case_id,
    case_title: caseData.title,
    current_hp: 100,
    action_points_left: 20,
    unlocked_clues: [],
    current_zone: 'zone_datacenter',
    turn_count: 0,
    react_state: 'IDLE',
    confusion_score: 0,
    vision_penalty: 0,
    action_ban_list: [],
    chat_history: [],
    thought_log: [],
    last_observation: '',
    is_crashed: false,
    reputation: 100,
  };
}

// ── LocalStorage Manager ──────────────────────────────────────────────────
export const LocalStorage = {
  saveStrategy(payload) {
    localStorage.setItem('save_strategy_current', JSON.stringify(payload));
  },
  loadStrategy() {
    try {
      return JSON.parse(localStorage.getItem('save_strategy_current')) || { ...DEFAULT_AGENT_CONFIG };
    } catch { return { ...DEFAULT_AGENT_CONFIG }; }
  },
  saveTeamConfig(config) {
    localStorage.setItem('save_team_config', JSON.stringify(config));
  },
  loadTeamConfig() {
    try {
      return JSON.parse(localStorage.getItem('save_team_config')) || null;
    } catch { return null; }
  },
  saveCheckpoints(stack) {
    localStorage.setItem('save_checkpoints', JSON.stringify(stack));
  },
  loadCheckpoints() {
    try {
      return JSON.parse(localStorage.getItem('save_checkpoints')) || [];
    } catch { return []; }
  },
  clearAll() {
    localStorage.removeItem('save_strategy_current');
    localStorage.removeItem('save_team_config');
    localStorage.removeItem('save_checkpoints');
  }
};

// ── State Mutation Helpers ────────────────────────────────────────────────
export function applySettlementResult(state, settlement) {
  const newState = { ...state };
  newState.current_hp = Math.max(0, newState.current_hp + (settlement.health_change || 0));
  newState.action_points_left = Math.max(0, newState.action_points_left - (settlement.time_cost || 1));

  const newClues = (settlement.new_clues_unlocked || []).filter(id =>
    !newState.unlocked_clues.includes(id)
  );
  newState.unlocked_clues = [...newState.unlocked_clues, ...newClues];

  const confusionIncrease = Math.round(
    (settlement.confusion_increase || 0) * (1 - (state.agentStrategy?.engine_modifiers?.confusion_resistance || 0))
  );
  newState.confusion_score = Math.min(100, newState.confusion_score + confusionIncrease);

  // Zero-yield action tracking
  if (newClues.length === 0 && settlement.health_change === 0) {
    newState.action_ban_list = [state.lastAction, ...newState.action_ban_list].slice(0, 3);
  } else {
    newState.action_ban_list = [];
  }

  newState.turn_count = newState.turn_count + 1;
  return { newState, newClues };
}

// ── Observation Generator ─────────────────────────────────────────────────
export function generateObservation(gameState, caseData) {
  const zone = caseData.scene.zones[gameState.current_zone];
  const visibleNPCs = caseData.npcs.map(n => `${n.name} (${n.role})`).join(', ');
  const clueCount = gameState.unlocked_clues.length;
  const clueTotal = caseData.clue_dictionary.length;

  return `[SYSTEM SCAN — Turn ${gameState.turn_count + 1}]
📍 Current Location: ${zone?.label || gameState.current_zone}
👥 Persons of Interest: ${visibleNPCs}
🔍 Evidence Secured: ${clueCount}/${clueTotal} clues
💢 Confusion Level: ${gameState.confusion_score}% 
⚡ Action Points: ${gameState.action_points_left}/20
❤️ System Integrity: ${gameState.current_hp}%
${gameState.action_ban_list.length > 0 ? `⛔ Recent Failed Actions: ${gameState.action_ban_list.join(', ')}` : ''}

Unlocked clues: ${gameState.unlocked_clues.length > 0 
  ? gameState.unlocked_clues.map(id => {
      const clue = caseData.clue_dictionary.find(c => c.clue_id === id);
      return clue ? `${clue.visual_icon} ${clue.keyword}` : id;
    }).join(' | ')
  : 'None yet. Begin investigation.'}`;
}