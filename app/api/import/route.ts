import { NextRequest, NextResponse } from "next/server";
import { fetchPublicPage } from "@/lib/safe-fetch";
import { extractArticle } from "@/lib/extract";
import { guardRequest, readBody } from "@/lib/server";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(req: NextRequest) {
  const rejected = guardRequest(req, "import", 10);
  if (rejected) return rejected;
  try {
    const { url } = await readBody(req, 5000);
    if (typeof url !== "string" || url.length > 2048) throw new Error("Enter a valid article link.");
    const page = await fetchPublicPage(url);
    return NextResponse.json({ article: extractArticle(page.html, page.url) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import this article.";
    return NextResponse.json({ error: /ENOTFOUND|ECONN|TLS|certificate|getaddrinfo/i.test(message) ? "We could not reach this publisher. Check the link or paste the article text." : message }, { status: 422 });
  }
}
