import '@testing-library/jest-dom';
import { expect, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Ensure development mode for React
beforeAll(() => {
  process.env.NODE_ENV = 'development';
});

// Add matchers to Vitest
expect.extend(matchers);

// Mock localStorage for Node.js test environment
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
};

Object.defineProperty(globalThis, 'localStorage', {
  value: createStorageMock(),
  writable: true,
  configurable: true,
});

// Cleanup after each test
afterEach(() => {
  cleanup();
  if (globalThis.localStorage) {
    globalThis.localStorage.clear();
  }
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // Suppress debug logs during tests
  log: console.log, // Keep logs for golden test
  warn: () => {},
  error: () => {},
};
