import { useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';

interface HeaderProps {
  onMenuClick: () => void;
  isAuthenticated: boolean;
  onAuthChange: (authenticated: boolean) => void;
}

function Header({ onMenuClick, isAuthenticated, onAuthChange }: HeaderProps) {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="header-mystical fixed top-0 w-full z-50">
        <div className="flex justify-between items-center p-4">
          {/* Left side - Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 brand-logo">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gradient gothic-text">𝔄𝔯𝔠𝔞𝔫𝔢 𝔎𝔦𝔱𝔠𝔥𝔢𝔫</h1>
              <p className="text-xs text-green-300">Kitchen Witch's Grimoire</p>
            </div>
          </div>
          
          {/* Right side - Auth */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center border border-yellow-500/40">
                  <svg className="w-4 h-4 text-yellow-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="text-sm text-green-200 hover:text-green-100 transition-colors"
                >
                  Grimoire
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="btn-secondary text-sm"
              >
                Join Coven
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-enchanted rounded-2xl shadow-xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="text-center flex-1">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center shadow-lg border border-yellow-500/40">
                  <svg className="w-8 h-8 text-yellow-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-enchanted gothic-text mb-2">
                  {isAuthenticated ? '𝔊𝔯𝔦𝔪𝔬𝔦𝔯𝔢 𝔄𝔠𝔠𝔢𝔰𝔰' : '𝔍𝔬𝔦𝔫 𝔬𝔲𝔯 ℭ𝔬𝔳𝔢𝔫'}
                </h2>
                <p className="text-green-300">
                  {isAuthenticated ? 'Manage thy sacred recipes' : 'Enter the circle of kitchen witches'}
                </p>
              </div>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="text-green-300 hover:text-green-100 transition-colors p-2 rounded-lg hover:bg-green-800/20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Custom Auth Form */}
            <div className="space-y-6">
              {isAuthenticated ? (
                // Authenticated State
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center shadow-lg border border-green-500/40">
                    <svg className="w-10 h-10 text-green-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gradient gothic-text mb-2">𝔚𝔢𝔩𝔠𝔬𝔪𝔢, 𝔎𝔦𝔱𝔠𝔥𝔢𝔫 𝔚𝔦𝔱𝔠𝔥!</h3>
                    <p className="text-green-300">Thy grimoire awaits thy wisdom</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => {
                        // Handle sign out
                        setShowAuthModal(false);
                        onAuthChange(false);
                      }}
                      className="btn-secondary flex-1"
                    >
                      Leave Coven
                    </button>
                    <button 
                      onClick={() => setShowAuthModal(false)}
                      className="btn-primary flex-1"
                    >
                      Enter Kitchen
                    </button>
                  </div>
                </div>
              ) : (
                // Sign In Form
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-green-300 mb-2">
                        Witch's Name (Email)
                      </label>
                      <input
                        type="email"
                        className="auth-input"
                        placeholder="your.name@coven.mystical"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-300 mb-2">
                        Sacred Password
                      </label>
                      <input
                        type="password"
                        className="auth-input"
                        placeholder="Enter thy secret incantation"
                      />
                    </div>
                  </div>

                  <button className="btn-primary w-full">
                    Enter the Sacred Circle
                  </button>

                  <div className="text-center">
                    <div className="flex items-center justify-center space-x-4 mb-4">
                      <div className="h-px bg-green-700 flex-1"></div>
                      <span className="text-green-400 text-sm">or</span>
                      <div className="h-px bg-green-700 flex-1"></div>
                    </div>
                    
                    <button className="btn-secondary w-full mb-4">
                      Create New Grimoire
                    </button>
                    
                    <p className="text-xs text-green-400">
                      By joining our coven, you agree to share in the ancient wisdom 
                      and protect the sacred recipes of kitchen witchcraft.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Hidden Amplify Authenticator for actual functionality */}
            <div className="hidden">
              <Authenticator 
                hideSignUp={false}
                components={{
                  Header() {
                    return null;
                  },
                  Footer() {
                    return null;
                  },
                }}
              >
                {({ signOut }) => (
                  <div>
                    {/* This will handle the actual auth state */}
                    <button onClick={signOut}>Hidden Sign Out</button>
                  </div>
                )}
              </Authenticator>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
