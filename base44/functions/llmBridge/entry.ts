import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const API_URL = "https://4sapi.com/v1/chat/completions";
const API_KEY = Deno.env.get("LLM_API_KEY");

async function callLLM(messages, stream = false, jsonMode = false) {
  const body = {
    model: "gemini-2.5-flash",
    messages,
    stream,
    temperature: 0.7,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

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

  return response;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, payload } = body;

    // ─── ACTION: think ───────────────────────────────────────────────────────
    if (action === "think") {
      const { gameState, agentStrategy, chatHistory, banList, observation } = payload;

      const systemPrompt = `You are a detective AI agent named ${agentStrategy.agent_id || "AXIOM"}.
Case: ${gameState.case_title || "Neon Blood"}
Your role: ${agentStrategy.role || "Lead_Investigator"}
Base stance: ${agentStrategy.base_stance || "analytical"}
Logic Power: ${agentStrategy.combat_attributes?.logic_power || 70}/100
Observation Focus: ${agentStrategy.combat_attributes?.observation_focus || 60}/100
Unlocked clues: ${JSON.stringify(gameState.unlocked_clues || [])}
Current HP: ${gameState.current_hp}/100, AP: ${gameState.action_points_left}
Custom IF-THEN rules: ${JSON.stringify(agentStrategy.custom_rules || [])}
${banList && banList.length > 0 ? `⛔ BANNED ACTIONS: ${banList.join(', ')}` : ''}

Think step by step. Be immersive. Do NOT output [ACTION:] tag. Just reason clearly in 150-250 words.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...(chatHistory || []).slice(-6),
        { role: "user", content: `OBSERVATION:\n${observation}\n\nReason step-by-step about the best next action.` }
      ];

      const llmResponse = await callLLM(messages, false, false);
      const data = await llmResponse.json();
      const text = data.choices[0]?.message?.content || "Analyzing the situation...";
      return Response.json({ text });
    }

    // ─── ACTION: act (get single action tag) ─────────────────────────────────
    if (action === "act") {
      const { thoughtProcess, gameState, agentStrategy } = payload;
      const messages = [
        {
          role: "system",
          content: `You are a detective AI. Based on your reasoning, you must choose exactly ONE action.
Legal actions available: talk_to_npc, search_area, examine_clue, check_alibi, present_evidence, interrogate_suspect, access_database, analyze_forensics, tail_suspect, bribe_informant, hack_terminal, check_cctv.
Output ONLY this exact format, nothing else: [ACTION: action_name]`
        },
        {
          role: "user",
          content: `Your reasoning was:\n${thoughtProcess}\n\nNow output your single action tag.`
        }
      ];

      const llmResponse = await callLLM(messages, false, false);
      const data = await llmResponse.json();
      const text = data.choices[0]?.message?.content || "[ACTION: search_area]";
      return Response.json({ text });
    }

    // ─── ACTION: settle (GM resolves action) ─────────────────────────────────
    if (action === "settle") {
      const { actionName, gameState, caseData, isIllegal } = payload;
      const messages = [
        {
          role: "system",
          content: `You are the Game Master of a cyberpunk detective game.
Case truth: ${caseData.truth_summary}
NPCs: ${JSON.stringify((caseData.npcs || []).map(n => ({ id: n.npc_id, name: n.name, role: n.role })))}
Clue IDs available: ${JSON.stringify((caseData.clue_dictionary || []).map(c => c.clue_id))}
${isIllegal ? "⚠️ This was an ILLEGAL/UNREGISTERED action." : ""}

Respond with valid JSON ONLY. No markdown, no code fences. Exact schema:
{"health_change":0,"action_narration":"text","new_clues_unlocked":[],"time_cost":1,"confusion_increase":0,"is_trap":false,"trap_narration":""}`
        },
        {
          role: "user",
          content: `The detective (HP:${gameState.current_hp}, AP:${gameState.action_points_left}) attempted: "${actionName}". Resolve this action as GM. Return JSON only.`
        }
      ];

      const llmResponse = await callLLM(messages, false, true);
      const data = await llmResponse.json();
      let result;
      try {
        let raw = data.choices[0]?.message?.content || "{}";
        // Strip markdown code fences if present
        raw = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        result = JSON.parse(raw);
      } catch {
        result = {
          health_change: 0,
          action_narration: "The shadows yield no secrets this time. The investigation continues.",
          new_clues_unlocked: [],
          time_cost: 1,
          confusion_increase: 0,
          is_trap: false,
          trap_narration: ""
        };
      }
      return Response.json(result);
    }

    // ─── ACTION: npc_dialogue (NPC responds to agent) ────────────────────────
    if (action === "npc_dialogue") {
      const { npcId, agentStatement, gameState, caseData } = payload;
      const npc = caseData.npcs?.find(n => n.npc_id === npcId) || caseData.npcs?.[0];
      const revealedClues = gameState.unlocked_clues || [];

      const messages = [
        {
          role: "system",
          content: `You are playing the NPC character "${npc?.name || "Unknown"}" (${npc?.public_persona || "witness"}).
ABSOLUTE TRUTH (you know this but MUST hide it): ${caseData.truth_summary}
Your hidden motive: ${npc?.hidden_motive || "unknown"}
Your personality: ${npc?.personality || "defensive and evasive"}

Clues the detective has revealed: ${JSON.stringify(revealedClues)}

CRITICAL RULES:
1. You KNOW the truth but MUST lie, deflect, and misdirect to protect yourself.
2. You can ONLY crack or reveal info if the detective explicitly cites evidence from their revealed clues that directly shatters your alibi.
3. React dramatically. Show fear, anger, or smugness as appropriate.
4. Keep response under 120 words. Be cinematic and tense.
5. Speak in first person as the character.`
        },
        {
          role: "user",
          content: `The detective says: "${agentStatement}"\n\nRespond in character:`
        }
      ];

      const llmResponse = await callLLM(messages, false, false);
      const data = await llmResponse.json();
      const text = data.choices[0]?.message?.content || "...";
      return Response.json({ npc_name: npc?.name, response: text });
    }

    // ─── ACTION: judge (evaluate final report) ───────────────────────────────
    if (action === "judge") {
      const { playerReport, caseData } = payload;
      const messages = [
        {
          role: "system",
          content: `You are a ruthless, strictly logical Chief Inspector evaluating a case report.
ABSOLUTE TRUTH: ${caseData.truth_summary}

Judge criteria:
- S: Perfect logical chain, correct murderer, motive, method, and timeline.
- A: Mostly correct with minor gaps.
- B: Correct suspect but missing key evidence or motive.
- C: Partially correct, major logical leaps.
- D: Fundamentally wrong.

Be extremely strict. Return valid JSON only:
{"score": "S/A/B/C/D", "critique": "<2-3 sentences of brutal honest feedback>", "is_passed": <boolean, true if S or A>}`
        },
        {
          role: "user",
          content: `DETECTIVE'S REPORT:\n${playerReport}`
        }
      ];

      const llmResponse = await callLLM(messages, false, true);
      const data = await llmResponse.json();
      let result;
      try {
        let raw = data.choices[0]?.message?.content || "{}";
        raw = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
        result = JSON.parse(raw);
      } catch {
        result = { score: "C", critique: "Report inconclusive. Try again.", is_passed: false };
      }
      return Response.json(result);
    }

    // ─── ACTION: summarize (multi-agent context compression) ─────────────────
    if (action === "summarize") {
      const { history, agentName } = payload;
      const messages = [
        {
          role: "system",
          content: `You are an intelligence officer. Compress the following dialogue into 1-2 core factual sentences. Preserve key evidence and NPC attitudes. Include [${agentName}] as identifier.`
        },
        { role: "user", content: JSON.stringify(history) }
      ];

      const llmResponse = await callLLM(messages, false, false);
      const data = await llmResponse.json();
      const summary = data.choices[0]?.message?.content || "";
      return Response.json({ summary });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error("llmBridge error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});