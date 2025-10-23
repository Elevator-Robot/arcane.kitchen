import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Mock user objects for testing
export const mockAuthenticatedUser = {
  username: 'testuser',
  attributes: {
    email: 'test@example.com',
    'custom:magicalSpecialty': 'healing',
  },
};

export const mockUserAttributes = {
  email: 'test@example.com',
  'custom:magicalSpecialty': 'healing',
};

// Default props for RecipeBuilder tests
export const defaultRecipeBuilderProps = {
  isAuthenticated: true,
  currentUser: mockAuthenticatedUser,
  userAttributes: mockUserAttributes,
};

export const unauthenticatedRecipeBuilderProps = {
  isAuthenticated: false,
  currentUser: null,
  userAttributes: null,
};

// Custom render function if we need providers later
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { ...options });

export * from '@testing-library/react';
export { customRender as render };
