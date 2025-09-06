import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

export default function RecipeBot() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('🚀 RecipeBot component mounted');
    console.log('📊 Client:', client);
    console.log('🔗 Conversations available:', client.conversations);
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      console.log('🔮 Initializing conversation...');
      const conversation = await client.conversations.sousChef.create();
      console.log('✅ Conversation created:', conversation);
      setConversationId(conversation.data?.id || null);
      
      // Add welcome message
      setMessages([{
        role: 'assistant',
        content: "🔮 Welcome to the Mystical Kitchen! I'm your Sous Chef. I can create a magical recipe for you right now! What ingredients do you have on hand?\n\nOr try: 'Make me something with chicken and herbs'"
      }]);
    } catch (error) {
      console.error('❌ Failed to initialize conversation:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setMessages([{
        role: 'assistant',
        content: `❌ Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      console.log('🔮 Sending message:', userMessage);
      console.log('📝 Conversation ID:', conversationId);
      
      const response = await client.conversations.sousChef.sendMessage(conversationId, {
        content: [{ text: userMessage }]
      });

      console.log('✅ Response received:', response);
      console.log('📄 Response data:', JSON.stringify(response.data, null, 2));

      // Add assistant response to UI
      if (response.data?.content?.[0]?.text) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: response.data.content[0].text 
        }]);
      } else {
        console.warn('⚠️ No text content in response');
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `⚠️ Received empty response. Raw data: ${JSON.stringify(response.data)}` 
        }]);
      }
    } catch (error) {
      console.error('❌ Failed to send message:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize on first render
  // if (!conversationId && messages.length === 0) {
  //   initializeConversation();
  // }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="bg-purple-900/20 rounded-lg p-6 mb-4">
        <h2 className="text-2xl font-bold text-purple-300 mb-4">🧙‍♀️ Mystical Sous Chef</h2>
        
        <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
          {messages.map((message, index) => (
            <div key={index} className={`p-3 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-600/30 ml-8' 
                : 'bg-purple-600/30 mr-8'
            }`}>
              <div className="text-sm text-gray-300 mb-1">
                {message.role === 'user' ? '🧑‍🍳 You' : '🔮 Sous Chef'}
              </div>
              <div className="text-white whitespace-pre-wrap">{message.content}</div>
            </div>
          ))}
          {isLoading && (
            <div className="bg-purple-600/30 mr-8 p-3 rounded-lg">
              <div className="text-sm text-gray-300 mb-1">🔮 Sous Chef</div>
              <div className="text-white">Conjuring your recipe...</div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Tell me what ingredients you have..."
            className="flex-1 p-3 rounded-lg bg-gray-800 text-white border border-purple-500/30 focus:border-purple-400 focus:outline-none"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            Cast Spell ✨
          </button>
        </div>
      </div>
    </div>
  );
}
