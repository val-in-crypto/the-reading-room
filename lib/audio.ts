export function splitNarration(paragraphs: string[], limit = 2600) {
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    const sentences = paragraph.match(/[^.!?]+[.!?]+(?:["”’])?|[^.!?]+$/g) || [paragraph];
    for (const sentence of sentences) {
      let remaining = sentence.trim();
      while (remaining) {
        if (current && current.length + remaining.length + 1 > limit) { chunks.push(current); current = ""; }
        if (remaining.length > limit) {
          const boundary = remaining.lastIndexOf(" ", limit);
          const cut = boundary > 0 ? boundary : limit;
          chunks.push(remaining.slice(0, cut)); remaining = remaining.slice(cut).trim();
        } else { current += (current ? " " : "") + remaining; remaining = ""; }
      }
    }
    if (current && current.length + 2 <= limit) current += "\n\n";
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
