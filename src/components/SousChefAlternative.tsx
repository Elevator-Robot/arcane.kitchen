import { useState, useRef, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

// Define types for messages
type Message = {
  role: 'user' | 'assistant';
  content: string;
};

const client = generateClient<Schema>();

export default function SousChefAlternative() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isWaitingForResponse) return;

    const userMessage = inputMessage;
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setInputMessage('');
    setIsWaitingForResponse(true);

    try {
      console.log('🔮 Trying alternative approach with route...');

      // Try using the conversation route with proper typing
      const response = await (client.conversations.sousChef as any).create({
        content: [{ text: userMessage }],
      });

      console.log('📨 Route response:', response);

      // Extract the assistant's response
      const assistantMessage =
        response?.content?.[0]?.text ||
        response?.data?.content?.[0]?.text ||
        "I apologize, but I couldn't process your request at the moment.";

      console.log('🤖 Assistant response:', assistantMessage);

      // Add the response to messages
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: assistantMessage,
        },
      ]);
    } catch (error) {
      console.error('💥 Error in alternative approach:', error);

      // Add a fallback response
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I apologize, but I'm having trouble connecting to my magical cookbook at the moment. Please try again later. Error: " +
            (error as Error).message,
        },
      ]);
    } finally {
      setIsWaitingForResponse(false);
    }
  };

  // Handle clicking on a suggested question
  const handleSuggestedQuestion = (question: string) => {
    setInputMessage(question);
  };

  return (
    <div>
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-heading mb-2">
          Your Mystical Sous Chef (Alternative)
        </h2>
        <p className="text-arcane-text-light max-w-2xl mx-auto">
          Testing alternative conversation API approach.
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
                Ask for recipe ideas, cooking techniques, or ingredient
                substitutions.
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
                <p className="leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </button>
          </form>
        </div>
      </div>

      <div className="mt-12">
        <div className="magical-divider">
          <span className="magical-icon">💡</span>
        </div>
        <h3 className="text-2xl font-heading mb-4 text-center">
          Test Questions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          <button
            className="p-4 bg-white rounded-lg border border-arcane-amber-light/30 text-left hover:shadow-magical transition-shadow"
            onClick={() => handleSuggestedQuestion('Who are you?')}
          >
            "Who are you?"
          </button>
          <button
            className="p-4 bg-white rounded-lg border border-arcane-amber-light/30 text-left hover:shadow-magical transition-shadow"
            onClick={() =>
              handleSuggestedQuestion('What can you help me with?')
            }
          >
            "What can you help me with?"
          </button>
          <button
            className="p-4 bg-white rounded-lg border border-arcane-amber-light/30 text-left hover:shadow-magical transition-shadow"
            onClick={() =>
              handleSuggestedQuestion('Tell me about magical herbs')
            }
          >
            "Tell me about magical herbs"
          </button>
        </div>
      </div>
    </div>
  );
}
