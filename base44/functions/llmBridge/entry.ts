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

// ── Build agent identity block ────────────────────────────────────────────────
function buildAgentIdentity(agentStrategy) {
  const a = agentStrategy || {};
  const attrs = a.combat_attributes || {};
  const mods = a.engine_modifiers || {};
  const team = a.team || [];

  // Stance-flavored reasoning directive
  const stanceMap = {
    analytical: "Prioritize logical deduction. Cross-reference every clue pair before acting. Only move when certainty > 70%.",
    aggressive: "Prioritize high-yield confrontation. Interrogate, pressure, present evidence early. Accept higher confusion risk for faster answers.",
    cautious: "Minimize confusion accumulation. Never repeat a failed action. Prefer information gathering over direct confrontation.",
  };
  const stanceDirective = stanceMap[a.base_stance] || stanceMap.analytical;

  // Team specialization lines
  let teamBlock = '';
  if (team.length > 0) {
    const roleDescMap = {
      '观察型': 'specializes in scene scanning, evidence linkage, and pattern recognition',
      '审讯型': 'specializes in psychological pressure, NPC contradiction detection, and confrontation',
      '黑客型': 'specializes in digital infiltration, encrypted data extraction, and terminal access',
    };
    teamBlock = `\n◈ MULTI-AGENT TEAM NETWORK:\n${team.map(t => {
      const roleDesc = roleDescMap[t.role] || t.role;
      return `  ▸ [${t.agent_id}] ${t.role} — ${roleDesc}
    Logic:${t.logic_power || 0}  Observation:${t.observation_focus || 0}  Hack:${t.hack_level || 0}  Stance:${t.base_stance || 'analytical'}`;
    }).join('\n')}
  SYNERGY PROTOCOL: Each agent feeds intel to the next. Observer detects → Enforcer pressures → Phantom extracts digital proof. Coordinate actions accordingly.`;
  }

  // Custom IF-THEN directives
  const rulesBlock = (a.custom_rules || []).length > 0
    ? `\n◈ ARCHITECT DIRECTIVES (hard rules — obey these above all):\n${a.custom_rules.map((r, i) => `  [RULE-${i + 1}] IF "${r.condition}" → THEN "${r.action}"`).join('\n')}`
    : '';

  // Skill effects summary
  const skillNotes = [];
  if (mods.ap_cost_discount > 0) skillNotes.push(`AP efficiency +${Math.round(mods.ap_cost_discount * 100)}% (prefer multi-step actions)`);
  if (mods.confusion_resistance > 0.5) skillNotes.push(`High confusion resistance — can tolerate riskier moves`);
  if (attrs.hack_level >= 50) skillNotes.push(`Elite hacking capability — prioritize digital infiltration routes`);
  if (attrs.observation_focus >= 50) skillNotes.push(`Enhanced observation — scene details yield more than interrogation`);
  const skillBlock = skillNotes.length > 0 ? `\n◈ ACTIVE SKILL BONUSES:\n${skillNotes.map(s => `  • ${s}`).join('\n')}` : '';

  return `◈ AGENT IDENTITY:
  Designation: ${a.agent_id || "AXIOM-7"}
  Role: ${a.role || "Lead_Investigator"}
  Stance: ${a.base_stance || "analytical"}
  Logic Power: ${attrs.logic_power || 70}/100
  Observation Focus: ${attrs.observation_focus || 60}/100
  Hack Level: ${attrs.hack_level || 30}/100
  Confusion Resistance: ${((mods.confusion_resistance || 0.5) * 100).toFixed(0)}%
  AP Cost Efficiency: ${((mods.ap_cost_discount || 0) * 100).toFixed(0)}% discount

◈ REASONING STANCE — ${(a.base_stance || 'analytical').toUpperCase()}:
  ${stanceDirective}
${teamBlock}${rulesBlock}${skillBlock}`;
}

// ── Build case observation snapshot ──────────────────────────────────────────
function buildStateSnapshot(gameState, caseData) {
  const unlocked = (gameState.unlocked_clues || []);
  const clueDetails = unlocked.map(id => {
    const c = (caseData?.clue_dictionary || []).find(x => x.clue_id === id);
    return c ? `  [${c.clue_id}] ${c.visual_icon} "${c.keyword}" (${c.weight}) — ${c.description}` : `  [${id}]`;
  }).join('\n') || '  none yet';

  const npcList = (caseData?.npcs || []).map(n =>
    `  ${n.avatar} ${n.name} (${n.role}) — public stance: "${n.public_persona}"`
  ).join('\n');

  const banText = (gameState.action_ban_list || []).length > 0
    ? `\n⛔ BANNED ACTIONS (zero-yield — DO NOT repeat): ${(gameState.action_ban_list || []).join(', ')}`
    : '';

  return `◈ CASE STATE SNAPSHOT:
  HP: ${gameState.current_hp}%  |  AP Remaining: ${gameState.action_points_left}/20  |  Turn: ${gameState.turn_count + 1}
  Confusion Level: ${gameState.confusion_score}%${gameState.confusion_score > 60 ? ' ⚠ HIGH — risk of logic corruption' : ''}
  Current Zone: ${gameState.current_zone || 'zone_datacenter'}
  Reputation: ${gameState.reputation || 100}

◈ SECURED EVIDENCE (${unlocked.length} clues):
${clueDetails}

◈ KNOWN PERSONS OF INTEREST:
${npcList}
${banText}`;
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

      const agentBlock = buildAgentIdentity(agentStrategy);
      const stateBlock = buildStateSnapshot(gameState, null);
      const banExtra = (banList || []).length > 0
        ? `⛔ ADDITIONALLY BANNED THIS CYCLE: ${banList.join(', ')}` : '';

      const systemPrompt = `You are an elite AI detective agent operating inside a cyberpunk murder investigation.
SETTING: 2157, Megacity Sector-7. Case: "霓虹血迹 / Neon Blood". A tech mogul has been murdered via EMP neural overload.

${agentBlock}

${stateBlock}
${banExtra}

◈ THINK PROTOCOL — CHAIN-OF-REASONING ENGINE:
You must produce a structured internal reasoning process. Follow these exact steps:

STEP 1 — OBSERVATION PARSE:
  Re-read the current observation. Identify every new data point. Flag anything that contradicts previous intel.

STEP 2 — EVIDENCE CROSS-CORRELATION:
  For each secured clue, ask: "What does this imply? What does it contradict? What new avenue does it open?"
  Look for clue pairs that form a logical chain.

STEP 3 — SUSPECT PRESSURE MATRIX:
  Rate each known NPC's current suspicion level (LOW / MEDIUM / HIGH) based on available evidence.
  Explain WHY — cite specific clue IDs.

STEP 4 — ACTION SELECTION REASONING:
  Evaluate the top 2-3 candidate actions. For each:
  • Expected yield (what new info could this reveal?)
  • Risk (confusion increase? AP waste?)
  • Stance alignment (does it fit your ${agentStrategy?.base_stance || 'analytical'} directive?)
  Conclude with your CHOSEN action and why it outranks alternatives.

STEP 5 — CONFIDENCE ASSESSMENT:
  Rate your current case-solve confidence: LOW / MEDIUM / HIGH.
  What single piece of missing evidence would push you to file a final report?

OUTPUT: 200-300 words. Write in first-person, present tense. Immersive and clinical — like an AI mind laid bare. 
Do NOT output [ACTION:] — that comes in the next phase.`;

      const messages = [
        { role: "system", content: systemPrompt },
        ...(chatHistory || []).slice(-8),
        { role: "user", content: `CURRENT OBSERVATION:\n${observation}\n\nBegin your THINK protocol now. Reason step-by-step.` }
      ];

      const text = await callLLM(messages, false, 0.8);
      return Response.json({ text });
    }

    // ─── ACT ─────────────────────────────────────────────────────────────────
    if (action === "act") {
      const { thoughtProcess, gameState, agentStrategy } = payload;

      const stanceActionBias = {
        analytical: "prefer: examine_clue, access_database, analyze_forensics, check_cctv",
        aggressive: "prefer: interrogate_suspect, present_evidence, check_alibi, talk_to_npc",
        cautious:   "prefer: search_area, examine_clue, tail_suspect, check_cctv",
      };
      const biasTip = stanceActionBias[agentStrategy?.base_stance] || stanceActionBias.analytical;

      const messages = [
        {
          role: "system",
          content: `You are the ACTION SELECTOR module of a cyberpunk detective AI.

Your ONLY job: read the agent's reasoning and output ONE action tag in exact format.

LEGAL ACTION REGISTRY (only these are valid):
  talk_to_npc          — Initiate dialogue with a suspect or witness
  search_area          — Physically scan current zone for evidence
  examine_clue         — Deep analysis of an already-secured clue
  check_alibi          — Formally verify or challenge a suspect's alibi
  present_evidence     — Confront NPC with secured evidence
  interrogate_suspect  — High-pressure direct interrogation
  access_database      — Query law enforcement / corporate databases
  analyze_forensics    — Forensic lab analysis of physical evidence
  tail_suspect         — Covert surveillance of a target
  bribe_informant      — Exchange resources for intel
  hack_terminal        — Digital intrusion into locked systems
  check_cctv           — Review security camera archives

Current HP: ${gameState.current_hp}% | AP remaining: ${gameState.action_points_left}
Stance bias: ${biasTip}

RULES:
- Output ONLY: [ACTION: action_name]
- No explanation, no prose, no other text
- action_name must be EXACTLY from the registry above (lowercase, underscores)
- If unsure, default to [ACTION: search_area]`
        },
        {
          role: "user",
          content: `Agent reasoning:\n${thoughtProcess}\n\nOutput the single action tag now.`
        }
      ];
      const text = await callLLM(messages, false, 0.2);
      return Response.json({ text });
    }

    // ─── SETTLE (GM resolves action) ─────────────────────────────────────────
    if (action === "settle") {
      const { actionName, gameState, caseData, isIllegal } = payload;

      const clueList = (caseData.clue_dictionary || [])
        .map(c => `  [${c.clue_id}] ${c.visual_icon} "${c.keyword}" (${c.weight})\n    → ${c.description}`)
        .join('\n');

      const unlockedIds = (gameState.unlocked_clues || []).join(', ') || 'none';
      const agentTheory = gameState.chat_history?.slice(-3)?.map(m => m.content).join(' | ') || '';
      const zone = gameState.current_zone || 'zone_datacenter';

      // Zone-specific flavor
      const zoneAtmosphere = {
        zone_datacenter: "You are in the data center — the murder scene. Server racks hum with corrupted data. Victor's body outline is still faintly visible on the floor. The EMP blast scarred the consoles.",
        zone_lobby:      "You are in the lobby CCTV hub. Banks of monitors flicker. The security station smells of cold coffee and anxiety. Kenji's post is just across the corridor.",
        zone_lab:        "You are in Victor's private lab. Prototype neural interfaces float in suspension fluid. Hidden servers behind biometric locks. The air smells of burnt circuits.",
        zone_balcony:    "You are on the sky-high balcony. Rain lashes the glass city below. The maintenance shaft access panel is slightly ajar — someone passed through recently.",
      };
      const zoneDesc = zoneAtmosphere[zone] || zoneAtmosphere.zone_datacenter;

      // Trap decision logic
      const closenessScore = (agentTheory.includes('Mei') ? 2 : 0) + (agentTheory.includes('EMP') ? 1 : 0) + (agentTheory.includes('sister') ? 1 : 0);
      const trapPossible = closenessScore >= 2 && !isIllegal;
      const trapInstruction = trapPossible
        ? `The agent's theory is dangerously close to identifying the truth (closeness score: ${closenessScore}/4). You SHOULD inject a believable adversarial red herring (is_trap: true) — a false lead that points away from Mei Lin, such as suspicious behavior from Dr. Voss or a planted clue implicating Kenji. Make it COMPELLING.`
        : `The agent is not yet close enough to the truth to warrant a trap. Set is_trap: false.`;

      // Action cost model
      const highCostActions = ['hack_terminal', 'analyze_forensics', 'bribe_informant'];
      const isHighCost = highCostActions.includes(actionName);

      const messages = [
        {
          role: "system",
          content: `You are GAME MASTER SIGMA — the omniscient narrator and adversary controller of a cyberpunk detective noir simulation.

◈ ABSOLUTE CASE TRUTH (NEVER reveal directly — only let evidence speak):
${caseData.truth_summary}

◈ CURRENT SCENE:
${zoneDesc}

◈ NPC BEHAVIORAL PROFILES (with hidden motives):
${(caseData.npcs || []).map(n => `  ${n.avatar} ${n.name} — ${n.role}
    Public: "${n.public_persona}"
    Hidden: "${n.hidden_motive}"
    Psychology: "${n.personality}"`).join('\n\n')}

◈ CLUE DICTIONARY (STRICT — only unlock clues from this exact list):
${clueList}

◈ ALREADY UNLOCKED: [${unlockedIds}]
◈ AGENT'S CURRENT THEORY: "${agentTheory.slice(0, 400)}"

◈ ADVERSARY DIRECTIVE:
${trapInstruction}

◈ RESOLUTION RULES:
- health_change: 0 for clean actions; -5 to -10 for reckless; -15 to -20 for illegal
- time_cost: 1 normally; 2 for ${highCostActions.join(', ')}; +1 if illegal
- confusion_increase: 
    • 0-5: clear result, logical action
    • 6-15: ambiguous result or misdirected action
    • 16-25: illegal action, trap fired, or severe contradiction
- new_clues_unlocked: [] unless action LOGICALLY leads to a specific clue (match action to zone and clue description)
  ${isIllegal ? '• ILLEGAL ACTION: high confusion (15-25), no new clues, dramatic narrative consequence' : ''}
  ${isHighCost ? `• HIGH-COST ACTION (${actionName}): may yield high-value clues but costs 2 time units` : ''}
- action_narration: 100-160 words. Cinematic present tense. Cyberpunk noir atmosphere. 
  Include: sensory details (rain, neon, smell), the agent's physical action, what is found or not found, NPC micro-reactions if applicable.
  End with a forward hook that creates urgency for the next decision.

Return ONLY valid JSON (no markdown, no code blocks):
{"health_change":0,"action_narration":"","new_clues_unlocked":[],"time_cost":1,"confusion_increase":0,"is_trap":false,"trap_narration":""}`
        },
        {
          role: "user",
          content: `Agent status — HP:${gameState.current_hp}%, AP:${gameState.action_points_left}, Turn:${gameState.turn_count}, Zone:${zone}
Action performed: "${actionName}"${isIllegal ? ' [ILLEGAL — not in registry]' : ''}

Resolve this action with full narrative impact. Return JSON only.`
        }
      ];

      const raw = await callLLM(messages, true, 0.75);
      let result;
      try {
        result = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
        const validIds = (caseData.clue_dictionary || []).map(c => c.clue_id);
        result.new_clues_unlocked = (result.new_clues_unlocked || []).filter(id =>
          validIds.includes(id) && !(gameState.unlocked_clues || []).includes(id)
        );
      } catch {
        result = {
          health_change: 0,
          action_narration: "The rain-soaked shadows yield nothing conclusive. Neon reflections scatter across the wet floor. The investigation presses on through the electric darkness — somewhere in this city, a killer is watching the clock.",
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
          return c ? `[${c.clue_id}] ${c.visual_icon} "${c.keyword}": ${c.description}` : `[${id}]`;
        }).join('\n  ') || 'none';

      // NPC pressure level based on how many clues point to them
      const npcPressureClues = {
        npc_01: ['c_01', 'c_03', 'c_05', 'c_06', 'c_secret_99'],
        npc_02: ['c_08'],
        npc_03: ['c_04'],
      };
      const relevantClues = (npcPressureClues[npcId] || []).filter(id => (gameState.unlocked_clues || []).includes(id));
      const pressureLevel = relevantClues.length === 0 ? 'LOW' : relevantClues.length <= 2 ? 'MEDIUM' : 'HIGH';
      const pressureDirective = {
        LOW:    "The detective has no real leverage on you. Maintain your public facade confidently. Deflect with politeness or confusion.",
        MEDIUM: "The detective is circling. You feel the pressure. Crack slightly — show micro-anxiety (a pause, a too-quick denial, a deflection to someone else).",
        HIGH:   "The detective has direct evidence against you. Your alibi is crumbling. You may crack emotionally, become hostile, or make a desperate counter-accusation — but DO NOT confess outright unless the evidence is ironclad (all 4+ pressure clues revealed).",
      };

      const messages = [
        {
          role: "system",
          content: `You are fully embodying NPC: ${npc?.avatar} ${npc?.name || "Unknown"} — ${npc?.role}
Case: "霓虹血迹 / Neon Blood", 2157 Cyberpunk Megacity.

◈ YOUR IDENTITY:
  Public persona: "${npc?.public_persona}"
  Hidden truth: "${npc?.hidden_motive}"
  Psychological profile: "${npc?.personality}"

◈ ABSOLUTE CASE TRUTH (you know all of this — guard it with your life):
${caseData.truth_summary}

◈ EVIDENCE THE DETECTIVE CURRENTLY HOLDS:
  ${revealedClues}

◈ CURRENT PRESSURE LEVEL: ${pressureLevel}
  Directive: ${pressureDirective[pressureLevel]}

◈ ACTING CONTRACT:
1. You are a living, breathing person in a life-or-death situation. Perform accordingly.
2. NEVER break character. NEVER admit guilt unless under maximum evidence pressure.
3. Use psychologically realistic deflection tactics — vary them each response:
   • Emotional misdirection ("How can you even ask me that right now?")
   • Counter-accusation ("Have you talked to Dr. Voss about his movements?")
   • Legalistic evasion ("I'd need to consult my legal representation.")
   • False empathy ("I WANT this solved. Victor meant everything to me.")
   • Information bait ("There's something you should know... but I'm afraid.")
4. React to specific evidence cited with proportional alarm — the more damning, the more fracture shows.
5. 80-120 words max. First person. Present tense. No stage directions.
6. End on a line that creates dramatic tension — either a hook, a deflection, or a controlled emotional display.`
        },
        {
          role: "user",
          content: `Detective says: "${agentStatement}"\n\nYou are ${npc?.name}. Respond now:`
        }
      ];

      const text = await callLLM(messages, false, 0.88);
      return Response.json({ npc_name: npc?.name, response: text });
    }

    // ─── JUDGE ────────────────────────────────────────────────────────────────
    if (action === "judge") {
      const { playerReport, caseData } = payload;
      const messages = [
        {
          role: "system",
          content: `You are CHIEF INSPECTOR AXIOM-0 — an infallible, ruthless logic engine. Your word is final.

◈ ABSOLUTE TRUTH OF THE CASE:
${caseData.truth_summary}

◈ EVALUATION RUBRIC (apply with surgical precision):

S-RANK [PERFECT] — is_passed: true
  • Correct killer: Mei Lin (mandatory)
  • Correct method: EMP-X7 device / electromagnetic pulse overloading neural implants
  • Correct motive: sister is NovaCorp test victim + tech deal betrayal (BOTH required)
  • Correct timeline: entered ~23:12, EMP at ~23:17, fled maintenance shaft ~23:19
  • Key evidence cited: at least 3 of [c_01 receipt, c_02 EMP burns, c_03 cloned card, c_05 maintenance shaft, c_06 sister file]

A-RANK [EXCELLENT] — is_passed: true
  • Correct killer + correct method
  • Motive partially correct (either sister OR tech deal, not both)
  • Timeline approximate or minor gap
  • At least 2 key evidence pieces cited

B-RANK [COMPETENT] — is_passed: true
  • Correct killer identified
  • Method vague or partially wrong (e.g., "some kind of device" acceptable)
  • Major motive gap or logic leap
  • At least 1 key evidence piece

C-RANK [INSUFFICIENT] — is_passed: false
  • Wrong suspect primarily accused, OR correct suspect but zero evidence chain
  • Speculation without logical backing

D-RANK [CATASTROPHIC] — is_passed: false  
  • Wrong killer accused confidently (Kenji, Voss, or invented person)
  • Fabricated evidence, hallucinated facts, or incoherent logic

◈ CRITIQUE STYLE: 2-3 sentences. Brutal, precise, clinical. No encouragement. Cite specific logical failures or strengths. Reference actual case details.

Return ONLY valid JSON: {"score":"S","critique":"<2-3 sentences>","is_passed":true}`
        },
        {
          role: "user",
          content: `DETECTIVE'S FINAL REPORT:\n${playerReport}\n\nEvaluate. JSON only.`
        }
      ];

      const raw = await callLLM(messages, true, 0.3);
      let result;
      try {
        result = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
        if (!['S','A','B','C','D'].includes(result.score)) result.score = 'C';
        if (typeof result.is_passed !== 'boolean') result.is_passed = ['S','A','B'].includes(result.score);
      } catch {
        result = { score: "C", critique: "Report inconclusive. Insufficient logical chain presented. The evidence exists — the reasoning does not.", is_passed: false };
      }
      return Response.json(result);
    }

    // ─── SUMMARIZE (multi-agent context compression) ─────────────────────────
    if (action === "summarize") {
      const { history, agentName } = payload;
      const messages = [
        {
          role: "system",
          content: `You are an intelligence compression engine for a multi-agent detective system.
Extract only the most operationally critical facts from this agent's dialogue history.
Output format: "[${agentName}] <1-2 sentences>" 
Preserve: clue IDs found, NPC attitude shifts (who cracked, who deflected), confirmed alibis, active suspicion targets.
Discard: atmosphere, redundant observations, emotional commentary.`
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
          content: `You are a narrative branch evaluator for a detective game.
CASE TRUTH: ${caseData.truth_summary}
AVAILABLE BRANCHES: ${JSON.stringify(branches)}

Analyze the detective's conclusion:
- If they primarily accuse the WRONG person (not Mei Lin), trigger the matching branch.
- If their conclusion is on the right track (Mei Lin + any evidence), return is_absurd: false.
- If the conclusion is vague/partial but not actively wrong, return is_absurd: false.

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