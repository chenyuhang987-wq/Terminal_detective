// Global language context + translations
import React, { createContext, useContext, useState } from 'react';

export const LANG = {
  zh: {
    // Landing
    systemVersion: 'TERMINAL DETECTIVE · SYSTEM v2.1.57',
    online: '● 在线',
    secure: '◈ 安全',
    ready: '⚡ 就绪',
    caseBadge: '◈ 案件档案 · LVL_01 · OMEGA 难度',
    subtitle: '霓虹血迹 · NEON BLOOD · 2157',
    zones: '调查区域', suspects: '嫌疑人', clues: '隐藏线索', difficulty: '难度评级',
    startBtn: '▶ 开始调查',
    startHint: 'CONFIGURE YOUR AGENT TEAM FIRST',
    bottomBar: 'MULTI·AGENT·INVESTIGATIVE·PLATFORM · POWERED BY NEURAL REASONING ENGINE',
    features: [
      { icon: '🧠', title: '神经推理引擎', desc: 'ReAct 多阶段思维链，动态适应每一条证据链' },
      { icon: '🕵️', title: '多智能体编队', desc: '三名专属探员协同部署，技能互补触发连击增益' },
      { icon: '🗺', title: '动态案件流程图', desc: '可视化调查路径，拖拽节点优化优先级策略' },
      { icon: '⚡', title: '实时协同特效', desc: '粒子数据流 · AP 奖励连击 · 三重协同爆发' },
    ],
    // MiniMap
    minimap: '◈ 小地图',
    collapse: '▲ 收起',
    expand: '▼ 展开',
    currentPos: '当前位置',
    investigated: '已调查',
    unexplored: '未探索',
    clueLabel: '线索',
    zonesLabel: '区域',
    apLabel: 'AP',
    plotSummary: '◎ 情节摘要',
    clueDetails: '◎ 线索详情',
    noClues: '暂无线索',
    langBtn: 'EN',
  },
  en: {
    // Landing
    systemVersion: 'TERMINAL DETECTIVE · SYSTEM v2.1.57',
    online: '● ONLINE',
    secure: '◈ SECURE',
    ready: '⚡ READY',
    caseBadge: '◈ CASE FILE · LVL_01 · OMEGA DIFFICULTY',
    subtitle: 'NEON BLOOD · 霓虹血迹 · 2157',
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
    // MiniMap
    minimap: '◈ MINI MAP',
    collapse: '▲ HIDE',
    expand: '▼ SHOW',
    currentPos: 'Current',
    investigated: 'Visited',
    unexplored: 'Unknown',
    clueLabel: 'Clue',
    zonesLabel: 'Zones',
    apLabel: 'AP',
    plotSummary: '◎ PLOT SUMMARY',
    clueDetails: '◎ CLUE LOG',
    noClues: 'No clues yet',
    langBtn: '中',
  },
};

const LangContext = createContext({ lang: 'zh', t: LANG.zh, setLang: () => {} });

export function LangProvider({ children }) {
  const [lang, setLang] = useState('zh');
  const t = LANG[lang];
  return <LangContext.Provider value={{ lang, t, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() { return useContext(LangContext); }