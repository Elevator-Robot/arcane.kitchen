import React, { useState } from 'react';
import { useMessages } from '../hooks/useMessages';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import WelcomeScreen from './WelcomeScreen';

interface ChatInterfaceProps {
  isAuthenticated: boolean;
  currentUser: any;
  userAttributes: any;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  isAuthenticated,
  currentUser,
  userAttributes
}) => {
  const {
    messages,
    isWaitingForResponse,
    messagesEndRef,
    handleSendMessage,
    handleQuickMessage
  } = useMessages();

  const [inputMessage, setInputMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isWaitingForResponse) return;

    const userMessage = inputMessage;
    setInputMessage('');

    await handleSendMessage(userMessage, isAuthenticated, currentUser);
  };

  const onQuickMessage = async (message: string) => {
    await handleQuickMessage(message, isAuthenticated, currentUser);
  };

  if (messages.length === 0) {
    return (
      <WelcomeScreen
        isAuthenticated={isAuthenticated}
        userAttributes={userAttributes}
        onQuickMessage={onQuickMessage}
        inputMessage={inputMessage}
        setInputMessage={setInputMessage}
        handleSubmit={handleSubmit}
        isWaitingForResponse={isWaitingForResponse}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList
        messages={messages}
        isWaitingForResponse={isWaitingForResponse}
        messagesEndRef={messagesEndRef}
      />

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

export default ChatInterface;