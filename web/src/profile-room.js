/* Render server-backed identities; no synthetic members or photos. */
(function(){
  var ctx=AkiraBridge.getContext()||{},me=ctx.profile;
  if(!me)return;
  var members=[],busy=false,stopped=false;
  function photo(el,p){el.textContent='👤';if(!p.pic)return;var img=document.createElement('img');img.src=p.pic;img.alt=p.name||p.n||'Profile';img.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block';img.onerror=function(){el.textContent='👤'};el.replaceChildren(img);}
  function profile(p){if(String(p.id)===String(me.id)){AkiraBridge.toApp({t:'profile',u:{seat:0,id:me.id}});return;}AkiraBridge.toApp({t:'profile',u:{id:String(p.id),n:p.name,pic:p.pic,bio:p.bio,e:'👤',real:true}});}
  var originalRender=render;
  render=function(){originalRender();var face=document.querySelector('.seat[data-i="0"] .face');if(face)photo(face,me);var own=members.find(function(p){return String(p.id)===String(me.id)});if(!own||!own.owner){var host=document.getElementById('host');host.querySelectorAll('.crown,.tag').forEach(function(el){el.remove()});}};
  sid=function(s){return s.id?String(s.id):'';};
  seats.forEach(function(s,i){seats[i]=i===0?{i:0,id:me.id,n:me.name,pic:me.pic,e:'👤',muted:myMute,talk:false}:{i:i,empty:1};});
  U=[];
  function activeMembers(){
    if(!akiraVoiceReady||!akiraVoiceRoom)return [me];
    var ids=new Set([String(me.id)]);akiraVoiceRoom.remoteParticipants.forEach(function(p){ids.add(String(p.identity))});
    return members.filter(function(p){return ids.has(String(p.id))});
  }
  total=function(){return activeMembers().length;};
  function rows(){var list=document.getElementById('real-members');if(!list)return;var query=document.getElementById('real-search').value.toLowerCase();list.replaceChildren();activeMembers().filter(function(p){return p.name.toLowerCase().includes(query)||String(p.id).includes(query)}).forEach(function(p){var row=document.createElement('button');row.className='urow';row.style.width='100%';var avatar=document.createElement('div');avatar.className='ua';photo(avatar,p);var label=document.createElement('div');label.className='un';var name=document.createElement('b');name.textContent=p.name;var id=document.createElement('small');id.textContent='ID '+p.id+(p.owner?' · Room owner':'');label.append(name,id);row.append(avatar,label);row.onclick=function(){profile(p)};list.append(row)});}
  usersSheet=function(){open('<h3>Room members</h3><input class="field" id="real-search" placeholder="Search by name or ID"><div class="ul" id="real-members"></div>');document.getElementById('real-search').oninput=rows;rows();};
  seatSheet=function(i){if(i===0)profile(me);else toast('This seat is empty');};
  async function refresh(){if(busy||stopped)return;busy=true;try{var url=ctx.voiceApi.replace(/\/$/,'').replace(/\/api\/v1$/,'')+'/api/v1/rooms/'+encodeURIComponent(ctx.id)+'/members';var res=await fetch(url,{headers:{Authorization:'Bearer '+ctx.voiceAuth}});if(!res.ok)throw Error('Profile list unavailable');var data=await res.json();if(stopped)return;members=data.members;var mine=members.find(function(p){return String(p.id)===String(me.id)});if(mine){me=mine;Object.assign(seats[0],{n:me.name,pic:me.pic,id:me.id});}render();rows();}catch(e){console.warn(e.message)}finally{busy=false;}}
  AkiraBridge.onRoom(function(d){if(d.t==='profile-updated'){me=d.profile;Object.assign(seats[0],{n:me.name,pic:me.pic});render();refresh();}});
  render();refresh();var interval=setInterval(refresh,5000);
  window.addEventListener('pagehide',function(){stopped=true;clearInterval(interval)});
})();
