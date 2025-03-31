import { Pinecone } from '@pinecone-database/pinecone';
import { openAIService } from './openai';

// Polyfills for browser environment
if (typeof window !== 'undefined') {
  if (typeof global === 'undefined') {
    (window as any).global = window;
  }
  
  if (typeof Buffer === 'undefined') {
    (window as any).Buffer = {
      from: (str: string) => new TextEncoder().encode(str),
      isBuffer: () => false
    };
  }
}

interface PineconeConfig {
  apiKey: string;
  environment: string;
  indexName: string;
}

interface QueryMetadata {
  module?: string;
  week?: string;
}

interface PineconeVector {
  id: string;
  values: number[];
  metadata: {
    text: string;
    module?: string;
    week?: string;
    groupKey?: string;
  };
}

class PineconeService {
  private pinecone: Pinecone | null = null;
  private index: any = null;
  private namespace = 'ai-readiness';
  private isInitialized = false;

  async initialize(config: PineconeConfig) {
    if (this.isInitialized) {
      console.log('Pinecone already initialized');
      return;
    }

    try {
      // Initialize the Pinecone client
      this.pinecone = new Pinecone({
        apiKey: config.apiKey
      });

      // Get the index instance
      this.index = this.pinecone.index(config.indexName);

      // Test the connection by getting index stats
      await this.index.describeIndexStats();

      this.isInitialized = true;
      console.log('Pinecone initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Pinecone:', error);
      this.isInitialized = false;
      throw error;
    }
  }

  private checkInitialization() {
    if (!this.isInitialized || !this.index) {
      throw new Error('Pinecone not initialized. Please ensure initialize() is called first.');
    }
  }

  async upsertVectors(vectors: PineconeVector[]) {
    this.checkInitialization();

    try {
      // Upsert to Pinecone in batches of 100
      const batchSize = 100;
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        try {
          await this.index.namespace(this.namespace).upsert(batch);
        } catch (error) {
          // If the namespace doesn't exist, it will be created automatically
          if (error.message?.includes('404')) {
            console.log('Creating new namespace:', this.namespace);
            await this.index.namespace(this.namespace).upsert(batch);
          } else {
            throw error;
          }
        }
      }

      console.log(`Upserted ${vectors.length} vectors to Pinecone`);
    } catch (error) {
      console.error('Failed to upsert vectors:', error);
      throw error;
    }
  }

  async getIndexStats() {
    this.checkInitialization();
    return await this.index.describeIndexStats();
  }

  async queryVectors(query: string, topK: number = 5, metadata?: QueryMetadata) {
    this.checkInitialization();

    try {
      // Get query embedding from OpenAI
      const queryEmbedding = await openAIService.createEmbedding(query);

      // Build filter based on metadata if provided
      const filter = metadata ? {
        $and: Object.entries(metadata)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => ({
            [`metadata.${key}`]: value
          }))
      } : undefined;

      // Query Pinecone with filter
      const response = await this.index.namespace(this.namespace).query({
        topK,
        vector: queryEmbedding,
        includeValues: true,
        includeMetadata: true,
        filter
      });

      return response.matches.map(match => ({
        text: match.metadata.text,
        score: match.score,
        metadata: {
          module: match.metadata.module,
          week: match.metadata.week,
          groupKey: match.metadata.groupKey
        }
      }));
    } catch (error) {
      console.error('Failed to query vectors:', error);
      throw error;
    }
  }

  async deleteAllVectors() {
    this.checkInitialization();

    try {
      // Check if there are any vectors first
      const stats = await this.index.describeIndexStats();
      if (stats.totalVectorCount === 0) {
        console.log('No vectors to delete in Pinecone');
        return;
      }

      await this.index.namespace(this.namespace).deleteAll();
      console.log('Deleted all vectors from Pinecone');
    } catch (error) {
      // If the error is 404, it means there are no vectors to delete
      if (error.message?.includes('404')) {
        console.log('No vectors to delete in Pinecone');
        return;
      }
      console.error('Failed to delete vectors:', error);
      throw error;
    }
  }

  isReady() {
    return this.isInitialized;
  }
}

export const pineconeService = new PineconeService(); 