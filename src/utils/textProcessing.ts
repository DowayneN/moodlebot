// Text processing functions for chunking and embedding-based retrieval

/**
 * Splits a text into chunks of roughly equal size
 */
export const chunkText = (text: string, chunkSize: number = 500): string[] => {
  if (!text || text.length <= chunkSize) return [text];
  
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let currentChunk = '';
  
  for (const sentence of sentences) {
    // If the sentence itself is longer than chunkSize, split it into smaller pieces
    if (sentence.length > chunkSize) {
      const words = sentence.split(/\s+/);
      let currentPiece = '';
      
      for (const word of words) {
        if ((currentPiece + ' ' + word).length > chunkSize) {
          if (currentPiece) {
            chunks.push(currentPiece.trim());
          }
          currentPiece = word;
        } else {
          currentPiece += (currentPiece ? ' ' : '') + word;
        }
      }
      
      if (currentPiece) {
        chunks.push(currentPiece.trim());
      }
      continue;
    }
    
    // If adding this sentence would make the chunk too big, start a new chunk
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    
    currentChunk += (currentChunk ? ' ' : '') + sentence;
  }
  
  // Add the last chunk if it's not empty
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
};

/**
 * Basic vector similarity using dot product (cosine similarity for normalized vectors)
 */
export const calculateSimilarity = (vec1: number[], vec2: number[]): number => {
  if (vec1.length !== vec2.length) {
    throw new Error('Vectors must have the same dimensions');
  }
  
  let dotProduct = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
  }
  
  return dotProduct;
};

/**
 * Creates a super simple embedding vector based on term frequency
 * Note: This is a very simplistic approach, not a true embedding model
 */
export const createSimpleEmbedding = (text: string): number[] => {
  if (!text) return Array(100).fill(0);
  
  // Use a fixed vocabulary size for simplicity
  const vector = Array(100).fill(0);
  const words = text.toLowerCase().split(/\s+/);
  
  // Very naive "embedding" based on word frequencies mapped to vector positions
  words.forEach(word => {
    const hash = simpleHash(word);
    const index = hash % 100;
    vector[index] += 1;
  });
  
  // Normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude === 0 ? vector : vector.map(val => val / magnitude);
};

/**
 * Simple string hashing function
 */
const simpleHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Find the most relevant chunks for a query
 */
export const findRelevantChunks = (
  query: string, 
  chunks: {text: string, embedding: number[]}[], 
  count: number = 3
): string[] => {
  if (!chunks.length) return [];
  
  const queryEmbedding = createSimpleEmbedding(query);
  
  // Calculate similarity scores for each chunk
  const scoredChunks = chunks.map(chunk => ({
    text: chunk.text,
    score: calculateSimilarity(queryEmbedding, chunk.embedding)
  }));
  
  // Sort by similarity score (descending)
  scoredChunks.sort((a, b) => b.score - a.score);
  
  // Return the top N chunks
  return scoredChunks.slice(0, count).map(chunk => chunk.text);
};
