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
    expect(screen.getByText('Discover recipes')).toBeInTheDocument();
    expect(screen.getByText('Create a recipe post')).toBeInTheDocument();
    expect(screen.getByText('Ready for the feed')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("e.g., Grandma's Apple Pie")
    ).toBeInTheDocument();
  });

  it('updates the post preview as recipe fields change', async () => {
    const user = userEvent.setup();
    render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

    const nameInput = screen.getByPlaceholderText("e.g., Grandma's Apple Pie");
    await user.type(nameInput, 'Roasted Corn Salad');

    expect(
      screen.getByRole('heading', { name: 'Roasted Corn Salad' })
    ).toBeInTheDocument();
  });

  it('allows ingredients to be added and removed', async () => {
    const user = userEvent.setup();
    render(<RecipeBuilder {...defaultRecipeBuilderProps} />);

    const addButtons = screen.getAllByRole('button', { name: 'Add' });
    await user.click(addButtons[0]);
    const ingredientFields = screen.getAllByLabelText('Ingredient');

    expect(ingredientFields).toHaveLength(2);

    await user.click(screen.getAllByLabelText('Remove ingredient')[1]);

    expect(screen.getAllByLabelText('Ingredient')).toHaveLength(1);
  });

  it('prompts unauthenticated users to sign in before creating', () => {
    render(<RecipeBuilder {...unauthenticatedRecipeBuilderProps} />);

    expect(
      screen.getAllByRole('button', { name: 'Log in to create' })[0]
    ).toBeInTheDocument();
    expect(
      screen.getByText('Start publishing your own recipes')
    ).toBeInTheDocument();
  });
});
