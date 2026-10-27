/* Original Sovera frames on real room seats; only verified backend equipment. */
(function(){
'use strict';
const ctx=window.AkiraBridge?.getContext?.()||{};
if(!ctx.voiceAuth||!ctx.userId)return;
const API=(ctx.voiceApi||'https://api.soverixnet.online').replace(/\/$/,'');
const cache=new Map();
const portrait={
 'phoenix.png':[.43,.53],'ice.png':[.43,.53],'dragon.png':[.43,.53],
 'vip7.webp':[.43,.53],'royal-gold.webp':[.61,.52],
 'violet-love.webp':[.59,.53],'ice-admin.webp':[.59,.53],
 'dragon-gold.webp':[.59,.51],'ice-dragon.webp':[.58,.52],
 'violet-phoenix.webp':[.59,.53]
};
const remote=a=>/^https:\/\/[^\s"'<>]+$/i.test(String(a||''))?a:null;
const local=a=>{
 const m=String(a||'').match(/^https:\/\/raw\.githubusercontent\.com\/soverixnet-design\/sovera-voice-app\/[0-9a-f]{40}\/assets\/effects\/([a-z0-9-]+\.(?:webp|png))$/i);
 return m?'assets/sovera/effects/'+m[1]:a;
};
async function itemsFor(id){
 if(cache.has(id))return cache.get(id);
 const promise=fetch(API+'/api/v1/community/user-cosmetics?id='+encodeURIComponent(id),{
  headers:{Authorization:'Bearer '+ctx.voiceAuth},cache:'no-store'
 }).then(async r=>{if(!r.ok)throw Error('cosmetics_unavailable');const v=await r.json();return Array.isArray(v.items)?v.items:[]})
 .catch(()=>[]);
 cache.set(id,promise);return promise;
}
function decorateSeat(seat,id){
 const host=seat.querySelector('.av');if(!host)return;
 const old=host.querySelector('.akira-sovera-room-frame');
 if(old)old.remove();
 itemsFor(id).then(items=>{
  if(seat.dataset.akiraCosmeticUser!==id||!seat.isConnected)return;
  const frame=items.find(x=>x.kind==='frame'),url=remote(frame?.asset);
  if(!url)return;
  const art=document.createElement('img');art.className='akira-sovera-room-frame';
  const file=url.split('/').pop().split('?')[0],geo=portrait[file]||[.59,.53];
  // Room seats are narrow (four per row); size the artwork and the actual
  // portrait together so the original cutout fits without overlapping seats.
  const ratio=Math.min(1/geo[0],seat.closest('.host')?1.85:1.45);
  const face=host.querySelector('.face');
  if(face)face.style.inset=((1-ratio*geo[0])*50)+'%';
  art.style.width=ratio*100+'%';art.style.height=ratio*100+'%';
  art.style.left=(50-ratio*50)+'%';art.style.top=(50-ratio*geo[1]*100)+'%';
  art.src=local(url);art.alt=frame.name||'Equipped frame';
  art.onerror=()=>{if(art.getAttribute('src')!==url)art.src=url};
  host.appendChild(art);
 });
}
let seen=new Set(),bootstrapped=false;
const durations={'phoenix-entry.webp':3200,'dragon-queen-entry.webp':3200,'ice-king-entry.webp':3200,
 'castle-entry.webp':7000,'lion-queen-entry.webp':10600,'phoenix-queen-entry.webp':13800,'tiger-queen-entry.webp':12000};
async function arrival(id){
 if(String(id)===String(ctx.userId))return;
 const entries=await itemsFor(id);
 const entry=entries.find(x=>x.kind==='entry'),url=remote(entry?.asset);
 if(!url||!document.body.isConnected)return;
 document.getElementById('akiraSoveraRemoteEntry')?.remove();
 const layer=document.createElement('div');layer.id='akiraSoveraRemoteEntry';
 const art=document.createElement('img');art.src=local(url);art.alt=entry.name||'Room arrival';
 art.onerror=()=>{if(art.getAttribute('src')!==url)art.src=url};
 art.style.animationDuration=(durations[url.split('/').pop()]||3200)+'ms';
 layer.appendChild(art);document.body.appendChild(layer);
 setTimeout(()=>layer.remove(),durations[url.split('/').pop()]||3200);
}
function decorate(){
 const actual=document.querySelectorAll('.seat[data-i]');
 const ids=[];
 for(const seat of actual){
  const model=window.seats?.[Number(seat.dataset.i)],id=String(model?.id||'');
  if(!/^\d{6,18}$/.test(id)||!model.real)continue;
  ids.push(id);seat.dataset.akiraCosmeticUser=id;decorateSeat(seat,id);
 }
 const members=[...ids,...(Array.isArray(window.U)?window.U.map(x=>String(x.id||'')):[])].filter(x=>/^\d{6,18}$/.test(x));
 const now=new Set(members);
 if(bootstrapped)for(const id of now){if(!seen.has(id))void arrival(id)}
 seen=now;bootstrapped=true;
}
const style=document.createElement('style');
style.textContent='.akira-sovera-room-frame{position:absolute!important;pointer-events:none;object-fit:contain;z-index:5;animation:akira-sovera-sparkle 3s ease-in-out 1}@keyframes akira-sovera-sparkle{50%{filter:brightness(1.5)}}#akiraSoveraRemoteEntry{position:fixed;inset:0;z-index:3000;pointer-events:none;display:grid;place-items:center}#akiraSoveraRemoteEntry img{width:min(100vw,500px);height:100dvh;object-fit:contain;animation:akira-sovera-entrance 3.2s ease-out forwards}@keyframes akira-sovera-entrance{0%{opacity:0;transform:translateY(25px) scale(.94)}20%{opacity:1;transform:none}80%{opacity:1}100%{opacity:0}}@media(prefers-reduced-motion:reduce){.akira-sovera-room-frame,#akiraSoveraRemoteEntry img{animation:none!important}}';
document.head.appendChild(style);
const original=window.render;
if(typeof original==='function'){
 window.render=function(){const result=original.apply(this,arguments);queueMicrotask(decorate);return result};
}
queueMicrotask(decorate);
})();