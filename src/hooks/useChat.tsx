
import { useState, useCallback } from 'react';
import { Message, KnowledgeBase } from '../types';
import { openAIService } from '../services/openai';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>({ isLoaded: false });
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  const updateKnowledgeBase = useCallback((newData: Partial<KnowledgeBase>) => {
    setKnowledgeBase(prev => {
      const updated = { ...prev, ...newData, isLoaded: true };
      openAIService.setKnowledgeBase(updated);
      return updated;
    });
    
    toast({
      title: "Knowledge base updated",
      description: "Your data has been successfully loaded.",
    });
  }, [toast]);

  const updateApiKey = useCallback((key: string) => {
    setApiKey(key);
    openAIService.setApiKey(key);
    
    toast({
      title: "API Key updated",
      description: "Your OpenAI API key has been set.",
    });
  }, [toast]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    try {
      const response = await openAIService.getCompletion(content);
      
      const botMessage: Message = {
        id: uuidv4(),
        content: response,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const clearChat = useCallback(() => {
    setMessages([]);
    
    toast({
      title: "Chat cleared",
      description: "All messages have been cleared.",
    });
  }, [toast]);

  return {
    messages,
    loading,
    knowledgeBase,
    apiKey,
    sendMessage,
    updateKnowledgeBase,
    updateApiKey,
    clearChat
  };
};
