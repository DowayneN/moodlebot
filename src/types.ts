export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant' | 'processing';
  timestamp: Date;
}

export interface KnowledgeBase {
  isLoaded: boolean;
  textContent?: string;
  csvData?: any[];
} 