import React from 'react';
import { QUICK_MESSAGES } from '../constants';
import { getDisplayName } from '../utils/auth';
import ChatInput from './ChatInput';

interface WelcomeScreenProps {
  isAuthenticated: boolean;
  userAttributes: any;
  onQuickMessage: (message: string) => void;
  inputMessage: string;
  setInputMessage: (message: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isWaitingForResponse: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  isAuthenticated,
  userAttributes,
  onQuickMessage,
  inputMessage,
  setInputMessage,
  handleSubmit,
  isWaitingForResponse
}) => {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-4xl w-full text-center space-y-12">
          <div className="relative">
            <div className="absolute -top-4 -right-8 w-6 h-6 botanical-orb"></div>
            <div className="absolute -bottom-4 -left-8 w-4 h-4 botanical-orb" style={{animationDelay: '2s'}}></div>
            <div className="absolute top-1/2 -left-12 w-3 h-3 herb-particle" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/4 -right-12 w-3 h-3 herb-particle" style={{animationDelay: '3s'}}></div>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-5xl md:text-7xl font-bold text-gradient leading-tight">
              Arcane Kitchen
            </h1>
            <h2 className="text-2xl md:text-3xl text-hearth font-semibold">
              {isAuthenticated && userAttributes ? `Welcome home, ${getDisplayName(userAttributes)}` : 'Welcome home'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {QUICK_MESSAGES.map((example, index) => (
              <button
                key={index}
                onClick={() => onQuickMessage(example.description)}
                className={`group relative bg-gradient-to-br from-stone-800/40 via-green-900/20 to-amber-900/20 backdrop-blur-lg border border-green-400/30 rounded-2xl p-6 text-left transition-all duration-300 cursor-pointer ${
                  isAuthenticated 
                    ? 'hover:border-green-400/60 hover:scale-105 hover:shadow-xl hover:shadow-green-500/20' 
                    : 'hover:border-amber-400/60 hover:scale-102 hover:shadow-lg hover:shadow-amber-500/20'
                }`}
              >
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-stone-200 gothic-text mb-3 group-hover:text-green-300 transition-all duration-300">
                    {example.title}
                  </h3>
                  <p className="text-stone-400 leading-relaxed group-hover:text-stone-300 transition-all duration-300">
                    {example.description}
                  </p>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                <div className="h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent group-hover:via-green-400/80 transition-all duration-300"></div>
              </button>
            ))}
          </div>

          <div className="text-sm text-stone-300/70 max-w-2xl mx-auto italic border-t border-stone-600/30 pt-6">
            "By herb and root, by leaf and flower, I weave the ancient kitchen's power. 
            What grows from earth shall feed the soul, and make the broken spirit whole."
            <div className="text-xs text-stone-400/60 mt-2 not-italic">
              — Margot the Wise, Kitchen Witch of Blackmoor (1347)
            </div>
          </div>
        </div>
      </div>
      
      {isAuthenticated && (
        <ChatInput
          inputMessage={inputMessage}
          setInputMessage={setInputMessage}
          handleSubmit={handleSubmit}
          isWaitingForResponse={isWaitingForResponse}
        />
      )}
    </div>
  );
};

export default WelcomeScreen;