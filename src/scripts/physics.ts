export interface Vec2 {
  x: number;
  y: number;
}

export interface Attractor extends Vec2 {
  mass: number;
  softening: number;
}

export interface BodyState extends Vec2 {
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  angle?: number;
  angularVelocity?: number;
  ignoreBoundary?: boolean;
}

export interface World {
  width: number;
  height: number;
  gravity?: number;
  damping?: number;
  maxSpeed?: number;
  boundaryMargin?: number;
  boundaryForce?: number;
}

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const lerp = (from: number, to: number, amount: number): number =>
  from + (to - from) * amount;

export function gravitationalAcceleration(
  position: Vec2,
  attractors: Attractor[],
  gravity = 1,
): Vec2 {
  let ax = 0;
  let ay = 0;

  for (const attractor of attractors) {
    const dx = attractor.x - position.x;
    const dy = attractor.y - position.y;
    const distSq = dx * dx + dy * dy;
    const softSq = attractor.softening * attractor.softening;
    const denominator = Math.pow(distSq + softSq, 1.5);
    if (denominator === 0) continue;
    const factor = (gravity * attractor.mass) / denominator;
    ax += dx * factor;
    ay += dy * factor;
  }

  return { x: ax, y: ay };
}

export function boundaryAcceleration(
  position: Vec2,
  world: World,
): Vec2 {
  const margin = world.boundaryMargin ?? 110;
  const force = world.boundaryForce ?? 260;
  let ax = 0;
  let ay = 0;

  if (position.x < margin) {
    ax += force * clamp(1 - position.x / margin, 0, 2);
  } else if (position.x > world.width - margin) {
    ax -= force * clamp(1 - (world.width - position.x) / margin, 0, 2);
  }

  if (position.y < margin) {
    ay += force * clamp(1 - position.y / margin, 0, 2);
  } else if (position.y > world.height - margin) {
    ay -= force * clamp(1 - (world.height - position.y) / margin, 0, 2);
  }

  return { x: ax, y: ay };
}

export function limitSpeed(body: BodyState, maxSpeed: number): void {
  const speedSq = body.vx * body.vx + body.vy * body.vy;
  if (speedSq <= maxSpeed * maxSpeed) return;
  const scale = maxSpeed / Math.sqrt(speedSq);
  body.vx *= scale;
  body.vy *= scale;
}

export function stepBody(
  body: BodyState,
  attractors: Attractor[],
  dt: number,
  world: World,
): void {
  const gravity = world.gravity ?? 1;
  const acceleration = gravitationalAcceleration(body, attractors, gravity);

  if (!body.ignoreBoundary) {
    const boundary = boundaryAcceleration(body, world);
    acceleration.x += boundary.x;
    acceleration.y += boundary.y;
  }

  body.vx += acceleration.x * dt;
  body.vy += acceleration.y * dt;

  const damping = Math.pow(world.damping ?? 0.9995, dt * 60);
  body.vx *= damping;
  body.vy *= damping;
  limitSpeed(body, world.maxSpeed ?? 280);

  body.x += body.vx * dt;
  body.y += body.vy * dt;

  if (body.angle !== undefined) {
    body.angularVelocity = (body.angularVelocity ?? 0) * Math.pow(0.999, dt * 60);
    body.angle += body.angularVelocity * dt;
  }
}

export function confineBody(body: BodyState, world: World, pad = 16): void {
  if (body.x < pad) {
    body.x = pad;
    body.vx = Math.abs(body.vx) * 0.35;
  } else if (body.x > world.width - pad) {
    body.x = world.width - pad;
    body.vx = -Math.abs(body.vx) * 0.35;
  }

  if (body.y < pad) {
    body.y = pad;
    body.vy = Math.abs(body.vy) * 0.35;
  } else if (body.y > world.height - pad) {
    body.y = world.height - pad;
    body.vy = -Math.abs(body.vy) * 0.35;
  }
}

export interface SweptCircle {
  x: number;
  y: number;
  radius: number;
}

/**
 * Returns true when two moving circles overlap at any point between now (t=0)
 * and the next frame (t=1). This prevents fast project rocks from tunnelling
 * through the astronaut.
 */
export function sweptCircleOverlap(
  aStart: Vec2,
  aEnd: Vec2,
  bStart: Vec2,
  bEnd: Vec2,
  aRadius: number,
  bRadius: number,
): boolean {
  const radius = aRadius + bRadius;
  const radiusSq = radius * radius;

  const relativeStartX = bStart.x - aStart.x;
  const relativeStartY = bStart.y - aStart.y;

  if (
    relativeStartX * relativeStartX + relativeStartY * relativeStartY <=
    radiusSq
  ) {
    return true;
  }

  const relativeMoveX = bEnd.x - bStart.x - (aEnd.x - aStart.x);
  const relativeMoveY = bEnd.y - bStart.y - (aEnd.y - aStart.y);
  const moveSq =
    relativeMoveX * relativeMoveX + relativeMoveY * relativeMoveY;

  if (moveSq === 0) return false;

  const t = clamp(
    -(relativeStartX * relativeMoveX + relativeStartY * relativeMoveY) /
      moveSq,
    0,
    1,
  );

  const closestX = relativeStartX + relativeMoveX * t;
  const closestY = relativeStartY + relativeMoveY * t;
  return closestX * closestX + closestY * closestY <= radiusSq;
}

export function resolveCollision(
  a: BodyState,
  b: BodyState,
  restitution = 0.45,
): void {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distSq = dx * dx + dy * dy;
  const radius = a.radius + b.radius;

  if (distSq > radius * radius || distSq === 0) return;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = radius - dist;
  const totalInverseMass = 1 / a.mass + 1 / b.mass;

  if (totalInverseMass > 0) {
    const aShare = 1 / a.mass / totalInverseMass;
    const bShare = 1 / b.mass / totalInverseMass;
    a.x -= nx * overlap * aShare;
    a.y -= ny * overlap * aShare;
    b.x += nx * overlap * bShare;
    b.y += ny * overlap * bShare;
  }

  const relativeVelocityX = b.vx - a.vx;
  const relativeVelocityY = b.vy - a.vy;
  const normalVelocity = relativeVelocityX * nx + relativeVelocityY * ny;

  if (normalVelocity > 0) return;

  const impulse =
    (-(1 + restitution) * normalVelocity) / totalInverseMass;
  a.vx -= (impulse * nx) / a.mass;
  a.vy -= (impulse * ny) / a.mass;
  b.vx += (impulse * nx) / b.mass;
  b.vy += (impulse * ny) / b.mass;

  a.angularVelocity = (a.angularVelocity ?? 0) - normalVelocity * 0.001;
  b.angularVelocity = (b.angularVelocity ?? 0) + normalVelocity * 0.001;
}

export function pickUnseenProject<T extends { project?: { slug: string } }>(
  rocks: T[],
  unlocked: Iterable<string>,
): T | undefined {
  const unlockedSet = new Set(unlocked);
  return rocks.find(
    (rock) => rock.project && !unlockedSet.has(rock.project.slug) && (rock as T & { alive?: boolean }).alive !== false,
  );
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
}
