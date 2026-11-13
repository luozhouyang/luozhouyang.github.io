import { githubStats } from './github-stats.generated';

export type ProjectShape = 'angular' | 'round' | 'shard' | 'cluster';

export interface Project {
  slug: string;
  repo: string;
  repoName: string;
  kicker: string;
  tagline: string;
  summary: string;
  language: string;
  stars: number;
  pushedAt: string;
  topics: string[];
  accent: string;
  glyph: string;
  shape: ProjectShape;
  rockScale: number;
  year: number;
  featured: boolean;
}

interface CuratedProject {
  slug: string;
  repo: string;
  kicker: string;
  tagline: string;
  summary: string;
  topics: string[];
  accent: string;
  glyph: string;
  shape: ProjectShape;
  rockScale: number;
  year: number;
  featured?: boolean;
}

const curated: CuratedProject[] = [
  {
    slug: 'python-string-similarity',
    repo: 'luozhouyang/python-string-similarity',
    kicker: 'LIBRARY // RUST + PYTHON',
    tagline: '把「像不像」变成可计算的答案。',
    summary:
      '用 Rust 实现、面向 Python 的字符串相似度算法集合，覆盖编辑距离、Jaro-Winkler、余弦相似度等十余种度量。',
    topics: ['string-similarity', 'rust', 'python', 'algorithms'],
    accent: '#7DE3E0',
    glyph: 'Σ',
    shape: 'round',
    rockScale: 1.32,
    year: 2020,
    featured: true,
  },
  {
    slug: 'larkline',
    repo: 'luozhouyang/larkline',
    kicker: 'AGENT TOOL // TYPESCRIPT',
    tagline: '在飞书里，远程驾驶你的编码代理。',
    summary:
      '把 Feishu/Lark 变成 Claude Code 与 Codex CLI 的遥控器：流式卡片、按会话隔离、多工作区切换。',
    topics: ['feishu', 'claude-code', 'codex', 'local-first'],
    accent: '#8FB8FF',
    glyph: 'L',
    shape: 'shard',
    rockScale: 1.06,
    year: 2026,
  },
  {
    slug: 'coffer-desktop',
    repo: 'luozhouyang/coffer-desktop',
    kicker: 'LOCAL-FIRST // TAURI',
    tagline: '密钥留在你的设备上，不上云。',
    summary:
      '开发者的本地优先保险箱：API Key、.env 片段和密码只加密在本地，无云同步、无遥测。',
    topics: ['secrets', 'encryption', 'tauri', 'local-first'],
    accent: '#FFB26B',
    glyph: 'C',
    shape: 'angular',
    rockScale: 0.96,
    year: 2026,
  },
  {
    slug: 'octra',
    repo: 'luozhouyang/octra',
    kicker: 'GATEWAY // RUST',
    tagline: '一个本地进程，收拢所有 API 流量。',
    summary:
      'Rust 守护进程统一 API、LLM 与 MCP 服务：Axum + SQLite 核心，配管理 CLI 和跨平台 Tauri 桌面端。',
    topics: ['gateway', 'llm', 'mcp', 'rust'],
    accent: '#C4A7FF',
    glyph: 'O',
    shape: 'cluster',
    rockScale: 1.14,
    year: 2026,
  },
  {
    slug: 'AutoPhraseX',
    repo: 'luozhouyang/AutoPhraseX',
    kicker: 'NLP // PYTHON',
    tagline: '从海量文本里，捞出真正重要的短语。',
    summary:
      '从大规模文本语料中自动挖掘高质量短语，支持多语言语料与远程监督，是 AutoPhrase 思路的 Python 实现。',
    topics: ['nlp', 'phrase-mining', 'python'],
    accent: '#9BE28F',
    glyph: 'A',
    shape: 'angular',
    rockScale: 1.08,
    year: 2021,
  },
  {
    slug: 'transformers-keras',
    repo: 'luozhouyang/transformers-keras',
    kicker: 'RESEARCH // KERAS',
    tagline: '把 Transformer 拆开，再一块块拼回去。',
    summary:
      '用 TensorFlow 2.x / Keras 复现 Transformer 系列模型，保留清晰的模块边界，适合学习、实验和改造。',
    topics: ['transformer', 'keras', 'tensorflow'],
    accent: '#FF8FA3',
    glyph: 'T',
    shape: 'shard',
    rockScale: 0.9,
    year: 2021,
  },
  {
    slug: 'minigateway',
    repo: 'luozhouyang/minigateway',
    kicker: 'INFRA // TYPESCRIPT',
    tagline: '小，但该有的网关能力都有。',
    summary:
      '受 Kong 启发的轻量 LLM API 网关，负责路由、鉴权、限流和用量统计，适合本地与边缘场景。',
    topics: ['api-gateway', 'llm', 'typescript'],
    accent: '#66D9C0',
    glyph: 'M',
    shape: 'round',
    rockScale: 0.84,
    year: 2026,
  },
  {
    slug: 'fastcart',
    repo: 'luozhouyang/fastcart',
    kicker: 'COMMERCE // RUST',
    tagline: '独立商家也配得上一套轻量的店。',
    summary:
      'Rust + React 的自托管多店电商平台，目标是轻量、可掌控，把数据和店面的控制权还给商家。',
    topics: ['ecommerce', 'rust', 'react', 'self-hosted'],
    accent: '#FFD37A',
    glyph: 'F',
    shape: 'cluster',
    rockScale: 1.0,
    year: 2026,
  },
];

export const projects: Project[] = curated.map((project) => {
  const stats = githubStats[project.repo];
  return {
    ...project,
    repoName: project.repo.split('/')[1] ?? project.repo,
    language: stats?.language ?? 'TypeScript',
    stars: stats?.stars ?? 0,
    pushedAt: stats?.pushedAt ?? '2026-01-01T00:00:00Z',
    featured: project.featured ?? false,
  };
});

export function getProject(slug: string): Project | undefined {
  return projects.find((project) => project.slug === slug);
}
