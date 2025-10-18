import React from 'react';

interface ChatInputProps {
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isWaitingForResponse: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  inputMessage,
  setInputMessage,
  handleSubmit,
  isWaitingForResponse,
}) => {
  return (
    <div className="border-t border-green-400/30 bg-gradient-to-r from-stone-800/60 via-green-900/20 to-amber-900/30 backdrop-blur-lg p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-2 left-20 w-1 h-1 bg-green-300 rounded-full animate-pulse"></div>
        <div
          className="absolute bottom-2 right-32 w-0.5 h-0.5 bg-amber-300 rounded-full animate-ping"
          style={{ animationDelay: '1.5s' }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-emerald-300 rounded-full animate-pulse"
          style={{ animationDelay: '2.5s' }}
        ></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <div className="flex-1 relative flex">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask me anything about cooking..."
              className="flex-1 text-base font-serif bg-gradient-to-r from-stone-800/80 via-green-900/20 to-stone-800/80 backdrop-blur-lg border border-green-400/40 rounded-l-xl px-6 py-4 !text-emerald-200 placeholder-stone-500/60 focus:outline-none focus:border-green-400/80 focus:shadow-lg focus:shadow-green-500/20 focus:!text-emerald-100 transition-all duration-300 italic placeholder:not-italic border-r-0"
              style={{ color: '#a7f3d0' }}
              disabled={isWaitingForResponse}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  inputMessage.trim() &&
                  !isWaitingForResponse
                ) {
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="button"
              className="bg-gradient-to-r from-green-600/20 via-emerald-600/20 to-green-600/20 hover:from-green-500/30 hover:via-emerald-500/30 hover:to-green-500/30 backdrop-blur-lg border border-green-400/30 hover:border-green-400/50 border-l-0 rounded-r-xl px-4 py-4 text-green-300/70 hover:text-green-200 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed group"
              onClick={(e) => {
                e.preventDefault();
                if (inputMessage.trim() && !isWaitingForResponse) {
                  handleSubmit(e);
                }
              }}
              disabled={!inputMessage.trim() || isWaitingForResponse}
            >
              <svg
                className="w-4 h-4 group-hover:scale-110 transition-transform duration-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInput;
