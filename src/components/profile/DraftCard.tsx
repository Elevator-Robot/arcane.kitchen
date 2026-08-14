import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { Draft } from '../../types/profile';

type Props = {
  draft: Draft;
  onContinue?: (id: Draft['id']) => void;
  onOptions?: (id: Draft['id']) => void;
};

export default function DraftCard({ draft, onContinue, onOptions }: Props) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-50 flex-shrink-0">
          {draft.image ? (
            <img src={draft.image} alt={draft.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-[#1c1917]">{draft.title}</h3>
          <p className="text-xs text-gray-500">Last edited {draft.lastEdited}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={() => onContinue?.(draft.id)} className="px-4 py-2 bg-[#faf6f3] text-[#8c5a35] border border-[#e2d5c8] rounded-lg text-sm font-medium hover:bg-[#f3ebe4]">Continue editing</button>
        <button onClick={() => onOptions?.(draft.id)} className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><MoreHorizontal className="w-5 h-5" /></button>
      </div>
    </div>
  );
}
