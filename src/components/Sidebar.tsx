interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  isAuthenticated: boolean;
}

function Sidebar({ isOpen, onClose, onNewChat, isAuthenticated }: SidebarProps) {
  const handleNewChat = () => {
    onNewChat();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative top-0 left-0 h-full w-80 sidebar-enchanted z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isOpen ? 'lg:w-80' : 'lg:w-80'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-green-700/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 brand-logo">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <span className="font-semibold text-gradient gothic-text">𝔄𝔯𝔠𝔞𝔫𝔢 𝔎𝔦𝔱𝔠𝔥𝔢𝔫</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-lg text-green-300 hover:text-green-100 hover:bg-green-800/20 transition-all duration-300 lg:hidden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* New Chat Button */}
          <div className="p-4">
            <button 
              onClick={handleNewChat}
              className="btn-primary w-full flex items-center justify-center space-x-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">New Ritual</span>
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-green-300 px-2 mb-3 gothic-text">Recent Consultations</h3>
              
              {isAuthenticated ? (
                <div className="space-y-1">
                  {/* Placeholder for saved conversations */}
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-green-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-green-400 text-sm">Thy grimoire is empty</p>
                    <p className="text-green-600 text-xs mt-1">Begin thy mystical journey to fill these pages</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-amber-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-amber-400 text-sm">Join the coven to preserve thy wisdom</p>
                  <p className="text-amber-600 text-xs mt-1">Sacred knowledge shall be recorded here</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-green-700/30">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-green-300">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Botanical wisdom keeper</span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-green-500">
                <span>© 2024 Kitchen Witches</span>
                <div className="flex space-x-3">
                  <a href="#" className="hover:text-green-300 transition-colors">Spells</a>
                  <a href="#" className="hover:text-green-300 transition-colors">Herbs</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
