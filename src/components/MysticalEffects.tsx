function CottageEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Floating Embers from the Hearth */}
      <div
        className="ember-particle w-1 h-1"
        style={{
          left: '10%',
          top: '80%',
          animationDelay: '0s',
          animationDuration: '15s',
        }}
      ></div>
      <div
        className="ember-particle w-1.5 h-1.5"
        style={{
          left: '20%',
          top: '85%',
          animationDelay: '3s',
          animationDuration: '18s',
        }}
      ></div>
      <div
        className="ember-particle w-0.5 h-0.5"
        style={{
          left: '15%',
          top: '75%',
          animationDelay: '6s',
          animationDuration: '12s',
        }}
      ></div>

      {/* Cozy Warm Light Orbs */}
      <div
        className="cozy-orb w-8 h-8"
        style={{
          left: '5%',
          top: '20%',
          animationDelay: '0s',
        }}
      ></div>
      <div
        className="cozy-orb w-6 h-6"
        style={{
          right: '8%',
          top: '60%',
          animationDelay: '4s',
        }}
      ></div>
      <div
        className="cozy-orb w-4 h-4"
        style={{
          left: '80%',
          top: '30%',
          animationDelay: '8s',
        }}
      ></div>

      {/* Wooden Beam Shadows */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-transparent via-black/10 to-transparent"></div>
      <div className="absolute top-16 left-0 w-full h-1 bg-gradient-to-r from-transparent via-black/5 to-transparent"></div>

      <div className="absolute bottom-4 right-4 w-6 h-6 opacity-15">
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="text-orange-700"
        >
          <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
        </svg>
      </div>
    </div>
  );
}

export default CottageEffects;
