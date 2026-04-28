import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ReAct_Enum, Legal_Actions_List, Phase_Color_Map, Case_Data_Lvl_01 } from '@/game/caseData';
import { createInitialGameState, generateObservation, applySettlementResult, LocalStorage, pushCheckpoint, popCheckpoint, checkConflictClues } from '@/game/gameState';
import { streamThinkSSE, getAction, settleAction, getNPCDialogue, judgeReport, branchCheck, parseActionTag } from '@/game/llmClient';
import AIProcessingIndicator from '@/components/game/AIProcessingIndicator';
import ClueCard from '@/components/game/ClueCard';
import EvidenceBoard from '@/components/game/EvidenceBoard';
import GlitchOverlay from '@/components/game/GlitchOverlay';
import BSoD from '@/components/game/BSoD';
import AgentSynergyFX from '@/components/game/AgentSynergyFX';
import DecisionLog from '@/components/game/DecisionLog';
import CaseFlowMap from '@/components/game/CaseFlowMap';

const PHASE_COLORS = Phase_Color_Map;

export default function InvestigationTerminal({ agentStrategy, onGameEnd, onBackToLobby }) {
  const [gameState, setGameState] = useState(() => createInitialGameState(Case_Data_Lvl_01));
  const [reactState, setReactState] = useState(ReAct_Enum.IDLE);
  const [terminalLines, setTerminalLines] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stressLevel, setStressLevel] = useState(0);
  const [newClueIds, setNewClueIds] = useState([]);
  const [showBSoD, setShowBSoD] = useState(false);
  const [reportMode, setReportMode] = useState(false);
  const [reportText, setReportText] = useState('');
  const [judgeResult, setJudgeResult] = useState(null);
  const [selectedNPC, setSelectedNPC] = useState(null);
  const [npcDialogue, setNpcDialogue] = useState([]);
  const [showBoard, setShowBoard] = useState(false);
  const [showDecisionLog, setShowDecisionLog] = useState(false);
  const [showFlowMap, setShowFlowMap] = useState(false);
  const [decisionLog, setDecisionLog] = useState([]);
  const [agentPath, setAgentPath] = useState(['zone_datacenter']);
  const [zoneFeedback, setZoneFeedback] = useState({});
  const [thoughtText, setThoughtText] = useState('');
  const [abortCtrl, setAbortCtrl] = useState(null);
  const [synergyEvent, setSynergyEvent] = useState(null);

  const triggerSynergy = useCallback((type, clue) => {
    setSynergyEvent({
      type,
      clueIcon: clue?.visual_icon || '🔍',
      clueKeyword: clue?.keyword || '未知线索',
      id: Date.now(),
    });
  }, []);

  const terminalRef = useRef(null);
  const stressTimerRef = useRef(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const caseData = Case_Data_Lvl_01;
  const phaseColor = PHASE_COLORS[reactState] || PHASE_COLORS.IDLE;

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  const addLine = useCallback((text, type = 'default', prefix = '') => {
    setTerminalLines(prev => [...prev, { text, type, prefix, id: Date.now() + Math.random() }]);
    setTimeout(scrollToBottom, 50);
  }, [scrollToBottom]);

  // Check for auto-released hidden clues on turn change
  useEffect(() => {
    const hidden = caseData.hidden_clues || [];
    hidden.forEach(hc => {
      if (gameState.turn_count >= hc.unlock_turn && !gameState.unlocked_clues.includes(hc.clue_id)) {
        addLine(`\n🔐 ENCRYPTED MESSAGE RECEIVED: "${hc.text}"`, 'system');
        addLine(`📦 New evidence secured: ${hc.clue_id}`, 'success');
        setGameState(prev => ({
          ...prev,
          unlocked_clues: [...prev.unlocked_clues, hc.clue_id]
        }));
        setNewClueIds(prev => [...prev, hc.clue_id]);
        setTimeout(() => setNewClueIds(prev => prev.filter(id => id !== hc.clue_id)), 3000);
      }
    });
  }, [gameState.turn_count]);

  // Confusion / crash monitoring
  useEffect(() => {
    if (gameState.confusion_score >= 100 && !showBSoD) {
      setShowBSoD(true);
    }
  }, [gameState.confusion_score]);

  const startStressTimer = () => {
    setStressLevel(0);
    stressTimerRef.current = setInterval(() => {
      setStressLevel(prev => Math.min(100, prev + 5));
    }, 500);
  };

  const stopStressTimer = () => {
    clearInterval(stressTimerRef.current);
    setTimeout(() => setStressLevel(0), 500);
  };

  // ── Main ReAct Loop ───────────────────────────────────────────────────────
  const runReActCycle = async () => {
    if (isProcessing) return;
    const gs = gameStateRef.current;
    if (gs.action_points_left <= 0) {
      addLine('\n⚠ CRITICAL: Action Points depleted. File your report now.', 'error');
      return;
    }

    const ctrl = new AbortController();
    setAbortCtrl(ctrl);
    setIsProcessing(true);

    try {
      // ── Phase 1: OBSERVE ──────────────────────────────────────────────
      setReactState(ReAct_Enum.OBSERVE);
      const observation = generateObservation(gs, caseData);
      addLine('\n' + '═'.repeat(50), 'divider');
      addLine(`◈ TURN ${gs.turn_count + 1} — OBSERVATION PHASE`, 'phase');
      addLine(observation, 'observe');
      await sleep(800);

      // ── Phase 2: THINK ────────────────────────────────────────────────
      setReactState(ReAct_Enum.THINK);
      addLine('\n◈ ENTERING NEURAL PROCESSING MODE...', 'phase');
      setThoughtText('');

      startStressTimer();
      let fullThought = '';

      await streamThinkSSE({
        gameState: gs,
        agentStrategy,
        chatHistory: gs.chat_history.slice(-6),
        banList: gs.action_ban_list,
        observation,
        signal: ctrl.signal,
        onChunk: (char) => {
          fullThought += char;
          setThoughtText(prev => prev + char);
          scrollToBottom();
        },
        onDone: (text) => { fullThought = text; }
      });

      stopStressTimer();
      if (ctrl.signal.aborted) { setIsProcessing(false); return; }

      addLine(fullThought, 'thought');
      setThoughtText('');

      // ── Phase 3: ACT ──────────────────────────────────────────────────
      setReactState(ReAct_Enum.ACT);
      addLine('\n◈ ACTION SYNTHESIS...', 'phase');
      startStressTimer();

      const actionText = await getAction({
        thoughtProcess: fullThought,
        gameState: gs,
        agentStrategy
      });

      stopStressTimer();
      if (ctrl.signal.aborted) { setIsProcessing(false); return; }

      const actionTag = parseActionTag(actionText);
      const isLegal = actionTag && Legal_Actions_List.includes(actionTag);

      if (actionTag) {
        addLine(`\n▶ ACTION ISSUED: [${actionTag.toUpperCase()}]`, isLegal ? 'action' : 'error');
      }

      // ── Settlement ────────────────────────────────────────────────────
      addLine('⏳ Resolving action...', 'system');
      const settlement = await settleAction({
        actionName: actionTag || 'search_area',
        gameState: gs,
        caseData,
        isIllegal: !isLegal
      });

      // Apply results — pass agentStrategy for resistance/discount modifiers
      const { newState, newClues } = applySettlementResult(gs, settlement, agentStrategy);
      newState.lastAction = actionTag;
      newState.last_action = actionTag;

      // Conflict dictionary check — extra confusion for mutually exclusive clues
      if (checkConflictClues(newState.unlocked_clues, caseData.conflict_dictionary)) {
        newState.confusion_score = Math.min(100, newState.confusion_score + 15);
        addLine(`\n⚠ LOGIC CONFLICT DETECTED: Contradictory evidence in matrix. Confusion +15.`, 'warning');
      }

      // Push checkpoint at key zones
      if (caseData.checkpoints?.includes(newState.current_zone)) {
        newState.checkpoint_stack = pushCheckpoint(newState);
      }
      newState.chat_history = [
        ...gs.chat_history,
        { role: 'assistant', content: `[THINK] ${fullThought}\n[ACTION] ${actionTag}` },
        { role: 'user', content: `[RESULT] ${settlement.action_narration}` }
      ].slice(-12);

      setGameState(newState);

      // ── Build decision log entry ──────────────────────────────────────
      const isKeyDecision = newClues.length > 0
        || settlement.confusion_increase > 10
        || settlement.is_trap
        || (actionTag && ['present_evidence', 'analyze_forensics', 'check_alibi'].includes(actionTag));

      // ── Update flow map agent path & zone feedback ─────────────────────
      if (newState.current_zone) {
        setAgentPath(prev => [...prev, newState.current_zone]);
      } else {
        // infer zone from action
        const actionZoneMap = {
          search_area: 'zone_datacenter', examine_clue: 'zone_datacenter', analyze_forensics: 'zone_lab',
          check_cctv: 'zone_lobby', hack_terminal: 'zone_lab', check_alibi: 'zone_lobby',
          action_open_glass_door: 'zone_balcony', present_evidence: 'zone_datacenter',
        };
        const inferredZone = actionZoneMap[actionTag] || 'zone_datacenter';
        setAgentPath(prev => [...prev, inferredZone]);
        if (settlement.action_narration) {
          const shortFeedback = settlement.action_narration.replace(/[^\u0000-\u007E\u4e00-\u9fa5]/g, '').slice(0, 28);
          setZoneFeedback(prev => ({ ...prev, [inferredZone]: shortFeedback }));
        }
      }

      setDecisionLog(prev => [...prev, {
        id: Date.now(),
        turn: gs.turn_count + 1,
        thought: fullThought,
        action: actionTag,
        observation: settlement.action_narration,
        newClues: newClues.map(id => {
          const c = caseData.clue_dictionary.find(x => x.clue_id === id);
          return c ? `${c.visual_icon} ${c.keyword}` : id;
        }),
        isTrap: !!settlement.is_trap,
        isKeyDecision,
        keyReason: settlement.is_trap
          ? '⚠ 陷阱事件触发'
          : newClues.length > 0
          ? `发现 ${newClues.length} 条新线索`
          : settlement.confusion_increase > 10
          ? '混乱值大幅上升'
          : isKeyDecision
          ? '关键逻辑节点'
          : '',
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }]);

      // Show narration
      if (settlement.is_trap) {
        addLine(`\n🎭 [ADVERSARIAL EVENT] ${settlement.trap_narration || settlement.action_narration}`, 'trap');
      } else {
        addLine(`\n📋 ${settlement.action_narration}`, 'narration');
      }

      // Show new clues with parabola effect
      if (newClues.length > 0) {
        newClues.forEach(clueId => {
          const clue = caseData.clue_dictionary.find(c => c.clue_id === clueId);
          if (clue) {
            addLine(`\n🔍 NEW EVIDENCE SECURED: ${clue.visual_icon} ${clue.keyword}`, 'success');
            addLine(`   └─ ${clue.description}`, 'clue-desc');
            // Trigger multi-agent convergence FX
            triggerSynergy('clue_converge', clue);
          }
        });
        setNewClueIds(prev => [...prev, ...newClues]);
        setTimeout(() => setNewClueIds(prev => prev.filter(id => !newClues.includes(id))), 3000);
      }

      // Cross-validate synergy: trigger when action involves presenting evidence or examining
      const crossValidateActions = ['present_evidence', 'examine_clue', 'analyze_forensics', 'check_alibi'];
      if (actionTag && crossValidateActions.includes(actionTag) && newState.unlocked_clues.length >= 2) {
        const lastClue = caseData.clue_dictionary.find(c => newState.unlocked_clues.includes(c.clue_id));
        setTimeout(() => triggerSynergy('cross_validate', lastClue), 600);
      }

      if (settlement.confusion_increase > 0) {
        addLine(`\n⚠ Confusion increased by ${settlement.confusion_increase}. [${newState.confusion_score}/100]`, 'warning');
      }

      setReactState(ReAct_Enum.IDLE);
    } catch (err) {
      stopStressTimer();
      if (!ctrl.signal.aborted) {
        addLine(`\n❌ SYSTEM ERROR: ${err.message}`, 'error');
      }
      setReactState(ReAct_Enum.IDLE);
    } finally {
      setIsProcessing(false);
      setAbortCtrl(null);
    }
  };

  const handleAbort = () => {
    if (abortCtrl) {
      abortCtrl.abort();
      addLine('\n🛑 AGENT ACTION ABORTED BY ARCHITECT', 'warning');
      stopStressTimer();
      setIsProcessing(false);
      setReactState(ReAct_Enum.IDLE);
      setThoughtText('');
    }
  };

  const handleNPCTalk = async (npc) => {
    setSelectedNPC(npc);
    setNpcDialogue([{ role: 'system', text: `— ${npc.name} enters the room —\n"${npc.initial_statement}"` }]);
  };

  const handleNPCSend = async (msg) => {
    if (!selectedNPC || !msg.trim()) return;
    setNpcDialogue(prev => [...prev, { role: 'agent', text: msg }]);
    setIsProcessing(true);
    try {
      const result = await getNPCDialogue({
        npcId: selectedNPC.npc_id,
        agentStatement: msg,
        gameState,
        caseData
      });
      setNpcDialogue(prev => [...prev, { role: 'npc', text: result.response, name: result.npc_name }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportText.trim()) return;
    setIsProcessing(true);
    setReactState(ReAct_Enum.REPORTING);
    try {
      // First: check for absurd branch (wrong accusation)
      const branch = await branchCheck({ playerReport: reportText, caseData });
      if (branch?.is_absurd && branch?.branch_id) {
        const branchData = caseData.branches?.[branch.branch_id];
        if (branchData) {
          addLine(`\n🎭 NARRATIVE COLLAPSE: ${branchData.text}`, 'trap');
          addLine(`\n💀 AP penalty: -${branchData.impact?.ap_loss || 30}`, 'error');
          setGameState(prev => ({
            ...prev,
            action_points_left: Math.max(0, prev.action_points_left - (branchData.impact?.ap_loss || 30)),
            reputation: Math.max(0, prev.reputation - 25),
          }));
          setIsProcessing(false);
          setReactState(ReAct_Enum.IDLE);
          setReportMode(false);
          return;
        }
      }

      // Standard judge evaluation
      const result = await judgeReport({ playerReport: reportText, caseData });
      setJudgeResult(result);
      if (result.is_passed) {
        addLine('\n🎉 CASE SOLVED — ARCHITECT VICTORIOUS!', 'success');
        addLine(`\n📋 Judge verdict [${result.score}]: ${result.critique}`, 'success');
      } else {
        const apLoss = result.score === 'D' ? Math.floor(gameState.action_points_left * 0.5) : 3;
        setGameState(prev => ({
          ...prev,
          action_points_left: Math.max(0, prev.action_points_left - apLoss),
          reputation: Math.max(0, prev.reputation - 20),
          confusion_score: Math.min(100, prev.confusion_score + 10),
        }));
        addLine(`\n⛔ REPORT REJECTED [${result.score}]. AP -${apLoss}. Reputation -20.`, 'error');
        addLine(`\n📋 Judge: ${result.critique}`, 'warning');
      }
    } finally {
      setIsProcessing(false);
      setReactState(ReAct_Enum.IDLE);
      setReportMode(false);
    }
  };

  const bgColor = phaseColor.bg;
  const accentColor = phaseColor.accent;

  return (
    <div className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(ellipse at top, ${bgColor} 0%, #040810 70%)`,
        fontFamily: "'Courier New', monospace",
        transition: 'background 1s ease',
      }}>

      <GlitchOverlay intensity={gameState.confusion_score} type={gameState.confusion_score > 75 ? 'red' : 'default'} />
      {showBSoD && (
        <BSoD agentId={agentStrategy?.agent_id || 'AXIOM'} onDismiss={() => {
          setShowBSoD(false);
          setGameState(prev => ({ ...prev, confusion_score: 0, action_points_left: Math.max(0, prev.action_points_left - 5) }));
          addLine('\n🔄 AGENT REBOOTED. Confusion reset. AP penalty applied.', 'system');
        }} />
      )}

      {/* Top HUD */}
      <div className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: `${accentColor}30`, backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <div className="flex items-center gap-4">
          <button onClick={onBackToLobby} className="text-xs opacity-40 hover:opacity-80 transition-opacity"
            style={{ color: accentColor }}>← LOBBY</button>
          <div className="text-xs font-bold tracking-widest" style={{ color: accentColor, textShadow: `0 0 10px ${accentColor}` }}>
            {caseData.title} · {caseData.subtitle}
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs">
          {[
            { label: 'PHASE', val: phaseColor.label },
            { label: 'HP', val: `${gameState.current_hp}%` },
            { label: 'AP', val: `${gameState.action_points_left}/20` },
            { label: 'CLUES', val: `${gameState.unlocked_clues.length}/${caseData.clue_dictionary.length}` },
            { label: 'CONFUSION', val: `${gameState.confusion_score}%` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="opacity-40" style={{ color: accentColor }}>{s.label}</div>
              <div className="font-bold" style={{
                color: s.label === 'CONFUSION' && gameState.confusion_score > 60 ? '#ff3860' :
                  s.label === 'HP' && gameState.current_hp < 30 ? '#ff3860' : accentColor
              }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowFlowMap(m => !m); setShowBoard(false); setShowDecisionLog(false); }}
            className="text-xs px-3 py-1 rounded border transition-all"
            style={{ borderColor: '#a78bfa50', color: '#a78bfa', backgroundColor: showFlowMap ? '#a78bfa20' : 'transparent' }}>
            🗺 MAP
          </button>
          <button onClick={() => { setShowBoard(b => !b); setShowDecisionLog(false); setShowFlowMap(false); }}
            className="text-xs px-3 py-1 rounded border transition-all"
            style={{ borderColor: `${accentColor}50`, color: accentColor, backgroundColor: showBoard ? `${accentColor}20` : 'transparent' }}>
            🕸 BOARD
          </button>
          <button onClick={() => { setShowDecisionLog(d => !d); setShowBoard(false); setShowFlowMap(false); }}
            className="text-xs px-3 py-1 rounded border transition-all"
            style={{ borderColor: '#ffaa0050', color: '#ffaa00', backgroundColor: showDecisionLog ? '#ffaa0020' : 'transparent', position: 'relative' }}>
            📓 LOG
            {decisionLog.filter(e => e.isKeyDecision || e.isTrap).length > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                width: 14, height: 14, borderRadius: '50%',
                background: '#ffaa00', color: '#000',
                fontSize: '0.45rem', fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {decisionLog.filter(e => e.isKeyDecision || e.isTrap).length}
              </span>
            )}
          </button>
          <button onClick={() => setReportMode(r => !r)}
            className="text-xs px-3 py-1 rounded border transition-all"
            style={{ borderColor: '#00ff8850', color: '#00ff88', backgroundColor: reportMode ? '#00ff8820' : 'transparent' }}>
            📋 REPORT
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* Agent Synergy FX overlay */}
        <AgentSynergyFX event={synergyEvent} />

        {/* Left: Terminal */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Terminal output */}
          <div ref={terminalRef} className="flex-1 overflow-y-auto p-4 space-y-1"
            style={{ scrollBehavior: 'smooth' }}>
            <div className="text-xs opacity-30 mb-4" style={{ color: accentColor }}>
              ═══ TERMINAL DETECTIVE SYSTEM · CASE: {caseData.case_id} · AGENT: {agentStrategy?.agent_id} ═══
            </div>
            {terminalLines.map(line => (
              <TerminalLine key={line.id} line={line} accentColor={accentColor} />
            ))}
            {thoughtText && (
              <div className="text-xs leading-relaxed" style={{ color: '#bf5fff', whiteSpace: 'pre-wrap' }}>
                {thoughtText}
                <span className="animate-pulse" style={{ color: '#bf5fff' }}>▊</span>
              </div>
            )}
            {isProcessing && !thoughtText && (
              <AIProcessingIndicator phase={reactState} stressLevel={stressLevel} />
            )}
          </div>

          {/* NPC Dialogue Box */}
          {selectedNPC && !reportMode && (
            <NPCDialogBox
              npc={selectedNPC}
              dialogue={npcDialogue}
              onSend={handleNPCSend}
              onClose={() => { setSelectedNPC(null); setNpcDialogue([]); }}
              isProcessing={isProcessing}
              accentColor={accentColor}
            />
          )}

          {/* Report Mode */}
          {reportMode && (
            <div className="p-4 border-t" style={{ borderColor: '#00ff8830' }}>
              <div className="text-xs mb-2" style={{ color: '#00ff88' }}>◈ CASE REPORT — Submit your reasoning to the Judge:</div>
              <textarea
                className="w-full bg-transparent border rounded p-3 text-xs outline-none resize-none"
                style={{ borderColor: '#00ff8850', color: '#00ff88', height: 100 }}
                placeholder="State your conclusion: Who did it? How? Why? What evidence supports your case?"
                value={reportText}
                onChange={e => setReportText(e.target.value)}
                disabled={isProcessing}
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleSubmitReport} disabled={isProcessing}
                  className="flex-1 py-2 text-xs rounded border transition-all"
                  style={{ borderColor: '#00ff88', color: '#00ff88', backgroundColor: '#00ff8815' }}>
                  ▶ SUBMIT TO JUDGE
                </button>
                <button onClick={() => setReportMode(false)}
                  className="px-4 py-2 text-xs rounded border opacity-50 hover:opacity-80"
                  style={{ borderColor: '#ffffff30', color: '#fff' }}>
                  CANCEL
                </button>
              </div>
              {judgeResult && <JudgeResult result={judgeResult} />}
            </div>
          )}

          {/* Action Bar */}
          <div className="p-4 border-t flex items-center gap-3 flex-wrap"
            style={{ borderColor: `${accentColor}30`, backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <button onClick={runReActCycle} disabled={isProcessing || gameState.action_points_left <= 0}
              className="px-6 py-2 text-xs font-bold tracking-widest rounded border transition-all hover:scale-105 active:scale-95 disabled:opacity-30"
              style={{
                borderColor: accentColor, color: accentColor,
                backgroundColor: `${accentColor}15`,
                boxShadow: `0 0 15px ${accentColor}30`,
                textShadow: `0 0 8px ${accentColor}`,
              }}>
              ▶ EXECUTE CYCLE
            </button>
            {isProcessing && (
              <button onClick={handleAbort}
                className="px-4 py-2 text-xs rounded border transition-all"
                style={{ borderColor: '#ff386060', color: '#ff3860', backgroundColor: '#ff386015' }}>
                ⬛ ABORT
              </button>
            )}
            <div className="flex gap-2 flex-wrap">
              {caseData.npcs.map(npc => (
                <button key={npc.npc_id} onClick={() => handleNPCTalk(npc)}
                  disabled={isProcessing}
                  className="px-3 py-1 text-xs rounded border transition-all hover:opacity-80 disabled:opacity-30"
                  style={{ borderColor: `${accentColor}40`, color: `${accentColor}cc`, backgroundColor: `${accentColor}08` }}>
                  {npc.avatar} {npc.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-72 border-l flex flex-col overflow-hidden"
          style={{ borderColor: `${accentColor}20`, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          {showFlowMap ? (
            <CaseFlowMap
              gameState={gameState}
              caseData={caseData}
              agentPath={agentPath}
              zoneFeedback={zoneFeedback}
              accentColor={accentColor}
              agentStrategy={agentStrategy}
              onPriorityChange={() => {}}
            />
          ) : showDecisionLog ? (
            <DecisionLog entries={decisionLog} accentColor={accentColor} />
          ) : showBoard ? (
            <div className="flex-1 p-2">
              <div className="text-xs mb-2 tracking-widest text-center" style={{ color: accentColor }}>EVIDENCE BOARD</div>
              <div style={{ height: 'calc(100% - 30px)' }}>
                <EvidenceBoard
                  clues={caseData.clue_dictionary}
                  unlockedIds={gameState.unlocked_clues}
                  validEdges={caseData.valid_edges}
                  caseData={caseData}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-xs tracking-widest mb-3" style={{ color: accentColor }}>
                ◈ EVIDENCE LOCKER ({gameState.unlocked_clues.length})
              </div>
              {gameState.unlocked_clues.length === 0 ? (
                <div className="text-xs opacity-30 text-center mt-8" style={{ color: accentColor }}>
                  No evidence secured.<br />Begin investigation.
                </div>
              ) : (
                gameState.unlocked_clues.map(id => {
                  const clue = caseData.clue_dictionary.find(c => c.clue_id === id);
                  return clue ? <ClueCard key={id} clue={clue} isNew={newClueIds.includes(id)} compact /> : null;
                })
              )}
            </div>
          )}

          {/* Confusion Meter */}
          <div className="p-3 border-t" style={{ borderColor: `${accentColor}20` }}>
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: accentColor }}>CONFUSION</span>
              <span style={{ color: gameState.confusion_score > 60 ? '#ff3860' : accentColor }}>
                {gameState.confusion_score}%
              </span>
            </div>
            <div className="h-2 rounded overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <div className="h-full transition-all duration-500 rounded"
                style={{
                  width: `${gameState.confusion_score}%`,
                  background: gameState.confusion_score > 75
                    ? 'linear-gradient(to right, #ff3860, #ff0020)'
                    : gameState.confusion_score > 40
                    ? 'linear-gradient(to right, #ffaa00, #ff5500)'
                    : `linear-gradient(to right, ${accentColor}, ${accentColor}80)`,
                  boxShadow: `0 0 8px ${gameState.confusion_score > 75 ? '#ff3860' : accentColor}`,
                }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TerminalLine({ line, accentColor }) {
  const colors = {
    default: '#c0c0d0',
    phase: accentColor,
    observe: '#00e5ff',
    thought: '#bf5fff',
    action: '#00ff88',
    narration: '#e0e0f0',
    clue_desc: '#8888aa',
    success: '#00ff88',
    error: '#ff3860',
    warning: '#ffaa00',
    trap: '#ff6600',
    system: '#8888aa',
    divider: '#ffffff15',
  };
  const color = colors[line.type] || colors.default;
  return (
    <div className="text-xs leading-relaxed whitespace-pre-wrap"
      style={{ color, fontFamily: 'monospace' }}>
      {line.text}
    </div>
  );
}

function NPCDialogBox({ npc, dialogue, onSend, onClose, isProcessing, accentColor }) {
  const [msg, setMsg] = useState('');
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [dialogue]);

  return (
    <div className="border-t p-3" style={{ borderColor: `${accentColor}30`, backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold" style={{ color: accentColor }}>
          {npc.avatar} INTERROGATING: {npc.name} · {npc.role}
        </div>
        <button onClick={onClose} className="text-xs opacity-40 hover:opacity-80" style={{ color: accentColor }}>✕</button>
      </div>
      <div ref={ref} className="max-h-32 overflow-y-auto space-y-1 mb-2">
        {dialogue.map((d, i) => (
          <div key={i} className="text-xs" style={{
            color: d.role === 'agent' ? '#00ff88' : d.role === 'npc' ? '#ffaa00' : '#8888aa',
            fontStyle: d.role === 'system' ? 'italic' : 'normal'
          }}>
            {d.role === 'agent' ? '> AGENT: ' : d.role === 'npc' ? `${npc.avatar} ${d.name}: ` : ''}{d.text}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 bg-transparent border rounded px-2 py-1 text-xs outline-none"
          style={{ borderColor: `${accentColor}40`, color: accentColor }}
          placeholder={`Interrogate ${npc.name}...`}
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !isProcessing) { onSend(msg); setMsg(''); } }}
          disabled={isProcessing}
        />
        <button onClick={() => { onSend(msg); setMsg(''); }} disabled={isProcessing || !msg.trim()}
          className="px-3 text-xs rounded border disabled:opacity-30"
          style={{ borderColor: `${accentColor}50`, color: accentColor }}>
          SEND
        </button>
      </div>
    </div>
  );
}

function JudgeResult({ result }) {
  const scoreColors = { S: '#00ff88', A: '#00ffff', B: '#ffaa00', C: '#ff6600', D: '#ff3860' };
  const color = scoreColors[result.score] || '#ffffff';
  return (
    <div className="mt-3 p-3 rounded border" style={{ borderColor: `${color}50`, backgroundColor: `${color}10` }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="text-3xl font-bold" style={{ color, textShadow: `0 0 20px ${color}` }}>{result.score}</div>
        <div className="text-xs" style={{ color }}>
          {result.is_passed ? '✓ CASE CLOSED' : '✗ REPORT REJECTED'}
        </div>
      </div>
      <div className="text-xs" style={{ color: `${color}cc` }}>{result.critique}</div>
    </div>
  );
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }