import { MERLIN_PALETTE } from '../../theme/merlinPalette';

export type TabKey = 'recipes' | 'drafts' | 'saved';

type Props = {
  active: TabKey;
  draftsCount?: number;
  savedCount?: number;
  onChange: (t: TabKey) => void;
};

export default function NavigationTabs({ active, draftsCount = 0, savedCount = 0, onChange }: Props) {
  const tabColors: Record<TabKey, string> = {
    recipes: MERLIN_PALETTE[7],
    drafts: MERLIN_PALETTE[1],
    saved: MERLIN_PALETTE[5],
  };
  const tabClass = (key: TabKey) =>
    `flex items-center gap-2 py-4 px-3 text-sm font-semibold transition ${active === key ? 'border-b-2' : 'text-gray-500 hover:text-gray-700'}`;

  return (
    <div className="border-t border-gray-100 px-4 py-2">
      <div className="flex items-center justify-center gap-8">
        <button type="button" onClick={() => onChange('recipes')} className={tabClass('recipes')} style={active === 'recipes' ? { color: tabColors.recipes, borderColor: tabColors.recipes } : undefined}>
          <span className="">Recipes</span>
        </button>

        <button type="button" onClick={() => onChange('drafts')} className={tabClass('drafts')} style={active === 'drafts' ? { color: tabColors.drafts, borderColor: tabColors.drafts } : undefined}>
          <span>Drafts</span>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{draftsCount}</span>
        </button>

        <button type="button" onClick={() => onChange('saved')} className={tabClass('saved')} style={active === 'saved' ? { color: tabColors.saved, borderColor: tabColors.saved } : undefined}>
          <span>Saved</span>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{savedCount}</span>
        </button>
      </div>
    </div>
  );
}
