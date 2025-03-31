export const PINECONE_CONFIG = {
  apiKey: import.meta.env.VITE_PINECONE_API_KEY || '',
  environment: import.meta.env.VITE_PINECONE_ENVIRONMENT || '',
  indexName: import.meta.env.VITE_PINECONE_INDEX_NAME || 'ai-readiness'
}; 