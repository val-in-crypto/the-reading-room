import https from "node:https";
import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

export function isPublicAddress(value: string) {
  try {
    const address = ipaddr.process(value);
    return address.range() === "unicast";
  } catch { return false; }
}

export function validateArticleUrl(input: string) {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Enter a valid article link, starting with https://."); }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new Error("Use a public HTTPS article link without a login or custom port.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host.includes(".") || host === "localhost" || /\.(local|localhost|internal|test|invalid)$/.test(host) || (ipaddr.isValid(host) && !isPublicAddress(host))) {
    throw new Error("This link is not a public article address.");
  }
  url.hash = "";
  return url;
}

// Pin the validated DNS address to the connection; validate each redirect again.
// This prevents local-network access, redirect bypasses and DNS rebinding.
export async function fetchPublicPage(input: string, redirects = 0): Promise<{ html: string; url: string; contentType: string }> {
  if (redirects > 3) throw new Error("This page redirects too many times. Try its final article link.");
  const url = validateArticleUrl(input);
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error("This link is not a public article address.");
  const chosen = addresses[0];
  const result = await new Promise<{ html: string; redirect?: string; contentType: string }>((resolve, reject) => {
    const req = https.get(url, {
      agent: false,
      family: chosen.family,
      lookup: (_hostname, _options, callback) => callback(null, chosen.address, chosen.family),
      headers: { "User-Agent": "ReadingRoomPrototype/0.1 (personal article reader)", Accept: "text/html,application/xhtml+xml,application/xml,text/xml,application/rss+xml", "Accept-Encoding": "identity" },
    }, res => {
      const status = res.statusCode ?? 500;
      if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
        res.resume(); resolve({ html: "", contentType: "", redirect: new URL(res.headers.location, url).href }); return;
      }
      if (status >= 400) { res.resume(); reject(new Error("The publisher did not allow access to this page. Try an open-access article or paste its text.")); return; }
      const contentType = res.headers["content-type"] ?? "";
      if (!/html|xml/.test(contentType) || (res.headers["content-encoding"] && res.headers["content-encoding"] !== "identity")) {
        res.resume(); reject(new Error("This link does not return a supported article page.")); return;
      }
      let bytes = 0;
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > 2_000_000) { req.destroy(new Error("This page is too large to import. Paste the article text instead.")); return; }
        chunks.push(chunk);
      });
      res.on("end", () => resolve({ html: Buffer.concat(chunks).toString("utf8"), contentType }));
      res.on("error", reject);
    });
    const timer = setTimeout(() => req.destroy(new Error("The page took too long to respond. Try again or paste the article text.")), 10_000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
  });
  if (result.redirect) return fetchPublicPage(result.redirect, redirects + 1);
  return { html: result.html, contentType: result.contentType, url: url.href };
}
