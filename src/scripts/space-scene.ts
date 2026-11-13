import {
  clamp,
  confineBody,
  lerp,
  mulberry32,
  pickUnseenProject,
  resolveCollision,
  stepBody,
  sweptCircleOverlap,
  type Attractor,
  type BodyState,
  type Vec2,
  type World,
} from './physics';

type ProjectShape = 'angular' | 'round' | 'shard' | 'cluster';

interface ProjectPayload {
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
  index: number;
  url: string;
}

interface Rock extends BodyState {
  id: number;
  variant: number;
  seed: number;
  project?: ProjectPayload;
  alive: boolean;
  guided: boolean;
  guidedUntil: number;
  seekPhase: number;
  hits: number;
  hovered: boolean;
  touching: boolean;
  trail: Vec2[];
  trailClock: number;
  previous: Vec2;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  kind: 'dot' | 'spark';
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface ActiveCard {
  project: ProjectPayload;
  rock: Rock;
  startedAt: number;
  pausedMs: number;
  pausedAt: number | null;
  initialized: boolean;
  x: number;
  y: number;
}

interface DragState {
  active: boolean;
  moved: boolean;
  offsetX: number;
  offsetY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  velocityX: number;
  velocityY: number;
  startX: number;
  startY: number;
  startTime: number;
  pointerId: number | null;
}

const STORAGE_KEY = 'lost-in-orbit-unlocked-v1';
const TAU = Math.PI * 2;
const pad = (value: number, length = 2) => String(value).padStart(length, '0');

function parsePayload(root: HTMLElement): ProjectPayload[] {
  const script = root.querySelector<HTMLScriptElement>('[data-projects]');
  if (!script?.textContent) return [];
  try {
    const parsed: unknown = JSON.parse(script.textContent);
    return Array.isArray(parsed) ? (parsed as ProjectPayload[]) : [];
  } catch {
    return [];
  }
}

function loadUnlocked(): Set<string> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === 'string'));
  } catch {
    return new Set();
  }
}

function saveUnlocked(unlocked: Set<string>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...unlocked]));
  } catch {
    // Private browsing can reject storage; the experience still works.
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int)) return `rgba(125, 227, 224, ${alpha})`;
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function createRockSprite(seed: number, variant: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const random = mulberry32(seed);
  const center = 128;
  const baseRadius = 80;
  const pointCount = variant === 2 ? 7 : variant === 1 ? 16 : 12;
  const points: Vec2[] = [];

  for (let index = 0; index < pointCount; index += 1) {
    const angle = (index / pointCount) * TAU;
    const shardStretch = variant === 2 ? 1.2 + Math.cos(angle) * 0.35 : 1;
    const radius =
      baseRadius *
      (variant === 3 ? 0.8 + random() * 0.25 : 0.74 + random() * 0.34) *
      shardStretch;
    points.push({
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius * (variant === 2 ? 0.82 : 1),
    });
  }

  const trace = (offsetX = 0, offsetY = 0) => {
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x + offsetX, point.y + offsetY);
      else ctx.lineTo(point.x + offsetX, point.y + offsetY);
    });
    ctx.closePath();
  };

  // Soft, offset silhouette gives the rock a little physical depth without a
  // per-frame canvas filter (which is expensive on low-end mobile GPUs).
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.42)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 7;
  trace(2, 3);
  ctx.fillStyle = 'rgba(7, 11, 20, 0.7)';
  ctx.fill();
  ctx.restore();

  const baseGradient = ctx.createRadialGradient(88, 76, 8, center, center, baseRadius * 1.5);
  baseGradient.addColorStop(0, '#c3cbdb');
  baseGradient.addColorStop(0.28, '#8f9bb2');
  baseGradient.addColorStop(0.58, '#65718a');
  baseGradient.addColorStop(0.82, '#3c465d');
  baseGradient.addColorStop(1, '#171e2c');

  trace();
  ctx.fillStyle = baseGradient;
  ctx.fill();

  ctx.save();
  trace();
  ctx.clip();

  // Broad mineral facets.
  const facetSets = [
    [points[0], points[1], points[2], { x: center, y: center }],
    [points[Math.floor(pointCount * 0.35)], points[Math.floor(pointCount * 0.6)], { x: center, y: center + 70 }],
    [points[Math.floor(pointCount * 0.7)], points[Math.floor(pointCount * 0.9)], { x: center + 70, y: center }],
  ];
  const facetFills = [
    'rgba(235, 242, 255, 0.1)',
    'rgba(10, 15, 26, 0.2)',
    'rgba(10, 15, 26, 0.28)',
  ];
  facetSets.forEach((facet, index) => {
    ctx.beginPath();
    facet.forEach((point, pointIndex) => {
      const p = point as Vec2;
      if (pointIndex === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = facetFills[index] ?? facetFills[0]!;
    ctx.fill();
  });

  // Fine grain / regolith speckles.
  for (let index = 0; index < 190; index += 1) {
    const x = 30 + random() * 196;
    const y = 30 + random() * 196;
    const r = 0.4 + random() * 1.8;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle =
      random() > 0.6
        ? `rgba(232, 240, 255, ${0.025 + random() * 0.08})`
        : `rgba(5, 9, 17, ${0.025 + random() * 0.09})`;
    ctx.fill();
  }

  // Craters with a lit rim and a darker interior.
  const craterCount = 8 + Math.floor(random() * 5);
  for (let index = 0; index < craterCount; index += 1) {
    const x = 54 + random() * 148;
    const y = 50 + random() * 156;
    const rx = 3 + random() * 9;
    const ry = rx * (0.55 + random() * 0.35);
    const rotation = random() * TAU;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
    ctx.fillStyle = 'rgba(11, 16, 27, 0.52)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - rx * 0.2, y - ry * 0.24, rx * 0.92, ry * 0.75, rotation, 0, TAU);
    ctx.strokeStyle = 'rgba(214, 225, 244, 0.22)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.12, y + ry * 0.16, rx * 0.58, ry * 0.42, rotation, 0, TAU);
    ctx.fillStyle = 'rgba(5, 9, 16, 0.25)';
    ctx.fill();
  }

  // Hairline cracks.
  for (let index = 0; index < 3; index += 1) {
    let x = 46 + random() * 160;
    let y = 42 + random() * 166;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segments = 3 + Math.floor(random() * 3);
    for (let segment = 0; segment < segments; segment += 1) {
      x += (random() - 0.5) * 34;
      y += 9 + random() * 22;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(8, 12, 21, 0.5)';
    ctx.lineWidth = 1.15;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(224, 234, 251, 0.1)';
    ctx.lineWidth = 0.6;
    ctx.translate(0.7, -0.7);
    ctx.stroke();
    ctx.translate(-0.7, 0.7);
  }

  // Directional light from the upper left.
  const light = ctx.createLinearGradient(40, 34, 206, 222);
  light.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  light.addColorStop(0.36, 'rgba(255, 255, 255, 0.03)');
  light.addColorStop(1, 'rgba(0, 0, 0, 0.34)');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, 256, 256);

  ctx.restore();

  // Crisp rim light / terminator.
  trace();
  ctx.strokeStyle = 'rgba(226, 235, 251, 0.34)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.beginPath();
  for (let index = 0; index < Math.ceil(pointCount * 0.55); index += 1) {
    const point = points[index]!;
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  return canvas;
}

function createGlowSprite(color: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  if (!ctx) return canvas;

  const gradient = ctx.createRadialGradient(96, 96, 4, 96, 96, 94);
  gradient.addColorStop(0, hexToRgba(color, 0.5));
  gradient.addColorStop(0.28, hexToRgba(color, 0.2));
  gradient.addColorStop(0.65, hexToRgba(color, 0.05));
  gradient.addColorStop(1, hexToRgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 192, 192);
  return canvas;
}

export function initSpaceScene(): void {
  const root = document.querySelector<HTMLElement>('[data-space-scene]')!;
  if (!root) return;

  const payload = parsePayload(root);
  if (payload.length === 0) return;

  const canvas = root.querySelector<HTMLCanvasElement>('[data-scene-canvas]')!;
  const astronautEl = root.querySelector<HTMLElement>('[data-astronaut]')!;
  const panel = root.querySelector<HTMLElement>('[data-dossier]')!;
  const closeButton = root.querySelector<HTMLButtonElement>('[data-dossier-close]')!;
  const scanButton = root.querySelector<HTMLButtonElement>('[data-scan]')!;
  const scanLabel = root.querySelector<HTMLElement>('[data-scan-label]');
  const resetButton = root.querySelector<HTMLButtonElement>('[data-reset]');
  const bumpButton = root.querySelector<HTMLButtonElement>('[data-bump]');
  const progressLabel = root.querySelector<HTMLElement>('[data-progress-label]');
  const progressDots = [...root.querySelectorAll<HTMLElement>('[data-progress-dots] span')];
  const velocityLabel = root.querySelector<HTMLElement>('[data-velocity]');
  const tooltip = root.querySelector<HTMLElement>('[data-rock-tooltip]');
  const tooltipKicker = root.querySelector<HTMLElement>('[data-tooltip-kicker]');
  const tooltipTitle = root.querySelector<HTMLElement>('[data-tooltip-title]');
  const live = root.querySelector<HTMLElement>('[data-live]');
  const flash = root.querySelector<HTMLElement>('[data-impact]');
  const tether = root.querySelector<SVGSVGElement>('[data-tether]');
  const tetherPath = root.querySelector<SVGPathElement>('[data-tether-path]');
  const cardConnector = root.querySelector<SVGSVGElement>('[data-card-connector]');
  const cardConnectorPath = root.querySelector<SVGPathElement>('[data-card-connector-path]');
  const cardConnectorDot = root.querySelector<SVGCircleElement>('[data-card-connector-dot]');
  const hint = root.querySelector<HTMLElement>('.scene-hint');
  const heroCopyEl = root.querySelector<HTMLElement>('.hero-copy');
  const heroHudEl = root.querySelector<HTMLElement>('.hero-hud');

  if (!canvas || !astronautEl || !panel || !closeButton || !scanButton) return;

  const ctx = canvas.getContext('2d')!;
  if (!ctx) return;

  const panelFields = new Map<string, HTMLElement>();
  panel.querySelectorAll<HTMLElement>('[data-field]').forEach((field) => {
    if (field.dataset.field) panelFields.set(field.dataset.field, field);
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const randomSeed =
    typeof crypto !== 'undefined' && 'getRandomValues' in crypto
      ? crypto.getRandomValues(new Uint32Array(1))[0]!
      : (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  const random = mulberry32(randomSeed);
  const unlocked = loadUnlocked();
  const particles: Particle[] = [];
  const shockwaves: Shockwave[] = [];
  const sprites = Array.from({ length: 4 }, (_, index) => createRockSprite(991 + index * 7919, index));
  const glows = new Map<string, HTMLCanvasElement>();
  for (const project of payload) {
    if (!glows.has(project.accent)) glows.set(project.accent, createGlowSprite(project.accent));
  }

  const viewport = { width: 0, height: 0 };
  const world: World = {
    width: 0,
    height: 0,
    gravity: 1,
    damping: 0.9994,
    maxSpeed: 340,
    boundaryMargin: 110,
    boundaryForce: 280,
  };

  const rocks: Rock[] = [];
  const drag: DragState = {
    active: false,
    moved: false,
    offsetX: 0,
    offsetY: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velocityX: 0,
    velocityY: 0,
    startX: 0,
    startY: 0,
    startTime: 0,
    pointerId: null,
  };

  const astronaut: BodyState = {
    x: 0,
    y: 0,
    vx: 10,
    vy: -5,
    radius: 70,
    mass: 8,
    angle: 0,
    angularVelocity: 0.015,
  };
  const previousAstronaut: Vec2 = { x: 0, y: 0 };
  let attractors: Attractor[] = [];
  let home = { x: 0, y: 0 };
  let layoutReady = false;
  let activeProject: ProjectPayload | null = null;
  let activeCard: ActiveCard | null = null;
  let activeSeeker: Rock | null = null;
  let panelOpen = false;
  let paused = false;
  let heroVisible = true;
  let lastFrame = 0;
  let elapsed = 0;
  let accumulator = 0;
  let frame = 0;
  let raf = 0;
  let nextDirectorAt = 3.2;
  let lastImpactAt = -10;
  let lastShakeAt = -10;
  let revealCooldownUntil = 0;
  let hoveredRock: Rock | null = null;
  let justDraggedAt = 0;
  let ready = false;
  let completeAnnounced = false;
  const scanLabelText = root.dataset.scanLabel ?? '扫描下一个';
  const completeLabelText = root.dataset.completeLabel ?? '任务完成';
  const unlockedTemplate = root.dataset.unlockedTemplate ?? '已解锁项目：{name}。{tagline}';
  const completeMessage = root.dataset.completeMessage ?? '任务完成。所有项目档案已解锁。';
  const timeScale = { value: 1 };
  const motionBoost = 1.16;

  function setAstronautTransform(): void {
    const angle = astronaut.angle ?? 0;
    astronautEl.style.transform = `translate3d(${astronaut.x}px, ${astronaut.y}px, 0) translate(-50%, -50%) rotate(${angle}rad)`;
  }

  function updateTether(): void {
    if (!tether || !tetherPath) return;
    if (viewport.width < 680) {
      tether.style.opacity = '0';
      return;
    }
    tether.style.opacity = '1';
    const height = astronautEl.offsetHeight;
    const angle = astronaut.angle ?? 0;
    const waistOffset = height * 0.16;
    const waistX = astronaut.x + Math.sin(angle) * waistOffset;
    const waistY = astronaut.y + Math.cos(angle) * waistOffset;
    const anchorX = -40;
    const anchorY = viewport.height * 0.12;
    const controlX = viewport.width * 0.18;
    const controlY = anchorY + viewport.height * 0.14;
    tetherPath.setAttribute(
      'd',
      `M ${anchorX} ${anchorY} C ${controlX} ${controlY}, ${waistX - viewport.width * 0.1} ${waistY + 90}, ${waistX} ${waistY}`,
    );
  }

  function updateProgress(): void {
    const done = unlocked.size;
    if (progressLabel) {
      progressLabel.textContent = `${pad(done)} / ${pad(payload.length)}`;
    }
    progressDots.forEach((dot, index) => {
      const project = payload[index];
      dot.classList.toggle('is-done', Boolean(project && unlocked.has(project.slug)));
      if (project) dot.style.setProperty('--accent', project.accent);
    });
    const complete = done >= payload.length;
    if (scanButton) {
      scanButton.disabled = complete;
      if (scanLabel) scanLabel.textContent = complete ? completeLabelText : scanLabelText;
      scanButton.classList.toggle('is-complete', complete);
    }
    if (resetButton) resetButton.hidden = !complete;
    if (complete && !completeAnnounced) {
      completeAnnounced = true;
      announce(completeMessage);
    }
  }

  function announce(message: string): void {
    if (live) live.textContent = message;
  }

  function formatUpdated(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return `${date.getUTCFullYear()}.${pad(date.getUTCMonth() + 1)}`;
  }

  function openDossier(
    project: ProjectPayload,
    options: {
      focus?: boolean;
      source?: 'collision' | 'scan' | 'click';
      x?: number;
      y?: number;
      floating?: boolean;
      rock?: Rock;
    } = {},
  ): void {
    const floating = Boolean(options.floating && options.rock);
    stopActiveSeeker();
    activeProject = project;
    panelOpen = true;
    timeScale.value = floating ? 1 : 0.22;
    panel.style.setProperty('--accent', project.accent);
    panel.dataset.project = project.slug;

    const index = payload.findIndex((item) => item.slug === project.slug);
    const field = (name: string) => panelFields.get(name);
    if (field('index')) field('index')!.textContent = `FILE // ${pad(index + 1)}`;
    if (field('kicker')) field('kicker')!.textContent = project.kicker;
    if (field('title')) field('title')!.textContent = project.repoName;
    if (field('tagline')) field('tagline')!.textContent = project.tagline;
    if (field('summary')) field('summary')!.textContent = project.summary;
    if (field('language')) field('language')!.textContent = project.language;
    if (field('stars')) field('stars')!.textContent = new Intl.NumberFormat('en-US').format(project.stars);
    if (field('updated')) field('updated')!.textContent = formatUpdated(project.pushedAt);
    if (field('topics')) {
      const topics = field('topics')!;
      topics.replaceChildren(
        ...project.topics.map((topic) => {
          const span = document.createElement('span');
          span.textContent = topic;
          return span;
        }),
      );
    }
    if (field('link')) {
      const link = field('link') as HTMLAnchorElement;
      link.href = project.url;
    }
    if (field('coords')) {
      const x = options.x ?? astronaut.x;
      const y = options.y ?? astronaut.y;
      field('coords')!.textContent = `X ${pad(Math.round(x), 3)} / Y ${pad(Math.round(y), 3)}`;
    }

    if (floating && options.rock) {
      activeCard = {
        project,
        rock: options.rock,
        startedAt: performance.now(),
        pausedMs: 0,
        pausedAt: null,
        initialized: false,
        x: 0,
        y: 0,
      };
      panel.classList.add('is-floating');
      panel.style.opacity = '1';
      root.classList.add('has-floating-card');
      if (cardConnector) {
        cardConnector.style.display = 'block';
        cardConnector.style.setProperty('--card-accent', project.accent);
      }
    } else {
      activeCard = null;
      panel.classList.remove('is-floating');
      panel.style.left = '';
      panel.style.top = '';
      panel.style.opacity = '';
      root.classList.remove('has-floating-card');
      root.classList.remove('is-card-over-copy');
      if (cardConnector) cardConnector.style.display = 'none';
    }

    panel.removeAttribute('inert');
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('is-open');
    if (floating) updateFloatingCard(performance.now());
    if (!unlocked.has(project.slug)) {
      unlocked.add(project.slug);
      saveUnlocked(unlocked);
    }
    updateProgress();
    hideTooltip();
    nextDirectorAt = Math.max(nextDirectorAt, elapsed + 3);
    announce(
      unlockedTemplate
        .replace('{name}', project.repoName)
        .replace('{tagline}', project.tagline),
    );

    if (options.focus) {
      window.setTimeout(() => closeButton.focus({ preventScroll: true }), 120);
    }
  }

  function closeDossier(returnFocus = false): void {
    if (!panelOpen) return;
    panelOpen = false;
    activeProject = null;
    activeCard = null;
    panel.classList.remove('is-open');
    panel.classList.remove('is-floating');
    panel.style.left = '';
    panel.style.top = '';
    panel.style.opacity = '';
    root.classList.remove('has-floating-card');
    root.classList.remove('is-card-over-copy');
    if (cardConnector) cardConnector.style.display = 'none';
    timeScale.value = 1;
    revealCooldownUntil = Math.max(revealCooldownUntil, elapsed + 1.2);
    nextDirectorAt = elapsed + 2.8;
    if (returnFocus) {
      const focusTarget = scanButton.disabled && resetButton ? resetButton : scanButton;
      focusTarget.focus({ preventScroll: true });
    }
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('inert', '');
  }

  function spawnParticles(x: number, y: number, color: string, count: number): void {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * TAU;
      const speed = 30 + random() * 180;
      const life = 0.35 + random() * 0.65;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: 0.8 + random() * 2.4,
        color: random() > 0.72 ? '#f3f6ff' : color,
        kind: random() > 0.65 ? 'spark' : 'dot',
      });
    }
    if (particles.length > 110) particles.splice(0, particles.length - 110);
  }

  function flashAt(x: number, y: number): void {
    if (!flash) return;
    flash.style.setProperty('--impact-x', `${x}px`);
    flash.style.setProperty('--impact-y', `${y}px`);
    flash.classList.remove('is-active');
    void flash.offsetWidth;
    flash.classList.add('is-active');
    window.setTimeout(() => flash.classList.remove('is-active'), 460);
  }

  function shake(): void {
    if (elapsed - lastShakeAt < 0.75) return;
    lastShakeAt = elapsed;
    root.classList.remove('is-shaking');
    void root.offsetWidth;
    root.classList.add('is-shaking');
    window.setTimeout(() => root.classList.remove('is-shaking'), 430);
  }

  function revealProject(
    project: ProjectPayload,
    options: {
      source: 'collision' | 'scan' | 'click';
      x?: number;
      y?: number;
      focus?: boolean;
      floating?: boolean;
      rock?: Rock;
    },
  ): void {
    if (!options.focus) {
      shake();
      flashAt(options.x ?? astronaut.x, options.y ?? astronaut.y);
    }
    openDossier(project, options);
  }

  function triggerProjectCollision(rock: Rock, options: { replay?: boolean } = {}): void {
    if (!rock.project || (!options.replay && unlocked.has(rock.project.slug))) return;

    // Third-law-style reaction: the astronaut recoils away from the rock while
    // the rock is thrown outward. The rock stays alive so the repo card can ride
    // along with it instead of snapping to a fixed panel.
    const dx = rock.x - astronaut.x;
    const dy = rock.y - astronaut.y;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const nx = dx / dist;
    const ny = dy / dist;
    const tangentX = -ny;
    const tangentY = nx;
    const tangentSign = random() > 0.5 ? 1 : -1;
    astronaut.vx -= nx * 54;
    astronaut.vy -= ny * 54;
    astronaut.angularVelocity = (astronaut.angularVelocity ?? 0) + (random() - 0.5) * 0.85;
    rock.vx += nx * (132 + random() * 34) + tangentX * (24 * tangentSign);
    rock.vy += ny * (132 + random() * 34) + tangentY * (24 * tangentSign);
    rock.angularVelocity = (rock.angularVelocity ?? 0) + (random() - 0.5) * 1.8;
    if (activeSeeker === rock) activeSeeker = null;
    rock.guided = false;
    rock.guidedUntil = 0;
    rock.ignoreBoundary = false;
    rock.touching = true;
    rock.x += nx * Math.min(8, rock.radius * 0.2);
    rock.y += ny * Math.min(8, rock.radius * 0.2);

    lastImpactAt = elapsed;
    nextDirectorAt = elapsed + 4;
    spawnParticles(rock.x, rock.y, rock.project.accent, 22);
    shockwaves.push({
      x: rock.x,
      y: rock.y,
      radius: rock.radius,
      life: 0.55,
      maxLife: 0.55,
      color: rock.project.accent,
    });
    revealProject(rock.project, {
      source: 'collision',
      x: rock.x,
      y: rock.y,
      focus: false,
      floating: true,
      rock,
    });
    if (hint) hint.classList.add('is-dismissed');
  }

  function collideWithAstronaut(rock: Rock): void {
    // Let the hero settle before autonomous impacts, but never swallow a
    // deliberate drag: the hint explicitly invites the user to steer the
    // astronaut into a beacon rock.
    if (elapsed < 3 && !drag.active) return;
    const hit = sweptCircleOverlap(
      previousAstronaut,
      astronaut,
      rock.previous,
      rock,
      astronaut.radius,
      rock.radius,
    );

    if (!hit) {
      rock.touching = false;
      return;
    }

    const wasTouching = rock.touching;
    rock.touching = true;
    if (!wasTouching) rock.hits += 1;

    const project = rock.project;
    const canReveal =
      Boolean(project) &&
      project !== undefined &&
      !wasTouching &&
      !panelOpen &&
      elapsed >= revealCooldownUntil &&
      (!reduceMotion || drag.active);

    if (canReveal && project) {
      triggerProjectCollision(rock, { replay: unlocked.has(project.slug) });
      return;
    }

    const impactSpeed = Math.hypot(astronaut.vx - rock.vx, astronaut.vy - rock.vy);
    if (project && !wasTouching) {
      // Make every project rock's impact legible even when another card is
      // already open and the reveal itself has to wait.
      spawnParticles(rock.x, rock.y, project.accent, 6);
      if (shockwaves.length < 10) {
        shockwaves.push({
          x: rock.x,
          y: rock.y,
          radius: rock.radius,
          life: 0.32,
          maxLife: 0.32,
          color: project.accent,
        });
      }
    }
    resolveCollision(astronaut, rock, 0.48);
    if (impactSpeed > 80) {
      spawnParticles(rock.x, rock.y, '#9aa5c8', impactSpeed > 150 ? 8 : 4);
      if (impactSpeed > 170) shake();
    }
    if (activeSeeker === rock && !project) {
      stopActiveSeeker();
      lastImpactAt = elapsed;
      nextDirectorAt = elapsed + 1.2;
    }
    if (hint) hint.classList.add('is-dismissed');
  }

  function getAstronautStart(): Vec2 {
    if (viewport.width < 900) {
      return {
        x: viewport.width * 0.55,
        y: Math.min(viewport.height * 0.26, window.innerHeight * 0.29),
      };
    }
    if (viewport.width < 1200) {
      return {
        x: viewport.width * 0.69,
        y: viewport.height * 0.47,
      };
    }
    return {
      x: viewport.width * 0.67,
      y: viewport.height * 0.47,
    };
  }

  function makeRock(
    x: number,
    y: number,
    radius: number,
    project: ProjectPayload | undefined,
    index: number,
  ): Rock {
    const angle = random() * TAU;
    const speed = project ? 24 + random() * 30 : 18 + random() * 24;
    return {
      id: index,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      mass: project ? 1.4 : 0.6,
      angle: random() * TAU,
      angularVelocity: (random() - 0.5) * 0.55,
      variant: project ? payload.indexOf(project) % 4 : Math.floor(random() * 4),
      seed: 1000 + index * 97,
      project,
      alive: true,
      guided: false,
      guidedUntil: 0,
      seekPhase: random() * TAU,
      hits: 0,
      hovered: false,
      touching: false,
      trail: [],
      trailClock: 0,
      previous: { x, y },
    };
  }

  function createRocks(): void {
    rocks.length = 0;
    const center = {
      x: viewport.width * (viewport.width < 900 ? 0.55 : 0.58),
      y: viewport.height * (viewport.width < 900 ? 0.31 : 0.44),
    };
    const span = Math.min(viewport.width, viewport.height);
    const mobile = viewport.width < 900;

    payload.forEach((project, index) => {
      const angle = (index / payload.length) * TAU + 0.52 + (random() - 0.5) * 0.55;
      const orbit = span * (mobile ? 0.23 + random() * 0.12 : 0.28 + random() * 0.14);
      let x = center.x + Math.cos(angle) * orbit * 1.18 + (random() - 0.5) * 46;
      let y = center.y + Math.sin(angle) * orbit * 0.82 + (random() - 0.5) * 36;
      const start = getAstronautStart();
      const dx = x - start.x;
      const dy = y - start.y;
      const distance = Math.hypot(dx, dy);
      const radiusGuess = clamp(
        (mobile ? 18 : 24) * project.rockScale,
        14,
        mobile ? 34 : 46,
      );
      const minDistance = astronaut.radius + radiusGuess + 72;
      if (distance < minDistance) {
        const scale = minDistance / Math.max(1, distance);
        x = start.x + dx * scale;
        y = start.y + dy * scale;
      }
      x = clamp(x, 30, viewport.width - 30);
      y = clamp(y, 90, viewport.height - 120);
      const radius = clamp(
        (mobile ? 18 : 24) * project.rockScale,
        14,
        mobile ? 34 : 46,
      );
      rocks.push(makeRock(x, y, radius, project, index));
    });

    const ambientCount = mobile ? 4 : 7;
    for (let index = 0; index < ambientCount; index += 1) {
      const x = 40 + random() * Math.max(1, viewport.width - 80);
      const y = 110 + random() * Math.max(1, viewport.height - 220);
      const radius = 7 + random() * 11;
      rocks.push(makeRock(x, y, radius, undefined, payload.length + index));
    }
  }

  function measurePlanets(): void {
    const sceneRect = root.getBoundingClientRect();
    const next: Attractor[] = [];
    root.querySelectorAll<HTMLElement>('[data-planet]').forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0) return;
      const isMoon = element.dataset.planet === 'moon';
      next.push({
        x: rect.left + rect.width / 2 - sceneRect.left,
        y: rect.top + rect.height / 2 - sceneRect.top,
        mass: isMoon ? 6.5e4 : 1.45e6,
        softening: isMoon ? 82 : 190,
      });
    });
    attractors = next;
  }

  function resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, viewport.width < 768 ? 1.25 : 1.5);
    const width = Math.max(1, Math.round(viewport.width * dpr));
    const height = Math.max(1, Math.round(viewport.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function layout(initial = false): void {
    const previousWidth = viewport.width || 1;
    const previousHeight = viewport.height || 1;
    const rect = root.getBoundingClientRect();
    viewport.width = Math.max(320, rect.width);
    viewport.height = Math.max(560, rect.height);
    world.width = viewport.width;
    world.height = viewport.height;
    resizeCanvas();
    measurePlanets();

    const start = getAstronautStart();
    if (initial || !layoutReady) {
      astronaut.x = start.x;
      astronaut.y = start.y;
      home = { ...start };
      astronaut.radius = clamp(astronautEl.offsetWidth * 0.27, 46, 94);
      previousAstronaut.x = astronaut.x;
      previousAstronaut.y = astronaut.y;
      createRocks();
      layoutReady = true;
    } else {
      const sx = viewport.width / previousWidth;
      const sy = viewport.height / previousHeight;
      astronaut.x *= sx;
      astronaut.y *= sy;
      astronaut.vx *= sx;
      astronaut.vy *= sy;
      home = {
        x: home.x * sx,
        y: home.y * sy,
      };
      astronaut.radius = clamp(astronautEl.offsetWidth * 0.27, 46, 94);
      for (const rock of rocks) {
        rock.x *= sx;
        rock.y *= sy;
        rock.previous.x = rock.x;
        rock.previous.y = rock.y;
        rock.trail = [];
      }
    }

    astronautEl.style.left = '0px';
    astronautEl.style.top = '0px';
    astronautEl.style.position = 'absolute';
    setAstronautTransform();
    updateTether();
    if (reduceMotion) render(0);
    ready = true;
    root.dataset.ready = 'true';
  }

  function stopActiveSeeker(): void {
    if (!activeSeeker) return;
    activeSeeker.guided = false;
    activeSeeker.guidedUntil = 0;
    activeSeeker.ignoreBoundary = false;
    activeSeeker.touching = false;
    activeSeeker = null;
  }

  function pickNextAttacker(): Rock | null {
    const candidates = rocks.filter((rock) => rock.alive);
    if (candidates.length === 0) return null;
    const unseen = candidates.filter(
      (rock) => rock.project && !unlocked.has(rock.project.slug),
    );
    // Project rocks take priority so every collision can reveal a new file;
    // ambient rocks join the rotation once all eight are archived.
    const pool = unseen.length > 0 ? unseen : candidates;
    return pool[Math.floor(random() * pool.length)] ?? null;
  }

  function launchGuidedRock(candidate: Rock): void {
    if (panelOpen || drag.active || reduceMotion) return;
    stopActiveSeeker();
    const lead = 0.45;
    const angle = random() * TAU;
    const offset = 18 + random() * 22;
    const target = {
      x: astronaut.x + astronaut.vx * lead + Math.cos(angle) * offset,
      y: astronaut.y + astronaut.vy * lead + Math.sin(angle) * offset,
    };
    const dx = target.x - candidate.x;
    const dy = target.y - candidate.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = clamp(distance * 1.25, 270, 420);
    candidate.vx = (dx / distance) * speed;
    candidate.vy = (dy / distance) * speed;
    candidate.seekPhase = angle;
    candidate.guided = true;
    candidate.guidedUntil = elapsed + 5;
    candidate.ignoreBoundary = true;
    candidate.touching = false;
    candidate.trail = [];
    activeSeeker = candidate;
    nextDirectorAt = elapsed + 7;
  }

  function updateDirector(dt: number): void {
    if (reduceMotion || panelOpen || drag.active || !heroVisible) return;
    if (elapsed < nextDirectorAt) return;
    if (elapsed - lastImpactAt < 1.2) return;

    if (!activeSeeker || !activeSeeker.alive || !activeSeeker.guided) {
      const candidate = pickNextAttacker();
      if (!candidate) return;
      launchGuidedRock(candidate);
      if (!activeSeeker) return;
    }

    const rock = activeSeeker;
    if (!rock) return;
    if (elapsed > rock.guidedUntil) {
      stopActiveSeeker();
      nextDirectorAt = elapsed + 1.2;
      return;
    }

    const speed = Math.hypot(astronaut.vx, astronaut.vy) || 1;
    const perpendicularX = -astronaut.vy / speed;
    const perpendicularY = astronaut.vx / speed;
    const curve = Math.sin(elapsed * 1.6 + rock.seekPhase) * 26;
    const target = {
      x: astronaut.x + astronaut.vx * 0.22 + perpendicularX * curve,
      y: astronaut.y + astronaut.vy * 0.22 + perpendicularY * curve,
    };
    const distance = Math.max(1, Math.hypot(target.x - rock.x, target.y - rock.y));
    const finalApproach = distance < 170;
    const aimX = finalApproach ? astronaut.x : target.x;
    const aimY = finalApproach ? astronaut.y : target.y;
    const aimDx = aimX - rock.x;
    const aimDy = aimY - rock.y;
    const aimDistance = Math.max(1, Math.hypot(aimDx, aimDy));
    const desiredSpeed = clamp(aimDistance * 2.4, 280, 420);
    const desiredX = (aimDx / aimDistance) * desiredSpeed;
    const desiredY = (aimDy / aimDistance) * desiredSpeed;
    const steer = Math.min(1, dt * 3);
    rock.vx = lerp(rock.vx, desiredX, steer);
    rock.vy = lerp(rock.vy, desiredY, steer);
    if (distance < 420) rock.guidedUntil = Math.min(rock.guidedUntil, elapsed + 2.2);
  }

  function updateAstronaut(dt: number): void {
    // Tether / station-keeping spring gives the drifting pilot a home region.
    const dx = home.x - astronaut.x;
    const dy = home.y - astronaut.y;
    const distance = Math.hypot(dx, dy);
    const tension = 0.06 + clamp((distance - 60) / 240, 0, 1) * 0.5;
    astronaut.vx += clamp(dx * tension, -55, 55) * dt;
    astronaut.vy += clamp(dy * tension, -55, 55) * dt;

    stepBody(astronaut, attractors, dt, world);

    // Keep the pilot in the readable stage, even after a hard collision.
    const width = astronautEl.offsetWidth;
    const height = astronautEl.offsetHeight;
    const minX = width * 0.35 + 12;
    const maxX = viewport.width - width * 0.35 - 12;
    const minY = height * 0.46 + 76;
    const maxY = viewport.height - height * 0.3 - 62;
    if (astronaut.x < minX) {
      astronaut.x = minX;
      astronaut.vx = Math.max(0, astronaut.vx) * 0.2;
    } else if (astronaut.x > maxX) {
      astronaut.x = maxX;
      astronaut.vx = Math.min(0, astronaut.vx) * 0.2;
    }
    if (astronaut.y < minY) {
      astronaut.y = minY;
      astronaut.vy = Math.max(0, astronaut.vy) * 0.2;
    } else if (astronaut.y > maxY) {
      astronaut.y = maxY;
      astronaut.vy = Math.min(0, astronaut.vy) * 0.2;
    }

    // Keep the pilot mostly upright: a gentle idle tilt, with impacts causing a
    // damped wobble instead of a full tumble (the avatar must stay readable).
    const idleTilt = Math.sin(elapsed * 0.35) * 0.06;
    const angleError = idleTilt - (astronaut.angle ?? 0);
    astronaut.angularVelocity =
      (astronaut.angularVelocity ?? 0) * Math.pow(0.995, dt * 60) + angleError * 3.2 * dt;
    astronaut.angle = clamp((astronaut.angle ?? 0) + astronaut.angularVelocity * dt, -0.42, 0.42);
    if (Math.abs(astronaut.angle) >= 0.419) astronaut.angularVelocity *= 0.55;
  }

  function updateRocks(dt: number): void {
    for (const rock of rocks) {
      if (!rock.alive) continue;
      rock.previous.x = rock.x;
      rock.previous.y = rock.y;
      stepBody(rock, attractors, dt, world);
      if (!rock.guided) confineBody(rock, world, 18);

      // Non-active rocks stay out of the pilot's personal space. Only the
      // current attacker is allowed to reach and hit the astronaut.
      if (!rock.guided && !drag.active) {
        const dx = rock.x - astronaut.x;
        const dy = rock.y - astronaut.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const keepOut = astronaut.radius + rock.radius + 58;
        rock.touching = false;
        if (distance < keepOut) {
          const nx = dx / distance;
          const ny = dy / distance;
          rock.x = clamp(astronaut.x + nx * keepOut, 20, viewport.width - 20);
          rock.y = clamp(astronaut.y + ny * keepOut, 80, viewport.height - 60);
          const normalSpeed = rock.vx * nx + rock.vy * ny;
          if (normalSpeed < 0) {
            rock.vx -= normalSpeed * 1.5 * nx;
            rock.vy -= normalSpeed * 1.5 * ny;
          }
          rock.vx += nx * 18;
          rock.vy += ny * 18;
        }
      }

      rock.trailClock -= dt;
      if (rock.project && rock.trailClock <= 0) {
        rock.trail.push({ x: rock.x, y: rock.y });
        if (rock.trail.length > 18) rock.trail.shift();
        rock.trailClock = 0.08;
      }
    }
  }

  function updateEffects(dt: number): void {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index]!;
      particle.life -= dt;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      particle.vy += 22 * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.pow(0.988, dt * 60);
      particle.vy *= Math.pow(0.988, dt * 60);
    }

    for (let index = shockwaves.length - 1; index >= 0; index -= 1) {
      const wave = shockwaves[index]!;
      wave.life -= dt;
      if (wave.life <= 0) {
        shockwaves.splice(index, 1);
        continue;
      }
      wave.radius += 190 * dt;
    }
  }

  function update(dt: number): void {
    elapsed += dt * timeScale.value;
    previousAstronaut.x = astronaut.x;
    previousAstronaut.y = astronaut.y;

    const motionDt = dt * timeScale.value * motionBoost;
    if (!drag.active) updateAstronaut(motionDt);
    updateRocks(motionDt);
    updateDirector(dt * timeScale.value);

    let manualCandidate: Rock | null = null;
    if (!activeSeeker && drag.active) {
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const rock of rocks) {
        if (!rock.alive) continue;
        const distance = Math.hypot(rock.x - astronaut.x, rock.y - astronaut.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          manualCandidate = rock;
        }
      }
    }

    for (const rock of rocks) {
      if (!rock.alive) continue;
      if (activeSeeker) {
        if (rock !== activeSeeker) continue;
      } else if (drag.active) {
        if (rock !== manualCandidate) continue;
      } else {
        continue;
      }
      collideWithAstronaut(rock);
    }

    updateEffects(motionDt);
  }

  function updateFloatingCard(now: number): void {
    if (!activeCard || !panelOpen || !panel.classList.contains('is-floating')) return;

    const rock = activeCard.rock;
    if (!rock.alive) {
      closeDossier(false);
      return;
    }

    const margin = 12;
    const topSafe = 84;
    const gap = Math.max(18, rock.radius + 18);
    // The card must keep drifting with its rock. Only keyboard focus freezes
    // the card so it can be read and activated without it sliding away.
    const hold = panel.matches(':focus-within');
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    if (!width || !height) return;

    const mobile = viewport.width < 900;
    const sceneRect = root.getBoundingClientRect();
    const copyRect = heroCopyEl?.getBoundingClientRect();
    const hudRect = heroHudEl?.getBoundingClientRect();
    const relativeRect = (rect: DOMRect | undefined) =>
      rect
        ? {
            left: rect.left - sceneRect.left,
            top: rect.top - sceneRect.top,
            right: rect.right - sceneRect.left,
            bottom: rect.bottom - sceneRect.top,
          }
        : null;
    const copy = relativeRect(copyRect);
    const hud = relativeRect(hudRect);

    const overlapArea = (x: number, y: number, rect: { left: number; top: number; right: number; bottom: number } | null) => {
      if (!rect) return 0;
      const overlapW = Math.max(0, Math.min(x + width, rect.right) - Math.max(x, rect.left));
      const overlapH = Math.max(0, Math.min(y + height, rect.bottom) - Math.max(y, rect.top));
      return overlapW * overlapH;
    };

    const rockRect = {
      left: rock.x - rock.radius,
      top: rock.y - rock.radius,
      right: rock.x + rock.radius,
      bottom: rock.y + rock.radius,
    };
    const astroRadius = astronaut.radius * 1.05;
    const overlapWithAstronaut = (x: number, y: number) => {
      const nearestX = clamp(astronaut.x, x, x + width);
      const nearestY = clamp(astronaut.y, y, y + height);
      return Math.max(
        0,
        astroRadius - Math.hypot(astronaut.x - nearestX, astronaut.y - nearestY),
      );
    };

    const candidates = [
      { x: rock.x + rock.radius + gap, y: rock.y - height * 0.5, preference: 0 },
      { x: rock.x - width - rock.radius - gap, y: rock.y - height * 0.5, preference: 1 },
      { x: rock.x - width * 0.5, y: rock.y + rock.radius + gap, preference: 2 },
      { x: rock.x - width * 0.5, y: rock.y - height - rock.radius - gap, preference: 3 },
    ].map((candidate) => {
      const x = clamp(candidate.x, margin, Math.max(margin, viewport.width - width - margin));
      const y = clamp(candidate.y, topSafe, Math.max(topSafe, viewport.height - height - margin));
      const fits =
        x >= margin &&
        y >= topSafe &&
        x + width <= viewport.width - margin &&
        y + height <= viewport.height - margin;
      const copyPenalty = mobile ? 0 : overlapArea(x, y, copy) * 18;
      const hudPenalty = mobile ? 0 : overlapArea(x, y, hud) * 10;
      const astronautPenalty = mobile ? 0 : overlapWithAstronaut(x, y) * 6;
      const rockPenalty = overlapArea(x, y, rockRect) * 35;
      return {
        x,
        y,
        fits,
        score:
          copyPenalty +
          hudPenalty +
          astronautPenalty +
          rockPenalty +
          candidate.preference * 2,
      };
    });

    const fitting = candidates.filter((candidate) => candidate.fits);
    const chosen = (fitting.length > 0 ? fitting : candidates).sort(
      (a, b) => a.score - b.score,
    )[0]!;
    const targetX = chosen.x;
    const targetY = chosen.y;

    if (!activeCard.initialized) {
      activeCard.x = targetX;
      activeCard.y = targetY;
      activeCard.initialized = true;
    } else if (!hold) {
      activeCard.x = lerp(activeCard.x, targetX, 0.24);
      activeCard.y = lerp(activeCard.y, targetY, 0.24);
    }

    panel.style.left = `${activeCard.x}px`;
    panel.style.top = `${activeCard.y}px`;

    if (mobile && copy) {
      const overlapsCopy = overlapArea(activeCard.x, activeCard.y, copy) > 0;
      root.classList.toggle('is-card-over-copy', overlapsCopy);
    }

    if (cardConnector && cardConnectorPath && cardConnectorDot) {
      const cardCenterX = activeCard.x + width * 0.5;
      const cardCenterY = activeCard.y + height * 0.5;
      const dx = rock.x - cardCenterX;
      const dy = rock.y - cardCenterY;
      const edgeScale = Math.min(
        Math.abs(dx) > 0.001 ? width * 0.5 / Math.abs(dx) : Number.POSITIVE_INFINITY,
        Math.abs(dy) > 0.001 ? height * 0.5 / Math.abs(dy) : Number.POSITIVE_INFINITY,
      );
      const edgeX = cardCenterX + dx * (Number.isFinite(edgeScale) ? edgeScale : 0);
      const edgeY = cardCenterY + dy * (Number.isFinite(edgeScale) ? edgeScale : 0);
      cardConnectorPath.setAttribute('d', `M ${edgeX} ${edgeY} L ${rock.x} ${rock.y}`);
      cardConnectorDot.setAttribute('cx', String(rock.x));
      cardConnectorDot.setAttribute('cy', String(rock.y));
    }

    if (hold && activeCard.pausedAt === null) activeCard.pausedAt = now;
    if (!hold && activeCard.pausedAt !== null) {
      activeCard.pausedMs += now - activeCard.pausedAt;
      activeCard.pausedAt = null;
    }

    const effectiveNow = activeCard.pausedAt ?? now;
    const age = effectiveNow - activeCard.startedAt - activeCard.pausedMs;
    const fadeStart = 6200;
    const lifetime = 9800;
    const opacity =
      age <= fadeStart ? 1 : clamp(1 - (age - fadeStart) / (lifetime - fadeStart), 0, 1);
    panel.style.opacity = String(opacity);

    if (age >= lifetime) {
      closeDossier(false);
      return;
    }

    if (
      rock.x < -rock.radius * 2 ||
      rock.x > viewport.width + rock.radius * 2 ||
      rock.y < -rock.radius * 2 ||
      rock.y > viewport.height + rock.radius * 2
    ) {
      closeDossier(false);
    }
  }

  function syncVisuals(): void {
    setAstronautTransform();
    updateTether();
    updateFloatingCard(performance.now());
    frame += 1;
    if (velocityLabel && frame % 6 === 0) {
      velocityLabel.textContent = `${Math.hypot(astronaut.vx, astronaut.vy).toFixed(1)} px/s`;
    }
  }

  function render(now: number): void {
    ctx.clearRect(0, 0, viewport.width, viewport.height);

    for (const rock of rocks) {
      if (!rock.alive) continue;
      drawRock(rock, now);
    }

    for (const wave of shockwaves) {
      const progress = 1 - wave.life / wave.maxLife;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius + progress * 34, 0, TAU);
      ctx.strokeStyle = hexToRgba(wave.color, (1 - progress) * 0.55);
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    for (const particle of particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;
      if (particle.kind === 'spark') {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = particle.size * 0.55;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx * 0.035, particle.y - particle.vy * 0.035);
        ctx.stroke();
      } else {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

  }

  function drawRock(rock: Rock, now: number): void {
    const project = rock.project;
    const isDone = project ? unlocked.has(project.slug) : false;
    const sprite = sprites[rock.variant] ?? sprites[0]!;
    const size = rock.radius * 3.35;
    const pulse = 0.5 + Math.sin(now * 0.0025 + rock.id) * 0.5;

    if (project && !isDone) {
      const glow = glows.get(project.accent);
      if (glow) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55 + pulse * 0.18;
        ctx.drawImage(glow, rock.x - rock.radius * 4.2, rock.y - rock.radius * 4.2, rock.radius * 8.4, rock.radius * 8.4);
        ctx.restore();
      }

      if (rock.trail.length > 1) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(rock.trail[0]!.x, rock.trail[0]!.y);
        for (let index = 1; index < rock.trail.length; index += 1) {
          ctx.lineTo(rock.trail[index]!.x, rock.trail[index]!.y);
        }
        ctx.strokeStyle = hexToRgba(project.accent, 0.2);
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(rock.x, rock.y);
    ctx.rotate(rock.angle ?? 0);
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();

    if (project && !isDone) {
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.beginPath();
      ctx.arc(0, 0, rock.radius * 1.42 + pulse * 2.2, 0, TAU);
      ctx.strokeStyle = hexToRgba(project.accent, 0.28 + pulse * 0.25);
      ctx.lineWidth = 0.8;
      ctx.setLineDash([2.5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = hexToRgba(project.accent, 0.9);
      ctx.beginPath();
      ctx.arc(0, -rock.radius * 1.55, 1.3, 0, TAU);
      ctx.fill();

      ctx.font = `600 ${Math.max(9, rock.radius * 0.78)}px "JetBrains Mono Variable", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = hexToRgba(project.accent, 0.9);
      ctx.fillText(project.glyph, 0, rock.radius * 0.12);
      ctx.restore();
    }

    if (activeCard?.rock === rock) {
      ctx.save();
      ctx.translate(rock.x, rock.y);
      ctx.beginPath();
      ctx.arc(0, 0, rock.radius * 1.7, 0, TAU);
      ctx.strokeStyle = hexToRgba(rock.project?.accent ?? '#7de3e0', 0.7);
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 5]);
      ctx.stroke();
      ctx.restore();
    }

    if (rock.hovered && project) {
      drawHoverBrackets(rock);
    }
  }

  function drawHoverBrackets(rock: Rock): void {
    if (!rock.project) return;
    const size = rock.radius * 1.9;
    const corner = Math.max(4, rock.radius * 0.4);
    ctx.save();
    ctx.strokeStyle = hexToRgba(rock.project.accent, 0.85);
    ctx.lineWidth = 1;
    for (const [sx, sy] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const) {
      ctx.beginPath();
      ctx.moveTo(rock.x + sx * size - sx * corner, rock.y + sy * size);
      ctx.lineTo(rock.x + sx * size, rock.y + sy * size);
      ctx.lineTo(rock.x + sx * size, rock.y + sy * size - sy * corner);
      ctx.stroke();
    }
    ctx.restore();
  }

  function loop(timestamp: number): void {
    if (!lastFrame) lastFrame = timestamp;
    const delta = Math.min(0.05, (timestamp - lastFrame) / 1000);
    lastFrame = timestamp;

    if (!paused && heroVisible && !document.hidden) {
      accumulator += delta;
      const step = 1 / 120;
      let iterations = 0;
      while (accumulator >= step && iterations < 8) {
        update(step);
        accumulator -= step;
        iterations += 1;
      }
      syncVisuals();
      render(timestamp);
    }

    raf = window.requestAnimationFrame(loop);
  }

  function hideTooltip(): void {
    if (!tooltip) return;
    tooltip.hidden = true;
    if (hoveredRock) hoveredRock.hovered = false;
    hoveredRock = null;
  }

  function showTooltip(rock: Rock): void {
    if (!tooltip || !rock.project) return;
    if (hoveredRock && hoveredRock !== rock) hoveredRock.hovered = false;
    hoveredRock = rock;
    rock.hovered = true;
    tooltip.style.left = `${rock.x}px`;
    tooltip.style.top = `${rock.y - rock.radius * 1.5}px`;
    tooltip.style.setProperty('--accent', rock.project.accent);
    if (tooltipKicker) tooltipKicker.textContent = `PROJECT // ${pad(rock.project.index + 1)}`;
    if (tooltipTitle) tooltipTitle.textContent = rock.project.repoName;
    tooltip.hidden = false;
  }

  function findHoveredRock(x: number, y: number): Rock | undefined {
    let best: Rock | undefined;
    let bestDistance = Infinity;
    for (const rock of rocks) {
      if (!rock.alive || !rock.project) continue;
      if (unlocked.has(rock.project.slug)) continue;
      const distance = Math.hypot(rock.x - x, rock.y - y);
      const threshold = rock.radius * 1.7 + 12;
      if (distance <= threshold && distance < bestDistance) {
        best = rock;
        bestDistance = distance;
      }
    }
    return best;
  }

  function sceneCoordinates(event: PointerEvent): Vec2 {
    const rect = root.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerMove(event: PointerEvent): void {
    if (panelOpen || drag.active) {
      hideTooltip();
      return;
    }
    const point = sceneCoordinates(event);
    const target = event.target as HTMLElement | null;
    if (target?.closest('a, button, summary, [data-dossier], .hero-copy, .hero-hud')) {
      hideTooltip();
      return;
    }
    const rock = findHoveredRock(point.x, point.y);
    if (rock) showTooltip(rock);
    else hideTooltip();
  }

  function onPointerLeave(): void {
    hideTooltip();
  }

  function onScenePointerUp(event: PointerEvent): void {
    if (panelOpen || drag.active) return;
    if (performance.now() - justDraggedAt < 180) return;
    if (!hoveredRock?.project) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('a, button, summary, [data-dossier], [data-astronaut], .hero-copy, .hero-hud')) return;
    const project = hoveredRock.project;
    const rock = hoveredRock;
    hideTooltip();
    spawnParticles(rock.x, rock.y, project.accent, 18);
    shockwaves.push({
      x: rock.x,
      y: rock.y,
      radius: rock.radius,
      life: 0.45,
      maxLife: 0.45,
      color: project.accent,
    });
    rock.alive = false;
    openDossier(project, {
      source: 'click',
      x: rock.x,
      y: rock.y,
      focus: true,
    });
    if (hint) hint.classList.add('is-dismissed');
  }

  function onAstronautPointerDown(event: PointerEvent): void {
    if (reduceMotion || panelOpen) return;
    if (event.button !== 0) return;
    event.preventDefault();
    const point = sceneCoordinates(event);
    drag.active = true;
    drag.moved = false;
    drag.startTime = performance.now();
    drag.lastTime = performance.now();
    drag.lastX = point.x;
    drag.lastY = point.y;
    drag.startX = point.x;
    drag.startY = point.y;
    drag.offsetX = astronaut.x - point.x;
    drag.offsetY = astronaut.y - point.y;
    drag.velocityX = 0;
    drag.velocityY = 0;
    drag.pointerId = event.pointerId;
    astronautEl.classList.add('is-dragging');
    hideTooltip();
    if (hint) hint.classList.add('is-dismissed');
    try {
      astronautEl.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is unavailable in a few embedded browsers.
    }
  }

  function onAstronautPointerMove(event: PointerEvent): void {
    if (!drag.active || event.pointerId !== drag.pointerId) return;
    const point = sceneCoordinates(event);
    const nextX = clamp(point.x + drag.offsetX, 30, viewport.width - 30);
    const nextY = clamp(point.y + drag.offsetY, 90, viewport.height - 80);
    const now = performance.now();
    const dt = Math.max(0.008, (now - drag.lastTime) / 1000);
    drag.velocityX = (nextX - drag.lastX) / dt;
    drag.velocityY = (nextY - drag.lastY) / dt;
    drag.lastX = nextX;
    drag.lastY = nextY;
    drag.lastTime = now;
    astronaut.x = nextX;
    astronaut.y = nextY;
    if (Math.hypot(point.x - drag.startX, point.y - drag.startY) > 5) {
      drag.moved = true;
    }
    setAstronautTransform();
    updateTether();
  }

  function onAstronautPointerUp(event: PointerEvent): void {
    if (!drag.active || event.pointerId !== drag.pointerId) return;
    const wasTap = !drag.moved && performance.now() - drag.startTime < 280;
    drag.active = false;
    drag.pointerId = null;
    astronautEl.classList.remove('is-dragging');
    justDraggedAt = performance.now();
    nextDirectorAt = elapsed + 3.5;
    if (wasTap) {
      astronaut.vx += 26;
      astronaut.vy -= 18;
      astronaut.angularVelocity = (astronaut.angularVelocity ?? 0) + 0.12;
    } else {
      astronaut.vx = clamp(drag.velocityX, -430, 430);
      astronaut.vy = clamp(drag.velocityY, -430, 430);
    }
    try {
      astronautEl.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  }

  function onScan(): void {
    if (panelOpen) return;
    const candidate = pickUnseenProject(rocks, unlocked);
    const project = candidate?.project ?? payload.find((item) => !unlocked.has(item.slug));
    if (!project) return;
    const rock = candidate;
    if (rock) {
      // Keep the project rock in orbit after it has been scanned. It is now
      // archived, but the scene should not lose its collision bodies — this is
      // also what lets BUMP replay a file after all eight have been unlocked.
      spawnParticles(rock.x, rock.y, project.accent, 16);
      shockwaves.push({
        x: rock.x,
        y: rock.y,
        radius: rock.radius,
        life: 0.5,
        maxLife: 0.5,
        color: project.accent,
      });
    }
    openDossier(project, {
      source: 'scan',
      focus: true,
      x: rock?.x ?? astronaut.x,
      y: rock?.y ?? astronaut.y,
    });
    if (hint) hint.classList.add('is-dismissed');
  }

  function onReset(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    window.location.reload();
  }

  function triggerBump(): void {
    if (panelOpen) return;
    stopActiveSeeker();
    const unseen = pickUnseenProject(rocks, unlocked);
    const projectRocks = rocks.filter((rock) => rock.alive && rock.project);
    const candidate =
      unseen ??
      (projectRocks.length > 0
        ? projectRocks[Math.floor(random() * projectRocks.length)]
        : null);
    if (!candidate?.project) return;

    const replay = unlocked.has(candidate.project.slug);
    candidate.x = astronaut.x + 50;
    candidate.y = astronaut.y;
    candidate.previous.x = candidate.x;
    candidate.previous.y = candidate.y;
    candidate.touching = false;
    triggerProjectCollision(candidate, { replay });
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && panelOpen) {
      closeDossier(true);
    }
  }

  function onVisibility(): void {
    if (document.hidden) {
      lastFrame = 0;
      accumulator = 0;
    } else {
      lastFrame = 0;
    }
  }

  function initObservers(): void {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          heroVisible = entry.isIntersecting;
          paused = !heroVisible;
          lastFrame = 0;
          accumulator = 0;
        },
        { threshold: 0.02 },
      );
      observer.observe(root);
    }

    const resizeObserver = new ResizeObserver(() => {
      window.cancelAnimationFrame(raf);
      layout();
      if (reduceMotion) return;
      lastFrame = 0;
      raf = window.requestAnimationFrame(loop);
    });
    resizeObserver.observe(root);
  }

  function bindEvents(): void {
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerleave', onPointerLeave);
    root.addEventListener('pointerup', onScenePointerUp);
    astronautEl.addEventListener('pointerdown', onAstronautPointerDown);
    astronautEl.addEventListener('pointermove', onAstronautPointerMove);
    astronautEl.addEventListener('pointerup', onAstronautPointerUp);
    astronautEl.addEventListener('pointercancel', onAstronautPointerUp);
    scanButton.addEventListener('click', onScan);
    bumpButton?.addEventListener('click', triggerBump);
    resetButton?.addEventListener('click', onReset);
    closeButton.addEventListener('click', () => closeDossier(true));
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
  }

  function exposeDebugApi(): void {
    window.__ORBIT_SCENE__ = {
      reveal: (slug: string) => {
        const project = payload.find((item) => item.slug === slug);
        if (!project) return false;
        openDossier(project, { source: 'scan', focus: true });
        return true;
      },
      revealNext: () => {
        onScan();
        return true;
      },
      close: () => closeDossier(false),
      forceCollision: () => {
        if (panelOpen) return false;
        stopActiveSeeker();
        const candidate = pickUnseenProject(rocks, unlocked);
        if (!candidate?.project) return false;
        candidate.x = astronaut.x + 50;
        candidate.y = astronaut.y;
        candidate.previous.x = candidate.x;
        candidate.previous.y = candidate.y;
        candidate.touching = false;
        triggerProjectCollision(candidate);
        return true;
      },
      bump: () => {
        triggerBump();
        return true;
      },
      targets: () =>
        rocks
          .filter((rock) => rock.alive && rock.project)
          .map((rock) => ({
            slug: rock.project!.slug,
            x: Math.round(rock.x),
            y: Math.round(rock.y),
            r: Math.round(rock.radius),
            hits: rock.hits,
            unlocked: unlocked.has(rock.project!.slug),
          })),
      state: () => ({
        ready,
        paused,
        reduced: reduceMotion,
        progress: unlocked.size,
        total: payload.length,
        active: activeProject?.slug ?? null,
        seeker: activeSeeker?.project?.slug ?? (activeSeeker ? 'ambient' : null),
        nextDirectorIn: Math.max(0, +(nextDirectorAt - elapsed).toFixed(1)),
        floating: Boolean(activeCard),
        rocks: rocks.filter((rock) => rock.alive).length,
        width: viewport.width,
        height: viewport.height,
      }),
    };
  }

  layout(true);
  updateProgress();
  bindEvents();
  initObservers();
  exposeDebugApi();

  if (reduceMotion) {
    ready = true;
    render(0);
  } else {
    raf = window.requestAnimationFrame(loop);
  }

  window.addEventListener(
    'pagehide',
    () => {
      window.cancelAnimationFrame(raf);
    },
    { once: true },
  );
}

declare global {
  interface Window {
    __ORBIT_SCENE__?: {
      reveal: (slug: string) => boolean;
      revealNext: () => boolean;
      close: () => void;
      forceCollision: () => boolean;
      bump: () => boolean;
      targets: () => { slug: string; x: number; y: number; r: number; hits: number; unlocked: boolean }[];
      state: () => {
        ready: boolean;
        paused: boolean;
        reduced: boolean;
        progress: number;
        total: number;
        active: string | null;
        rocks: number;
        width: number;
        height: number;
      };
    };
  }
}
