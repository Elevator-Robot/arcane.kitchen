import React from 'react';

export type TabKey = 'recipes' | 'drafts' | 'liked';

type Props = {
  active: TabKey;
  draftsCount?: number;
  likedCount?: number;
  onChange: (t: TabKey) => void;
};

export default function NavigationTabs({ active, draftsCount = 0, likedCount = 0, onChange }: Props) {
  const tabClass = (key: TabKey) =>
    `flex items-center gap-2 py-4 px-3 text-sm font-semibold ${active === key ? 'text-[#b85c38] border-b-2 border-[#b85c38]' : 'text-gray-500 hover:text-gray-700'}`;

  return (
    <div className="bg-white rounded-t-2xl px-4 py-2 shadow-sm border-b border-gray-100 mb-6">
      <div className="flex items-center justify-center gap-8">
        <button type="button" onClick={() => onChange('recipes')} className={tabClass('recipes')}>
          <span className="">Recipes</span>
        </button>

        <button type="button" onClick={() => onChange('drafts')} className={tabClass('drafts')}>
          <span>Drafts</span>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{draftsCount}</span>
        </button>

        <button type="button" onClick={() => onChange('liked')} className={tabClass('liked')}>
          <span>Liked</span>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{likedCount}</span>
        </button>
      </div>
    </div>
  );
}
