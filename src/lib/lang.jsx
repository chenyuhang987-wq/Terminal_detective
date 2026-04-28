// Global language context + translations
import React, { createContext, useContext, useState } from 'react';

export const LANG = {
  zh: {
    systemVersion: 'TERMINAL DETECTIVE · SYSTEM v2.1.57',
    online: '● 在线', secure: '◈ 安全', ready: '⚡ 就绪',
    caseBadge: '◈ 案件档案 · LVL_01 · OMEGA 难度',
    subtitle: '霓虹血迹 · NEON BLOOD · 2157',
    zones: '调查区域', suspects: '嫌疑人', clues: '隐藏线索', difficulty: '难度评级',
    startBtn: '▶ 开始调查',
    startHint: '请先配置您的探员团队',
    bottomBar: '多智能体调查平台 · 神经推理引擎驱动',
    features: [
      { icon: '🧠', title: '神经推理引擎', desc: 'ReAct 多阶段思维链，动态适应每一条证据链' },
      { icon: '🕵️', title: '多智能体编队', desc: '三名专属探员协同部署，技能互补触发连击增益' },
      { icon: '🗺', title: '动态案件流程图', desc: '可视化调查路径，拖拽节点优化优先级策略' },
      { icon: '⚡', title: '实时协同特效', desc: '粒子数据流 · AP 奖励连击 · 三重协同爆发' },
    ],
    minimap: '◈ 小地图', collapse: '▲ 收起', expand: '▼ 展开',
    currentPos: '当前位置', investigated: '已调查', unexplored: '未探索',
    clueLabel: '线索', zonesLabel: '区域', apLabel: 'AP',
    plotSummary: '◎ 情节摘要', clueDetails: '◎ 线索详情', noClues: '暂无线索',
    langBtn: 'EN',
    // CaseSelect
    caseArchiveTitle: '案件档案库',
    caseArchiveSubtitle: '选择一个案件开始调查',
    backToLobby: '← 返回大厅',
    selectInvestigation: 'SELECT INVESTIGATION',
    clueStat: '线索', npcStat: 'NPC', zoneStat: '区域',
    startCase: '▶ 开始调查', loadingCase: '▶ 正在载入...',
    caseArchiveFooter: 'TERMINAL DETECTIVE · 案件档案 · 3个案件可选',
    // InvestigationTerminal HUD
    hudPhase: '阶段', hudHp: 'HP', hudAp: 'AP', hudClues: '线索', hudConfusion: '混乱',
    btnMap: '🗺 地图', btnBoard: '🕸 证物板', btnLog: '📓 日志', btnReport: '📋 报告', btnEnd: '⏹ 结束',
    reportTitle: '◈ 案件报告 — 提交推理至法官：',
    reportPlaceholder: '陈述您的结论：谁是凶手？如何作案？为何作案？有何证据支撑？',
    reportSubmit: '▶ 提交至法官',
    reportCancel: '取消',
    evidenceLocker: '◈ 证物库',
    noEvidence: '尚无证据。\n开始调查。',
    confusionLabel: '混乱',
    lobbyBtn: '← 大厅',
    interrogating: '审讯中',
    sendBtn: '发送',
    abortBtn: '⬛ 中止',
    executeCycle: '▶ 执行循环',
  },
  en: {
    systemVersion: 'TERMINAL DETECTIVE · SYSTEM v2.1.57',
    online: '● ONLINE', secure: '◈ SECURE', ready: '⚡ READY',
    caseBadge: '◈ CASE FILE · LVL_01 · OMEGA DIFFICULTY',
    subtitle: 'NEON BLOOD · 2157',
    zones: 'ZONES', suspects: 'SUSPECTS', clues: 'CLUES', difficulty: 'DIFFICULTY',
    startBtn: '▶ START INVESTIGATION',
    startHint: 'CONFIGURE YOUR AGENT TEAM FIRST',
    bottomBar: 'MULTI·AGENT·INVESTIGATIVE·PLATFORM · POWERED BY NEURAL REASONING ENGINE',
    features: [
      { icon: '🧠', title: 'Neural Reasoning Engine', desc: 'ReAct multi-step thought chains, adapting dynamically to every evidence trail' },
      { icon: '🕵️', title: 'Multi-Agent Squad', desc: 'Three specialist agents deploy in synergy, triggering combo bonuses' },
      { icon: '🗺', title: 'Dynamic Case Flow Map', desc: 'Visualize investigation paths, drag nodes to optimize priority strategy' },
      { icon: '⚡', title: 'Real-Time Synergy FX', desc: 'Particle data streams · AP reward combos · Triple-agent burst' },
    ],
    minimap: '◈ MINI MAP', collapse: '▲ HIDE', expand: '▼ SHOW',
    currentPos: 'Current', investigated: 'Visited', unexplored: 'Unknown',
    clueLabel: 'Clue', zonesLabel: 'Zones', apLabel: 'AP',
    plotSummary: '◎ PLOT SUMMARY', clueDetails: '◎ CLUE LOG', noClues: 'No clues yet',
    langBtn: '中',
    // CaseSelect
    caseArchiveTitle: 'CASE ARCHIVE',
    caseArchiveSubtitle: 'Select a case to begin your investigation',
    backToLobby: '← BACK TO LOBBY',
    selectInvestigation: 'SELECT INVESTIGATION',
    clueStat: 'Clues', npcStat: 'NPCs', zoneStat: 'Zones',
    startCase: '▶ START CASE', loadingCase: '▶ LOADING...',
    caseArchiveFooter: 'TERMINAL DETECTIVE · CASE ARCHIVE · 3 INVESTIGATIONS AVAILABLE',
    // InvestigationTerminal HUD
    hudPhase: 'PHASE', hudHp: 'HP', hudAp: 'AP', hudClues: 'CLUES', hudConfusion: 'CONFUSION',
    btnMap: '🗺 MAP', btnBoard: '🕸 BOARD', btnLog: '📓 LOG', btnReport: '📋 REPORT', btnEnd: '⏹ END',
    reportTitle: '◈ CASE REPORT — Submit your reasoning to the Judge:',
    reportPlaceholder: 'State your conclusion: Who did it? How? Why? What evidence supports your case?',
    reportSubmit: '▶ SUBMIT TO JUDGE',
    reportCancel: 'CANCEL',
    evidenceLocker: '◈ EVIDENCE LOCKER',
    noEvidence: 'No evidence secured.\nBegin investigation.',
    confusionLabel: 'CONFUSION',
    lobbyBtn: '← LOBBY',
    interrogating: 'INTERROGATING',
    sendBtn: 'SEND',
    abortBtn: '⬛ ABORT',
    executeCycle: '▶ EXECUTE CYCLE',
  },
};

const LangContext = createContext({ lang: 'zh', t: LANG.zh, setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLang] = useState('zh');
  const t = LANG[lang];
  return <LangContext.Provider value={{ lang, t, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }