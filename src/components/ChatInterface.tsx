
import React, { useState, useRef, useEffect } from 'react';
import { Message as MessageType } from '@/types';
import { Send, Loader2, AlertCircle, BrainCircuit } from 'lucide-react';
import { formatRelative } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ChatInterfaceProps {
  messages: MessageType[];
  loading: boolean;
  onSendMessage: (content: string) => void;
  isKnowledgeBaseLoaded: boolean;
  evaluationMode?: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  loading,
  onSendMessage,
  isKnowledgeBaseLoaded,
  evaluationMode = false
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-70">
            <div className="max-w-md py-8 animate-float">
              <h2 className="text-2xl font-bold text-moodle-black mb-4">
                {evaluationMode ? "AI Readiness Evaluation" : "Welcome to MoodleBot"}
              </h2>
              {!isKnowledgeBaseLoaded && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <AlertDescription>
                    Please upload both text and CSV files to create a knowledge base, and set your OpenAI API key.
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-gray-600 mb-6">
                {evaluationMode 
                  ? "I'll ask you a series of questions to evaluate your organization's AI readiness. Let's get started by sending your first message." 
                  : isKnowledgeBaseLoaded 
                    ? "I've processed your knowledge base. Ask me a question!" 
                    : "Upload your files in the Data Files tab and set your API key in the Settings tab to start."}
              </p>
              
              {evaluationMode && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                  <div className="flex items-center text-blue-700 mb-2">
                    <BrainCircuit className="h-5 w-5 mr-2" />
                    <h3 className="font-medium">AI Readiness Evaluation</h3>
                  </div>
                  <p className="text-sm text-blue-700">
                    I'll ask questions about your data, strategy, talent, infrastructure, governance, and experience to 
                    help assess your organization's readiness for AI implementation.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id}
              className={`${message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`}
            >
              <div className="flex flex-col">
                <div className="prose">
                  {message.content.split('\n').map((text, i) => (
                    <p key={i} className={`${i > 0 ? 'mt-2' : ''} ${message.role === 'user' ? 'text-white' : 'text-moodle-black'}`}>
                      {text}
                    </p>
                  ))}
                </div>
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-white/70' : 'text-gray-500'}`}>
                  {formatRelative(message.timestamp, new Date())}
                </div>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="chat-bubble-bot">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{evaluationMode ? "Analyzing..." : "Thinking..."}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={evaluationMode 
              ? "Type your response here..." 
              : isKnowledgeBaseLoaded 
                ? "Ask a question..." 
                : "Upload files and set API key to start chatting..."}
            disabled={!isKnowledgeBaseLoaded}
            className="input-field resize-none h-[42px] max-h-32 flex-1"
            rows={1}
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || loading || !isKnowledgeBaseLoaded}
            className="btn-primary h-[42px] shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
