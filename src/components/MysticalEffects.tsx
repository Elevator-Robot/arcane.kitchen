import { useEffect, useState } from 'react';

interface FloatingElement {
  id: number;
  type: 'leaf' | 'herb' | 'orb' | 'sparkle';
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
}

function MysticalEffects() {
  const [floatingElements, setFloatingElements] = useState<FloatingElement[]>([]);

  useEffect(() => {
    // Create mystical botanical floating elements
    const elements: FloatingElement[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      type: ['leaf', 'herb', 'orb', 'sparkle'][Math.floor(Math.random() * 4)] as FloatingElement['type'],
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 15,
      duration: 20 + Math.random() * 15,
      size: 0.3 + Math.random() * 0.7,
    }));

    setFloatingElements(elements);
  }, []);

  const getElementStyle = (element: FloatingElement) => {
    const baseStyle = {
      left: `${element.x}%`,
      top: `${element.y}%`,
      animationDelay: `${element.delay}s`,
      animationDuration: `${element.duration}s`,
      width: `${element.size}rem`,
      height: `${element.size}rem`,
    };

    switch (element.type) {
      case 'leaf':
        return {
          ...baseStyle,
          background: 'linear-gradient(45deg, #228b22, #9acd32)',
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          opacity: 0.15,
        };
      case 'herb':
        return {
          ...baseStyle,
          background: 'radial-gradient(circle, #6b8e23 0%, #556b2f 70%)',
          borderRadius: '50%',
          opacity: 0.2,
        };
      case 'orb':
        return {
          ...baseStyle,
          background: 'radial-gradient(circle, rgba(154, 205, 50, 0.3) 0%, rgba(107, 142, 35, 0.1) 70%, transparent 100%)',
          borderRadius: '50%',
          opacity: 0.25,
        };
      case 'sparkle':
        return {
          ...baseStyle,
          background: 'linear-gradient(45deg, #daa520, #cd853f)',
          clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
          opacity: 0.1,
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Floating botanical elements */}
      {floatingElements.map((element) => (
        <div
          key={element.id}
          className="absolute animate-pulse"
          style={{
            ...getElementStyle(element),
            animation: `mystical-float ${element.duration}s ease-in-out infinite`,
            animationDelay: `${element.delay}s`,
          }}
        />
      ))}

      {/* Mystical gradient overlays */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(circle at 20% 80%, rgba(34, 139, 34, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(107, 142, 35, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(218, 165, 32, 0.05) 0%, transparent 50%)
          `,
          animation: 'mystical-shimmer 15s ease-in-out infinite',
        }} 
      />

      {/* Subtle herb particles drifting across screen */}
      <div className="absolute inset-0">
        {[...Array(3)].map((_, i) => (
          <div
            key={`drift-${i}`}
            className="herb-particle w-1 h-1"
            style={{
              top: `${20 + i * 30}%`,
              animationDelay: `${i * 5}s`,
            }}
          />
        ))}
      </div>

      {/* Mystical aura around edges */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(90deg, rgba(26, 26, 15, 0.3) 0%, transparent 20%, transparent 80%, rgba(26, 26, 15, 0.3) 100%),
            linear-gradient(0deg, rgba(26, 26, 15, 0.2) 0%, transparent 20%, transparent 80%, rgba(26, 26, 15, 0.2) 100%)
          `,
        }}
      />
    </div>
  );
}

export default MysticalEffects;
