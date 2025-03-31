/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_PINECONE_API_KEY: string
  readonly VITE_PINECONE_ENVIRONMENT: string
  readonly VITE_PINECONE_INDEX_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 