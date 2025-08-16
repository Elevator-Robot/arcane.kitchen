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
        fixed lg:relative top-0 left-0 h-full w-80 bg-slate-900/90 backdrop-blur-xl border-r border-slate-700/50 z-50
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${isOpen ? 'lg:w-80' : 'lg:w-80'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                  </svg>
                </div>
                <span className="font-semibold text-white">Arcane Kitchen</span>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-300 lg:hidden"
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
              className="w-full flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-500 hover:to-indigo-500 transition-all duration-300 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">New Conversation</span>
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto px-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400 px-2 mb-3">Recent Conversations</h3>
              
              {isAuthenticated ? (
                <div className="space-y-1">
                  {/* Placeholder for saved conversations */}
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-slate-500 text-sm">No saved conversations yet</p>
                    <p className="text-slate-600 text-xs mt-1">Start chatting to see your history here</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <p className="text-slate-500 text-sm">Sign in to save conversations</p>
                  <p className="text-slate-600 text-xs mt-1">Your chat history will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/50">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>AI-powered culinary assistant</span>
              </div>
              
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>© 2024 Arcane Kitchen</span>
                <div className="flex space-x-3">
                  <a href="#" className="hover:text-slate-400 transition-colors">Help</a>
                  <a href="#" className="hover:text-slate-400 transition-colors">Privacy</a>
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
