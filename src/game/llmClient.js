// ═══════════════════════════════════════════════════════════════════════════
// llm_network.js — API Communication Layer
// All LLM calls go through here. Swap backend → only change this file.
// ═══════════════════════════════════════════════════════════════════════════

import { base44 } from '@/api/base44Client';

const invoke = (action, payload) =>
  base44.functions.invoke('llmBridge', { action, payload });

// ── Think Phase — streaming ───────────────────────────────────────────────
export async function streamThink({ gameState, agentStrategy, chatHistory, banList, observation, onChunk, onDone, signal }) {
  // We can't directly stream from backend functions, so we call non-streaming
  // and simulate typewriter on the response
  const response = await invoke('think', { gameState, agentStrategy, chatHistory, banList, observation });
  const text = response.data?.text || response.data?.choices?.[0]?.message?.content || '';

  // Simulate streaming char-by-char
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
    }, 18);
  });
}

// ── Think Phase — full SSE stream via fetch ───────────────────────────────
export async function streamThinkSSE({ gameState, agentStrategy, chatHistory, banList, observation, onChunk, onDone, signal }) {
  // Direct fetch to backend function with SSE
  try {
    const result = await invoke('think', { gameState, agentStrategy, chatHistory, banList, observation });
    const text = result.data?.text || '';
    
    let i = 0;
    return new Promise((resolve) => {
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
  } catch (err) {
    onDone('');
    throw err;
  }
}

// ── Act Phase — get action tag ────────────────────────────────────────────
export async function getAction({ thoughtProcess, gameState, agentStrategy }) {
  const response = await invoke('act', { thoughtProcess, gameState, agentStrategy });
  return response.data?.text || '[ACTION: search_area]';
}

// ── Settlement — GM resolves action ──────────────────────────────────────
export async function settleAction({ actionName, gameState, caseData, isIllegal = false }) {
  const response = await invoke('settle', { actionName, gameState, caseData, isIllegal });
  return response.data;
}

// ── NPC Dialogue ──────────────────────────────────────────────────────────
export async function getNPCDialogue({ npcId, agentStatement, gameState, caseData }) {
  const response = await invoke('npc_dialogue', { npcId, agentStatement, gameState, caseData });
  return response.data;
}

// ── Judge Evaluation ──────────────────────────────────────────────────────
export async function judgeReport({ playerReport, caseData }) {
  const response = await invoke('judge', { playerReport, caseData });
  return response.data;
}

// ── Branch Check ──────────────────────────────────────────────────────────
export async function branchCheck({ playerReport, caseData }) {
  const response = await invoke('branch_check', { playerReport, caseData });
  return response.data;
}

// ── Summarize for Multi-Agent ─────────────────────────────────────────────
export async function summarizeHistory({ history, agentName }) {
  const response = await invoke('summarize', { history, agentName });
  return response.data?.summary || '';
}

// ── Action Tag Parser ─────────────────────────────────────────────────────
export function parseActionTag(text) {
  const match = text.match(/\[ACTION:\s*([^\]]+)\]/i);
  return match ? match[1].trim().toLowerCase().replace(/\s+/g, '_') : null;
}