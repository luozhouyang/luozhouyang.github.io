export const site = {
  brand: 'LOST IN ORBIT',
  title: 'LOST IN ORBIT',
  tagline: '在失重中，构建有用的东西。',
  description:
    '一个关于代码、工具与失重场景的个人主页。Rust、TypeScript 与 AI 工具链。',
  location: 'Hangzhou, China',
  github: 'https://github.com/luozhouyang',
  repo: 'https://github.com/luozhouyang/luozhouyang.github.io',
  url: 'https://luozhouyang.github.io',
  nav: [
    { label: '任务档案', href: '/#work' },
    { label: '日志', href: '/blog/' },
    { label: '关于', href: '/#about' },
  ],
  stats: [
    { value: '79', label: 'public repos' },
    { value: '1k+', label: 'stars on flagship' },
    { value: '08', label: 'mission files' },
  ],
  focus: ['Rust', 'TypeScript', 'LLM infra', 'Developer tools'],
} as const;
