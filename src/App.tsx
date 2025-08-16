import { useState, useRef, useEffect } from "react";
import { fetchUserAttributes, getCurrentUser } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import Header from "./components/Header";
import MysticalEffects from "./components/MysticalEffects";

const dataClient = generateClient<Schema>();

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
  };

  // Handle auth state changes from Header component
  const handleAuthChange = (authenticated: boolean) => {
    setIsAuthenticated(authenticated);
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
      
      {/* Header */}
      <Header 
        onMenuClick={() => {}} // No sidebar to toggle
        isAuthenticated={isAuthenticated}
        onAuthChange={handleAuthChange}
      />

      {/* Main Content Area */}
      <div className="flex flex-col h-screen pt-20">
        {messages.length === 0 ? (
          // Welcome Screen - Full Width
          <div className="flex-1 flex items-center justify-center px-4 py-12">
            <div className="max-w-4xl w-full text-center space-y-12">
              {/* Mystical Header */}
              <div className="relative">
                <div className="w-32 h-32 mx-auto mb-8 rounded-3xl brand-logo flex items-center justify-center shadow-2xl">
                  <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                
                {/* Floating botanical elements around logo */}
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
                  {isAuthenticated ? `Welcome home, ${getDisplayName()}` : 'A Cozy Place for Culinary Wisdom'}
                </h2>
                <p className="text-xl text-stone-200 max-w-3xl mx-auto leading-relaxed">
                  {isAuthenticated 
                    ? "Your family recipes and cooking wisdom await by the warm hearth."
                    : "Gather 'round the kitchen hearth for time-honored recipes, cooking wisdom, and the comfort of home-cooked meals passed down through generations."
                  }
                </p>
              </div>

              {/* Enhanced Quick Start Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    title: "Grandmother's Bread",
                    description: "How do I make traditional sourdough bread?",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    )
                  },
                  {
                    title: "Hearty Stews",
                    description: "What's a good recipe for winter stew?",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                      </svg>
                    )
                  },
                  {
                    title: "Preserving Harvest",
                    description: "How to preserve vegetables for winter?",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    )
                  },
                  {
                    title: "Comfort Foods",
                    description: "What are some warming comfort food recipes?",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "Garden to Table",
                    description: "How to cook with fresh garden vegetables?",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "Family Traditions",
                    description: "Help me recreate my family's traditional recipes",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    )
                  }
                ].map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setInputMessage(example.description)}
                    className="welcome-example group p-6 text-left h-full"
                  >
                    <div className="flex flex-col space-y-4 h-full">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-stone-600 to-stone-700 flex items-center justify-center flex-shrink-0 group-hover:shadow-lg transition-all duration-300">
                        {example.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-stone-200 mb-2 group-hover:text-gradient transition-all duration-300">
                          {example.title}
                        </h3>
                        <p className="text-sm text-stone-300 leading-relaxed">
                          {example.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Cozy Disclaimer */}
              <div className="text-sm text-stone-300/70 max-w-2xl mx-auto italic border-t border-stone-600/30 pt-6">
                "In every kitchen lies the heart of the home, where simple ingredients become cherished memories 
                and every meal tells the story of those who came before us."
              </div>
            </div>
          </div>
        ) : (
          // Chat Interface - Full Width
          <div className="flex-1 flex flex-col">
            {/* Chat Header with New Conversation Button */}
            <div className="border-b border-stone-600/30 bg-gradient-to-r from-stone-800/30 to-stone-700/30 backdrop-blur-sm cottage-beam">
              <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gradient">
                    {isAuthenticated ? `${getDisplayName()}'s Kitchen` : 'Family Kitchen Wisdom'}
                  </h2>
                  <p className="text-sm text-stone-400">Sharing recipes from the heart of the home</p>
                </div>
                <button
                  onClick={startNewConversation}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Recipe</span>
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
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-gradient-to-br from-stone-600 to-stone-700 border-2 border-stone-500/40' 
                        : 'bg-gradient-to-br from-amber-700 to-amber-800 border-2 border-amber-600/40'
                    }`}>
                      {message.role === 'user' ? (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 max-w-4xl">
                      <div className={`rounded-2xl p-6 ${
                        message.role === 'user' 
                          ? 'chat-bubble-user' 
                          : 'chat-bubble-assistant'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap text-base">
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
                
                {/* Loading Message */}
                {isWaitingForResponse && (
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-stone-600 to-stone-700 border-2 border-stone-500/40 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 max-w-4xl">
                      <div className="chat-bubble-assistant rounded-2xl p-6">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-stone-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-stone-300 text-sm">Checking the family recipe book...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>
        )}

        {/* Input Area - Always Visible */}
        <div className="border-t border-stone-600/30 bg-gradient-to-r from-stone-800/30 to-stone-700/30 backdrop-blur-sm p-4 cottage-beam">
          <div className="max-w-6xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask about family recipes, cooking tips, or comfort foods..."
                  className="chat-input w-full pr-12 text-base"
                  disabled={isWaitingForResponse}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-stone-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <button
                type="submit"
                className={`btn-primary px-8 py-4 text-base ${
                  isWaitingForResponse || !inputMessage.trim()
                    ? 'opacity-50 cursor-not-allowed' 
                    : ''
                }`}
                disabled={isWaitingForResponse || !inputMessage.trim()}
              >
                <div className="flex items-center space-x-2">
                  <span>Share Recipe</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
