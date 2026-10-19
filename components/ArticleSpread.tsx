"use client";

import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import type { Article } from "@/lib/types";

export default function ArticleSpread({ article, pages, page, textSize, busy, saved, onTurn, onExit, onListen, onTextSize, onBookmark }: {
  article: Article; pages: string[][]; page: number; textSize: number; busy: boolean; saved: boolean;
  onTurn: (page: number) => void; onExit: () => void; onListen: () => void;
  onTextSize: (size: number) => void; onBookmark: () => void;
}) {
  return <>{[0, 1].map(offset => {
    const index = page + offset;
    const exists = index < pages.length;
    return <section className={`${offset === 0 ? "left" : "right"}-page spread-article-page`} aria-label={exists ? `Article page ${index + 1}` : "End of article"} key={index}>
      <div className="spread-tools">{offset === 0 ? <button onClick={onExit}><ArrowLeft size={13} />Back to collection</button> : <><button onClick={onListen}><Headphones size={13} />Listen</button><div className="text-controls"><button aria-label="Decrease text size" disabled={textSize <= 17} onClick={() => onTextSize(textSize - 2)}>A−</button><button aria-label="Increase text size" disabled={textSize >= 21} onClick={() => onTextSize(textSize + 2)}>A+</button></div></>}</div>
      <div className="page-heading"><span className="article-category">{article.topic}</span><span className="handwriting read-length">{index === 0 ? `${article.minutes} min read` : "continued"}</span></div>
      <h2 className={`spread-title ${offset ? "spread-continuation-title" : ""}`}>{article.title}</h2>
      {offset === 0 && <p className="byline">{article.author} · {article.kind === "editorial" ? "Prototype essay" : article.source}</p>}
      <div className="reading-scroll spread-text" style={{ fontSize: textSize }} tabIndex={exists ? 0 : -1} aria-label={exists ? `Text of article page ${index + 1}` : "The end"}>
        {(pages[index] ?? []).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        {!exists && <div className="spread-end"><span className="handwriting">The end.</span><p>A little pause before your next discovery.</p></div>}
        {index === pages.length - 1 && article.url && <div className="article-source"><a href={article.url} target="_blank" rel="noopener noreferrer">Read at the original source</a></div>}
      </div>
      <div className="reading-pagination">{offset === 0 ? <><button aria-label="Previous article page" disabled={page === 0 || busy} onClick={() => onTurn(page - 2)}><ChevronLeft size={17} /></button><span>{page + 1 === pages.length ? `Page ${page + 1} of ${pages.length}` : `Pages ${page + 1}–${Math.min(page + 2, pages.length)} of ${pages.length}`}</span></> : <><button className="reading-view-toggle" onClick={onExit}>Full text</button><button aria-label="Next article page" disabled={page + 2 >= pages.length || busy} onClick={() => onTurn(page + 2)}><ChevronRight size={17} /></button></>}</div>
      <div className="page-bottom">{offset === 0 ? <button onClick={onBookmark}><Bookmark size={13} fill={saved ? "currentColor" : "none"} />{saved ? "Bookmarked" : "Keep this read"}</button> : <span>Read at your own pace.</span>}<span>{exists ? index + 1 : ""}</span></div>
    </section>;
  })}</>;
}
