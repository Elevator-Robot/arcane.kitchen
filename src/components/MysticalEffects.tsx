import { useEffect, useState } from 'react';

interface FloatingElement {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  size: number;
}

function MysticalEffects() {
  const [floatingElements, setFloatingElements] = useState<FloatingElement[]>([]);

  useEffect(() => {
    // Create fewer, more subtle floating elements for the chat interface
    const elements: FloatingElement[] = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 20 + Math.random() * 10,
      size: 0.25 + Math.random() * 0.5,
    }));

    setFloatingElements(elements);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Very subtle floating orbs */}
      {floatingElements.map((element) => (
        <div
          key={element.id}
          className="absolute opacity-20 bg-purple-400/20 rounded-full animate-pulse"
          style={{
            left: `${element.x}%`,
            top: `${element.y}%`,
            animationDelay: `${element.delay}s`,
            animationDuration: `${element.duration}s`,
            width: `${element.size}rem`,
            height: `${element.size}rem`,
          }}
        />
      ))}

      {/* Subtle gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-purple-900/5 via-transparent to-emerald-900/5" 
        style={{ 
          animation: 'pulse 12s ease-in-out infinite',
        }} 
      />
    </div>
  );
}

export default MysticalEffects;
