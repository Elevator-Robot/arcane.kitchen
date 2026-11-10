import { Check, Feather } from 'lucide-react';
import type { RecipeDraft } from '../utils/recipeDrafts';

export default function RecipeReadiness({
  draft,
  hasPhoto,
}: {
  draft: RecipeDraft;
  hasPhoto: boolean;
}) {
  const items = [
    {
      label: 'A name',
      done: Boolean(draft.name.trim()),
      target: 'recipe-essentials-heading',
    },
    { label: 'A photo', done: hasPhoto, target: 'recipe-essentials-heading' },
    {
      label: 'Ingredients',
      done: draft.ingredients.some((i) => i.name.trim()),
      target: 'recipe-ingredients-heading',
    },
    {
      label: 'A method',
      done: draft.instructions.some((step) => step.trim()),
      target: 'recipe-method-heading',
    },
  ];
  return (
    <div className="ak-recipe-readiness">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          <Feather size={15} aria-hidden="true" /> Your recipe, taking shape
        </span>
        <span>{items.filter((i) => i.done).length} / 4</span>
      </div>
      <div className="ak-readiness-items">
        {items.map((item, index) => (
          <button
            key={item.label}
            type="button"
            className={item.done ? 'is-ready' : ''}
            onClick={() => {
              const heading = document.getElementById(item.target);
              heading?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              heading
                ?.closest('section')
                ?.querySelector<
                  HTMLInputElement | HTMLTextAreaElement
                >('input, textarea')
                ?.focus({ preventScroll: true });
            }}
            aria-label={`${item.label}: ${item.done ? 'added' : 'not yet added'}. Go to section.`}
          >
            <span>
              {item.done ? <Check size={12} aria-hidden="true" /> : index + 1}
            </span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
