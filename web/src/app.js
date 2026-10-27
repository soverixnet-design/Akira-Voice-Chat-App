
var BRAND={logo:'assets/art-e14c4f1e0134.webp',top:'assets/art-04ae332c25f1.webp',bot:'assets/art-bdad05a08089.webp'};

var $=function(i){return document.getElementById(i)};
var bn=function(n){return String(n).replace(/\d/g,function(d){return"0123456789"[d]})};
var esc=function(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var fmt=function(n){return n>=1e6?bn((n/1e6).toFixed(1))+"M":n>=1e3?bn((n/1e3).toFixed(1))+"K":bn(n)};
/* ===== Config: this data will come from the server/admin later ===== */
var CFG={
 banners:[{t:"Daily check-in reward",s:"Join daily, win coins",e:"🎁",c:"#f59e0b,#ff3dc8",a:"daily"},{t:"Double coins on first recharge",s:"Limited time offer",e:"💎",c:"#9b4dff,#0ea5e9",a:"recharge"},{t:"Room ranking event",s:"Be the best room and win prizes",e:"🏆",c:"#10b981,#3b82f6",a:"rank"}],
 rooms:[
 {id:"10482915",name:"Chat House ✨",emoji:"🎙️",c:"#9b4dff,#4c1d95",n:128,host:"Rafi",tag:"Chat",mics:["😎","👩‍🦰","🧔"],th:"mid"},
 {id:"10551230",name:"Song Night 🎶",emoji:"🎤",c:"#ff3dc8,#9d174d",n:342,host:"Nusrat",tag:"Songs",mics:["👩‍🦰","🧑‍🎤","👧"],th:"rose"},
 {id:"10620877",name:"Dhaka Night 🌙",emoji:"🌙",c:"#0ea5e9,#075985",n:215,host:"Sakib",tag:"Night Chat",mics:["🧔","🧑‍💻","👩‍🎓"],th:"ocean"},
 {id:"10734561",name:"Football Fans ⚽",emoji:"⚽",c:"#10b981,#065f46",n:96,host:"Tanvir",tag:"Play",mics:["🧑‍💻","🧔"],th:"forest"},
 {id:"10809934",name:"Poetry Corner 📖",emoji:"📖",c:"#f59e0b,#92400e",n:64,host:"Faria",tag:"Poetry",mics:["👩‍🎓","👧"],th:"gold"},
 {id:"10917742",name:"Gamers Zone 🎮",emoji:"🎮",c:"#a855f7,#581c87",n:187,host:"Arif",tag:"Games",mics:["🧑‍🚀","😎","🧔"],th:"sunset"},
 {id:"11023356",name:"Expat Friends 🌍",emoji:"🌍",c:"#14b8a6,#115e59",n:153,host:"Hasan",tag:"Expat",mics:["🧑‍🔧","👩‍🍳"],th:"ocean"},
 {id:"11145209",name:"Night Stories 💬",emoji:"💬",c:"#f43f5e,#881337",n:78,host:"Mim",tag:"Stories",mics:["👧","👩‍🦰"],th:"rose"}],
 people:[["Rafi","🧑‍🎤"],["Nusrat","👩‍🦰"],["Sakib","🧔"],["Mim","👧"],["Tanvir","🧑‍💻"],["Faria","👩‍🎓"],["Arif","🧑‍🚀"],["Sumi","👩‍🍳"],["Hasan","🧑‍🔧"],["Lima","👩‍⚕️"]],
 wealth:[9800000,7400000,6100000,4900000,3800000,2900000,2300000,1800000,1400000,1100000],
 chats:[["Customer service","🎧","Tell us your problem, we will help","Now"],["System notifications","🔔","Do not forget your daily reward!","1h"],["Rafi","🧑‍🎤","Coming tonight?","2h"],["Nusrat","👩‍🦰","Thanks for the gift 💜","5h"]]
};
/* ===== Profile and state (will come from the server after login) ===== */
function ls(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
var A=Object.assign({name:"Me",id:String(20000000+Math.floor(Math.random()*79999999)),pic:null,myRoom:null,claim:{d:"",streak:0}},ls("vr_app_v1",{}));
function saveA(){try{localStorage.setItem("vr_app_v1",JSON.stringify(A))}catch(e){}syncAcct()}
fixA();saveA();
function RS(){return Object.assign({coins:12450,xp:7200,dia:2500},ls("vr_state_v2",{}))}
function coins(){return RS().coins}
function level(){return 1+Math.floor(RS().xp/1000)}
function addCoins(n){var s=ls("vr_state_v2",{});s.coins=(s.coins==null?12450:s.coins)+n;try{localStorage.setItem("vr_state_v2",JSON.stringify(s))}catch(e){}refresh()}
function refresh(){syncAcct();if($("rcp").classList.contains("on"))renderRcp();$("hc").textContent="🪙 "+bn(coins());if($("v-me").classList.contains("on"))renderMe()}
function toast(t){var x=$("toast");x.textContent=t;x.style.display="block";clearTimeout(x.t);x.t=setTimeout(function(){x.style.display="none"},1800)}
function openSheet(h){$("sh").innerHTML='<div class="grab"></div>'+h;$("shb").classList.add("on")}
function closeSheet(){$("shb").classList.remove("on")}
$("shb").onclick=function(e){if(e.target===$("shb"))closeSheet()};
function pickImage(max,cb){var f=document.createElement("input");f.type="file";f.accept="image/*";f.onchange=function(){var file=f.files&&f.files[0];if(!file)return;var r=new FileReader();r.onload=function(){var im=new Image();im.onload=function(){var k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext("2d").drawImage(im,0,0,c.width,c.height);cb(c.toDataURL("image/jpeg",.8))};im.src=r.result};r.readAsDataURL(file)};f.click()}
/* ===== Navigation ===== */
function go(v){
  document.querySelectorAll(".view").forEach(function(s){s.classList.toggle("on",s.id==="v-"+v)});
  document.querySelectorAll(".ni").forEach(function(b){b.classList.toggle("on",b.dataset.v===v)});
  $("app").classList.toggle("lite",v==="me");if(v==="rank")renderRank();if(v==="msg")renderMsg();if(v==="me")renderMe();
}
document.querySelectorAll(".ni").forEach(function(b){b.onclick=function(){go(b.dataset.v)}});
/* ===== Banners ===== */
var bi=0,bpause=false;
$("ban").innerHTML=CFG.banners.map(function(b,i){return'<div class="slide" data-i="'+i+'" style="background:linear-gradient(135deg,'+b.c+')"><b>'+b.t+'</b><small>'+b.s+'</small><i>'+b.e+'</i></div>'}).join("");
$("dots").innerHTML=CFG.banners.map(function(_,i){return"<u"+(i?"":' class="on"')+"></u>"}).join("");
$("ban").onscroll=function(){var w=this.children[0].offsetWidth+10;bi=Math.round(this.scrollLeft/w);document.querySelectorAll("#dots u").forEach(function(d,i){d.classList.toggle("on",i===bi)})};
$("ban").onclick=function(e){var s=e.target.closest(".slide");if(!s)return;var a=CFG.banners[+s.dataset.i].a;if(a==="daily")dailySheet();if(a==="recharge")rechargeSheet();if(a==="rank")go("rank")};
$("ban").addEventListener("touchstart",function(){bpause=true});$("ban").addEventListener("touchend",function(){setTimeout(function(){bpause=false},3000)});
setInterval(function(){if(bpause||!$("v-home").classList.contains("on"))return;bi=(bi+1)%CFG.banners.length;var b=$("ban");b.scrollTo({left:bi*(b.children[0].offsetWidth+10),behavior:"smooth"})},4200);
/* ===== Room card (3D) ===== */
var tab=0;
function myR(){return Object.assign({id:A.id,n:1,host:A.name,tag:"My room",mics:["😎"]},A.myRoom)}
function roomList(){
  var q=($("q").value||"").trim().toLowerCase(),L=CFG.rooms.slice();if(A.myRoom)L.unshift(myR());
  if(tab===0)L.sort(function(a,b){return b.n-a.n});if(tab===1)L.reverse();if(tab===2)L=A.myRoom?[myR()]:[];
  if(q)L=L.filter(function(r){return r.name.toLowerCase().indexOf(q)>-1||r.id.indexOf(q)>-1});return L;
}
function cardHTML(r,i){
  var pat=new Array(14).join(r.emoji+" ");
  return'<div class="card" data-id="'+r.id+'" style="animation-delay:'+i*.06+'s"><div class="sway" style="animation-delay:-'+(i*.7)%5+'s"><div class="tilt"><i class="edge"></i><div class="bg" style="background:linear-gradient(150deg,'+r.c+')"><span class="pat">'+pat+'</span><i class="shine"></i></div><div class="emo">'+r.emoji+'</div><div class="live"><u></u><u></u><u></u>LIVE</div><div class="info"><b>'+esc(r.name)+'</b><small>🆔 '+r.id+' · 🔥 '+bn(r.n)+'</small><div class="mics">'+r.mics.map(function(m){return"<i>"+m+"</i>"}).join("")+'<em>'+esc(r.tag)+'</em></div></div></div></div></div>';
}
function renderRooms(){
  var L=roomList(),g=$("grid");
  g.innerHTML=L.length?L.map(cardHTML).join(""):'<div class="empty">'+(tab===2?"You do not have a room yet.<br>Create your own room!<button class=\"big\" id=\"mk\">🎙️ Create room</button>":"No rooms found")+'</div>';
  if($("mk"))$("mk").onclick=createSheet;
}
$("q").oninput=renderRooms;
$("tabs").querySelectorAll("button").forEach(function(b,i){b.onclick=function(){tab=i;$("tabs").querySelectorAll("button").forEach(function(x,k){x.classList.toggle("on",k===i)});renderRooms()}});
var G=$("grid");
function tl(e){var c=e.target.closest&&e.target.closest(".card");if(!c)return;var t=c.querySelector(".tilt"),b=c.getBoundingClientRect(),x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;t.style.setProperty("--ry",((x-.5)*24)+"deg");t.style.setProperty("--rx",(-(y-.5)*24)+"deg");t.style.setProperty("--mx",x*100+"%");t.style.setProperty("--my",y*100+"%")}
function tr(e){var c=e.target.closest&&e.target.closest(".card");if(!c)return;var t=c.querySelector(".tilt");t.style.setProperty("--ry","0deg");t.style.setProperty("--rx","0deg")}
G.addEventListener("pointermove",tl);G.addEventListener("pointerdown",tl);G.addEventListener("pointerup",tr);G.addEventListener("pointercancel",tr);G.addEventListener("pointerleave",tr,true);
G.addEventListener("click",function(e){var c=e.target.closest(".card");if(!c)return;var r=roomList().filter(function(x){return x.id===c.dataset.id})[0];if(r)openRoom(r)});
/* ===== Entering the room ===== */
var cur=null;
async function openRoom(r){
  if(cur && cur.id===r.id){resumeRoom();return}
  if(!akiraToken()){showAuth("login");toast("Log in to enter a live room");return}
  try{await akiraRequest("/api/v1/rooms/"+encodeURIComponent(r.id)+"/join","POST",undefined,akiraToken())}catch(e){toast(e.message||"Cannot join room");return}
  if(cur)leaveRoom();
  AkiraBridge.setContext({name:r.name,emoji:r.emoji,theme:r.th,id:r.id,ownerId:r.ownerId||null,userId:String(A.id),minor:!!A.minor,voiceAuth:akiraToken(),voiceApi:AKIRA_API_BASE});
  cur=r;
  $("rf").src="room.html";
  resumeRoom();
  window.akiraEquipment?.showEntry?.();
}
function resumeRoom(){
  $("rw").classList.add("on");$("mini").classList.remove("on");
  window.dispatchEvent(new Event("akira:room-change"));
}
function minimizeRoom(){
  if(!cur)return;
  $("rw").classList.remove("on");$("minib").textContent=cur.emoji;
  $("mini").classList.add("on");refresh();
}
function leaveRoom(){if(cur&&akiraToken())akiraRequest("/api/v1/rooms/"+encodeURIComponent(cur.id)+"/leave","POST",undefined,akiraToken()).catch(function(e){console.warn("Room leave failed",e)});var rf=$("rf");rf.removeAttribute("srcdoc");rf.src="about:blank";$("rw").classList.remove("on");$("mini").classList.remove("on");cur=null;AkiraBridge.setContext(null);window.dispatchEvent(new Event("akira:room-change"));refresh()}
AkiraBridge.onApp(function(d){
  if(d.t==="exit")leaveRoom();
  if(d.t==="gift"){fixA();A.st.sent=(A.st.sent||0)+d.n;A.sw[d.g]=(A.sw[d.g]||0)+d.n;saveA()}
  if(d.t==="profile"){if(d.u.seat===0){var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true);$("pfo").classList.add("on")}else openProfile(d.u)}
  if(d.t==="min")minimizeRoom()});
$("minib").onclick=resumeRoom;
$("minix").onclick=leaveRoom;
function createSheet(){
  var E=["🎙️","🎤","🎶","🌙","⚽","📖","🎮","🌍","💬","🔥","💎","🌸"],ch="🎙️";
  openSheet('<h3>🎙️ Create your own room</h3><div class="lbl">Room name</div><input class="field" id="cn" maxlength="24" placeholder="e.g. My Chat House"><div class="lbl" style="margin-top:12px">Room icon</div><div class="g4" id="ce">'+E.map(function(e,i){return'<button class="'+(i?"":"sel")+'"><span>'+e+'</span></button>'}).join("")+'</div><div class="lbl" style="margin-top:10px">Room ID = Your profile ID ('+A.id+')</div><button class="big" id="cm">Create room</button>');
  $("ce").querySelectorAll("button").forEach(function(b,i){b.onclick=function(){ch=E[i];$("ce").querySelectorAll("button").forEach(function(x){x.classList.remove("sel")});b.classList.add("sel")}});
  $("cm").onclick=async function(){var n=$("cn").value.trim()||"My room";var T=["mid","rose","ocean","forest","gold","sunset"],C=["#9b4dff,#4c1d95","#ff3dc8,#9d174d","#0ea5e9,#075985","#10b981,#065f46","#f59e0b,#92400e","#a855f7,#581c87"],k=Math.floor(Math.random()*6);var created;try{created=await akiraRequest("/api/v1/rooms","POST",{name:n},akiraToken())}catch(e){toast(e.message||"Room creation failed");return} A.myRoom={id:String(created.room.id),name:n,emoji:ch,th:T[k],c:C[k]};saveA();closeSheet();tab=2;$("tabs").querySelectorAll("button").forEach(function(x,i){x.classList.toggle("on",i===2)});renderRooms();toast("Room created ✓");openRoom(myR())};
}
$("plus").onclick=function(){if(A.myRoom)openRoom(myR());else createSheet()};
/* ===== Daily reward, recharge, invite ===== */
var DR=[100,150,200,300,400,600,1000];
function today(){return new Date().toISOString().slice(0,10)}
function dailySheet(){
  openSheet('<h3>🎁 Daily check-in</h3><p style="padding:12px">Checking verified daily coin rewards…</p>');
  var token=typeof window.akiraToken==='function'?window.akiraToken():'';
  if(!token||typeof window.akiraRequest!=='function'){
    openSheet('<h3>🎁 Daily check-in</h3><p>Sign in to claim coins to your real wallet.</p>');
    return;
  }
  function showStatus(d){
    var amounts=Array.isArray(d.amounts)&&d.amounts.length===7?d.amounts:DR;
    var day=Math.min(7,Math.max(1,Number(d.streak)||1)),done=d.claimed===true;
    var tiles=amounts.map(function(v,i){
      return '<button type="button" class="'+(i+1===day?'sel':'')+'" style="'+(i+1<day?'opacity:.65':'')+'"><span>'+(i===6?'🎁':'🪙')+'</span>Day '+bn(i+1)+'<br>🪙 '+bn(v)+'</button>';
    }).join('');
    openSheet('<h3>🎁 Daily check-in</h3><div class="g4">'+tiles+'</div>'+
      '<p style="padding:8px 12px;font-size:12px">Server resets at 00:00 UTC. Day '+day+
      (done?' claimed today.':' available today.')+'</p>'+
      '<button class="big" id="cl" '+(done?'disabled style="opacity:.55"':'')+'>'+
      (done?'Today reward already claimed ✓':'🪙 '+bn(d.nextReward||amounts[day-1])+' Claim real coins')+'</button>');
    if(!done)$("cl").onclick=async function(){
      var button=$("cl");if(!button||button.disabled)return;button.disabled=true;
      try{
        var result=await window.akiraRequest('/api/v1/rewards/daily','POST',{},token);
        if(!result||!result.ok)throw Error('Reward not confirmed');
        toast(result.alreadyClaimed?'Already claimed today ✓':'+'+bn(result.amount)+' real coins received 🎉');
        window.dispatchEvent(new Event('akira:wallet-updated'));
        if(typeof window.akiraRefreshWallet==='function')void window.akiraRefreshWallet();
        dailySheet();
      }catch(err){button.disabled=false;toast('Reward: '+(err.message||'Server unavailable'))}
    };
  }
  window.akiraRequest('/api/v1/rewards/daily','GET',undefined,token)
    .then(function(d){if(!d||!d.ok)throw Error('Daily rewards unavailable');showStatus(d)})
    .catch(function(err){openSheet('<h3>🎁 Daily check-in</h3><p style="padding:12px">Real daily rewards are not available: '+esc(err.message||'Server unavailable')+'</p>')});
}
var RCT=0,RATE=1,N=function(n){return Number(n).toLocaleString("en-US")};
function addDia(n){var s=ls("vr_state_v2",{});s.dia=(s.dia==null?2500:s.dia)+n;try{localStorage.setItem("vr_state_v2",JSON.stringify(s))}catch(e){}refresh()}
function rechargeSheet(tab){RCT=tab===1?1:0;renderRcp();$("rcp").classList.add("on")}
function renderRcp(){
  var P=[[1000,"$0.99"],[5500,"$4.99"],[12000,"$9.99"],[65000,"$49.99"]],X=[500,1000,5000,20000],h;
  h='<div class="rcw"><button id="rcl">🌐 English ⌄</button></div><div class="rch"><button class="bk" id="rcb">‹ Back</button><div class="rct"><button data-x="0" class="'+(RCT?"":"on")+'">Recharge</button><button data-x="1" class="'+(RCT?"on":"")+'">Exchange</button></div></div><div class="rcb">';
  h+='<div class="gc"><small>My gold coins</small><b>🪙 '+N(coins())+'</b><i>ID '+A.id+'</i></div><div class="dm"><span>💎 Your diamonds</span><span>'+N(RS().dia)+'</span></div>';
  if(!RCT){
    h+='<div class="rh"><h3>Recharge packages</h3><span>🇧🇩 Bangladesh</span></div><div class="pk"><p>Choose a package and send a recharge request for approval.</p>'+P.map(function(p,i){return'<button data-p="'+i+'"><span>🪙 '+N(p[0])+' Coins</span><em>'+p[1]+' ›</em></button>'}).join("")+'</div>'+
    '<button class="cta bl" id="rcs">Contact recharge support</button><button class="cta or" id="rcl2">Coin seller list</button>'+
    '<details class="rk"><summary>🏆 Recharge, sending and receiving rankings</summary>'+CFG.people.slice(0,5).map(function(p,i){return'<div><span>'+(i+1)+'. '+p[1]+' '+esc(p[0])+'</span><b>🪙 '+rf(CFG.wealth[i])+'</b></div>'}).join("")+'</details>';
  }else{
    h+='<div class="rh"><h3>Diamond exchange</h3></div><div class="rate">Rate: 1 💎 = '+bn(RATE)+' 🪙</div><div class="pk"><p>Buy gold coins with diamonds.</p>'+X.map(function(d,i){return'<button data-e="'+i+'"><span>💎 '+N(d)+'</span><em>🪙 '+N(d*RATE)+' ›</em></button>'}).join("")+'</div>';
  }
  $("rcp").innerHTML=h+'</div>';
  $("rcb").onclick=function(){$("rcp").classList.remove("on")};
  $("rcl").onclick=function(){toast("More languages are coming soon")};
  $("rcp").querySelectorAll("[data-x]").forEach(function(b){b.onclick=function(){RCT=+b.dataset.x;renderRcp()}});
  $("rcp").querySelectorAll("[data-p]").forEach(function(b){b.onclick=function(){var p=P[+b.dataset.p];openSheet('<h3>Recharge request</h3><div style="font-size:15px;line-height:1.7">🪙 '+N(p[0])+' Coins — '+p[1]+'<br>Coins will be added after the request is approved.</div><button class="big" id="pc" style="margin-top:14px">Send request</button>');$("pc").onclick=function(){closeSheet();toast("Recharge request sent ✓")}}});
  $("rcp").querySelectorAll("[data-e]").forEach(function(b){b.onclick=function(){var d=X[+b.dataset.e];if(RS().dia<d){toast("Not enough diamonds");return}openSheet('<h3>Exchange</h3><div style="font-size:15px;line-height:1.7">💎 '+N(d)+' to get 🪙 '+N(d*RATE)+' coins?</div><button class="big" id="ec" style="margin-top:14px">Confirm</button>');$("ec").onclick=function(){addDia(-d);addCoins(d*RATE);closeSheet();toast("+"+N(d*RATE)+" coins added ✓")}}});
  if($("rcs"))$("rcs").onclick=function(){toast("Support is coming soon")};
  if($("rcl2"))$("rcl2").onclick=sellerSheet;
}
var SELL=[["Rafi Coin Hub","🧑‍🎤","100002"],["Nusrat Recharge","👩‍🦰","100145"],["Sakib Coin Seller","🧔","100317"],["Tanvir Store","🧑‍💻","100482"],["Faria Coin Point","👩‍🎓","100659"]];
function sellerSheet(){
  openSheet('<h3>🪙 Coin seller list</h3><div class="rate">Tap a seller to start a chat</div>'+SELL.map(function(x,i){return'<div class="slr" data-s="'+i+'"><div class="sa">'+x[1]+'</div><div class="sn"><b>'+esc(x[0])+'</b><small>🟢 Online · ID '+x[2]+'</small></div><button class="scp" data-c="'+i+'">Copy</button><span class="sg">💬</span></div>'}).join(""));
  $("sh").querySelectorAll("[data-c]").forEach(function(b){b.onclick=function(e){e.stopPropagation();try{navigator.clipboard.writeText(SELL[+b.dataset.c][2])}catch(x){}toast("ID Copied ✓")}});
  $("sh").querySelectorAll("[data-s]").forEach(function(r){r.onclick=function(){var x=SELL[+r.dataset.s];closeSheet();openThread([x[0],x[1],"Assalamu alaikum! Need coins?? 🪙","Now"])}});
}
$("hc").onclick=function(){rechargeSheet()};
function inviteSheet(){
  var url='https://voice.soverixnet.online/',token=typeof window.akiraToken==='function'?window.akiraToken():'';
  openSheet('<h3>🤝 Invite friends</h3><p style="padding:12px">Loading verified invite count…</p>');
  function show(status,warning){
    var count=status&&Number.isSafeInteger(Number(status.verifiedInvites))?String(status.verifiedInvites):'Not available';
    var canApply=status&&status.canEnterCode===true;
    var shareCode=String(A.id||'');
    openSheet('<h3>🤝 Invite friends</h3>'+
      '<p style="font-size:13px;line-height:1.6">Invite a friend with your ID. They must enter it after signing in. Only verified registrations are counted. No coin bonus is promised.</p>'+
      '<div class="idp" style="margin:10px 0">Your invite ID: <b>'+esc(shareCode)+'</b></div>'+
      '<div class="idp" style="margin:10px 0">Verified invites: <b>'+esc(count)+'</b></div>'+
      (status&&status.invitedBy?'<div style="padding:9px">You were invited by ID '+esc(status.invitedBy)+'</div>':'')+
      (warning?'<p style="color:#fda4af;font-size:12px">'+esc(warning)+'</p>':'')+
      '<button class="big" id="sv">📤 Share Akira & my ID</button>'+
      (canApply?'<div style="margin-top:15px"><label>Have a friend’s invite ID?</label><input class="field" inputmode="numeric" maxlength="18" id="invCode" placeholder="Enter 6-digit or longer ID"><button class="big" id="invClaim">Confirm invite code</button></div>':''));
    $("sv").onclick=function(){
      var text='Join Akira Voice Chat. My invite ID is '+shareCode+'. After creating an account, open Invite and enter that ID.';
      if(navigator.share)navigator.share({text:text,url:url}).catch(function(){});
      else if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text+' '+url)
        .then(function(){toast('Invite copied ✓')}).catch(function(){toast(url)});
      else toast(url);
    };
    if(canApply)$("invClaim").onclick=async function(){
      var code=String($("invCode").value||'').trim();
      if(!/^\d{6,18}$/.test(code)){toast('Enter a valid user ID');return}
      var button=$("invClaim");button.disabled=true;
      try{
        await window.akiraRequest('/api/v1/referrals/claim','POST',{inviteCode:code},token);
        toast('Invite verified ✓');inviteSheet();
      }catch(e){button.disabled=false;toast('Invite: '+(e.message||'Verification failed'))}
    };
  }
  if(!token||typeof window.akiraRequest!=='function'){show(null,'Sign in to see your verified invite count.');return}
  window.akiraRequest('/api/v1/referrals','GET',undefined,token)
    .then(function(data){if(!data||!data.ok)throw Error('Invite tracking unavailable');show(data,'')})
    .catch(function(err){show(null,'Invite tracking is not active on the server: '+(err.message||'Unavailable'))});
}
$("qd").onclick=dailySheet;$("qr").onclick=rechargeSheet;$("qi").onclick=inviteSheet;$("qg").onclick=function(){toast("Enter a room and play games 🎮")};
/* ===== Ranking ===== */
var rtab=1,rper=1;
function rf(n){var x=n>=1e6?(n/1e6).toFixed(2).replace(/\.?0+$/,"")+"m":n>=1e3?(n/1e3).toFixed(2).replace(/\.?0+$/,"")+"k":String(n);return x}
function wingSVG(){var b='';for(var k=0;k<6;k++){var a=-8+k*14,l=150-k*8;b+='<path d="M200 100 L'+(200-l*1.1)+' '+(100-60+k*16)+' L'+(200-l*1.05)+' '+(100-40+k*17)+' Z" transform="rotate('+(a-8)+' 200 100)" fill="url(#gw)" stroke="#b45309" stroke-width="1"/>'}
return'<svg class="wings" viewBox="0 0 400 190"><defs><linearGradient id="gw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f6b92b"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs><g>'+b+'</g><g transform="translate(400 0) scale(-1 1)">'+b+'</g></svg>'}
function renderRank(){
  var F=[1,6.2,24][rper],L=[],OFF=[5,0,3,0,7,1,4],SC=[.5,1,.4,1,.3,.25,.6];
  if(rtab===3){L=CFG.rooms.slice().sort(function(a,b){return b.n-a.n}).map(function(r){return{id:r.id,n:r.name,e:r.emoji,v:Math.round(r.n*9000*F),room:1}})}
  else{for(var i=0;i<10;i++){var p=CFG.people[(i+OFF[rtab])%10];L.push({id:String(30000000+hsh(p[0])%60000000),lv:60-i*4,n:p[0],e:p[1],v:Math.round(CFG.wealth[(i+OFF[rtab])%10]*F*SC[rtab])})}}
  var idl=function(u){return'<span class="idl"><i class="idb">ID</i>'+u.id+'</span>'},cv=function(u){return'<div class="cv"><i class="cn"></i>'+rf(u.v)+'</div>'};
  var pod=function(i,c){var u=L[i];return'<div class="pp '+c+'" data-u="'+i+'">'+'<div class="gr"><div>'+u.e+'</div></div><b>'+esc(u.n)+'</b>'+idl(u)+cv(u)+'</div>'};
  var h='<div class="pod2"><div class="beam2"></div>'+wingSVG()+pod(1,"p2")+pod(0,"p1")+pod(2,"p3")+'<div class="dais"></div></div>';
  if(rtab!==3)h+='<div class="rr me"><b class="n">128</b><div class="ra" style="'+(A.pic?"background-image:url("+A.pic+")":"")+'">'+(A.pic?"":"😎")+'</div><div class="rn"><b>'+esc(A.name)+' (You)</b>'+idl(A)+'</div><div class="rv"><i class="cn"></i>'+rf(Math.round(52000*F))+'</div></div>';
  h+=L.slice(3).map(function(u,i){return'<div class="rr" data-u="'+(i+3)+'"><b class="n">'+(i+4)+'</b><div class="ra">'+u.e+'</div><div class="rn"><b>'+esc(u.n)+'</b>'+idl(u)+'</div><div class="rv"><i class="cn"></i>'+rf(u.v)+'</div></div>'}).join("");
  $("rb").innerHTML=h;rankWire(L);
}
$("rbk").onclick=function(){go("home")};
[["rt",function(i){rtab=i}],["rp",function(i){rper=i}]].forEach(function(p){$(p[0]).querySelectorAll("button").forEach(function(b,i){b.onclick=function(){p[1](i);$(p[0]).querySelectorAll("button").forEach(function(x,k){x.classList.toggle("on",k===i)});renderRank()}})});
function spin(){var r=$("rot");if(!r||!$("v-rank").classList.contains("on")){rotT=null;return}if(!rotHold)r.style.setProperty("--ry",(Math.sin(Date.now()/1500)*17)+"deg");rotT=requestAnimationFrame(spin)}
function rankWire(L){if(rtab!==3)$("rb").querySelectorAll("[data-u]").forEach(function(e){e.onclick=function(){openProfile(L[+e.dataset.u])}})}
/* ===== Messages ===== */
function renderMsg(){
  $("ml").innerHTML=CFG.chats.map(function(c,i){return'<div class="chatrow" data-i="'+i+'"><div class="av">'+c[1]+'</div><div><b>'+c[0]+'</b><small>'+c[2]+'</small></div><time>'+c[3]+'</time></div>'}).join("");
  $("ml").querySelectorAll(".chatrow").forEach(function(r){r.onclick=function(){var c=CFG.chats[+r.dataset.i];openThread(c)}});
}
var tcur=null;
function bub(t,me){var d=document.createElement("div");d.className="bub "+(me?"me":"th");d.textContent=t;$("tb").appendChild(d);$("tb").scrollTop=$("tb").scrollHeight}
function openThread(c){tcur=c;$("th").classList.add("on");$("thn").textContent=c[1]+" "+c[0];$("tb").innerHTML="";bub(c[2],false)}
$("thb").onclick=function(){$("th").classList.remove("on")};
function sendT(){var v=$("ti").value.trim();if(!v)return;bub(v,true);$("ti").value="";setTimeout(function(){bub(tcur[0]==="Customer service"?"Thank you! Your request has been received. You will be notified soon. 🙏":"😊",false)},900)}
$("ts").onclick=sendT;$("ti").onkeydown=function(e){if(e.key==="Enter")sendT()};
/* ===== Profile ===== */
var ptab=0,gsub=0,rotT=null,rotHold=false;
var COVERS=["#9b4dff,#ff3dc8","#0ea5e9,#6366f1","#f59e0b,#ef4444","#10b981,#0ea5e9","#f43f5e,#a855f7","#14b8a6,#3b82f6","#fb923c,#e879f9","#6366f1,#22d3ee"];
var GE=["🌹","💍","🚗","🏰","🦁","🐉","🚀","👑"];
function hsh(s){var h=7;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
function fixA(){A.st=A.st||{recv:0,sent:0};A.sw=A.sw||{};A.rw=A.rw||{};A.fol=A.fol||{};if(A.bio==null)A.bio="Hello! I am new on Akira Voice Chat App 🎙️"}
function lvC(){return 1+Math.floor((A.st.recv||0)/10)}
function myAge(){if(!A.dob)return null;var p=A.dob.split("-");return ageOf(+p[0],+p[1]-1,+p[2])}
function myModel(){fixA();var xp=RS().xp;return{n:A.name,pic:A.pic,e:"😎",cover:A.cover,id:A.id,country:A.country,age:myAge(),bio:A.bio,wl:level(),wp:(xp%1000)/10,cl:lvC(),cp:((A.st.recv||0)%10)*10,fl:0,fg:Object.keys(A.fol).filter(function(k){return A.fol[k]}).length,sent:A.st.sent||0,recv:A.st.recv||0,sw:A.sw,rw:A.rw,room:A.myRoom?A.myRoom.name:"",streak:A.claim.streak,left:1000-xp%1000,mine:true}}
function otherModel(u){
  var h=hsh(String(u.id)+u.n),bios=["I love hanging out in rooms 🎶","People of songs and stories 🌙","Come to the mic if you want to be friends 😄","Have a good time, everyone ✨","Stay happy, stay well 💜"],c=CTRY[h%CTRY.length],sw={},rw={};
  GE.slice(0,4+h%4).forEach(function(g,i){sw[g]=1+(h>>>i)%9;rw[g]=1+(h>>>(i+2))%13});
  var sum=function(o){return Object.keys(o).reduce(function(a,k){return a+o[k]},0)};
  return{n:u.n,e:u.e,pic:null,cover:null,ci:h%COVERS.length,id:String(u.id),country:c[0]+" "+c[1],age:18+h%20,bio:bios[h%5],wl:u.lv||1+h%40,wp:h%100,cl:1+h%30,cp:(h>>>3)%100,fl:20+h%900,fg:5+h%200,sent:sum(sw),recv:sum(rw),sw:sw,rw:rw,room:"",streak:h%9,u:u,mine:false};
}
function badgesOf(m){return[["🌱","New member",true],["🎁","First gift",m.sent>0],["⭐","Level 10",m.wl>=10],["💎","Level 25",m.wl>=25],["🏠","Room owner",m.mine?!!m.room:m.id.charCodeAt(0)%2===0],["📅","7-day streak",m.streak>=7],["🤝","10 followers",m.fl>=10],["🦁","Top donor",m.sent>=50]]}
function pfHTML(m,mine){
  var g=m.wl>=25?["#fde68a","#f59e0b"]:m.wl>=10?["#9b4dff","#ff3dc8"]:["#22d3ee","#34d399"],
  cov=m.cover?"url("+m.cover+") center/cover":"linear-gradient(135deg,"+COVERS[m.ci||0]+")",
  fol=!mine&&!!A.fol[m.id],fl=m.fl+(fol?1:0);
  var h='<div class="pf"><div class="cov" style="background:'+cov+'">'+(mine?'<button class="cvb" id="cvb">📷 Change cover</button>':'')+'</div><div class="pfh"><div class="pavw"><div class="pavr" style="--g1:'+g[0]+';--g2:'+g[1]+'"></div><div class="pav3" id="pavb" style="'+(m.pic?"background-image:url("+m.pic+")":"")+'">'+(m.pic?"":m.e)+'</div><span class="lvbadge">Lv'+bn(m.wl)+'</span></div><h2>'+esc(m.n)+'</h2><div class="meta"><span id="pid">🆔 '+m.id+' 📋</span>'+(m.country?'<span>'+esc(m.country)+'</span>':'')+(m.age?'<span>🎂 '+bn(m.age)+' Year</span>':'')+'</div><p class="bio">'+esc(m.bio||"")+'</p></div>';
  h+='<div class="lvs"><div class="lvc w"><b>💰 Wealth level</b><div class="big3">'+bn(m.wl)+'</div><div class="lvb"><i style="width:'+m.wp+'%"></i></div><small>Grows when you send gifts</small></div><div class="lvc c"><b>💖 Charm level</b><div class="big3">'+bn(m.cl)+'</div><div class="lvb"><i style="width:'+m.cp+'%"></i></div><small>Grows when you receive gifts</small></div></div>';
  h+='<div class="st4"><div><b>'+fmt(fl)+'</b><small>Followers</small></div><div><b>'+fmt(m.fg)+'</b><small>Following</small></div><div><b>'+fmt(m.sent)+'</b><small>Gifts sent</small></div><div><b>'+fmt(m.recv)+'</b><small>Gifts received</small></div></div>';
  if(mine)h+='<div class="pbtn"><button class="p" id="pe">✏️ Edit</button><button data-m="daily">🎁 Daily</button><button data-m="invite">🤝 Invite</button></div><div class="wallet" style="margin-top:0"><div><small>My wallet</small><b>🪙 '+bn(coins())+'</b></div><button id="wr">Recharge</button></div>';
  else h+='<div class="pbtn"><button class="p" id="pfol">'+(fol?"✅ Following":"➕ Follow")+'</button><button id="pmsg">💬 Messages</button><button id="pgift">🎁 Gift</button><button id="pmore" style="flex:.4">⋯</button></div>';
  h+='<div class="tabs">'+["ℹ️ Info","🎁 Gift","🏅 Badges"].map(function(t,i){return'<button data-pt="'+i+'" class="'+(ptab===i?"on":"")+'">'+t+'</button>'}).join("")+'</div>';
  if(ptab===0){
    h+='<div class="row"><span>🆔 ID</span><b>'+m.id+'</b></div><div class="row"><span>🌍 Country</span><b>'+esc(m.country||"-")+'</b></div><div class="row"><span>🎂 Age</span><b>'+(m.age?bn(m.age)+" Year":"-")+'</b></div><div class="row"><span>🏠 Room</span><b>'+(mine?esc(m.room||"None yet"):"ID "+m.id)+'</b></div><div class="row"><span>📅 Check-in streak</span><b>'+bn(m.streak||0)+' Day</b></div>'+(mine?'<div class="row"><span>⭐ Next level</span><b>'+bn(m.left)+' coins left</b></div>':'');
  }else if(ptab===1){
    var map=gsub===0?m.rw:m.sw,ks=GE.filter(function(k){return map[k]>0});
    h+='<div class="tabs"><button data-gs="0" class="'+(gsub===0?"on":"")+'">Received</button><button data-gs="1" class="'+(gsub===1?"on":"")+'">Sent</button></div>';
    h+=ks.length?'<div class="gw">'+ks.map(function(k){return'<div><span>'+k+'</span>×'+bn(map[k])+'</div>'}).join("")+'</div>':'<div class="empty">'+(gsub===0?"You have not received any gifts yet. They will show here when others send in a room.":"You have not sent any gifts yet. Go to a room and send one!")+'</div>';
  }else{
    h+='<div class="bdg">'+badgesOf(m).map(function(b){return'<div class="'+(b[2]?"":"off")+'"><span>'+(b[2]?b[0]:"🔒")+'</span>'+b[1]+'</div>'}).join("")+'</div>';
  }
  if(mine)h+='<div class="menu" style="margin-top:16px">'+[["home","🏠","My room"],["recharge","💎","Recharge"],["frame","🖼️","Frame"],["entry","✨","Entry"],["svip","👑","SVIP"],["store","🛍️","Store"],["invite","🤝","Invite"],["set","⚙️","Settings"]].map(function(x){return'<button data-m="'+x[0]+'"><span>'+x[1]+'</span>'+x[2]+'</button>'}).join("")+'</div>';
  return h+'</div>';
}
function pfWire(root,m,mine){
  var rr=function(){root.innerHTML=pfHTML(m,mine);pfWire(root,m,mine)},q=function(s,f){var e=root.querySelector(s);if(e)e.onclick=f};
  root.querySelectorAll("[data-pt]").forEach(function(b){b.onclick=function(){ptab=+b.dataset.pt;rr()}});
  root.querySelectorAll("[data-gs]").forEach(function(b){b.onclick=function(){gsub=+b.dataset.gs;rr()}});
  q("#pid",function(){try{navigator.clipboard.writeText(m.id);toast("ID Copied ✓")}catch(e){toast("ID: "+m.id)}});
  if(mine){
    q("#cvb",function(){pickImage(800,function(d){A.cover=d;saveA();renderMe();toast("Cover changed ✓")})});
    q("#pavb",function(){pickImage(260,function(d){A.pic=d;saveA();renderMe();toast("Photo changed ✓")})});
    q("#pe",editSheet);q("#wr",rechargeSheet);
    root.querySelectorAll("[data-m]").forEach(function(b){b.onclick=function(){var k=b.dataset.m;
      if(k==="home"){$("pfo").classList.remove("on");if(A.myRoom)openRoom(myR());else createSheet()}
      else if(k==="daily")dailySheet();else if(k==="invite")inviteSheet();else if(k==="recharge")rechargeSheet();else if(k==="set")settingsSheet();else if(k==="frame"||k==="entry"||k==="store")window.akiraEquipment?.open(k==="entry"?"entry":"frame");else toast("This section is coming soon")}});
  }else{
    q("#pfol",function(){A.fol[m.id]=!A.fol[m.id];saveA();rr()});
    q("#pmsg",function(){openThread([m.n,m.e,"👋 Hi!","Now"])});
    q("#pgift",function(){if($("rw").classList.contains("on")&&m.u&&$("rf").contentWindow){$("pfo").classList.remove("on");AkiraBridge.toRoom({t:"gift",seat:m.u.seat})}else toast("Enter a room and send gifts 🎁")});
    q("#pmore",function(){openSheet('<h3>'+esc(m.n)+'</h3><div class="acts"><button class="act" id="rp1"><span>🚩</span>Report</button><button class="act" id="bl1"><span>🚫</span>Block</button><button class="act" id="cp1"><span>📋</span>ID Copy</button></div>');$("rp1").onclick=function(){closeSheet();toast("Report sent")};$("bl1").onclick=function(){closeSheet();toast("Blocked")};$("cp1").onclick=function(){closeSheet();toast("ID: "+m.id)}});
  }
  window.akiraEquipment?.decorate?.(root,m,mine);
}
function meHTML(m){
  var av=m.pic?'style="background-image:url('+m.pic+')"':'';
  return'<div class="mtop"><button class="mb" id="mback">‹ Back</button><button class="mb" id="mlang">🌐 English ⌄</button></div>'+
  '<div class="mav"><div '+av+'>'+(m.pic?'':m.e)+'</div></div><div class="mnm">'+esc(m.n)+'</div><div class="mid" id="pid">ID: '+m.id+'</div>'+
  '<div class="lps"><div class="cap"><span class="lp s">⬆ Sent Lv.'+m.wl+'</span><span class="lp r">⬇ Received Lv.'+m.cl+'</span></div><span class="svp">SVIP 1</span></div>'+
  '<button class="edp" id="pe">✎ Edit profile</button>'+
  '<div class="mst"><div><b>'+fmt(m.fl)+'</b><small>Followers</small></div><div><b>'+fmt(m.fg)+'</b><small>Following</small></div><div><b>'+fmt(A.vis||0)+'</b><small>Visitors</small></div></div>'+
  '<button class="pick" id="pavb">📷 '+(m.pic?'Change profile photo':'Choose profile photo')+'</button>'+
  '<div class="tiles"><button data-m="store"><span>🛍️</span>Shop</button><button id="mbd"><span>🏅</span>Badges</button><button data-m="frame"><span>🖼️</span>Frame</button><button data-m="daily"><span>🎯</span>Tasks</button></div>'+
  '<button class="wl" id="wr"><b>Wallet ›</b><span><em>🪙 '+coins().toLocaleString("en-US")+'</em> &nbsp; <em>💎 '+(RS().dia||0).toLocaleString("en-US")+'</em></span></button>'+
  '<div class="ml2"><button class="mr" data-m="home"><span>🎙️ My room</span><i>›</i></button><button class="mr" data-m="entry"><span>✨ Entry</span><i>›</i></button><button class="mr" data-m="svip"><span>👑 SVIP</span><i>›</i></button><button class="mr" data-m="invite"><span>🤝 Invite</span><i>›</i></button><button class="mr" data-m="set"><span>⚙️ Settings</span><i>›</i></button></div>';
}
function renderMe(){var m=myModel(),r=$("v-me");r.innerHTML=meHTML(m);pfWire(r,m,true);
  $("mback").onclick=function(){go("home")};$("mlang").onclick=function(){toast("More languages are coming soon")};
  $("mbd").onclick=function(){openSheet('<h3>🏅 Badges</h3><div class="bdg">'+badgesOf(m).map(function(b){return'<div class="'+(b[2]?"":"off")+'"><span>'+b[0]+'</span>'+b[1]+'</div>'}).join("")+'</div>')};
}
function openProfile(u){ptab=0;gsub=0;var m=otherModel(u);$("pfc").innerHTML=pfHTML(m,false);pfWire($("pfc"),m,false);$("pfo").classList.add("on");$("pfo").scrollTop=0}
$("pfb").onclick=function(){$("pfo").classList.remove("on")};
function editSheet(){
  openSheet('<h3>✏️ Edit profile</h3><div class="lbl">Name</div><input class="field" id="en" maxlength="20" value="'+esc(A.name)+'"><div class="lbl" style="margin-top:10px">About (bio)</div><textarea class="field" id="eb" rows="3" maxlength="80">'+esc(A.bio||"")+'</textarea><div class="acts" style="grid-template-columns:1fr 1fr"><button class="act" id="ep"><span>📷</span>Change photo</button><button class="act" id="ec"><span>🖼️</span>Change cover</button></div><button class="big" id="es">Save</button>');
  $("ep").onclick=function(){pickImage(260,function(d){A.pic=d;saveA();renderMe();editSheet()})};
  $("ec").onclick=function(){pickImage(800,function(d){A.cover=d;saveA();renderMe();editSheet()})};
  $("es").onclick=function(){A.name=$("en").value.trim()||"Me";A.bio=$("eb").value.trim();saveA();closeSheet();renderMe();toast("Profile saved ✓")};
}
/* ===== Log in / Sign up ===== */
var ACC_K="vr_accts_v1",SESS_K="vr_sess";
function accts(){return ls(ACC_K,[])}
function saveAccts(L){try{localStorage.setItem(ACC_K,JSON.stringify(L))}catch(e){}}
function sess(){try{return localStorage.getItem(SESS_K)}catch(e){return null}}
function authed(){return !!akiraToken()}
function syncAcct(){var k=sess();if(!k)return;var L=accts(),a=L.filter(function(x){return x.key===k})[0];if(!a)return;a.p={name:A.name,pic:A.pic,id:A.id,myRoom:A.myRoom,claim:A.claim,country:A.country,dob:A.dob,minor:A.minor,cover:A.cover,bio:A.bio,st:A.st,sw:A.sw,rw:A.rw,fol:A.fol};a.state=ls("vr_state_v2",{});saveAccts(L)}
var MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
var CTRY=[["🇧🇩","Bangladesh"],["🇮🇳","India"],["🇸🇦","Saudi Arabia"],["🇦🇪","United Arab Emirates"],["🇶🇦","Qatar"],["🇰🇼","Kuwait"],["🇴🇲","Oman"],["🇲🇾","Malaysia"],["🇸🇬","Singapore"],["🇮🇹","Italy"],["🇬🇧","United Kingdom"],["🇺🇸","United States"],["🇨🇦","Canada"],["🇦🇺","Australia"],["🇩🇪","Germany"],["🇫🇷","France"],["🇯🇵","Japan"],["🇰🇷","South Korea"],["🇳🇵","Nepal"],["🇵🇰","Pakistan"],["🌍","Other"]];
function norm(s){return s.trim().toLowerCase().replace(/\s+/g,"")}
function validIdent(s){return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)||/^\+?\d{8,15}$/.test(s)}
function ageOf(y,m,d){var n=new Date(),a=n.getFullYear()-y;if(n.getMonth()<m||(n.getMonth()===m&&n.getDate()<d))a--;return a}
async function hashPw(p,salt){try{var b=new TextEncoder().encode(salt+":"+p),d=await crypto.subtle.digest("SHA-256",b);return Array.from(new Uint8Array(d)).map(function(x){return x.toString(16).padStart(2,"0")}).join("")}catch(e){var h=5381,t=salt+p;for(var i=0;i<t.length;i++)h=((h<<5)+h+t.charCodeAt(i))|0;return"f"+h}}
/* Akira-only HTTPS backend adapter. Visual presentation is unchanged. */
var AKIRA_API_BASE=window.AKIRA_API_BASE||"https://api.soverixnet.online";
var AKIRA_TOKEN_KEY="akira_server_token_v1";
function akiraToken(){try{return sessionStorage.getItem(AKIRA_TOKEN_KEY)||localStorage.getItem(AKIRA_TOKEN_KEY)||""}catch(e){return""}}
async function akiraRequest(path,method,body,token){
  var options={method:method||"GET",headers:{"Accept":"application/json"}};
  if(body!==undefined){options.headers["Content-Type"]="application/json";options.body=JSON.stringify(body)}
  if(token)options.headers.Authorization="Bearer "+token;
  if(!/^https:\/\//.test(AKIRA_API_BASE))throw new Error("Akira HTTPS API address is not configured");
  var response=await fetch(AKIRA_API_BASE+path,options);
  var data=await response.json().catch(function(){return{}});
  if(!response.ok)throw new Error(data.error||data.message||("Server error "+response.status));
  return data;
}
function akiraAccount(data,key,extra){
  var u=data.user||{},p={name:u.displayName||u.display_name||extra.name||"Akira User",id:String(u.publicId||u.public_id||u.id||""),pic:u.avatarUrl||u.avatar_url||extra.pic||null,country:extra.country||u.countryCode||u.country_code||"",dob:extra.dob||"",minor:!!(extra.age&&extra.age<18),myRoom:null,claim:{d:"",streak:0}};
  return {key:key,p:p,state:{coins:0,xp:0},server:true};
}
var API={
 signup:async function(d){
  try{
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.key))return{ok:false,msg:"Server registration currently requires an email address."};
    var data=await akiraRequest("/api/v1/auth/register","POST",{email:d.key,password:d.pw,displayName:d.name});
    localStorage.setItem(AKIRA_TOKEN_KEY,data.token);
    return{ok:true,acct:akiraAccount(data,d.key,d)};
  }catch(e){return{ok:false,msg:e.message||"Could not register. Try again."}}
 },
 login:async function(id,pw){
  try{
    if(!id.includes("@"))return{ok:false,msg:"Please log in with your registered email."};
    var data=await akiraRequest("/api/v1/auth/login","POST",{email:id,password:pw});
    localStorage.setItem(AKIRA_TOKEN_KEY,data.token);
    return{ok:true,acct:akiraAccount(data,id,{})};
  }catch(e){return{ok:false,msg:e.message||"Could not log in. Try again."}}
 }
};
async function loadAkiraRooms(){
  if(!akiraToken())return;
  try{
    var data=await akiraRequest("/api/v1/rooms","GET",undefined,akiraToken());
    if(!Array.isArray(data.rooms))return;
    CFG.rooms=data.rooms.map(function(r){return{id:String(r.id),ownerId:r.ownerId==null?null:String(r.ownerId),name:r.name||"Room",emoji:"🎙️",c:"#9b4dff,#4c1d95",n:0,host:"Akira",tag:"Live",mics:[],th:"mid"}});
    renderRooms();
  }catch(e){console.warn("Akira rooms unavailable",e)}
}
var amode="login",apic=null;
function showAuth(m){amode=m||"login";authRender();$("au").classList.add("on")}
function hideAuth(){
  if(window.__akiraAuthVerified!==true){showAuth("login");return}
  $("au").classList.remove("on")
}
function aerr(t){$("ae").textContent=t}
function enter(a,msg){
  var list=accts().filter(function(x){return x.key!==a.key});list.push(a);saveAccts(list);
  try{localStorage.setItem(SESS_K,a.key);localStorage.setItem("vr_state_v2",JSON.stringify(a.state||{}))}catch(e){}
  A=Object.assign({name:"Me",pic:null,myRoom:null,claim:{d:"",streak:0}},a.p);fixA();try{localStorage.setItem("vr_app_v1",JSON.stringify(A))}catch(e){}
  window.__akiraAuthVerified=true;
  document.documentElement.classList.add("akira-auth-verified");
  hideAuth();refresh();renderRooms();loadAkiraRooms();go("home");if(window.akiraEquipment)window.akiraEquipment.refresh().catch(function(){});toast(msg);
}
function authRender(){
  $("au").classList.toggle("w",amode==="welcome");
  if(amode==="welcome"){
    $("au").innerHTML='<div class="wl2"><img class="wimg" src="'+BRAND.top+'" alt="Akira Voice Chat App"><div class="wbtns"><button class="wb g" id="wg"><svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.6z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg><span>Continue with Google</span><i>›</i></button><button class="wb p" id="wp"><svg viewBox="0 0 24 24" fill="#fff"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg><span>Continue with Phone</span><i>›</i></button></div><div class="wfoot">By continuing you agree to our <a href="#" data-pol="terms">Terms &amp; Conditions</a> and <a href="#" data-pol="privacy">Privacy Policy</a></div><img class="wbot" src="'+BRAND.bot+'" alt=""></div>';
    bindPol($("au"));
    $("wg").onclick=function(){toast("Google Login will work once the server is connected")};
    $("wp").onclick=function(){showAuth("login")};

    return;
  }
  var s=amode==="signup",yr=new Date().getFullYear(),i;
  var h='<div class="aw"><button class="abk" id="abk">‹</button><img class="a3i" src="'+BRAND.logo+'" alt="Akira"><h1>Akira Voice Chat App</h1><p>'+(s?"Create a new account":"Sign in to your account")+'</p><div class="atabs"><button data-m="login" class="'+(s?"":"on")+'">Log in</button><button data-m="signup" class="'+(s?"on":"")+'">Sign up</button></div><div class="acard">';
  if(s){
    h+='<div class="apic" id="apic" style="'+(apic?"background-image:url("+apic+");border-style:solid":"")+'">'+(apic?"":"📷")+'</div><div class="lbl" style="text-align:center;margin-top:2px">Profile photo from gallery (optional)</div>';
    h+='<div class="lbl">Your name</div><input class="field" id="an" maxlength="20" placeholder="e.g. Shakil" autocomplete="name">';
    h+='<div class="lbl">Email or phone number</div><input class="field" id="aid" placeholder="name@email.com or +8801XXXXXXXXX" autocomplete="username">';
    h+='<div class="lbl">Password (at least 12 characters)</div><div class="pw"><input class="field" id="apw" type="password" autocomplete="new-password"><button type="button" class="eye" id="eye">👁️</button></div>';
    h+='<div class="lbl">Re-enter password</div><input class="field" id="apw2" type="password" autocomplete="new-password">';
    h+='<div class="lbl">Country</div><select class="field" id="ac"><option value="">Select country</option>'+CTRY.map(function(c){return'<option>'+c[0]+" "+c[1]+'</option>'}).join("")+'</select>';
    h+='<div class="lbl">Date of birth (cannot be changed later)</div><div class="drow"><select class="field" id="ad"><option value="">Day</option>';for(i=1;i<=31;i++)h+='<option value="'+i+'">'+bn(i)+'</option>';
    h+='</select><select class="field" id="am"><option value="">Month</option>'+MONTHS.map(function(m,k){return'<option value="'+k+'">'+m+'</option>'}).join("")+'</select><select class="field" id="ay"><option value="">Year</option>';for(i=yr-5;i>=yr-90;i--)h+='<option value="'+i+'">'+bn(i)+'</option>';
    h+='</select></div><label class="tc"><input type="checkbox" id="at"><span>I agree to the <a href="#" data-pol="terms">Terms &amp; Conditions</a> and <a href="#" data-pol="privacy">Privacy Policy</a>. Accounts cannot be created under age 13; Betting-style games stay closed under age 18.</span></label>';
  }else{
    h+='<div class="lbl">Email, phone number or ID</div><input class="field" id="aid" placeholder="name@email.com / +8801… / ID" autocomplete="username"><div class="lbl">Password</div><div class="pw"><input class="field" id="apw" type="password" autocomplete="current-password"><button type="button" class="eye" id="eye">👁️</button></div>';
  }
  h+='<div class="aerr" id="ae"></div><button class="big" id="ago" style="margin-top:4px">'+(s?"Create account":"Log in")+'</button>';
  if(!s)h+='<div class="alt"><button id="af">🔑 Forgot password?</button></div>';
  h+='</div><div class="alt">Sign in to continue</div><div class="lbl" style="margin-top:14px">Email accounts are connected to the Akira server. Voice and virtual coins are not yet live.</div></div>';
  $("au").innerHTML=h;
  $("au").querySelectorAll(".atabs button").forEach(function(b){b.onclick=function(){showAuth(b.dataset.m)}});
  bindPol($("au"));$("abk").onclick=function(){showAuth("welcome")};
  $("eye").onclick=function(){var t=$("apw").type==="password";$("apw").type=t?"text":"password";if($("apw2"))$("apw2").type=$("apw").type}

  if($("af"))$("af").onclick=function(){aerr("Password reset will work after the server is added.")};
  if($("apic"))$("apic").onclick=function(){pickImage(260,function(d){apic=d;authRender()})};
  $("ago").onclick=s?doSignup:doLogin;
}
async function doLogin(){
  var id=norm($("aid").value),pw=$("apw").value;if(!id||!pw){aerr("Enter email/number/ID and password");return}
  var b=$("ago");b.disabled=true;var r=await API.login(id,pw);b.disabled=false;if(!r.ok){aerr(r.msg);return}
  enter(r.acct,"Welcome, "+r.acct.p.name+"! 🎉");
}
async function doSignup(){
  var name=$("an").value.trim(),key=norm($("aid").value),pw=$("apw").value,c=$("ac").value,dd=+$("ad").value,mm=$("am").value,yy=+$("ay").value;
  if(name.length<2)return aerr("Enter at least 2 characters for the name");
  if(!validIdent(key))return aerr("Enter a valid email or phone number");
  if(pw.length<12)return aerr("Password must be at least 12 characters");
  if(pw!==$("apw2").value)return aerr("Passwords do not match");
  if(!c)return aerr("Select country");
  if(!dd||mm===""||!yy)return aerr("Select day, month and year of birth");
  var m=+mm,dt=new Date(yy,m,dd);if(dt.getMonth()!==m||dt.getDate()!==dd)return aerr("This date is not valid");
  var age=ageOf(yy,m,dd);if(age<13)return aerr("Sorry, accounts cannot be created under age 13.");
  if(!$("at").checked)return aerr("Please accept the Terms and Privacy Policy");
  var b=$("ago");b.disabled=true;
  var r=await API.signup({name:name,key:key,pw:pw,country:c,dob:yy+"-"+String(m+1).padStart(2,"0")+"-"+String(dd).padStart(2,"0"),pic:apic,age:age});
  b.disabled=false;if(!r.ok)return aerr(r.msg);apic=null;
  enter(r.acct,"Welcome, "+name+"! Your coins will reflect verified rewards only.");
}
function mask(k){if(k.indexOf("@")>0){var p=k.split("@");return p[0].slice(0,2)+"***@"+p[1]}return"***"+k.slice(-3)}

var POLD={privacy:["Privacy Policy",[["Who we are","Akira Voice Chat App (\"Akira\", \"we\", \"us\") is a social voice chat app where people join live voice rooms, chat, send virtual gifts and play games."],["Information we collect","Account details (name, email or phone number, password, date of birth, country, profile photo); activity (rooms you join, messages, gifts, coin and diamond transactions); device data (device ID, IP address, app version, crash logs); and the voice you stream live in rooms."],["Voice and permissions","The app asks for microphone access only so you can speak in rooms, and photo access only when you choose a picture. You can turn these off in your phone settings. Voice is streamed live and is not saved by default; it may be reviewed if a report is filed."],["How we use it","To run your account and rooms, show rankings, process purchases and rewards, keep the community safe, prevent fraud and abuse, send notifications you allow, and improve the app."],["Sharing","Your public profile (name, ID, photo, level, country) is visible to other users. We share data only with service providers that help us run the app (hosting, voice, SMS, payments, analytics) and when required by law. We do not sell your personal data."],["Children and teens","Akira is for people aged 13 and over. Users under 18 get a restricted experience: chance-based and betting-style games, including Lucky gifts, are turned off."],["Retention and deletion","We keep your data while your account is active. You can ask for your account and data to be deleted through Customer Service in the app, and we will process it within a reasonable time, except where we must keep records by law."],["Security","We use industry-standard protections such as encrypted connections and hashed passwords. No system is 100% secure, so please keep your password private."],["Your choices","You can edit your profile, block or report users, and control permissions and notifications. You may request access to or correction of your data."],["Changes and contact","We may update this policy and will show the new date below. For questions, contact Customer Service from the Messages tab.\n\nLast updated: October 2026"]]],
terms:["Terms & Conditions",[["Acceptance","By creating an account or using Akira Voice Chat App you agree to these Terms and to our Privacy Policy."],["Eligibility","You must be at least 13 years old. If you are under 18, you confirm that a parent or guardian allows you to use the app. One person may keep one account."],["Your account","You are responsible for your account and password. Do not share it or sell it. Give accurate information; your date of birth cannot be changed later."],["Community rules","No harassment, hate speech, threats, sexual or violent content, illegal activity, scams, spam, impersonation or sharing of private information. No content involving minors in any sexual way. Respect room rules set by room owners."],["Voice rooms and reports","Room owners and admins can mute, remove or ban users from their rooms. You can report or block any user. We may review reports, remove content and suspend or permanently ban accounts that break these rules."],["Virtual items","Coins, diamonds, gifts, frames and entry effects are virtual items with no cash value. They cannot be refunded or transferred, except through the official exchange and the official coin sellers listed in the app. Never pay anyone outside the app."],["Gifts and Room Reward","Gifts sent in a room use your coins. The room owner earns a Room Reward of 10% of the coin value of gifts sent in that room. The reward can be claimed once every 7 days from Room settings. We may change the percentage or period, and rewards gained through abuse or fraud can be removed."],["Lucky gifts and games","Lucky gifts and some games are chance-based and use virtual coins only. Results are random and a return is not guaranteed. They are closed to users under 18."],["Recharge","Recharge requests are reviewed and approved before coins are added. Prices and packages may change."],["Suspension","We may suspend or end accounts that break these Terms, put others at risk, or abuse rewards, and may remove related coins and items."],["Disclaimer","The app is provided as is and may sometimes be unavailable. To the extent allowed by law, we are not liable for indirect losses."],["Changes and contact","We may update these Terms; continuing to use the app means you accept the new version. Contact Customer Service from the Messages tab.\n\nLast updated: October 2026"]]]};
function policySheet(k,back){
  var d=POLD[k];openSheet('<h3><button class="back2" id="pbk">‹</button>'+(k==="privacy"?"🔒 ":"📄 ")+d[0]+'</h3><div class="pol">'+d[1].map(function(x,i){return'<h4>'+(i+1)+'. '+x[0]+'</h4><p>'+esc(x[1]).replace(/\n/g,"<br>")+'</p>'}).join("")+'</div>');
  $("pbk").onclick=function(){if(back==="settings")settingsSheet();else closeSheet()};
}
function bindPol(root){root.querySelectorAll("[data-pol]").forEach(function(a){a.onclick=function(e){e.preventDefault();e.stopPropagation();policySheet(a.dataset.pol,a.dataset.back||"")}})}
function settingsSheet(){
  var k=sess(),a=k&&accts().filter(function(x){return x.key===k})[0],dob="";
  if(A.dob){var p=A.dob.split("-");dob=bn(+p[2])+" "+MONTHS[+p[1]-1]+" "+bn(p[0])}
  openSheet('<h3>⚙️ Settings</h3>'+(a?'<div class="row"><span>📧 Log in</span><b>'+esc(mask(a.key))+'</b></div><div class="row"><span>🆔 ID</span><b>'+A.id+'</b></div><div class="row"><span>🌍 Country</span><b>'+esc(A.country||"-")+'</b></div><div class="row"><span>🎂 Birth 🔒</span><b>'+(dob||"-")+'</b></div>'+(A.minor?'<div class="lbl">Betting-style games are closed because you are under 18.</div>':"")+'<button class="big" id="lo" style="background:linear-gradient(135deg,#f43f5e,#be123c)">🚪 Log out</button>':'<div class="lbl">You are a guest. Create an account to keep your data under your name.</div><button class="big" id="su">Create account / Log in</button>'));
  var _bt=$("sh").querySelector(".big");if(_bt)_bt.insertAdjacentHTML("beforebegin",'<div class="row" data-pol="privacy" data-back="settings" style="cursor:pointer"><span>🔒 Privacy Policy</span><b>›</b></div><div class="row" data-pol="terms" data-back="settings" style="cursor:pointer"><span>📄 Terms &amp; Conditions</span><b>›</b></div><div style="height:12px"></div>');bindPol($("sh"));
  if($("lo"))$("lo").onclick=logout;
  if($("su"))$("su").onclick=function(){closeSheet();showAuth("signup")};
}
function logout(){
  syncAcct();var oldToken=akiraToken();if(oldToken)akiraRequest("/api/v1/auth/logout","POST",undefined,oldToken).catch(function(){});try{localStorage.removeItem(AKIRA_TOKEN_KEY);localStorage.removeItem(SESS_K);localStorage.removeItem("vr_state_v2");localStorage.removeItem("vr_guest")}catch(e){}
  A={name:"Me",id:String(20000000+Math.floor(Math.random()*79999999)),pic:null,myRoom:null,claim:{d:"",streak:0}};
  try{localStorage.setItem("vr_app_v1",JSON.stringify(A))}catch(e){}
  window.__akiraAuthVerified=false;
  document.documentElement.classList.remove("akira-auth-verified");
  fixA();closeSheet();leaveRoom();refresh();renderRooms();go("home");showAuth("welcome");
}
/* ===== Start: server-verified sessions only, never guest/demo ===== */
window.__akiraAuthVerified=false;
async function akiraRestoreSession(){
  var token=akiraToken();
  if(!token){showAuth("welcome");return}
  try{
    var me=await akiraRequest("/api/v1/auth/me","GET",undefined,token);
    if(!me||!me.user||!/^\d{6,18}$/.test(String(me.user.id||"")))throw Error("Invalid server session");
    // Profile identity comes from the authenticated server, not device-local demo state.
    A.id=String(me.user.id);
    A.name=String(me.user.displayName||A.name||"Akira User");
    if(me.user.avatarUrl)A.pic=me.user.avatarUrl;
    saveA();
    window.__akiraAuthVerified=true;
    document.documentElement.classList.add("akira-auth-verified");
    $("au").classList.remove("on");
    refresh();renderRooms();await loadAkiraRooms();go("home");
    if(window.akiraEquipment)window.akiraEquipment.refresh().catch(function(){});
  }catch(e){
    // A network outage never means a logged-out visitor may view the home screen.
    window.__akiraAuthVerified=false;
    document.documentElement.classList.remove("akira-auth-verified");
    showAuth("login");
    toast("Sign in to continue: "+(e.message||"Server unavailable"));
  }
}
document.querySelectorAll("img[data-logo]").forEach(function(i){i.src=BRAND.logo});
void akiraRestoreSession();
setTimeout(function(){$("sp").classList.add("off")},1300);
