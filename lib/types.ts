export const topics = ["All", "Tech", "Medicine", "Nobel Prizes", "AI", "Crypto"] as const;
export type Topic = typeof topics[number];
export type Article = {
  id: string; title: string; topic: Topic; description: string; paragraphs: string[];
  author: string; source: string; url: string; minutes: number; illustration: string;
  kind: "editorial" | "imported"; addedAt?: number;
};
export type FeedStory = { id: string; title: string; url: string; source: string; topic: Topic; publishedAt: string; score?: number; discussionUrl?: string };
export type Voice = { id: string; name: string; description: string; previewUrl?: string };
