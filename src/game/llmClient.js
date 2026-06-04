// ═══════════════════════════════════════════════════════════════════════════
// llmClient.js — Direct DeepSeek API Layer
// Calls DeepSeek API directly from the frontend.
// ═══════════════════════════════════════════════════════════════════════════

const DEEPSEEK_API_KEY = 'sk-e7468dd08962476686124d7e0467a732';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

async function deepseekChat(messages, options = {}) {
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: options.model || 'deepseek-chat',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 800,
      stream: false,
    }),
    signal: options.signal,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// ── Think Phase — streaming with typewriter ───────────────────────────────
export async function streamThink({ gameState, agentStrategy, chatHistory, banList, observation, onChunk, onDone, signal }) {
  const systemPrompt = buildSystemPrompt(agentStrategy);
  const userPrompt = buildThinkPrompt(gameState, observation, banList);

  const text = await deepseekChat([
    { role: 'system', content: systemPrompt },
    ...chatHistory.slice(-6),
    { role: 'user', content: userPrompt },
  ], { signal, max_tokens: 600 });

  let i = 0;
  return new Promise((resolve) => {
    if (signal?.aborted) { onDone(text); resolve(text); return; }
    const interval = setInterval(() => {
      if (signal?.aborted || i >= text.length) {
        clearInterval(interval);
        onDone(text);
        resolve(text);
        return;
      }
      onChunk(text[i]);
      i++;
    }, 15);
  });
}

export async function streamThinkSSE({ gameState, agentStrategy, chatHistory, banList, observation, onChunk, onDone, signal }) {
  return streamThink({ gameState, agentStrategy, chatHistory, banList, observation, onChunk, onDone, signal });
}

// ── Act Phase ─────────────────────────────────────────────────────────────
export async function getAction({ thoughtProcess, gameState, agentStrategy }) {
  const text = await deepseekChat([
    { role: 'system', content: 'You are a detective AI. Based on the thought process, output exactly one action tag in the format [ACTION: action_name]. Valid actions: talk_to_npc, search_area, examine_clue, check_alibi, present_evidence, interrogate_suspect, access_database, analyze_forensics, tail_suspect, bribe_informant, hack_terminal, check_cctv. Output ONLY the action tag, nothing else.' },
    { role: 'user', content: `Thought: ${thoughtProcess}\n\nCurrent clues: ${gameState.unlocked_clues?.join(', ') || 'none'}\nTurn: ${gameState.turn_count}\n\nOutput action tag:` },
  ], { max_tokens: 50, temperature: 0.3 });

  return text;
}

// ── Settlement — GM resolves action ──────────────────────────────────────
export async function settleAction({ actionName, gameState, caseData, isIllegal = false }) {
  const knownClues = (gameState.unlocked_clues || []).map(id => {
    const c = caseData.clue_dictionary?.find(x => x.clue_id === id);
    return c ? `${c.keyword}` : id;
  }).join(', ');

  const allClueIds = caseData.clue_dictionary?.map(c => c.clue_id) || [];
  const lockedClues = allClueIds.filter(id => !gameState.unlocked_clues?.includes(id));
  const randomNewClue = !isIllegal && Math.random() < 0.4 && lockedClues.length > 0
    ? lockedClues[Math.floor(Math.random() * lockedClues.length)]
    : null;

  const prompt = `You are the Game Master for a cyberpunk detective game. 
Case: ${caseData.title}
Scene: ${caseData.scene?.description || ''}
Action taken: ${actionName}
Known clues: ${knownClues || 'none'}
Turn: ${gameState.turn_count}
${isIllegal ? 'This action is ILLEGAL/invalid.' : ''}
${randomNewClue ? `Hint: Consider revealing clue related to: ${caseData.clue_dictionary?.find(c => c.clue_id === randomNewClue)?.keyword || randomNewClue}` : ''}

Write a 2-3 sentence atmospheric narration of what the detective discovers. Be specific to the cyberpunk setting. If the action is illegal, describe failure. Keep it under 120 words.`;

  const narration = await deepseekChat([
    { role: 'system', content: 'You are a cyberpunk noir Game Master. Be atmospheric, concise, and specific.' },
    { role: 'user', content: prompt },
  ], { max_tokens: 200, temperature: 0.8 });

  const confusionIncrease = isIllegal ? 8 : Math.floor(Math.random() * 6);
  const newClues = randomNewClue ? [randomNewClue] : [];

  return {
    action_narration: narration,
    new_clues: newClues,
    confusion_increase: confusionIncrease,
    ap_cost: isIllegal ? 2 : 1,
    is_trap: isIllegal && Math.random() < 0.3,
    trap_narration: isIllegal ? 'Invalid action triggered an adversarial response!' : null,
  };
}

// ── NPC Dialogue ──────────────────────────────────────────────────────────
export async function getNPCDialogue({ npcId, agentStatement, gameState, caseData }) {
  const npc = caseData.npcs?.find(n => n.npc_id === npcId);
  if (!npc) return { response: 'No response.', npc_name: 'Unknown' };

  const knownClues = (gameState.unlocked_clues || []).map(id => {
    const c = caseData.clue_dictionary?.find(x => x.clue_id === id);
    return c ? c.keyword : id;
  }).join(', ');

  const response = await deepseekChat([
    { role: 'system', content: `You are ${npc.name}, ${npc.role}. Personality: ${npc.personality}. Hidden motive: ${npc.hidden_motive}. Public persona: ${npc.public_persona}. Stay in character. Respond in 2-3 sentences. The detective knows: ${knownClues || 'nothing yet'}.` },
    { role: 'user', content: agentStatement },
  ], { max_tokens: 150, temperature: 0.85 });

  return { response, npc_name: npc.name };
}

// ── Judge Evaluation ──────────────────────────────────────────────────────
export async function judgeReport({ playerReport, caseData }) {
  const prompt = `You are a senior detective judge evaluating a case report.
Case truth: ${caseData.truth_summary}
Player's report: ${playerReport}

Evaluate the report. Return JSON only:
{"score": "S/A/B/C/D", "is_passed": true/false, "critique": "brief feedback under 80 words"}

Score guide: S=perfect, A=mostly correct, B=partially correct (pass threshold), C/D=wrong/missing key facts. B and above = passed.`;

  const text = await deepseekChat([
    { role: 'system', content: 'You are a detective judge. Return only valid JSON.' },
    { role: 'user', content: prompt },
  ], { max_tokens: 200, temperature: 0.3 });

  try {
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    return JSON.parse(json);
  } catch {
    return { score: 'C', is_passed: false, critique: 'Unable to evaluate report. Please try again.' };
  }
}

// ── Branch Check ──────────────────────────────────────────────────────────
export async function branchCheck({ playerReport, caseData }) {
  const branches = Object.entries(caseData.branches || {}).map(([id, b]) => `${id}: ${b.text.slice(0, 60)}`).join('\n');
  if (!branches) return { is_absurd: false };

  const text = await deepseekChat([
    { role: 'system', content: 'You are checking if a detective report triggers a wrong-accusation branch. Return JSON only: {"is_absurd": bool, "branch_id": "id or null"}' },
    { role: 'user', content: `Report: ${playerReport}\nBranch triggers:\n${Object.entries(caseData.branch_triggers || {}).map(([,v]) => v.condition_description).join('\n')}\nBranch IDs: ${Object.keys(caseData.branches || {}).join(', ')}\nReturn JSON:` },
  ], { max_tokens: 100, temperature: 0.2 });

  try {
    const json = text.match(/\{[\s\S]*\}/)?.[0];
    return JSON.parse(json);
  } catch {
    return { is_absurd: false };
  }
}

// ── Summarize ─────────────────────────────────────────────────────────────
export async function summarizeHistory({ history, agentName }) {
  const text = await deepseekChat([
    { role: 'system', content: `Summarize the investigation progress for agent ${agentName} in 2 sentences.` },
    { role: 'user', content: history.map(h => `${h.role}: ${h.content}`).join('\n') },
  ], { max_tokens: 100 });
  return text;
}

// ── Action Tag Parser ─────────────────────────────────────────────────────
export function parseActionTag(text) {
  const match = text.match(/\[ACTION:\s*([^\]]+)\]/i);
  return match ? match[1].trim().toLowerCase().replace(/\s+/g, '_') : null;
}

// ── Internal helpers ──────────────────────────────────────────────────────
function buildSystemPrompt(agentStrategy) {
  const agent = agentStrategy?.team?.[0] || agentStrategy;
  return `You are ${agent?.agent_id || 'AXIOM-7'}, an elite AI detective agent in a cyberpunk future.
Role: ${agent?.role || 'Lead Investigator'}
Stance: ${agent?.base_stance || 'analytical'}
Logic Power: ${agent?.combat_attributes?.logic_power || 70}/100
Observation Focus: ${agent?.combat_attributes?.observation_focus || 60}/100

You investigate crime scenes using the ReAct framework: Observe → Think → Act.
In your THINK phase, reason through clues, suspect motives, and logical connections.
Be concise, analytical, and stay in character as a cyberpunk detective AI.
Think in 3-5 sentences maximum.`;
}

function buildThinkPrompt(gameState, observation, banList) {
  const clueList = (gameState.unlocked_clues || []).join(', ') || 'none yet';
  const banned = (banList || []).join(', ') || 'none';
  return `OBSERVATION: ${observation}

Known clues: ${clueList}
Confusion level: ${gameState.confusion_score || 0}/100
Turn: ${gameState.turn_count || 1}
Banned actions: ${banned}

Analyze the situation and reason about what to investigate next. What logical connections exist? What action should be taken?`;
}