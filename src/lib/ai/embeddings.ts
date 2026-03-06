const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: text,
    }),
  });

  const data = await res.json();

  if (!data.data?.[0]?.embedding) {
    throw new Error("Failed to generate embedding");
  }

  return data.data[0].embedding;
}

export function chunkText(
  text: string,
  maxTokens: number = 500,
  overlap: number = 50
): string[] {
  // Approximate: 1 token ~= 4 characters
  const charsPerChunk = maxTokens * 4;
  const overlapChars = overlap * 4;

  if (text.length <= charsPerChunk) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + charsPerChunk;

    // Try to break at sentence boundary
    if (end < text.length) {
      const sentenceEnd = text.lastIndexOf(".", end);
      if (sentenceEnd > start + charsPerChunk * 0.5) {
        end = sentenceEnd + 1;
      }
    } else {
      end = text.length;
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlapChars;

    if (start >= text.length) break;
  }

  return chunks.filter((c) => c.length > 0);
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
