import type { Article, Topic } from "./types";

export type Shelf = "collection" | "today" | "saved";

export function filterArticles(articles: Article[], topic: Topic, search: string, shelf: Shelf, saved: string[]) {
  const query = search.trim().toLowerCase();
  return articles.filter(article =>
    (topic === "All" || article.topic === topic) &&
    (shelf !== "saved" || saved.includes(article.id)) &&
    `${article.title} ${article.description} ${article.source}`.toLowerCase().includes(query),
  );
}

/** An excluded selection must never remain visible beside an unrelated shelf. */
export function visibleSelection(selectedId: string, articles: Article[]) {
  return articles.some(article => article.id === selectedId) ? selectedId : articles[0]?.id ?? null;
}

/** Collection contains opened reads and imports, never untouched sample essays. */
export function readingCollection(articles: Article[], readIds: string[]) {
  return articles.filter(article => article.kind === "imported" || readIds.includes(article.id))
    .sort((a, b) => {
      const first = readIds.indexOf(a.id), second = readIds.indexOf(b.id);
      return (first < 0 ? Infinity : first) - (second < 0 ? Infinity : second);
    });
}

export function rememberRead(readIds: string[], id: string) {
  return [id, ...readIds.filter(previous => previous !== id)].slice(0, 200);
}
