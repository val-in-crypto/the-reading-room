/** One field accepts either a public article URL or the complete pasted text. */
export function parseImportInput(value: string): { url: string } | { title: string; paragraphs: string[]; text: string } {
  const text = value.trim();
  if (/^(https?:\/\/|www\.)/i.test(text)) {
    try {
      const url = new URL(text);
      if (url.protocol === "https:" && !/\s/.test(text)) return { url: url.href };
    } catch { /* Report the same inline validation for incomplete URLs. */ }
    throw new Error("Use a complete article link starting with https://.");
  }
  if (text.length < 200) throw new Error("Paste an https:// link or at least 200 characters of article text.");
  if (text.length > 60_000) throw new Error("Use up to 60,000 characters of article text.");
  const firstLine = text.split(/\n/).find(line => line.trim())!.trim();
  const title = firstLine.length <= 100 ? firstLine : `${firstLine.slice(0, firstLine.lastIndexOf(" ", 96) > 0 ? firstLine.lastIndexOf(" ", 96) : 96)}…`;
  return { title, text, paragraphs: text.split(/\n\s*\n/).filter(Boolean) };
}
