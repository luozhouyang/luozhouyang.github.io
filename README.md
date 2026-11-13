# LOST IN ORBIT

个人主页，一个可以漂浮、碰撞、发现项目的深空场景。支持明暗主题切换，以及首页中英双语（博客暂为中文）。

- **框架**：Astro 7（静态输出）+ TypeScript
- **样式**：Tailwind CSS 4（UI）+ 原生 CSS/SVG（场景插画）
- **交互**：原生 TypeScript、Canvas 2D、轻量自研引力/碰撞引擎
- **内容**：Astro Content Collections（博客）
- **部署**：GitHub Actions → GitHub Pages

## 本地开发

```bash
pnpm install
pnpm dev
```

默认地址：`http://localhost:4321/`

## 常用命令

```bash
pnpm check          # Astro / TypeScript 检查
pnpm test           # Vitest：物理引擎单元测试
pnpm build          # 生产构建
pnpm preview        # 预览 dist
pnpm sync:projects  # 用 GitHub API 刷新项目 Star/语言/更新时间快照
pnpm og             # 重新生成中文 public/og.png（需要本地服务）
# 英文 OG：OG_URL=http://127.0.0.1:4321/en/ OG_LANG=en OG_OUT=public/og-en.png pnpm og
```

`pnpm sync:projects` 需要 `GITHUB_TOKEN` 或 `GH_TOKEN`（未登录时 GitHub 匿名 API 限额较低）。
生成结果会写入 `src/data/github-stats.generated.ts`，构建本身不访问 GitHub API。

## 内容维护

- 个人信息、导航和统计：`src/data/site.ts`
- 首页中英文案：`src/i18n/home.ts`
- 项目叙事、主题色、岩石大小：`src/data/projects.ts`
- 项目数据快照：`src/data/github-stats.generated.ts`
- 博客：`src/content/blog/*.md`
- 场景引擎：`src/scripts/space-scene.ts` 与 `src/scripts/physics.ts`
- 场景样式：`src/styles/scene.css`
- 明暗主题：`src/layouts/BaseLayout.astro` 的初始化脚本 + `src/styles/global.css` / `scene.css` 的 light overrides
- 双语首页：`src/components/home/HomePage.astro`、`src/pages/index.astro`、`src/pages/en/index.astro`

## 部署

仓库通过 `.github/workflows/deploy.yml` 自动发布：推送到 `main` 后会执行
`pnpm check`、`pnpm test`、`pnpm build`，并部署到 GitHub Pages。
**Settings → Pages → Source** 已设置为 **GitHub Actions**。

- 站点地址：<https://luozhouyang.github.io/>
- 站点是用户主页仓库，因此 `astro.config.mjs` 中 `base` 保持 `/`。
- 如需使用自定义域名，在 `public/` 添加 `CNAME` 并配置 DNS。

## 人工验收清单

1. 首页断点：1440 / 1024 / 768 / 390 / 320，没有横向滚动，HUD 不被裁切。
2. 拖拽宇航员撞上岩石，或等待约 3–4 秒自动碰撞，双方弹开；repo 卡片始终跟随岩石移动并自行淡出，约 10 秒关闭，`Esc` 可关闭。键盘聚焦卡片时暂停淡出。
3. 所有岩石都有独立的随机巡航轨迹，但同一时刻只有一块会脱离轨道加速撞向宇航员；命中后下一块再出发。项目岩石命中会弹卡，环境岩石命中也有粒子/冲击波反馈。
4. 点击「碰撞 / BUMP」可立即触发一次碰撞；全部解锁后按钮仍可用，会重播一张 repo 卡片。
5. 点击「扫描下一个」可立即打开一个固定的项目面板；进度递增，关闭后不重复自动弹出。
6. 主题按钮在明暗之间切换并持久化；刷新后保持选择，博客页也跟随主题。
7. `/en/` 为英文首页；导航可切回中文首页，博客与文章仍为中文。
8. 鼠标拖拽宇航员有惯性；移动端轻点宇航员有小推力，页面滚动不被劫持。
9. 系统开启「减少动态效果」后，不再自动碰撞；仍可用「碰撞」或扫描查看项目。已全部解锁时，自动导演不会寻找新目标，用「碰撞」可重播。
10. `/blog/`、文章页、`/rss.xml`、`/sitemap-index.xml`、`/en/` 可访问；不存在的路径返回 404 页面。
11. `pnpm check`、`pnpm test`、`pnpm build` 全部通过。
