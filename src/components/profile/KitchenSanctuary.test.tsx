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
  kitchenIdentity: {
    ...DEFAULT_KITCHEN_IDENTITY,
    calling: 'dough-artificer' as const,
    pantry: ['Garlic'],
  },
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
      screen.queryByRole('button', { name: 'Change sanctuary' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Edit Forest mushroom soup' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Secret draft')).not.toBeInTheDocument();
    expect(screen.queryByText('Private favorite')).not.toBeInTheDocument();
    for (const name of [
      'Change birthsign',
      'Change familiar',
      'Edit main quest',
      'Edit side quest',
      'Pin recipe',
    ]) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expect(
      screen.getByText('2 shared recipes · 11 community saves')
    ).toBeInTheDocument();
    expect(
      document.querySelector('img[src*="garden-light.webp"]')
    ).toHaveAttribute('src', expect.stringContaining('garden-light.webp'));
    expect(screen.queryByText('Kitchen sanctuary')).not.toBeInTheDocument();
    expect(
      screen.queryByText('The hearth remembers what the world forgets.')
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'moon_cook', level: 1 })
    ).toHaveClass('truncate', 'whitespace-nowrap');
    expect(
      screen.getByRole('heading', { name: 'A note from the cook', level: 2 })
    ).toBeInTheDocument();
    expect(screen.queryByText('Moon cook')).not.toBeInTheDocument();
    expect(screen.queryByText('The Wanderer')).not.toBeInTheDocument();
    expect(screen.queryByText('The Garden')).not.toBeInTheDocument();
    expect(screen.queryByText('From this kitchen')).not.toBeInTheDocument();
    const familiarSection = screen
      .getByRole('heading', { name: 'Kitchen familiar' })
      .closest('section');
    expect(
      familiarSection?.querySelector('.ak-color-scheme-image-dark')
    ).toHaveAttribute('src', expect.stringContaining('salem-dark.webp'));
    expect(
      familiarSection?.querySelector('.ak-color-scheme-image-light')
    ).toHaveAttribute('src', expect.stringContaining('salem-light.webp'));
  });

  it('switches between published and private saved collections without profile drafts', async () => {
    const interaction = userEvent.setup();
    const share = vi.fn();
    render(
      <UserProfileView
        user={user}
        publishedRecipes={recipes}
        savedRecipes={[{ id: 'saved', title: 'Saved supper' }]}
        draftRecipes={[{ id: 'draft', title: 'Private draft' }]}
        onShareProfile={share}
      />
    );
    const navigation = within(
      screen.getByRole('navigation', { name: 'Your recipe collections' })
    );
    expect(navigation.getAllByRole('button')).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: 'Drafts' })
    ).not.toBeInTheDocument();
    await interaction.click(navigation.getByRole('button', { name: 'Saved' }));
    expect(screen.getByText('Saved supper')).toBeInTheDocument();
    expect(screen.queryByText('Forest mushroom soup')).not.toBeInTheDocument();
    await interaction.click(
      navigation.getByRole('button', { name: 'Recipes' })
    );
    expect(screen.getByText('Forest mushroom soup')).toBeInTheDocument();
    const shareButton = screen.getByRole('button', { name: 'Share profile' });
    expect(shareButton.closest('.isolate')).toContainElement(
      screen.getByRole('heading', { name: 'moon_cook' })
    );
    await interaction.click(shareButton);
    expect(share).toHaveBeenCalledOnce();
    await interaction.click(
      screen.getByRole('button', { name: 'update avatar' })
    );
    const picker = within(screen.getByRole('dialog', { name: 'Who are you?' }));
    expect(
      picker.queryByRole('button', { name: /^witch$/i })
    ).not.toBeInTheDocument();
    expect(picker.getByRole('button', { name: 'juniper' })).toBeInTheDocument();
  });

  it('edits named identities without pantry controls and preserves legacy pantry data', async () => {
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
      screen.getByRole('button', { name: 'Change birthsign' })
    );
    let dialog = within(
      screen.getByRole('dialog', { name: 'Choose your birthsign' })
    );
    expect(dialog.queryByLabelText('Tenet')).not.toBeInTheDocument();
    expect(
      dialog.getByRole('button', { name: 'The Mage' })
    ).toBeInTheDocument();
    await interaction.click(dialog.getByRole('button', { name: 'The Raven' }));
    expect(dialog.getByRole('button', { name: 'The Raven' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(dialog.queryByLabelText('Main quest')).not.toBeInTheDocument();
    await interaction.click(
      dialog.getByRole('button', { name: 'Save changes' })
    );
    expect(save).toHaveBeenLastCalledWith({
      ...user.kitchenIdentity,
      theme: 'grove',
    });
    await interaction.click(
      screen.getByRole('button', { name: 'Change sanctuary' })
    );
    dialog = within(
      screen.getByRole('dialog', { name: 'Choose your sanctuary' })
    );
    const sanctuaries = [
      ['The Library', 'library'],
      ['The Cottage', 'cottage'],
      ['The Inn', 'inn'],
      ['The Garden', 'garden'],
      ['The Observatory', 'observatory'],
      ['The Manor', 'manor'],
    ] as const;
    sanctuaries.forEach(([name, filename]) => {
      const choice = dialog.getByRole('button', { name });
      expect(
        choice.querySelector('.ak-color-scheme-image-dark')
      ).toHaveAttribute(
        'src',
        expect.stringContaining(`${filename}-dark.webp`)
      );
      expect(
        choice.querySelector('.ak-color-scheme-image-light')
      ).toHaveAttribute(
        'src',
        expect.stringContaining(`${filename}-light.webp`)
      );
    });
    const innChoice = dialog.getByRole('button', { name: 'The Inn' });
    await interaction.click(innChoice);
    expect(
      dialog.queryByRole('button', { name: 'Vesper' })
    ).not.toBeInTheDocument();
    await interaction.click(
      dialog.getByRole('button', { name: 'Save changes' })
    );
    expect(save).toHaveBeenLastCalledWith({
      ...user.kitchenIdentity,
      calling: 'herb-druid',
    });
    await interaction.click(
      screen.getByRole('button', { name: 'Edit main quest' })
    );
    await interaction.type(
      screen.getByLabelText('Main quest'),
      'Master mushroom ramen'
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Save changes' })
    );
    expect(save).toHaveBeenLastCalledWith({
      ...user.kitchenIdentity,
      quest: 'Master mushroom ramen',
    });
    await interaction.click(
      screen.getByRole('button', { name: 'Edit side quest' })
    );
    await interaction.type(
      screen.getByLabelText('Side quest'),
      'Perfect a sesame broth'
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Save changes' })
    );
    expect(save).toHaveBeenLastCalledWith({
      ...user.kitchenIdentity,
      sideQuest: 'Perfect a sesame broth',
    });
    await interaction.click(screen.getByRole('button', { name: 'Pin recipe' }));
    dialog = within(screen.getByRole('dialog', { name: 'Pin a recipe' }));
    expect(screen.queryByText('Pantry of curiosities')).not.toBeInTheDocument();
    expect(dialog.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(
      dialog.queryByRole('button', { name: 'Salem' })
    ).not.toBeInTheDocument();
    await interaction.selectOptions(
      dialog.getByRole('combobox', { name: 'Pin a signature creation' }),
      'soup'
    );
    await interaction.click(
      dialog.getByRole('button', { name: 'Save changes' })
    );
    expect(save).toHaveBeenLastCalledWith({
      ...user.kitchenIdentity,
      signatureRecipeId: 'soup',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Profile changes saved'
    );
  });

  it('changes familiars from their own picker and retains failed selections for retry', async () => {
    const interaction = userEvent.setup();
    const save = vi
      .fn()
      .mockRejectedValueOnce(new Error('failed'))
      .mockResolvedValue(undefined);
    render(
      <UserProfileView
        user={user}
        publishedRecipes={recipes}
        onSaveKitchenIdentity={save}
      />
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Change familiar' })
    );
    const dialog = within(
      screen.getByRole('dialog', { name: 'Choose your familiar' })
    );
    for (const name of ['Salem', 'Veyr', 'Orin', 'Vesper', 'Morrow', 'Luna']) {
      expect(dialog.getByRole('button', { name })).toBeInTheDocument();
    }
    await interaction.click(dialog.getByRole('button', { name: 'Vesper' }));
    await interaction.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(save).not.toHaveBeenCalled();
    await interaction.click(
      screen.getByRole('button', { name: 'Change familiar' })
    );
    expect(screen.getByRole('button', { name: 'Salem' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await interaction.click(screen.getByRole('button', { name: 'Vesper' }));
    await interaction.click(
      screen.getByRole('button', { name: 'Save changes' })
    );
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vesper' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Save changes' })
    );
    expect(save).toHaveBeenLastCalledWith({
      ...user.kitchenIdentity,
      familiar: 'fox',
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('resets only the field in the focused editor', async () => {
    const interaction = userEvent.setup();
    const save = vi.fn().mockResolvedValue(undefined);
    const identity = {
      ...user.kitchenIdentity,
      quest: 'Bake bread',
      sideQuest: 'Gather herbs',
      signatureRecipeId: 'soup',
    };
    render(
      <UserProfileView
        user={{ ...user, kitchenIdentity: identity }}
        publishedRecipes={recipes}
        onSaveKitchenIdentity={save}
      />
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Edit main quest' })
    );
    await interaction.click(screen.getByRole('button', { name: 'Reset' }));
    await interaction.click(
      screen.getByRole('button', { name: 'Save changes' })
    );
    expect(save).toHaveBeenCalledWith({
      ...identity,
      quest: DEFAULT_KITCHEN_IDENTITY.quest,
    });
  });

  it('keeps a long bio usable while editing', async () => {
    const interaction = userEvent.setup();
    const longBio = 'A record of kitchen lore. '.repeat(19).trim();
    render(
      <UserProfileView
        user={{ ...user, bio: longBio }}
        publishedRecipes={recipes}
      />
    );

    await interaction.click(screen.getByRole('button', { name: 'edit bio' }));
    const bio = screen.getByLabelText('bio');
    expect(bio).toHaveValue(longBio);
    expect(bio).toHaveAttribute('maxlength', '500');
    expect(bio).toHaveFocus();
    expect(bio).toHaveClass('ak-bio-text', 'h-full');
    expect(bio.parentElement?.querySelector('p')).toHaveTextContent(longBio);
    expect(screen.getByText(`${longBio.length}/500`)).toBeInTheDocument();
    await interaction.clear(bio);
    await interaction.type(bio, 'A new chapter');
    expect(bio.parentElement?.querySelector('p')).toHaveTextContent(
      'A new chapter'
    );
    await interaction.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('bio')).not.toBeInTheDocument();
    expect(screen.getByText(longBio, { exact: false })).toBeInTheDocument();
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
      screen.getByRole('button', { name: 'Edit main quest' })
    );
    await interaction.type(
      screen.getByLabelText('Main quest'),
      'Unsaved magic'
    );
    await interaction.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(save).not.toHaveBeenCalled();
    await interaction.click(
      screen.getByRole('button', { name: 'Edit main quest' })
    );
    expect(screen.getByLabelText('Main quest')).toHaveValue('');
    await interaction.type(
      screen.getByLabelText('Main quest'),
      'Keep this idea'
    );
    await interaction.click(
      screen.getByRole('button', { name: 'Save changes' })
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not be saved'
    );
    expect(screen.getByLabelText('Main quest')).toHaveValue('Keep this idea');
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
