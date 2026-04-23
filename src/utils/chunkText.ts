export function chunkText(text: string, maxChunkLength = 320): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;

    if (candidate.length <= maxChunkLength) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
    }

    if (sentence.length <= maxChunkLength) {
      current = sentence;
      continue;
    }

    for (let index = 0; index < sentence.length; index += maxChunkLength) {
      chunks.push(sentence.slice(index, index + maxChunkLength));
    }

    current = "";
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}
