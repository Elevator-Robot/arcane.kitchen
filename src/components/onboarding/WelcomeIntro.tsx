import React from 'react';

interface WelcomeIntroProps {
  onContinue: () => void;
  onSignIn?: () => void;
  showSignIn: boolean;
}

const WelcomeIntro: React.FC<WelcomeIntroProps> = ({
  onContinue,
  onSignIn,
  showSignIn,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Mystical title with floating orbs */}
        <div className="relative mb-12">
          <div className="absolute -top-6 -right-12 w-8 h-8 botanical-orb"></div>
          <div
            className="absolute -bottom-6 -left-12 w-6 h-6 botanical-orb"
            style={{ animationDelay: '2s' }}
          ></div>
          <div
            className="absolute top-1/2 -left-16 w-4 h-4 herb-particle"
            style={{ animationDelay: '1s' }}
          ></div>
          <div
            className="absolute top-1/4 -right-16 w-4 h-4 herb-particle"
            style={{ animationDelay: '3s' }}
          ></div>

          <h1 className="text-6xl md:text-8xl font-bold text-gradient leading-tight mb-6">
            Arcane Kitchen
          </h1>
          <div className="w-32 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent mx-auto mb-8"></div>
        </div>

        {/* Story introduction */}
        <div className="bg-gradient-to-br from-stone-800/60 via-green-900/30 to-amber-900/30 backdrop-blur-lg border border-green-400/40 rounded-3xl p-8 md:p-12 shadow-2xl shadow-emerald-500/10 max-w-3xl mx-auto">
          <div className="space-y-6 text-lg md:text-xl leading-relaxed text-stone-200">
            <p className="italic text-emerald-300">
              "Welcome, traveler, to the crossroads of culinary magic..."
            </p>

            <p>
              In ages past, wise cooks known as{' '}
              <span className="text-emerald-300 font-semibold">
                Kitchen Witches
              </span>{' '}
              gathered recipes not just for sustenance, but for the magic woven
              within each ingredient, each technique, each loving preparation.
            </p>

            <p>
              Here in the{' '}
              <span className="text-amber-300 font-semibold">
                Arcane Kitchen
              </span>
              , you'll discover recipes from across the realms, learn the
              ancient arts of culinary transformation, and build your own
              mystical cookbook—your personal{' '}
              <span className="text-purple-300 font-semibold">Grimoire</span>.
            </p>

            <p>
              Your journey begins now, with the creation of your{' '}
              <span className="text-rose-300 font-semibold">
                Kitchen Persona
              </span>
              —the magical identity that will guide your culinary adventures and
              help our
              <span className="text-cyan-300 font-semibold">
                {' '}
                Mystical Sous Chef
              </span>{' '}
              understand your tastes and preferences.
            </p>

            <div className="border-t border-stone-600/50 pt-6 mt-8">
              <p className="text-stone-300 italic text-base">
                "By herb and root, by leaf and flower, we weave the ancient
                kitchen's power..."
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
          <button
            onClick={onContinue}
            className="btn-primary text-xl px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:scale-105 transition-all duration-300"
          >
            Begin Your Journey ✨
          </button>

          {showSignIn && onSignIn && (
            <div className="flex items-center space-x-4">
              <div className="w-16 h-px bg-stone-500/50"></div>
              <span className="text-stone-400 text-sm">or</span>
              <div className="w-16 h-px bg-stone-500/50"></div>
            </div>
          )}

          {showSignIn && onSignIn && (
            <button
              onClick={onSignIn}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-stone-700/50 to-stone-800/50 text-stone-300 border border-stone-600/50 hover:border-amber-400/60 hover:text-amber-300 hover:shadow-lg hover:shadow-amber-500/20 transition-all duration-300"
            >
              Return to Your Coven
            </button>
          )}
        </div>

        {/* Atmospheric quote */}
        <div className="text-sm text-stone-400/70 max-w-2xl mx-auto italic pt-8 border-t border-stone-700/30">
          "Every great feast begins with a single spark of inspiration, every
          master chef with a single step into the mystical arts of cooking."
          <div className="text-xs text-stone-500/60 mt-2 not-italic">
            — The Chronicles of Culinary Magic
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeIntro;
