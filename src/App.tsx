import { useState, useRef, useEffect } from "react";
import { fetchUserAttributes } from "aws-amplify/auth";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../amplify/data/resource";
import Header from "./components/Header";
import Footer from "./components/Footer";

const dataClient = generateClient<Schema>();

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userAttributes, setUserAttributes] = useState<Record<string, string | undefined> | undefined>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const hardcodedConversationId = "arcane-kitchen-conversation";
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('discover');

  // Check if user is authenticated
  useEffect(() => {
    async function checkAuth() {
      try {
        const attributes = await fetchUserAttributes();
        setUserAttributes(attributes);
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
      // Use the raw GraphQL subscription
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
      
      // Add proper type for the subscription
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
          
          // Try to extract the data
          const brainResponse = result.data?.onCreateBrainResponse;
          if (brainResponse) {
            console.log('Extracted brain response:', brainResponse);
            
            // Check if this response is for our conversation
            if (brainResponse.conversationId === conversationId) {
              console.log('✅ MATCH: Adding response to messages:', brainResponse.response);
              setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: brainResponse.response ?? '' 
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
      return () => {}; // Empty cleanup function
    }
  }, [isAuthenticated, conversationId]);

  const handleSendMessage = async (content: string): Promise<void> => {
    try {
      setIsWaitingForResponse(true);
      
      if (isAuthenticated) {
        // For authenticated users, use the backend
        let convId = conversationId || hardcodedConversationId;
        if (!conversationId) {
          const { data: newConversation } = await dataClient.models.Conversation.create({
            id: hardcodedConversationId
          });
          convId = newConversation?.id || hardcodedConversationId;
          setConversationId(convId);
          console.log('Created/using conversation ID:', convId);
        }

        const { data: savedMessage } = await dataClient.models.Message.create({
          content,
          conversationId: convId
        });

        console.log('Message saved to backend:', savedMessage);
      } else {
        // For non-authenticated users, simulate a response
        setTimeout(() => {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `I'd be happy to help with "${content}". As your mystical sous chef, I can suggest recipes, cooking techniques, or ingredient substitutions based on your needs.` 
          }]);
          setIsWaitingForResponse(false);
        }, 1500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsWaitingForResponse(false);
      
      // Fallback to simulated response
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I'd be happy to help with "${content}". As your mystical sous chef, I can suggest recipes, cooking techniques, or ingredient substitutions based on your needs.` 
        }]);
        setIsWaitingForResponse(false);
      }, 1500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isWaitingForResponse) return;

    const userMessage = inputMessage;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setInputMessage('');

    await handleSendMessage(userMessage);
  };

  // Sample recipe data
  const featuredRecipes = [
    {
      id: 1,
      title: "Enchanted Forest Mushroom Stew",
      description: "A hearty stew infused with magical herbs and forest mushrooms.",
      image: "https://images.unsplash.com/photo-1547592180-85f173990554?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      tags: ["Vegetarian", "Autumn", "Healing"],
      difficulty: "Medium",
      prepTime: "30 min"
    },
    {
      id: 2,
      title: "Midsummer Night's Dream Salad",
      description: "A refreshing blend of summer fruits, edible flowers, and honey dressing.",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      tags: ["Vegan", "Summer", "Vitality"],
      difficulty: "Easy",
      prepTime: "15 min"
    },
    {
      id: 3,
      title: "Witch's Brew Herbal Tea",
      description: "A calming blend of chamomile, lavender, and secret magical ingredients.",
      image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      tags: ["Beverage", "Calming", "Medicinal"],
      difficulty: "Easy",
      prepTime: "5 min"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-arcane-parchment">
      <Header />

      {/* Hero Section */}
      <section className="pt-24 pb-16 px-4 bg-gradient-to-br from-arcane-purple via-arcane-purple-dark to-arcane-purple text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-5xl font-heading font-bold mb-4">Discover the Magic of Culinary Arts</h1>
              <p className="text-lg mb-6">Explore recipes from around the world, customize them to your taste, and build your own virtual cookbook with our mystical Sous Chef AI.</p>
              <div className="flex flex-wrap gap-4">
                <button className="btn btn-secondary">Explore Recipes</button>
                <button className="btn bg-white text-arcane-purple hover:bg-arcane-parchment transition-colors">Learn More</button>
              </div>
            </div>
            <div className="hidden md:block">
              <img 
                src="https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                alt="Magical Kitchen" 
                className="rounded-lg shadow-magical animate-float"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-12">
        {/* Tab Navigation */}
        <div className="mb-8 border-b border-arcane-amber-light/30">
          <div className="flex flex-wrap -mb-px">
            <button 
              onClick={() => setActiveTab('discover')}
              className={`mr-4 py-2 px-4 font-heading text-lg border-b-2 transition-colors ${
                activeTab === 'discover' 
                  ? 'border-arcane-purple text-arcane-purple' 
                  : 'border-transparent text-arcane-text hover:text-arcane-purple'
              }`}
            >
              ✨ Discover Recipes
            </button>
            <button 
              onClick={() => setActiveTab('sous-chef')}
              className={`mr-4 py-2 px-4 font-heading text-lg border-b-2 transition-colors ${
                activeTab === 'sous-chef' 
                  ? 'border-arcane-purple text-arcane-purple' 
                  : 'border-transparent text-arcane-text hover:text-arcane-purple'
              }`}
            >
              👨‍🍳 Mystical Sous Chef
            </button>
            <button 
              onClick={() => setActiveTab('grimoire')}
              className={`mr-4 py-2 px-4 font-heading text-lg border-b-2 transition-colors ${
                activeTab === 'grimoire' 
                  ? 'border-arcane-purple text-arcane-purple' 
                  : 'border-transparent text-arcane-text hover:text-arcane-purple'
              }`}
            >
              📖 My Grimoire
            </button>
            <button 
              onClick={() => setActiveTab('coven')}
              className={`py-2 px-4 font-heading text-lg border-b-2 transition-colors ${
                activeTab === 'coven' 
                  ? 'border-arcane-purple text-arcane-purple' 
                  : 'border-transparent text-arcane-text hover:text-arcane-purple'
              }`}
            >
              👥 Coven
            </button>
          </div>
        </div>

        {/* Discover Tab Content */}
        {activeTab === 'discover' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-heading mb-6">Featured Magical Recipes</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredRecipes.map(recipe => (
                  <div key={recipe.id} className="recipe-card group magical-particles">
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img 
                        src={recipe.image} 
                        alt={recipe.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-heading text-xl">{recipe.title}</h3>
                        <div className="text-arcane-amber">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-arcane-text-light text-sm mb-3">{recipe.description}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {recipe.tags.map((tag, index) => (
                          <span 
                            key={index} 
                            className="text-xs px-2 py-1 rounded-full bg-arcane-purple/10 text-arcane-purple"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs text-arcane-text-light">
                        <span>Difficulty: {recipe.difficulty}</span>
                        <span>Prep: {recipe.prepTime}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <div className="magical-divider">
                <span className="magical-icon">🔍</span>
              </div>
              <h2 className="text-3xl font-heading mb-6 text-center">Find Your Perfect Recipe</h2>
              <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-lg shadow-magical p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-arcane-text-dark text-sm mb-2">Region</label>
                      <select className="input w-full">
                        <option value="">Any Region</option>
                        <option value="mediterranean">Mediterranean</option>
                        <option value="asian">Asian</option>
                        <option value="nordic">Nordic</option>
                        <option value="middle-eastern">Middle Eastern</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-arcane-text-dark text-sm mb-2">Dietary Preference</label>
                      <select className="input w-full">
                        <option value="">Any Diet</option>
                        <option value="vegetarian">Vegetarian</option>
                        <option value="vegan">Vegan</option>
                        <option value="gluten-free">Gluten-Free</option>
                        <option value="keto">Keto</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-arcane-text-dark text-sm mb-2">Magical Property</label>
                      <select className="input w-full">
                        <option value="">Any Property</option>
                        <option value="healing">Healing</option>
                        <option value="vitality">Vitality</option>
                        <option value="calming">Calming</option>
                        <option value="focus">Focus</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-arcane-text-dark text-sm mb-2">Difficulty</label>
                      <select className="input w-full">
                        <option value="">Any Difficulty</option>
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-arcane-text-dark text-sm mb-2">Ingredients (comma separated)</label>
                    <input type="text" className="input w-full" placeholder="e.g. mushrooms, thyme, garlic" />
                  </div>
                  <button className="btn btn-primary w-full">Find Magical Recipes</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sous Chef Tab Content */}
        {activeTab === 'sous-chef' && (
          <div>
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-heading mb-2">Your Mystical Sous Chef</h2>
              <p className="text-arcane-text-light max-w-2xl mx-auto">
                Ask our AI Sous Chef to help you create custom recipes, adapt existing ones, 
                or answer any culinary questions you might have.
              </p>
            </div>

            <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-magical">
              <div className="h-96 overflow-y-auto p-6 border-b border-arcane-amber-light/30">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 rounded-full bg-arcane-purple/10 flex items-center justify-center mb-4">
                      <span className="text-2xl">👨‍🍳</span>
                    </div>
                    <p className="text-arcane-text-light mb-2">
                      Your mystical sous chef is ready to assist you.
                    </p>
                    <p className="text-sm text-arcane-text-light">
                      Ask for recipe ideas, cooking techniques, or ingredient substitutions.
                    </p>
                  </div>
                )}
                
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
                  >
                    <div
                      className={`inline-block max-w-[80%] rounded-2xl p-4 ${
                        message.role === 'user' 
                          ? 'bg-arcane-purple text-white' 
                          : 'bg-arcane-parchment-dark'
                      }`}
                    >
                      <p className="leading-relaxed">{message.content}</p>
                    </div>
                  </div>
                ))}
                
                {isWaitingForResponse && (
                  <div className="text-left mb-4">
                    <div className="inline-block rounded-2xl p-4 bg-arcane-parchment-dark">
                      <div className="flex space-x-2">
                        <div className="w-2 h-2 rounded-full bg-arcane-purple animate-pulse"></div>
                        <div className="w-2 h-2 rounded-full bg-arcane-purple animate-pulse delay-150"></div>
                        <div className="w-2 h-2 rounded-full bg-arcane-purple animate-pulse delay-300"></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4">
                <form onSubmit={handleSubmit} className="flex gap-3">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask your mystical sous chef..."
                    className="input flex-1"
                    disabled={isWaitingForResponse}
                  />
                  <button
                    type="submit"
                    className={`btn btn-primary ${isWaitingForResponse ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isWaitingForResponse}
                  >
                    <span className="mr-1">Send</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-12">
              <div className="magical-divider">
                <span className="magical-icon">💡</span>
              </div>
              <h3 className="text-2xl font-heading mb-4 text-center">Suggested Questions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                <button 
                  className="p-4 bg-white rounded-lg border border-arcane-amber-light/30 text-left hover:shadow-magical transition-shadow"
                  onClick={() => {
                    setInputMessage("How can I substitute eggs in a cake recipe?");
                  }}
                >
                  "How can I substitute eggs in a cake recipe?"
                </button>
                <button 
                  className="p-4 bg-white rounded-lg border border-arcane-amber-light/30 text-left hover:shadow-magical transition-shadow"
                  onClick={() => {
                    setInputMessage("Create a healing soup recipe with ingredients I might have at home");
                  }}
                >
                  "Create a healing soup recipe with ingredients I might have at home"
                </button>
                <button 
                  className="p-4 bg-white rounded-lg border border-arcane-amber-light/30 text-left hover:shadow-magical transition-shadow"
                  onClick={() => {
                    setInputMessage("What herbs work well for a calming evening tea blend?");
                  }}
                >
                  "What herbs work well for a calming evening tea blend?"
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Grimoire Tab Content */}
        {activeTab === 'grimoire' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto bg-arcane-purple/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">📖</span>
            </div>
            <h2 className="text-3xl font-heading mb-2">Your Recipe Grimoire</h2>
            <p className="text-arcane-text-light max-w-md mx-auto mb-8">
              Your personal collection of magical recipes will appear here once you start saving them.
            </p>
            <button className="btn btn-primary" onClick={() => setActiveTab('discover')}>Discover Recipes to Add</button>
          </div>
        )}

        {/* Coven Tab Content */}
        {activeTab === 'coven' && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto bg-arcane-purple/10 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">👥</span>
            </div>
            <h2 className="text-3xl font-heading mb-2">Join the Coven</h2>
            <p className="text-arcane-text-light max-w-md mx-auto mb-8">
              Connect with fellow kitchen witches, share recipes, and participate in seasonal celebrations.
            </p>
            <button className="btn btn-primary">Explore the Community</button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
