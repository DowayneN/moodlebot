
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

  setKnowledgeBase(knowledgeBase: KnowledgeBase) {
    this.knowledgeBase = knowledgeBase;
  }

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCompletion(prompt: string): Promise<string> {
    if (!this.apiKey) {
      return "Please set your OpenAI API key in the settings.";
    }

    if (!this.knowledgeBase?.isLoaded) {
      return "Please upload knowledge base files first.";
    }

    // Build context from knowledge base
    let context = '';
    if (this.knowledgeBase.textContent) {
      context += `Text Content: ${this.knowledgeBase.textContent}\n\n`;
    }

    if (this.knowledgeBase.csvData) {
      context += `CSV Data: ${JSON.stringify(this.knowledgeBase.csvData).substring(0, 5000)}...\n\n`;
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
        return `Error: ${errorData.error?.message || 'Failed to get a response from OpenAI'}`;
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return "Sorry, I encountered an error processing your request. Please check your API key and try again.";
    }
  }
}

export const openAIService = new OpenAIService();
