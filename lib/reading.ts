/** Paginate the complete text without dropping oversized paragraphs or trailing text. */
export function paginateArticle(paragraphs: string[], limit = 900) {
  const pages: string[][] = [];
  let page: string[] = []; let length = 0;
  for (const paragraph of paragraphs) {
    let remaining = paragraph;
    while (remaining.length > limit) {
      const boundary = remaining.lastIndexOf(" ", limit);
      const cut = boundary > 0 ? boundary : limit;
      if (page.length) { pages.push(page); page = []; length = 0; }
      pages.push([remaining.slice(0, cut)]); remaining = remaining.slice(cut).trimStart();
    }
    if (length + remaining.length > limit && page.length) { pages.push(page); page = []; length = 0; }
    if (remaining) { page.push(remaining); length += remaining.length; }
  }
  if (page.length) pages.push(page);
  return pages.length ? pages : [[]];
}
