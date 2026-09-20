import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../test/test-utils';
import UserProfileView from '../UserProfileView';
import { DEFAULT_KITCHEN_IDENTITY } from '../../utils/kitchenIdentity';

const user = {
  id: 'cook-1',
  name: 'Moon cook',
  handle: 'moon_cook',
  kitchenIdentity: { ...DEFAULT_KITCHEN_IDENTITY, pantry: ['Garlic'] },
};
const recipes = [
  { id: 'soup', title: 'Forest mushroom soup', saves: 7 },
  { id: 'bread', title: 'Starlight sourdough', saves: 4 },
];

describe('kitchen sanctuary profiles', () => {
  it('removes public tabs and keeps private data and controls private', () => {
    render(
      <UserProfileView
        user={user}
        publishedRecipes={recipes}
        isOwnProfile={false}
        draftRecipes={[{ id: 'secret', title: 'Secret draft' }]}
        savedRecipes={[{ id: 'private', title: 'Private favorite' }]}
        onRecipeOptions={vi.fn()}
        onSaveKitchenIdentity={vi.fn()}
      />
    );
    expect(
      screen.queryByRole('navigation', { name: 'Your recipe collections' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Recipes' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Customize sanctuary' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Edit Forest mushroom soup' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Secret draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Private favorite')).not.toBeInTheDocument();
    expect(
      screen.getByText('2 shared recipes · 11 community saves')
    ).toBeInTheDocument();
  });

  it('edits fantasy choices, limits pantry picks, and saves them together', async () => {
    const interaction = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    render(
      <UserProfileView
        user={user}
        publishedRecipes={recipes}
        onSaveKitchenIdentity={save}
      />
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Customize sanctuary' })
    );
    const dialog = within(
      screen.getByRole('dialog', { name: 'Customize your kitchen sanctuary' })
    );
    await interaction.click(
      dialog.getByRole('button', { name: 'Enchanted grove' })
    );
    await interaction.click(dialog.getByRole('button', { name: 'Herb Druid' }));
    await interaction.click(
      dialog.getByRole('button', { name: 'Foraging fox' })
    );
    await interaction.type(
      dialog.getByLabelText('Your kitchen motto'),
      'Forage. Feast. Repeat.'
    );
    await interaction.type(
      dialog.getByLabelText('Current cooking quest'),
      'Master mushroom ramen'
    );
    await interaction.click(dialog.getByRole('checkbox', { name: 'Rosemary' }));
    await interaction.click(dialog.getByRole('checkbox', { name: 'Honey' }));
    expect(dialog.getByRole('checkbox', { name: 'Lemon' })).toBeDisabled();
    await interaction.selectOptions(
      dialog.getByRole('combobox', { name: 'Pin a signature creation' }),
      'soup'
    );
    await interaction.click(
      dialog.getByRole('button', { name: 'Save sanctuary' })
    );
    expect(save).toHaveBeenCalledWith({
      theme: 'grove',
      calling: 'herb-druid',
      familiar: 'fox',
      motto: 'Forage. Feast. Repeat.',
      quest: 'Master mushroom ramen',
      pantry: ['Garlic', 'Rosemary', 'Honey'],
      signatureRecipeId: 'soup',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Sanctuary saved');
  });

  it('discards canceled edits and keeps failed saves available to retry', async () => {
    const interaction = userEvent.setup();
    const save = vi.fn().mockRejectedValue(new Error('backend failed'));
    render(
      <UserProfileView
        user={user}
        publishedRecipes={recipes}
        onSaveKitchenIdentity={save}
      />
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Customize sanctuary' })
    );
    await interaction.type(
      screen.getByLabelText('Your kitchen motto'),
      'Unsaved magic'
    );
    await interaction.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(save).not.toHaveBeenCalled();
    await interaction.click(
      screen.getByRole('button', { name: 'Customize sanctuary' })
    );
    expect(screen.getByLabelText('Your kitchen motto')).toHaveValue('');
    await interaction.type(
      screen.getByLabelText('Your kitchen motto'),
      'Keep this idea'
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Save sanctuary' })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not be saved'
    );
    expect(screen.getByLabelText('Your kitchen motto')).toHaveValue(
      'Keep this idea'
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('only features a published recipe belonging to the displayed collection', async () => {
    const interaction = userEvent.setup();
    const open = vi.fn();
    const { rerender } = render(
      <UserProfileView
        user={{
          ...user,
          kitchenIdentity: {
            ...user.kitchenIdentity,
            signatureRecipeId: 'soup',
          },
        }}
        publishedRecipes={recipes}
        isOwnProfile={false}
        onOpenRecipe={open}
      />
    );
    await interaction.click(
      screen.getByRole('button', { name: /Signature creation/ })
    );
    expect(open).toHaveBeenCalledWith('soup');
    rerender(
      <UserProfileView
        user={{
          ...user,
          kitchenIdentity: {
            ...user.kitchenIdentity,
            signatureRecipeId: 'someone-elses-recipe',
          },
        }}
        publishedRecipes={recipes}
        isOwnProfile={false}
      />
    );
    expect(
      screen.queryByText('Signature creation · pinned by the cook')
    ).not.toBeInTheDocument();
  });
});
