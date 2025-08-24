import { useState, useEffect } from 'react';

interface Position {
  x: number;
  y: number;
}

function MysticalCursor() {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isOverGreenElement, setIsOverGreenElement] = useState(false);

  useEffect(() => {
    const updatePosition = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
      
      // Check if cursor is over green/emerald UI elements for adaptive coloring
      const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
      if (elementUnderCursor) {
        const computedStyle = window.getComputedStyle(elementUnderCursor);
        const bgColor = computedStyle.backgroundColor;
        const textColor = computedStyle.color;
        const borderColor = computedStyle.borderColor;
        
        // Check if element has green/emerald colors
        const hasGreenColors = 
          bgColor.includes('34, 197, 94') || // green-500
          bgColor.includes('16, 185, 129') || // emerald-500
          bgColor.includes('5, 150, 105') ||  // emerald-600
          textColor.includes('34, 197, 94') ||
          textColor.includes('16, 185, 129') ||
          borderColor.includes('34, 197, 94') ||
          borderColor.includes('16, 185, 129') ||
          elementUnderCursor.className.includes('green') ||
          elementUnderCursor.className.includes('emerald');
          
        setIsOverGreenElement(hasGreenColors);
      }
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
        {/* Core orb with adaptive coloring */}
        <div 
          className={`absolute inset-0 rounded-full shadow-lg transition-all duration-300 ${
            isClicking ? 'animate-pulse' : ''
          } ${
            isOverGreenElement 
              ? 'bg-gradient-to-br from-teal-300 via-cyan-400 to-emerald-400' 
              : 'bg-gradient-to-br from-green-300 via-emerald-400 to-green-500'
          }`}
          style={{
            boxShadow: isOverGreenElement 
              ? '0 0 25px rgba(20, 184, 166, 0.8), 0 0 50px rgba(20, 184, 166, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4)'
              : '0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3)',
            animation: isOverGreenElement ? 'adaptiveGlow 1.5s ease-in-out infinite alternate' : 'mysticalGlow 2s ease-in-out infinite alternate',
          }}
        />
        
        {/* Inner light with adaptive coloring */}
        <div 
          className={`absolute inset-2 rounded-full transition-all duration-300 ${
            isOverGreenElement 
              ? 'bg-gradient-to-br from-white/90 to-teal-200/70' 
              : 'bg-gradient-to-br from-white/80 to-green-200/60'
          }`}
          style={{
            animation: isOverGreenElement ? 'innerPulseAdaptive 1.2s ease-in-out infinite alternate' : 'innerPulse 1.5s ease-in-out infinite alternate',
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

        {/* Outer glow ring with adaptive coloring */}
        <div 
          className={`absolute -inset-2 rounded-full border transition-all duration-300 ${
            isOverGreenElement 
              ? 'border-teal-400/40' 
              : 'border-green-400/30'
          }`}
          style={{
            animation: isOverGreenElement ? 'orbitalGlowAdaptive 2.5s linear infinite' : 'orbitalGlow 3s linear infinite',
          }}
        />
        
        {/* Trailing particles with adaptive colors */}
        <div className="absolute inset-0">
          <div 
            className={`absolute w-1 h-1 rounded-full transition-all duration-300 ${
              isOverGreenElement ? 'bg-teal-300/70' : 'bg-green-300/60'
            }`}
            style={{
              left: '-8px',
              top: '50%',
              transform: 'translateY(-50%)',
              animation: 'trailFade 0.8s ease-out infinite',
            }}
          />
          <div 
            className={`absolute w-0.5 h-0.5 rounded-full transition-all duration-300 ${
              isOverGreenElement ? 'bg-cyan-300/50' : 'bg-emerald-300/40'
            }`}
            style={{
              left: '-12px',
              top: '45%',
              animation: 'trailFade 0.8s ease-out infinite',
              animationDelay: '0.1s',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes mysticalGlow {
          0% { 
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.6), 0 0 40px rgba(34, 197, 94, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3);
          }
          100% { 
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.8), 0 0 60px rgba(34, 197, 94, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.5);
          }
        }
        
        @keyframes adaptiveGlow {
          0% { 
            box-shadow: 0 0 25px rgba(20, 184, 166, 0.8), 0 0 50px rgba(20, 184, 166, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4);
          }
          100% { 
            box-shadow: 0 0 35px rgba(20, 184, 166, 1), 0 0 70px rgba(20, 184, 166, 0.6), inset 0 2px 4px rgba(255, 255, 255, 0.6);
          }
        }
        
        @keyframes innerPulse {
          0% { opacity: 0.7; transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1.1); }
        }
        
        @keyframes innerPulseAdaptive {
          0% { opacity: 0.8; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1.15); }
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
        
        @keyframes orbitalGlowAdaptive {
          0% { transform: rotate(0deg) scale(1.05); opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { transform: rotate(360deg) scale(1.05); opacity: 0.4; }
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