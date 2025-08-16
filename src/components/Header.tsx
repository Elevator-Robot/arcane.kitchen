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
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-xl">
        <div className="flex justify-between items-center p-4">
          {/* Left side - Menu and Logo */}
          <div className="flex items-center space-x-4">
            <button 
              onClick={onMenuClick}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 transition-all duration-300 lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                </svg>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-white">Arcane Kitchen</h1>
                <p className="text-xs text-slate-400">Culinary AI Assistant</p>
              </div>
            </div>
          </div>
          
          {/* Right side - Auth */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <button 
                  onClick={() => setShowAuthModal(true)}
                  className="text-sm text-slate-300 hover:text-white transition-colors hidden sm:block"
                >
                  Account
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-300"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="text-center flex-1">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isAuthenticated ? 'Account Settings' : 'Welcome Back'}
                </h2>
                <p className="text-slate-400">
                  {isAuthenticated ? 'Manage your account' : 'Sign in to save your conversations'}
                </p>
              </div>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">Welcome!</h3>
                    <p className="text-slate-400">You're now signed in to Arcane Kitchen</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button 
                      onClick={() => {
                        signOut?.();
                        setShowAuthModal(false);
                        onAuthChange(false);
                      }}
                      className="flex-1 px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all duration-300"
                    >
                      Sign Out
                    </button>
                    <button 
                      onClick={() => setShowAuthModal(false)}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-500 hover:to-indigo-500 transition-all duration-300"
                    >
                      Continue
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
