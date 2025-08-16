import { useState, useRef, useEffect } from "react";
import { fetchUserAttributes } from "aws-amplify/auth";
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
  const hardcodedConversationId = "arcane-kitchen-conversation";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if user is authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const attributes = await fetchUserAttributes();
        setIsAuthenticated(true);
        console.log("👤 Logged-in user:", attributes);
      } catch (error) {
        console.log("User is not authenticated");
        setIsAuthenticated(false);
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
      
      if (isAuthenticated) {
        let convId = conversationId || hardcodedConversationId;
        if (!conversationId) {
          convId = hardcodedConversationId;
          setConversationId(convId);
          console.log('Created/using conversation ID:', convId);
        }
      } else {
        // Simulate AI response for non-authenticated users
        setTimeout(() => {
          const responses = [
            `Ah, a seeker of culinary wisdom asks about "${content}". In the ancient texts of kitchen witchcraft, I find several mystical approaches to this query...`,
            `The herbs whisper secrets about "${content}". Let me consult the botanical grimoire and share what the earth spirits reveal...`,
            `Your question about "${content}" stirs the cauldron of knowledge. From the sacred recipes passed down through generations of kitchen witches...`,
            `The moon's wisdom illuminates your inquiry regarding "${content}". In the mystical arts of cooking, we find that...`
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
          content: `The mystical energies guide me to help with "${content}". As your kitchen witch companion, I can share ancient wisdom about herbs, recipes, and culinary magic.`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-green-900 to-amber-900 relative">
      <MysticalEffects />
      
      {/* Header */}
      <Header 
        onMenuClick={() => {}} // No sidebar to toggle
        isAuthenticated={isAuthenticated}
        onAuthChange={setIsAuthenticated}
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
                <h1 className="text-5xl md:text-7xl font-bold text-gradient gothic-text leading-tight">
                  𝔄𝔯𝔠𝔞𝔫𝔢 𝔎𝔦𝔱𝔠𝔥𝔢𝔫
                </h1>
                <h2 className="text-2xl md:text-3xl text-enchanted font-semibold">
                  Ancient Culinary Wisdom Keeper
                </h2>
                <p className="text-xl text-green-200 max-w-3xl mx-auto leading-relaxed">
                  Consult with the Kitchen Witch's ancient grimoire of botanical recipes, 
                  herbal remedies, and mystical cooking secrets passed down through generations of wise women.
                </p>
              </div>

              {/* Enhanced Quick Start Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    title: "Herbal Healing Teas",
                    description: "What herbs can I use for healing teas?",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                      </svg>
                    )
                  },
                  {
                    title: "Ancient Mushroom Magic",
                    description: "Ancient mushroom recipes for vitality",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "Moonlit Cooking Rituals",
                    description: "Moonlit cooking rituals and timing",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    )
                  },
                  {
                    title: "Love Potion Ingredients",
                    description: "Botanical ingredients for love potions",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "Seasonal Herb Gardens",
                    description: "How to grow and harvest magical herbs",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )
                  },
                  {
                    title: "Protective Kitchen Spells",
                    description: "Blessing recipes and protective cooking",
                    icon: (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center flex-shrink-0 group-hover:shadow-enchanted-glow transition-all duration-300">
                        {example.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-green-100 mb-2 group-hover:text-gradient transition-all duration-300">
                          {example.title}
                        </h3>
                        <p className="text-sm text-green-300 leading-relaxed">
                          {example.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Mystical Disclaimer */}
              <div className="text-sm text-green-300/70 max-w-2xl mx-auto italic border-t border-green-700/30 pt-6">
                "Seek ye wisdom in the ancient ways of herb and hearth, 
                where every ingredient holds the power of earth's blessing and the moon's gentle guidance."
              </div>
            </div>
          </div>
        ) : (
          // Chat Interface - Full Width
          <div className="flex-1 flex flex-col">
            {/* Chat Header with New Conversation Button */}
            <div className="border-b border-green-700/30 bg-gradient-to-r from-green-900/20 to-amber-900/20 backdrop-blur-sm">
              <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gradient gothic-text">Kitchen Witch Consultation</h2>
                  <p className="text-sm text-green-400">Ancient wisdom at thy service</p>
                </div>
                <button
                  onClick={startNewConversation}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Ritual</span>
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
                        ? 'bg-gradient-to-br from-green-600 to-green-800 border-2 border-green-500/40' 
                        : 'bg-gradient-to-br from-amber-600 to-orange-700 border-2 border-amber-500/40'
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
                      <div className={`text-xs text-green-500/70 mt-2 ${
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
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 border-2 border-amber-500/40 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 max-w-4xl">
                      <div className="chat-bubble-assistant rounded-2xl p-6">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-green-400 text-sm">Consulting the ancient grimoire...</span>
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
        <div className="border-t border-green-700/30 bg-gradient-to-r from-green-900/20 to-amber-900/20 backdrop-blur-sm p-4">
          <div className="max-w-6xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask the Kitchen Witch about herbs, recipes, or culinary magic..."
                  className="chat-input w-full pr-12 text-base"
                  disabled={isWaitingForResponse}
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-green-400">
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
                  <span>Cast Spell</span>
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
