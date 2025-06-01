import { useState } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <header className="bg-arcane-parchment/90 backdrop-blur-md border-b border-arcane-amber-light/30 fixed top-0 w-full z-10 shadow-magical">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-arcane-purple flex items-center justify-center animate-float">
              <span className="text-white text-xl">🧪</span>
            </div>
            <h1 className="text-2xl font-heading font-semibold text-arcane-purple">
              Arcane Kitchen
            </h1>
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <a href="#recipes" className="font-heading text-arcane-text hover:text-arcane-purple transition-colors duration-200">
              Recipes
            </a>
            <a href="#grimoire" className="font-heading text-arcane-text hover:text-arcane-purple transition-colors duration-200">
              My Grimoire
            </a>
            <a href="#coven" className="font-heading text-arcane-text hover:text-arcane-purple transition-colors duration-200">
              Coven
            </a>
            <a href="#herbs" className="font-heading text-arcane-text hover:text-arcane-purple transition-colors duration-200">
              Herbal Wisdom
            </a>
            <button 
              className="btn btn-outline"
              onClick={() => setShowAuthModal(true)}
            >
              Sign In
            </button>
          </nav>
          
          {/* Mobile menu button */}
          <button 
            className="md:hidden text-arcane-purple"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden bg-arcane-parchment border-t border-arcane-amber-light/30 py-4">
            <div className="flex flex-col space-y-4 px-4">
              <a href="#recipes" className="font-heading text-arcane-text hover:text-arcane-purple transition-colors duration-200 py-2">
                Recipes
              </a>
              <a href="#grimoire" className="font-heading text-arcane-text hover:text-arcane-purple transition-colors duration-200 py-2">
                My Grimoire
              </a>
              <a href="#coven" className="font-heading text-arcane-text hover:text-arcane-purple transition-colors duration-200 py-2">
                Coven
              </a>
              <a href="#herbs" className="font-heading text-arcane-text hover:text-arcane-purple transition-colors duration-200 py-2">
                Herbal Wisdom
              </a>
              <button 
                className="btn btn-outline w-full"
                onClick={() => setShowAuthModal(true)}
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-arcane-parchment rounded-lg shadow-magical p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-heading text-arcane-purple">Sign In to Your Grimoire</h2>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="text-arcane-text-light hover:text-arcane-purple"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="magical-divider mb-6">
              <span className="magical-icon">✨</span>
            </div>
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
                <div className="text-center">
                  <p className="text-arcane-text mb-4">You're now signed in to Arcane Kitchen!</p>
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={() => {
                        signOut();
                        setShowAuthModal(false);
                      }}
                      className="btn btn-outline"
                    >
                      Sign Out
                    </button>
                    <button 
                      onClick={() => setShowAuthModal(false)}
                      className="btn btn-primary"
                    >
                      Continue to Arcane Kitchen
                    </button>
                  </div>
                </div>
              )}
            </Authenticator>
          </div>
        </div>
      )}
    </>
  );
}

export default Header;
