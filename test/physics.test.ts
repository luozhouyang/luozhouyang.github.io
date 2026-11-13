import { describe, expect, it } from 'vitest';
import {
  boundaryAcceleration,
  gravitationalAcceleration,
  limitSpeed,
  mulberry32,
  pickUnseenProject,
  resolveCollision,
  stepBody,
  sweptCircleOverlap,
  type Attractor,
  type BodyState,
} from '../src/scripts/physics';

const attractor: Attractor = { x: 0, y: 0, mass: 1_000_000, softening: 100 };
const world = { width: 1200, height: 800, gravity: 1, maxSpeed: 240 };

function body(overrides: Partial<BodyState> = {}): BodyState {
  return {
    x: 400,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 20,
    mass: 1,
    ...overrides,
  };
}

describe('gravity', () => {
  it('pulls toward an attractor', () => {
    const acceleration = gravitationalAcceleration({ x: 400, y: 0 }, [attractor], 1);
    expect(acceleration.x).toBeLessThan(0);
    expect(Math.abs(acceleration.y)).toBeLessThan(1e-9);
  });

  it('weakens with distance', () => {
    const near = gravitationalAcceleration({ x: 200, y: 0 }, [attractor], 1);
    const far = gravitationalAcceleration({ x: 800, y: 0 }, [attractor], 1);
    expect(Math.abs(near.x)).toBeGreaterThan(Math.abs(far.x));
  });

  it('stays finite at the centre thanks to softening', () => {
    const acceleration = gravitationalAcceleration({ x: 0, y: 0 }, [attractor], 1);
    expect(Number.isFinite(acceleration.x)).toBe(true);
    expect(Number.isFinite(acceleration.y)).toBe(true);
  });

  it('pushes a body back inside the frame', () => {
    const acceleration = boundaryAcceleration({ x: 5, y: 400 }, world);
    expect(acceleration.x).toBeGreaterThan(0);
    expect(acceleration.y).toBe(0);
  });

  it('caps runaway velocity', () => {
    const object = body({ vx: 10_000, vy: 0 });
    limitSpeed(object, 300);
    expect(Math.hypot(object.vx, object.vy)).toBeCloseTo(300);
  });

  it('moves a body toward the attractor', () => {
    const object = body({ x: 500, y: 0 });
    for (let index = 0; index < 120; index += 1) {
      stepBody(object, [attractor], 1 / 60, world);
    }
    expect(object.x).toBeLessThan(500);
    expect(Number.isFinite(object.x)).toBe(true);
  });
});

describe('collision', () => {
  it('detects a fast circle crossing another circle', () => {
    const hit = sweptCircleOverlap(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 80 },
      { x: 50, y: -80 },
      10,
      10,
    );
    expect(hit).toBe(true);
  });

  it('ignores a clean miss', () => {
    const hit = sweptCircleOverlap(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 50, y: 300 },
      { x: 50, y: -100 },
      4,
      4,
    );
    expect(hit).toBe(false);
  });

  it('separates overlapping bodies and applies an impulse', () => {
    const a = body({ x: 0, y: 0, vx: 10, radius: 20, mass: 2 });
    const b = body({ x: 30, y: 0, vx: -4, radius: 20, mass: 1 });
    resolveCollision(a, b, 0.5);
    expect(a.x).toBeLessThan(0);
    expect(b.x).toBeGreaterThan(30);
    expect(b.vx).toBeGreaterThan(-4);
  });
});

describe('director helpers', () => {
  it('picks a project that has not been unlocked yet', () => {
    const rocks = [
      { project: { slug: 'seen' }, alive: true },
      { project: { slug: 'new' }, alive: true },
      { project: { slug: 'gone' }, alive: false },
    ];
    const picked = pickUnseenProject(rocks, ['seen']);
    expect(picked?.project.slug).toBe('new');
  });

  it('produces a deterministic pseudo-random stream', () => {
    const first = mulberry32(42);
    const second = mulberry32(42);
    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });
});
