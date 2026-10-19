"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { PageFlip } from "page-flip";

/** A real corner fold, with the current reader printed on the moving sheet. */
export default function TurningPage({ direction, paragraphs, targetPage, totalPages, illustration, targetSpread, onComplete }: {
  direction: "next" | "previous";
  paragraphs: string[];
  targetPage: number;
  totalPages: number;
  illustration?: string;
  targetSpread?: ReactNode;
  onComplete: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const target = useRef<HTMLDivElement>(null);
  const spreadMode = !!targetSpread;
  const complete = useRef(onComplete);
  complete.current = onComplete;

  useEffect(() => {
    const root = stage.current;
    const spread = root?.closest(".book-spread");
    const left = spread?.querySelector<HTMLElement>(":scope > .left-page");
    const right = spread?.querySelector<HTMLElement>(":scope > .right-page");
    if (!root || !left || !right) return;
    let disposed = false;
    let engine: PageFlip | undefined;
    let frame = 0;
    const host = document.createElement("div");
    root.append(host);

    function snapshot(source: HTMLElement, side: "left" | "right", destination = false) {
      const leaf = document.createElement("div");
      leaf.className = `turn-leaf ${side}`;
      leaf.dataset.density = "soft";
      const ink = source.cloneNode(true) as HTMLElement;
      ink.classList.remove("mobile-hidden");
      ink.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
      ink.querySelectorAll<HTMLElement>("button,a,input,[tabindex]").forEach(node => node.tabIndex = -1);
      const reader = ink.querySelector<HTMLElement>(".reading-scroll");
      if (reader && destination) {
        reader.querySelectorAll("p,.article-source").forEach(node => node.remove());
        reader.querySelector(".illustration")?.remove();
        if (targetPage === 0 && illustration) {
          const art = document.createElement("div");
          art.className = "illustration collage-illustration";
          const image = document.createElement("img");
          image.src = `/assets/illustrations/${illustration}-collage.png`;
          image.alt = "";
          art.append(image);
          reader.append(art);
        }
        for (const text of paragraphs) {
          const paragraph = document.createElement("p");
          paragraph.textContent = text;
          reader.append(paragraph);
        }
        const label = ink.querySelector(".reading-pagination>span");
        if (label) label.textContent = `Page ${targetPage + 1} of ${totalPages}`;
      }
      leaf.append(ink);
      if (reader && !destination) reader.scrollTop = source.querySelector(".reading-scroll")?.scrollTop ?? 0;
      return leaf;
    }

    const scrollPosition = right.querySelector(".reading-scroll")?.scrollTop ?? 0;
    const current = snapshot(right, "right");
    const destination = snapshot(right, "right", true);
    const nextLeft = target.current?.querySelector<HTMLElement>(".left-page");
    const nextRight = target.current?.querySelector<HTMLElement>(".right-page");
    const targetLeft = nextLeft ? snapshot(nextLeft, "left") : snapshot(left, "left");
    const targetRight = nextRight ? snapshot(nextRight, "right") : destination;
    const leaves = direction === "next"
      ? [snapshot(left, "left"), current, targetLeft, targetRight]
      : [targetLeft, targetRight, snapshot(left, "left"), current];
    host.append(...leaves);

    void import("page-flip").then(({ PageFlip }) => {
      if (disposed) return;
      const bounds = root.getBoundingClientRect();
      engine = new PageFlip(host, {
        width: bounds.width / 2, height: bounds.height, size: "fixed",
        startPage: direction === "next" ? 0 : 2,
        usePortrait: false, autoSize: false, showCover: false,
        flippingTime: 1250, drawShadow: true, maxShadowOpacity: .28,
        useMouseEvents: false, mobileScrollSupport: false,
        showPageCorners: false, disableFlipByClick: true,
      });
      let started = false;
      engine.on("flip", ({ data }) => {
        if (started && data === (direction === "next" ? 2 : 0) && !disposed) complete.current();
      });
      engine.on("init", () => {
        frame = requestAnimationFrame(() => {
          if (disposed) return;
          const reader = current.querySelector(".reading-scroll");
          if (reader) reader.scrollTop = scrollPosition;
          root.classList.add("ready");
          started = true;
          if (direction === "next") engine?.flipNext("bottom");
          else engine?.flipPrev("bottom");
        });
      });
      engine.loadFromHTML(leaves);
    }).catch(() => { if (!disposed) complete.current(); });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      engine?.destroy();
      host.remove();
    };
  }, [direction, paragraphs, targetPage, totalPages, illustration, spreadMode]);

  return <><div ref={stage} className="natural-page-turn" aria-hidden="true" /><div ref={target} hidden aria-hidden="true">{targetSpread}</div></>;
}
