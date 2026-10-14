"use client";

import { useLayoutEffect, useRef } from "react";
import type { PageFlip } from "page-flip";

export type CoverHome = { left: number; top: number; width: number; height: number; viewportWidth: number; viewportHeight: number };
const DURATION = 1600;

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
    let disposed = false;
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
            if (!disposed) complete.current();
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
          started = true;
          if (direction === "opening") engine?.flipNext("bottom");
          else engine?.flipPrev("bottom");
        });
      });
      engine.loadFromHTML(leaves);
    }).catch(() => { if (!disposed) complete.current(); });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
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
