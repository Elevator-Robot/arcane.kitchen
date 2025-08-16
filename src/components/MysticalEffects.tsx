function CottageEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Floating Embers from the Hearth */}
      <div className="ember-particle w-1 h-1" style={{
        left: '10%',
        top: '80%',
        animationDelay: '0s',
        animationDuration: '15s'
      }}></div>
      <div className="ember-particle w-1.5 h-1.5" style={{
        left: '20%',
        top: '85%',
        animationDelay: '3s',
        animationDuration: '18s'
      }}></div>
      <div className="ember-particle w-0.5 h-0.5" style={{
        left: '15%',
        top: '75%',
        animationDelay: '6s',
        animationDuration: '12s'
      }}></div>
      
      {/* Cozy Warm Light Orbs */}
      <div className="cozy-orb w-8 h-8" style={{
        left: '5%',
        top: '20%',
        animationDelay: '0s'
      }}></div>
      <div className="cozy-orb w-6 h-6" style={{
        right: '8%',
        top: '60%',
        animationDelay: '4s'
      }}></div>
      <div className="cozy-orb w-4 h-4" style={{
        left: '80%',
        top: '30%',
        animationDelay: '8s'
      }}></div>
      
      {/* Cottage Window Light Effects */}
      <div className="absolute top-10 right-10 w-20 h-20 opacity-10">
        <div className="w-full h-full rounded-lg bg-gradient-to-br from-yellow-300 to-orange-400 animate-pulse"></div>
      </div>
      
      {/* Hearth Glow */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-96 h-32 opacity-5">
        <div className="w-full h-full bg-gradient-radial from-orange-400 via-red-500 to-transparent animate-pulse"></div>
      </div>
      
      {/* Wooden Beam Shadows */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
      <div className="absolute top-16 left-0 w-full h-1 bg-gradient-to-r from-transparent via-black/5 to-transparent"></div>
      
      {/* Cottage Corner Decorations */}
      <div className="absolute top-4 left-4 w-8 h-8 opacity-20">
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-amber-600">
          <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
        </svg>
      </div>
      
      <div className="absolute bottom-4 right-4 w-6 h-6 opacity-15">
        <svg viewBox="0 0 24 24" fill="currentColor" className="text-orange-700">
          <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z"/>
        </svg>
      </div>
    </div>
  );
}

export default CottageEffects;
