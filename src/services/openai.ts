import { KnowledgeBase } from '../types';
import { chunkText, createSimpleEmbedding, findRelevantChunks } from '../utils/textProcessing';
import { evaluationQuestions, getNextQuestion, generateRecommendations, evaluateReadinessLevel } from '../utils/aiReadinessEvaluation';

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

interface TextChunk {
  text: string;
  embedding: number[];
}

class OpenAIService {
  private knowledgeBase: KnowledgeBase | null = null;
  private apiKey: string = '';
  private maxContextLength: number = 8000; // Reduced to leave room for the query and response
  private textChunks: TextChunk[] = [];
  private csvChunks: TextChunk[] = [];
  private isEvaluationMode: boolean = false;
  private evaluationState: {
    inProgress: boolean;
    askedQuestions: string[];
    currentTopicId?: string;
    answers: Record<string, string>;
  } = {
    inProgress: false,
    askedQuestions: [],
    answers: {}
  };
  
  setKnowledgeBase(knowledgeBase: KnowledgeBase) {
    this.knowledgeBase = knowledgeBase;
    
    // Process and embed text content when the knowledge base is set
    this.processKnowledgeBase();
  }
  
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  toggleEvaluationMode(enabled: boolean) {
    this.isEvaluationMode = enabled;
    
    if (enabled) {
      // Reset evaluation state when entering evaluation mode
      this.evaluationState = {
        inProgress: true,
        askedQuestions: [],
        answers: {}
      };
    } else {
      // Clear evaluation state when exiting
      this.evaluationState.inProgress = false;
    }
    
    return this.isEvaluationMode;
  }
  
  getEvaluationState() {
    return this.evaluationState;
  }
  
  private processKnowledgeBase() {
    if (!this.knowledgeBase) return;
    
    // Process text content into chunks with embeddings
    if (this.knowledgeBase.textContent) {
      const rawChunks = chunkText(this.knowledgeBase.textContent);
      this.textChunks = rawChunks.map(chunk => ({
        text: chunk,
        embedding: createSimpleEmbedding(chunk)
      }));
      console.log(`Processed ${this.textChunks.length} text chunks`);
    }
    
    // Process CSV data into chunks with embeddings
    if (this.knowledgeBase.csvData && this.knowledgeBase.csvData.length > 0) {
      const processedCsvData = this.processCSVData(this.knowledgeBase.csvData);
      const rawChunks = chunkText(processedCsvData, 500); // Smaller chunks for CSV data
      this.csvChunks = rawChunks.map(chunk => ({
        text: chunk,
        embedding: createSimpleEmbedding(chunk)
      }));
      console.log(`Processed ${this.csvChunks.length} CSV chunks`);
    }
  }

  private truncateContext(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private processCSVData(csvData: any[]): string {
    if (!csvData || csvData.length === 0) return '';
    
    // Extract only the most relevant data
    const relevantEntries = csvData.slice(0, 100); // Increased to get more data
    const headers = Object.keys(relevantEntries[0]);
    
    return relevantEntries.map(row => {
      return headers.map(header => `${header}: ${row[header]}`).join(', ');
    }).join('\n');
  }
  
  private getRelevantContext(query: string): string {
    // Combine chunks from both text and CSV data
    const allChunks = [...this.textChunks, ...this.csvChunks];
    if (allChunks.length === 0) {
      return this.knowledgeBase?.textContent || '';
    }
    
    // Retrieve the most relevant chunks for the query
    const relevantChunks = findRelevantChunks(query, allChunks, 5);
    
    // Combine the chunks into a single context
    let context = relevantChunks.join('\n\n');
    
    // Truncate if still too long
    if (context.length > this.maxContextLength) {
      context = this.truncateContext(context, this.maxContextLength);
    }
    
    return context;
  }

  private handleEvaluationMode(prompt: string): string {
    // Check if this is the start of the evaluation
    if (!this.evaluationState.inProgress || this.evaluationState.askedQuestions.length === 0) {
      this.evaluationState.inProgress = true;
      
      // Get the first question
      const firstQuestion = evaluationQuestions[0];
      this.evaluationState.currentTopicId = firstQuestion.id;
      this.evaluationState.askedQuestions.push(firstQuestion.id);
      
      return `I'd like to evaluate your organization's AI readiness by asking a few questions. This will help me provide personalized recommendations based on your situation.\n\n${firstQuestion.question}`;
    }
    
    // Store the user's answer for the current question
    if (this.evaluationState.currentTopicId) {
      // Check if this is a follow-up answer
      const isFollowUp = this.evaluationState.askedQuestions.includes(`${this.evaluationState.currentTopicId}-followup`);
      
      if (isFollowUp) {
        // Combine primary and follow-up answers
        this.evaluationState.answers[this.evaluationState.currentTopicId] += " " + prompt;
      } else {
        // Store the primary answer
        this.evaluationState.answers[this.evaluationState.currentTopicId] = prompt;
        
        // Mark the follow-up as asked if we're going to ask it
        const currentQuestion = evaluationQuestions.find(q => q.id === this.evaluationState.currentTopicId);
        if (currentQuestion && currentQuestion.followUp) {
          this.evaluationState.askedQuestions.push(`${this.evaluationState.currentTopicId}-followup`);
          return currentQuestion.followUp;
        }
      }
    }
    
    // Get the next question
    const nextQuestion = getNextQuestion(this.evaluationState.askedQuestions);
    
    // If we have another question, ask it
    if (nextQuestion) {
      // Find which question this is
      const questionObj = evaluationQuestions.find(q => q.question === nextQuestion);
      if (questionObj) {
        this.evaluationState.currentTopicId = questionObj.id;
        this.evaluationState.askedQuestions.push(questionObj.id);
      }
      
      return `Thank you for that information. ${nextQuestion}`;
    }
    
    // If we've asked all questions, provide an evaluation
    const readinessLevel = evaluateReadinessLevel(this.evaluationState.answers);
    const recommendations = generateRecommendations(this.evaluationState.answers, this.knowledgeBase?.textContent);
    
    // Reset the evaluation for next time
    this.evaluationState.inProgress = false;
    
    return `Thank you for answering my questions. Based on our conversation, your organization is at the **${readinessLevel}** stage of AI readiness.\n\n${recommendations}\n\nIs there anything specific you'd like to know about implementing AI in your organization?`;
  }

  async getCompletion(prompt: string): Promise<string> {
    if (!this.apiKey) {
      return "Please set your OpenAI API key in the settings.";
    }

    if (!this.knowledgeBase?.isLoaded) {
      return "Please upload knowledge base files first.";
    }

    try {
      // Check if we're in evaluation mode
      if (this.isEvaluationMode) {
        return this.handleEvaluationMode(prompt);
      }
      
      // Handle normal mode with knowledge base
      // Get relevant context based on the query
      const relevantContext = this.getRelevantContext(prompt);
      console.log(`Retrieved ${relevantContext.length} characters of relevant context`);
      
      const systemMessage = `You are MoodleBot, an educational assistant that helps users with their questions. 
      Use the following knowledge base to answer questions. If you don't know the answer based on the provided 
      information, say so and avoid making up information.
      
      Knowledge Base Context:
      ${relevantContext}`;

      const requestBody: ChatCompletionRequest = {
        model: "gpt-4o-mini", // Using a model that supports context
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.5 // Reduced for more factual responses
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
