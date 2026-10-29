import test from "node:test";
import assert from "node:assert/strict";
import { validateArticleUrl, isPublicAddress } from "../lib/safe-fetch";
import { extractArticle } from "../lib/extract";
import { splitNarration } from "../lib/audio";
import { paginateArticle } from "../lib/reading";

test("article URLs reject local networks, credentials and unsupported protocols", () => {
  for (const url of ["http://example.com", "file:///etc/passwd", "https://localhost", "https://127.0.0.1/", "https://169.254.169.254/", "https://10.0.0.1", "https://[::1]/", "https://[::ffff:127.0.0.1]/", "https://2130706433/", "https://0177.0.0.1/", "https://user:pass@example.com", "https://example.com:8080", "https://service.internal/"]) {
    assert.throws(() => validateArticleUrl(url), url);
  }
  assert.equal(validateArticleUrl("https://example.com/article#section").href, "https://example.com/article");
});

test("DNS address filtering rejects private, reserved, multicast and mapped addresses", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.1.1", "192.168.0.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "224.0.0.1", "192.0.2.1", "::1", "fc00::1", "fe80::1", "::ffff:192.168.1.1", "not-an-ip"]) assert.equal(isPublicAddress(ip), false, ip);
  assert.equal(isPublicAddress("8.8.8.8"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});

test("narration splitting preserves text and stays within provider limits", () => {
  const paragraphs = ["A quiet story. ".repeat(600), "x".repeat(6100), "The end."];
  const chunks = splitNarration(paragraphs);
  assert.ok(chunks.length > 3);
  for (const chunk of chunks) assert.ok(chunk.length <= 2600 && chunk.length > 0);
  assert.equal(chunks.join("").replace(/\s/g, ""), paragraphs.join("").replace(/\s/g, ""));
  assert.deepEqual(splitNarration([]), []);
});

test("article extraction returns text and attribution without executable markup", () => {
  const p = "A carefully described medical study follows people over time, checks the evidence and reports what the researchers actually measured. ".repeat(6);
  const html = `<html><head><title>A medical discovery</title><meta property="og:site_name" content="Example Journal" /></head><body><nav>Unrelated navigation</nav><article><h1>A medical discovery</h1><p class="byline">By Example Writer</p><p>${p}</p><p>${p}</p><script>throw new Error('Scripts must never run')</script><p><img src="x" onerror="alert(1)">Final observation.</p></article></body></html>`;
  const result = extractArticle(html, "https://example.com/article");
  assert.equal(result.topic, "Medicine");
  assert.equal(result.source, "Example Journal");
  assert.equal(result.kind, "imported");
  assert.ok(result.paragraphs.join(" ").includes("Final observation."));
  assert.ok(!result.paragraphs.join(" ").includes("Scripts must never run"));
  assert.ok(!result.paragraphs.join(" ").includes("onerror"));
  assert.equal(extractArticle(html, result.url).id, result.id);
});

test("unreadable and oversized pages return actionable errors", () => {
  assert.throws(() => extractArticle("<html><body>Please log in.</body></html>", "https://example.com"), /could not find/);
  assert.throws(() => extractArticle(`<article><h1>Long article</h1><p>${"word ".repeat(13000)}</p></article>`, "https://example.com"), /too long/);
});

test("reading pages preserve every word of long paragraphs and the final section", () => {
  const paragraphs = ["First paragraph. ".repeat(200), "Second paragraph. ".repeat(80), "The final sentence must be available."];
  const pages = paginateArticle(paragraphs);
  assert.ok(pages.length > 3);
  assert.equal(pages.flat().join(" ").replace(/\s+/g, " ").trim(), paragraphs.join(" ").replace(/\s+/g, " ").trim());
  assert.ok(pages.at(-1)?.join(" ").includes("The final sentence"));
});

test("extraction preserves mixed paragraph and div-only article text", () => {
  const opening = "The beginning of the article explains the research clearly. ".repeat(8);
  const middle = "An important middle section appears in a publisher div rather than a paragraph. ".repeat(8);
  const ending = "The complete final section contains the conclusions and must be included. ".repeat(8);
  const result = extractArticle(`<html><head><title>Research article</title></head><body><article><p>${opening}</p><div>${middle}</div><p>${ending}</p></article></body></html>`, "https://example.com/research");
  const text = result.paragraphs.join(" ");
  for (const section of [opening,middle,ending]) assert.ok(text.includes(section.trim()));
});


test("publisher main-page navigation is removed without removing article prose", async () => {
  const { cleanArticleParagraphs } = await import("../lib/article-text");
  const body = ["28th October 2026", "Apple was notified of the incident."];
  assert.deepEqual(cleanArticleParagraphs(["← Main Page", ...body]), body);
  assert.deepEqual(cleanArticleParagraphs(["←", "Main Page", ...body]), body);
  assert.deepEqual(cleanArticleParagraphs(["Main Page", ...body]), body);
  const prose = ["The main page explains how certificates work.", "← Main Page"];
  assert.deepEqual(cleanArticleParagraphs(prose), prose);
});
