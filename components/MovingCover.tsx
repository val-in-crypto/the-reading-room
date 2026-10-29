"use client";

import { useLayoutEffect, useRef } from "react";
import type { PageFlip } from "page-flip";

export type CoverHome = { left: number; top: number; width: number; height: number; viewportWidth: number; viewportHeight: number };
const DURATION = 1600;

/** Phones reveal one leaf; a desktop spread would put a second leaf off screen. */
function animateMobileCover(root: HTMLElement, spread: HTMLElement, direction: "opening" | "closing", home: CoverHome | null, finish: () => void) {
  const duration = 1250;
  const rect = spread.getBoundingClientRect();
  const width = Math.min(588, (innerHeight - 16) * .66591, innerWidth - 56);
  const height = width * 883 / 588;
  const source = home && home.viewportWidth === innerWidth && home.viewportHeight === innerHeight
    ? home : { left: (innerWidth - width) / 2, top: (innerHeight - height) / 2, width, height };
  const sx = source.width * .7 / root.clientWidth;
  const sy = source.height * .714 / root.clientHeight;
  const x = source.left + source.width * .15 - rect.left - spread.clientLeft * sx;
  const y = source.top + source.height * .15 - rect.top - spread.clientTop * sy;
  const closed = `translate3d(${x}px,${y}px,0) scale(${sx},${sy})`;
  spread.style.transformOrigin = "0 0";
  spread.style.transform = direction === "opening" ? closed : "none";
  root.classList.add("mobile-cover-stage");
  const window = document.createElement("div");
  window.className = "mobile-cover-window";
  const paper = document.createElement("div");
  paper.className = "mobile-cover-ink";
  const current = spread.querySelector<HTMLElement>(":scope > .left-page:not(.mobile-hidden), :scope > .right-page:not(.mobile-hidden)");
  if (current) {
    const clone = current.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    clone.querySelectorAll<HTMLElement>("button,a,input,[tabindex]").forEach(node => node.tabIndex = -1);
    paper.append(clone);
  }
  const cover = document.createElement("div");
  cover.className = "mobile-hinged-cover";
  const front = document.createElement("div");
  front.className = "hardcover-front mobile-cover-front";
  const image = document.createElement("img");
  image.src = "/assets/cover.png";
  image.alt = "";
  front.append(image);
  const back = document.createElement("div");
  back.className = "mobile-cover-back";
  cover.append(front, back);
  window.append(paper, cover);
  root.append(window);
  const reader = paper.querySelector<HTMLElement>(".reading-scroll,.contents-scroll,.listen-panel");
  if (reader) reader.scrollTop = current?.querySelector(".reading-scroll,.contents-scroll,.listen-panel")?.scrollTop ?? 0;
  const opening = [
    { transform: "rotateY(0deg)", offset: 0 },
    { transform: "rotateY(-10deg)", offset: .18 },
    { transform: "rotateY(-85deg)", offset: .62 },
    { transform: "rotateY(-155deg)", offset: 1 },
  ];
  const closing = [...opening].reverse().map(frame => ({ ...frame, offset: 1 - frame.offset }));
  const animations = [
    spread.animate([{ transform: direction === "opening" ? closed : "none" }, { transform: direction === "opening" ? "none" : closed }], { duration, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }),
    cover.animate(direction === "opening" ? opening : closing, { duration, easing: "cubic-bezier(.35,0,.25,1)", fill: "forwards" }),
  ];
  let disposed = false;
  void Promise.all(animations.map(animation => animation.finished)).then(() => { if (!disposed) finish(); }).catch(() => {});
  return () => {
    disposed = true;
    animations.forEach(animation => animation.cancel());
    window.remove();
    spread.style.removeProperty("transform");
    spread.style.removeProperty("transform-origin");
  };
}

/** The cover and spread share one position while the hardcover pivots at its spine. */
export default function MovingCover({ direction, home, onComplete }: {
  direction: "opening" | "closing";
  home: CoverHome | null;
  onComplete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const complete = useRef(onComplete);
  complete.current = onComplete;
  useLayoutEffect(() => {
    const root = ref.current;
    const spread = root?.parentElement;
    if (!root || !spread) return;
    if (matchMedia("(max-width:899px)").matches) return animateMobileCover(root, spread, direction, home, () => complete.current());
    let disposed = false;
    let completed = false;
    let settleTimer = 0;
    const finish = () => { if (!disposed && !completed) { completed = true; complete.current(); } };
    let engine: PageFlip | undefined;
    let frame = 0;
    const animations: Animation[] = [];
    const rect = spread.getBoundingClientRect();
    const width = Math.min(588, (innerHeight - 16) * .66591, innerWidth - 56);
    const height = width * 883 / 588;
    const source = home && home.viewportWidth === innerWidth && home.viewportHeight === innerHeight
      ? home : { left: (innerWidth - width) / 2, top: (innerHeight - height) / 2, width, height };
    const scaleX = source.width * .7 / (root.clientWidth / 2);
    const scaleY = source.height * .714 / root.clientHeight;
    const x = source.left + source.width * .15 - rect.left - (root.offsetLeft + root.clientWidth / 2) * scaleX;
    const y = source.top + source.height * .15 - rect.top - root.offsetTop * scaleY;
    const closedTransform = `translate(${x}px,${y}px) scale(${scaleX},${scaleY})`;
    spread.style.transformOrigin = "0 0";
    spread.style.transform = direction === "opening" ? closedTransform : "none";
    const art = spread.querySelector<HTMLElement>(".book-art");
    // The engine draws the moving inside cover. Never expose the static
    // left half underneath it: that creates an unattached blank page.
    if (art) art.style.clipPath = "inset(0 0 0 50.2%)";

    const host = document.createElement("div");
    host.className = "cover-engine-host";
    root.append(host);
    const cover = document.createElement("div");
    cover.className = "hardcover-front";
    cover.dataset.density = "hard";
    const image = document.createElement("img");
    image.src = "/assets/cover.png";
    image.alt = "";
    cover.append(image);
    function page(side: "left" | "right") {
      const leaf = document.createElement("div");
      leaf.className = `turn-leaf ${side}`;
      leaf.dataset.density = side === "left" ? "hard" : "soft";
      const original = spread!.querySelector<HTMLElement>(`:scope > .${side}-page`);
      if (original) {
        const ink = original.cloneNode(true) as HTMLElement;
        ink.classList.remove("mobile-hidden");
        ink.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
        ink.querySelectorAll<HTMLElement>("button,a,input,[tabindex]").forEach(node => node.tabIndex = -1);
        leaf.append(ink);
      }
      return leaf;
    }
    const leaves = [cover, page("left"), page("right"), cover.cloneNode(true) as HTMLElement];
    host.append(...leaves);
    // Keep the closed cover visible while the engine initialises.
    const placeholder = cover.cloneNode(true) as HTMLElement;
    placeholder.classList.add("cover-placeholder");
    if (direction === "opening") root.append(placeholder);

    void import("page-flip").then(({ PageFlip }) => {
      if (disposed) return;
      engine = new PageFlip(host, {
        width: root.clientWidth / 2, height: root.clientHeight, size: "fixed",
        startPage: direction === "opening" ? 0 : 1,
        usePortrait: false, autoSize: false, showCover: true,
        flippingTime: DURATION, drawShadow: false,
        useMouseEvents: false, mobileScrollSupport: false,
        showPageCorners: false, disableFlipByClick: true,
      });
      let started = false;
      engine.on("flip", ({ data }) => {
        if (started && !disposed && data === (direction === "opening" ? 1 : 0)) {
          void Promise.all(animations.map(animation => animation.finished)).then(() => {
            finish();
          }).catch(() => {});
        }
      });
      engine.on("init", () => {
        frame = requestAnimationFrame(() => {
          if (disposed) return;
          placeholder.remove();
          root.classList.add("ready");
          animations.push(spread.animate([
            { transform: direction === "opening" ? closedTransform : "none" },
            { transform: direction === "opening" ? "none" : closedTransform },
          ], { duration: DURATION, easing: "cubic-bezier(.33,0,.2,1)", fill: "forwards" }));
          // Some engine runs omit the final flip event. The existing movement
          // still finishes; settle afterward so the UI cannot remain locked.
          void animations[0].finished.then(() => {
            if (!disposed && !completed) settleTimer = window.setTimeout(finish, 160);
          }).catch(() => {});
          started = true;
          if (direction === "opening") engine?.flipNext("bottom");
          else engine?.flipPrev("bottom");
        });
      });
      engine.loadFromHTML(leaves);
    }).catch(() => { finish(); });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(settleTimer);
      animations.forEach(animation => animation.cancel());
      engine?.destroy();
      host.remove();
      placeholder.remove();
      spread.style.removeProperty("transform");
      spread.style.removeProperty("transform-origin");
      art?.style.removeProperty("clip-path");
    };
  }, [direction, home]);
  return <div ref={ref} className="cover-engine-stage" aria-hidden="true" />;
}
