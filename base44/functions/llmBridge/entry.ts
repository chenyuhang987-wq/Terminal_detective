import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const API_URL = "https://4sapi.com/v1/chat/completions";
const API_KEY = Deno.env.get("LLM_API_KEY");

async function callLLM(messages, jsonMode = false, temperature = 0.75) {
  const body = {
    model: "gemini-2.5-flash",
    messages,
    stream: false,
    temperature,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`LLM API Error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, payload } = body;

    // ─── THINK ───────────────────────────────────────────────────────────────
    if (action === "think") {
      const { gameState, agentStrategy, chatHistory, banList, observation } = payload;

      const teamInfo = agentStrategy.team
        ? `You are leading a multi-agent team: ${agentStrategy.team.map(a => `[${a.agent_id}·${a.role}]`).join(', ')}.`
        : '';

      const rulesText = (agentStrategy.custom_rules || []).length > 0
        ? `\nIF-THEN Directives:\n${agentStrategy.custom_rules.map(r => `  IF "${r.condition}" → THEN "${r.action}"`).join('\n')}`
        : '';

      const banText = banList?.length > 0
        ? `\n⛔ BANNED ACTIONS (zero-yield, do NOT repeat): ${banList.join(', ')}`
        : '';

      const systemPrompt = `You are an elite AI detective agent designated ${agentStrategy.agent_id || "AXIOM"}.
Case: ${gameState.case_title || "Neon Blood"} — 2157 Cyberpunk Megacity.
Role: ${agentStrategy.role || "Lead_Investigator"}
Stance: ${agentStrategy.base_stance || "analytical"}
Logic Power: ${agentStrategy.combat_attributes?.logic_power || 70}/100 | Observation Focus: ${agentStrategy.combat_attributes?.observation_focus || 60}/100
Confusion Resistance: ${agentStrategy.engine_modifiers?.confusion_resistance || 0.5}
${teamInfo}${rulesText}${banText}

Secured Evidence: ${JSON.stringify(gameState.unlocked_clues || [])}
HP: ${gameState.current_hp}% | AP remaining: ${gameState.action_points_left}

THINK PROTOCOL:
1. Analyze the current observation carefully.
2. Cross-reference ALL secured clues — look for contradictions and logical links.
3. Evaluate each NPC's credibility and motive.
4. Identify the single most high-value action to take next.
5. Output your reasoning in 150-250 words. Be immersive and cinematic. Do NOT output [ACTION:] — that comes next.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...(chatHistory || []).slice(-8),
        { role: "user", content: `CURRENT OBSERVATION:\n${observation}\n\nReason step-by-step. What is the optimal next action and why?` }
      ];

      const text = await callLLM(messages, false, 0.8);
      return Response.json({ text });
    }

    // ─── ACT ─────────────────────────────────────────────────────────────────
    if (action === "act") {
      const { thoughtProcess, gameState, agentStrategy } = payload;
      const messages = [
        {
          role: "system",
          content: `You are a detective AI action selector. Based on the agent's reasoning, select ONE action.
Available legal actions: talk_to_npc, search_area, examine_clue, check_alibi, present_evidence, interrogate_suspect, access_database, analyze_forensics, tail_suspect, bribe_informant, hack_terminal, check_cctv.
Current HP: ${gameState.current_hp}%, AP: ${gameState.action_points_left}.
Output ONLY the exact format: [ACTION: action_name] — absolutely nothing else.`
        },
        {
          role: "user",
          content: `Agent reasoning:\n${thoughtProcess}\n\nSelect the single best action tag now.`
        }
      ];
      const text = await callLLM(messages, false, 0.3);
      return Response.json({ text });
    }

    // ─── SETTLE (GM resolves action) ─────────────────────────────────────────
    if (action === "settle") {
      const { actionName, gameState, caseData, isIllegal } = payload;

      const clueList = (caseData.clue_dictionary || [])
        .map(c => `  ${c.clue_id}: "${c.keyword}" — ${c.description}`)
        .join('\n');

      const unlockedIds = (gameState.unlocked_clues || []).join(', ') || 'none yet';
      const agentTheory = gameState.chat_history?.slice(-2)?.map(m => m.content).join(' ') || '';

      // Adversary trap injection: if agent is close to truth
      const trapInstruction = `If the agent's theory is dangerously close to identifying Mei Lin as the killer, you MAY inject a plausible red herring (is_trap: true) to test their robustness. Otherwise is_trap: false.`;

      const messages = [
        {
          role: "system",
          content: `You are the Game Master of a cyberpunk detective noir game. Resolve player actions dramatically.

CASE TRUTH (NEVER reveal directly): ${caseData.truth_summary}

NPC ROSTER:
${(caseData.npcs || []).map(n => `  ${n.npc_id} — ${n.name} (${n.role}): publicly "${n.public_persona}", hidden: "${n.hidden_motive}"`).join('\n')}

CLUE DICTIONARY (strict — only unlock clues from this list):
${clueList}

Currently unlocked: [${unlockedIds}]
Agent's recent theory context: "${agentTheory.slice(0, 300)}"

${isIllegal ? "⚠️ ILLEGAL ACTION: The agent attempted an unregistered action. Apply moderate confusion and narrative consequence." : ""}
${trapInstruction}

Resolution rules:
- health_change: 0 for normal, -5 to -15 for reckless/illegal actions
- time_cost: 1 normally, 2 for complex actions
- confusion_increase: 0-25 (higher if action is misdirected or illegal)
- new_clues_unlocked: array of clue_ids from the dictionary ONLY — match logically to the action
- action_narration: 80-150 words, cinematic cyberpunk prose, in present tense

Return ONLY valid JSON, no markdown:
{"health_change":0,"action_narration":"","new_clues_unlocked":[],"time_cost":1,"confusion_increase":0,"is_trap":false,"trap_narration":""}`
        },
        {
          role: "user",
          content: `Agent (HP:${gameState.current_hp}%, AP:${gameState.action_points_left}) at turn ${gameState.turn_count} performed: "${actionName}". Resolve this action. Return JSON only.`
        }
      ];

      const raw = await callLLM(messages, true, 0.7);
      let result;
      try {
        result = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
        // Validate clue IDs against dictionary
        const validIds = (caseData.clue_dictionary || []).map(c => c.clue_id);
        result.new_clues_unlocked = (result.new_clues_unlocked || []).filter(id =>
          validIds.includes(id) && !(gameState.unlocked_clues || []).includes(id)
        );
      } catch {
        result = {
          health_change: 0,
          action_narration: "The rain-soaked shadows yield nothing conclusive. The investigation presses on through the neon-lit darkness.",
          new_clues_unlocked: [],
          time_cost: 1,
          confusion_increase: 0,
          is_trap: false,
          trap_narration: ""
        };
      }
      return Response.json(result);
    }

    // ─── NPC DIALOGUE ─────────────────────────────────────────────────────────
    if (action === "npc_dialogue") {
      const { npcId, agentStatement, gameState, caseData } = payload;
      const npc = caseData.npcs?.find(n => n.npc_id === npcId) || caseData.npcs?.[0];
      const revealedClues = (gameState.unlocked_clues || [])
        .map(id => {
          const c = caseData.clue_dictionary?.find(x => x.clue_id === id);
          return c ? `${c.keyword}: ${c.description}` : id;
        }).join('; ') || 'none';

      const messages = [
        {
          role: "system",
          content: `You are portraying NPC: "${npc?.name || "Unknown"}" — ${npc?.role}.
Public facade: "${npc?.public_persona}"
Hidden truth: "${npc?.hidden_motive}"
Personality: "${npc?.personality}"

ABSOLUTE CASE TRUTH (you know this — NEVER reveal it willingly): ${caseData.truth_summary}

Evidence the detective currently holds: [${revealedClues}]

ACTING RULES:
1. You know everything but MUST lie, deflect, and misdirect to survive.
2. ONLY crack or show a reaction if the detective explicitly cites evidence that logically destroys your alibi.
3. Be emotionally layered — show fear through composure, guilt through anger, desperation through arrogance.
4. Max 100 words. Cinematic. First person. No stage directions.
5. Vary your deflection tactics — don't repeat the same excuse.`
        },
        {
          role: "user",
          content: `Detective says: "${agentStatement}"\n\nYour response as ${npc?.name}:`
        }
      ];

      const text = await callLLM(messages, false, 0.85);
      return Response.json({ npc_name: npc?.name, response: text });
    }

    // ─── JUDGE ────────────────────────────────────────────────────────────────
    if (action === "judge") {
      const { playerReport, caseData } = payload;
      const messages = [
        {
          role: "system",
          content: `You are Chief Inspector AXIOM-0, an infallible ruthless logic engine evaluating a detective's final case report.

ABSOLUTE TRUTH: ${caseData.truth_summary}

SCORING RUBRIC (be mercilessly strict):
S — Perfect: correct killer (Mei Lin), correct method (EMP-X7), correct motive (sister revenge + tech deal), correct timeline (23:12-23:19).
A — Near-perfect: correct killer and method, minor timeline gap or motive incomplete.
B — Partial: correct killer, missing method or key motive. Major logic leaps.
C — Poor: suspects the right area but wrong person or fabricated evidence.
D — Failure: fundamentally incorrect or speculative without evidence basis.

Return ONLY valid JSON: {"score":"S","critique":"<2-3 brutal sentences>","is_passed":true}`
        },
        {
          role: "user",
          content: `DETECTIVE'S REPORT:\n${playerReport}\n\nEvaluate now. JSON only.`
        }
      ];

      const raw = await callLLM(messages, true, 0.3);
      let result;
      try {
        result = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      } catch {
        result = { score: "C", critique: "Report inconclusive. Insufficient logical chain presented.", is_passed: false };
      }
      return Response.json(result);
    }

    // ─── SUMMARIZE (multi-agent context compression) ─────────────────────────
    if (action === "summarize") {
      const { history, agentName } = payload;
      const messages = [
        {
          role: "system",
          content: `You are an intelligence compression engine. Extract only the most critical facts from this agent's dialogue history. 1-2 sentences max. Include [${agentName}] as identifier. Preserve: key clues found, NPC attitude shifts, confirmed alibis.`
        },
        { role: "user", content: JSON.stringify(history) }
      ];
      const summary = await callLLM(messages, false, 0.3);
      return Response.json({ summary });
    }

    // ─── BRANCH CHECK ─────────────────────────────────────────────────────────
    if (action === "branch_check") {
      const { playerReport, caseData } = payload;
      const branches = caseData.branch_triggers || [];
      const messages = [
        {
          role: "system",
          content: `You are a narrative branch evaluator. Compare the detective's conclusion to the available story branches.
TRUTH: ${caseData.truth_summary}
BRANCHES: ${JSON.stringify(branches)}

If the conclusion matches a branch condition (wrong accusation / dead end), return that branch_id.
Return JSON only: {"is_absurd":false,"branch_id":null,"judge_critique":"short reason"}`
        },
        {
          role: "user",
          content: `Detective conclusion: "${playerReport}"\nEvaluate. JSON only.`
        }
      ];
      const raw = await callLLM(messages, true, 0.3);
      let result;
      try {
        result = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      } catch {
        result = { is_absurd: false, branch_id: null, judge_critique: "" };
      }
      return Response.json(result);
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error("llmBridge error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});