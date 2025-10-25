import '@testing-library/jest-dom';
import { expect, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Ensure development mode for React
beforeAll(() => {
  process.env.NODE_ENV = 'development';
});

// Add matchers to Vitest
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock console methods to avoid noise in tests
global.console = {
  ...console,
  // Suppress debug logs during tests
  log: console.log, // Keep logs for golden test
  warn: () => {},
  error: () => {},
};
