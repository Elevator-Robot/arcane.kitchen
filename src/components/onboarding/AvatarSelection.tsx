import React from 'react';
import ProfilePictureSelector from '../ProfilePictureSelector';

interface AvatarSelectionProps {
  selectedAvatar: string;
  onAvatarSelect: (avatar: string) => void;
}

const AvatarSelection: React.FC<AvatarSelectionProps> = ({
  selectedAvatar,
  onAvatarSelect,
}) => {
  const handleAvatarSelect = (avatar: string) => {
    onAvatarSelect(avatar);
  };

  const canProceed = selectedAvatar.trim() !== '';

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gradient mb-4">
            Who are you?
          </h1>
          <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent mx-auto mb-6"></div>
          <p className="text-xl text-stone-300 max-w-2xl mx-auto leading-relaxed">
            Choose the avatar that represents your mystical cooking persona.
            This will be your identity in the Arcane Kitchen.
          </p>
        </div>

        {/* Avatar Selection */}
        <div className="bg-gradient-to-br from-stone-800/60 via-green-900/30 to-amber-900/30 backdrop-blur-lg border border-green-400/40 rounded-3xl p-8 md:p-12 shadow-2xl shadow-emerald-500/10">
          <ProfilePictureSelector
            selectedProfilePicture={selectedAvatar}
            onSelect={handleAvatarSelect}
            className="max-w-4xl mx-auto"
          />

          {selectedAvatar && (
            <div className="mt-8 p-6 bg-gradient-to-r from-emerald-600/20 to-green-600/20 rounded-xl border border-emerald-400/30">
              <p className="text-emerald-300 font-semibold text-lg">
                Excellent choice! Your kitchen persona is taking shape. ✨
              </p>
            </div>
          )}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center pt-8">
          <button
            onClick={() => handleAvatarSelect(selectedAvatar)}
            disabled={!canProceed}
            className={`btn-primary text-xl px-8 py-4 ${
              canProceed
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transform hover:scale-105'
                : 'bg-stone-600/50 cursor-not-allowed opacity-50'
            } transition-all duration-300`}
          >
            {canProceed ? 'Continue Your Journey' : 'Select Your Avatar'} ✨
          </button>
        </div>

        {/* Mystical flavor text */}
        <div className="text-sm text-stone-400/70 max-w-xl mx-auto italic pt-8">
          "The face you choose reflects the magic within. Let your inner kitchen
          witch shine through."
        </div>
      </div>
    </div>
  );
};

export default AvatarSelection;
