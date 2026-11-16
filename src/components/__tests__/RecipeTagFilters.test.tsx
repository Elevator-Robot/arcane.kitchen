import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import RecipeTagFilters from '../RecipeTagFilters';

it('keeps every selected overflow tag available to deselect or clear after collapsing', async () => {
  function Example() {
    const [selected, setSelected] = useState<Map<string, string>>(
      () => new Map()
    );
    return (
      <RecipeTagFilters
        tags={Array.from({ length: 14 }, (_, i) => ({
          label: `Tag ${i + 1}`,
          count: 1,
        }))}
        selected={selected}
        onSelect={(tag) =>
          setSelected((current) => {
            const next = new Map(current);
            const key = tag.toLowerCase();
            if (next.has(key)) next.delete(key);
            else next.set(key, '#6d28d9');
            return next;
          })
        }
        onClear={() => setSelected(new Map())}
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
  const other = screen.getByRole('button', { name: 'Filter by Tag 13' });
  other.focus();
  await user.keyboard(' ');
  await user.click(screen.getByRole('button', { name: 'Show fewer tags' }));
  const selected = screen.getByRole('button', { name: 'Filter by Tag 14' });
  expect(selected).toHaveAttribute('aria-pressed', 'true');
  expect(other).toHaveAttribute('aria-pressed', 'true');
  await user.click(selected);
  expect(
    screen.queryByRole('button', { name: 'Filter by Tag 14' })
  ).not.toBeInTheDocument();
  expect(other).toHaveAttribute('aria-pressed', 'true');
  await user.click(screen.getByRole('button', { name: 'Clear tag filters' }));
  expect(
    screen.queryByRole('button', { name: 'Filter by Tag 13' })
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole('button', { name: 'Clear tag filters' })
  ).not.toBeInTheDocument();
});
