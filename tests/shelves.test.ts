import test from "node:test";
import assert from "node:assert/strict";
import { articles } from "../lib/articles";
import { filterArticles, visibleSelection } from "../lib/shelves";

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
