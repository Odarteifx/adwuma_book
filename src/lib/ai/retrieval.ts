import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmbedding } from "./embeddings";

interface RetrievalResult {
  content: string;
  similarity: number;
  docTitle: string;
}

const SIMILARITY_THRESHOLD = 0.7;
const TOP_K = 5;

export async function retrieveRelevantChunks(
  businessId: string,
  query: string
): Promise<RetrievalResult[]> {
  const supabase = createAdminClient();

  try {
    const queryEmbedding = await generateEmbedding(query);

    // Use Supabase's vector similarity search via RPC
    // Fallback: if RPC not available, do manual cosine similarity
    const { data: chunks, error } = await supabase.rpc("match_kb_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: SIMILARITY_THRESHOLD,
      match_count: TOP_K,
      p_business_id: businessId,
    });

    if (error || !chunks || chunks.length === 0) {
      // Fallback to text-based search
      return fallbackTextSearch(supabase, businessId, query);
    }

    return chunks.map(
      (c: { content: string; similarity: number; doc_title: string }) => ({
        content: c.content,
        similarity: c.similarity,
        docTitle: c.doc_title,
      })
    );
  } catch {
    // If embeddings fail, fall back to text search
    return fallbackTextSearch(supabase, businessId, query);
  }
}

async function fallbackTextSearch(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  query: string
): Promise<RetrievalResult[]> {
  const { data: docs } = await supabase
    .from("kb_docs")
    .select("title, content")
    .eq("business_id", businessId)
    .eq("is_active", true);

  if (!docs || docs.length === 0) return [];

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  return docs
    .map((doc) => {
      const lower = doc.content.toLowerCase();
      const matches = queryWords.filter((w) => lower.includes(w)).length;
      const similarity = queryWords.length > 0 ? matches / queryWords.length : 0;
      return {
        content: doc.content,
        similarity,
        docTitle: doc.title,
      };
    })
    .filter((r) => r.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, TOP_K);
}
