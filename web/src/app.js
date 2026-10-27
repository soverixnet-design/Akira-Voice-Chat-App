
var BRAND={logo:'assets/art-e14c4f1e0134.webp',top:'assets/art-04ae332c25f1.webp',bot:'assets/art-bdad05a08089.webp'};

var $=function(i){return document.getElementById(i)};
var bn=function(n){return String(n).replace(/\d/g,function(d){return"0123456789"[d]})};
var esc=function(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var fmt=function(n){return n>=1e6?bn((n/1e6).toFixed(1))+"M":n>=1e3?bn((n/1e3).toFixed(1))+"K":bn(n)};
/* ===== Config: this data will come from the server/admin later ===== */
var CFG={
 banners:[{t:"Daily check-in reward",s:"Join daily, win coins",e:"🎁",c:"#f59e0b,#ff3dc8",a:"daily"},{t:"Double coins on first recharge",s:"Limited time offer",e:"💎",c:"#9b4dff,#0ea5e9",a:"recharge"},{t:"Room ranking event",s:"Be the best room and win prizes",e:"🏆",c:"#10b981,#3b82f6",a:"rank"}],
 rooms:[],
  people:[["Rafi","🧑‍🎤"],["Nusrat","👩‍🦰"],["Sakib","🧔"],["Mim","👧"],["Tanvir","🧑‍💻"],["Faria","👩‍🎓"],["Arif","🧑‍🚀"],["Sumi","👩‍🍳"],["Hasan","🧑‍🔧"],["Lima","👩‍⚕️"]],
 wealth:[9800000,7400000,6100000,4900000,3800000,2900000,2300000,1800000,1400000,1100000],
 chats:[]
};
/* ===== Profile and state (will come from the server after login) ===== */
function ls(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
var A=Object.assign({name:"Me",id:String(20000000+Math.floor(Math.random()*79999999)),pic:null,myRoom:null,claim:{d:"",streak:0}},ls("vr_app_v1",{}));
function saveA(){try{localStorage.setItem("vr_app_v1",JSON.stringify(A))}catch(e){}syncAcct()}
fixA();saveA();
function RS(){return Object.assign({coins:12450,xp:7200,dia:2500},ls("vr_state_v2",{}))}
var akiraServerCoins=null;
function coins(){return akiraServerCoins!==null?akiraServerCoins:(akiraToken()?0:RS().coins)}
async function akiraSyncWallet(e){
  try{
    if(e&&e.detail&&typeof e.detail.balance==="number"&&Number.isFinite(e.detail.balance)){
      if(akiraToken())akiraServerCoins=Math.max(0,Math.floor(e.detail.balance));
      var st=ls("vr_state_v2",{});st.coins=Math.max(0,Math.floor(e.detail.balance));
      try{localStorage.setItem("vr_state_v2",JSON.stringify(st))}catch(_){}
      refresh();
    }
    var token=akiraToken();
    if(!token){akiraServerCoins=null;refresh();return}
    var data=await akiraRequest("/api/v1/wallet","GET",undefined,token);
    var balance=Number(data.wallet&&data.wallet.balance);
    if(!Number.isSafeInteger(balance)||balance<0)throw new Error("Invalid wallet balance");
    akiraServerCoins=balance;
    var s=ls("vr_state_v2",{});s.coins=balance;try{localStorage.setItem("vr_state_v2",JSON.stringify(s))}catch(_){}
    refresh();
  }catch(err){
    console.warn("Wallet sync failed:",err.message);
    refresh();
  }
}
window.addEventListener("akira:wallet-updated",akiraSyncWallet);
window.addEventListener("focus",function(){akiraSyncWallet()});
setTimeout(function(){akiraSyncWallet()},500);
setInterval(function(){if(akiraToken())akiraSyncWallet()},10000);
function level(){return 1+Math.floor(RS().xp/1000)}
function addCoins(n){if(akiraToken())return akiraSyncWallet();var s=ls("vr_state_v2",{});s.coins=(s.coins==null?12450:s.coins)+n;try{localStorage.setItem("vr_state_v2",JSON.stringify(s))}catch(e){}refresh()}
function refresh(){syncAcct();if($("rcp").classList.contains("on"))renderRcp();$("hc").textContent="🪙 "+(window.akiraCompactCoins?window.akiraCompactCoins(coins()):bn(coins()));if($("v-me").classList.contains("on"))renderMe();try{AkiraBridge.toRoom({t:"wallet-sync",coins:coins()})}catch(e){}}
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
function myR(){
  var base=Object.assign({id:String(A.id),ownerId:String(A.id),n:1,host:A.name,hostPic:A.pic||null,pic:null,tag:"My room",mics:[A.pic?"📷":"😎"],emoji:"🎙️",c:"#9b4dff,#4c1d95",th:"mid"},A.myRoom||{});
  base.host=A.name;
  base.ownerId=String(A.id);
  return base;
}
function roomList(){
  var q=($("q").value||"").trim().toLowerCase();
  var myId=A.myRoom?String(A.myRoom.id):"";
  var L=CFG.rooms.filter(function(r){
    return (!myId||String(r.id)!==myId)&&String(r.ownerId||"")!==String(A.id);
  });
  if(A.myRoom)L.unshift(myR());
  if(tab===0)L.sort(function(a,b){
    var aMine=A.myRoom&&String(a.id)===String(A.myRoom.id)?1:0;
    var bMine=A.myRoom&&String(b.id)===String(A.myRoom.id)?1:0;
    if(aMine!==bMine)return bMine-aMine;
    return (b.n||0)-(a.n||0);
  });
  if(tab===1)L.reverse();
  if(tab===2)L=A.myRoom?[myR()]:[];
  if(q)L=L.filter(function(r){return (r.name||"").toLowerCase().indexOf(q)>-1||String(r.id||"").indexOf(q)>-1});
  return L;
}
function cardHTML(r,i){
  var pic=r.pic||r.coverUrl||null;
  var em=r.emoji||"🎙️";
  var pat=new Array(14).join(em+" ");
  var isMine=(A.myRoom&&String(r.id)===String(A.myRoom.id))||String(r.ownerId||"")===String(A.id);
  var bgStyle=pic
    ? "background:linear-gradient(180deg,rgba(8,5,24,.18),rgba(8,5,24,.84)),url("+pic+") center/cover"
    : "background:linear-gradient(150deg,"+(r.c||"#9b4dff,#4c1d95")+")";
  var emoHTML=pic
    ? '<div class="emo" style="background:url('+pic+') center/cover;border:2px solid rgba(255,255,255,.72);border-radius:14px;color:transparent;box-shadow:0 4px 12px rgba(0,0,0,.45)">🎙️</div>'
    : '<div class="emo">'+em+'</div>';
  return'<div class="card" data-id="'+r.id+'" style="animation-delay:'+i*.06+'s"><div class="sway" style="animation-delay:-'+(i*.7)%5+'s"><div class="tilt"><i class="edge"></i><div class="bg" style="'+bgStyle+'">'+(pic?"":'<span class="pat">'+pat+'</span>')+'<i class="shine"></i></div>'+emoHTML+'<div class="live"><u></u><u></u><u></u>'+(isMine?"MY ROOM":"LIVE")+'</div><div class="info"><b>'+esc(r.name)+'</b><small>🆔 '+r.id+' · 👤 '+esc(isMine?A.name:(r.host||"Host"))+' · 🔥 '+bn(r.n||1)+'</small><div class="mics">'+(r.mics||["🎙️"]).map(function(m){return"<i>"+m+"</i>"}).join("")+'<em>'+esc(isMine?"My room":(r.tag||"Live"))+'</em></div></div></div></div></div>';
}
function renderRooms(){
  var L=roomList(),g=$("grid");
  var tabBtns=$("tabs")?$("tabs").querySelectorAll("button"):[];
  if(tabBtns[2])tabBtns[2].textContent=A.myRoom?"🏠 My room (1)":"🏠 Create room";
  if(tab===2&&A.myRoom){
    g.innerHTML=L.map(cardHTML).join("")+'<div style="grid-column:1/-1;display:flex;gap:8px;margin-top:6px"><button class="big" id="enterMyR" style="margin:0;flex:1">🎙️ Enter My Room</button><button class="big" id="editMyR" style="margin:0;flex:1;background:linear-gradient(135deg,#0ea5e9,#6366f1)">📷 Edit Room Photo & Name</button></div>';
    if($("enterMyR"))$("enterMyR").onclick=function(){openRoom(myR())};
    if($("editMyR"))$("editMyR").onclick=function(){createSheet(true)};
    return;
  }
  g.innerHTML=L.length?L.map(cardHTML).join(""):'<div class="empty">'+(tab===2?"You do not have a room yet.<br>Create your own room!<button class=\"big\" id=\"mk\">🎙️ Create room</button>":"No rooms found")+'</div>';
  if($("mk"))$("mk").onclick=function(){createSheet(false)};
}
$("q").oninput=renderRooms;
$("tabs").querySelectorAll("button").forEach(function(b,i){b.onclick=function(){tab=i;$("tabs").querySelectorAll("button").forEach(function(x,k){x.classList.toggle("on",k===i)});renderRooms()}});
var G=$("grid");
function tl(e){var c=e.target.closest&&e.target.closest(".card");if(!c)return;var t=c.querySelector(".tilt"),b=c.getBoundingClientRect(),x=(e.clientX-b.left)/b.width,y=(e.clientY-b.top)/b.height;t.style.setProperty("--ry",((x-.5)*24)+"deg");t.style.setProperty("--rx",(-(y-.5)*24)+"deg");t.style.setProperty("--mx",x*100+"%");t.style.setProperty("--my",y*100+"%")}
function tr(e){var c=e.target.closest&&e.target.closest(".card");if(!c)return;var t=c.querySelector(".tilt");t.style.setProperty("--ry","0deg");t.style.setProperty("--rx","0deg")}
G.addEventListener("pointermove",tl);G.addEventListener("pointerdown",tl);G.addEventListener("pointerup",tr);G.addEventListener("pointercancel",tr);G.addEventListener("pointerleave",tr,true);
G.addEventListener("click",function(e){var c=e.target.closest(".card");if(!c)return;var r=roomList().filter(function(x){return String(x.id)===String(c.dataset.id)})[0];if(r)openRoom(r)});
/* ===== Entering the room ===== */
var cur=null;
async function openRoom(r){
  if(window.__akiraAuthVerified!==true){showAuth('login');return;}
  if(cur && String(cur.id)===String(r.id)){resumeRoom();return}
  var token=akiraToken();
  if(token){
    try{await akiraRequest("/api/v1/rooms/"+encodeURIComponent(r.id)+"/join","POST",undefined,token)}catch(e){toast(e.message||"Cannot join room");return}
  }else{
    showAuth("login");toast("Log in to enter a live room");return;
  }
  if(cur)leaveRoom();
  var isOwner=Boolean((r.ownerId&&String(r.ownerId)===String(A.id))||(A.myRoom&&String(r.id)===String(A.myRoom.id)));
  var roomPic=r.pic||r.coverUrl||(isOwner&&A.myRoom?A.myRoom.pic:null)||null;
  AkiraBridge.setContext({
    name:r.name,
    emoji:r.emoji||"🎙️",
    pic:roomPic,
    bg:r.bg||(isOwner&&A.myRoom?A.myRoom.bg:null)||null,
    theme:r.th||"mid",
    id:String(r.id),
    ownerId:isOwner?String(A.id):(r.ownerId?String(r.ownerId):null),
    isOwner:isOwner,
    hostName:isOwner?A.name:(r.host||"Room owner"),
    hostPic:isOwner?(A.pic||null):(r.hostPic||roomPic||null),
    userId:String(A.id),
    profile:{id:String(A.id),name:A.name,pic:A.pic||null,bio:A.bio||""},
    minor:!!A.minor,
    voiceAuth:token,
    voiceApi:AKIRA_API_BASE
  });
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
  $("rw").classList.remove("on");$("minib").textContent=cur.emoji||"🎙️";
  $("mini").classList.add("on");refresh();
}
function leaveRoom(){if(cur&&akiraToken())akiraRequest("/api/v1/rooms/"+encodeURIComponent(cur.id)+"/leave","POST",undefined,akiraToken()).catch(function(e){console.warn("Room leave failed",e)});var rf=$("rf");rf.removeAttribute("srcdoc");rf.src="about:blank";$("rw").classList.remove("on");$("mini").classList.remove("on");cur=null;AkiraBridge.setContext(null);window.dispatchEvent(new Event("akira:room-change"));refresh()}
AkiraBridge.onApp(function(d){
  if(d.t==="exit")leaveRoom();
  if(d.t==="gift"){fixA();A.st.sent=(A.st.sent||0)+d.n;A.sw[d.g]=(A.sw[d.g]||0)+d.n;saveA()}
  if(d.t==="room-updated"){
    if(A.myRoom&&(!d.id||String(A.myRoom.id)===String(d.id))){
      if(d.name)A.myRoom.name=d.name;
      if(d.pic!==undefined)A.myRoom.pic=d.pic;
      if(d.bg!==undefined)A.myRoom.bg=d.bg;
      if(d.theme)A.myRoom.th=d.theme;
      saveA();
    }
    CFG.rooms.forEach(function(rm){
      if(String(rm.id)===String(d.id)){
        if(d.name)rm.name=d.name;
        if(d.pic!==undefined){rm.pic=d.pic;rm.coverUrl=d.pic;}
        if(d.theme)rm.th=d.theme;
      }
    });
    if(cur&&(!d.id||String(cur.id)===String(d.id))){
      if(d.name)cur.name=d.name;
      if(d.pic!==undefined)cur.pic=d.pic;
      if(d.bg!==undefined)cur.bg=d.bg;
      if(d.theme)cur.th=d.theme;
    }
    renderRooms();
  }
  if(d.t==="profile"){
    if(d.u&&(String(d.u.id)===String(A.id)||d.u.mine)){
      var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true);$("pfo").classList.add("on");
    }else if(d.u){
      openProfile(d.u);
    }
  }
  if(d.t==="chat"&&d.u){
    openThread({id:String(d.u.id||""),name:d.u.n||d.u.name||"User",pic:d.u.pic||null,e:d.u.e||"👤"});
  }
  if(d.t==="follow"&&d.u&&d.u.id){
    A.fol=A.fol||{};A.folUsers=A.folUsers||{};
    A.fol[d.u.id]=!!d.following;
    if(d.following)A.folUsers[d.u.id]={id:String(d.u.id),name:d.u.n||d.u.name||"User",pic:d.u.pic||null,e:d.u.e||"👤"};
    saveA();
  }
  if(d.t==="min")minimizeRoom()});
$("minib").onclick=resumeRoom;
$("minix").onclick=leaveRoom;
function createSheet(editMode){
  if(A.myRoom&&!editMode){
    tab=2;
    $("tabs").querySelectorAll("button").forEach(function(x,i){x.classList.toggle("on",i===2)});
    renderRooms();
    openRoom(myR());
    return;
  }
  var E=["🎙️","🎤","🎶","🌙","⚽","📖","🎮","🌍","💬","🔥","💎","🌸"];
  var ch=(A.myRoom&&A.myRoom.emoji)||"🎙️";
  var rpic=(A.myRoom&&A.myRoom.pic)||null;
  var curName=(A.myRoom&&A.myRoom.name)||"";
  openSheet('<h3>'+(A.myRoom?"⚙️ Edit My Room":"🎙️ Create your own room")+'</h3>'+
    '<div style="display:flex;align-items:center;gap:12px;margin:10px 0">'+
      '<button type="button" id="cpicBtn" style="width:68px;height:68px;border-radius:16px;border:2px dashed #f59e0b;background:'+(rpic?"url("+rpic+") center/cover":"#241445")+';color:#fff;font-size:24px;cursor:pointer;flex:none">'+(rpic?"":"📷")+'</button>'+
      '<div style="flex:1"><div class="lbl" style="margin-top:0">Room name</div><input class="field" id="cn" maxlength="24" value="'+esc(curName)+'" placeholder="e.g. '+esc(A.name)+'\'s Room"></div>'+
    '</div>'+
    '<div class="lbl" style="margin-top:8px">Room icon</div><div class="g4" id="ce">'+E.map(function(e){return'<button class="'+(e===ch?"sel":"")+'"><span>'+e+'</span></button>'}).join("")+'</div>'+
    '<div class="lbl" style="margin-top:10px">One room per account · Owner: '+esc(A.name)+' (ID '+A.id+')</div>'+
    '<button class="big" id="cm">'+(A.myRoom?"Save & Enter Room":"Create room")+'</button>');
  $("cpicBtn").onclick=function(){
    pickImage(400,function(d){
      rpic=d;
      $("cpicBtn").style.background="url("+d+") center/cover";
      $("cpicBtn").textContent="";
    });
  };
  $("ce").querySelectorAll("button").forEach(function(b,i){b.onclick=function(){ch=E[i];$("ce").querySelectorAll("button").forEach(function(x){x.classList.remove("sel")});b.classList.add("sel")}});
  $("cm").onclick=async function(){
    var n=$("cn").value.trim()||(A.name+"'s Room");
    var T=["mid","rose","ocean","forest","gold","sunset"],C=["#9b4dff,#4c1d95","#ff3dc8,#9d174d","#0ea5e9,#075985","#10b981,#065f46","#f59e0b,#92400e","#a855f7,#581c87"],k=Math.floor(Math.random()*6);
    if(A.myRoom){
      A.myRoom.name=n;
      A.myRoom.emoji=ch;
      A.myRoom.pic=rpic;
      A.myRoom.ownerId=String(A.id);
      saveA();
      if(akiraToken()){
        try{await akiraRequest("/api/v1/rooms/"+encodeURIComponent(A.myRoom.id)+"/settings","POST",{name:n,seatCount:10,themeKey:A.myRoom.th||"mid",coverUrl:rpic||""},akiraToken())}catch(_){}
      }
      closeSheet();renderRooms();toast("Room updated ✓");openRoom(myR());
      return;
    }
    var roomId=String(A.id);
    if(akiraToken()){
      try{
        var created=await akiraRequest("/api/v1/rooms","POST",{name:n,coverUrl:rpic||""},akiraToken());
        if(created&&created.room&&created.room.id)roomId=String(created.room.id);
      }catch(e){
        try{
          var existingData=await akiraRequest("/api/v1/rooms","GET",undefined,akiraToken());
          var mine=(existingData.rooms||[]).find(function(rm){return String(rm.ownerId)===String(A.id)});
          if(mine){roomId=String(mine.id);n=n||mine.name;}
          else{toast(e.message||"Room creation failed");return;}
        }catch(_){toast(e.message||"Room creation failed");return;}
      }
    }
    A.myRoom={id:roomId,ownerId:String(A.id),name:n,emoji:ch,pic:rpic,th:T[k],c:C[k]};
    saveA();closeSheet();
    tab=2;$("tabs").querySelectorAll("button").forEach(function(x,i){x.classList.toggle("on",i===2)});
    renderRooms();toast("Room ready ✓");openRoom(myR());
  };
}
$("plus").onclick=function(){if(A.myRoom){tab=2;$("tabs").querySelectorAll("button").forEach(function(x,i){x.classList.toggle("on",i===2)});renderRooms();openRoom(myR());}else createSheet(false)};
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
var RCT=0,RATE=0.5,akiraServerDiamonds=null,N=function(n){return Number(n||0).toLocaleString("en-US")};
function curDia(){return akiraServerDiamonds!==null?akiraServerDiamonds:(RS().dia||0)}
function addDia(n){var s=ls("vr_state_v2",{});s.dia=(s.dia==null?2500:s.dia)+n;try{localStorage.setItem("vr_state_v2",JSON.stringify(s))}catch(e){}refresh()}
function syncCommunityBalance(){
  var tok=akiraToken();if(!tok)return;
  akiraRequest("/api/v1/community/balance","GET",undefined,tok).then(function(b){
    if(b){
      if(b.coins!==undefined)akiraServerCoins=Number(b.coins);
      if(b.diamonds!==undefined)akiraServerDiamonds=Number(b.diamonds);
      if($("rcp").classList.contains("on"))renderRcp(true);
      if($("v-me")&&$("v-me").classList.contains("on"))renderMe(true);
      $("hc").textContent="🪙 "+(window.akiraCompactCoins?window.akiraCompactCoins(coins()):bn(coins()));
    }
  }).catch(function(){});
  akiraRequest("/api/v1/community/exchange-rate","GET",undefined,tok).then(function(r){
    if(r&&r.coins_per_100){RATE=Number(r.coins_per_100)/100;if($("rcp").classList.contains("on"))renderRcp(true);}
  }).catch(function(){});
}
function rechargeSheet(tab){RCT=tab===1?1:0;syncCommunityBalance();renderRcp();$("rcp").classList.add("on")}
function renderRcp(skipFetch){
  if(!skipFetch)syncCommunityBalance();
  var P=[[1000,"$0.99"],[5500,"$4.99"],[12000,"$9.99"],[65000,"$49.99"]],X=[100,500,1000,5000],h;
  h='<div class="rcw"><button id="rcl">🌐 English ⌄</button></div><div class="rch"><button class="bk" id="rcb">‹ Back</button><div class="rct"><button data-x="0" class="'+(RCT?"":"on")+'">Recharge</button><button data-x="1" class="'+(RCT?"on":"")+'">Exchange</button></div></div><div class="rcb">';
  h+='<div class="gc"><small>My gold coins</small><b>🪙 '+N(coins())+'</b><i>ID '+A.id+'</i></div><div class="dm"><span>💎 Your diamonds</span><span>'+N(curDia())+'</span></div>';
  if(!RCT){
    h+='<div class="rh"><h3>Recharge packages</h3><span>🇧🇩 Bangladesh</span></div><div class="pk"><p>Choose a package and send a recharge request for approval.</p>'+P.map(function(p,i){return'<button data-p="'+i+'"><span>🪙 '+N(p[0])+' Coins</span><em>'+p[1]+' ›</em></button>'}).join("")+'</div>'+
    '<button class="cta bl" id="rcs">Contact recharge support</button><button class="cta or" id="rcl2">Coin seller list</button>'+
    '<div class="lbl">See Rank → Recharge for verified leaderboard results.</div>';
  }else{
    h+='<div class="rh"><h3>Diamond exchange</h3></div><div class="rate">Rate: 100 💎 = '+bn(Math.round(RATE*100))+' 🪙</div><div class="pk"><p>Buy gold coins with diamonds earned from gifts.</p>'+X.map(function(d,i){return'<button data-e="'+i+'"><span>💎 '+N(d)+'</span><em>🪙 '+N(Math.round(d*RATE))+' ›</em></button>'}).join("")+'</div>';
  }
  $("rcp").innerHTML=h+'</div>';
  $("rcb").onclick=function(){$("rcp").classList.remove("on")};
  $("rcl").onclick=function(){toast("More languages are coming soon")};
  $("rcp").querySelectorAll("[data-x]").forEach(function(b){b.onclick=function(){RCT=+b.dataset.x;renderRcp(true)}});
  $("rcp").querySelectorAll("[data-p]").forEach(function(b){b.onclick=function(){var p=P[+b.dataset.p];openSheet('<h3>Recharge request</h3><div style="font-size:15px;line-height:1.7">🪙 '+N(p[0])+' Coins — '+p[1]+'<br>Contact a verified seller or send a request for approval.</div><button class="big" id="pc" style="margin-top:14px">Contact Verified Seller</button>');$("pc").onclick=function(){closeSheet();sellerSheet()}}});
  $("rcp").querySelectorAll("[data-e]").forEach(function(b){b.onclick=function(){var d=X[+b.dataset.e],gain=Math.round(d*RATE);if(curDia()<d){toast("Not enough diamonds");return}openSheet('<h3>Exchange</h3><div style="font-size:15px;line-height:1.7">💎 '+N(d)+' to get 🪙 '+N(gain)+' coins?</div><button class="big" id="ec" style="margin-top:14px">Confirm</button>');$("ec").onclick=async function(){
    if(akiraToken()){
      try{
        await akiraRequest("/api/v1/community/exchange","POST",{diamonds:d,requestId:"ex-"+Date.now()+"-"+Math.random().toString(36).slice(2,10)},akiraToken());
        syncCommunityBalance();
        akiraSyncWallet();
        closeSheet();toast("+"+N(gain)+" coins added ✓");
        return;
      }catch(e){toast(e.message||"Exchange failed");return;}
    }
    addDia(-d);addCoins(gain);closeSheet();toast("+"+N(gain)+" coins added ✓");
  }}});
  if($("rcs"))$("rcs").onclick=sellerSheet;
  if($("rcl2"))$("rcl2").onclick=sellerSheet;
}
var SELL=[]; // Sellers must be verified by the server.
function sellerSheet(){
  var renderList=function(list){
    openSheet('<h3>🪙 Verified Coin Sellers</h3><div class="rate">Tap a seller to chat or copy their ID</div>'+list.map(function(x,i){return'<div class="slr" data-s="'+i+'"><div class="sa">'+(x[3]?'<img src="'+esc(x[3])+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">':x[1])+'</div><div class="sn"><b>'+esc(x[0])+'</b><small>🟢 '+esc(x[4]||'Verified Seller')+' · ID '+esc(x[2])+'</small></div><button class="scp" data-c="'+i+'">Copy</button><span class="sg">💬</span></div>'}).join(""));
    $("sh").querySelectorAll("[data-c]").forEach(function(b){b.onclick=function(e){e.stopPropagation();try{navigator.clipboard.writeText(list[+b.dataset.c][2])}catch(x){}toast("ID Copied ✓")}});
    $("sh").querySelectorAll("[data-s]").forEach(function(r){r.onclick=function(){var x=list[+r.dataset.s];closeSheet();openThread({id:x[2],name:x[0],e:x[1],pic:x[3]})}});
  };
  renderList(SELL);
  if(akiraToken()){
    akiraRequest("/api/v1/community/sellers","GET",undefined,akiraToken()).then(function(res){
      var items=(res&&(res.items||res.sellers))||[];
      if(items.length){
        var live=items.map(function(s){return[s.name||("Seller "+s.id),"💎",String(s.id),s.pic||null,s.contact||"Official Seller"];});
        renderList(live);
      }
    }).catch(function(){});
  }
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
$("qd").onclick=dailySheet;$("qr").onclick=rechargeSheet;$("qi").onclick=inviteSheet;$("qg").onclick=function(){if(window.AkiraGameOverlay)window.AkiraGameOverlay.open("food-wheel")};
/* ===== Ranking ===== */
var rtab=1,rper=1,liveRankCache={};
function rf(n){var x=n>=1e6?(n/1e6).toFixed(2).replace(/\.?0+$/,"")+"m":n>=1e3?(n/1e3).toFixed(2).replace(/\.?0+$/,"")+"k":String(n);return x}
function wingSVG(){var b='';for(var k=0;k<6;k++){var a=-8+k*14,l=150-k*8;b+='<path d="M200 100 L'+(200-l*1.1)+' '+(100-60+k*16)+' L'+(200-l*1.05)+' '+(100-40+k*17)+' Z" transform="rotate('+(a-8)+' 200 100)" fill="url(#gw)" stroke="#b45309" stroke-width="1"/>'}
return'<svg class="wings" viewBox="0 0 400 190"><defs><linearGradient id="gw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".5" stop-color="#f6b92b"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs><g>'+b+'</g><g transform="translate(400 0) scale(-1 1)">'+b+'</g></svg>'}
function requestVerifiedRanking(cKey,type,period){
  if(!akiraToken()||liveRankCache[cKey+"_loading"]||liveRankCache[cKey+"_loaded"])return;
  liveRankCache[cKey+"_loading"]=true;
  akiraRequest("/api/v1/community/rankings?period="+period+"&type="+type,"GET",undefined,akiraToken()).then(function(res){
    liveRankCache[cKey+"_loading"]=false;liveRankCache[cKey+"_loaded"]=true;
    liveRankCache[cKey]=Array.isArray(res?.items)?res.items.map(function(it){
      var isMe=String(it.id)===String(A.id);
      return{id:String(it.id),n:isMe?A.name:(it.name||"User"),e:"🏆",pic:isMe?(A.pic||it.pic||null):(it.pic||null),v:Number(it.score||0),real:true};
    }):[];
    if($("v-rank").classList.contains("on"))renderRank();
  }).catch(function(err){
    liveRankCache[cKey+"_loading"]=false;liveRankCache[cKey+"_loaded"]=true;
    liveRankCache[cKey+"_error"]=String(err?.message||"Service unavailable");
    if($("v-rank").classList.contains("on"))renderRank();
  });
}
function renderRank(){
  var L=[];
  var types=["lucky","rich","charm","room","noble","play","recharge"];
  var periods=["day","week","month"];
  var cKey=types[rtab]+":"+periods[rper];
  if(rtab===3){
    L=roomList().slice().sort(function(a,b){return (b.n||0)-(a.n||0)}).map(function(r){
      return{id:String(r.id),n:r.name,e:r.emoji||"🎙️",pic:r.pic||r.coverUrl||null,v:Number(r.n||0),room:1,rawRoom:r};
    });
  }else{
    L=Array.isArray(liveRankCache[cKey])?liveRankCache[cKey].slice():[];
    requestVerifiedRanking(cKey,types[rtab],periods[rper]);
  }
  if(L.length<3){
    var msg=liveRankCache[cKey+"_error"]?"Verified rankings are temporarily unavailable":
      liveRankCache[cKey+"_loaded"]?"Fewer than three verified ranking entries":
      rtab===3?"Fewer than three active rooms":"Loading verified rankings…";
    $("rb").innerHTML='<div class="empty">'+esc(msg)+L.map(function(u,i){return'<div class="rr" style="margin-top:9px">'+(i+1)+'. '+esc(u.n)+' · '+rf(u.v)+'</div>'}).join("")+'</div>';
    return;
  }
  var myIdx=L.findIndex(function(u){return String(u.id)===String(A.id)});
  var myScore=myIdx>=0?L[myIdx].v:0;
  var idl=function(u){return'<span class="idl"><i class="idb">ID</i>'+u.id+'</span>'},cv=function(u){return'<div class="cv"><i class="cn"></i>'+rf(u.v)+'</div>'};
  var avIn=function(u){return u.pic?'<div style="background:url('+u.pic+') center/cover;width:100%;height:100%;border-radius:50%"></div>':'<div>'+(u.e||"👤")+'</div>'};
  var pod=function(i,c){var u=L[i];return'<div class="pp '+c+'" data-u="'+i+'" style="cursor:pointer"><div class="gr">'+avIn(u)+'</div><b>'+esc(u.n)+'</b>'+idl(u)+cv(u)+'</div>'};
  var h='<div class="pod2"><div class="beam2"></div>'+wingSVG()+pod(1,"p2")+pod(0,"p1")+pod(2,"p3")+'<div class="dais"></div></div>';
  if(rtab!==3){
    h+='<div class="rr me" id="rankMeRow" style="cursor:pointer"><b class="n">'+(myIdx>=0?(myIdx+1):"99+")+'</b><div class="ra" style="'+(A.pic?"background-image:url("+A.pic+");background-size:cover;background-position:center":"")+'">'+(A.pic?"":"😎")+'</div><div class="rn"><b>'+esc(A.name)+' (You)</b>'+idl(A)+'</div><div class="rv"><i class="cn"></i>'+rf(myScore)+'</div></div>';
  }
  h+=L.slice(3).map(function(u,i){
    var rStyle=u.pic?"background-image:url("+u.pic+");background-size:cover;background-position:center":"";
    return'<div class="rr" data-u="'+(i+3)+'" style="cursor:pointer"><b class="n">'+(i+4)+'</b><div class="ra" style="'+rStyle+'">'+(u.pic?"":(u.e||"👤"))+'</div><div class="rn"><b>'+esc(u.n)+'</b>'+idl(u)+'</div><div class="rv"><i class="cn"></i>'+rf(u.v)+'</div></div>';
  }).join("");
  $("rb").innerHTML=h;rankWire(L);

}
$("rbk").onclick=function(){go("home")};
[["rt",function(i){rtab=i}],["rp",function(i){rper=i}]].forEach(function(p){$(p[0]).querySelectorAll("button").forEach(function(b,i){b.onclick=function(){p[1](i);$(p[0]).querySelectorAll("button").forEach(function(x,k){x.classList.toggle("on",k===i)});renderRank()}})});
function spin(){var r=$("rot");if(!r||!$("v-rank").classList.contains("on")){rotT=null;return}if(!rotHold)r.style.setProperty("--ry",(Math.sin(Date.now()/1500)*17)+"deg");rotT=requestAnimationFrame(spin)}
function rankWire(L){
  if($("rankMeRow"))$("rankMeRow").onclick=function(){
    var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true);$("pfo").classList.add("on");
  };
  $("rb").querySelectorAll("[data-u]").forEach(function(e){
    e.onclick=function(){
      var item=L[+e.dataset.u];
      if(!item)return;
      if(rtab===3||item.room){
        var rm=item.rawRoom||roomList().find(function(x){return String(x.id)===String(item.id)})||{id:item.id,name:item.n,emoji:item.e||"🎙️",pic:item.pic||null,th:"mid",c:"#9b4dff,#4c1d95"};
        openRoom(rm);
        return;
      }
      if(String(item.id)===String(A.id)){
        var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true);$("pfo").classList.add("on");
      }else{
        openProfile(item);
      }
    };
  });
}
/* ===== Messages & Follow System ===== */
var tcur=null,msgPollTimer=null,liveThreadsCache=[];
function syncFollowCounts(){
  var tok=akiraToken();if(!tok)return;
  akiraRequest("/api/v1/community/follows","GET",undefined,tok).then(function(res){
    if(!res)return;
    A.fol=A.fol||{};A.folUsers=A.folUsers||{};
    if(Array.isArray(res.following)){
      res.following.forEach(function(u){
        A.fol[u.id]=true;
        A.folUsers[u.id]={id:String(u.id),name:u.name||"User",pic:u.pic||null,e:"👤",bio:u.bio||""};
      });
    }
    A.flCount=Number(res.followersCount||0);
    A.fgCount=Number(res.followingCount||0);
    A.followersList=res.followers||[];
    A.followingList=res.following||[];
    try{localStorage.setItem("vr_app_v1",JSON.stringify(A))}catch(_){}
    if($("v-me")&&$("v-me").classList.contains("on")){
      var mst=$("v-me").querySelectorAll(".mst b");
      if(mst[0])mst[0].textContent=fmt(A.flCount||0);
      if(mst[1])mst[1].textContent=fmt(Math.max(A.fgCount||0,Object.keys(A.fol).filter(function(k){return A.fol[k]}).length));
    }
  }).catch(function(){});
}
function fmtChatTime(iso){
  if(!iso)return"Now";
  var d=new Date(iso);if(isNaN(d.getTime()))return String(iso);
  var diff=Math.max(0,Math.floor((Date.now()-d.getTime())/1000));
  if(diff<60)return"Now";
  if(diff<3600)return Math.floor(diff/60)+"m";
  if(diff<86400)return Math.floor(diff/3600)+"h";
  return Math.floor(diff/86400)+"d";
}
function getMergedThreads(){
  fixA();
  var map={},list=[];
  (liveThreadsCache||[]).forEach(function(t){
    var pid=String(t.peerId||t.id||"");if(!pid)return;
    map[pid]={id:pid,name:t.name||("ID "+pid),pic:t.pic||null,e:"👤",lastBody:t.lastBody||"Tap to chat",time:fmtChatTime(t.createdAt),real:true};
    list.push(map[pid]);
  });
  Object.keys(A.chatThreads||{}).forEach(function(pid){
    var ct=A.chatThreads[pid];
    if(!ct)return;
    if(!map[pid]){
      map[pid]={id:String(pid),name:ct.name||("ID "+pid),pic:ct.pic||null,e:ct.e||"👤",lastBody:ct.lastBody||"Tap to chat",time:ct.time||"Now",real:true};
      list.push(map[pid]);
    }
  });
  Object.keys(A.fol||{}).forEach(function(pid){
    if(!A.fol[pid]||map[pid])return;
    var fu=(A.folUsers&&A.folUsers[pid])||{id:pid,name:"User "+pid,e:"👤"};
    map[pid]={id:String(pid),name:fu.name||("ID "+pid),pic:fu.pic||null,e:fu.e||"👤",lastBody:"Following · Tap to message 💬",time:"Friend",real:true};
    list.push(map[pid]);
  });
  CFG.chats.forEach(function(c,idx){
    var sid=c[4]||("sys_"+idx);
    if(!map[sid]){
      list.push({id:sid,name:c[0],pic:null,e:c[1],lastBody:c[2],time:c[3],real:false,raw:c});
    }
  });
  return list;
}
function renderMsg(skipFetch){
  fixA();
  var list=getMergedThreads();
  var folIds=Object.keys(A.fol||{}).filter(function(k){return A.fol[k]});
  var friendsStrip="";
  if(folIds.length){
    friendsStrip='<div class="lbl" style="margin:2px 0 6px">❤️ Following ('+folIds.length+') — Tap to message</div><div style="display:flex;gap:10px;overflow-x:auto;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid var(--line)">'+folIds.map(function(fid){
      var u=(A.folUsers&&A.folUsers[fid])||{id:fid,name:"ID "+fid,e:"👤",pic:null};
      var av=u.pic?'<img src="'+esc(u.pic)+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">':(u.e||"👤");
      return'<div data-fchat="'+esc(fid)+'" style="flex:none;width:64px;text-align:center;cursor:pointer"><div style="width:46px;height:46px;border-radius:50%;margin:0 auto 4px;background:linear-gradient(145deg,#9b4dff,#ff3dc8);display:grid;place-items:center;font-size:22px;border:2px solid #fde047;overflow:hidden">'+av+'</div><small style="display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(u.name)+'</small></div>';
    }).join("")+'</div>';
  }
  var searchBar='<div style="display:flex;gap:8px;margin-bottom:10px"><input class="field" id="msgUidInp" placeholder="🔍 Enter User ID to Follow or Message…" style="flex:1;padding:9px 12px;font-size:13.5px"><button class="scp" id="msgUidBtn" style="background:linear-gradient(135deg,#9b4dff,#ff3dc8);color:#fff;border:0;font-weight:700;padding:0 14px">Find</button></div>';
  $("ml").innerHTML=searchBar+friendsStrip+list.map(function(t,i){
    var av=t.pic?'<img src="'+esc(t.pic)+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">':(t.e||"👤");
    var idBadge=(/^\d+$/.test(String(t.id)))?' <span style="font-size:10.5px;color:#fde047;font-weight:600">ID '+esc(t.id)+'</span>':'';
    return'<div class="chatrow" data-ti="'+i+'"><div class="av" data-prof="'+i+'">'+av+'</div><div style="flex:1;min-width:0"><b>'+esc(t.name)+idBadge+'</b><small>'+esc(t.lastBody)+'</small></div><time>'+esc(t.time)+'</time></div>';
  }).join("");
  if($("msgUidBtn")){
    var doFind=async function(){
      var q=($("msgUidInp").value||"").trim();
      if(!q)return toast("Enter a User ID");
      if(/^\d+$/.test(q)&&akiraToken()){
        try{
          var r=await akiraRequest("/api/v1/community/user-profile?id="+encodeURIComponent(q),"GET",undefined,akiraToken());
          if(r&&r.user){openProfile({id:r.user.id,n:r.user.name,pic:r.user.pic,bio:r.user.bio,e:"👤",real:true});return;}
        }catch(_){}
      }
      openProfile({id:q,n:"User "+q,e:"👤",real:true});
    };
    $("msgUidBtn").onclick=doFind;
    $("msgUidInp").onkeydown=function(e){if(e.key==="Enter")doFind()};
  }
  $("ml").querySelectorAll("[data-fchat]").forEach(function(el){
    el.onclick=function(){
      var fid=el.dataset.fchat;
      var u=(A.folUsers&&A.folUsers[fid])||{id:fid,name:"ID "+fid,e:"👤",pic:null};
      openThread({id:String(fid),name:u.name,pic:u.pic,e:u.e||"👤"});
    };
  });
  $("ml").querySelectorAll(".chatrow").forEach(function(r){
    r.onclick=function(e){
      var item=list[+r.dataset.ti];
      if(!item)return;
      if(e.target.closest("[data-prof]")&&/^\d+$/.test(String(item.id))){
        openProfile({id:item.id,n:item.name,pic:item.pic,e:item.e||"👤",real:true});
        return;
      }
      openThread(item);
    };
  });
  if(!skipFetch&&akiraToken()){
    akiraRequest("/api/v1/community/messages","GET",undefined,akiraToken()).then(function(res){
      if(res&&Array.isArray(res.threads)){
        liveThreadsCache=res.threads;
        var badge=document.querySelector('.ni[data-v="msg"] em');
        if(badge)badge.textContent=String(Math.max(1,res.threads.length));
        if($("v-msg").classList.contains("on"))renderMsg(true);
      }
    }).catch(function(){});
  }
}
function bub(t,me){var d=document.createElement("div");d.className="bub "+(me?"me":"th");d.textContent=t;$("tb").appendChild(d);$("tb").scrollTop=$("tb").scrollHeight}
function openThread(c){
  fixA();
  var peer=Array.isArray(c)?{id:c[4]||c[0],name:c[0],e:c[1]||"👤",pic:null,lastBody:c[2]||""}:{id:String(c.id||c.peerId||c.name||""),name:c.name||c.n||"User",e:c.e||"👤",pic:c.pic||null,lastBody:c.lastBody||""};
  tcur=peer;
  $("th").classList.add("on");
  var isRealId=/^\d+$/.test(String(peer.id));
  var isFol=isRealId&&!!(A.fol&&A.fol[peer.id]);
  $("thn").innerHTML='<span style="flex:1;display:flex;align-items:center;gap:8px;cursor:pointer" id="thProfLink">'+(peer.pic?'<img src="'+esc(peer.pic)+'" style="width:28px;height:28px;border-radius:50%;object-fit:cover">':esc(peer.e||"👤"))+' <b>'+esc(peer.name)+'</b>'+(isRealId?'<small style="color:#fde047;font-size:11px">ID '+esc(peer.id)+'</small>':'')+'</span>'+(isRealId?'<button id="thFolBtn" class="scp" style="background:'+(isFol?"rgba(16,185,129,.25)":"linear-gradient(135deg,#9b4dff,#ff3dc8)")+';color:#fff;border:0;font-size:11.5px;padding:5px 10px">'+(isFol?"✓ Following":"+ Follow")+'</button>':'');
  if($("thProfLink")&&isRealId){
    $("thProfLink").onclick=function(){openProfile({id:peer.id,n:peer.name,pic:peer.pic,e:peer.e||"👤",real:true})};
  }
  if($("thFolBtn")&&isRealId){
    $("thFolBtn").onclick=async function(ev){
      ev.stopPropagation();
      await toggleFollowUser({id:peer.id,n:peer.name,pic:peer.pic,e:peer.e||"👤"});
      var nowFol=!!(A.fol&&A.fol[peer.id]);
      $("thFolBtn").textContent=nowFol?"✓ Following":"+ Follow";
      $("thFolBtn").style.background=nowFol?"rgba(16,185,129,.25)":"linear-gradient(135deg,#9b4dff,#ff3dc8)";
    };
  }
  $("tb").innerHTML="";
  var localMsgs=(A.chatHist&&A.chatHist[peer.id])||[];
  if(localMsgs.length){
    localMsgs.forEach(function(m){bub(m.body,!!m.mine)});
  }else if(peer.lastBody){
    bub(peer.lastBody,false);
  }else{
    bub("👋 Say hello to "+peer.name+"!",false);
  }
  clearInterval(msgPollTimer);
  if(isRealId&&akiraToken()){
    var syncPeerMsgs=async function(){
      if(!$("th").classList.contains("on")||!tcur||String(tcur.id)!==String(peer.id))return;
      try{
        var res=await akiraRequest("/api/v1/community/messages?peerId="+encodeURIComponent(peer.id),"GET",undefined,akiraToken());
        if(res&&res.peer){
          peer.name=res.peer.name||peer.name;
          peer.pic=res.peer.pic||peer.pic;
        }
        if(res&&Array.isArray(res.messages)&&res.messages.length){
          A.chatHist[peer.id]=res.messages.map(function(m){return{id:m.id,body:m.body,mine:!!m.mine,createdAt:m.createdAt}});
          $("tb").innerHTML="";
          A.chatHist[peer.id].forEach(function(m){bub(m.body,!!m.mine)});
        }
      }catch(_){}
    };
    syncPeerMsgs();
    msgPollTimer=setInterval(syncPeerMsgs,3500);
  }
}
$("thb").onclick=function(){clearInterval(msgPollTimer);$("th").classList.remove("on");if($("v-msg").classList.contains("on"))renderMsg()};
async function sendT(){
  var v=$("ti").value.trim();if(!v||!tcur)return;
  $("ti").value="";
  bub(v,true);
  fixA();
  var pid=String(tcur.id||tcur.name||"");
  A.chatHist[pid]=A.chatHist[pid]||[];
  A.chatHist[pid].push({body:v,mine:true,createdAt:new Date().toISOString()});
  A.chatThreads[pid]={id:pid,name:tcur.name,pic:tcur.pic||null,e:tcur.e||"👤",lastBody:v,time:"Now"};
  saveA();
  if(/^\d+$/.test(pid)&&akiraToken()){
    try{
      await akiraRequest("/api/v1/community/messages","POST",{recipientId:pid,body:v},akiraToken());
      return;
    }catch(e){
      if(e&&/blocked/i.test(e.message)){toast("Cannot message this user");return;}
    }
  }
  if(tcur.name==="Customer service"){
    setTimeout(function(){bub("Thank you! Your request has been received. Support will assist you shortly. 🙏",false)},700);
  }else if(!/^\d+$/.test(pid)){
    setTimeout(function(){bub("😊👍",false)},800);
  }
}
$("ts").onclick=sendT;$("ti").onkeydown=function(e){if(e.key==="Enter")sendT()};
async function toggleFollowUser(target){
  fixA();
  var tid=String(target.id||"");if(!tid||tid===String(A.id))return false;
  var next=!A.fol[tid];
  A.fol[tid]=next;
  A.folUsers=A.folUsers||{};
  if(next){
    A.folUsers[tid]={id:tid,name:target.n||target.name||("User "+tid),pic:target.pic||null,e:target.e||"👤",bio:target.bio||""};
  }
  saveA();
  if(/^\d+$/.test(tid)&&akiraToken()){
    try{
      var res=await akiraRequest("/api/v1/community/follow","POST",{targetId:tid,action:next?"follow":"unfollow"},akiraToken());
      if(res&&typeof res.following==="boolean"){
        A.fol[tid]=res.following;
        if(typeof res.myFollowingCount==="number")A.fgCount=res.myFollowingCount;
        if(typeof res.myFollowersCount==="number")A.flCount=res.myFollowersCount;
        if(typeof res.followersCount==="number")target.fl=res.followersCount;
        saveA();
      }
    }catch(_){}
  }
  toast(A.fol[tid]?("Following "+(target.n||target.name||"user")+" ✓"):("Unfollowed "+(target.n||target.name||"user")));
  return !!A.fol[tid];
}
function followsSheet(mode,userId){
  fixA();
  var isFollowers=mode==="followers";
  var uid=String(userId||A.id);
  function drawList(list){
    var h='<h3>'+(isFollowers?"👥 Followers":"❤️ Following")+' ('+bn(list.length)+')</h3>';
    if(!list.length){
      h+='<div class="empty">'+(isFollowers?"No followers yet. Join voice rooms to make friends!":"You are not following anyone yet. Tap Follow on any user profile!")+'</div>';
    }else{
      h+='<div style="max-height:58vh;overflow-y:auto">'+list.map(function(u,idx){
        var av=u.pic?'<img src="'+esc(u.pic)+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">':(u.e||"👤");
        var isMe=String(u.id)===String(A.id);
        var fState=!!(A.fol&&A.fol[u.id]);
        return'<div class="slr" data-fu="'+idx+'"><div class="sa">'+av+'</div><div class="sn"><b>'+esc(u.name||u.n||("User "+u.id))+'</b><small>🆔 '+esc(u.id)+(u.bio?' · '+esc(u.bio):'')+'</small></div>'+
          (isMe?'':('<button class="scp" data-fmsg="'+idx+'" style="background:rgba(14,165,233,.25);color:#7dd3fc;border:1px solid rgba(14,165,233,.4);margin-right:4px">💬 Chat</button><button class="scp" data-ftog="'+idx+'" style="background:'+(fState?"rgba(16,185,129,.22)":"linear-gradient(135deg,#9b4dff,#ff3dc8)")+';color:#fff;border:0">'+(fState?"Following":"Follow")+'</button>'))+
        '</div>';
      }).join("")+'</div>';
    }
    openSheet(h);
    $("sh").querySelectorAll("[data-fmsg]").forEach(function(b){
      b.onclick=function(e){
        e.stopPropagation();
        var u=list[+b.dataset.fmsg];
        closeSheet();$("pfo").classList.remove("on");
        openThread({id:String(u.id),name:u.name||u.n||"User",pic:u.pic||null,e:u.e||"👤"});
      };
    });
    $("sh").querySelectorAll("[data-ftog]").forEach(function(b){
      b.onclick=async function(e){
        e.stopPropagation();
        var u=list[+b.dataset.ftog];
        await toggleFollowUser({id:u.id,name:u.name||u.n,pic:u.pic});
        drawList(list);
      };
    });
    $("sh").querySelectorAll("[data-fu]").forEach(function(r){
      r.onclick=function(){
        var u=list[+r.dataset.fu];
        closeSheet();
        openProfile({id:String(u.id),n:u.name||u.n||"User",pic:u.pic||null,bio:u.bio||"",e:u.e||"👤",real:true});
      };
    });
  }
  var localFallback=isFollowers?(A.followersList||[]):Object.keys(A.fol||{}).filter(function(k){return A.fol[k]}).map(function(k){return(A.folUsers&&A.folUsers[k])||{id:k,name:"User "+k,e:"👤"}});
  drawList(localFallback);
  if(akiraToken()){
    akiraRequest("/api/v1/community/follows?userId="+encodeURIComponent(uid),"GET",undefined,akiraToken()).then(function(res){
      if(!res)return;
      var serverList=isFollowers?(res.followers||[]):(res.following||[]);
      if(uid===String(A.id)){
        A.flCount=Number(res.followersCount||0);
        A.fgCount=Number(res.followingCount||0);
        A.followersList=res.followers||[];
        A.followingList=res.following||[];
        saveA();
      }
      if($("shb").classList.contains("on"))drawList(serverList.length?serverList:localFallback);
    }).catch(function(){});
  }
}
/* ===== Profile ===== */
var ptab=0,gsub=0,rotT=null,rotHold=false;
var COVERS=["#9b4dff,#ff3dc8","#0ea5e9,#6366f1","#f59e0b,#ef4444","#10b981,#0ea5e9","#f43f5e,#a855f7","#14b8a6,#3b82f6","#fb923c,#e879f9","#6366f1,#22d3ee"];
var GE=["🌹","💍","🚗","🏰","🦁","🐉","🚀","👑"];
function hsh(s){var h=7;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h}
function fixA(){A.st=A.st||{recv:0,sent:0};A.sw=A.sw||{};A.rw=A.rw||{};A.fol=A.fol||{};A.folUsers=A.folUsers||{};A.chatHist=A.chatHist||{};A.chatThreads=A.chatThreads||{};if(A.bio==null)A.bio="Hello! I am new on Akira Voice Chat App 🎙️"}
function lvC(){return 1+Math.floor((A.st.recv||0)/10)}
function myAge(){if(!A.dob)return null;var p=A.dob.split("-");return ageOf(+p[0],+p[1]-1,+p[2])}
function myModel(){fixA();var xp=RS().xp;var localFg=Object.keys(A.fol).filter(function(k){return A.fol[k]}).length;return{n:A.name,pic:A.pic,e:"😎",cover:A.cover,id:A.id,country:A.country,age:myAge(),bio:A.bio,wl:level(),wp:(xp%1000)/10,cl:lvC(),cp:((A.st.recv||0)%10)*10,fl:A.flCount||0,fg:Math.max(A.fgCount||0,localFg),sent:A.st.sent||0,recv:A.st.recv||0,sw:A.sw,rw:A.rw,room:A.myRoom?A.myRoom.name:"",streak:A.claim.streak,left:1000-xp%1000,mine:true}}
function otherModel(u){
  var h=hsh(String(u.id)+(u.n||u.name||"")),bios=["I love hanging out in rooms 🎶","People of songs and stories 🌙","Come to the mic if you want to be friends 😄","Have a good time, everyone ✨","Stay happy, stay well 💜"],c=CTRY[h%CTRY.length],sw={},rw={};
  GE.slice(0,4+h%4).forEach(function(g,i){sw[g]=1+(h>>>i)%9;rw[g]=1+(h>>>(i+2))%13});
  var sum=function(o){return Object.keys(o).reduce(function(a,k){return a+o[k]},0)};
  return{n:u.n||u.name||"User",e:u.e||"👤",pic:u.pic||null,cover:u.cover||null,ci:h%COVERS.length,id:String(u.id),country:u.country||(c[0]+" "+c[1]),age:u.age||(18+h%20),bio:u.bio||bios[h%5],wl:u.lv||1+h%40,wp:h%100,cl:1+h%30,cp:(h>>>3)%100,fl:typeof u.fl==="number"?u.fl:(20+h%900),fg:typeof u.fg==="number"?u.fg:(5+h%200),sent:typeof u.sent==="number"?u.sent:sum(sw),recv:typeof u.recv==="number"?u.recv:sum(rw),sw:sw,rw:rw,room:u.room||"",roomId:u.roomId||null,streak:h%9,u:u,mine:false};
}
function badgesOf(m){return[["🌱","New member",true],["🎁","First gift",m.sent>0],["⭐","Level 10",m.wl>=10],["💎","Level 25",m.wl>=25],["🏠","Room owner",m.mine?!!m.room:m.id.charCodeAt(0)%2===0],["📅","7-day streak",m.streak>=7],["🤝","10 followers",m.fl>=10],["🦁","Top donor",m.sent>=50]]}
function pfHTML(m,mine){
  var g=m.wl>=25?["#fde68a","#f59e0b"]:m.wl>=10?["#9b4dff","#ff3dc8"]:["#22d3ee","#34d399"],
  cov=m.cover?"url("+m.cover+") center/cover":"linear-gradient(135deg,"+COVERS[m.ci||0]+")",
  fol=!mine&&!!A.fol[m.id],fl=m.fl+(fol&&!m.serverSyncedFl?1:0);
  var h='<div class="pf"><div class="cov" style="background:'+cov+'">'+(mine?'<button class="cvb" id="cvb">📷 Change cover</button>':'')+'</div><div class="pfh"><div class="pavw"><div class="pavr" style="--g1:'+g[0]+';--g2:'+g[1]+'"></div><div class="pav3" id="pavb" style="'+(m.pic?"background-image:url("+m.pic+")":"")+'">'+(m.pic?"":m.e)+'</div><span class="lvbadge">Lv'+bn(m.wl)+'</span></div><h2>'+esc(m.n)+'</h2><div class="meta"><span id="pid">🆔 '+m.id+' 📋</span>'+(m.country?'<span>'+esc(m.country)+'</span>':'')+(m.age?'<span>🎂 '+bn(m.age)+' Year</span>':'')+'</div><p class="bio">'+esc(m.bio||"")+'</p></div>';
  h+='<div class="lvs"><div class="lvc w"><b>💰 Wealth level</b><div class="big3">'+bn(m.wl)+'</div><div class="lvb"><i style="width:'+m.wp+'%"></i></div><small>Grows when you send gifts</small></div><div class="lvc c"><b>💖 Charm level</b><div class="big3">'+bn(m.cl)+'</div><div class="lvb"><i style="width:'+m.cp+'%"></i></div><small>Grows when you receive gifts</small></div></div>';
  h+='<div class="st4"><div id="pfFlw" style="cursor:pointer"><b>'+fmt(fl)+'</b><small>Followers ›</small></div><div id="pfFlg" style="cursor:pointer"><b>'+fmt(m.fg)+'</b><small>Following ›</small></div><div><b>'+fmt(m.sent)+'</b><small>Gifts sent</small></div><div><b>'+fmt(m.recv)+'</b><small>Gifts received</small></div></div>';
  if(mine)h+='<div class="pbtn"><button class="p" id="pe">✏️ Edit</button><button data-m="daily">🎁 Daily</button><button data-m="invite">🤝 Invite</button></div><div class="wallet" style="margin-top:0"><div><small>My wallet</small><b>🪙 '+(window.akiraCompactCoins?window.akiraCompactCoins(coins()):bn(coins()))+'</b></div><button id="wr">Recharge</button></div>';
  else h+='<div class="pbtn"><button class="p" id="pfol">'+(fol?"✅ Following":"➕ Follow")+'</button><button id="pmsg">💬 Message</button><button id="pgift">🎁 Gift</button><button id="pmore" style="flex:.4">⋯</button></div>';
  h+='<div class="tabs">'+["ℹ️ Info","🎁 Gift","🏅 Badges"].map(function(t,i){return'<button data-pt="'+i+'" class="'+(ptab===i?"on":"")+'">'+t+'</button>'}).join("")+'</div>';
  if(ptab===0){
    h+='<div class="row"><span>🆔 ID</span><b>'+m.id+'</b></div><div class="row"><span>🌍 Country</span><b>'+esc(m.country||"-")+'</b></div><div class="row"><span>🎂 Age</span><b>'+(m.age?bn(m.age)+" Year":"-")+'</b></div><div class="row" id="pfRoomRow" style="cursor:pointer"><span>🏠 Room</span><b>'+(mine?esc(m.room||"None yet"):esc(m.room||("Enter ID "+(m.roomId||m.id)+" ›")))+'</b></div><div class="row"><span>📅 Check-in streak</span><b>'+bn(m.streak||0)+' Day</b></div>'+(mine?'<div class="row"><span>⭐ Next level</span><b>'+bn(m.left)+' coins left</b></div>':'');
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
var DEFAULT_STORE_ITEMS=[
  {id:901,kind:"frame",name:"Royal Gold Frame",description:"Shining golden avatar ring",asset:"🖼️",price:1500},
  {id:902,kind:"frame",name:"Neon Cyber Frame",description:"Glowing neon avatar frame",asset:"💠",price:2500},
  {id:903,kind:"frame",name:"Phoenix Fire Frame",description:"Animated flame avatar border",asset:"🔥",price:5000},
  {id:904,kind:"entry",name:"Golden Sports Car",description:"Grand luxury car room entry effect",asset:"🏎️",price:3000},
  {id:905,kind:"entry",name:"Royal Dragon Entry",description:"Fly into voice rooms on a golden dragon",asset:"🐉",price:8000},
  {id:906,kind:"entry",name:"Starlight Yacht",description:"VIP yacht arrival announcement",asset:"🛥️",price:6000},
  {id:907,kind:"vip",name:"SVIP 1 Membership",description:"SVIP 1 Badge + Priority Seat + Gold Name",asset:"👑",price:5000},
  {id:908,kind:"vip",name:"SVIP 2 Royal",description:"SVIP 2 Crown + Exclusive Entry + Frame",asset:"💎",price:15000},
  {id:909,kind:"vip",name:"SVIP 3 Emperor",description:"Top Emperor SVIP status & all privileges",asset:"🦁",price:35000},
  {id:910,kind:"theme",name:"Galaxy Palace Theme",description:"Starry room background theme",asset:"🌌",price:2000},
  {id:911,kind:"medal",name:"Legend Star Medal",description:"Exclusive profile honor medal",asset:"🏅",price:1200}
];
var storeCache={items:null,inv:{}};
async function loadStoreData(){
  var items=DEFAULT_STORE_ITEMS.slice();
  var inv=Object.assign({},A.ownedItems||{});
  if(akiraToken()){
    try{
      var cRes=await akiraRequest("/api/v1/community/catalog","GET",undefined,akiraToken());
      if(cRes&&Array.isArray(cRes.items)){
        var shopItems=cRes.items.filter(function(x){return["frame","entry","vip","theme","medal"].indexOf(x.kind)>-1});
        if(shopItems.length)items=shopItems;
      }
      var iRes=await akiraRequest("/api/v1/community/inventory","GET",undefined,akiraToken());
      if(iRes&&Array.isArray(iRes.items)){
        iRes.items.forEach(function(x){inv[x.item_id]={owned:true,equipped:!!x.equipped,kind:x.kind,name:x.name,asset:x.asset};});
      }
    }catch(_){}
  }
  storeCache.items=items;
  storeCache.inv=inv;
  return storeCache;
}
function catalogSheet(initialFilter){
  var curFilter=initialFilter||"all";
  var titles={all:"🛍️ Akira Shop",store:"🛍️ Akira Shop",frame:"🖼️ Avatar Frames",entry:"✨ Entry Effects & Rides",vip:"👑 SVIP Center",svip:"👑 SVIP Center",theme:"🎨 Room Themes",medal:"🏅 Honor Medals"};
  if(curFilter==="store")curFilter="all";
  if(curFilter==="svip")curFilter="vip";
  function draw(){
    var items=(storeCache.items||DEFAULT_STORE_ITEMS).filter(function(it){
      if(curFilter==="all")return["frame","entry","vip","theme","medal"].indexOf(it.kind)>-1;
      return it.kind===curFilter;
    });
    var tabs=[["all","🛍️ All"],["frame","🖼️ Frame"],["entry","✨ Entry"],["vip","👑 SVIP"],["theme","🎨 Theme"],["medal","🏅 Medal"]];
    var h='<h3>'+(titles[curFilter]||"🛍️ Akira Shop")+'</h3>';
    h+='<div style="display:flex;justify-content:space-between;align-items:center;margin:6px 0 10px;padding:8px 12px;border-radius:14px;background:rgba(255,255,255,.07);font-size:13px"><span>My Balance: <b style="color:#fde047">🪙 '+N(coins())+'</b></span><button class="scp" id="stRech" style="background:linear-gradient(135deg,#f59e0b,#ec4899);color:#fff;border:0;font-weight:700">+ Recharge</button></div>';
    h+='<div class="tabs" style="overflow-x:auto;padding-bottom:4px">'+tabs.map(function(t){return'<button data-sf="'+t[0]+'" class="'+(curFilter===t[0]?"on":"")+'">'+t[1]+'</button>'}).join("")+'</div>';
    if(curFilter==="vip"){
      h+='<div style="margin:8px 0 12px;padding:12px;border-radius:16px;background:linear-gradient(135deg,rgba(245,158,11,.22),rgba(168,85,247,.22));border:1px solid rgba(253,224,71,.35);font-size:12.5px;line-height:1.5"><b style="color:#fde047;font-size:14px">👑 Current Status: '+esc(A.svip||"SVIP 1")+'</b><br>Privileges: Golden VIP Badge · Priority Seat · Room Entry Banner · Exclusive Avatar Frame</div>';
    }
    if(!items.length){
      h+='<div class="empty">No items in this category yet.</div>';
    }else{
      h+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:10px;max-height:52vh;overflow-y:auto;padding-right:2px">'+items.map(function(it){
        var st=storeCache.inv[it.id]||{};
        var isImg=it.asset&&(/^(https?:|data:image\/|\/?assets\/)/.test(it.asset));
        var ico=isImg?'<img src="'+esc(it.asset)+'" style="width:52px;height:52px;object-fit:contain;margin:0 auto 6px;display:block;border-radius:12px">':'<div style="font-size:36px;margin-bottom:4px">'+(esc(it.asset)||"🎁")+'</div>';
        var btnLbl=st.equipped?"Equipped ✓":st.owned?"Equip":("🪙 "+N(it.price||0)+" Buy");
        var btnStyle=st.equipped?"background:rgba(16,185,129,.28);color:#6ee7b7;border:1px solid #10b981":st.owned?"background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;border:0":"background:linear-gradient(135deg,#9b4dff,#ff3dc8);color:#fff;border:0";
        return'<div style="border:1px solid var(--line);background:var(--glass);border-radius:18px;padding:12px 10px;text-align:center;display:flex;flex-direction:column;justify-content:space-between">'+
          '<div>'+ico+'<b style="display:block;font-size:13.5px;margin-bottom:3px">'+esc(it.name)+'</b><small style="display:block;color:var(--mu);font-size:11px;min-height:28px">'+esc(it.description||it.kind.toUpperCase())+'</small></div>'+
          '<button data-buy="'+it.id+'" style="margin-top:8px;width:100%;padding:8px 10px;border-radius:12px;font-weight:700;font-size:12.5px;cursor:pointer;'+btnStyle+'">'+btnLbl+'</button>'+
        '</div>';
      }).join("")+'</div>';
    }
    openSheet(h);
    if($("stRech"))$("stRech").onclick=function(){closeSheet();rechargeSheet(0)};
    $("sh").querySelectorAll("[data-sf]").forEach(function(b){
      b.onclick=function(){curFilter=b.dataset.sf;draw();};
    });
    $("sh").querySelectorAll("[data-buy]").forEach(function(b){
      b.onclick=async function(){
        var id=b.dataset.buy;
        var it=(storeCache.items||DEFAULT_STORE_ITEMS).find(function(x){return String(x.id)===String(id)});
        if(!it)return;
        var st=storeCache.inv[it.id]||{};
        b.disabled=true;
        try{
          if(!st.owned){
            var price=Number(it.price||0);
            if(coins()<price){toast("Not enough coins! Please recharge 🪙");b.disabled=false;return;}
            if(akiraToken()&&Number(it.id)<900){
              await akiraRequest("/api/v1/community/buy","POST",{itemId:it.id,requestId:"buy-"+Date.now()+"-"+Math.random().toString(36).slice(2,10)},akiraToken());
              await akiraRequest("/api/v1/community/equip","POST",{itemId:it.id},akiraToken()).catch(function(){});
              await akiraSyncWallet();
            }else{
              addCoins(-price);
            }
          }else if(akiraToken()&&Number(it.id)<900){
            await akiraRequest("/api/v1/community/equip","POST",{itemId:it.id},akiraToken()).catch(function(){});
          }
          Object.keys(storeCache.inv).forEach(function(k){if(storeCache.inv[k]&&storeCache.inv[k].kind===it.kind)storeCache.inv[k].equipped=false;});
          storeCache.inv[it.id]={owned:true,equipped:true,kind:it.kind,name:it.name,asset:it.asset};
          A.ownedItems=storeCache.inv;
          if(it.kind==="frame")A.frame=it.asset||"🖼️";
          if(it.kind==="entry")A.entry=it.name;
          if(it.kind==="vip")A.svip=it.name.replace(/Membership/i,"").trim()||"SVIP";
          saveA();
          toast(it.name+" equipped ✓");
          draw();
          if($("v-me")&&$("v-me").classList.contains("on"))renderMe(true);
        }catch(e){
          toast(e.message||"Could not complete purchase");
          b.disabled=false;
        }
      };
    });
  }
  draw();
  loadStoreData().then(function(){if($("shb").classList.contains("on"))draw();});
}
function badgesSheet(m){
  var base=badgesOf(m||myModel());
  var medals=(storeCache.items||[]).filter(function(x){return x.kind==="medal"});
  var h='<h3>🏅 Badges &amp; Honor Medals</h3><div class="bdg">'+base.map(function(b){return'<div class="'+(b[2]?"":"off")+'"><span>'+(b[2]?b[0]:"🔒")+'</span>'+b[1]+'</div>'}).join("")+
    medals.map(function(md){
      var owned=storeCache.inv&&storeCache.inv[md.id]&&storeCache.inv[md.id].owned;
      var ico=(md.asset&&!/^(https?:|data:)/.test(md.asset))?md.asset:"🏅";
      return'<div class="'+(owned?"":"off")+'" data-md="'+md.id+'" style="cursor:pointer"><span>'+esc(ico)+'</span>'+esc(md.name)+'</div>';
    }).join("")+'</div><button class="big" id="openMedalShop" style="margin-top:14px">🛍️ Get More Medals in Shop</button>';
  openSheet(h);
  if($("openMedalShop"))$("openMedalShop").onclick=function(){catalogSheet("medal")};
}
function reportSheet(targetUser){
  openSheet('<h3>🚩 Report '+esc(targetUser.n||"User")+'</h3><div class="lbl">Target ID: '+esc(targetUser.id)+'</div><div class="lbl" style="margin-top:8px">Describe the issue</div><textarea class="field" id="repMsg" rows="3" maxlength="500" placeholder="Harassment, spam, or rule violation..."></textarea><button class="big" id="repSend" style="margin-top:12px">Send Report</button>');
  $("repSend").onclick=async function(){
    var msg=($("repMsg").value||"").trim()||"Reported from profile";
    $("repSend").disabled=true;
    if(akiraToken()){
      try{await akiraRequest("/api/v1/community/report","POST",{targetId:String(targetUser.id),message:msg},akiraToken());}catch(_){}
    }
    closeSheet();
    toast("Report submitted to Admin ✓");
  };
}
function pfWire(root,m,mine){
  queueMicrotask(function(){window.akiraEquipment?.decorate?.(root,m,mine)});
  var rr=function(){root.innerHTML=pfHTML(m,mine);pfWire(root,m,mine)},q=function(s,f){var e=root.querySelector(s);if(e)e.onclick=f};
  root.querySelectorAll("[data-pt]").forEach(function(b){b.onclick=function(){ptab=+b.dataset.pt;rr()}});
  root.querySelectorAll("[data-gs]").forEach(function(b){b.onclick=function(){gsub=+b.dataset.gs;rr()}});
  q("#pid",function(){try{navigator.clipboard.writeText(m.id);toast("ID Copied ✓")}catch(e){toast("ID: "+m.id)}});
  q("#pfFlw",function(){followsSheet("followers",m.id)});
  q("#pfFlg",function(){followsSheet("following",m.id)});
  if(mine){
    q("#cvb",function(){pickImage(800,function(d){A.cover=d;saveA();renderMe();if($("pfo").classList.contains("on")){var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true)}toast("Cover changed ✓")})});
    q("#pavb",function(){pickImage(260,function(d){A.pic=d;saveA();renderMe();if($("pfo").classList.contains("on")){var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true)}toast("Photo changed ✓")})});
    q("#pe",editSheet);q("#wr",function(){rechargeSheet(0)});
    root.querySelectorAll("[data-m]").forEach(function(b){b.onclick=function(){var k=b.dataset.m;
      if(k==="home"){$("pfo").classList.remove("on");if(A.myRoom)openRoom(myR());else createSheet(false)}
      else if(k==="daily")dailySheet();
      else if(k==="invite")inviteSheet();
      else if(k==="recharge")rechargeSheet(0);
      else if(k==="set")settingsSheet();
      else if(k==="frame"||k==="entry")window.akiraEquipment?.open(k);
      else if(k==="store"||k==="svip")catalogSheet(k);
      else catalogSheet("all")}});
  }else{
    q("#pfol",async function(){
      await toggleFollowUser(m);
      m.serverSyncedFl=true;
      rr();
    });
    q("#pmsg",function(){
      $("pfo").classList.remove("on");
      openThread({id:String(m.id),name:m.n,pic:m.pic||null,e:m.e||"👤"});
    });
    q("#pgift",function(){if($("rw").classList.contains("on")&&m.u&&$("rf").contentWindow){$("pfo").classList.remove("on");AkiraBridge.toRoom({t:"gift",seat:m.u.seat||0})}else toast("Enter a voice room to send gifts 🎁")});
    q("#pfRoomRow",function(){
      var rid=m.roomId||m.id;
      var rm=roomList().find(function(x){return String(x.id)===String(rid)||String(x.ownerId)===String(m.id)});
      if(rm){$("pfo").classList.remove("on");openRoom(rm);}
      else toast("User is not hosting an active room right now");
    });
    q("#pmore",function(){
      openSheet('<h3>'+esc(m.n)+' (ID '+esc(m.id)+')</h3><div class="acts"><button class="act" id="rp1"><span>🚩</span>Report</button><button class="act" id="bl1"><span>🚫</span>Block</button><button class="act" id="cp1"><span>📋</span>ID Copy</button></div>');
      $("rp1").onclick=function(){reportSheet(m)};
      $("bl1").onclick=async function(){
        if(akiraToken()&&/^\d+$/.test(String(m.id))){
          try{await akiraRequest("/api/v1/community/block","POST",{targetId:String(m.id)},akiraToken());}catch(_){}
        }
        if(A.fol)delete A.fol[m.id];
        saveA();closeSheet();$("pfo").classList.remove("on");
        toast("User blocked ✓");
      };
      $("cp1").onclick=function(){closeSheet();try{navigator.clipboard.writeText(String(m.id))}catch(_){}toast("ID: "+m.id)};
    });
  }
}
function meHTML(m){
  var av=m.pic?'style="background-image:url('+m.pic+')"':'';
  var frameBadge=A.frame&&!/^(https?:|data:)/.test(A.frame)?'<span style="position:absolute;right:-4px;bottom:-4px;font-size:24px;filter:drop-shadow(0 2px 6px rgba(0,0,0,.4))">'+esc(A.frame)+'</span>':'';
  return'<div class="mtop" style="padding-top:calc(28px + env(safe-area-inset-top, 0px))"><button class="mb" id="mback">‹ Back</button><button class="mb" id="mlang">🌐 English ⌄</button></div>'+
  '<div class="mav" style="position:relative;margin-top:14px"><div '+av+'>'+(m.pic?'':m.e)+'</div>'+frameBadge+'</div><div class="mnm">'+esc(m.n)+'</div><div class="mid" id="pid">ID: '+m.id+' 📋</div>'+
  '<div class="lps"><div class="cap"><span class="lp s">⬆ Sent Lv.'+m.wl+'</span><span class="lp r">⬇ Received Lv.'+m.cl+'</span></div><span class="svp" id="svipTag" style="cursor:pointer">👑 '+esc(A.svip||"SVIP 1")+'</span></div>'+
  (A.entry?'<div style="text-align:center;margin-bottom:8px"><span style="display:inline-block;padding:4px 12px;border-radius:99px;background:rgba(155,77,255,.18);color:#5b21b6;font-weight:700;font-size:12.5px">✨ Entry: '+esc(A.entry)+'</span></div>':'')+
  '<button class="edp" id="pe">✎ Edit profile</button>'+
  '<div class="mst"><div id="meFlw" style="cursor:pointer"><b>'+fmt(m.fl)+'</b><small>Followers ›</small></div><div id="meFlg" style="cursor:pointer"><b>'+fmt(m.fg)+'</b><small>Following ›</small></div><div><b>'+fmt(A.vis||0)+'</b><small>Visitors</small></div></div>'+
  '<button class="pick" id="pavb">📷 '+(m.pic?'Change profile photo':'Choose profile photo')+'</button>'+
  '<div class="tiles"><button data-m="store"><span>🛍️</span>Shop</button><button id="mbd"><span>🏅</span>Badges</button><button data-m="frame"><span>🖼️</span>Frame</button><button data-m="daily"><span>🎯</span>Tasks</button></div>'+
  '<button class="wl" id="wr"><b>Wallet ›</b><span><em>🪙 '+coins().toLocaleString("en-US")+'</em> &nbsp; <em>💎 '+curDia().toLocaleString("en-US")+'</em></span></button>'+
  '<div class="ml2"><button class="mr" data-m="home"><span>🎙️ '+(A.myRoom?"My room ("+esc(A.myRoom.name)+")":"Create My Room")+'</span><i>›</i></button><button class="mr" data-m="entry"><span>✨ Entry'+(A.entry?" ("+esc(A.entry)+")":"")+'</span><i>›</i></button><button class="mr" data-m="svip"><span>👑 '+esc(A.svip||"SVIP")+'</span><i>›</i></button><button class="mr" data-m="invite"><span>🤝 Invite</span><i>›</i></button><button class="mr" data-m="set"><span>⚙️ Settings</span><i>›</i></button></div>';
}
function renderMe(skipBalanceSync){if(!skipBalanceSync){syncCommunityBalance();syncFollowCounts();}var m=myModel(),r=$("v-me");r.innerHTML=meHTML(m);pfWire(r,m,true);
  $("mback").onclick=function(){go("home")};$("mlang").onclick=function(){toast("More languages are coming soon")};
  $("mbd").onclick=function(){badgesSheet(m)};
  if($("meFlw"))$("meFlw").onclick=function(){followsSheet("followers",A.id)};
  if($("meFlg"))$("meFlg").onclick=function(){followsSheet("following",A.id)};
  if($("svipTag"))$("svipTag").onclick=function(){catalogSheet("svip")};
}
function openProfile(u){
  if(u&&(String(u.id)===String(A.id)||u.mine)){
    ptab=0;gsub=0;var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true);$("pfo").classList.add("on");$("pfo").scrollTop=0;return;
  }
  ptab=0;gsub=0;var m=otherModel(u);$("pfc").innerHTML=pfHTML(m,false);pfWire($("pfc"),m,false);$("pfo").classList.add("on");$("pfo").scrollTop=0;
  if(u&&u.id&&/^\d+$/.test(String(u.id))&&akiraToken()){
    akiraRequest("/api/v1/community/user-profile?id="+encodeURIComponent(u.id),"GET",undefined,akiraToken()).then(function(res){
      if(!res||!res.user||!$("pfo").classList.contains("on"))return;
      var ru=res.user;
      A.fol=A.fol||{};
      A.fol[ru.id]=!!ru.isFollowing;
      m.n=ru.name||m.n;
      m.pic=ru.pic||m.pic;
      m.bio=ru.bio||m.bio;
      if(ru.country)m.country=ru.country;
      m.fl=Number(ru.followersCount||0);
      m.fg=Number(ru.followingCount||0);
      m.serverSyncedFl=true;
      if(ru.roomName)m.room=ru.roomName;
      if(ru.roomId)m.roomId=ru.roomId;
      $("pfc").innerHTML=pfHTML(m,false);
      pfWire($("pfc"),m,false);
    }).catch(function(){});
  }
}
$("pfb").onclick=function(){$("pfo").classList.remove("on")};
function editSheet(){
  openSheet('<h3>✏️ Edit profile</h3><div class="lbl">Name</div><input class="field" id="en" maxlength="20" value="'+esc(A.name)+'"><div class="lbl" style="margin-top:10px">About (bio)</div><textarea class="field" id="eb" rows="3" maxlength="80">'+esc(A.bio||"")+'</textarea><div class="acts" style="grid-template-columns:1fr 1fr"><button class="act" id="ep"><span>📷</span>Change photo</button><button class="act" id="ec"><span>🖼️</span>Change cover</button></div><button class="big" id="es">Save</button>');
  $("ep").onclick=function(){pickImage(260,function(d){A.pic=d;saveA();renderMe();if($("pfo").classList.contains("on")){var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true)}editSheet()})};
  $("ec").onclick=function(){pickImage(800,function(d){A.cover=d;saveA();renderMe();if($("pfo").classList.contains("on")){var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true)}editSheet()})};
  $("es").onclick=function(){A.name=$("en").value.trim()||"Me";A.bio=$("eb").value.trim();if(A.myRoom)A.myRoom.host=A.name;saveA();closeSheet();renderMe();if($("pfo").classList.contains("on")){var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true)}toast("Profile saved ✓")};
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
  if(!/^https?:\/\//.test(AKIRA_API_BASE))throw new Error("Akira HTTPS API address is not configured");
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
    var mine=data.rooms.find(function(r){return r.ownerId!=null&&String(r.ownerId)===String(A.id)});
    if(mine){
      A.myRoom=Object.assign({emoji:"🎙️",th:"mid",c:"#9b4dff,#4c1d95"},A.myRoom||{},{
        id:String(mine.id),
        ownerId:String(A.id),
        name:mine.name||(A.myRoom&&A.myRoom.name)||"My room",
        pic:mine.coverUrl||(A.myRoom&&A.myRoom.pic)||null,
        host:A.name
      });
      try{localStorage.setItem("vr_app_v1",JSON.stringify(A))}catch(_){}
    }
    CFG.rooms=data.rooms.map(function(r){
      var isMine=r.ownerId!=null&&String(r.ownerId)===String(A.id);
      return{
        id:String(r.id),
        ownerId:r.ownerId==null?null:String(r.ownerId),
        name:r.name||"Room",
        emoji:isMine&&A.myRoom&&A.myRoom.emoji?A.myRoom.emoji:"🎙️",
        pic:r.coverUrl||(isMine&&A.myRoom?A.myRoom.pic:null)||null,
        coverUrl:r.coverUrl||null,
        c:isMine&&A.myRoom&&A.myRoom.c?A.myRoom.c:"#9b4dff,#4c1d95",
        n:Number(r.memberCount||r.seatCount||1),
        host:isMine?A.name:(r.ownerName||("ID "+(r.ownerId||r.id))),
        tag:isMine?"My room":"Live",
        mics:["🎙️"],
        th:isMine&&A.myRoom&&A.myRoom.th?A.myRoom.th:"mid"
      };
    });
    renderRooms();
  }catch(e){console.warn("Akira rooms unavailable",e)}
}
var amode="login",apic=null;
function showAuth(m){amode=m||"login";authRender();$("au").classList.add("on")}
function hideAuth(){$("au").classList.remove("on")}
function aerr(t){$("ae").textContent=t}
async function enter(a,msg){
  const token=akiraToken();
  try{
    if(!token)throw Error('login_token_missing');
    const verified=await akiraRequest('/api/v1/auth/me','GET',undefined,token);
    const id=String(verified?.user?.id||verified?.user?.publicId||verified?.user?.public_id||'');
    if(!id||id!==String(a.p.id))throw Error('login_identity_mismatch');
  }catch(err){
    try{localStorage.removeItem(AKIRA_TOKEN_KEY)}catch(_){}
    window.__akiraAuthVerified=false;
    document.documentElement.classList.remove('akira-auth-verified');
    showAuth('login');toast('Login verification failed: '+err.message);return;
  }
  var list=accts().filter(function(x){return x.key!==a.key});list.push(a);saveAccts(list);
  try{localStorage.setItem(SESS_K,a.key);localStorage.setItem("vr_state_v2",JSON.stringify(a.state||{}))}catch(e){}
  A=Object.assign({name:"Me",pic:null,myRoom:null,claim:{d:"",streak:0}},a.p);fixA();try{localStorage.setItem("vr_app_v1",JSON.stringify(A))}catch(e){}
  window.__akiraAuthVerified=true;document.documentElement.classList.add('akira-auth-verified');
  hideAuth();refresh();akiraSyncWallet();if(window.akiraLoadProfile)window.akiraLoadProfile();
  renderRooms();loadAkiraRooms();go("home");
  if(window.akiraEquipment)window.akiraEquipment.refresh().catch(function(){});
  toast(msg);
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
  h+='</div><div class="lbl" style="margin-top:14px">Email accounts are connected to the Akira server. Voice and virtual coins are not yet live.</div></div>';
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
  enter(r.acct,"Welcome, "+name+"! +"+bn(2000)+" Coin gift 🎁");
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
  fixA();closeSheet();leaveRoom();refresh();renderRooms();go("home");showAuth("welcome");
}
/* ===== Start ===== */
renderRooms();refresh();loadAkiraRooms();
document.querySelectorAll("img[data-logo]").forEach(function(i){i.src=BRAND.logo});
(async function restoreVerifiedSession(){
  window.__akiraAuthVerified=false;
  document.documentElement.classList.remove('akira-auth-verified');
  try{
    localStorage.removeItem('vr_guest');
    const token=akiraToken();if(!token)throw Error('not_logged_in');
    const response=await akiraRequest('/api/v1/auth/me','GET',undefined,token);
    const user=response?.user||{},id=String(user.id||user.publicId||user.public_id||'');
    if(!/^\d{6,18}$/.test(id))throw Error('invalid_session_user');
    A.id=id;A.name=user.displayName||user.display_name||A.name;
    A.pic=user.avatarUrl||user.avatar_url||A.pic;
    saveA();
    window.__akiraAuthVerified=true;document.documentElement.classList.add('akira-auth-verified');
    hideAuth();refresh();loadAkiraRooms();
    if(window.akiraEquipment)window.akiraEquipment.refresh().catch(function(){});
  }catch(_){
    window.__akiraAuthVerified=false;
    document.documentElement.classList.remove('akira-auth-verified');
    try{localStorage.removeItem(AKIRA_TOKEN_KEY)}catch(_){}
    showAuth('welcome');
  }
})();
setTimeout(function(){$("sp").classList.add("off")},1300);

/* Remove any legacy floating community button if present; all features are native in the app. */
(function(){
  var old=document.getElementById("akira-community");
  if(old)old.remove();
  window.akiraCommunityOpen=function(tab){
    if(tab==="Sellers"||tab==="Exchange")rechargeSheet(tab==="Exchange"?1:0);
    else if(tab==="Rankings")go("rank");
    else catalogSheet("all");
  };
  setTimeout(function(){syncCommunityBalance();loadStoreData();},900);
})();

/* ===== 3D Motion 10-Second Right-to-Left Floating Card (Game Wins & Gifts) ===== */
(function(){
  var style=document.createElement("style");
  style.textContent=`
  #akira3dTrack{
    position:fixed;top:calc(32px + env(safe-area-inset-top, 0px));left:0;width:100%;max-width:100vw;height:58px;
    pointer-events:none;z-index:2147483646;overflow:hidden;contain:layout paint;
    perspective:950px;display:flex;align-items:center;
  }
  .ak3d-fly{
    position:absolute;top:4px;left:0;will-change:transform;
    animation:ak3dSlideRL 10s linear forwards;
    transform-style:preserve-3d;pointer-events:auto;cursor:pointer;
  }
  @keyframes ak3dSlideRL{
    0%{transform:translate3d(102vw,0,0)}
    100%{transform:translate3d(-115%,0,0)}
  }
  .ak3d-card{
    position:relative;display:inline-flex;align-items:center;gap:9px;
    padding:6px 14px 6px 8px;border-radius:999px;
    color:#fff;font:600 12px/1.25 system-ui,-apple-system,sans-serif;
    white-space:nowrap;transform-style:preserve-3d;
    animation:ak3dTilt 2.5s ease-in-out infinite alternate;
    box-shadow:0 12px 28px rgba(0,0,0,.58),0 0 18px var(--ak-glow,rgba(245,158,11,.55)),inset 0 1.5px 1px rgba(255,255,255,.45);
    border:1.5px solid var(--ak-bdr,#fcd34d);
    backdrop-filter:blur(10px);
  }
  .ak3d-card.win{
    --ak-glow:rgba(16,185,129,.65);--ak-bdr:#fde047;
    background:linear-gradient(135deg,rgba(6,78,59,.95) 0%,rgba(15,118,110,.95) 48%,rgba(180,83,9,.95) 100%);
  }
  .ak3d-card.gift{
    --ak-glow:rgba(236,72,153,.68);--ak-bdr:#f9a8d4;
    background:linear-gradient(135deg,rgba(88,28,135,.95) 0%,rgba(190,24,93,.95) 52%,rgba(124,45,18,.95) 100%);
  }
  @keyframes ak3dTilt{
    0%{transform:rotateY(-14deg) rotateX(7deg) translateY(-1px) scale(1)}
    50%{transform:rotateY(0deg) rotateX(-5deg) translateY(2px) scale(1.03)}
    100%{transform:rotateY(14deg) rotateX(6deg) translateY(-1px) scale(1)}
  }
  .ak3d-card::after{
    content:"";position:absolute;inset:0;border-radius:inherit;
    background:linear-gradient(110deg,transparent 25%,rgba(255,255,255,.32) 48%,transparent 70%);
    background-size:220% 100%;animation:ak3dShine 2.4s linear infinite;pointer-events:none;
  }
  @keyframes ak3dShine{
    0%{background-position:180% 0}
    100%{background-position:-60% 0}
  }
  .ak3d-av{
    width:36px;height:36px;border-radius:50%;flex:none;
    display:grid;place-items:center;font-size:18px;
    background:linear-gradient(145deg,#f59e0b,#ec4899);
    border:2px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.45);
    transform:translateZ(16px);overflow:hidden;
  }
  .ak3d-av img{width:100%;height:100%;object-fit:cover;display:block}
  .ak3d-body{display:flex;flex-direction:column;gap:2px;transform:translateZ(12px)}
  .ak3d-top{display:flex;align-items:center;gap:6px}
  .ak3d-nm{font-weight:800;font-size:12.5px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6)}
  .ak3d-id{
    font-size:10px;font-weight:800;padding:1px 6px;border-radius:99px;
    background:rgba(0,0,0,.42);color:#fde047;border:1px solid rgba(253,224,71,.45);
  }
  .ak3d-sub{font-size:11px;color:#fef3c7;display:flex;align-items:center;gap:5px}
  .ak3d-sub b{color:#fde047;font-weight:800}
  .ak3d-ico{
    font-size:22px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5));
    transform:translateZ(22px);animation:ak3dPop .9s ease-in-out infinite alternate;
  }
  @keyframes ak3dPop{
    from{transform:translateZ(22px) scale(.92) rotate(-8deg)}
    to{transform:translateZ(26px) scale(1.16) rotate(8deg)}
  }
  `;
  document.head.appendChild(style);
  var track=document.createElement("div");
  track.id="akira3dTrack";
  document.body.appendChild(track);

  var queue=[],active=false,seenIds={};
  function fmtNum(n){
    var v=Number(n||0);
    return Number.isFinite(v)?v.toLocaleString("en-US"):String(n||"0");
  }
  function renderCard(item){
    active=true;
    var wrap=document.createElement("div");
    wrap.className="ak3d-fly";
    var isGift=item.kind==="gift";
    var pic=item.senderPic||item.pic||null;
    var avContent=pic?'<img src="'+esc(pic)+'" alt="">':esc(item.senderEmoji||(isGift?"👑":"🎰"));
    var uName=item.senderName||item.name||"Akira Player";
    var uId=String(item.senderId||item.user_id||item.id||"100001");
    var html="";
    if(isGift){
      var gIcon=item.giftIcon||item.item_icon||"🎁";
      var gName=item.giftName||item.item_name||"Luxury Gift";
      var rName=item.recipientName||item.recipient_name||"Host";
      var qty=Number(item.qty||item.quantity||1);
      var amt=fmtNum(item.amount||100);
      html='<div class="ak3d-card gift">'+
        '<div class="ak3d-av">'+avContent+'</div>'+
        '<div class="ak3d-body">'+
          '<div class="ak3d-top"><span class="ak3d-nm">'+esc(uName)+'</span><span class="ak3d-id">🆔 '+esc(uId)+'</span><span style="color:#f9a8d4;font-weight:800">➔ '+esc(rName)+'</span></div>'+
          '<div class="ak3d-sub">Sent <b>'+esc(gName)+' x'+qty+'</b> · <b>🪙 '+amt+'</b></div>'+
        '</div>'+
        '<div class="ak3d-ico">'+esc(gIcon)+'</div>'+
      '</div>';
    }else{
      var game=item.game||"Food Wheel";
      var gEmoji=/Jackpot/i.test(game)?"🎰":"🎡";
      var amt2=fmtNum(item.amount||500);
      html='<div class="ak3d-card win">'+
        '<div class="ak3d-av">'+avContent+'</div>'+
        '<div class="ak3d-body">'+
          '<div class="ak3d-top"><span class="ak3d-nm">'+esc(uName)+'</span><span class="ak3d-id">🆔 '+esc(uId)+'</span></div>'+
          '<div class="ak3d-sub">🏆 Won <b>+🪙 '+amt2+'</b> in <b>'+esc(game)+'</b>!</div>'+
        '</div>'+
        '<div class="ak3d-ico">'+gEmoji+'</div>'+
      '</div>';
    }
    wrap.innerHTML=html;
    wrap.onclick=function(){
      if(String(uId)===String(A.id)){
        var mm=myModel();$("pfc").innerHTML=pfHTML(mm,true);pfWire($("pfc"),mm,true);$("pfo").classList.add("on");
      }else if(typeof openProfile==="function"){
        openProfile({id:uId,n:uName,e:item.senderEmoji||"👑",pic:pic,lv:18});
      }
    };
    track.appendChild(wrap);
    setTimeout(function(){
      wrap.remove();
      active=false;
      if(queue.length)renderCard(queue.shift());
    },10000);
  }

  window.showAkira3DBanner=function(item,priority){
    if(!item)return;
    if(priority)queue.unshift(item);
    else queue.push(item);
    if(queue.length>15)queue.length=15;
    if(!active)renderCard(queue.shift());
  };

  // Game wins must come from server-settled events, not inferred wallet changes.
  // Poll live server feed (/api/v1/community/live-feed) for real wins & gifts
  async function pollLiveFeed(){
    try{
      var tok=akiraToken();
      if(!tok)return;
      var res=await akiraRequest("/api/v1/community/live-feed","GET",undefined,tok);
      if(res&&Array.isArray(res.items)){
        res.items.slice(0,4).reverse().forEach(function(it){
          if(it.eid&&!seenIds[it.eid]){
            seenIds[it.eid]=1;
            var isMe=String(it.user_id)===String(A.id);
            if(isMe){it.name=A.name;it.pic=A.pic||it.pic;}
            window.showAkira3DBanner(it,false);
          }
        });
      }
    }catch(_){}
  }
  setTimeout(pollLiveFeed,2500);
  setInterval(pollLiveFeed,12000);

  // Only authenticated server events appear in the live ticker.

})();

