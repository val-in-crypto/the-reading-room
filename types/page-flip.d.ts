declare module "page-flip" {
  export class PageFlip {
    constructor(element: HTMLElement, settings: Record<string, number | string | boolean>);
    loadFromHTML(items: HTMLElement[]): void;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    on(event: string, callback: (event: { data: unknown }) => void): void;
    destroy(): void;
  }
}
