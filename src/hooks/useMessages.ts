import { useState, useRef, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const dataClient = generateClient<Schema>();

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

    try {
      setIsWaitingForResponse(true);
      
      // Try the real AI conversation first
      try {
        console.log('🔮 Attempting real AI conversation...');
        
        let response;
        
        // Method 1: Try sendMessage on the conversation route
        if ('sendMessage' in dataClient.conversations.sousChef && typeof (dataClient.conversations.sousChef as any).sendMessage === 'function') {
          response = await (dataClient.conversations.sousChef as any).sendMessage({
            content: [{ text: content }]
          });
        }
        // Method 2: Try create method with message content
        else if ('create' in dataClient.conversations.sousChef && typeof (dataClient.conversations.sousChef as any).create === 'function') {
          response = await (dataClient.conversations.sousChef as any).create({
            content: [{ text: content }]
          });
        }
        // Method 3: Try mutations approach
        else if (dataClient.mutations) {
          const mutationKeys = Object.keys(dataClient.mutations);
          const aiMutation = mutationKeys.find(key => 
            key.toLowerCase().includes('souschef') || 
            key.toLowerCase().includes('conversation') ||
            key.toLowerCase().includes('message')
          );
          
          if (aiMutation) {
            response = await (dataClient.mutations as any)[aiMutation]({
              content: content
            });
          }
        }
        
        if (response?.data?.content) {
          let aiContent;
          
          // Handle different response formats
          if (Array.isArray(response.data.content)) {
            aiContent = response.data.content
              .filter((item: any) => item.text)
              .map((item: any) => item.text)
              .join('');
          } else if (typeof response.data.content === 'string') {
            aiContent = response.data.content;
          } else {
            aiContent = JSON.stringify(response.data.content);
          }
          
          addMessage({ role: 'assistant', content: aiContent });
          setIsWaitingForResponse(false);
          return;
        }
        
        throw new Error('AI response received but no content found');
        
      } catch (aiError) {
        console.error('❌ Real AI failed:', aiError);
        
        // Show deployment status instead of generated responses
        setTimeout(() => {
          addMessage({ 
            role: 'assistant', 
            content: `🔧 **AI Deployment Status**\n\nI can see you asked: "${content}"\n\nThe AI conversation system needs to be deployed first. To get real AI responses:\n\n1. **Deploy the backend**: Run \`npx ampx sandbox\`\n2. **Wait for deployment**: Usually takes 5-10 minutes\n3. **Test again**: The AI should then respond with real Claude responses\n\n**Current Error**: ${aiError instanceof Error ? aiError.message : 'AI conversation not available'}\n\nOnce deployed, I'll be able to give you proper cooking advice and recipes! 🍳✨`
          });
          setIsWaitingForResponse(false);
        }, 1000);
      }
        
    } catch (error) {
      console.error('❌ Message handling error:', error);
      setIsWaitingForResponse(false);
      
      addMessage({ 
        role: 'assistant', 
        content: `I'm having a small technical hiccup, but I'm still here to help with "${content}"! What cooking question can I assist you with right now? 🔧✨`
      });
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