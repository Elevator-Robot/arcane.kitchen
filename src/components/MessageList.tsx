import React from 'react';
import { Message } from '../hooks/useMessages';

interface MessageListProps {
  messages: Message[];
  isWaitingForResponse: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement>;
}

const MessageList: React.FC<MessageListProps> = ({
  messages,
  isWaitingForResponse,
  messagesEndRef
}) => {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {messages.map((message, index) => (
          <div key={index} className={`flex items-start space-x-4 ${
            message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
          }`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 relative ${
              message.role === 'user' 
                ? 'bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 border-2 border-green-400/60 shadow-lg shadow-green-500/30' 
                : 'bg-gradient-to-br from-amber-600 via-yellow-600 to-amber-700 border-2 border-amber-400/60 shadow-lg shadow-amber-500/30'
            }`}>
              {message.role === 'user' ? (
                <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
            </div>
            
            <div className={`flex-1 ${
              message.role === 'user' 
                ? 'bg-gradient-to-br from-green-800/60 via-emerald-900/40 to-green-800/60 border-green-400/40' 
                : 'bg-gradient-to-br from-stone-800/60 via-green-900/20 to-amber-900/30 border-green-400/30'
            } backdrop-blur-lg border rounded-2xl p-6 shadow-lg`}>
              <p className="text-stone-200 leading-relaxed whitespace-pre-wrap font-serif">
                {message.content}
              </p>
              <div className="text-xs text-stone-400/60 mt-3 font-sans">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {isWaitingForResponse && (
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 via-yellow-600 to-amber-700 border-2 border-amber-400/60 shadow-lg shadow-amber-500/30 flex items-center justify-center flex-shrink-0 relative">
              <svg className="w-6 h-6 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            
            <div className="flex-1 bg-gradient-to-br from-stone-800/60 via-green-900/20 to-amber-900/30 backdrop-blur-lg border border-green-400/30 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span className="text-sm" style={{ 
                  color: '#a3a380', 
                  textShadow: '0 0 6px rgba(163, 163, 128, 0.4)' 
                }}>Consulting the ancient grimoire...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;