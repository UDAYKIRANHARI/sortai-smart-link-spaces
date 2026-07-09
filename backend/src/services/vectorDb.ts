import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';

// Types
export interface LinkMetadata extends RecordMetadata {
  userId: string;
  title: string;
  url: string;
  space: string;
  createdAt: string;
}

let pinecone: Pinecone | null = null;
const INDEX_NAME = 'sortai-links';
const DIMENSION = 1024; // Nvidia's nv-embedqa-e5-v5 dimension size

export async function initPinecone() {
  if (pinecone) return pinecone;

  const apiKey = process.env.PINECONE_API_KEY;
  if (!apiKey) {
    console.warn('[VectorDB] PINECONE_API_KEY is not set. Vector search will be disabled.');
    return null;
  }

  pinecone = new Pinecone({ apiKey });
  
  try {
    // Check if index exists, if not, create it
    const list = await pinecone.listIndexes();
    const exists = list.indexes?.some(idx => idx.name === INDEX_NAME);
    
    if (!exists) {
      console.log(`[VectorDB] Index ${INDEX_NAME} does not exist. Creating it now... (this may take a minute)`);
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: DIMENSION,
        metric: 'cosine',
        spec: { 
          serverless: { 
            cloud: 'aws', 
            region: 'us-east-1' 
          } 
        }
      });
      console.log(`[VectorDB] Index ${INDEX_NAME} created successfully.`);
    }
  } catch (error) {
    console.error('[VectorDB] Error initializing index:', error);
  }

  return pinecone;
}

// Call on startup
initPinecone();

export async function upsertLinkVector(
  linkId: string, 
  vector: number[], 
  metadata: LinkMetadata
): Promise<void> {
  const pc = await initPinecone();
  if (!pc) return;

  const index = pc.Index<LinkMetadata>(INDEX_NAME);
  
  await index.upsert({
    records: [{
      id: linkId,
      values: vector,
      metadata
    }]
  });
  
  console.log(`[VectorDB] Upserted vector for link ${linkId}`);
}

export async function searchSimilarLinks(
  userId: string, 
  queryVector: number[], 
  topK: number = 10
): Promise<{id: string, score: number, metadata: LinkMetadata}[]> {
  const pc = await initPinecone();
  if (!pc) return [];

  const index = pc.Index<LinkMetadata>(INDEX_NAME);
  
  const results = await index.query({
    vector: queryVector,
    topK,
    filter: { userId }, // Only return links belonging to this user
    includeMetadata: true
  });

  return results.matches.map(match => ({
    id: match.id,
    score: match.score || 0,
    metadata: match.metadata as LinkMetadata
  }));
}

export async function deleteLinkVector(linkId: string): Promise<void> {
  const pc = await initPinecone();
  if (!pc) return;
  const index = pc.Index<LinkMetadata>(INDEX_NAME);
  await index.deleteOne({ id: linkId } as any); // cast as any just in case the signature requires more
}
