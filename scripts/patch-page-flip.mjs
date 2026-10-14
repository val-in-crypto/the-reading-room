import { readFileSync, writeFileSync } from 'node:fs';

// StPageFlip 2.0.7 leaves its render loop alive after destroy().
// Cancel it when React unmounts a turn, so repeated turns do not accumulate loops.
const path = new URL('../node_modules/page-flip/dist/js/page-flip.browser.js', import.meta.url);
let source = readFileSync(path, 'utf8');
if (!source.includes('stopRendering(){')) {
  const before = 'start(){this.update();const t=e=>{this.render(e),requestAnimationFrame(t)};requestAnimationFrame(t)}';
  const after = 'start(){this.update();this.renderStopped=false;const t=e=>{if(this.renderStopped)return;this.render(e);if(!this.renderStopped)this.renderFrame=requestAnimationFrame(t)};this.renderFrame=requestAnimationFrame(t)}stopRendering(){this.renderStopped=true;cancelAnimationFrame(this.renderFrame)}';
  const destroy = 'destroy(){this.ui.destroy(),this.block.remove()}';
  if (!source.includes(before) || !source.includes(destroy)) throw new Error('Review the page-flip lifecycle patch for this version.');
  source = source.replace(before, after).replace(destroy, 'destroy(){this.render.stopRendering(),this.ui.destroy(),this.block.remove()}');
  writeFileSync(path, source);
}

// The resize listener is registered even when mouse interaction is disabled.
source = readFileSync(path, 'utf8');
source = source.replace('destroy(){this.app.getSettings().useMouseEvents&&this.removeHandlers(),this.distElement.remove(),this.wrapper.remove()}', 'destroy(){this.removeHandlers(),this.distElement.remove(),this.wrapper.remove()}');
writeFileSync(path, source);
