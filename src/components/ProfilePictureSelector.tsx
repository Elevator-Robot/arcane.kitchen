import React, { useState, useEffect } from 'react';

interface ProfilePictureSelectorProps {
  selectedProfilePicture?: string;
  onSelect: (profilePicture: string) => void;
  className?: string;
}

const ProfilePictureSelector: React.FC<ProfilePictureSelectorProps> = ({
  selectedProfilePicture,
  onSelect,
  className = ''
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
    'troll3.png'
  ];

  useEffect(() => {
    // Verify which images actually exist
    const checkImages = async () => {
      const existingImages: string[] = [];

      for (const image of profilePictures) {
        try {
          const response = await fetch(`/images/profile-pictures/${image}`, { method: 'HEAD' });
          if (response.ok) {
            existingImages.push(image);
          }
        } catch (error) {
          console.log(`Image ${image} not found`);
        }
      }

      setAvailableImages(existingImages);
      setLoading(false);
    };

    checkImages();
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

      <div className="grid grid-cols-3 gap-4">
        {availableImages.map((image) => {
          const isSelected = selectedProfilePicture === image;

          return (
            <button
              key={image}
              onClick={() => onSelect(image)}
              className={`relative group aspect-square rounded-xl overflow-hidden transition-all duration-200 ${isSelected
                  ? 'ring-3 ring-stone-400 bg-stone-600'
                  : 'hover:ring-2 hover:ring-stone-500 bg-stone-700/50 hover:bg-stone-600/70'
                }`}
              title={getDisplayName(image)}
            >
              <img
                src={`/images/profile-pictures/${image}`}
                alt={getDisplayName(image)}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error(`Failed to load image: ${image}`);
                }}
              />

              {/* Selection indicator */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-stone-400 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-stone-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProfilePictureSelector;
