import React, { useState, useEffect } from 'react';

interface ProfilePictureSelectorProps {
  selectedProfilePicture?: string;
  onSelect: (profilePicture: string) => void;
  className?: string;
}

const ProfilePictureSelector: React.FC<ProfilePictureSelectorProps> = ({
  selectedProfilePicture,
  onSelect,
  className = '',
}) => {
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // List of available profile pictures based on your directory
  const profilePictures = [
    'witch1.png',
    'witch2.png',
    'witch3.png',
    'wizard1.png',
    'wizard2.png',
    'wizard3.png',
    'goblin1.png',
    'goblin2.png',
    'goblin3.png',
    'troll1.png',
    'troll2.png',
    'troll3.png',
  ];

  useEffect(() => {
    // Skip async verification - let images load naturally with onError handling
    setAvailableImages(profilePictures);
    setLoading(false);
  }, []);

  const getDisplayName = (filename: string) => {
    // Convert filename to display name
    const name = filename.replace('.png', '').replace(/(\d+)/, ' $1');
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="loading-dots">
          <div></div>
          <div style={{ animationDelay: '0.1s' }}></div>
          <div style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="profile-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
        {availableImages.map((image) => {
          const isSelected = selectedProfilePicture === image;

          return (
            <button
              key={image}
              onClick={() => onSelect(image)}
              className={`relative group aspect-square rounded-2xl overflow-hidden transition-all duration-300 transform hover:scale-105 focus:scale-105 ${
                isSelected
                  ? 'ring-3 ring-emerald-400 bg-stone-600 shadow-xl shadow-emerald-500/40 scale-105'
                  : 'hover:ring-2 hover:ring-emerald-500/70 focus:ring-2 focus:ring-emerald-500/70 bg-stone-700/50 hover:bg-stone-600/70 focus:bg-stone-600/70 hover:shadow-xl hover:shadow-emerald-500/25 focus:shadow-xl focus:shadow-emerald-500/25'
              }`}
              title={getDisplayName(image)}
            >
              {/* Avatar image */}
              <img
                src={`/images/profile-pictures/${image}`}
                alt={getDisplayName(image)}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  isSelected ? 'scale-110' : 'group-hover:scale-110'
                }`}
                onError={(e) => {
                  console.error(`Failed to load image: ${image}`);
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/profile-pictures/witch1.png'; // Fallback to default
                }}
              />

              {/* Character name overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <p className="text-xs font-medium text-white text-center truncate">
                  {getDisplayName(image)}
                </p>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-7 h-7 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg animate-pulse-glow">
                  <svg
                    className="w-4 h-4 text-emerald-900"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}

              {/* Magical glow effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/20 via-emerald-400/10 to-transparent opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-500" />

              {/* Outer mystical glow */}
              <div
                className={`absolute -inset-2 bg-gradient-to-r from-emerald-400/30 via-teal-400/30 to-emerald-400/30 rounded-2xl opacity-0 blur-md transition-all duration-500 -z-10 ${
                  isSelected
                    ? 'opacity-100 animate-pulse-glow'
                    : 'group-hover:opacity-100 group-focus:opacity-100'
                }`}
              />

              {/* Selection pulse effect */}
              {isSelected && (
                <div className="absolute inset-0 rounded-2xl border-2 border-emerald-400/60 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Instructions for mobile */}
      <div className="text-center mt-4 sm:hidden">
        <p className="text-sm text-stone-400 italic">
          Tap to select your magical avatar
        </p>
      </div>
    </div>
  );
};

export default ProfilePictureSelector;
