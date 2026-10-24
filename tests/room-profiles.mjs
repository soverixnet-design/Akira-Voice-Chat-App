import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://x').pathname;res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':'text/html');res.end(await readFile('web'+(path==='/'?'/room.html':path)))}catch{res.writeHead(404).end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage();
 const pic='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ9kAAAAASUVORK5CYII=';
 await page.route('**/bridge.js',route=>route.fulfill({contentType:'text/javascript',body:`window.AkiraBridge={getContext:()=>({id:'100003',name:'Test room',voiceApi:'https://api.test',voiceAuth:'test',profile:{id:'100009',name:'Shakil',pic:${JSON.stringify(pic)}}}),onRoom:()=>{},toApp:e=>window.lastProfile=e};`}));
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({body:''}));
 await page.route('https://api.test/**',r=>r.fulfill({json:{members:[{id:'100009',name:'Shakil',pic,owner:false},{id:'100010',name:'Real friend',pic,bio:'Hello',owner:true}]}}));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.waitForFunction(()=>document.querySelector('.seat[data-i="0"] .nm')?.textContent==='Shakil');
 assert.equal(await page.locator('.seat[data-i="0"] img').getAttribute('src'),pic);
 assert.equal(await page.locator('#host .crown').count(),0);
 await page.evaluate(()=>{akiraVoiceReady=true;akiraVoiceRoom={remoteParticipants:new Map([['x',{identity:'100010'}]])};usersSheet()});
 assert.equal(await page.locator('#real-members .urow').count(),2);
 assert.equal(await page.locator('#real-members img').count(),2);
 await page.locator('#real-members .urow').nth(1).click();
 assert.equal((await page.evaluate(()=>lastProfile)).u.id,'100010');
 assert.equal((await page.evaluate(()=>lastProfile)).u.pic,pic);
 assert.equal(await page.evaluate(()=>sid(seats[0])),'100009');
 assert.equal(await page.evaluate(()=>U.length),0);
 console.log('PASS: own avatar, actual user ID, owner badge, real member photos and profile click; no demo audience.');
}finally{if(browser)await browser.close();server.close();}
