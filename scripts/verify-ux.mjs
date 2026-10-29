import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base = process.env.TEST_URL || 'http://localhost:3000';
const localChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.CHROME_PATH || (existsSync(localChrome) ? localChrome : undefined);
const browser = await chromium.launch({ executablePath, headless: true });
async function newPage(options) { const context = await browser.newContext(options); return context.newPage(); }
mkdirSync('test-results', { recursive: true });
mkdirSync('docs/ux', { recursive: true });
const voices = [
  { id:'CwhRBWXzGAHq8TQ4Fs17', name:'Roger', description:'Laid-back & resonant' },
  { id:'EXAVITQu4vr4xnSDxMaL', name:'Sarah', description:'Warm & expressive' },
  { id:'FGY2WhTYpPnrIDTdsKH5', name:'Laura', description:'Bright & clear' },
  { id:'IKne3meq5aSn9XLyUdCD', name:'Charlie', description:'Deep & confident' },
].map(v => ({ ...v, previewUrl:'https://example.org/voice.wav' }));
const text = 'This is a complete imported article. '.repeat(40);
const story = { id:'today-test', title:'A new discovery today', source:'example.org', url:'https://example.org/article', topic:'Tech', publishedAt:new Date().toISOString(), score:12 };
const imported = { id:'today-import', title:story.title, topic:'Tech', description:'An imported discovery.', paragraphs:[text, 'The final paragraph remains available.'], author:'A writer', source:'example.org', url:story.url, minutes:2, illustration:'imported', kind:'imported' };
const audio = Buffer.alloc(44+8000*90*2);audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(8000,24);audio.writeUInt32LE(16000,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(audio.length-44,40);
async function setup(page, speech=[]) {
  await page.route('**/api/voices', r=>r.fulfill({json:{voices,configured:true}}));
  await page.route('https://example.org/voice.wav', r=>r.fulfill({contentType:'audio/wav',body:audio}));
  await page.route('**/api/feed', r=>r.fulfill({json:{stories:[story],fetchedAt:new Date().toISOString()}}));
  await page.route('**/api/import', r=>r.fulfill({json:{article:imported}}));
  await page.route('**/api/speech', r=>{speech.push(r.request().postDataJSON());return r.fulfill({contentType:'audio/wav',body:audio});});
}
async function axe(page, state) {
  await page.waitForTimeout(200);
  const r = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  const failures=r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
  writeFileSync(`test-results/axe-${state}.json`,JSON.stringify(failures,null,2));
  assert.deepEqual(failures,[],`Accessibility violations: ${state}`);
}
async function fits(page) {
  const r = await page.evaluate(()=>({viewport:innerHeight,scroll:document.documentElement.scrollHeight,width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  assert.ok(r.scroll<=r.viewport+1,JSON.stringify(r));assert.ok(r.scrollWidth<=r.width+1,JSON.stringify(r));
}
async function open(page) {await page.getByRole('button',{name:'Open The Reading Room',exact:true}).click();await page.locator('.book-spread').waitFor();}
async function choose(page, title) {await page.locator('.article-select').filter({hasText:title}).click();await page.locator('h1').filter({hasText:title}).waitFor();}
try {
 for (const [width,height] of (process.env.UX_SKIP_LAYOUTS ? [] : [[1440,1000],[1024,800],[768,1000],[390,844]])) {
  const page=await newPage({viewport:{width,height},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await setup(page);
  await page.goto(base,{waitUntil:'networkidle'});for(const icon of ['/favicon.ico','/favicon.svg','/favicon-32.png'])assert.equal((await page.request.get(base+icon)).status(),200);await fits(page);await axe(page,`landing-${width}`);
  if(width===1440)await page.screenshot({path:'docs/ux/after-landing-1440.png'});
  await open(page);await fits(page);
  if(width<900){assert.equal(await page.locator('.right-page').isVisible(),false);await page.getByLabel('Filter topics',{exact:true}).click();await page.getByRole('button',{name:'Medicine',exact:true}).click();assert.equal(await page.locator('.left-page').isVisible(),true);assert.equal(await page.locator('.right-page').isVisible(),false);await page.getByLabel('Clear Medicine filter',{exact:true}).click();await choose(page,'A different kind of intelligence');}
  assert.equal(await page.getByRole('region',{name:'Audio player',exact:true}).count(),0);
  await axe(page,`read-${width}`);await page.mouse.move(0,0);
  await page.screenshot({path:width===1440?'docs/ux/after-reader-1440.png':`test-results/reader-${width}.png`});
  await page.getByRole('tab',{name:'Listen to article',exact:true}).click();await page.getByRole('region',{name:'Audio player',exact:true}).waitFor();await fits(page);
  await page.getByLabel(/^Choose a voice:/).click();await page.getByRole('radio',{name:/Sarah/}).click();
  assert.match(await page.getByLabel(/^Choose a voice:/).innerText(),/Sarah/);
  await axe(page,`listen-${width}`);await page.mouse.move(0,0);
  await page.screenshot({path:width===1440?'docs/ux/after-listen-1440.png':`test-results/listen-${width}.png`});
  if(width===390){const box=await page.locator('.mobile-dock').boundingBox();assert.ok(Math.abs(box.y+box.height-height)<2);const dock=page.getByRole('region',{name:'Audio player',exact:true});await dock.focus();await page.keyboard.press('Space');await page.getByLabel('Pause narration',{exact:true}).waitFor();await dock.focus();await page.keyboard.press('ArrowRight');assert.ok(Number(await page.getByRole('slider').inputValue())>=14);await page.keyboard.press('Space');await page.getByLabel('Play narration',{exact:true}).waitFor();await page.getByLabel('Back to articles',{exact:true}).click();assert.equal(await page.getByRole('region',{name:'Audio player',exact:true}).count(),0);await page.getByRole('button',{name:'Add an article',exact:true}).click();await fits(page);await axe(page,'import-390');assert.equal(await page.getByRole('textbox',{name:'Article link or text',exact:true}).evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Escape');assert.equal(await page.getByRole('button',{name:'Add an article',exact:true}).evaluate(e=>e===document.activeElement),true);}
  assert.deepEqual(errors,[]);console.log(`PASS layout, voice selection, and axe: ${width}px`);await page.close();
 }
 const page=await newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const speech=[];await setup(page,speech);await page.goto(base,{waitUntil:'networkidle'});
 // Focus trap and focus restoration from the closed-book menu.
 await page.getByLabel('More options',{exact:true}).click();await page.getByRole('button',{name:'About',exact:true}).click();await page.getByRole('dialog').waitFor();await axe(page,'about');
 await page.getByRole('button',{name:'Close dialog',exact:true}).focus();await page.keyboard.press('Shift+Tab');assert.match(await page.evaluate(()=>document.activeElement.textContent),/Open the book/);await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.getByLabel('More options',{exact:true}).evaluate(e=>e===document.activeElement),true);
 await open(page);
 await page.getByLabel('Filter topics',{exact:true}).click();await page.getByRole('button',{name:'Medicine',exact:true}).click();await page.locator('h1').filter({hasText:'medical breakthrough'}).waitFor();assert.equal(await page.locator('.article-select').count(),1);
 await page.getByRole('tab',{name:'Today',exact:true}).click();assert.equal(await page.getByLabel('Clear Medicine filter',{exact:true}).count(),0);await page.getByRole('button',{name:/A new discovery today/}).click();await page.locator('h1').filter({hasText:story.title}).waitFor();assert.match(await page.locator('.reading-scroll').innerText(),/final paragraph/);
 await page.getByRole('tab',{name:'Collection',exact:true}).click();await choose(page,'A different kind of intelligence');
 await page.getByLabel('Search articles',{exact:true}).click();await page.getByRole('textbox',{name:'Search articles',exact:true}).fill('no matches at all');await page.getByText('No articles on this shelf.',{exact:true}).waitFor();assert.equal(await page.locator('h1').isVisible(),false);await page.getByLabel('Close search',{exact:true}).click();
 await choose(page,'A different kind of intelligence');await page.getByLabel('Bookmark article',{exact:true}).click();await page.getByRole('tab',{name:'Saved',exact:true}).click();await page.getByLabel('Remove bookmark: A different kind of intelligence',{exact:true}).click();await page.getByText('No articles on this shelf.',{exact:true}).waitFor();
 await page.getByRole('tab',{name:'Collection',exact:true}).click();await choose(page,'A different kind of intelligence');
 await page.getByRole('button',{name:'Add an article',exact:true}).click();const input=page.getByRole('textbox',{name:'Article link or text',exact:true});await input.fill('Too short');await page.getByRole('button',{name:'Add',exact:true}).click();await page.getByRole('alert').filter({hasText:'200 characters'}).waitFor();await input.fill('A newly added read\n\n'+text);await page.getByRole('button',{name:'Add',exact:true}).click();await page.locator('h1').filter({hasText:'A newly added read'}).waitFor();assert.equal(await page.getByRole('dialog').count(),0);assert.equal(await page.locator('.just-added').count(),1);
 await page.getByLabel('Text size',{exact:true}).click();await page.getByRole('button',{name:'Large',exact:true}).click();await page.keyboard.press('Escape');await page.getByRole('tab',{name:'Listen to article',exact:true}).click();await page.getByLabel(/^Choose a voice:/).click();await page.getByRole('radio',{name:/Sarah/}).click();
 await page.reload({waitUntil:'networkidle'});await open(page);assert.equal(await page.getByRole('tab',{name:'Listen to article',exact:true}).getAttribute('aria-selected'),'true');assert.match(await page.getByLabel(/^Choose a voice:/).innerText(),/Sarah/);assert.equal(await page.locator('.listen-panel').evaluate(e=>getComputedStyle(e).fontSize),'22px');assert.match(await page.locator('h1').innerText(),/newly added read/);
 const dock=page.getByRole('region',{name:'Audio player',exact:true});await dock.focus();await page.keyboard.press('Space');await page.getByLabel('Pause narration',{exact:true}).waitFor();assert.equal(speech[0].voiceId,voices[1].id);assert.match(speech[0].text,/newly added read/i);await dock.focus();await page.keyboard.press('ArrowRight');assert.ok(Number(await page.getByRole('slider').inputValue())>=14);await page.keyboard.press('ArrowLeft');await page.keyboard.press('Space');await page.getByLabel('Play narration',{exact:true}).waitFor();
 for(const rate of ['1.25','1.5','2','0.75','1']){await page.getByRole('button',{name:/Playback speed/}).click();assert.equal(await page.getByRole('button',{name:/Playback speed/}).innerText(),`${rate}×`);}
 await page.getByRole('tab',{name:'Read article',exact:true}).click();assert.equal(await dock.count(),0);
 await page.getByRole('button',{name:'Pages',exact:true}).click();await page.getByLabel('Next article page',{exact:true}).click();await page.getByLabel('Article page 2',{exact:true}).waitFor();await page.getByLabel('Full article text',{exact:true}).count();
 await page.locator('.reading-scroll').focus();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Open The Reading Room',exact:true}).waitFor();await page.close();console.log('PASS filters, Today import, saved empty state, unified import, persistence, narration controls, paging, and focus');
 // Keep the real book-opening and page-turn engines exercised at desktop and phone sizes.
 for(const [width,height] of [[1440,1000],[390,844]]){
  const p=await newPage({viewport:{width,height},reducedMotion:'no-preference'});const errors=[];p.on('pageerror',e=>errors.push(e.message));await setup(p);await p.goto(base,{waitUntil:'networkidle'});await open(p);await p.waitForFunction(()=>!document.querySelector('.book-opening'));
  if(width<900)await choose(p,'A different kind of intelligence');await p.getByRole('button',{name:'Pages',exact:true}).click();await p.getByLabel('Next article page',{exact:true}).click();await p.waitForFunction(()=>!document.querySelector('.natural-page-turn'));await p.getByLabel('Article page 2',{exact:true}).waitFor();await p.getByLabel('Previous article page',{exact:true}).click();await p.waitForFunction(()=>!document.querySelector('.natural-page-turn'));await p.getByLabel('Article page 1',{exact:true}).waitFor();await p.getByLabel('Close the book',{exact:true}).click();await p.getByRole('button',{name:'Open The Reading Room',exact:true}).waitFor();assert.deepEqual(errors,[]);await p.close();console.log(`PASS physical opening, forward/back page turn, and closing: ${width}px`);
 }
} finally {await browser.close();}
