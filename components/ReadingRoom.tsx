"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronLeft, ChevronRight, ExternalLink, Headphones, Link2, LoaderCircle, Pause, Play, Plus, Search, SkipBack, SkipForward, SlidersHorizontal, Trash2, X, Volume2, Sparkles, Cpu, HeartPulse, Award, Bitcoin, BookOpen, Book, Flame, Share2, Type, RotateCcw, RotateCw, ChevronDown, MoreHorizontal, Info } from "lucide-react";
import { articles as starterArticles } from "@/lib/articles";
import { topics, type Article, type FeedStory, type Topic, type Voice } from "@/lib/types";
import { splitNarration } from "@/lib/audio";
import { narratorCatalog } from "@/lib/narrators";
import { paginateArticle } from "@/lib/reading";
import { filterArticles, visibleSelection, type Shelf } from "@/lib/shelves";
import { IconButton, Popover, closePopover } from "./QuietControls";
import TurningPage from "./TurningPage";
import MovingCover, { type CoverHome } from "./MovingCover";


const STORE = "reading-room-v1";
const sourceShelves = [
  { name: "MIT Technology Review", topic: "Tech & AI", url: "https://www.technologyreview.com/", Icon: Cpu },
  { name: "NIH Research Matters", topic: "Medicine", url: "https://www.nih.gov/news-events/nih-research-matters", Icon: HeartPulse },
  { name: "NobelPrize.org", topic: "Nobel Prizes", url: "https://www.nobelprize.org/", Icon: Award },
  { name: "CoinDesk", topic: "Crypto", url: "https://www.coindesk.com/", Icon: Bitcoin },
];
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
function safeLink(input: string) { try { return new URL(input).protocol === "https:"; } catch { return false; } }
function Illustration({ type, small = false }: { type: string; small?: boolean }) {
  const illustrations: Record<string, string> = {
    ai: "Watercolour and torn-paper collage of colourful brains on turquoise paper",
    medicine: "Handmade collage of a coral anatomical heart, cells and botanical leaves",
    nobel: "Handmade collage of a golden discovery medal, atomic orbits and flowers",
    tech: "Handmade collage of a blue vintage computer with flowering botanical circuitry",
    crypto: "Handmade collage of golden coins and interconnected ink-drawn chain loops",
    imported: "Handmade collage of an open book with colourful flowers growing from its pages",
  };
  const key = type in illustrations ? type : "imported";
  return <div className={`illustration collage-illustration ${small ? "small" : ""}`}><img src={`/assets/illustrations/${key}-collage.png`} alt={small ? "" : illustrations[key]} width={1536} height={1024} loading={small ? "lazy" : "eager"} /></div>;
}

export default function ReadingRoom() {
  const [opened, setOpened] = useState(false);
  const [bookMotion, setBookMotion] = useState<"opening" | "closing" | null>(null);
  const [pageTurn, setPageTurn] = useState<"next" | "previous" | null>(null);
  const [turningPage, setTurningPage] = useState(0);
  const [fullText, setFullText] = useState(true);
  const [wideBook, setWideBook] = useState(false);
  const [openingStory, setOpeningStory] = useState("");
  const [pendingStory, setPendingStory] = useState<FeedStory | null>(null);
  const [storyError, setStoryError] = useState<{ id: string; message: string; url: string } | null>(null);
  const storySequence = useRef(0);
  const coverHome = useRef<CoverHome | null>(null);
  const [ready, setReady] = useState(false);
  const [imports, setImports] = useState<Article[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState(starterArticles[0].id);
  const [topic, setTopic] = useState<Topic>("All");
  const [shelf, setShelf] = useState<Shelf>("collection");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"read" | "listen">("read");
  const [textSize, setTextSize] = useState(20);
  const [page, setPage] = useState(0);
  const [mobilePage, setMobilePage] = useState<"contents" | "article">("contents");
  const [modal, setModal] = useState<"import" | "about" | null>(null);
  const [importMode, setImportMode] = useState<"link" | "text">("link");
  const [url, setUrl] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [toast, setToast] = useState("");
  const [stories, setStories] = useState<FeedStory[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");
  const [feedTime, setFeedTime] = useState("");
  const [voices, setVoices] = useState<Voice[]>(narratorCatalog);
  const [voiceId, setVoiceId] = useState(narratorCatalog[0].id);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceMessage, setVoiceMessage] = useState("");
  const [playing, setPlaying] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const [previewing, setPreviewing] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const cache = useRef(new Map<string, string>());
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const positions = useRef<Record<string, { page: number; chunk: number; time: number }>>({});
  const savedVoice = useRef("");
  const reading = useRef<HTMLDivElement | null>(null);
  const allArticles = useMemo(() => [...imports, ...starterArticles], [imports]);
  const article = allArticles.find(a => a.id === selectedId) ?? starterArticles[0];
  const chunks = useMemo(() => splitNarration(article.paragraphs), [article]);
  useEffect(() => { setPageTurn(null); }, [mode]);
  const pages = useMemo(() => paginateArticle(article.paragraphs), [article]);
  const articleSpread = false;
  useEffect(() => {
    const media = matchMedia("(min-width:801px)");
    const update = () => { setWideBook(media.matches); setPageTurn(null); };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => { if (wideBook && !fullText) setPage(p => p - p % 2); }, [wideBook, fullText]);
  const wordCount = article.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  const visible = useMemo(() => filterArticles(allArticles, topic, search, shelf, saved), [allArticles, topic, search, shelf, saved]);
  const recentStories = stories.filter(a => Date.now() - new Date(a.publishedAt).getTime() <= 24 * 60 * 60_000);
  const visibleStories = recentStories.filter(a => (topic === "All" || a.topic === topic) && a.title.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORE) ?? "null");
      if (data) {
        setImports((data.imports ?? []).filter((a: Article) => a.kind === "imported" && Array.isArray(a.paragraphs) && a.paragraphs.every(p => typeof p === "string") && (a.url === "" || safeLink(a.url))));
        setSaved(Array.isArray(data.saved) ? data.saved : []);
        positions.current = data.positions ?? {};
        savedVoice.current = data.voiceId ?? "";
        if (narratorCatalog.some(v => v.id === savedVoice.current)) setVoiceId(savedVoice.current);
        if (data.selectedId) { setSelectedId(data.selectedId); setPage(data.positions?.[data.selectedId]?.page ?? 0); setChunkIndex(data.positions?.[data.selectedId]?.chunk ?? 0); setAudioTime(data.positions?.[data.selectedId]?.time ?? 0); }
        if ([17, 18, 19, 20, 21, 22].includes(data.textSize)) setTextSize(data.textSize % 2 ? data.textSize + 1 : data.textSize);
        if (data.mode === "read" || data.mode === "listen") setMode(data.mode);
      }
    } catch { /* A clean collection is usable if storage is unavailable. */ }
    setReady(true);
    fetch("/api/voices").then(r => r.json()).then(data => {
      const available: Voice[] = data.voices?.length ? data.voices : narratorCatalog;
      setVoices(available); setVoiceId(available.find(v => v.id === savedVoice.current)?.id ?? available[0].id);
      setVoiceConnected(!!data.configured && !!data.voices?.length);
      setVoiceMessage(data.error ?? (!data.configured ? "Choose and preview a storyteller. Article listening is not connected yet." : ""));
    }).catch(() => setVoiceMessage("Narrator voices could not be loaded. Please try again later."));
    return () => { storySequence.current++; controller.current?.abort(); audioRef.current?.pause(); previewRef.current?.pause(); for (const src of cache.current.values()) URL.revokeObjectURL(src); };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const previous = positions.current[article.id] ?? { chunk: 0, time: 0, page: 0 };
    positions.current[article.id] = { ...previous, page, chunk: chunkIndex, time: audioTime };
    try { localStorage.setItem(STORE, JSON.stringify({ imports, saved, selectedId, positions: positions.current, voiceId, textSize, mode })); }
    catch { setToast("Your browser could not save this collection. It will remain available for this session."); }
  }, [ready, imports, saved, selectedId, page, chunkIndex, audioTime, voiceId, textSize, mode, article.id]);
  useEffect(() => {
    if (!ready || shelf === "today" || pendingStory) return;
    const next = visibleSelection(selectedId, visible);
    if (next && next !== selectedId) chooseArticle(visible.find(a => a.id === next)!);
    if (!next) stopAudio();
  }, [ready, selectedId, visible, shelf, pendingStory]);
  const readerEmpty = !pendingStory && (shelf === "today"
    ? !visibleStories.some(story => story.url === article.url)
    : !visible.some(a => a.id === selectedId));
  function selectShelf(next: Shelf) {
    stopAudio(); storySequence.current++; setPendingStory(null); setOpeningStory(""); setStoryError(null);
    setShelf(next); setTopic("All"); setSearch(""); setSearchOpen(false); setFullText(true); setPageTurn(null); setMobilePage("contents");
  }
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(""), 4500); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { if (shelf === "today" && !stories.length) void loadFeed(); }, [shelf]);
  useEffect(() => { audioRef.current && (audioRef.current.playbackRate = speed); }, [speed]);
  useEffect(() => { reading.current?.scrollTo({ top: 0 }); }, [page, selectedId]);

  function openBook() {
    if (bookMotion) return;
    const cover = document.querySelector(".cover-book")?.getBoundingClientRect();
    if (cover) coverHome.current = { left: cover.left, top: cover.top, width: cover.width, height: cover.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
    setOpened(true);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) setBookMotion("opening");
  }
  function closeBook() {
    if (bookMotion || !opened) return;
    stopAudio(); setPageTurn(null);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setOpened(false);
    else setBookMotion("closing");
  }
  function turnPage(nextPage: number) {
    if (pageTurn || nextPage < 0 || nextPage >= pages.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPage(nextPage); return; }
    setTurningPage(nextPage); setPageTurn(nextPage > page ? "next" : "previous");
  }
  async function openPopularStory(story: FeedStory) {
    if (openingStory) return;
    const existing = imports.find(a => a.url === story.url);
    if (existing) { chooseArticle(existing); return; }
    const request = ++storySequence.current;
    stopAudio(); setOpeningStory(story.id); setPendingStory(story); setStoryError(null); setMobilePage("article"); setMode("read");
    try {
      const response = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: story.url }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (request !== storySequence.current) return;
      const imported: Article = data.article;
      setImports(previous => [imported, ...previous.filter(a => a.id !== imported.id)].slice(0, 30));
      chooseArticle(imported); setPendingStory(null); setToast("Full article opened in your room.");
    } catch (error) {
      if (request === storySequence.current) setStoryError({ id: story.id, url: story.url, message: error instanceof Error ? error.message : "This publisher could not be opened. Paste the article text instead." });
    } finally { if (request === storySequence.current) setOpeningStory(""); }
  }
  function stopAudio() {
    sequence.current++; controller.current?.abort(); audioRef.current?.pause(); audioRef.current = null; previewRef.current?.pause();
    setPlaying(false); setGenerating(false); setPreviewing(""); setAudioError("");
  }
  function chooseArticle(a: Article) {
    stopAudio(); storySequence.current++; setOpeningStory(""); setPendingStory(null); setStoryError(null); setPageTurn(null); setFullText(true); setSelectedId(a.id); const position = positions.current[a.id];
    setPage(position?.page ?? 0); setChunkIndex(position?.chunk ?? 0); setAudioTime(position?.time ?? 0); setAudioDuration(0); audioRef.current = null;
    setMobilePage("article"); setMode("read");
  }
  function toggleSaved(id: string) { setSaved(previous => previous.includes(id) ? previous.filter(x => x !== id) : [...previous, id]); }
  async function loadFeed() {
    setFeedLoading(true); setFeedError("");
    try { const res = await fetch("/api/feed"); const data = await res.json(); if (!res.ok) throw new Error(data.error); setStories(data.stories); setFeedTime(data.fetchedAt); }
    catch (error) { setFeedError(error instanceof Error ? error.message : "Could not load today's stories."); }
    finally { setFeedLoading(false); }
  }
  function openImport(link = "") { setUrl(link); setImportError(""); setImportMode("link"); setModal("import"); }
  async function importArticle(event: React.FormEvent) {
    event.preventDefault(); setImportError(""); setImporting(true);
    try {
      let imported: Article;
      if (importMode === "link") {
        if (!safeLink(url)) throw new Error("Enter a public article link starting with https://.");
        const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
        const data = await res.json(); if (!res.ok) throw new Error(data.error); imported = data.article;
      } else {
        if (!pasteTitle.trim() || pasteText.trim().length < 200) throw new Error("Add a title and at least 200 characters of article text.");
        if (pasteText.length > 60_000) throw new Error("Use up to 60,000 characters for this prototype.");
        imported = { id: `paste-${crypto.randomUUID()}`, title: pasteTitle.trim(), description: pasteText.trim().slice(0, 240), paragraphs: pasteText.trim().split(/\n\s*\n/).filter(Boolean), author: "Added by you", source: "Your pasted article", url: "", topic: topic === "All" ? "Tech" : topic, minutes: Math.max(1, Math.ceil(pasteText.split(/\s+/).length / 220)), illustration: "imported", kind: "imported", addedAt: Date.now() };
      }
      setImports(previous => [imported, ...previous.filter(a => a.id !== imported.id)].slice(0, 30)); setSaved(previous => previous.includes(imported.id) ? previous : [...previous, imported.id]);
      chooseArticle(imported); setShelf("collection"); setTopic("All"); setSearch(""); setModal(null); openBook(); setToast("A new read, tucked into your collection.");
    } catch (error) { setImportError(error instanceof Error ? error.message : "Could not add this article."); }
    finally { setImporting(false); }
  }
  async function playChunk(index: number, from = 0) {
    if (!voiceConnected) { setAudioError("Article listening is not connected yet. Your storyteller choice has been saved."); return; }
    if (!chunks[index]) return;
    const version = ++sequence.current;
    controller.current?.abort(); previewRef.current?.pause(); setPreviewing(""); audioRef.current?.pause(); setPlaying(false); setAudioError("");
    const key = `${article.id}:${voiceId}:${index}`;
    let src = cache.current.get(key);
    try {
      if (!src) {
        setGenerating(true); controller.current = new AbortController();
        const response = await fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: chunks[index], voiceId }), signal: controller.current.signal });
        if (!response.ok) { const data = await response.json(); throw new Error(data.error); }
        const blob = await response.blob(); if (version !== sequence.current) return;
        src = URL.createObjectURL(blob); cache.current.set(key, src);
        if (cache.current.size > 32) { const oldest = cache.current.keys().next().value; if (oldest) { URL.revokeObjectURL(cache.current.get(oldest)!); cache.current.delete(oldest); } }
      }
      if (version !== sequence.current) return;
      const audio = new Audio(src); audioRef.current = audio; audio.playbackRate = speedRef.current; setChunkIndex(index); setAudioTime(from);
      audio.onloadedmetadata = () => { if (version !== sequence.current) return; setAudioDuration(audio.duration); audio.currentTime = Math.min(from, Math.max(0, audio.duration - 0.1)); };
      audio.ontimeupdate = () => { if (version === sequence.current) setAudioTime(audio.currentTime); };
      audio.onplay = () => { if (version === sequence.current) setPlaying(true); };
      audio.onpause = () => { if (version === sequence.current) setPlaying(false); };
      audio.onerror = () => { if (version === sequence.current) { setPlaying(false); setAudioError("This audio could not be played. Please try again."); } };
      audio.onended = () => { if (version !== sequence.current) return; if (index + 1 < chunks.length) void playChunk(index + 1); else { setPlaying(false); setToast("A little wiser. You've reached the end."); } };
      await audio.play();
    } catch (error) { if (version === sequence.current && !(error instanceof DOMException && error.name === "AbortError")) setAudioError(error instanceof Error ? error.message : "Could not play narration."); }
    finally { if (version === sequence.current) setGenerating(false); }
  }
  function togglePlay() {
    if (pendingStory) return;
    setMode("listen");
    setMobilePage("article");
    if (generating) { stopAudio(); return; }
    if (playing) audioRef.current?.pause();
    else if (audioRef.current && audioRef.current.currentTime < audioRef.current.duration) void audioRef.current.play().catch(() => setAudioError("Press play again to resume listening."));
    else void playChunk(chunkIndex, audioTime);
  }
  function seekAudio(delta: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
    setAudioTime(audio.currentTime);
  }
  function selectVoice(id: string) { savedVoice.current = id; stopAudio(); audioRef.current = null; setVoiceId(id); setAudioTime(0); setAudioDuration(0); }
  function previewVoice(voice: Voice) {
    if (!voice.previewUrl) { setAudioError("No preview is available for this voice. Choose it to hear the article."); return; }
    if (previewing === voice.id) { previewRef.current?.pause(); setPreviewing(""); return; }
    stopAudio(); const audio = new Audio(voice.previewUrl); previewRef.current = audio; setPreviewing(voice.id);
    audio.onended = () => setPreviewing(""); audio.onerror = () => { setPreviewing(""); setAudioError("This voice preview is unavailable."); };
    void audio.play().catch(() => { setPreviewing(""); setAudioError("The preview could not play. Please try again."); });
  }
  async function shareArticle() {
    const link = article.url || window.location.href;
    try { if (navigator.share) await navigator.share({ title: article.title, url: link }); else { await navigator.clipboard.writeText(link); setToast("Link copied. Share a little curiosity."); } }
    catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setToast("Sharing is unavailable in this browser."); }
  }
  function removeArticle() {
    stopAudio(); setImports(previous => previous.filter(a => a.id !== article.id)); setSaved(previous => previous.filter(id => id !== article.id)); delete positions.current[article.id]; chooseArticle(starterArticles[0]); setToast("Article removed from this browser.");
  }

  return <main className={`${opened ? "room opened" : "room closed"} ${bookMotion ? `book-${bookMotion}` : ""}`}>
    <a className="skip-link" href="#main-content">Skip to reading room</a>
    <header className="site-header">
      <button className="brand" aria-label="Close the book" onClick={closeBook}>The Reading Room</button>
      <nav aria-label="Main navigation"><button className="subtle-button" onClick={() => setModal("about")}>A little about us</button><button className="add-button" onClick={() => openImport()}><Plus size={16} />Add an article</button></nav>
    </header>
    {!opened ? <section className="cover-scene" id="main-content" aria-label="Welcome to the Reading Room">
      <img className="cover-flowers" src="/assets/flowers.png" alt="" />
      <button className="cover-book" onClick={openBook} aria-label="Open The Reading Room"><img src="/assets/cover.png" alt="The Reading Room. A collection of curious reads." /></button>
      <button className="open-invitation" onClick={openBook}><img src="/assets/arrow.svg" alt="" /><span>open me</span></button>
      <p className="welcome-note">For curious minds.<br />And unhurried moments.</p>
      <p className="cover-footnote">READ SOMETHING GOOD. HEAR IT IN A VOICE YOU LOVE.</p>
    </section> : <>
      <section className={`book-spread ${articleSpread ? "article-spread" : ""}`} id="main-content" aria-label="Open reading book">
        <div className="book-art" aria-hidden="true"><img src="/assets/book.png" alt="" /></div>
        {bookMotion && <MovingCover direction={bookMotion} home={coverHome.current} onComplete={() => { if (bookMotion === "closing") setOpened(false); setBookMotion(null); }} />}
        {pageTurn && <TurningPage direction={pageTurn} paragraphs={pages[turningPage] ?? []} targetPage={turningPage} totalPages={pages.length} illustration={article.kind !== "imported" ? article.illustration : undefined} onComplete={() => { setPage(turningPage); setPageTurn(null); reading.current?.scrollTo({ top: 0 }); }} />}
        <>
        <section className={`left-page ${mobilePage !== "contents" ? "mobile-hidden" : ""}`} aria-label="Article collection">
          <div className="shelf-tabs" role="tablist" aria-label="Article shelves">{([
            ["collection", "Collection", BookOpen], ["today", "Today", Flame], ["saved", "Saved", Bookmark],
          ] as const).map(([id, label, Icon]) => <button key={id} role="tab" aria-selected={shelf === id} onClick={() => selectShelf(id)}><Icon /><span>{label}</span></button>)}</div>
          <div className="discovery-tools">
            <IconButton label={searchOpen ? "Close search" : "Search articles"} aria-expanded={searchOpen} onClick={() => { setSearchOpen(!searchOpen); if (!searchOpen) requestAnimationFrame(() => searchRef.current?.focus()); else setSearch(""); }}><Search /></IconButton>
            {searchOpen && <label className="search-field"><span className="sr-only">Search articles</span><input ref={searchRef} placeholder="Search articles" value={search} onChange={e => setSearch(e.target.value)} /></label>}
            {!searchOpen && topic !== "All" && <button className="active-filter" aria-label={`Clear ${topic} filter`} onClick={() => setTopic("All")}>{topic}<X /></button>}
            <Popover label="Filter topics" icon={<SlidersHorizontal />} className="topic-popover"><div className="topic-list" aria-label="Topics">{topics.map(t => <button key={t} aria-pressed={topic === t} onClick={e => { setTopic(t); closePopover(e.currentTarget); }}>{t}</button>)}</div></Popover>
          </div>
          <div className="contents-scroll">
            {shelf === "today" ? <>
              <div className="feed-note"><span>Hacker News · last 24 hours</span><IconButton label="Refresh today’s articles" disabled={feedLoading} onClick={() => void loadFeed()}><RotateCw /></IconButton></div>
              {feedLoading && <div className="feed-skeleton" role="status" aria-label="Loading today’s articles">{[0, 1, 2].map(i => <div key={i}><span /><span /><span /></div>)}</div>}
              {feedError && <p className="inline-error" role="alert">{feedError}<button onClick={() => void loadFeed()}>Retry</button></p>}
              {!feedLoading && !visibleStories.length && <div className="empty-state"><BookOpen size={28} /><p>No fresh stories on this shelf yet.</p><button onClick={() => void loadFeed()}>Retry</button></div>}
              {visibleStories.map(story => <div className={`news-row ${article.url === story.url && !readerEmpty ? "selected" : ""}`} key={story.id}><button className="story-title" disabled={!!openingStory} onClick={() => void openPopularStory(story)}>{story.title}<span className="article-meta">{story.topic} · {story.source}</span>{openingStory === story.id && <LoaderCircle className="spin" />}</button></div>)}
              {storyError && <div className="story-error" role="alert"><p>{storyError.message}</p><button onClick={() => { openImport(storyError.url); setImportMode("text"); }}>Paste article text</button></div>}
            </> : <>
              {visible.map(a => <div className={`article-row ${article.id === a.id ? "selected" : ""}`} key={a.id}>
                <button className="article-select" onClick={() => chooseArticle(a)}><Illustration type={a.illustration} small /><span><span className="article-row-title">{a.title}</span><span className="article-meta">{a.topic}<span aria-hidden="true">·</span>{a.minutes} min</span></span></button>
                <button className="bookmark-button icon-button" aria-label={saved.includes(a.id) ? `Remove bookmark: ${a.title}` : `Bookmark: ${a.title}`} aria-pressed={saved.includes(a.id)} onClick={() => toggleSaved(a.id)}><Bookmark size={16} fill={saved.includes(a.id) ? "currentColor" : "none"} /><span className="tooltip" aria-hidden="true">{saved.includes(a.id) ? "Remove bookmark" : "Bookmark"}</span></button>
                <img className="page-rule" src="/assets/rule.svg" alt="" />
              </div>)}
              {!visible.length && <div className="empty-state"><Bookmark size={26} /><p>{shelf === "saved" ? "Nothing saved yet. Tap the bookmark icon on any read." : "No reads found just yet."}</p><span>{shelf === "saved" ? "Tap a bookmark or add an article link." : "Try a different topic or search."}</span></div>}
            </>}
          </div>
          <div className="collection-actions"><button className="add-to-book" onClick={() => openImport()}><Plus />Add an article</button><IconButton label="About The Reading Room" onClick={() => setModal("about")}><Info /></IconButton></div>
        </section>
        <section className={`right-page ${mobilePage !== "article" ? "mobile-hidden" : ""}`} aria-label="Selected article">
          <div className="article-toolbar">
            <IconButton label="Back to articles" className="back-to-contents" onClick={() => { stopAudio(); setMobilePage("contents"); }}><ArrowLeft /></IconButton>
            <div className="reader-tabs" role="tablist" aria-label="Reading mode">
              <IconButton label="Read article" role="tab" aria-selected={mode === "read"} disabled={readerEmpty || !!pendingStory} onClick={() => { stopAudio(); setMode("read"); }}><BookOpen /></IconButton>
              <IconButton label="Listen to article" role="tab" aria-selected={mode === "listen"} disabled={readerEmpty || !!pendingStory} onClick={() => setMode("listen")}><Headphones /></IconButton>
            </div>
            <div className="article-actions">
              <Popover label="Text size" icon={<Type />}><div className="size-options" role="group" aria-label="Article text size">{[18, 20, 22].map(size => <button key={size} aria-pressed={textSize === size} onClick={() => setTextSize(size)}>{size === 18 ? "Small" : size === 20 ? "Medium" : "Large"}</button>)}</div></Popover>
              <IconButton label={saved.includes(article.id) ? "Remove bookmark" : "Bookmark article"} aria-pressed={saved.includes(article.id)} disabled={readerEmpty || !!pendingStory} onClick={() => toggleSaved(article.id)}><Bookmark fill={saved.includes(article.id) ? "currentColor" : "none"} /></IconButton>
              <IconButton label="Share article" disabled={readerEmpty || !!pendingStory} onClick={() => void shareArticle()}><Share2 /></IconButton>
            </div>
          </div>
          <h1 hidden={readerEmpty}>{pendingStory?.title ?? article.title}</h1>
          <p className="byline" hidden={readerEmpty}>{pendingStory?.topic ?? article.topic} · {pendingStory ? pendingStory.source : `${article.minutes} min read`}{article.kind === "imported" && !pendingStory && <> · {article.source}</>}</p>
          {readerEmpty ? <div className="empty-state reader-empty"><BookOpen /><p>{shelf === "today" ? "Choose an article to read." : "No articles on this shelf."}</p></div> : pendingStory ? <div className="article-load-state" role={storyError ? "alert" : "status"}>{openingStory ? <><LoaderCircle className="spin" size={26} /><p>Opening the full article…</p><small>Fetching text from {pendingStory.source}.</small></> : <><BookOpen size={26} /><p>This publisher couldn’t be opened.</p><small>{storyError?.message}</small><button className="primary-button" onClick={() => { openImport(pendingStory.url); setImportMode("text"); }}>Paste article text</button><button className="subtle-button" onClick={() => { setPendingStory(null); setStoryError(null); }}>Return to my read</button></>}</div> : mode === "read" ? <>
            <div className="reading-scroll" ref={reading} style={{ fontSize: textSize }} tabIndex={0} aria-label={fullText ? "Full article text" : `Article page ${Math.min(page + 1, pages.length)}`}>
              {article.kind !== "imported" && (fullText || page === 0) && <Illustration type={article.illustration} />}
              {(fullText ? article.paragraphs : pages[Math.min(page, pages.length - 1)] ?? []).map((p, i) => <p key={i}>{p}</p>)}
              {(fullText || page >= pages.length - 1) && article.url && <div className="article-source"><a href={article.url} target="_blank" rel="noopener noreferrer">Source <ExternalLink /></a></div>}
            </div>
            <div className="reading-pagination">
              {!fullText && <><IconButton label="Previous article page" disabled={page === 0 || !!pageTurn} onClick={() => turnPage(page - 1)}><ChevronLeft /></IconButton><span>{Math.min(page + 1, pages.length)} / {pages.length}</span><IconButton label="Next article page" disabled={page >= pages.length - 1 || !!pageTurn} onClick={() => turnPage(page + 1)}><ChevronRight /></IconButton></>}
              <button className="reading-view-toggle" onClick={() => { setPageTurn(null); setFullText(!fullText); setPage(0); reading.current?.scrollTo({ top: 0 }); }}>{fullText ? "Pages" : "Full text"}</button>
            </div>
          </> : <>
            <div className="voice-selector"><Popover label="Choose a voice" icon={<><span>{voices.find(v => v.id === voiceId)?.name ?? "Roger"}</span><ChevronDown /></>}><div role="radiogroup" aria-label="Narrator voices">{voices.map(v => <div className="voice-row" key={v.id}><button role="radio" aria-checked={voiceId === v.id} onClick={e => { selectVoice(v.id); closePopover(e.currentTarget); }}><span>{v.name}<small>{v.description}</small></span>{voiceId === v.id && <Check />}</button><IconButton label={`${previewing === v.id ? "Stop" : "Preview"} ${v.name}`} onClick={() => previewVoice(v)}>{previewing === v.id ? <Pause /> : <Play />}</IconButton></div>)}</div></Popover></div>
            <div className="listen-panel" tabIndex={0} aria-label="Read along" style={{ fontSize: textSize }}>{article.paragraphs.map((text, i) => <p key={i}>{text}</p>)}</div>
            <section className="audio-dock" aria-label="Audio player" tabIndex={0}>
              <div className="audio-track"><span>{clock(audioTime)}</span><input aria-label="Seek within the current audio section" type="range" min={0} max={audioDuration || 1} step={0.1} value={Math.min(audioTime, audioDuration || 1)} disabled={!audioDuration} onChange={e => { if (audioRef.current) { audioRef.current.currentTime = Number(e.target.value); setAudioTime(Number(e.target.value)); } }} /><span>{clock(audioDuration)}</span></div>
              <div className="audio-controls">
                <IconButton label="Back 15 seconds" disabled={!audioRef.current} onClick={() => seekAudio(-15)}><RotateCcw /><span className="skip-label" aria-hidden="true">15</span></IconButton>
                <IconButton className="main-play" label={generating ? "Cancel audio generation" : playing ? "Pause narration" : "Play narration"} onClick={togglePlay}>{generating ? <LoaderCircle className="spin" /> : playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</IconButton>
                <IconButton label="Forward 15 seconds" disabled={!audioRef.current} onClick={() => seekAudio(15)}><RotateCw /><span className="skip-label" aria-hidden="true">15</span></IconButton>
                <button className="speed-button" aria-label={`Playback speed ${speed} times. Change speed`} onClick={() => { const speeds = [1, 1.25, 1.5, 2, .75]; setSpeed(speeds[(speeds.indexOf(speed) + 1) % speeds.length]); }}>{speed}×</button>
              </div>
              <div className="audio-status" role="status">{generating ? "Preparing narration…" : chunks.length > 1 ? `Section ${chunkIndex + 1} of ${chunks.length}` : ""}{chunks.length > 1 && <IconButton label="Next audio section" disabled={generating || chunkIndex >= chunks.length - 1} onClick={() => void playChunk(chunkIndex + 1)}><ChevronRight /></IconButton>}</div>
              {audioError && <p className="inline-error" role="alert">{audioError}</p>}
            </section>
          </>}
        </section>
        </>
      </section>
    </>}
    {toast && <div className="toast" role="status"><Check size={15} />{toast}</div>}
    {modal && <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget && !importing) setModal(null); }}><Dialog onClose={() => { if (!importing) setModal(null); }} title={modal === "import" ? "Bring a story into your room" : "A little room for curiosity"}>
      {modal === "import" ? <form onSubmit={importArticle}>
        <p>Found something worth slowing down for? Tuck it into your collection.</p>
        <div className="import-tabs"><button type="button" className={importMode === "link" ? "active" : ""} onClick={() => { setImportMode("link"); setImportError(""); }}><Link2 size={14} />Article link</button><button type="button" className={importMode === "text" ? "active" : ""} onClick={() => { setImportMode("text"); setImportError(""); }}>Paste text</button></div>
        {importMode === "link" ? <label className="form-label">Article link<input type="url" required placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} autoFocus /><small>Open-access pages work best. We cannot open subscription or login-only content.</small></label> : <><label className="form-label">A title for your read<input required maxLength={240} value={pasteTitle} onChange={e => setPasteTitle(e.target.value)} placeholder="Something worth reading" autoFocus /></label><label className="form-label">Article text<textarea required minLength={200} maxLength={60_000} rows={7} value={pasteText} onChange={e => setPasteText(e.target.value)} placeholder="Paste article text you have permission to use…" /></label></>}
        <p className="fine-print">Saved only in this browser. When you press play, the text is sent to ElevenLabs for narration. Add content you have permission to use.</p>
        {importError && <p className="inline-error" role="alert">{importError}</p>}
        <button className="primary-button" disabled={importing} type="submit">{importing ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}{importing ? "Opening the article…" : "Add to my collection"}</button>
      </form> : <div className="about-copy"><p>A quiet corner of the internet, for ideas that deserve a little more of your time.</p><p>Explore technology, medicine, Nobel discoveries, AI and crypto. Keep a favourite, bring your own link, or let a storyteller read it to you.</p><p>This free prototype contains original sample essays. Popular today shows recent stories ranked on Hacker News. Other publication links open at their source.</p><span className="handwriting">Make yourself at home.</span><button className="primary-button" onClick={() => { setModal(null); openBook(); }}>Open the book <ArrowRight size={16} /></button></div>}
    </Dialog></div>}
  </main>;
}

function Dialog({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input, textarea, select, a[href]') ?? []);
    (ref.current?.querySelector<HTMLElement>("[autofocus]") ?? focusable()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") { const items = focusable(); const first = items[0], last = items[items.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, []);
  return <div className="paper-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref}><button className="dialog-close" onClick={onClose} aria-label="Close dialog"><X size={20} /></button><span className="eyebrow">THE READING ROOM</span><h2 id="dialog-title">{title}</h2>{children}</div>;
}
