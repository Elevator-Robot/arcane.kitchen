import { ArrowUpRight, Clock3, Pencil, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import CookAvatar from './ui/CookAvatar';
import RecipeImage from './ui/RecipeImage';
import { getProfileRoutePath } from '../utils/userProfiles';
import { formatRecipeTime } from '../utils/recipeDisplay';

export type FeaturedRecipeSummary = {
  id: string;
  name: string;
  description: string;
  image: string;
  time: string;
  author: string;
  authorHandle?: string;
  authorAvatar?: string;
};

type Cook = {
  userId: string;
  username: string;
  avatar?: string;
  recipes: number;
};

export default function CommunityHearth({
  cooks,
  featuredRecipe,
  onOpenFeatured,
  onSelectAuthor,
  canManageFeature = false,
  manageFeaturePath = '/admin',
  collectionPath,
  onRequestAuth,
}: {
  cooks: Cook[];
  featuredRecipe: FeaturedRecipeSummary | null;
  onOpenFeatured: (recipeId: string) => void;
  onSelectAuthor: (username: string) => void;
  canManageFeature?: boolean;
  manageFeaturePath?: string;
  collectionPath?: string;
  onRequestAuth?: () => void;
}) {
  return (
    <aside className="ak-community-hearth" aria-label="Community hearth">
      {featuredRecipe && (
        <section className="ak-featured-recipe" aria-label="Featured recipe">
          <div className="ak-featured-heading">
            <p className="ak-eyebrow">
              <Sparkles size={13} aria-hidden="true" /> Featured recipe
            </p>
            {canManageFeature && (
              <Link
                to={manageFeaturePath}
                aria-label="Manage featured recipe"
                title="Manage featured recipe"
              >
                <Pencil size={14} aria-hidden="true" />
              </Link>
            )}
          </div>
          <button
            type="button"
            className="ak-featured-photo ak-recipe-media"
            onClick={() => onOpenFeatured(featuredRecipe.id)}
            aria-label={`Open featured recipe: ${featuredRecipe.name}`}
          >
            <RecipeImage
              src={featuredRecipe.image}
              alt=""
              className="h-full w-full object-cover"
            />
          </button>
          <div className="ak-featured-body">
            <h2>
              <button
                type="button"
                onClick={() => onOpenFeatured(featuredRecipe.id)}
              >
                {featuredRecipe.name}
              </button>
            </h2>
            {featuredRecipe.authorHandle ? (
              <button
                type="button"
                className="ak-author-link"
                onClick={() => onSelectAuthor(featuredRecipe.authorHandle!)}
              >
                <CookAvatar
                  name={featuredRecipe.author}
                  avatar={featuredRecipe.authorAvatar}
                />{' '}
                by {featuredRecipe.author}
              </button>
            ) : (
              <span className="ak-author-link">by {featuredRecipe.author}</span>
            )}
            <p className="ak-featured-description line-clamp-3">
              {featuredRecipe.description}
            </p>
            <div className="ak-featured-footer">
              <span>
                <Clock3 size={13} aria-hidden="true" />{' '}
                {formatRecipeTime(featuredRecipe.time)}
              </span>
              <button
                type="button"
                onClick={() => onOpenFeatured(featuredRecipe.id)}
              >
                View recipe <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        </section>
      )}

      {cooks.length > 0 && (
        <section className="ak-hearth-cooks">
          <h2 className="ak-community-heading">Community cooks</h2>
          <div className="ak-cook-list">
            {cooks.map((cook) => (
              <Link
                key={cook.userId}
                to={getProfileRoutePath(cook.username)}
                className="ak-cook-link"
              >
                <CookAvatar name={cook.username} avatar={cook.avatar} />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate">{cook.username}</strong>
                  <span>
                    {cook.recipes} {cook.recipes === 1 ? 'recipe' : 'recipes'}{' '}
                    shared
                  </span>
                </span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {collectionPath ? (
        <Link
          to={collectionPath}
          className="ak-text-link ak-hearth-collection-link"
        >
          Open your collection <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      ) : (
        <button
          type="button"
          onClick={onRequestAuth}
          className="ak-text-link ak-hearth-collection-link"
        >
          Sign in to start your collection{' '}
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      )}
      <p className="ak-hearth-footnote">
        Good food. Curious people.
        <br />A place at the table for everyone.
      </p>
    </aside>
  );
}
