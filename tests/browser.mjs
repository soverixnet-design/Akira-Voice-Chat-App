import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'4174'},stdio:'pipe'});
await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject)});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
await mkdir('test-results',{recursive:true});
try{
  for(const [width,height] of [[320,568],[360,800],[390,844],[430,932],[768,1024]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`)});
    await page.goto('http://127.0.0.1:4174');
    await page.locator('#sp').waitFor({state:'attached'});
    await page.waitForFunction(()=>document.getElementById('sp').classList.contains('off'));
    await page.locator('#wgs').click();
    const box=await page.locator('#app').boundingBox();
    assert.equal(box.width,width);assert.equal(box.height,height);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    for(const tab of ['rank','msg','me','home']){
      await page.locator(`.ni[data-v="${tab}"]`).click();
      assert.equal(await page.locator(`#v-${tab}`).isVisible(),true);
    }
    await page.locator('.card').first().click();
    const room=page.frameLocator('#rf');
    await room.locator('#rname').waitFor();
    assert.equal((await room.locator('#app').boundingBox()).width,width);
    const roomFrame=page.frames().find(f=>f.url().endsWith('/room.html'));
    assert.equal(await roomFrame.evaluate(()=>document.documentElement.scrollWidth),width);
    const name=await room.locator('#rname').textContent();
    await room.locator('#mic').click();
    const muted=await roomFrame.evaluate(()=>myMute);
    await room.locator('#txt').fill('Akira viewport test');
    await room.locator('#sendTxt').click();
    await room.locator('#roomBtn').click();
    await page.evaluate(()=>AkiraNavigation.back());
    assert.equal(await room.locator('#bg').isVisible(),false);
    // A second back minimizes; returning must reuse the same room document/state.
    await page.evaluate(()=>AkiraNavigation.back());
    assert.equal(await page.locator('#mini').isVisible(),true);
    await page.locator('#minib').click();
    assert.equal(await room.locator('#rname').textContent(),name);
    assert.equal(await roomFrame.evaluate(()=>myMute),muted);
    assert.ok((await room.locator('#chat').textContent()).includes('Akira viewport test'));
    // Check input layout at a keyboard-sized viewport.
    await page.setViewportSize({width,height:Math.max(320,height-300)});
    await roomFrame.waitForFunction(h => Math.abs(document.getElementById('app').getBoundingClientRect().height-h)<2, Math.max(320,height-300));
    const input=await room.locator('#txt').boundingBox();
    assert.ok(input.width>0 && input.y+input.height<=Math.max(320,height-300));
    await page.setViewportSize({width,height});
    await roomFrame.waitForFunction(h => Math.abs(document.getElementById('app').getBoundingClientRect().height-h)<2, height);
    if(width===390){
      await page.screenshot({path:'test-results/room-390.png'});
      // Simulate a notch and home indicator in the safe-area probe.
      await page.locator('#safe-area-probe').evaluate(e=>{e.style.paddingTop='47px';e.style.paddingBottom='34px'});
      await page.evaluate(()=>dispatchEvent(new Event('resize')));
      await roomFrame.evaluate(()=>dispatchEvent(new Event('resize')));
      const top=await room.locator('.top').boundingBox();
      const dock=await room.locator('.dock').boundingBox();
      assert.ok(top.y>=47);assert.equal(await room.locator('.dock').evaluate(e=>getComputedStyle(e).paddingBottom),'46px');
      assert.ok(dock.y+dock.height<=height+1);
    }
    await room.locator('#exit').click();await room.locator('#y1').click();
    assert.equal(await page.locator('#mini').isVisible(),false);
    assert.equal(await page.evaluate(()=>AkiraBridge.getContext()),null);
    // Close thread before profile before recharge, then navigate home.
    await page.evaluate(()=>{go('me');rechargeSheet();openProfile({id:'123',n:'Test',e:'🙂'});openThread(['Test','🙂','Hi','Now']);openSheet('<h3>Test</h3>')});
    for(const id of ['shb','th','pfo','rcp']){
      await page.evaluate(()=>AkiraNavigation.back());assert.equal(await page.locator('#'+id).isVisible(),false);
    }
    await page.evaluate(()=>AkiraNavigation.back());
    assert.equal(await page.evaluate(()=>AkiraNavigation.back()),false);
    if(width===390)await page.screenshot({path:'test-results/home-390.png'});
    assert.deepEqual(errors,[]);
    results.push({width,height,status:'passed'});console.log(`PASS ${width}x${height}`);
    await page.close();
  }
  await writeFile('test-results/browser.json',JSON.stringify(results,null,2));
}finally{await browser.close();server.kill()}
