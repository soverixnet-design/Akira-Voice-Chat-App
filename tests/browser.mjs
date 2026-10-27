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
    // Visitors never access the app, even with an obsolete guest flag.
    await page.addInitScript(()=>localStorage.setItem('vr_guest','1'));
    await page.goto('http://127.0.0.1:4174');
    await page.locator('#sp').waitFor({state:'attached'});
    await page.waitForFunction(()=>document.getElementById('sp').classList.contains('off'));
    await page.locator('#au.on').waitFor();
    assert.equal(await page.locator('#wgs, #ag').count(),0);
    assert.equal(await page.locator('#v-home').isVisible(),false);
    // The production session check is server-backed; mock only here in CI.
    await page.route('https://api.soverixnet.online/**',async route=>{
      const path=new URL(route.request().url()).pathname;
      const headers={'access-control-allow-origin':'http://127.0.0.1:4174','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization,content-type'};
      if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});
      const payload=path==='/api/v1/auth/me'?{user:{id:'100002',displayName:'Verified Test'}}:
        path==='/api/v1/rooms'?{rooms:[]}:{ok:true};
      return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(payload)});
    });
    await page.evaluate(()=>localStorage.setItem('akira_server_token_v1','A'.repeat(43)));
    await page.reload();
    await page.waitForFunction(()=>window.__akiraAuthVerified===true);
    const box=await page.locator('#app').boundingBox();
    assert.equal(box.width,width);assert.equal(box.height,height);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
    for(const tab of ['rank','msg','me','home']){
      await page.locator(`.ni[data-v="${tab}"]`).click();
      assert.equal(await page.locator(`#v-${tab}`).isVisible(),true);
    }
    // No mock rooms should be offered when the server returned an empty room list.
    assert.equal(await page.locator('.card').count(),0);
    assert.equal(await page.locator('#au.on').count(),0);
    if(width===390)await page.screenshot({path:'test-results/home-390.png'});
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

  // Test the REAL web UI against a local simulated Akira API; never mutate production coins.
  {
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    await page.addInitScript(()=>localStorage.setItem('akira_server_token_v1','A'.repeat(43)));
    await page.route('https://api.soverixnet.online/**',async route=>{
      const req=route.request(),path=new URL(req.url()).pathname;
      const headers={'access-control-allow-origin':'http://127.0.0.1:4174','access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization,content-type'};
      if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
      const payload=path==='/api/v1/auth/me'?{user:{id:'100002',displayName:'Seller Test'}}:
        path==='/api/v1/wallet'?{wallet:{balance:6500}}:
        path==='/api/v1/community/balance'?{coins:'6500',diamonds:'350'}:
        path==='/api/v1/community/exchange-rate'?{coins_per_100:70}:
        path==='/api/v1/community/sellers'?{items:[{id:'100012',name:'Verified Seller'}]}:
        path==='/api/v1/seller/wallet'?{wallet:{balance:20000,enabled:true}}:
        path==='/api/v1/sellers'?{sellers:[{publicId:'100012',displayName:'Verified Seller',avatarUrl:null}]}:
        path==='/api/v1/seller/history'?{transfers:[{recipientId:'100101',amount:100,createdAt:'2026-10-25T10:00:00Z'}]}:
        path==='/api/v1/seller/transfer'?{balance:19900,recipientBalance:6600,duplicate:false}:
        path==='/api/v1/rooms'?{rooms:[]}:{ok:true};
      await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(payload)});
    });
    await page.goto('http://127.0.0.1:4174');
    await page.locator('#sp.off').waitFor();
    await page.locator('.ni[data-v="me"]').click();
    await page.locator('#akiraSellerDirectoryButton').waitFor();
    await page.waitForFunction(()=>window.coins()===6500);
    await page.waitForFunction(()=>document.getElementById('akiraSellerOpen')?.style.display==='block');
    assert.deepEqual(await page.locator('#v-me #wr, #v-me #akiraSellerDirectoryButton, #v-me #akiraSellerOpen').evaluateAll(nodes=>nodes.map(n=>n.id)),['wr','akiraSellerDirectoryButton','akiraSellerOpen']);
    await page.locator('#akiraSellerDirectoryButton').click();
    await page.getByText('Verified Seller',{exact:true}).waitFor();
    assert.equal(await page.getByText('Rafi Coin Hub').count(),0);
    await page.evaluate(()=>closeSheet());
    await page.locator('#akiraSellerOpen').click();
    await page.locator('#akiraSellerHistory').click();
    await page.getByText(/100101/).waitFor();
    await page.locator('#akiraSellerUser').fill('100101');
    await page.locator('#akiraSellerAmount').fill('100');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#akiraSellerSend').click();
    await page.getByText(/Success! Receiver balance/).waitFor();
    await page.locator('#akiraSellerClose').click();
    await page.evaluate(()=>rechargeSheet(1));
    await page.locator('#av7wallet').waitFor();
    await page.getByText('Exact balance: 6,500').waitFor();
    await page.getByText(/100 diamonds → 70 coins/).waitFor();
    await page.locator('#av7wallet [data-av7="recharge"]').click();
    await page.getByText('Recharge packages',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
    results.push({width:390,height:844,status:'seller_wallet_passed'});
    await page.close();
  }

  // Connected admin interface: mocked authenticated API; no production admin operations.
  {
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors=[],operations=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://api.soverixnet.online/**',async route=>{
      const req=route.request(),path=new URL(req.url()).pathname;
      const headers={'access-control-allow-origin':'http://127.0.0.1:4174','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET, POST, OPTIONS'};
      if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
      const body=req.postDataJSON?.()||{};
      operations.push({path,method:req.method(),body});
      const payload=path==='/api/v1/auth/login'?{token:'A'.repeat(43)}:
        path==='/api/v1/admin/dashboard'?{role:'super_admin',stats:{users:17,rooms:3}}:
        path==='/api/v1/sellers'?{sellers:[{publicId:'100012',displayName:'Approved Seller'}]}:
        path==='/api/v1/admin/sellers/status'?{ok:true,publicId:body.publicId,enabled:body.enabled}:
        path==='/api/v1/admin/sellers/allocate'?{status:200,balance:300}:
        path==='/api/v1/admin/wallet/recharge'?{ok:true,wallet:{balance:7800}}:
        path==='/api/v1/admin/rooms/update'?{ok:true,room:{id:body.publicId,isLocked:body.locked,seatCount:body.seatCount||10}}:
        path==='/api/v1/admin/game-status'?{enabled:true,games:[{name:'food-wheel',round:{id:'12',settledAt:null}},{name:'jackpot-fruit',round:null}]}:
        path==='/api/v1/admin/users/search'?{user:{public_id:'100012',display_name:'Approved Seller',country_code:'BD'}}:
        path==='/api/v1/admin/users'?{users:[]}:
        path==='/api/v1/admin/roles'?{roles:[]}:
        path==='/api/v1/admin/audit'?{events:[]}:
        path==='/api/v1/rooms'?{rooms:[]}:{ok:true};
      await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(payload)});
    });
    await page.goto('http://127.0.0.1:4174/admin.html');
    await page.locator('input[type=email]').fill('admin@example.com');
    await page.locator('input[type=password]').fill('not-a-real-password');
    await page.getByRole('button',{name:'Sign In'}).click();
    await page.getByRole('button',{name:'☰'}).click();
    await page.locator('nav#nv [data-page="sellers"]').click();
    const sellerCard=page.locator('section.card').filter({hasText:'Seller permissions'});
    await sellerCard.getByRole('textbox',{name:'Seller 6-digit User ID'}).fill('100012');
    page.once('dialog',dialog=>dialog.accept());
    await sellerCard.getByRole('button',{name:'Disable seller'}).click();
    await page.getByText('Seller disabled.').waitFor();
    assert(operations.some(x=>x.path==='/api/v1/admin/sellers/status' && x.body.publicId==='100012' && x.body.enabled===false));
    await page.getByRole('button',{name:'☰'}).click();
    await page.locator('nav#nv [data-page="recharge"]').click();
    const recharge=page.locator('section.card').filter({hasText:'Credit original user wallet'});
    await recharge.locator('input').nth(0).fill('100012');
    await recharge.locator('input').nth(1).fill('50');
    page.once('dialog',dialog=>dialog.accept());
    await recharge.getByRole('button',{name:'Credit wallet'}).click();
    await page.getByText(/Wallet credited/).waitFor();
    assert(operations.some(x=>x.path==='/api/v1/admin/wallet/recharge'&&x.body.publicId==='100012'&&x.body.amount===50));
    await page.getByRole('button',{name:'☰'}).click();
    await page.locator('nav#nv [data-page="rooms"]').click();
    const rooms=page.locator('section.card').filter({hasText:'Manage Live Room'});
    await rooms.getByRole('textbox',{name:'Room ID'}).fill('100014');
    await rooms.getByLabel('Room access').selectOption('true');
    await rooms.getByLabel('Seat count').selectOption('5');
    page.once('dialog',dialog=>dialog.accept());
    await rooms.getByRole('button',{name:'Save Room Settings'}).click();
    await page.getByText(/Saved room 100014/).waitFor();
    assert(operations.some(x=>x.path==='/api/v1/admin/rooms/update' && x.body.publicId==='100014' && x.body.locked===true && x.body.seatCount===5));
    await page.getByRole('button',{name:'☰'}).click();
    await page.locator('nav#nv [data-page="games"]').click();
    await page.getByText('Live Game Engine — Read Only').waitFor();
    await page.getByText('Settlement engine').waitFor();
    assert(operations.some(x=>x.path==='/api/v1/admin/game-status'));
    assert.deepEqual(errors,[]);
    results.push({width:390,height:844,status:'admin_connected_passed'});
    console.log('PASS connected admin controls at 390x844');
    await page.close();
  }

  // Verify the real room-seat adapter uses authenticated server state, not demo occupants.
  {
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    let taken=false;
    await page.route('https://api.soverixnet.online/**',async route=>{
      const request=route.request(),path=new URL(request.url()).pathname;
      const headers={'access-control-allow-origin':'http://127.0.0.1:4174',
        'access-control-allow-methods':'GET, POST, OPTIONS','access-control-allow-headers':'authorization,content-type'};
      if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
      if(path==='/api/v1/rooms/100001/seat'&&request.method()==='POST')taken=true;
      const state={ok:true,roomId:'100001',seatCount:10,ownerId:'1',name:'Live Test Room',themeKey:'ocean',
        seats:taken?[{seatNo:1,publicId:'100002',displayName:'My Real ID'}]:[],
        members:[{publicId:'100002',displayName:'My Real ID'}]};
      return route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(state)});
    });
    await page.goto('http://127.0.0.1:4174/room.html');
    await page.evaluate(()=>{
      AkiraBridge.setContext({id:'100001',ownerId:'100001',userId:'100002',name:'Live Test Room',
        voiceApi:'https://api.soverixnet.online',voiceAuth:'A'.repeat(43)});
    });
    // CI has no physical mic. Only permission is mocked, not server seat ownership.
    await page.evaluate(()=>{window.akiraEnsureMicPermission=async()=>true});
    await page.addScriptTag({url:'http://127.0.0.1:4174/src/room-live.js'});
    await page.waitForFunction(()=>window.__akiraLiveRoomSeats===true);
    assert.equal(await page.locator('.seat').count(),10);
    assert.equal(await page.locator('.seat').filter({hasText:'Rafi'}).count(),0);
    await page.locator('.seat[data-i="1"]').click();
    await page.locator('#akiraTakeSeat').click();
    await page.locator('.seat[data-i="1"]').getByText('My Real ID').waitFor();
    assert.equal(taken,true);
    assert.equal(await page.locator('#mic').getAttribute('aria-label'),'Mute or unmute');
    assert.deepEqual(errors,[]);
    results.push({width:390,height:844,status:'live_room_seats_passed'});
    console.log('PASS database-backed voice seats at 390x844');
    await page.close();
  }

  // Dedicated Akira finance page: protected original Wallet and Seller inventory UI, all mocked.
  {
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors=[],operations=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('https://api.soverixnet.online/**',async route=>{
      const req=route.request(),path=new URL(req.url()).pathname;
      const headers={'access-control-allow-origin':'http://127.0.0.1:4174',
        'access-control-allow-methods':'GET, POST, OPTIONS',
        'access-control-allow-headers':'authorization,content-type'};
      if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});
      const body=req.postDataJSON?.()||{};
      operations.push({path,method:req.method(),body});
      const result=path==='/api/v1/auth/login'?{token:'A'.repeat(43)}:
        path==='/api/v1/admin/dashboard'?{role:'super_admin',stats:{users:15,rooms:2}}:
        path==='/api/v1/admin/users/search'?{user:{public_id:100012,display_name:'Verified Receiver',country_code:'BD'}}:
        path==='/api/v1/sellers'?{sellers:[{publicId:'100012',displayName:'Verified Receiver'}]}:
        path==='/api/v1/admin/wallet/recharge'?{ok:true,wallet:{balance:7800}}:
        path==='/api/v1/admin/sellers/allocate'?{ok:true,balance:5000}:
        path==='/api/v1/admin/sellers/status'?{ok:true,enabled:body.enabled}:
        {ok:true};
      await route.fulfill({status:200,headers,contentType:'application/json',body:JSON.stringify(result)});
    });
    await page.goto('http://127.0.0.1:4174/admin-finance.html');
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('test-password');
    await page.locator('#loginBtn').click();
    await page.locator('#financePanel:not(.hidden)').waitFor();
    await page.locator('#rechargeId').fill('100012');
    await page.locator('#rechargeAmount').fill('100');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#rechargeButton').click();
    await page.getByText(/Original Wallet: 7,800/).waitFor();
    await page.locator('#sellerId').fill('100012');
    await page.locator('#sellerAmount').fill('500');
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#allocateButton').click();
    await page.getByText(/Seller Balance: 5,000/).waitFor();
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#disableButton').click();
    await page.getByText(/Seller disabled/).waitFor();
    assert(operations.some(x=>x.path==='/api/v1/admin/wallet/recharge'&&x.body.publicId==='100012'&&x.body.amount===100&&x.body.requestId));
    assert(operations.some(x=>x.path==='/api/v1/admin/sellers/allocate'&&x.body.publicId==='100012'&&x.body.amount===500&&x.body.requestId));
    assert(operations.some(x=>x.path==='/api/v1/admin/sellers/status'&&x.body.enabled===false));
    assert.deepEqual(errors,[]);
    await page.locator('#logout').click();
    await page.locator('#loginPanel:not(.hidden)').waitFor();
    results.push({width:390,height:844,status:'admin_finance_passed'});
    console.log('PASS Admin Finance recharge, seller allocation, permission and logout');
    await page.close();
  }

  await writeFile('test-results/browser.json',JSON.stringify(results,null,2));
}finally{await browser.close();server.kill()}
