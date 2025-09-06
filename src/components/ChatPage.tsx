import { useChat } from '../hooks/useChat';

export default function ChatPage() {
  const { messages, isLoading, sendMessage, resetConversation } = useChat({
    onMessage: (message) => {
      console.log('New message:', message);
    },
    onError: (error) => {
      console.error('Chat error:', error);
    }
  });

  const handleSend = async (content: string) => {
    await sendMessage(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const target = e.target as HTMLTextAreaElement;
      if (target.value.trim()) {
        handleSend(target.value);
        target.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h1 className="text-xl font-semibold">🔮 Mystical Sous Chef</h1>
        <button
          onClick={resetConversation}
          className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded transition-colors"
        >
          New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg mb-2">Welcome to Arcane Kitchen! 🧙‍♀️</p>
            <p>Ask me about recipes, cooking techniques, or ingredients.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-4 rounded-lg ${
                message.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="whitespace-pre-wrap">{message.content}</div>
              <div className="text-xs opacity-70 mt-2">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 text-gray-100 p-4 rounded-lg">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex space-x-3">
          <textarea
            onKeyPress={handleKeyPress}
            placeholder="Ask me about cooking..."
            className="flex-1 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 resize-none focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => {
              const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
              if (textarea?.value.trim()) {
                handleSend(textarea.value);
                textarea.value = '';
              }
            }}
            disabled={isLoading}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
