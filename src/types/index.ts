
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface KnowledgeBase {
  textContent?: string;
  csvData?: any[];
  isLoaded: boolean;
}

export type FileType = 'txt' | 'csv';
