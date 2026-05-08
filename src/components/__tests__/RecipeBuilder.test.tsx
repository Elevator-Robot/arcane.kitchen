import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeBuilder from '../RecipeBuilder';
import {
  render,
  defaultRecipeBuilderProps,
  unauthenticatedRecipeBuilderProps,
} from '../../test/test-utils';

describe('RecipeBuilder Component', () => {
  it('renders the social recipe workspace', () => {
    render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

    expect(screen.getByText('Arcane Kitchen')).toBeInTheDocument();
    expect(screen.getByText('What cooks are making')).toBeInTheDocument();
    expect(screen.getByText('Build a shareable post')).toBeInTheDocument();
    expect(screen.getByText('Ready for the feed')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Summer Tomato Toasts')).toBeInTheDocument();
  });

  it('updates the post preview as recipe fields change', async () => {
    const user = userEvent.setup();
    render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

    const nameInput = screen.getByDisplayValue('Summer Tomato Toasts');
    await user.clear(nameInput);
    await user.type(nameInput, 'Roasted Corn Salad');

    expect(
      screen.getByRole('heading', { name: 'Roasted Corn Salad' })
    ).toBeInTheDocument();
  });

  it('allows ingredients to be added and removed', async () => {
    const user = userEvent.setup();
    render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

    await user.click(screen.getByRole('button', { name: 'Add' }));
    const ingredientFields = screen.getAllByLabelText('Ingredient');

    expect(ingredientFields).toHaveLength(4);

    await user.click(screen.getAllByLabelText('Remove ingredient')[3]);

    expect(screen.getAllByLabelText('Ingredient')).toHaveLength(3);
  });

  it('shows guest preview mode when the user is unauthenticated', () => {
    render(<RecipeBuilder {...unauthenticatedRecipeBuilderProps} />);

    expect(
      screen.getByRole('button', { name: 'Preview as guest' })
    ).toBeInTheDocument();
  });
});
