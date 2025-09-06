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
      // Debug what's available
      console.log('Client keys:', Object.keys(client));
      console.log('Models:', Object.keys((client as any).models || {}));
      console.log('Mutations:', Object.keys((client as any).mutations || {}));
      
      // Try to use the conversation model directly
      if ((client as any).models?.ConversationSousChef) {
        const conversation = await (client as any).models.ConversationSousChef.create({});
        console.log('Created conversation:', conversation);
      }

      // Temporary response while debugging
      addMessage({ 
        role: 'assistant', 
        content: `I received your message: "${content}". I'm working on connecting to my full AI capabilities. Check the console for debug info! 🔮`
      });

    } catch (error) {
      console.error('❌ Debug error:', error);
      addMessage({ 
        role: 'assistant', 
        content: `Debug mode: "${content}" - Check console for client structure details.`
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