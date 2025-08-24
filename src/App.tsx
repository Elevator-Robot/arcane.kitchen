import React, { useState, useEffect, useRef } from 'react';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import type { Schema } from '../amplify/data/resource';
import Header from './components/Header';
import MysticalEffects from './components/MysticalEffects';
import MysticalCursor from './components/MysticalCursor';

const dataClient = generateClient<Schema>();

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const checkAuthStatus = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      const attributes = await fetchUserAttributes();
      setUserAttributes(attributes);
    } catch (error) {
      setCurrentUser(null);
      setIsAuthenticated(false);
      setUserAttributes(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const getDisplayName = (): string => {
    if (!userAttributes) return 'Kitchen Witch';
    return userAttributes.given_name || userAttributes.name || userAttributes.email?.split('@')[0] || 'Kitchen Witch';
  };

  const handleAuthChange = async () => {
    setAuthLoading(true);
    await checkAuthStatus();
  };

  const handleSendMessage = async (content: string): Promise<void> => {
    // Block unauthenticated users completely
    if (!isAuthenticated || !currentUser) {
      console.log('❌ Unauthenticated user attempted to send message');
      return;
    }

    try {
      setIsWaitingForResponse(true);
      
      // Try the real AI conversation first
      try {
        console.log('🔮 Attempting real AI conversation...');
        console.log('🔍 Available conversation methods:', Object.keys(dataClient.conversations.sousChef));
        console.log('🔍 Conversation object:', dataClient.conversations.sousChef);
        
        // Try different possible API structures for Amplify Gen2 AI conversations
        let response;
        
        // Method 1: Try sendMessage on the conversation route
        if ('sendMessage' in dataClient.conversations.sousChef && typeof (dataClient.conversations.sousChef as any).sendMessage === 'function') {
          console.log('📤 Trying sendMessage method...');
          response = await (dataClient.conversations.sousChef as any).sendMessage({
            content: [{ text: content }]
          });
        }
        // Method 2: Try create method with message content
        else if ('create' in dataClient.conversations.sousChef && typeof (dataClient.conversations.sousChef as any).create === 'function') {
          console.log('📤 Trying create method...');
          response = await (dataClient.conversations.sousChef as any).create({
            content: [{ text: content }]
          });
        }
        // Method 3: Try mutations approach
        else if (dataClient.mutations) {
          console.log('📤 Trying mutations approach...');
          console.log('🔍 Available mutations:', Object.keys(dataClient.mutations));
          
          const mutationKeys = Object.keys(dataClient.mutations);
          const aiMutation = mutationKeys.find(key => 
            key.toLowerCase().includes('souschef') || 
            key.toLowerCase().includes('conversation') ||
            key.toLowerCase().includes('message')
          );
          
          if (aiMutation) {
            console.log(`📤 Using mutation: ${aiMutation}`);
            response = await (dataClient.mutations as any)[aiMutation]({
              content: content
            });
          }
        }
        
        console.log('✅ AI Response received:', response);
        
        if (response?.data?.content) {
          let aiContent;
          
          // Handle different response formats
          if (Array.isArray(response.data.content)) {
            aiContent = response.data.content
              .filter((item: any) => item.text)
              .map((item: any) => item.text)
              .join('');
          } else if (typeof response.data.content === 'string') {
            aiContent = response.data.content;
          } else {
            aiContent = JSON.stringify(response.data.content);
          }
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: aiContent,
            timestamp: new Date()
          }]);
          setIsWaitingForResponse(false);
          return;
        }
        
        // If we get here, the API call succeeded but didn't return expected content
        throw new Error('AI response received but no content found');
        
      } catch (aiError) {
        console.error('❌ Real AI failed:', aiError);
        
        // Show deployment status instead of generated responses
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `🔧 **AI Deployment Status**

I can see you asked: "${content}"

The AI conversation system needs to be deployed first. To get real AI responses:

1. **Deploy the backend**: Run \`npx ampx sandbox\`
2. **Wait for deployment**: Usually takes 5-10 minutes
3. **Test again**: The AI should then respond with real Claude responses

**Current Error**: ${aiError instanceof Error ? aiError.message : 'AI conversation not available'}

Once deployed, I'll be able to give you proper cooking advice and recipes! 🍳✨`,
            timestamp: new Date()
          }]);
          setIsWaitingForResponse(false);
        }, 1000);
      }
        
    } catch (error) {
      console.error('❌ Message handling error:', error);
      setIsWaitingForResponse(false);
      
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: generateErrorResponse(content),
        timestamp: new Date()
      }]);
    }
  };

  const generateErrorResponse = (content: string): string => {
    return `I'm having a small technical hiccup, but I'm still here to help with "${content}"! What cooking question can I assist you with right now? 🔧✨`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isWaitingForResponse) return;

    const userMessage = inputMessage;
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: userMessage,
      timestamp: new Date()
    }]);
    setInputMessage('');

    await handleSendMessage(userMessage);
  };

  const handleQuickMessage = async (message: string) => {
    if (!isAuthenticated || !currentUser) {
      // For unauthenticated users, show a sign-up encouragement message
      setMessages(prev => [...prev, 
        { 
          role: 'user', 
          content: message,
          timestamp: new Date()
        },
        { 
          role: 'assistant', 
          content: `👋 **Welcome to Arcane Kitchen!**

You asked: "${message}"

To get personalized AI cooking assistance, please **sign up or log in**. 

Once authenticated, you'll have access to:
• Real-time AI cooking advice from our mystical sous chef
• Personalized recipe suggestions based on your preferences
• Custom meal planning and ingredient substitutions
• Step-by-step cooking guidance

**Sign up now** to unlock the full magical kitchen experience! 🔮✨`,
          timestamp: new Date()
        }
      ]);
      return;
    }

    // Authenticated users get full functionality
    setMessages(prev => [...prev, { 
      role: 'user', 
      content: message,
      timestamp: new Date()
    }]);

    await handleSendMessage(message);
  };

  return (
    <div className="min-h-screen cottage-interior relative">
      <MysticalEffects />
      <MysticalCursor />
      
      {authLoading ? null : (
        <>
          <Header 
            onMenuClick={() => {}} 
            isAuthenticated={isAuthenticated}
            onAuthChange={handleAuthChange}
            userAttributes={userAttributes}
          />

          <div className="flex flex-col h-screen pt-20">
            {messages.length === 0 ? (
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
                        {isAuthenticated && userAttributes ? `Welcome home, ${getDisplayName()}` : 'Welcome home'}
                      </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                      {[
                        { title: "Grandmother's Bread", description: "How do I make traditional sourdough bread?" },
                        { title: "Hearty Stews", description: "What's a good recipe for winter stew?" },
                        { title: "Preserving Harvest", description: "How to preserve vegetables for winter?" },
                        { title: "Comfort Foods", description: "What are some warming comfort food recipes?" },
                        { title: "Garden to Table", description: "How to cook with fresh garden vegetables?" },
                        { title: "Family Traditions", description: "Help me recreate my family's traditional recipes" }
                      ].map((example, index) => (
                        <button
                          key={index}
                          onClick={() => handleQuickMessage(example.description)}
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
                  <div className="border-t border-green-400/30 bg-gradient-to-r from-stone-800/60 via-green-900/20 to-amber-900/30 backdrop-blur-lg p-4 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-2 left-20 w-1 h-1 bg-green-300 rounded-full animate-pulse"></div>
                      <div className="absolute bottom-2 right-32 w-0.5 h-0.5 bg-amber-300 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
                      <div className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-emerald-300 rounded-full animate-pulse" style={{animationDelay: '2.5s'}}></div>
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
                              if (e.key === 'Enter' && !e.shiftKey && inputMessage.trim() && !isWaitingForResponse) {
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
                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
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

                {isAuthenticated && (
                  <div className="border-t border-green-400/30 bg-gradient-to-r from-stone-800/60 via-green-900/20 to-amber-900/30 backdrop-blur-lg p-4 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-2 left-20 w-1 h-1 bg-green-300 rounded-full animate-pulse"></div>
                    <div className="absolute bottom-2 right-32 w-0.5 h-0.5 bg-amber-300 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
                    <div className="absolute top-1/2 left-1/2 w-0.5 h-0.5 bg-emerald-300 rounded-full animate-pulse" style={{animationDelay: '2.5s'}}></div>
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
                            if (e.key === 'Enter' && !e.shiftKey && inputMessage.trim() && !isWaitingForResponse) {
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
                          <svg className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
