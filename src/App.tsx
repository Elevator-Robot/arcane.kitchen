import { useState, useRef, useEffect } from "react";
import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import Header from "./components/Header";
import MysticalEffects from "./components/MysticalEffects";
import MysticalCursor from "./components/MysticalCursor";

const dataClient = generateClient<Schema>();

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>(null);
  const hardcodedConversationId = "arcane-kitchen-conversation";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to get display name
  const getDisplayName = () => {
    if (userAttributes?.nickname) {
      return userAttributes.nickname;
    }
    if (userAttributes?.email) {
      return userAttributes.email.split('@')[0];
    }
    if (currentUser?.username) {
      return currentUser.username;
    }
    return 'Kitchen Witch';
  };

  // Check authentication status
  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        setCurrentUser(user);
        setUserAttributes(attributes);
        setIsAuthenticated(true);
        console.log("👤 Authenticated user:", user, attributes);
      } catch (error) {
        console.log("User is not authenticated");
        setIsAuthenticated(false);
        setCurrentUser(null);
        setUserAttributes(null);
      } finally {
        setAuthLoading(false);
      }
    }
    
    checkAuth();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Set up subscription for authenticated users
  useEffect(() => {
    if (!isAuthenticated || !conversationId) return;

    console.log('Setting up subscription for conversation:', conversationId);
    
    try {
      const subscription = dataClient.graphql({
        query: `
          subscription OnCreateBrainResponse {
            onCreateBrainResponse {
              id
              conversationId
              response
              owner
              messageId
              createdAt
            }
          }
        `
      });
      
      type GraphQLSubscriptionResult = {
        data?: {
          onCreateBrainResponse?: {
            id: string;
            conversationId: string;
            response: string;
            owner: string;
            messageId: string;
            createdAt: string;
          };
        };
        errors?: Array<{ message: string }>;
      };
      
      const rawSubscription = (subscription as any).subscribe({
        next: (result: GraphQLSubscriptionResult) => {
          console.log('RAW SUBSCRIPTION RECEIVED:', result);
          
          const brainResponse = result.data?.onCreateBrainResponse;
          if (brainResponse) {
            console.log('Extracted brain response:', brainResponse);
            
            if (brainResponse.conversationId === conversationId) {
              console.log('✅ MATCH: Adding response to messages:', brainResponse.response);
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: brainResponse.response ?? '',
                timestamp: new Date()
              }]);
              setIsWaitingForResponse(false);
            }
          }
        },
        error: (err: Error) => {
          console.error('Raw subscription error:', err);
          setIsWaitingForResponse(false);
        }
      });
      
      return () => {
        console.log('Cleaning up raw subscription');
        rawSubscription.unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up raw subscription:', error);
      return () => {};
    }
  }, [isAuthenticated, conversationId]);

  const handleSendMessage = async (content: string): Promise<void> => {
    try {
      setIsWaitingForResponse(true);
      
      if (isAuthenticated && currentUser) {
        let convId = conversationId || hardcodedConversationId;
        if (!conversationId) {
          convId = hardcodedConversationId;
          setConversationId(convId);
          console.log('Created/using conversation ID:', convId);
        }

        // Here you would send the message to your Amplify backend
        // For now, we'll simulate the response
        setTimeout(() => {
          const displayName = getDisplayName();
          const responses = [
            `Welcome to our kitchen, ${displayName}! I've been looking through the family recipe collection about "${content}". Let me share what I've found from generations of home cooking...`,
            `Ah, ${displayName}, that's a wonderful question about "${content}". My grandmother always said the best recipes come from the heart, and here's what she taught me...`,
            `Good to see you by the hearth again, ${displayName}! About "${content}" - this reminds me of the old ways my family used to prepare meals. Let me tell you...`,
            `${displayName}, you've asked about something close to my heart - "${content}". In our family kitchen, we've always believed that simple ingredients make the most comforting meals...`
          ];
          
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: randomResponse,
            timestamp: new Date()
          }]);
          setIsWaitingForResponse(false);
        }, 1000 + Math.random() * 2000);
      } else {
        // Guest user simulation
        setTimeout(() => {
          const responses = [
            `Welcome to our cozy kitchen! You've asked about "${content}". I'd love to share some family wisdom and time-tested recipes that might help...`,
            `That's a wonderful question about "${content}". From years of home cooking and family traditions, here's what I've learned...`,
            `Your question about "${content}" brings back memories of my grandmother's kitchen. Let me share some heartwarming recipes and cooking tips...`,
            `I'm so glad you asked about "${content}". There's nothing quite like the comfort of home cooking, and I have some lovely suggestions for you...`
          ];
          
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
content: randomResponse,
            timestamp: new Date()
          }]);
          setIsWaitingForResponse(false);
        }, 1000 + Math.random() * 2000);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsWaitingForResponse(false);
      
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I'm here to help with "${content}". As someone who loves sharing family recipes and cooking wisdom, I'd be happy to guide you through traditional cooking methods and comfort food recipes.`,
          timestamp: new Date()
        }]);
        setIsWaitingForResponse(false);
      }, 1500);
    }
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
    if (isWaitingForResponse) return;

    setMessages(prev => [...prev, { 
      role: 'user', 
      content: message,
      timestamp: new Date()
    }]);

    await handleSendMessage(message);
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  // Handle auth state changes from Header component
  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
    setAuthLoading(false); // Auth state is now determined
    if (authenticated) {
      // Refresh user data when authenticated
      getCurrentUser().then(async (user) => {
        const attributes = await fetchUserAttributes();
        setCurrentUser(user);
        setUserAttributes(attributes);
      }).catch(() => {
        setCurrentUser(null);
        setUserAttributes(null);
      });
    } else {
      setCurrentUser(null);
      setUserAttributes(null);
    }
  };

  return (
    <div className="min-h-screen cottage-interior relative">
      <MysticalEffects />
      <MysticalCursor />
      
      {authLoading ? null : (
        <>
          {/* Header */}
          <Header 
            onMenuClick={() => {}} // No sidebar to toggle
            isAuthenticated={isAuthenticated}
            onAuthChange={handleAuthChange}
            userAttributes={userAttributes} // Pass user data to prevent separate loading
          />

          {/* Main Content Area */}
          <div className="flex flex-col h-screen pt-20">
        {messages.length === 0 ? (
          // Welcome Screen - Full Width
          <div className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="max-w-4xl w-full text-center space-y-12">
              {/* Mystical Header */}
              <div className="relative">
                {/* Floating botanical elements */}
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
                <p className="text-xl text-stone-200 max-w-3xl mx-auto leading-relaxed">
                  {isAuthenticated 
                    ? ""
                    : ""
                  }
                </p>
              </div>

              {/* Enhanced Quick Start Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    title: "Grandmother's Bread",
                    description: "How do I make traditional sourdough bread?"
                  },
                  {
                    title: "Hearty Stews",
                    description: "What's a good recipe for winter stew?"
                  },
                  {
                    title: "Preserving Harvest",
                    description: "How to preserve vegetables for winter?"
                  },
                  {
                    title: "Comfort Foods",
                    description: "What are some warming comfort food recipes?"
                  },
                  {
                    title: "Garden to Table",
                    description: "How to cook with fresh garden vegetables?"
                  },
                  {
                    title: "Family Traditions",
                    description: "Help me recreate my family's traditional recipes"
                  }
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickMessage(example.description)}
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-800/40 via-green-900/20 to-amber-900/30 backdrop-blur-lg border border-green-400/30 p-8 text-left h-full hover:border-green-400/60 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/20"
                  >
                    {/* Mystical background pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-4 right-4 w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                      <div className="absolute bottom-6 left-6 w-1 h-1 bg-amber-300 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                      <div className="absolute top-1/2 right-8 w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
                    </div>
                    
                    <div className="relative z-10 flex flex-col space-y-4 h-full">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-stone-200 gothic-text mb-3 group-hover:text-green-300 transition-all duration-300">
                          {example.title}
                        </h3>
                        <p className="text-stone-400 leading-relaxed group-hover:text-stone-300 transition-all duration-300">
                          {example.description}
                        </p>
                      </div>
                      
                      {/* Mystical hover effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                      
                      {/* Bottom accent line */}
                      <div className="h-px bg-gradient-to-r from-transparent via-green-400/50 to-transparent group-hover:via-green-400/80 transition-all duration-300"></div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Medieval Witch Quote */}
              <div className="text-sm text-stone-300/70 max-w-2xl mx-auto italic border-t border-stone-600/30 pt-6">
                "By herb and root, by leaf and flower, I weave the ancient kitchen's power. 
                What grows from earth shall feed the soul, and make the broken spirit whole."
                <div className="text-xs text-stone-400/60 mt-2 not-italic">
                  — Margot the Wise, Kitchen Witch of Blackmoor (1347)
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Chat Interface - Full Width with Fixed Input
          <div className="flex-1 flex flex-col min-h-0">
            {/* Mystical Chat Header with New Conversation Button */}
            <div className="border-b border-green-400/30 bg-gradient-to-r from-stone-800/60 via-green-900/20 to-amber-900/30 backdrop-blur-lg relative overflow-hidden">
              {/* Mystical background particles */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-2 left-16 w-1 h-1 bg-green-300 rounded-full animate-pulse"></div>
                <div className="absolute bottom-2 right-20 w-0.5 h-0.5 bg-amber-300 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
              </div>
              
              <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center relative z-10">
                <div>
                  <h2 className="text-lg font-bold text-gradient gothic-text">
                    {isAuthenticated ? `${getDisplayName()}'s Mystical Kitchen` : 'Ancient Kitchen Wisdom'}
                  </h2>
                  <p className="text-sm text-stone-400">Sharing enchanted recipes from the heart of the home</p>
                </div>
                <button
                  onClick={startNewConversation}
                  className="bg-gradient-to-r from-stone-700 via-stone-600 to-stone-700 hover:from-amber-700 hover:via-amber-600 hover:to-amber-700 text-stone-100 hover:text-amber-100 font-medium px-6 py-3 rounded-xl border border-stone-500/60 hover:border-amber-400/60 shadow-lg shadow-stone-900/50 hover:shadow-amber-500/30 transition-all duration-300 backdrop-blur-lg flex items-center space-x-2 hover:scale-105"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Spell</span>
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-6xl mx-auto space-y-8">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-4 ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}
                  >
                    {/* Mystical Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 relative ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 border-2 border-green-400/60 shadow-lg shadow-green-500/30' 
                        : 'bg-gradient-to-br from-amber-600 via-yellow-600 to-amber-700 border-2 border-amber-400/60 shadow-lg shadow-amber-500/30'
                    }`}>
                      {/* Mystical glow effect */}
                      <div className={`absolute inset-0 rounded-full ${
                        message.role === 'user' 
                          ? 'bg-green-400/20 animate-pulse' 
                          : 'bg-amber-400/20 animate-pulse'
                      }`}></div>
                      
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

                    {/* Mystical Message Content */}
                    <div className="flex-1 max-w-4xl">
                      <div className={`rounded-2xl p-6 backdrop-blur-lg border relative overflow-hidden ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-br from-green-900/40 via-emerald-900/30 to-green-800/40 border-green-400/40 shadow-lg shadow-green-500/20' 
                          : 'bg-gradient-to-br from-stone-800/60 via-amber-900/20 to-stone-700/60 border-amber-400/30 shadow-lg shadow-amber-500/10'
                      }`}>
                        {/* Mystical background particles */}
                        <div className="absolute inset-0 opacity-20">
                          <div className={`absolute top-4 right-6 w-1 h-1 rounded-full animate-pulse ${
                            message.role === 'user' ? 'bg-green-300' : 'bg-amber-300'
                          }`}></div>
                          <div className={`absolute bottom-6 left-8 w-0.5 h-0.5 rounded-full animate-ping ${
                            message.role === 'user' ? 'bg-emerald-300' : 'bg-yellow-300'
                          }`} style={{animationDelay: '1s'}}></div>
                        </div>
                        
                        <p className="leading-relaxed whitespace-pre-wrap text-base relative z-10 font-serif" style={{ 
                          color: '#d4d4aa', 
                          textShadow: '0 0 8px rgba(212, 212, 170, 0.3)' 
                        }}>
                          {message.content}
                        </p>
                      </div>
                      <div className={`text-xs text-stone-400/70 mt-2 ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Mystical Loading Message */}
                {isWaitingForResponse && (
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-600 via-yellow-600 to-amber-700 border-2 border-amber-400/60 shadow-lg shadow-amber-500/30 flex items-center justify-center flex-shrink-0 relative">
                      <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-pulse"></div>
                      <svg className="w-6 h-6 text-white relative z-10 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 max-w-4xl">
                      <div className="bg-gradient-to-br from-stone-800/60 via-amber-900/20 to-stone-700/60 border border-amber-400/30 shadow-lg shadow-amber-500/10 backdrop-blur-lg rounded-2xl p-6 relative overflow-hidden">
                        {/* Mystical background particles */}
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute top-4 right-6 w-1 h-1 bg-amber-300 rounded-full animate-pulse"></div>
                          <div className="absolute bottom-6 left-8 w-0.5 h-0.5 bg-yellow-300 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                        </div>
                        
                        <div className="flex items-center space-x-3 relative z-10">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-sm" style={{ 
                            color: '#a3a380', 
                            textShadow: '0 0 6px rgba(163, 163, 128, 0.4)' 
                          }}>Consulting the ancient grimoire...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Mystical Input Area - Fixed at bottom of chat */}
            <div className="border-t border-green-400/30 bg-gradient-to-r from-stone-800/60 via-green-900/20 to-amber-900/30 backdrop-blur-lg p-4 relative overflow-hidden">
              {/* Mystical background particles */}
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
          </div>
        )}

      </div>
        </>
      )}
    </div>
  );
}

export default App;
