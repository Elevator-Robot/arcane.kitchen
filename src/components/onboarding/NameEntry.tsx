import React, { useState } from 'react';

interface NameEntryProps {
  initialName: string;
  onNameSubmit: (name: string) => void;
}

const NameEntry: React.FC<NameEntryProps> = ({ initialName, onNameSubmit }) => {
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    // Add a small delay for dramatic effect
    setTimeout(() => {
      onNameSubmit(name.trim());
      setIsSubmitting(false);
    }, 800);
  };

  const canProceed = name.trim().length >= 2;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gradient mb-4">
            What is your name?
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent mx-auto mb-6"></div>
          <p className="text-xl text-stone-300 max-w-2xl mx-auto leading-relaxed">
            Tell us what to call you in the mystical realm of culinary arts.
            This can be your real name or your chosen kitchen witch identity.
          </p>
        </div>

        {/* Name Entry Form */}
        <div className="bg-gradient-to-br from-stone-800/60 via-green-900/30 to-amber-900/30 backdrop-blur-lg border border-green-400/40 rounded-3xl p-8 md:p-12 shadow-2xl shadow-emerald-500/10">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Name Input */}
            <div className="max-w-md mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your mystical name..."
                  className="chat-input text-2xl text-center py-4 px-6 bg-gradient-to-r from-stone-900/50 to-stone-800/50 border-2 border-emerald-400/30 focus:border-emerald-400/60 rounded-xl w-full text-stone-200 placeholder-stone-500 transition-all duration-300"
                  autoFocus
                  maxLength={50}
                />
                {/* Mystical glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/10 to-green-400/10 rounded-xl opacity-0 transition-opacity duration-300 pointer-events-none"></div>
              </div>

              {name && (
                <div className="mt-4 text-stone-400 text-sm">
                  {name.length}/50 characters
                </div>
              )}
            </div>

            {/* Preview */}
            {name.trim() && (
              <div className="mt-6 p-6 bg-gradient-to-r from-emerald-600/20 to-green-600/20 rounded-xl border border-emerald-400/30 transition-all duration-500">
                <p className="text-emerald-300 font-semibold text-lg mb-2">
                  Blessed be, {name.trim()}!
                </p>
                <p className="text-stone-300">
                  Welcome to the ancient tradition of kitchen witchcraft. ✨
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-center pt-4">
              <button
                type="submit"
                disabled={!canProceed || isSubmitting}
                className={`btn-primary text-xl px-8 py-4 min-w-[200px] ${
                  canProceed && !isSubmitting
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:scale-105'
                    : 'bg-stone-600/50 cursor-not-allowed opacity-50'
                } transition-all duration-300`}
              >
                {isSubmitting ? (
                  <span className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Inscribing in the Tome...</span>
                  </span>
                ) : canProceed ? (
                  'Seal Your Identity ✨'
                ) : (
                  'Enter Your Name'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Mystical flavor text */}
        <div className="text-sm text-stone-400/70 max-w-xl mx-auto italic pt-8">
          "Names hold power in the mystical arts. Choose wisely, for this will
          be how the spirits of flavor and the Mystical Sous Chef shall know
          you."
        </div>

        {/* Additional guidance */}
        <div className="mt-6 text-xs text-stone-500/60 max-w-lg mx-auto">
          Your name will be used throughout your Arcane Kitchen experience and
          can be changed later in your profile settings.
        </div>
      </div>
    </div>
  );
};

export default NameEntry;
