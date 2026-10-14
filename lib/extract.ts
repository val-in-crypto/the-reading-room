import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { createHash } from "node:crypto";
import type { Article, Topic } from "./types";

export function inferTopic(title: string): Topic {
  if (/nobel/i.test(title)) return "Nobel Prizes";
  if (/bitcoin|crypto|blockchain|ethereum|token|stablecoin/i.test(title)) return "Crypto";
  if (/\bAI\b|artificial intelligence|machine learning|LLM|GPT|neural|chatbot/i.test(title)) return "AI";
  if (/health|medicin|medical|clinical|vaccine|cancer|patient|disease|drug|therapy/i.test(title)) return "Medicine";
  return "Tech";
}

export function extractArticle(html: string, url: string): Article {
  const dom = new JSDOM(html, { url }); // No scripts, external resources or HTML rendered in the UI.
  try {
    const parsed = new Readability(dom.window.document).parse();
    if (!parsed?.content || !parsed.textContent || parsed.textContent.trim().length < 200) throw new Error("We could not find the article text. It may need a login or JavaScript. Paste the text instead.");
    const content = new JSDOM(parsed.content);
    let paragraphs: string[];
    try {
      content.window.document.querySelectorAll("script,style,nav,aside,footer,form,button,select,figcaption").forEach(node => node.remove());
      // Walk every text block, including div-only publisher layouts. Selecting only
      // <p> elements silently loses text when a publisher mixes markup styles.
      paragraphs = [];
      let buffer = "";
      const flush = () => { const text = buffer.replace(/\s+/g, " ").trim(); if (text) paragraphs.push(text); buffer = ""; };
      const walk = (node: Node) => {
        if (node.nodeType === 3) { buffer += node.textContent ?? ""; return; }
        if (node.nodeType !== 1) return;
        const element = node as Element;
        if (element.tagName === "BR") { flush(); return; }
        const block = /^(P|DIV|SECTION|ARTICLE|H[1-6]|LI|BLOCKQUOTE|PRE|TR)$/.test(element.tagName);
        if (block) flush();
        node.childNodes.forEach(walk);
        if (block) flush();
      };
      walk(content.window.document.body); flush();
    } finally { content.window.close(); }
    if (!paragraphs.length) paragraphs = [parsed.textContent.trim()];
    if (paragraphs.join(" ").length > 60_000) throw new Error("This article is too long for the prototype. Paste a shorter section.");
    if (/subscribe to (continue|read)|sign in to (continue|read)|enable javascript|verify you are human/i.test(paragraphs.slice(0, 3).join(" ")) && paragraphs.join(" ").length < 1500) {
      throw new Error("This article appears to require a login or subscription. Paste text you have access to instead.");
    }
    const title = parsed.title?.trim() || "Your saved article";
    return {
      id: `import-${createHash("sha256").update(url).digest("hex").slice(0, 16)}`, title,
      topic: inferTopic(title), description: parsed.excerpt?.slice(0, 240) || paragraphs[0].slice(0, 240),
      paragraphs, author: parsed.byline || "Author not provided", source: parsed.siteName || new URL(url).hostname.replace(/^www\./, ""),
      url, minutes: Math.max(1, Math.ceil(paragraphs.join(" ").split(/\s+/).length / 220)), illustration: "imported", kind: "imported", addedAt: Date.now(),
    };
  } finally { dom.window.close(); }
}
