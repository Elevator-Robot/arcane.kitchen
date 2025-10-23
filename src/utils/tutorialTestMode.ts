/**
 * Testing utility to simulate tutorial states for demonstration
 * This file is only for testing purposes and would not be needed in production
 */

export interface TestTutorialState {
  isAuthenticated: boolean;
  tutorialComplete: boolean;
  userName: string;
}

// Test modes for demonstrating different tutorial states
export const TEST_MODES = {
  // Show tutorial for authenticated user who hasn't completed it
  SHOW_TUTORIAL: {
    isAuthenticated: true,
    tutorialComplete: false,
    userName: 'Test Kitchen Witch',
  },
  // Skip tutorial for authenticated user who has completed it
  SKIP_TUTORIAL: {
    isAuthenticated: true,
    tutorialComplete: true,
    userName: 'Experienced Witch',
  },
  // Regular onboarding for unauthenticated user
  REGULAR_FLOW: {
    isAuthenticated: false,
    tutorialComplete: false,
    userName: '',
  },
} as const;

// Enable test mode only in development by setting this to one of the TEST_MODES
// In production builds, this is always null
export const CURRENT_TEST_MODE: TestTutorialState | null =
  import.meta.env.MODE === 'development' ? null : null;
// Change the first null to one of these for testing in development:
// TEST_MODES.SHOW_TUTORIAL;
// TEST_MODES.SKIP_TUTORIAL;
// TEST_MODES.REGULAR_FLOW;
