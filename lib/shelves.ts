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
