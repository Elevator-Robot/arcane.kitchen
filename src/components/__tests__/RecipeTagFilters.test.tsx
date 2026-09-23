import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import RecipeTagFilters from '../RecipeTagFilters';

it('keeps a selected community tag available to deselect after collapsing the list', async () => {
  function Example() {
    const [selected, setSelected] = useState<string | null>(null);
    return (
      <RecipeTagFilters
        tags={Array.from({ length: 14 }, (_, i) => ({
          label: `Tag ${i + 1}`,
          count: 1,
        }))}
        selected={selected}
        selectedColor="#6d28d9"
        onSelect={(tag) =>
          setSelected((current) =>
            current === tag.toLowerCase() ? null : tag.toLowerCase()
          )
        }
      />
    );
  }
  const user = userEvent.setup();
  render(<Example />);
  expect(
    screen.queryByRole('button', { name: 'Filter by Tag 14' })
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Show all 14 tags' }));
  await user.click(screen.getByRole('button', { name: 'Filter by Tag 14' }));
  await user.click(screen.getByRole('button', { name: 'Show fewer tags' }));
  const selected = screen.getByRole('button', { name: 'Filter by Tag 14' });
  expect(selected).toHaveAttribute('aria-pressed', 'true');
  await user.click(selected);
  expect(
    screen.queryByRole('button', { name: 'Filter by Tag 14' })
  ).not.toBeInTheDocument();
});
