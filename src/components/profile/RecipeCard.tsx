import React from 'react';
import { Heart, MessageCircle, Bookmark, MoreVertical } from 'lucide-react';
import type { Recipe } from '../../types/profile';

type Props = {
  recipe: Recipe;
  onToggleFavorite?: (id: Recipe['id']) => void;
  onOptions?: (id: Recipe['id']) => void;
  onClick?: (id: Recipe['id']) => void;
};

export default function RecipeCard({ recipe, onToggleFavorite, onOptions, onClick }: Props) {
  return (
    <div onClick={() => onClick?.(recipe.id)} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col cursor-pointer">
      <div className="relative h-48 w-full">
        <img src={recipe.image || '/api/placeholder/400/300'} alt={recipe.title} className="w-full h-full object-cover" />
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(recipe.id); }} className="absolute top-3 right-3 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition">
          <Heart className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-[#1c1917] line-clamp-2 mb-1">{recipe.title}</h3>
          <p className="text-xs text-gray-500 mb-4">{recipe.time}</p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Heart className="w-4 h-4 text-rose-500" /> {recipe.likes ?? 0}</span>
            <span className="flex items-center gap-1"><MessageCircle className="w-4 h-4" /> {recipe.comments ?? 0}</span>
            <span className="flex items-center gap-1"><Bookmark className="w-4 h-4" /> {recipe.saves ?? 0}</span>
          </div>

          <button onClick={(e) => { e.stopPropagation(); onOptions?.(recipe.id); }} className="p-1 hover:bg-gray-50 rounded text-gray-500"><MoreVertical className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  );
}
