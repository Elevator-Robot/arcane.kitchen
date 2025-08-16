import { useState, useRef, useEffect } from "react";
import { fetchUserAttributes } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
            `Great question about "${content}"! As your culinary AI assistant, I'd be happy to help you with that recipe or cooking technique.`,
            `I love helping with cooking questions! For "${content}", here are some suggestions based on my culinary knowledge...`,
            `That's an interesting cooking challenge! Let me share some tips about "${content}" that might help you in the kitchen.`,
            `Perfect timing for a cooking question! Regarding "${content}", I can offer some professional chef insights...`
          ];
          
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: randomResponse,
            timestamp: new Date()
          }]);
          setIsWaitingForResponse(false);
        }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsWaitingForResponse(false);
      
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I'd be happy to help with "${content}". As your culinary AI assistant, I can provide cooking tips, recipe suggestions, and ingredient advice.`,
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
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={startNewConversation}
        isAuthenticated={isAuthenticated}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          isAuthenticated={isAuthenticated}
          onAuthChange={setIsAuthenticated}
        />

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-4xl mx-auto">
            {messages.length === 0 ? (
              // Welcome Screen
              <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-12">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 via-emerald-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                  </svg>
                </div>
                
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-5xl font-bold text-gradient">
                    Arcane Kitchen AI
                  </h1>
                  <p className="text-xl text-slate-400 max-w-2xl">
                    Your personal culinary assistant. Ask me anything about cooking, recipes, ingredients, or techniques.
                  </p>
                </div>

                {/* Quick Start Examples */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
                  {[
                    "What's a good recipe for dinner tonight?",
                    "How do I make perfect pasta?",
                    "Suggest a healthy breakfast recipe",
                    "What spices go well with chicken?"
                  ].map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(example)}
                      className="p-4 text-left rounded-xl bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 text-slate-300 hover:text-white"
                    >
                      <div className="flex items-start space-x-3">
                        <svg className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-sm">{example}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Chat Messages
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                      <div className={`rounded-2xl p-4 ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                          : 'bg-slate-800/70 border border-slate-700/50 text-slate-200'
                      }`}>
                        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                      <div className={`text-xs text-slate-500 mt-1 ${
                        message.role === 'user' ? 'text-right' : 'text-left'
                      }`}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user' 
                        ? 'bg-purple-600 order-1 ml-3' 
                        : 'bg-emerald-600 order-2 mr-3'
                    }`}>
                      {message.role === 'user' ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* Loading Message */}
                {isWaitingForResponse && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] order-1">
                      <div className="bg-slate-800/70 border border-slate-700/50 text-slate-200 rounded-2xl p-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          </div>
                          <span className="text-slate-400 text-sm">Thinking...</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 order-2 mr-3">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 7.172V5L8 4z" />
                      </svg>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-slate-700/50 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me anything about cooking..."
                  className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-slate-600/50 rounded-xl text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-300"
                  disabled={isWaitingForResponse}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
              </div>
              <button
                type="submit"
                className={`px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium transition-all duration-300 ${
                  isWaitingForResponse || !inputMessage.trim()
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:from-purple-500 hover:to-indigo-500 hover:shadow-lg'
                }`}
                disabled={isWaitingForResponse || !inputMessage.trim()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
