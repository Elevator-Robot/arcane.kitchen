import { useState, useRef, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useMessages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (message: Omit<Message, 'timestamp'>) => {
    setMessages(prev => [...prev, { ...message, timestamp: new Date() }]);
  };

  const handleSendMessage = async (content: string, isAuthenticated: boolean, currentUser: any): Promise<void> => {
    if (!isAuthenticated || !currentUser) {
      console.log('❌ Unauthenticated user attempted to send message');
      return;
    }

    addMessage({ role: 'user', content });
    setIsWaitingForResponse(true);

    try {
      console.log('🔮 Sending message to conversation API:', content);
      console.log('🔍 Client structure:', client);
      console.log('🔍 Conversations:', client.conversations);
      console.log('🔍 SousChef object:', client.conversations.sousChef);
      console.log('🔍 Available sousChef methods:', Object.keys(client.conversations.sousChef));
      console.log('🔍 SousChef prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.conversations.sousChef)));
      
      // Create conversation if needed
      const conversation = await client.conversations.sousChef.create();
      console.log('✅ Conversation created:', conversation);
      
      if (!conversation.data?.id) {
        throw new Error('Failed to create conversation');
      }

      // Just return success for now to see the structure
      addMessage({ 
        role: 'assistant', 
        content: `✅ Conversation created with ID: ${conversation.data.id}. Check console for available methods.`
      });

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      addMessage({ 
        role: 'assistant', 
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}. Check console for details.`
      });
    } finally {
      setIsWaitingForResponse(false);
    }
  };

  const handleQuickMessage = async (message: string, isAuthenticated: boolean, currentUser: any) => {
    if (!isAuthenticated || !currentUser) {
      addMessage({ role: 'user', content: message });
      addMessage({ 
        role: 'assistant', 
        content: `👋 **Welcome to Arcane Kitchen!**\n\nYou asked: "${message}"\n\nTo get personalized AI cooking assistance, please **sign up or log in**. \n\nOnce authenticated, you'll have access to:\n• Real-time AI cooking advice from our mystical sous chef\n• Personalized recipe suggestions based on your preferences\n• Custom meal planning and ingredient substitutions\n• Step-by-step cooking guidance\n\n**Sign up now** to unlock the full magical kitchen experience! 🔮✨`
      });
      return;
    }

    addMessage({ role: 'user', content: message });
    await handleSendMessage(message, isAuthenticated, currentUser);
  };

  return {
    messages,
    isWaitingForResponse,
    messagesEndRef,
    addMessage,
    handleSendMessage,
    handleQuickMessage
  };
};