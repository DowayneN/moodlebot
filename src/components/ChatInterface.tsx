
import React, { useState, useRef, useEffect } from 'react';
import { Message as MessageType } from '@/types';
import { Send, Loader2 } from 'lucide-react';
import { formatRelative } from 'date-fns';
import { Button } from '@/components/ui/button';

interface ChatInterfaceProps {
  messages: MessageType[];
  loading: boolean;
  onSendMessage: (content: string) => void;
  isKnowledgeBaseLoaded: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  loading,
  onSendMessage,
  isKnowledgeBaseLoaded
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
              <h2 className="text-2xl font-bold text-moodle-black mb-4">Welcome to MoodleBot</h2>
              <p className="text-gray-600 mb-6">
                {isKnowledgeBaseLoaded 
                  ? "I've processed your knowledge base. Ask me a question!" 
                  : "Please upload your text and CSV files to get started."}
              </p>
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
              <span>Thinking...</span>
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
            placeholder={isKnowledgeBaseLoaded ? "Ask a question..." : "Upload files to start chatting..."}
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
