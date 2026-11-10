import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecipeCookingGuide from '../RecipeCookingGuide';

const recipe = {
  recipeId: 'bread',
  ingredients: ['500 g flour', '7 g yeast'],
  instructions: ['Knead the dough.', 'Bake for 35 minutes.'],
};

describe('cooking companion', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('always shows progress and keeps reversible checks when reopening a recipe', async () => {
    const user = userEvent.setup();
    const view = render(<RecipeCookingGuide {...recipe} />);
    expect(
      screen.getByRole('progressbar', { name: 'Cooking progress' })
    ).toHaveAttribute('value', '0');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '500 g flour' }));
    await user.click(
      screen.getByRole('checkbox', { name: 'Step 1: Knead the dough.' })
    );
    expect(
      screen.getByRole('progressbar', { name: 'Cooking progress' })
    ).toHaveAttribute('value', '1');
    view.unmount();

    render(<RecipeCookingGuide {...recipe} />);
    expect(screen.getByRole('checkbox', { name: '500 g flour' })).toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Step 1: Knead the dough.' })
    ).toBeChecked();
    await user.click(
      screen.getByRole('checkbox', { name: 'Step 2: Bake for 35 minutes.' })
    );
    expect(screen.getByText(/2 of 2 steps complete/)).toBeInTheDocument();
    await user.click(
      screen.getByRole('checkbox', { name: 'Step 1: Knead the dough.' })
    );
    expect(
      screen.getByRole('checkbox', { name: 'Step 1: Knead the dough.' })
    ).not.toBeChecked();
    expect(
      screen.getByRole('progressbar', { name: 'Cooking progress' })
    ).toHaveAttribute('value', '1');
    expect(screen.getByRole('checkbox', { name: '500 g flour' })).toBeChecked();
  });

  it('does not carry completed steps across recipes or revised instructions', async () => {
    const user = userEvent.setup();
    const view = render(<RecipeCookingGuide {...recipe} />);
    await user.click(
      screen.getByRole('checkbox', { name: 'Step 1: Knead the dough.' })
    );
    view.rerender(<RecipeCookingGuide {...recipe} recipeId="other-bread" />);
    expect(
      screen.getByRole('progressbar', { name: 'Cooking progress' })
    ).toHaveAttribute('value', '0');
    view.unmount();
    render(
      <RecipeCookingGuide {...recipe} instructions={['Mix, rest, and bake.']} />
    );
    expect(
      screen.getByRole('progressbar', { name: 'Cooking progress' })
    ).toHaveAttribute('value', '0');
  });

  it('still works when stored progress is malformed', () => {
    sessionStorage.setItem('arcaneKitchen.cooking.bread', '{broken');
    render(<RecipeCookingGuide {...recipe} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    expect(
      screen.getByRole('checkbox', { name: 'Step 1: Knead the dough.' })
    ).toBeEnabled();
  });
});
