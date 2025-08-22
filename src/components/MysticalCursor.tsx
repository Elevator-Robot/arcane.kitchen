import { useState, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

function MysticalCursor() {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);
    const handleMouseLeave = () => setIsVisible(false);
    const handleMouseEnter = () => setIsVisible(true);

    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      document.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className="fixed pointer-events-none z-[9999] mix-blend-difference"
      style={{
        left: position.x - 8,
        top: position.y - 8,
        transform: `scale(${isClicking ? 0.7 : 1})`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      {/* Main orb */}
      <div className="relative w-4 h-4">
        {/* Core orb */}
        <div 
          className={`absolute inset-0 rounded-full bg-gradient-to-br from-green-300 via-emerald-400 to-green-500 shadow-lg ${
            isClicking ? 'scale-75' : 'scale-100'
          }`}
          style={{
            boxShadow: '0 0 8px rgba(34, 197, 94, 0.4)',
          }}
        />
        
        {/* Inner light */}
        <div 
          className="absolute inset-2 rounded-full bg-gradient-to-br from-white/80 to-green-200/60 animate-pulse"
          style={{
            animationDuration: '1.5s',
            animationDirection: 'alternate',
          }}
        />
        
        {/* Sparkle effects */}
        <div className="absolute inset-0">
          <div 
            className="absolute w-1 h-1 bg-white rounded-full animate-ping"
            style={{
              top: '20%',
              left: '30%',
              animationDelay: '0s',
              animationDuration: '2s',
            }}
          />
          <div 
            className="absolute w-0.5 h-0.5 bg-yellow-200 rounded-full animate-ping"
            style={{
              top: '70%',
              right: '25%',
              animationDelay: '0.7s',
              animationDuration: '2s',
            }}
          />
          <div 
            className="absolute w-0.5 h-0.5 bg-green-200 rounded-full animate-ping"
            style={{
              bottom: '30%',
              left: '20%',
              animationDelay: '1.4s',
              animationDuration: '2s',
            }}
          />
        </div>

        {/* Outer glow ring */}
        <div 
          className="absolute -inset-2 rounded-full border border-green-400/30 animate-spin"
          style={{
            animationDuration: '3s',
          }}
        />
      </div>
    </div>
  );
}

export default MysticalCursor;
