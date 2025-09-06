import { useState, useCallback } from 'react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface ChatOptions {
  systemPrompt?: string;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

export function useChat(options: ChatOptions = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newMessage]);
    options.onMessage?.(newMessage);
    return newMessage;
  }, [options]);

  const sendMessage = useCallback(async (content: string, metadata?: Record<string, any>) => {
    if (!content.trim() || isLoading) return null;

    setIsLoading(true);
    const userMessage = addMessage({ role: 'user', content: content.trim(), metadata });

    try {
      // Always create a new conversation for each message (for now)
      let currentConversationId = conversationId;
      
      if (!currentConversationId) {
        const conversation = await client.conversations.sousChef.create();
        if (!conversation.data?.id) {
          throw new Error('Failed to create conversation');
        }
        currentConversationId = conversation.data.id;
        setConversationId(currentConversationId);
      }

      console.log('🔮 Sending message with conversation ID:', currentConversationId);

      // Send message via direct GraphQL mutation
      const response = await client.graphql({
        query: `
          mutation SendMessage($conversationId: ID!, $content: [AmplifyAIContentBlockInput!]!) {
            sousChef(conversationId: $conversationId, content: $content) {
              id
              content {
                text
              }
              role
              createdAt
            }
          }
        `,
        variables: {
          conversationId: currentConversationId,
          content: [{ text: content.trim() }]
        }
      });

      const aiResponse = response.data?.sousChef;

      if (aiResponse?.content?.[0]?.text) {
        const assistantMessage = addMessage({ 
          role: 'assistant', 
          content: aiResponse.content[0].text,
          metadata: { responseId: aiResponse.id }
        });
        return assistantMessage;
      } else {
        throw new Error('No response content received');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Chat error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      
      // Log GraphQL errors specifically
      if (error && typeof error === 'object' && 'errors' in error) {
        console.error('GraphQL errors:', (error as any).errors);
      }
      
      const errorResponse = addMessage({ 
        role: 'assistant', 
        content: `Sorry, I encountered an error: ${errorMessage}`,
        metadata: { error: true }
      });
      
      options.onError?.(error instanceof Error ? error : new Error(errorMessage));
      return errorResponse;
      
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, isLoading, addMessage, options]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const resetConversation = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    messages,
    isLoading,
    conversationId,
    sendMessage,
    addMessage,
    clearMessages,
    resetConversation
  };
}
