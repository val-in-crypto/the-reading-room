/** Remove publisher home navigation at the start of an imported article. */
export function cleanArticleParagraphs(paragraphs: string[]): string[] {
  let start = 0;
  const arrow = /^[←⇐⟵⬅↩\s]+$/u;
  const mainPage = /^[←⇐⟵⬅↩\s]*(?:back to\s+)?main page[←⇐⟵⬅↩\s]*$/iu;
  // Publishers may put the arrow and label in separate blocks.
  if (arrow.test(paragraphs[0] ?? "") && mainPage.test(paragraphs[1] ?? "")) start = 2;
  else if (mainPage.test(paragraphs[0] ?? "")) start = 1;
  return paragraphs.slice(start);
}
