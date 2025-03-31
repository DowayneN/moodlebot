import { useState, useCallback } from 'react';
import { Message, KnowledgeBase } from '../types';
import { openAIService } from '../services/openai';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/components/ui/use-toast';
import { pineconeService } from '../services/pinecone';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>({ isLoaded: false });
  const [apiKey, setApiKey] = useState('');
  const [evaluationMode, setEvaluationMode] = useState(false);
  const { toast } = useToast();

  const updateKnowledgeBase = useCallback(async (newData: Partial<KnowledgeBase>) => {
    try {
      if (!pineconeService.isReady()) {
        throw new Error('Pinecone is not initialized. Please wait a moment and try again.');
      }

      setKnowledgeBase(prev => {
        const updated = { ...prev, ...newData, isLoaded: true };
        openAIService.setKnowledgeBase(updated);
        return updated;
      });
      
      toast({
        title: "Knowledge base updated",
        description: "Your data has been processed and embedded for efficient retrieval.",
      });
    } catch (error) {
      console.error('Error updating knowledge base:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update knowledge base",
        variant: "destructive",
      });
    }
  }, [toast]);

  const updateApiKey = useCallback((key: string) => {
    setApiKey(key);
    openAIService.setApiKey(key);
    
    toast({
      title: "API Key updated",
      description: "Your OpenAI API key has been set.",
    });
  }, [toast]);

  const toggleEvaluationMode = useCallback(() => {
    const newMode = !evaluationMode;
    setEvaluationMode(newMode);
    openAIService.toggleEvaluationMode(newMode);
    
    // Clear messages when entering evaluation mode
    if (newMode) {
      setMessages([]);
      
      // Add initial evaluation message
      const initialMessage: Message = {
        id: uuidv4(),
        content: "I'll help evaluate your organization's AI readiness through a series of questions. This assessment will be personalized based on your industry and data. Let's begin!",
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages([initialMessage]);
      
      toast({
        title: "AI Readiness Evaluation Mode Activated",
        description: "I'll ask questions to assess your organization's AI readiness.",
      });
    } else {
      toast({
        title: "Returning to Standard Chat Mode",
        description: "You can now ask any questions about the knowledge base.",
      });
    }
    
    return newMode;
  }, [evaluationMode, toast]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      content,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      // Validate API key before proceeding
      if (!apiKey) {
        throw new Error('Please set your OpenAI API key in settings');
      }

      if (!apiKey.startsWith('sk-') || apiKey.length < 40) {
        throw new Error('Invalid API key format. The key should start with "sk-" and be at least 40 characters long');
      }

      // Add a small processing message to improve UX
      const processingMessage: Message = {
        id: uuidv4(),
        content: evaluationMode 
          ? "Analyzing your response..." 
          : "Searching knowledge base for relevant information...",
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, processingMessage]);
      
      const response = await openAIService.getCompletion(content);
      
      // Replace the processing message with the actual response
      setMessages(prev => prev.filter(m => m.id !== processingMessage.id));
      
      const botMessage: Message = {
        id: uuidv4(),
        content: response,
        role: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      // Show appropriate toasts based on response content
      if (response.includes("API key")) {
        toast({
          title: "API Key Issue",
          description: "Please check your OpenAI API key in settings.",
          variant: "destructive",
        });
      } else if (response.includes("rate limit")) {
        toast({
          title: "Rate Limit Reached",
          description: "Please wait a moment before trying again.",
          variant: "destructive",
        });
      } else if (response.includes("internet connection")) {
        toast({
          title: "Connection Error",
          description: "Please check your internet connection.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorMessage = "An error occurred while processing your request.";
      let toastTitle = "Error";
      let toastDescription = "Failed to get a response. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorMessage = "Please set a valid OpenAI API key in settings.";
          toastTitle = "API Key Required";
          toastDescription = "Check your API key configuration.";
        } else if (error.message.includes('fetch')) {
          errorMessage = "Unable to connect to OpenAI. Please check your internet connection.";
          toastTitle = "Connection Error";
          toastDescription = "Check your internet connection and try again.";
        }
      }
      
      toast({
        title: toastTitle,
        description: toastDescription,
        variant: "destructive",
      });
      
      // Add an error message in the chat
      const errorMsg: Message = {
        id: uuidv4(),
        content: errorMessage,
        role: 'assistant',
        timestamp: new Date()
      };
      
      // Remove temporary messages and add the error message
      setMessages(prev => {
        // Keep all user messages and non-temporary assistant messages
        const filteredMessages = prev.filter(m => 
          m.role === 'user' || 
          (m.role === 'assistant' && !m.content.includes("Analyzing your response") && !m.content.includes("Searching knowledge base"))
        );
        return [...filteredMessages, errorMsg];
      });
    } finally {
      setLoading(false);
    }
  }, [toast, apiKey, knowledgeBase, evaluationMode]);

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
    evaluationMode,
    sendMessage,
    updateKnowledgeBase,
    updateApiKey,
    toggleEvaluationMode,
    clearChat,
    isChatReady
  };
};
