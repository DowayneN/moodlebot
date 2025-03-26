
import { KnowledgeBase } from '../types';

interface ChatCompletionRequest {
  model: string;
  messages: {
    role: string;
    content: string;
  }[];
  temperature?: number;
}

interface ChatCompletionResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

class OpenAIService {
  private knowledgeBase: KnowledgeBase | null = null;
  private apiKey: string = '';
  private maxContextLength: number = 10000; // Limit context to prevent token limit errors

  setKnowledgeBase(knowledgeBase: KnowledgeBase) {
    this.knowledgeBase = knowledgeBase;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  private truncateContext(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private processCSVData(csvData: any[]): string {
    if (!csvData || csvData.length === 0) return '';
    
    // Extract only the most relevant data
    const relevantEntries = csvData.slice(0, 50); // Limit to first 50 rows
    const headers = Object.keys(relevantEntries[0]);
    
    return relevantEntries.map(row => {
      return headers.map(header => `${header}: ${row[header]}`).join(', ');
    }).join('\n');
  }

  async getCompletion(prompt: string): Promise<string> {
    if (!this.apiKey) {
      return "Please set your OpenAI API key in the settings.";
    }

    if (!this.knowledgeBase?.isLoaded) {
      return "Please upload knowledge base files first.";
    }

    // Build context from knowledge base - with length limits
    let context = '';
    if (this.knowledgeBase.textContent) {
      context += `Text Content: ${this.truncateContext(this.knowledgeBase.textContent, this.maxContextLength)}\n\n`;
    }

    if (this.knowledgeBase.csvData) {
      const processedCsvData = this.processCSVData(this.knowledgeBase.csvData);
      context += `CSV Data: ${this.truncateContext(processedCsvData, 5000)}\n\n`;
    }

    try {
      const systemMessage = `You are MoodleBot, an educational assistant that helps users with their questions. 
      Use the following knowledge base to answer questions. If you don't know the answer based on the provided 
      information, say so and avoid making up information.
      
      Knowledge Base Context:
      ${context}`;

      const requestBody: ChatCompletionRequest = {
        model: "gpt-4o-mini", // Using a model that supports context
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        
        // Handle common error cases
        if (errorData.error?.type === 'tokens' || errorData.error?.code === 'rate_limit_exceeded') {
          return "I'm having trouble processing your request due to the size of the knowledge base. Try uploading smaller files or asking a more specific question.";
        }
        
        if (errorData.error?.code === 'invalid_api_key') {
          return "The API key appears to be invalid. Please check your OpenAI API key in settings.";
        }
        
        return `Error: ${errorData.error?.message || 'Failed to get a response from OpenAI'}`;
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return "Sorry, I encountered an error processing your request. Please check your API key and try again with a more specific question.";
    }
  }
}

export const openAIService = new OpenAIService();
