import { KnowledgeBase } from '../types';
import { chunkText, createSimpleEmbedding, findRelevantChunks } from '../utils/textProcessing';
import { evaluationDimensions, generateNextQuestion, generateRecommendations, evaluateReadinessLevel } from '../utils/aiReadinessEvaluation';
import { pineconeService } from './pinecone';

interface ChatCompletionRequest {
  model: string;
  messages: {
    role: string;
    content: string;
  }[];
  temperature?: number;
  max_tokens?: number;
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

interface EmbeddingResponse {
  data: {
    embedding: number[];
  }[];
}

interface ProcessedEntry {
  text: string;
  metadata: {
    module?: string;
    week?: string;
    groupKey: string;
  };
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
    currentTopicId?: string;
    answers: Record<string, string>;
  } = {
    inProgress: false,
    answers: {}
  };
  
  async setKnowledgeBase(knowledgeBase: KnowledgeBase) {
    this.knowledgeBase = knowledgeBase;
    
    // Process knowledge base and store vectors in Pinecone
    await this.processKnowledgeBase();
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
  
  private async processKnowledgeBase() {
    if (!this.knowledgeBase) return;
    
    try {
      // Process text content into chunks
      const chunks: ProcessedEntry[] = [];
      if (this.knowledgeBase.textContent) {
        // Use moderate chunk size (800 chars) for text content
        const textChunks = chunkText(this.knowledgeBase.textContent, 800);
        chunks.push(...textChunks.map(chunk => ({
          text: chunk,
          metadata: { groupKey: 'General Content' }
        })));
      }
      
      // Process CSV data
      if (this.knowledgeBase.csvData && this.knowledgeBase.csvData.length > 0) {
        console.log(`Processing ${this.knowledgeBase.csvData.length} CSV records...`);
        const processedEntries = this.processCSVData(this.knowledgeBase.csvData);
        console.log(`Created ${processedEntries.length} entries from CSV data`);
        chunks.push(...processedEntries);
      }
      
      console.log(`Total chunks to process: ${chunks.length}`);
      
      // Process chunks in larger batches (up to 1000 per batch)
      let currentBatchSize = 1000;
      let successfulUpserts = 0;
      let failedBatches = 0;
      let retryQueue: ProcessedEntry[] = [];

      // Main processing loop
      for (let i = 0; i < chunks.length;) {
        const batchEndIndex = Math.min(i + currentBatchSize, chunks.length);
        const batch = chunks.slice(i, batchEndIndex);
        try {
          // Get embeddings for the entire batch
          const vectors = await Promise.all(
            batch.map(async (chunk, idx) => {
              const embedding = await this.createEmbedding(chunk.text);
              return {
                id: `doc-${i + idx}`,
                values: embedding,
                metadata: {
                  text: chunk.text,
                  module: chunk.metadata.module,
                  week: chunk.metadata.week,
                  groupKey: chunk.metadata.groupKey
                }
              };
            })
          );

          // Upsert the vectors to Pinecone
          await pineconeService.upsertVectors(vectors);
          
          successfulUpserts += vectors.length;
          console.log(`Processed batch ${Math.floor(i/currentBatchSize) + 1}/${Math.ceil(chunks.length/currentBatchSize)} - Total vectors: ${successfulUpserts}/${chunks.length}`);
          
          // Reset failed batches counter on success
          failedBatches = 0;
          
          // Move to next batch
          i = batchEndIndex;
          
          // Add a small delay between batches to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`Error processing batch ${Math.floor(i/currentBatchSize) + 1}:`, error);
          failedBatches++;
          
          // Add failed chunks to retry queue
          retryQueue.push(...batch);
          
          // If we've had multiple consecutive failures, reduce batch size
          if (failedBatches > 2) {
            currentBatchSize = Math.max(50, Math.floor(currentBatchSize / 2));
            console.log(`Reducing batch size to ${currentBatchSize} due to multiple failures`);
            continue;
          }
          
          // If it's just a single failure, skip this batch and continue
          i = batchEndIndex;
        }
      }

      // Process retry queue if there are any failed chunks
      if (retryQueue.length > 0) {
        console.log(`Attempting to process ${retryQueue.length} failed chunks...`);
        const retryBatchSize = 50; // Use smaller batch size for retries
        
        for (let i = 0; i < retryQueue.length; i += retryBatchSize) {
          const batch = retryQueue.slice(i, i + retryBatchSize);
          try {
            const vectors = await Promise.all(
              batch.map(async (chunk, idx) => {
                const embedding = await this.createEmbedding(chunk.text);
                return {
                  id: `retry-${i + idx}`,
                  values: embedding,
                  metadata: {
                    text: chunk.text,
                    module: chunk.metadata.module,
                    week: chunk.metadata.week,
                    groupKey: chunk.metadata.groupKey
                  }
                };
              })
            );

            await pineconeService.upsertVectors(vectors);
            successfulUpserts += vectors.length;
            console.log(`Processed retry batch ${Math.floor(i/retryBatchSize) + 1}/${Math.ceil(retryQueue.length/retryBatchSize)} - Total vectors: ${successfulUpserts}/${chunks.length}`);
            
            await new Promise(resolve => setTimeout(resolve, 500)); // Longer delay for retries
          } catch (error) {
            console.error(`Failed to process retry batch ${Math.floor(i/retryBatchSize) + 1}:`, error);
          }
        }
      }
      
      console.log(`Completed processing. Successfully upserted ${successfulUpserts} vectors out of ${chunks.length} chunks`);
      
      // Verify the total vector count
      try {
        const stats = await pineconeService.getIndexStats();
        console.log(`Total vectors in Pinecone index: ${stats.totalVectorCount}`);
      } catch (error) {
        console.error('Failed to get index stats:', error);
      }
    } catch (error) {
      console.error('Failed to process knowledge base:', error);
      throw error;
    }
  }

  private truncateContext(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  private processCSVData(csvData: any[]): ProcessedEntry[] {
    if (!csvData || csvData.length === 0) return [];
    
    const headers = Object.keys(csvData[0]);
    const moduleKey = headers.find(h => h.toLowerCase().includes('module'))?.toLowerCase() || '';
    const weekKey = headers.find(h => h.toLowerCase().includes('week'))?.toLowerCase() || '';
    
    // Process each row into a structured format with metadata
    return csvData.flatMap(row => {
      const module = row[moduleKey];
      const week = row[weekKey];
      const groupKey = module && week ? 
        `Module ${module} Week ${week}` : 
        'General Content';

      // Create a structured entry with all fields
      const entry = headers.map(header => {
        const value = row[header];
        // Skip empty or null values
        if (!value || value === 'null' || value === 'undefined') return null;
        return `${header}: ${value}`;
      }).filter(Boolean).join('\n');

      // Return an object with both text and metadata
      return {
        text: `=== ${groupKey} ===\n${entry}`,
        metadata: {
          module: module?.toString(),
          week: week?.toString(),
          groupKey
        }
      };
    });
  }
  
  private async getRelevantContext(query: string): Promise<string> {
    try {
      // Extract module and week information from the query if present
      const moduleMatch = query.match(/module\s*(\d+)/i);
      const weekMatch = query.match(/week\s*(\d+)/i);
      const module = moduleMatch ? moduleMatch[1] : undefined;
      const week = weekMatch ? weekMatch[1] : undefined;

      // Query Pinecone with metadata filter if module/week is specified
      const results = await pineconeService.queryVectors(query, 15, { 
        module,
        week
      });
      
      // Sort results by score to get most relevant first
      results.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      // Group results by module/week for better context organization
      const groupedResults = results.reduce((acc: Record<string, string[]>, result) => {
        const groupKey = result.metadata?.groupKey || 'General Content';
        if (!acc[groupKey]) {
          acc[groupKey] = [];
        }
        acc[groupKey].push(result.text);
        return acc;
      }, {});

      // Combine the chunks into a structured context
      let context = Object.entries(groupedResults)
        .map(([group, texts]: [string, string[]]) => `${group}:\n${texts.join('\n\n')}`)
        .join('\n\n===================\n\n');
      
      // Truncate if too long
      if (context.length > this.maxContextLength) {
        context = context.substring(0, this.maxContextLength) + '...';
      }
      
      return context;
    } catch (error) {
      console.error('Failed to get relevant context:', error);
      // Fallback to using the entire text content if Pinecone query fails
      return this.knowledgeBase?.textContent || '';
    }
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not set');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}\n${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to communicate with OpenAI API'
      );
    }
  }

  private async handleEvaluationMode(userInput: string): Promise<string> {
    try {
      if (!this.evaluationState.inProgress) {
        this.evaluationState.inProgress = true;
        
        // Start the evaluation with the first question
        const context = {
          preprocessedData: {
            chunks: [...this.textChunks, ...this.csvChunks]
          },
          previousAnswers: this.evaluationState.answers,
          currentTopicId: this.evaluationState.currentTopicId
        };

        const question = await generateNextQuestion(context, this);
        if (!question) {
          throw new Error("Failed to generate initial evaluation question");
        }

        return question;
      }

      // Store the user's answer
      if (this.evaluationState.currentTopicId) {
        this.evaluationState.answers[this.evaluationState.currentTopicId] = userInput;
      }

      // Get the next question
      const context = {
        preprocessedData: {
          chunks: [...this.textChunks, ...this.csvChunks]
        },
        previousAnswers: this.evaluationState.answers,
        currentTopicId: this.evaluationState.currentTopicId
      };

      const nextQuestion = await generateNextQuestion(context, this);

      // If no more questions, generate recommendations
      if (!nextQuestion) {
        const recommendations = await generateRecommendations(
          this.evaluationState.answers,
          context,
          this
        );

        // Reset evaluation state
        this.evaluationState = {
          inProgress: false,
          answers: {}
        };

        return recommendations;
      }

      return nextQuestion;
    } catch (error) {
      console.error('Error in evaluation mode:', error);
      
      // Reset evaluation state on error
      this.evaluationState = {
        inProgress: false,
        answers: {}
      };
      
      throw error; // Propagate error to be handled by the caller
    }
  }

  async getCompletion(prompt: string): Promise<string> {
    if (!this.apiKey) {
      return "Please set your OpenAI API key in the settings. Make sure to use a valid API key from your OpenAI account.";
    }

    if (!this.knowledgeBase?.isLoaded) {
      return "Please upload knowledge base files first.";
    }

    try {
      // Validate API key format
      if (!this.apiKey.startsWith('sk-') || this.apiKey.length < 40) {
        return "The API key format appears to be invalid. Please check your OpenAI API key in settings. It should start with 'sk-' and be at least 40 characters long.";
      }

      // Check if we're in evaluation mode
      if (this.isEvaluationMode) {
        return await this.handleEvaluationMode(prompt);
      }
      
      // Handle normal mode with knowledge base
      const relevantContext = await this.getRelevantContext(prompt);
      console.log(`Retrieved ${relevantContext.length} characters of relevant context`);
      
      const systemMessage = `You are MoodleBot, an educational assistant that helps users with their questions. 
      Use the following knowledge base to answer questions. If you don't know the answer based on the provided 
      information, say so and avoid making up information.
      
      Knowledge Base Context:
      ${relevantContext}`;

      const requestBody: ChatCompletionRequest = {
        model: "gpt-4",  // Updated to use gpt-4
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      };

      const response = await this.createChatCompletion(requestBody);
      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error in getCompletion:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          return "There seems to be an issue with your OpenAI API key. Please make sure it's valid and has sufficient credits.";
        }
        if (error.message.includes('429')) {
          return "The OpenAI API rate limit has been reached. Please try again in a moment.";
        }
        if (error.message.includes('401')) {
          return "Your OpenAI API key appears to be invalid or expired. Please check your settings.";
        }
        if (error.message.includes('fetch')) {
          return "Unable to connect to OpenAI. Please check your internet connection and try again.";
        }
      }
      
      return "I encountered an error processing your request. Please try again or check your settings.";
    }
  }

  async createEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key is not set');
    }

    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          dimensions: 1024
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText}\n${errorData.error?.message || 'Unknown error'}`
        );
      }

      const data: EmbeddingResponse = await response.json();
      const embedding = data.data[0].embedding;

      // Double-check the dimension just to be safe
      if (embedding.length !== 1024) {
        throw new Error(`Unexpected embedding dimension: ${embedding.length}. Expected 1024 dimensions.`);
      }

      return embedding;
    } catch (error) {
      console.error('OpenAI embedding request failed:', error);
      throw error;
    }
  }
}

export const openAIService = new OpenAIService();
