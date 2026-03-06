-- RPC for vector similarity search on KB chunks
CREATE OR REPLACE FUNCTION match_kb_chunks(
  query_embedding vector(1536),
  match_threshold FLOAT,
  match_count INT,
  p_business_id UUID
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  doc_title TEXT,
  similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
  SELECT
    kc.id,
    kc.content,
    kd.title AS doc_title,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM kb_chunks kc
  JOIN kb_docs kd ON kd.id = kc.doc_id
  WHERE kc.business_id = p_business_id
    AND kc.embedding IS NOT NULL
    AND kd.is_active = true
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;
