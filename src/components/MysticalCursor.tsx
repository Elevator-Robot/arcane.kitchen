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
        left: position.x - 16,
        top: position.y - 16,
        transform: `scale(${isClicking ? 0.8 : 1})`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      {/* Main orb */}
      <div className="relative w-8 h-8">
        {/* Core orb */}
        <div 
          className={`absolute inset-0 rounded-full bg-gradient-to-br from-green-300 via-emerald-400 to-green-500 shadow-lg ${
            isClicking ? 'animate-pulse' : ''
          }`}
          style={{
            boxShadow: '0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
            animation: 'mysticalGlow 2s ease-in-out infinite alternate',
          }}
        />
        
        {/* Inner light */}
        <div 
          className="absolute inset-2 rounded-full bg-gradient-to-br from-white/80 to-green-200/60"
          style={{
            animation: 'innerPulse 1.5s ease-in-out infinite alternate',
          }}
        />
        
        {/* Sparkle effect */}
        <div className="absolute inset-0">
          <div 
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              top: '20%',
              left: '30%',
              animation: 'sparkle 2s ease-in-out infinite',
              animationDelay: '0s',
            }}
          />
          <div 
            className="absolute w-0.5 h-0.5 bg-yellow-200 rounded-full"
            style={{
              top: '70%',
              right: '25%',
              animation: 'sparkle 2s ease-in-out infinite',
              animationDelay: '0.7s',
            }}
          />
          <div 
            className="absolute w-0.5 h-0.5 bg-green-200 rounded-full"
            style={{
              bottom: '30%',
              left: '20%',
              animation: 'sparkle 2s ease-in-out infinite',
              animationDelay: '1.4s',
            }}
          />
        </div>

        {/* Outer glow ring */}
        <div 
          className="absolute -inset-2 rounded-full border border-green-400/30"
          style={{
            animation: 'orbitalGlow 3s linear infinite',
          }}
        />
        
        {/* Trailing particles */}
        <div className="absolute inset-0">
          <div 
            className="absolute w-1 h-1 bg-green-300/60 rounded-full"
            style={{
              left: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              animation: 'trailFade 0.8s ease-out infinite',
            }}
          />
          <div 
            className="absolute w-0.5 h-0.5 bg-emerald-300/40 rounded-full"
            style={{
              left: '-12px',
              top: '45%',
              animation: 'trailFade 0.8s ease-out infinite',
              animationDelay: '0.1s',
            }}
          />
        </div>
      </div>

      <style jsx>{`
        @keyframes mysticalGlow {
          0% { 
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3);
          }
          100% { 
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.8), 0 0 60px rgba(34, 197, 94, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.5);
          }
        }
        
        @keyframes innerPulse {
          0% { opacity: 0.7; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1.1); }
        }
        
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        
        @keyframes orbitalGlow {
          0% { transform: rotate(0deg) scale(1); opacity: 0.3; }
          50% { opacity: 0.6; }
          100% { transform: rotate(360deg) scale(1); opacity: 0.3; }
        }
        
        @keyframes trailFade {
          0% { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.3); }
        }
      `}</style>
    </div>
  );
}

export default MysticalCursor;