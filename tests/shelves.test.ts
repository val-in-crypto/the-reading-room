import test from "node:test";
import assert from "node:assert/strict";
import { articles } from "../lib/articles";
import { filterArticles, visibleSelection, readingCollection, rememberRead } from "../lib/shelves";

test("a topic change replaces an excluded article with the first matching read", () => {
  const visible = filterArticles(articles, "Medicine", "", "collection", []);
  assert.equal(visibleSelection("ai-curiosity", visible), "medicine-evidence");
});

test("search with no matches produces no reader selection", () => {
  assert.equal(visibleSelection("ai-curiosity", filterArticles(articles, "All", "missing title", "collection", [])), null);
});

test("removing the last bookmark empties both the saved shelf and reader", () => {
  assert.equal(filterArticles(articles, "All", "", "saved", [articles[0].id]).length, 1);
  assert.equal(visibleSelection(articles[0].id, filterArticles(articles, "All", "", "saved", [])), null);
});

test("search trims whitespace and an eligible article stays selected", () => {
  const visible = filterArticles(articles, "All", "  INTELLIGENCE  ", "collection", []);
  assert.equal(visibleSelection("ai-curiosity", visible), "ai-curiosity");
});


test("Collection starts empty and gains only opened samples and imported articles", () => {
  assert.deepEqual(readingCollection(articles, []), []);
  const added = { ...articles[0], id: "user-added", kind: "imported" as const };
  const result = readingCollection([added, ...articles], [articles[2].id]);
  assert.deepEqual(result.map(article => article.id), [articles[2].id, "user-added"]);
  assert.equal(readingCollection([added], []).length, 1);
});

test("reading history moves an opened article to the front without duplicates", () => {
  assert.deepEqual(rememberRead(["one", "two"], "two"), ["two", "one"]);
  assert.equal(rememberRead(Array.from({ length: 200 }, (_, i) => `${i}`), "new").length, 200);
});
