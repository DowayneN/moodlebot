
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
    
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please set your OpenAI API key in the settings tab.",
        variant: "destructive",
      });
      return;
    }
    
    if (!knowledgeBase.isLoaded) {
      toast({
        title: "Knowledge Base Required",
        description: "Please upload at least one file to create a knowledge base.",
        variant: "destructive",
      });
      return;
    }
    
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
      
      // Check for error messages in the response and show toasts for better UX
      if (response.includes("I'm having trouble processing your request due to the size")) {
        toast({
          title: "Knowledge Base Too Large",
          description: "Try uploading smaller files or asking a more specific question.",
          variant: "destructive",
        });
      } else if (response.includes("invalid_api_key") || response.includes("The API key appears to be invalid")) {
        toast({
          title: "Invalid API Key",
          description: "Please check your OpenAI API key in settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again with a more specific question.",
        variant: "destructive",
      });
      
      // Add an error message in the chat
      const errorMessage: Message = {
        id: uuidv4(),
        content: "Sorry, I encountered an error processing your request. Please try with a more specific question or check your API key.",
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [toast, apiKey, knowledgeBase]);

  const clearChat = useCallback(() => {
    setMessages([]);
    
    toast({
      title: "Chat cleared",
      description: "All messages have been cleared.",
    });
  }, [toast]);

  // Check if chat is ready to use
  const isChatReady = apiKey && knowledgeBase.isLoaded;

  return {
    messages,
    loading,
    knowledgeBase,
    apiKey,
    sendMessage,
    updateKnowledgeBase,
    updateApiKey,
    clearChat,
    isChatReady
  };
};
