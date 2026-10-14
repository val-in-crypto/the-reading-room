import { NextResponse } from "next/server";
import { inferTopic } from "@/lib/extract";
import type { FeedStory } from "@/lib/types";
export const maxDuration = 30;
let cache: { expires: number; stories: FeedStory[]; fetchedAt: string } | undefined;
export async function GET() {
  try {
    if (cache && cache.expires > Date.now()) return NextResponse.json(cache);
    const response = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error("Feed unavailable");
    const ids: number[] = await response.json();
    const results = await Promise.allSettled(ids.slice(0, 40).map(async id => {
      const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error("Story unavailable");
      return res.json();
    }));
    const stories: FeedStory[] = results.flatMap(result => {
      if (result.status !== "fulfilled") return [];
      const item = result.value;
      if (!item || item.type !== "story" || !item.url?.startsWith("https://") || item.deleted || item.dead || !item.title || !item.time) return [];
      const host = new URL(item.url).hostname.replace(/^www\./, "");
      return [{ id: `hn-${item.id}`, title: item.title, url: item.url, source: host, topic: inferTopic(item.title), publishedAt: new Date(item.time * 1000).toISOString(), score: item.score, discussionUrl: `https://news.ycombinator.com/item?id=${item.id}` }];
    });
    cache = { stories, fetchedAt: new Date().toISOString(), expires: Date.now() + 5 * 60_000 };
    return NextResponse.json(cache);
  } catch {
    return NextResponse.json({ stories: [], error: "Live discovery is unavailable right now. Your collection is still here." }, { status: 503 });
  }
}
