"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export function IconButton({ label, children, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" {...props} aria-label={label} className={`icon-button ${className}`}>
    {children}<span className="tooltip" aria-hidden="true">{label}</span>
  </button>;
}

export function closePopover(element: HTMLElement) {
  const details = element.closest("details");
  details?.removeAttribute("open");
  details?.querySelector("summary")?.focus();
}

export function Popover({ label, icon, children, className = "" }: { label: string; icon: ReactNode; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (ref.current?.open && !ref.current.contains(event.target as Node)) ref.current.open = false; };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  return <details className={`quiet-popover ${className}`} ref={ref} onKeyDown={event => {
    if (event.key === "Escape" && ref.current?.open) { event.stopPropagation(); ref.current.open = false; ref.current.querySelector("summary")?.focus(); }
  }} onToggle={event => {
    if (event.currentTarget.open) document.querySelectorAll<HTMLDetailsElement>("details.quiet-popover[open]").forEach(other => { if (other !== event.currentTarget) other.open = false; });
  }}>
    <summary className="icon-button" aria-label={label}>{icon}<span className="tooltip" aria-hidden="true">{label}</span></summary>
    <div className="popover-content">{children}</div>
  </details>;
}
