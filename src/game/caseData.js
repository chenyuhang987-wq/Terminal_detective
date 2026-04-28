// ═══════════════════════════════════════════════════════════════════════════
// data_config.js — Static Case Database & Enums
// The absolute source of truth for all case data. No logic, no state.
// ═══════════════════════════════════════════════════════════════════════════

export const ReAct_Enum = {
  IDLE: 'IDLE',
  OBSERVE: 'OBSERVE',
  THINK: 'THINK',
  ACT: 'ACT',
  REPORTING: 'REPORTING',
  CRASHED: 'CRASHED',
};

export const Legal_Actions_List = [
  'talk_to_npc',
  'search_area',
  'examine_clue',
  'check_alibi',
  'present_evidence',
  'interrogate_suspect',
  'access_database',
  'analyze_forensics',
  'tail_suspect',
  'bribe_informant',
  'hack_terminal',
  'check_cctv',
];

export const Phase_Color_Map = {
  IDLE:       { bg: '#0a0f1e', accent: '#00ffff', label: 'STANDBY' },
  OBSERVE:    { bg: '#0a192f', accent: '#00e5ff', label: 'OBSERVING' },
  THINK:      { bg: '#200b3a', accent: '#bf5fff', label: 'PROCESSING' },
  ACT:        { bg: '#4a0e0e', accent: '#ff3860', label: 'EXECUTING' },
  REPORTING:  { bg: '#0a2010', accent: '#00ff88', label: 'FILING REPORT' },
  CRASHED:    { bg: '#1a0000', accent: '#ff0000', label: 'SYSTEM FAILURE' },
};

export const Case_Data_Lvl_01 = {
  case_id: "Lvl_01",
  title: "霓虹血迹",
  subtitle: "Neon Blood",
  difficulty: "OMEGA",
  setting: "2157年，赛博朋克城市深处的顶层豪华公寓",
  scene: {
    description: "夜雨冲刷着霓虹灯的倒影。第47层豪华套房内，科技大亨 Victor Zhao 被发现死在他的数据中心。现场有明显的电磁脉冲痕迹，尸体旁散落着加密芯片的碎片。大楼的安保系统显示，案发前1小时内共有3人进入过此房间。",
    zones: {
      zone_datacenter: { dom_id: "area-datacenter", label: "数据中心 · 案发现场", entry_requirement: null },
      zone_lobby: { dom_id: "area-lobby", label: "大堂 · 监控中心", entry_requirement: "check_cctv" },
      zone_lab: { dom_id: "area-lab", label: "私人实验室", entry_requirement: "hack_terminal" },
      zone_balcony: { dom_id: "area-balcony", label: "天台阳台", entry_requirement: "action_open_glass_door" },
    }
  },

  truth_summary: `Victor Zhao was murdered by his trusted assistant, Mei Lin. 
Motive: Mei discovered Victor had been secretly selling experimental neural interface tech to rival corporation NovaCorp, which would destroy thousands of lives including her family (her sister is a test subject). 
Method: Mei used a stolen Electromagnetic Pulse device (EMP-X7) to overload Victor's neural implants, causing fatal cardiac arrest. The EMP also wiped security footage. 
Timeline: 23:05 - Victor entered data center. 23:12 - Mei followed using cloned access card. 23:17 - EMP discharged. 23:19 - Mei left via maintenance shaft. 23:31 - Body discovered by guard Kenji.
Key evidence: Bloody receipt showing Mei purchased capacitors at 22:41 (EMP components), Victor's encrypted files showing NovaCorp deal, Mei's sister's neural interface registration, maintenance shaft access log.`,

  clue_dictionary: [
    {
      clue_id: "c_01",
      keyword: "染血收据",
      description: "在数据端子下方发现，时间戳 23:05。显示在附近的电子元器件店购买了高压电容器。",
      visual_icon: "🧾",
      weight: "CRITICAL"
    },
    {
      clue_id: "c_02",
      keyword: "EMP 烧痕",
      description: "Victor 脖颈处的神经接口有明显的高压电磁脉冲灼伤，与普通枪击或钝器伤完全不同。",
      visual_icon: "⚡",
      weight: "CRITICAL"
    },
    {
      clue_id: "c_03",
      keyword: "克隆门禁卡",
      description: "监控显示有人使用了与 Mei Lin 相同权限的门禁卡，但 Mei 声称她 23:00 后就离开了大楼。",
      visual_icon: "💳",
      weight: "HIGH"
    },
    {
      clue_id: "c_04",
      keyword: "NovaCorp 加密协议",
      description: "Victor 的加密硬盘中发现了与竞争对手 NovaCorp 签署的秘密交易协议——出售神经接口技术。",
      visual_icon: "📋",
      weight: "HIGH"
    },
    {
      clue_id: "c_05",
      keyword: "维修管道记录",
      description: "大楼维修管道的电子锁在 23:17 被激活，有人从内部进入，23:19 离开。这条管道直通案发楼层。",
      visual_icon: "🔧",
      weight: "MEDIUM"
    },
    {
      clue_id: "c_06",
      keyword: "Mei 的姐姐档案",
      description: "医院记录：Mei Lin 的姐姐是 NovaCorp 神经接口实验的受害者，目前处于植物人状态。",
      visual_icon: "🏥",
      weight: "HIGH"
    },
    {
      clue_id: "c_07",
      keyword: "抹除的监控",
      description: "案发时间段的所有摄像头数据均已损毁，符合 EMP 设备的干扰特征。",
      visual_icon: "📷",
      weight: "MEDIUM"
    },
    {
      clue_id: "c_08",
      keyword: "Kenji 不在场证明",
      description: "保安 Kenji 的刷卡记录证实他全程在地下停车场值班，不可能在案发时间出现在47层。",
      visual_icon: "🛡️",
      weight: "LOW"
    },
    {
      clue_id: "c_secret_99",
      keyword: "匿名黑客情报",
      description: "系统收到匿名加密信息：'Check maintenance shaft log at 23:17. She always hated him for what he did to her sister.'",
      visual_icon: "🔐",
      weight: "CRITICAL",
      unlock_turn: 8
    }
  ],

  npcs: [
    {
      npc_id: "npc_01",
      name: "Mei Lin",
      role: "Victor 的私人助理",
      public_persona: "忠诚高效的助理，对 Victor 死亡表现悲痛",
      hidden_motive: "她用 EMP 设备杀死了 Victor，为了阻止出卖技术、为姐姐复仇",
      personality: "表面冷静克制，内心极度紧张，当证据出示时会崩溃",
      avatar: "👩‍💼",
      initial_statement: "我... 我不知道该说什么。Victor 死了，这太突然了。我昨晚 11 点前就离开了大楼，我发誓。"
    },
    {
      npc_id: "npc_02",
      name: "Kenji Mori",
      role: "大楼保安",
      public_persona: "尽职的保安，第一个发现尸体",
      hidden_motive: "无罪，但他在黑市中有些灰色交易，怕被深查",
      personality: "紧张、多汗、说话磕磕绊绊",
      avatar: "🛡️",
      initial_statement: "是我发现他的... 23 点 31 分。我去送例行报告，门是开的，然后就看到他倒在地板上了。"
    },
    {
      npc_id: "npc_03",
      name: "Dr. Voss",
      role: "NovaCorp 研究员",
      public_persona: "来拜访的商业伙伴",
      hidden_motive: "他知道交易的内情，但选择沉默，他是共谋但没有直接参与谋杀",
      personality: "傲慢、精于算计、擅长用法律术语回避问题",
      avatar: "🔬",
      initial_statement: "我与 Victor 博士有正当的商业往来。我的律师告诉我可以拒绝回答任何问题。"
    }
  ],

  valid_edges: [
    ["c_01", "c_02"],
    ["c_02", "c_03"],
    ["c_03", "c_05"],
    ["c_04", "c_06"],
    ["c_05", "c_07"],
    ["c_06", "c_01"],
    ["c_secret_99", "c_05"],
    ["c_secret_99", "c_06"],
  ],

  conflict_dictionary: [
    {
      clue_A: "c_08",
      clue_B: "c_03",
      reason: "Kenji's alibi is verified, so the cloned card must belong to someone else."
    }
  ],

  hidden_clues: [
    {
      clue_id: "c_secret_99",
      unlock_turn: 8,
      text: "系统警报：收到来自未知 IP 的加密数据包..."
    }
  ],

  checkpoints: ["zone_datacenter", "zone_lobby"],

  branches: {
    "b_wrong_kenji": {
      text: "你的探员鲁莽地指控了无辜的保安 Kenji！警方以妨碍公务为由拘押了探员，案件调查陷入死胡同。霓虹灯在雨中继续闪烁，而真凶悄然消失在城市的阴影中...",
      visual_fx: "glitch-red",
      impact: { ap_loss: 50 }
    },
    "b_wrong_voss": {
      text: "探员将矛头指向了 Dr. Voss。虽然他是共谋，但缺乏直接证据。Voss 的律师团队迅速介入，在 72 小时内将其保释。真凶 Mei Lin 趁机逃离了城市。",
      visual_fx: "glitch-orange",
      impact: { ap_loss: 30 }
    }
  },

  branch_triggers: [
    {
      branch_id: "b_wrong_kenji",
      condition_description: "玩家/探员指控了保安 Kenji 而没有充分证据"
    },
    {
      branch_id: "b_wrong_voss",
      condition_description: "玩家/探员只指控了 Voss 而忽视了 Mei Lin 的直接证据"
    }
  ]
};

export const DEFAULT_AGENT_CONFIG = {
  agent_id: "AXIOM-7",
  role: "Lead_Investigator",
  base_stance: "analytical",
  visual_parameters: {
    base_color: "#00ffff",
    pulse_rate_ms: 2000,
  },
  combat_attributes: {
    logic_power: 70,
    observation_focus: 60,
  },
  engine_modifiers: {
    confusion_resistance: 0.7,
    ap_cost_discount: 0.0,
  },
  custom_rules: [
    { condition: "When NPC refuses to answer", action: "Present evidence immediately" },
    { condition: "When confusion is high", action: "Re-examine known clues before acting" }
  ]
};