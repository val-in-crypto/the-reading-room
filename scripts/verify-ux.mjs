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
// New sessions always discover Today; Collection is a personal reading history.
try {
  for (const [width,height] of (process.env.UX_SKIP_LAYOUTS ? [] : [[1440,1000],[1024,800],[768,1000],[390,844]])) {
    const page=await newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const speech=[];await setup(page,speech);await page.goto(base,{waitUntil:'networkidle'});
    await axe(page,`landing-${width}`);await open(page);await fits(page);
    assert.equal(await page.getByRole('tab',{name:'Today',exact:true}).getAttribute('aria-selected'),'true');
    const search=page.getByRole('textbox',{name:'Search articles',exact:true});assert.ok(await search.isVisible());
    if(width<900)assert.equal(await page.locator('.right-page').isVisible(),false);
    await page.getByRole('tab',{name:'Collection',exact:true}).click();
    await page.getByText('Your collection starts here.',{exact:true}).waitFor();
    assert.equal(await page.locator('.article-select').count(),0);
    await page.getByRole('button',{name:'Explore Today',exact:true}).click();
    await search.fill('nothing matches');await page.getByText('No trending reads match your search.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Clear search and filters',exact:true}).click();
    await search.fill('example.org');assert.equal(await page.locator('.story-title').count(),1);await search.fill('');
    await page.getByLabel('Filter topics',{exact:true}).click();await page.getByRole('button',{name:'Medicine',exact:true}).click();
    await page.getByText('No trending reads match your search.',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Clear search and filters',exact:true}).click();
    await axe(page,`today-${width}`);await page.screenshot({path:`test-results/today-${width}.png`});
    await page.getByRole('button',{name:/A new discovery today/}).click();
    await page.locator('h1').filter({hasText:story.title}).waitFor();
    assert.match(await page.locator('.reading-scroll').innerText(),/final paragraph/);await fits(page);await axe(page,`read-${width}`);
    if(width<900)await page.getByLabel('Back to articles',{exact:true}).click();
    await page.getByRole('tab',{name:'Collection',exact:true}).click();
    assert.equal(await page.locator('.article-select').count(),1);await choose(page,story.title);
    await page.getByLabel('Bookmark article',{exact:true}).click();
    await page.getByRole('tab',{name:'Listen to article',exact:true}).click();
    await page.getByLabel(/^Choose a voice:/).click();await page.getByRole('radio',{name:/Sarah/}).click();
    await axe(page,`listen-${width}`);const dock=page.getByRole('region',{name:'Audio player',exact:true});
    await dock.focus();await page.keyboard.press('Space');await page.getByLabel('Pause narration',{exact:true}).waitFor();
    assert.equal(speech[0].voiceId,voices[1].id);await dock.focus();await page.keyboard.press('ArrowRight');
    assert.ok(Number(await page.getByRole('slider').inputValue())>=14);await page.keyboard.press('Space');
    await page.getByLabel('Play narration',{exact:true}).waitFor();
    if(width<900)await page.getByLabel('Back to articles',{exact:true}).click();
    await page.getByRole('button',{name:'Add an article',exact:true}).click();
    await page.getByRole('textbox',{name:'Article link or text',exact:true}).fill('A newly added read\n\n'+text);
    await page.getByRole('button',{name:'Add',exact:true}).click();await page.locator('h1').filter({hasText:'A newly added read'}).waitFor();
    assert.equal(await page.getByRole('tab',{name:'Collection',exact:true,includeHidden:true}).getAttribute('aria-selected'),'true');
    assert.match(await page.locator('.reading-scroll').innerText(),/complete imported article/);
    await page.reload({waitUntil:'networkidle'});await open(page);
    assert.equal(await page.getByRole('tab',{name:'Today',exact:true}).getAttribute('aria-selected'),'true');
    assert.equal(await search.inputValue(),'');await page.getByRole('tab',{name:'Collection',exact:true}).click();
    assert.equal(await page.locator('.article-select').count(),2);await choose(page,'A newly added read');
    await page.getByRole('tab',{name:'Listen to article',exact:true}).click();
    assert.match(await page.getByLabel(/^Choose a voice:/).innerText(),/Sarah/);
    await page.getByLabel('Close the book',{exact:true}).click();await open(page);
    assert.equal(await page.getByRole('tab',{name:'Today',exact:true}).getAttribute('aria-selected'),'true');
    await fits(page);assert.deepEqual(errors,[]);await page.close();
    console.log(`PASS Today-first search, personal Collection, imports, narration, persistence, and accessibility: ${width}px`);
  }
  // Keep the real opening, page-turn and closing engines exercised.
  for(const [width,height] of [[1440,1000],[390,844]]) {
    const page=await newPage({viewport:{width,height},reducedMotion:'no-preference'});await setup(page);
    await page.goto(base,{waitUntil:'networkidle'});await open(page);await page.waitForFunction(()=>!document.querySelector('.book-opening'));
    await page.getByRole('button',{name:/A new discovery today/}).click();await page.locator('h1').filter({hasText:story.title}).waitFor();
    await page.getByRole('button',{name:'Pages',exact:true}).click();await page.getByLabel('Next article page',{exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('.natural-page-turn'));await page.getByLabel('Article page 2',{exact:true}).waitFor();
    await page.getByLabel('Close the book',{exact:true}).click();await page.getByRole('button',{name:'Open The Reading Room',exact:true}).waitFor();
    await page.close();console.log(`PASS physical opening, paging, and closing: ${width}px`);
  }
  // Existing imported reads survive the storage upgrade. Adding from the cover
  // intentionally opens the new read instead of sending the user back to Today.
  const old=await newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await setup(old);
  await old.addInitScript(article=>localStorage.setItem('reading-room-v1',JSON.stringify({imports:[article],saved:[article.id],selectedId:article.id})),imported);
  await old.goto(base,{waitUntil:'networkidle'});await open(old);await old.getByRole('tab',{name:'Collection',exact:true}).click();
  assert.equal(await old.locator('.article-select').count(),1);await old.close();
  const closed=await newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});await setup(closed);await closed.goto(base,{waitUntil:'networkidle'});
  await closed.getByLabel('More options',{exact:true}).click();await closed.getByRole('button',{name:'Add article',exact:true}).click();
  await closed.getByRole('textbox',{name:'Article link or text',exact:true}).fill('A read added from the cover\n\n'+text);
  await closed.getByRole('button',{name:'Add',exact:true}).click();await closed.locator('h1').filter({hasText:'A read added from the cover'}).waitFor();
  assert.equal(await closed.getByRole('tab',{name:'Collection',exact:true,includeHidden:true}).getAttribute('aria-selected'),'true');
  await closed.close();console.log('PASS existing-library migration and adding an article from the closed book');
} finally {await browser.close();}
