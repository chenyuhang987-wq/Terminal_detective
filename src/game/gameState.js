// ═══════════════════════════════════════════════════════════════════════════
// core_state.js — Single Source of Truth
// All game state lives here. No component may mutate state directly.
// ═══════════════════════════════════════════════════════════════════════════

import { DEFAULT_AGENT_CONFIG } from './caseData';

// ── Initial State Factory ─────────────────────────────────────────────────
export function createInitialGameState(caseData) {
  return {
    case_id: caseData.case_id,
    case_title: caseData.title,
    current_hp: 100,
    action_points_left: 20,
    unlocked_clues: [],
    unlocked_clues_set: new Set(), // fast lookup
    current_zone: 'zone_datacenter',
    turn_count: 0,
    react_state: 'IDLE',
    confusion_score: 0,
    vision_penalty: 0,
    action_ban_list: [],
    chat_history: [],
    thought_log: [],
    last_observation: '',
    last_action: null,
    is_crashed: false,
    reputation: 100,
    checkpoint_stack: [],
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
    try {
      // store only last 3 checkpoints to avoid quota issues
      localStorage.setItem('save_checkpoints', JSON.stringify(stack.slice(-3)));
    } catch {}
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

// ── Checkpoint Manager ────────────────────────────────────────────────────
export function pushCheckpoint(state) {
  // Deep-clone safe snapshot (exclude non-serializable Set)
  const snap = JSON.parse(JSON.stringify({ ...state, unlocked_clues_set: undefined }));
  const stack = [...(state.checkpoint_stack || []), snap].slice(-3);
  LocalStorage.saveCheckpoints(stack);
  return stack;
}

export function popCheckpoint(state) {
  const stack = [...(state.checkpoint_stack || [])];
  if (stack.length === 0) return null;
  const snap = stack.pop();
  snap.checkpoint_stack = stack;
  snap.unlocked_clues_set = new Set(snap.unlocked_clues || []);
  return snap;
}

// ── State Mutation Helper ─────────────────────────────────────────────────
export function applySettlementResult(state, settlement, agentStrategy) {
  const newState = { ...state };

  // HP change
  newState.current_hp = Math.max(0, Math.min(100,
    newState.current_hp + (settlement.health_change || 0)
  ));

  // AP cost — apply discount from agent modifier
  const apDiscount = agentStrategy?.engine_modifiers?.ap_cost_discount || 0;
  const apCost = Math.max(1, Math.round((settlement.time_cost || 1) * (1 - apDiscount)));
  newState.action_points_left = Math.max(0, newState.action_points_left - apCost);

  // New clues — strict ID validation
  const newClues = (settlement.new_clues_unlocked || []).filter(id =>
    id && !newState.unlocked_clues.includes(id)
  );
  newState.unlocked_clues = [...newState.unlocked_clues, ...newClues];
  newState.unlocked_clues_set = new Set(newState.unlocked_clues);

  // Confusion — apply confusion_resistance modifier
  const resistance = agentStrategy?.engine_modifiers?.confusion_resistance || 0;
  const baseConfusion = settlement.confusion_increase || 0;
  const actualConfusion = Math.round(baseConfusion * (1 - resistance));
  newState.confusion_score = Math.min(100, newState.confusion_score + actualConfusion);

  // Conflict dictionary check — extra confusion if mutually exclusive clues both held
  // (checked here locally so no extra API call)
  // (handled in InvestigationTerminal via caseData.conflict_dictionary)

  // Zero-yield action ban list tracking
  const isZeroYield = newClues.length === 0 && (settlement.health_change || 0) === 0;
  if (isZeroYield) {
    // Push current action to ban list, keep max 3
    const banned = [newState.last_action, ...(newState.action_ban_list || [])].filter(Boolean);
    newState.action_ban_list = [...new Set(banned)].slice(0, 3);
    // Extra confusion penalty for consecutive zero-yield
    if (newState.action_ban_list.length >= 2) {
      newState.confusion_score = Math.min(100, newState.confusion_score + 10);
    }
  } else {
    newState.action_ban_list = [];
  }

  // Reputation update
  if (settlement.is_trap) {
    newState.reputation = Math.max(0, newState.reputation - 5);
  }

  newState.turn_count = newState.turn_count + 1;

  return { newState, newClues };
}

// ── Observation Generator ─────────────────────────────────────────────────
export function generateObservation(gameState, caseData) {
  const zone = caseData.scene.zones[gameState.current_zone];
  const clueCount = gameState.unlocked_clues.length;
  const clueTotal = caseData.clue_dictionary.length;

  const npcList = caseData.npcs.map(n => `${n.avatar} ${n.name} [${n.role}]`).join(' | ');

  const clueDetails = gameState.unlocked_clues.length > 0
    ? gameState.unlocked_clues.map(id => {
        const c = caseData.clue_dictionary.find(x => x.clue_id === id);
        return c ? `  ${c.visual_icon} [${c.clue_id}] ${c.keyword}: ${c.description}` : `  ${id}`;
      }).join('\n')
    : '  None secured. Begin investigation.';

  const bannedText = gameState.action_ban_list?.length > 0
    ? `⛔ ZERO-YIELD (ban): ${gameState.action_ban_list.join(', ')}`
    : '';

  const confusionWarning = gameState.confusion_score >= 60
    ? `⚠️  WARNING: Logic matrix destabilizing at ${gameState.confusion_score}% — agent coherence at risk!`
    : '';

  return `╔══ SYSTEM SCAN · TURN ${gameState.turn_count + 1} ══╗
📍 Location : ${zone?.label || gameState.current_zone}
👥 Contacts : ${npcList}
🔍 Evidence : ${clueCount}/${clueTotal} secured
💢 Confusion: ${gameState.confusion_score}%  ❤️ HP: ${gameState.current_hp}%  ⚡ AP: ${gameState.action_points_left}/20
🏆 Reputation: ${gameState.reputation}pts
${bannedText}
${confusionWarning}

── SECURED EVIDENCE ──
${clueDetails}
╚══════════════════════╝`;
}

// ── Conflict Dictionary Checker ───────────────────────────────────────────
// Returns true if current unlocked clues contain mutually exclusive pairs
export function checkConflictClues(unlockedClues, conflictDictionary) {
  if (!conflictDictionary?.length) return false;
  const ids = new Set(unlockedClues);
  return conflictDictionary.some(c => ids.has(c.clue_A) && ids.has(c.clue_B));
}