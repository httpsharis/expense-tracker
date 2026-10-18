declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export interface Matchers<T> {
    toBe(expected: unknown): void;
    toEqual(expected: unknown): void;
    toContain(expected: unknown): void;
    toThrow(expectedMessage?: string | RegExp): void;
    toBeNull(): void;
    toBeUndefined(): void;
    toBeDefined(): void;
    toBeTruthy(): void;
    toBeFalsy(): void;
    toHaveLength(expected: number): void;
    toBeGreaterThan(expected: number): void;
    toBeGreaterThanOrEqual(expected: number): void;
    toBeLessThan(expected: number): void;
    toBeLessThanOrEqual(expected: number): void;
    not: Matchers<T>;
    rejects: Matchers<T>;
    resolves: Matchers<T>;
  }
  export function expect<T = unknown>(actual: T): Matchers<T>;
}
