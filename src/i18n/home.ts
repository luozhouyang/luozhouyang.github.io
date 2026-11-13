export type Locale = 'zh' | 'en';

const zh = {
  meta: {
    title: 'LOST IN ORBIT · 个人主页',
    description:
      '一个关于代码、工具与失重场景的个人主页。Rust、TypeScript 与 AI 工具链。',
  },
  nav: {
    work: '任务档案',
    writing: '日志',
    about: '关于',
    github: 'GITHUB',
    theme: '切换明暗主题',
    language: 'EN',
    languageLabel: '切换到英文',
  },
  hero: {
    line1: '在失重中，',
    line2Prefix: '构建',
    emphasis: '有用的东西',
    line2Suffix: '。',
    sub: '我是一名在杭州写代码的工程师。日常在 Rust、TypeScript 和 AI 工具链之间来回切换，喜欢把复杂系统拆成小而锋利的工具。',
    primary: '查看任务档案',
    github: 'GitHub',
    focus: ['Rust', 'TypeScript', 'LLM infra', 'Developer tools'],
  },
  scene: {
    kicker: 'MISSION 01 / LOST IN ORBIT',
    system: 'SYSTEM ONLINE',
    gravity: 'GRAVITY',
    drift: 'DRIFT',
    files: 'MISSION FILES',
    scan: '扫描下一个',
    bump: '碰撞',
    bumpLabel: '立即触发一次碰撞',
    complete: '任务完成',
    reset: '重置任务',
    archive: '档案 ↓',
    hint: '拖拽宇航员 · 撞击带信标的岩石解锁项目',
    hintMobile: '轻点宇航员 · 等待岩石靠近解锁项目',
    tooltipHint: '点击查看档案',
    close: '关闭项目档案',
    unlockedTemplate: '已解锁项目：{name}。{tagline}',
    completeMessage: '任务完成。所有项目档案已解锁。',
    astronautLabel: '戴着头盔的宇航员，面罩里是一张 GitHub 头像',
  },
  project: {
    file: 'FILE //',
    updated: '更新',
    github: 'GITHUB',
    moreTitle: '还有更多实验、草稿和未命名的想法。',
    moreBody:
      '主页只挑了 8 个项目放进轨道。完整的仓库列表、Issue 和正在进行的提交，都在 GitHub。',
    moreLabel: 'OPEN SOURCE',
    repositories: '79 PUBLIC REPOSITORIES',
    snapshot: 'STAR / LANGUAGE DATA SNAPSHOT · 2026.11',
  },
  about: {
    eyebrow: 'MISSION BRIEF',
    title: '把复杂系统，拆成小而锋利的工具。',
    description:
      '我不太相信「大而全」。更喜欢找到一个足够小的切口，用合适的语言和边界把它做扎实。',
    paragraphs: [
      '我是一名在杭州写代码的工程师。日常在 Rust、TypeScript 和 LLM 工具链之间来回切换。',
      '做过字符串相似度库、NLP 工具、API 网关，也做过把飞书消息接到本地编码代理上的机器人。我关心的不只是「能不能跑」，还有边界是否清楚、失败时是否可解释、半年后还敢不敢改。',
      '这个站点是一艘小小的飞船：岩石是项目，碰撞是相遇。你可以拖拽宇航员，也可以直接查看下面的任务档案。',
    ],
    stats: [
      { value: '79', label: 'public repos' },
      { value: '1k+', label: 'stars on flagship' },
      { value: '08', label: 'mission files' },
    ],
    telemetry: 'LIVE TELEMETRY',
    online: 'ONLINE',
    nowLabel: 'NOW',
    nowText: '构建本地优先的开发者工具，和会自己写代码的代理。',
    buildingLabel: 'BUILDING',
    buildingText: 'larkline · coffer-desktop · octra',
    baseLabel: 'BASE',
    baseText: 'Hangzhou, China · UTC+8',
    signalLabel: 'SIGNAL',
    signalText: '开源、协议、AI 基础设施，以及奇怪但有用的工具。',
    channel: 'OPEN A CHANNEL',
  },
  work: {
    eyebrow: 'MISSION ARCHIVE',
    title: '八块岩石，八段工作记录。',
    description: '都是公开仓库。有的已经跑了很多年，有的还在轨道上调整姿态。',
  },
  writing: {
    eyebrow: 'TRANSMISSIONS',
    title: '偶尔写点东西。',
    description:
      '工程笔记、设计取舍，以及那些不值得单独发一条推文、但值得留下来的思考。',
    all: 'ALL TRANSMISSIONS',
    rssEyebrow: 'SUBSCRIBE // RSS',
    rssTitle: '不想错过下一段信号？',
    rssBody: '把 RSS 丢进阅读器。没有算法，没有推送，只有新文章。',
    rssButton: 'RSS FEED',
    note: '',
  },
  contact: {
    eyebrow: 'OPEN CHANNEL // CONTACT',
    title: '有想法，或者只是想说声嗨？',
    body: '开源协作、协议设计、AI 工具链，或者你正在做一件很奇怪但很酷的事——都欢迎。最快的方式是在 GitHub 上开一个 Issue 或 Discussions。',
    github: 'GITHUB',
    rss: 'RSS',
    coordinates: 'HANGZHOU, CN / 29.8°N 120.1°E / UTC+8',
  },
  footer: {
    eyebrow: 'END OF TRANSMISSION',
    title: '保持联系，坐标不变。',
    body: '如果你也在做有意思的工具、协议或 AI 基础设施，欢迎来 GitHub 找我。',
    built: 'BUILT IN ORBIT',
    back: 'BACK TO TOP ↑',
  },
};

const en: typeof zh = {
  meta: {
    title: 'LOST IN ORBIT · Personal Lab',
    description:
      'A personal lab about code, tools, and a weightless space scene. Rust, TypeScript and AI tooling.',
  },
  nav: {
    work: 'MISSIONS',
    writing: 'JOURNAL',
    about: 'ABOUT',
    github: 'GITHUB',
    theme: 'Toggle theme',
    language: '中文',
    languageLabel: 'Switch to Chinese',
  },
  hero: {
    line1: 'BUILDING IN',
    line2Prefix: '',
    emphasis: 'ZERO GRAVITY',
    line2Suffix: '.',
    sub: "I'm an engineer in Hangzhou, moving between Rust, TypeScript and AI tooling. I like turning complex systems into small, sharp tools.",
    primary: 'Explore missions',
    github: 'GitHub',
    focus: ['Rust', 'TypeScript', 'LLM infra', 'Developer tools'],
  },
  scene: {
    kicker: 'MISSION 01 / LOST IN ORBIT',
    system: 'SYSTEM ONLINE',
    gravity: 'GRAVITY',
    drift: 'DRIFT',
    files: 'MISSION FILES',
    scan: 'Scan next',
    bump: 'BUMP',
    bumpLabel: 'Trigger a collision now',
    complete: 'All files',
    reset: 'Reset',
    archive: 'Archive ↓',
    hint: 'Drag the astronaut · hit a beacon rock to unlock a project',
    hintMobile: 'Tap the astronaut · wait for a rock to drift closer',
    tooltipHint: 'Click to open file',
    close: 'Close project file',
    unlockedTemplate: 'Project unlocked: {name}. {tagline}',
    completeMessage: 'Mission complete. All project files unlocked.',
    astronautLabel: 'An astronaut wearing a helmet with a GitHub avatar inside the visor',
  },
  project: {
    file: 'FILE //',
    updated: 'UPDATED',
    github: 'GITHUB',
    moreTitle: 'More experiments, drafts, and unnamed ideas.',
    moreBody:
      'Only eight projects made it into orbit. The full repository list, issues, and work in progress live on GitHub.',
    moreLabel: 'OPEN SOURCE',
    repositories: '79 PUBLIC REPOSITORIES',
    snapshot: 'STAR / LANGUAGE DATA SNAPSHOT · 2026.11',
  },
  about: {
    eyebrow: 'MISSION BRIEF',
    title: 'Small, sharp tools for complex systems.',
    description:
      "I don't believe in one-size-fits-all. I'd rather find a small enough seam and build it well, with the right language and boundaries.",
    paragraphs: [
      'I am an engineer in Hangzhou, moving between Rust, TypeScript and the LLM toolchain.',
      'I have built string-similarity libraries, NLP tools, API gateways, and a bot that connects Feishu to local coding agents. I care not only about whether it runs, but whether the boundaries are clear, failures are explainable, and the code is still safe to change six months later.',
      'This site is a small spaceship: rocks are projects, collisions are encounters. Drag the astronaut, or browse the mission archive below.',
    ],
    stats: [
      { value: '79', label: 'public repos' },
      { value: '1k+', label: 'stars on flagship' },
      { value: '08', label: 'mission files' },
    ],
    telemetry: 'LIVE TELEMETRY',
    online: 'ONLINE',
    nowLabel: 'NOW',
    nowText: 'Building local-first developer tools and agents that write code.',
    buildingLabel: 'BUILDING',
    buildingText: 'larkline · coffer-desktop · octra',
    baseLabel: 'BASE',
    baseText: 'Hangzhou, China · UTC+8',
    signalLabel: 'SIGNAL',
    signalText: 'Open source, protocols, AI infrastructure, and strange but useful tools.',
    channel: 'OPEN A CHANNEL',
  },
  work: {
    eyebrow: 'MISSION ARCHIVE',
    title: 'Eight rocks. Eight missions.',
    description:
      'All public repositories. Some have been running for years; others are still adjusting their attitude.',
  },
  writing: {
    eyebrow: 'TRANSMISSIONS',
    title: 'Occasional transmissions.',
    description:
      'Engineering notes, design trade-offs, and thoughts worth keeping beyond a single post.',
    all: 'ALL TRANSMISSIONS',
    rssEyebrow: 'SUBSCRIBE // RSS',
    rssTitle: 'Never miss the next signal.',
    rssBody: 'Drop the RSS feed into your reader. No algorithm, no push notifications.',
    rssButton: 'RSS FEED',
    note: 'The journal is currently available in Chinese only.',
  },
  contact: {
    eyebrow: 'OPEN CHANNEL // CONTACT',
    title: 'Have an idea, or just want to say hi?',
    body: 'Open-source collaboration, protocol design, AI tooling, or something strange and cool you are building — all welcome. The fastest way is an Issue or Discussion on GitHub.',
    github: 'GITHUB',
    rss: 'RSS',
    coordinates: 'HANGZHOU, CN / 29.8°N 120.1°E / UTC+8',
  },
  footer: {
    eyebrow: 'END OF TRANSMISSION',
    title: 'Keep in touch. Coordinates unchanged.',
    body: 'If you are building interesting tools, protocols, or AI infrastructure, come find me on GitHub.',
    built: 'BUILT IN ORBIT',
    back: 'BACK TO TOP ↑',
  },
};

export const homeCopy: Record<Locale, typeof zh> = { zh, en };

export const projectCopy: Record<
  Locale,
  Record<string, { tagline: string; summary: string }>
> = {
  zh: {
    'python-string-similarity': {
      tagline: '把「像不像」变成可计算的答案。',
      summary: '用 Rust 实现、面向 Python 的字符串相似度算法集合，覆盖编辑距离、Jaro-Winkler、余弦相似度等十余种度量。',
    },
    larkline: {
      tagline: '在飞书里，远程驾驶你的编码代理。',
      summary: '把 Feishu/Lark 变成 Claude Code 与 Codex CLI 的遥控器：流式卡片、按会话隔离、多工作区切换。',
    },
    'coffer-desktop': {
      tagline: '密钥留在你的设备上，不上云。',
      summary: '开发者的本地优先保险箱：API Key、.env 片段和密码只加密在本地，无云同步、无遥测。',
    },
    octra: {
      tagline: '一个本地进程，收拢所有 API 流量。',
      summary: 'Rust 守护进程统一 API、LLM 与 MCP 服务：Axum + SQLite 核心，配管理 CLI 和跨平台 Tauri 桌面端。',
    },
    AutoPhraseX: {
      tagline: '从海量文本里，捞出真正重要的短语。',
      summary: '从大规模文本语料中自动挖掘高质量短语，支持多语言语料与远程监督。',
    },
    'transformers-keras': {
      tagline: '把 Transformer 拆开，再一块块拼回去。',
      summary: '用 TensorFlow 2.x / Keras 复现 Transformer 系列模型，保留清晰的模块边界，适合学习、实验和改造。',
    },
    minigateway: {
      tagline: '小，但该有的网关能力都有。',
      summary: '受 Kong 启发的轻量 LLM API 网关，负责路由、鉴权、限流和用量统计。',
    },
    fastcart: {
      tagline: '独立商家也配得上一套轻量的店。',
      summary: 'Rust + React 的自托管多店电商平台，目标是轻量、可掌控，把数据和店面的控制权还给商家。',
    },
  },
  en: {
    'python-string-similarity': {
      tagline: 'Turn similarity into a computable answer.',
      summary: 'A Rust-backed Python library of string similarity and distance measures, from edit distance to Jaro-Winkler and cosine.',
    },
    larkline: {
      tagline: 'Pilot your coding agents from Feishu.',
      summary: 'Bridges Feishu/Lark with Claude Code and Codex CLI: streaming cards, per-chat sessions, and multiple workspaces.',
    },
    'coffer-desktop': {
      tagline: 'Secrets stay on your device.',
      summary: 'A local-first encrypted vault for API keys, .env fragments and passwords. No cloud, no telemetry.',
    },
    octra: {
      tagline: 'One local process for all API traffic.',
      summary: 'A Rust gateway for API, LLM and MCP services: Axum + SQLite core, admin CLI, and a cross-platform Tauri app.',
    },
    AutoPhraseX: {
      tagline: 'Mine the phrases that actually matter.',
      summary: 'Automated phrase mining from large corpora, with multilingual data and remote supervision.',
    },
    'transformers-keras': {
      tagline: 'Take Transformers apart. Put them back together.',
      summary: 'Transformer models reimplemented in TensorFlow 2.x / Keras, with clear module boundaries for learning and experiments.',
    },
    minigateway: {
      tagline: 'Small, but a real gateway.',
      summary: 'A lightweight LLM API gateway inspired by Kong: routing, auth, rate limits and usage stats.',
    },
    fastcart: {
      tagline: 'Independent shops deserve a light storefront.',
      summary: 'A self-hosted multi-store commerce platform built with Rust and React.',
    },
  },
};

export function getHomeCopy(locale: Locale): typeof zh {
  return homeCopy[locale];
}

export function getProjectCopy(locale: Locale, slug: string): { tagline: string; summary: string } {
  return projectCopy[locale][slug] ?? projectCopy.zh[slug]!;
}
