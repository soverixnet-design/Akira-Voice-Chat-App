
var $=function(i){return document.getElementById(i)};
var bn=function(n){return String(n).replace(/\d/g,function(d){return"0123456789"[d]})};
var esc=function(t){return String(t).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var COL=["#9b4dff,#4c1d95","#ff3dc8,#9d174d","#0ea5e9,#075985","#f59e0b,#92400e","#10b981,#065f46","#f43f5e,#881337","#6366f1,#312e81","#14b8a6,#115e59","#a855f7,#581c87"];
var TH=[
{id:"mid",n:"Midnight",c1:"#1a0b45",c2:"#07031a",a:"#9b4dff",b:"#ff3dc8",k:["#8b3dff","#e61fb0","#0ea5e9"]},
{id:"gold",n:"Royal Gold",c1:"#2e1f06",c2:"#0d0803",a:"#f59e0b",b:"#ef4444",k:["#b45309","#92400e","#ca8a04"]},
{id:"ocean",n:"Ocean",c1:"#06284a",c2:"#030f20",a:"#06b6d4",b:"#3b82f6",k:["#0284c7","#4f46e5","#0d9488"]},
{id:"rose",n:"Rose",c1:"#3b0a2a",c2:"#14040f",a:"#f43f5e",b:"#f472b6",k:["#e11d48","#c026d3","#fb7185"]},
{id:"forest",n:"Forest",c1:"#08301f",c2:"#03130c",a:"#10b981",b:"#84cc16",k:["#059669","#65a30d","#0d9488"]},
{id:"sunset",n:"Sunset",c1:"#3a1448",c2:"#150820",a:"#fb923c",b:"#e879f9",k:["#ea580c","#c026d3","#f43f5e"]}
];
var S={name:"Chat House ✨",pic:null,theme:"mid",bg:null,n:9,frame:"grad",coins:12450,xp:7200,minLv:10};
try{var raw=localStorage.getItem("vr_state_v2");if(raw)Object.assign(S,JSON.parse(raw))}catch(e){}
function save(){try{localStorage.setItem("vr_state_v2",JSON.stringify(S))}catch(e){}}
function level(){return 1+Math.floor(S.xp/1000)}
function lockUI(){try{rrPill()}catch(e){}$("cstat").innerHTML="🪙 <i>"+bn(S.coins)+"</i>";$("lstat").innerHTML="⭐ Lv<i>"+bn(level())+"</i>";$("imgBtn").classList.toggle("locked",level()<S.minLv);if($("ustat"))$("ustat").innerHTML="👥 <i>"+bn(total())+"</i> ›"}
/* LiveKit voice session: existing visual room layout remains unchanged.
   Production requires a configured LiveKit endpoint and bundled client library. */
var akiraVoiceRoom=null,akiraVoiceReady=false,akiraVoiceConnecting=false;
async function akiraStartVoice(){
  if(akiraVoiceConnecting||akiraVoiceRoom)return;
  var ctx=AkiraBridge.getContext()||{};
  if(!ctx.voiceAuth||!ctx.voiceApi||!ctx.id)return;
  akiraVoiceConnecting=true;
  try{
    if(!window.LivekitClient||!window.LivekitClient.Room)throw Error("Voice SDK unavailable");
    var res=await fetch(ctx.voiceApi+"/rooms/"+encodeURIComponent(ctx.id)+"/voice-token",{
      method:"POST",headers:{"Authorization":"Bearer "+ctx.voiceAuth,"Accept":"application/json"}
    });
    var data=await res.json();
    if(!res.ok)throw Error(data.error||"Voice server unavailable");
    var room=new window.LivekitClient.Room({adaptiveStream:true,dynacast:true});
    room.on(window.LivekitClient.RoomEvent.TrackSubscribed,function(track){
      if(track.kind==="audio"){var element=track.attach();element.dataset.akiraVoice="1";document.body.appendChild(element)}
    });
    room.on(window.LivekitClient.RoomEvent.TrackUnsubscribed,function(track){track.detach().forEach(function(el){el.remove()})});
    room.on(window.LivekitClient.RoomEvent.Disconnected,function(){
      akiraVoiceReady=false;akiraVoiceRoom=null;
      document.querySelectorAll("[data-akira-voice]").forEach(function(el){el.remove()});
    });
    await room.connect(data.url,data.token);
    akiraVoiceRoom=room;
    await room.localParticipant.setMicrophoneEnabled(!myMute);
    akiraVoiceReady=true;
    toast("Live voice connected");
  }catch(err){toast("Voice: "+(err.message||"connection failed"))}
  finally{akiraVoiceConnecting=false}
}
function akiraStopVoice(){
  if(akiraVoiceRoom){akiraVoiceRoom.disconnect();akiraVoiceRoom=null}
  akiraVoiceReady=false;
  document.querySelectorAll("[data-akira-voice]").forEach(function(el){el.remove()});
}
window.addEventListener("pagehide",akiraStopVoice);
var seats=[],myMute=false,chatOff=false,muteAll=false,rec=[1],qty=1,gsel=0;
var base=[{n:"You",e:"😎"},{n:"Rafi",e:"🧑‍🎤"},{n:"Nusrat",e:"👩‍🦰"},{n:"Sakib",e:"🧔"},{n:"Mim",e:"👧"},{n:"Tanvir",e:"🧑‍💻"},{n:"Faria",e:"👩‍🎓"}];
for(var q=0;q<S.n;q++){seats.push(base[q]?Object.assign({},base[q]):{empty:1})}
seats.forEach(function(s,i){s.i=i;s.muted=false;s.talk=false});if(seats[3])seats[3].muted=true;
function applyTheme(){
  var t=TH.filter(function(x){return x.id===S.theme})[0]||TH[0],a=$("app"),st=a.style;
  st.setProperty("--bg1",t.c1);st.setProperty("--bg2",t.c2);st.setProperty("--a",t.a);st.setProperty("--b",t.b);
  st.setProperty("--k1",t.k[0]);st.setProperty("--k2",t.k[1]);st.setProperty("--k3",t.k[2]);
  a.classList.toggle("hasbg",!!S.bg);
  st.background=S.bg?"linear-gradient(rgba(5,3,20,.4),rgba(5,3,20,.82)),url("+S.bg+") center/cover":"";
  a.dataset.frame=S.frame;
  $("rname").textContent=S.name;
  var r=$("rav");r.style.backgroundImage=S.pic?"url("+S.pic+")":"";r.textContent=S.pic?"":(window.__em||"🎙️");
}
function seatHTML(s,host){
  var c=s.empty?"empty":s.lock?"lock":"",face=s.empty?"＋":s.lock?"🔒":s.e;
  var bg=(s.empty||s.lock)?"":"background:linear-gradient(145deg,"+COL[s.i%COL.length]+")";
  var bd=(!s.empty&&!s.lock&&s.muted)?'<div class="badge">🔇</div>':"";
  return'<button class="seat '+c+'" data-i="'+s.i+'"><div class="av"><div class="ring"></div><div class="face" style="'+bg+'">'+face+'</div><i class="wave"></i><i class="wave b"></i>'+(host?'<div class="crown">👑</div>':"")+bd+'</div><div class="nm">'+(s.empty?"Empty":s.lock?"Lock":esc(s.n))+'</div>'+(host?'<div class="tag">Room owner</div>':"")+'</button>';
}
function render(){
  var g=$("grid"),dense=seats.length>13;
  g.className="grid"+(dense?" dense":"");g.style.gridTemplateColumns="repeat("+(seats.length>17?5:4)+",1fr)";
  $("host").innerHTML=seatHTML(seats[0],1);
  g.innerHTML=seats.slice(1).map(function(s){return seatHTML(s)}).join("");
  var n=seats.filter(function(s){return !s.empty&&!s.lock}).length;
  $("mstat").innerHTML="🎤 <i>"+n+"</i>/"+seats.length;lockUI();
  $("cstat").innerHTML="🪙 <i>"+bn(S.coins)+"</i>";
  document.querySelectorAll(".seat").forEach(function(b){b.onclick=function(){seatSheet(+b.dataset.i)}});
  tick(true);
}
function tick(keep){
  document.querySelectorAll(".seat").forEach(function(b){
    var s=seats[+b.dataset.i];if(!s)return;
    if(!keep&&!s.empty&&!s.lock&&!s.muted&&s.i>0)s.talk=Math.random()<.4;
    b.classList.toggle("talk",!!(s.talk&&!s.muted&&!s.empty&&!s.lock));
  });
}
function seatEl(i){return document.querySelector('.seat[data-i="'+i+'"]')}
function open(h){$("sheet").innerHTML='<div class="grab"></div>'+h;$("bg").classList.add("on")}
function close(){$("bg").classList.remove("on")}
$("bg").onclick=function(e){if(e.target===$("bg"))close()};
function toast(t){var x=$("toast");x.textContent=t;x.style.display="block";clearTimeout(x.t);x.t=setTimeout(function(){x.style.display="none"},1800)}
function sys(t){var c=$("chat"),d=document.createElement("div");d.className="sys";d.textContent=t;c.appendChild(d);c.scrollTop=c.scrollHeight}
function msg(name,emoji,text,o){
  o=o||{};var c=$("chat"),d=document.createElement("div");d.className="msg"+(o.me?" me":"")+(o.gf?" gfm":"");
  d.innerHTML='<div class="mav" style="background:linear-gradient(145deg,'+COL[(o.ci||0)%COL.length]+')">'+emoji+'</div><div class="mb"><span class="mn">'+esc(name)+'<span class="lv">Lv'+bn(o.lv||12)+'</span></span>'+(o.img?'<img class="mimg" src="'+o.img+'" alt="">':'<span class="mt">'+esc(text)+'</span>')+'</div>';
  var near=c.scrollHeight-c.scrollTop-c.clientHeight<60;c.appendChild(d);
  var im=d.querySelector(".mimg");if(im){im.onclick=function(){view(o.img)};im.onload=function(){if(near||o.me)c.scrollTop=c.scrollHeight}}
  if(near||o.me)c.scrollTop=c.scrollHeight;else $("newb").style.display="block";
  while(c.children.length>60)c.removeChild(c.firstChild);
}
var EM=["😀","😂","😍","🥰","😎","🔥","👏","🎉","❤️","👍","😭","🙏","😘","🤩","💯","🌹"];
$("tray").innerHTML=EM.map(function(e){return"<button>"+e+"</button>"}).join("");
$("tray").querySelectorAll("button").forEach(function(b){b.onclick=function(){if(chatOff)return;$("txt").value+=b.textContent;$("txt").focus();updBtn()}});
$("emo").onclick=function(){emojiSheet()};
function sendText(){var v=$("txt").value.trim();if(!v||chatOff)return;msg("You","😎",v,{me:1,ci:0,lv:level()});$("txt").value="";updBtn();$("tray").classList.remove("on");$("emo").textContent="😊"}
$("sendTxt").onclick=sendText;$("txt").onkeydown=function(e){if(e.key==="Enter")sendText()};
function updBtn(){var has=$("txt").value.trim().length>0;$("sendTxt").style.display=has?"grid":"none";$("imgBtn").style.display=has?"none":"grid"}
$("txt").oninput=updBtn;;
function setChat(on){chatOff=!on;$("txt").disabled=!on;$("txt").placeholder=on?"Type a message…":"Chat is off";$("tray").classList.remove("on")}
function seatSheet(i){
  var s=seats[i],h;
  if(s.empty)h='<h3>Seat '+i+'</h3><div class="acts"><button class="act" data-a="take"><span>🙂</span>Seat a guest</button><button class="act" data-a="lock"><span>🔒</span>Seat lock</button><button class="act" data-a="inv"><span>📨</span>Invite</button></div>';
  else if(s.lock)h='<h3>Locked seat</h3><div class="acts"><button class="act" data-a="unlock"><span>🔓</span>Unlock</button></div>';
  else{var me=i===0;h='<div class="who"><div class="av"><div class="ring"></div><div class="face" style="background:linear-gradient(145deg,'+COL[i%COL.length]+')">'+s.e+'</div></div><div><b>'+esc(s.n)+'</b><small style="display:block;color:var(--mu)">'+(me?"ID 482915 · Level "+bn(level()):"Seat "+i+" · Level "+(10+i*3))+'</small></div></div><div class="acts">'+
   (me?'<button class="act" data-a="prof"><span>👤</span>Profile</button><button class="act" data-a="own"><span>⚙️</span>Manage</button>':
   '<button class="act" data-a="gift"><span>🎁</span>Gift</button><button class="act" data-a="mute"><span>'+(s.muted?"🔊":"🔇")+'</span>'+(s.muted?"Unmute":"Mute")+'</button><button class="act" data-a="prof"><span>👤</span>Profile</button><button class="act" data-a="down"><span>⬇️</span>Remove from mic</button><button class="act" data-a="lock"><span>🔒</span>Seat lock</button><button class="act dg" data-a="kick"><span>🚫</span>Kick out</button>')+'</div>';}
  open(h);$("sheet").querySelectorAll(".act").forEach(function(b){b.onclick=function(){act(b.dataset.a,i)}});
}
function act(a,i){
  var s=seats[i];
  if(a==="take")seats[i]={n:"Guest"+bn(i),e:"🙂",i:i,muted:false,talk:false};
  if(a==="lock")seats[i]={lock:1,i:i};
  if(a==="unlock")seats[i]={empty:1,i:i};
  if(a==="mute"){s.muted=!s.muted;toast(s.n+(s.muted?" Mute":" Unmute"))}
  if(a==="down"||a==="kick"){sys(s.n+(a==="kick"?" Who was kicked out":" left the mic"));if(a==="down")U.unshift({n:s.n,e:s.e,id:sid(s),lv:10+i*3});seats[i]={empty:1,i:i}}
  if(a==="inv")toast("Invitation sent");
  if(a==="prof"){AkiraBridge.toApp({t:"profile",u:{n:s.n,e:s.e,id:sid(s),lv:i===0?level():10+i*3,seat:i}});close();return}
  if(a==="gift"){rec=[i];giftSheet();return}
  if(a==="own"){ownSheet();return}
  close();render();
}
function tg(id,on){return'<button class="sw'+(on?" on":"")+'" data-t="'+id+'"></button>'}
function pickImage(max,cb){
  var f=document.createElement("input");f.type="file";f.accept="image/*";
  f.onchange=function(){var file=f.files&&f.files[0];if(!file)return;var r=new FileReader();
    r.onload=function(){var im=new Image();im.onload=function(){
      var k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
      c.getContext("2d").drawImage(im,0,0,c.width,c.height);cb(c.toDataURL("image/jpeg",.8))};im.src=r.result};r.readAsDataURL(file)};
  f.click();
}
function settings(){
  open('<h3>⚙️ Room settings</h3><div class="pic"><div class="big" id="pbig" style="'+(S.pic?"background-image:url("+S.pic+")":"")+'">'+(S.pic?"":"🎙️")+'<i>📷</i></div><div style="flex:1"><div class="lbl" style="margin-top:0">Room name</div><input class="field" id="nm" maxlength="30"></div></div><div class="row" id="rTh"><div>🎨 Room theme<small>Colors and background image</small></div><span>›</span></div><div class="row" id="rSe"><div>🪑 Seat arrangement<small>Now '+bn(seats.length)+' seats · frame style</small></div><span>›</span></div><div class="row" id="rRw"><div>💰 Room Reward<small>Earn 10% of all gifts sent in your room · weekly</small></div><span>›</span></div><div class="gbar"><button class="send" id="save">Save</button></div>');
  $("nm").value=S.name;$("nm").oninput=function(){S.name=$("nm").value.slice(0,30)};
  $("pbig").onclick=function(){pickImage(300,function(d){S.pic=d;save();applyTheme();settings();toast("Room picture changed ✓")})};
  $("rTh").onclick=themeSheet;$("rSe").onclick=seatSet;$("rRw").onclick=rewardSheet;
  $("save").onclick=function(){S.name=$("nm").value.trim()||"My room";save();applyTheme();close();toast("Settings saved ✓")};
}
function themeSheet(){
  open('<h3><button class="back" id="bk">‹</button>🎨 Room theme</h3><div class="themes">'+TH.map(function(t){return'<button class="th'+(!S.bg&&S.theme===t.id?" sel":"")+'" data-id="'+t.id+'" style="background:linear-gradient(160deg,'+t.a+','+t.c1+' 55%,'+t.b+')">'+t.n+'</button>'}).join("")+'</div><div class="row" id="gal" style="margin-top:10px"><div>🖼️ Background from gallery<small>'+(S.bg?"Your own photo is on":"Choose your own photo")+'</small></div><span>›</span></div>'+(S.bg?'<div class="row" id="rmbg" style="color:#fda4af"><div>Remove photo and return to theme</div></div>':""));
  $("bk").onclick=settings;
  $("sheet").querySelectorAll(".th").forEach(function(b){b.onclick=function(){S.theme=b.dataset.id;S.bg=null;save();applyTheme();themeSheet()}});
  $("gal").onclick=function(){pickImage(900,function(d){S.bg=d;save();applyTheme();themeSheet();toast("Background changed ✓")})};
  if($("rmbg"))$("rmbg").onclick=function(){S.bg=null;save();applyTheme();themeSheet()};
}
function setSeats(n){
  n=Math.max(5,Math.min(21,n));if(n===seats.length)return;
  if(n>seats.length){while(seats.length<n)seats.push({empty:1,i:seats.length})}
  else{var gone=seats.slice(n).filter(function(s){return !s.empty&&!s.lock});seats.length=n;if(gone.length)sys(bn(gone.length)+" people stepped off the mic as seats were reduced")}
  S.n=n;save();render();
}
function seatSet(){
  var F=[["grad","Colorful"],["gold","Gold"],["neon","Neon"],["sq","Chowka"]];
  open('<h3><button class="back" id="bk">‹</button>🪑 Seat arrangement</h3><div class="lbl" style="text-align:center">Total seats (including owner)</div><div class="step"><button id="mn">−</button><b id="cnt">'+bn(seats.length)+'</b><button id="pl">+</button></div><div class="lbl" style="text-align:center">Minimum 5, maximum 21</div><div class="lbl" style="margin-top:16px">Seat frame</div><div class="fr">'+F.map(function(f){return'<button data-f="'+f[0]+'" class="'+(S.frame===f[0]?"sel":"")+'"><div class="pv" style="'+(f[0]==="gold"?"border-color:#f59e0b":f[0]==="neon"?"border-color:#22d3ee;box-shadow:0 0 8px #22d3ee":f[0]==="sq"?"border-radius:9px":"")+'"></div>'+f[1]+'</button>'}).join("")+'</div>');
  $("bk").onclick=settings;
  $("mn").onclick=function(){setSeats(seats.length-1);$("cnt").textContent=bn(seats.length)};
  $("pl").onclick=function(){setSeats(seats.length+1);$("cnt").textContent=bn(seats.length)};
  $("sheet").querySelectorAll(".fr button").forEach(function(b){b.onclick=function(){S.frame=b.dataset.f;save();applyTheme();seatSet()}});
}
function ownSheet(){
  if(!window.__akiraIsOwner){toast("Only the room owner can manage this room");return;}
  open('<h3>👑 Owner management</h3><div class="row"><div>Mute everyone<small>Everyone on the mic will be muted</small></div>'+tg("m",muteAll)+'</div><div class="row"><div>Text chat on<small>If turned off, no one can type</small></div>'+tg("c",!chatOff)+'</div><div class="row" style="cursor:default"><div>🖼️ Minimum level to send photos<small>Photo sending is locked for levels below this</small></div><div class="mini"><button id="lm">−</button><b id="lvn">'+bn(S.minLv)+'</b><button id="lp">+</button></div></div><div class="acts" style="margin-top:14px"><button class="act" id="o1"><span>🔒</span>Lock empty seats</button><button class="act" id="o2"><span>🛡️</span>Admin</button><button class="act" id="o3"><span>🚫</span>Block list</button></div><div class="acts" style="grid-template-columns:1fr"><button class="act" id="o4"><span>⚙️</span>Room settings</button></div>');
  $("sheet").querySelectorAll(".sw").forEach(function(b){b.onclick=function(){b.classList.toggle("on");var on=b.classList.contains("on");
    if(b.dataset.t==="m"){muteAll=on;seats.forEach(function(s){if(s.i>0&&!s.empty&&!s.lock)s.muted=on});render();toast(on?"Everyone muted":"Unmuted")}
    else{setChat(on);toast(on?"Chat on":"Chat off")}}});
  $("o1").onclick=function(){seats.forEach(function(s,k){if(s.empty)seats[k]={lock:1,i:k}});close();render();toast("Empty seats locked")};
  $("o2").onclick=function(){toast("Choose an admin")};$("o3").onclick=function(){toast("Block list")};$("o4").onclick=settings;
  $("lm").onclick=function(){S.minLv=Math.max(1,S.minLv-1);$("lvn").textContent=bn(S.minLv);save();lockUI()};
  $("lp").onclick=function(){S.minLv=Math.min(50,S.minLv+1);$("lvn").textContent=bn(S.minLv);save();lockUI()};
}
var G=[["🌹",5,"Rose",0],["💖",10,"Heart",0],["🍫",20,"Chocolate",0],["🧸",30,"Teddy Bear",0],["💍",50,"Ring",0],["🎂",80,"Cake",0],["🎤",99,"Golden Mic",0],["🌈",120,"Rainbow",0],["💎",200,"Diamond",0],["🍾",300,"Champagne",0],["🎸",400,"Guitar",0],["🚗",500,"Car",0],
["🏰",1000,"Castle",1],["🦁",2000,"Lion",1],["🏎️",3000,"Sports Car",1],["🐉",5000,"Dragon",1],["🛥️",7000,"Yacht",1],["🚀",9900,"Rocket",1],["✈️",12000,"Private Jet",1],["🏝️",15000,"Island",1],["👑",19900,"Crown",1],["🦄",25000,"Unicorn",1],["🌌",39900,"Galaxy",1],["🪐",59900,"Planet",1],
["🍀",10,"Lucky Clover",2],["🎁",50,"Lucky Box",2],["🧧",100,"Lucky Packet",2],["🎲",200,"Lucky Dice",2],["🎰",500,"Lucky Slot",2],["⭐",1000,"Lucky Star",2]];
var gtab=0,LUCKY=[[0,70.2],[1,15],[2,8],[5,4],[10,2.5],[50,.3]],RR_PCT=0.1,RR_DAY=7*864e5;
function luckyRoll(){var r=Math.random()*100,a=0;for(var i=0;i<LUCKY.length;i++){a+=LUCKY[i][1];if(r<a)return LUCKY[i][0]}return 0}
function rrS(){if(!S.rr)S.rr={vol:0,last:0};return S.rr}
function rewardAdd(c){rrS().vol+=c}
function rrInfo(){var r=rrS(),rw=Math.floor(r.vol*RR_PCT),left=r.last+RR_DAY-Date.now();return{vol:r.vol,rw:rw,left:left,can:left<=0&&rw>0}}
function fmtLeft(ms){var d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5);return d+"d "+h+"h"}
function rrPill(){var p=$("rrpill");if(p)p.innerHTML="💰 Reward"+(rrInfo().can?" <i style=\"color:#34d399\">●</i>":"")}
function rewardSheet(){
  var i=rrInfo(),st=i.left>0?"Next claim in "+fmtLeft(i.left):(i.rw>0?"Ready to claim":"Gifts in your room will appear here");
  open('<h3><button class="back" id="bk">‹</button>💰 Room Reward</h3><div class="rwc"><div class="rwt">You earn <b>10%</b> of every gift sent in your room</div><div class="rwb">🪙 '+bn(i.rw)+'</div><div class="rws">'+st+'</div></div><div class="row" style="cursor:default"><div>🎁 Gifts sent in your room<small>By everyone, since your last claim</small></div><b>🪙 '+bn(i.vol)+'</b></div><div class="row" style="cursor:default"><div>💰 Your reward (10%)</div><b>🪙 '+bn(i.rw)+'</b></div><div class="row" style="cursor:default"><div>📅 Payout<small>Once every 7 days</small></div><b>Weekly</b></div><div class="lbl" style="text-align:center;margin-top:10px">Example: if someone sends a gift worth 1000 coins, you earn 100 coins.</div><div class="gbar"><button class="send" id="rwclaim"'+(i.can?"":" disabled style=\"opacity:.45\"")+'>Claim reward</button></div>');
  $("bk").onclick=settings;
  $("rwclaim").onclick=function(){var x=rrInfo();if(!x.can){toast(x.left>0?"Next claim in "+fmtLeft(x.left):"No reward yet");return}S.coins+=x.rw;var r=rrS();r.vol=0;r.last=Date.now();save();lockUI();rewardSheet();toast("+"+x.rw+" coins claimed 💰");sys("💰 Room Reward claimed: +"+x.rw+" coins")};
}
function botGift(){
  var o=others();if(!o.length||document.hidden)return;var s=o[Math.floor(Math.random()*o.length)],g=G[[0,1,2,3,4,5,6,7,8,12][Math.floor(Math.random()*10)]];
  rewardAdd(g[1]);save();lockUI();msg(s.n,s.e,"→ You  "+g[0]+" "+g[2],{gf:1,lv:10+s.i*3});fly(g[0],0,0,g[1]);
}
function luckyFx(win,mult,g){
  var d=document.createElement("div");d.className="lpop";d.innerHTML='<div class="lp1">'+g[0]+'</div>'+(win>0?'<b>LUCKY! x'+mult+'</b><span>+🪙 '+bn(win)+'</span>':'<b>No bonus</b><span>Better luck next time</span>');
  document.body.appendChild(d);setTimeout(function(){d.remove()},2300);if(win>0)sys("🍀 Lucky bonus: +"+win+" coins (x"+mult+")");
}
function others(){return seats.filter(function(s){return s.i>0&&!s.empty&&!s.lock})}
function giftSheet(){
  var o=others();if(!o.length){toast("No one is on the mic");return}
  rec=rec.filter(function(r){return o.some(function(s){return s.i===r})});if(!rec.length)rec=[o[0].i];
  var all=o.length>1&&rec.length===o.length;
  var chips=(o.length>1?'<button class="chip'+(all?" sel":"")+'" data-r="all"><div class="c" style="background:var(--glass)">👥</div>Everyone</button>':"")+o.map(function(s){return'<button class="chip'+(!all&&rec.indexOf(s.i)>-1?" sel":"")+'" data-r="'+s.i+'"><div class="c" style="background:linear-gradient(145deg,'+COL[s.i%COL.length]+')">'+s.e+'</div>'+esc(s.n)+'</button>'}).join("");
  if(gtab===2&&window.__minor)gtab=0;
  if(G[gsel][3]!==gtab)for(var q=0;q<G.length;q++)if(G[q][3]===gtab){gsel=q;break}
  var tabs=[["🎁","Gifts"],["👑","Luxury"],["🍀","Lucky"]];if(window.__minor)tabs.pop();
  open('<h3>🎁 Send gift <span style="margin-left:auto;font-size:12px;color:var(--gold)">🪙 '+bn(S.coins)+'</span></h3><div class="lbl">Send to</div><div class="chips">'+chips+'</div><div class="gtabs">'+tabs.map(function(t,k){return'<button class="'+(k===gtab?"sel":"")+'" data-gt="'+k+'">'+t[0]+' '+t[1]+'</button>'}).join("")+'</div>'+(gtab===2?'<div class="lbl lk">🍀 Lucky gifts give you a random bonus back, up to x50 of the gift price</div>':"")+'<div class="gifts c'+gtab+'">'+G.map(function(g,k){return g[3]!==gtab?"":'<div class="gf'+(k===gsel?" sel":"")+'" data-k="'+k+'"><span>'+g[0]+'</span><b>'+g[2]+'</b>🪙 '+bn(g[1])+'</div>'}).join("")+'</div><div class="gbar"><div class="qty">'+[1,5,10].map(function(q){return'<button class="'+(q===qty?"sel":"")+'" data-q="'+q+'">x'+bn(q)+'</button>'}).join("")+'</div><button class="send" id="snd">Send 🚀</button></div>');
  var sh=$("sheet");
  sh.querySelectorAll(".gtabs button").forEach(function(b){b.onclick=function(){gtab=+b.dataset.gt;giftSheet()}});
  sh.querySelectorAll(".chip").forEach(function(b){b.onclick=function(){rec=b.dataset.r==="all"?o.map(function(s){return s.i}):[+b.dataset.r];sh.querySelectorAll(".chip").forEach(function(x){x.classList.remove("sel")});b.classList.add("sel")}});
  sh.querySelectorAll(".gf").forEach(function(b){b.onclick=function(){gsel=+b.dataset.k;sh.querySelectorAll(".gf").forEach(function(x){x.classList.remove("sel")});b.classList.add("sel")}});
  sh.querySelectorAll(".qty button").forEach(function(b){b.onclick=function(){qty=+b.dataset.q;sh.querySelectorAll(".qty button").forEach(function(x){x.classList.remove("sel")});b.classList.add("sel")}});
  $("snd").onclick=sendGift;
}
function sendGift(){
  var g=G[gsel],cost=g[1]*qty*rec.length;
  if(g[3]===2&&window.__minor){toast("Lucky gifts are closed for users under 18");return}
  if(cost>S.coins){toast("Not enough coins");return}
  var before=level(),win=0,mult=0;S.coins-=cost;S.xp+=cost;rewardAdd(cost);
  if(g[3]===2){for(var k=0;k<qty*rec.length;k++){var m=luckyRoll();mult=Math.max(mult,m);win+=m*g[1]}S.coins+=win}
  save();close();lockUI();
  if(level()>before){sys("🎉 Level up! Now Level "+bn(level()));if(before<S.minLv&&level()>=S.minLv)sys("🖼️ Photo sending unlocked!")}
  msg("You","😎","→ "+rec.map(function(i){return seats[i].n}).join(", ")+"  "+g[0]+" "+g[2]+" x"+bn(qty),{me:1,gf:1,lv:level()});
  try{AkiraBridge.toApp({t:"gift",g:g[0],n:qty*rec.length})}catch(e){}rec.forEach(function(r,ri){var se=seatEl(r);if(se)se.scrollIntoView({block:"nearest"});for(var k=0;k<qty;k++)fly(g[0],r,ri*180+k*140,g[1])});
  if(g[3]===2)setTimeout(function(){luckyFx(win,mult,g)},1000);
}
function fly(emoji,idx,delay,val){
  var fx=$("fx"),A=$("app").getBoundingClientRect(),se=seatEl(idx);if(!se)return;
  var from=$("bGift").getBoundingClientRect(),to=se.querySelector(".av").getBoundingClientRect();
  var sx=from.left+from.width/2-A.left,sy=from.top+from.height/2-A.top,tx=to.left+to.width/2-A.left,ty=to.top-A.top-16;
  var el=document.createElement("div");el.className="g";el.textContent=emoji;fx.appendChild(el);
  var o="translate(-50%,-50%) ",mx=(sx+tx)/2+(sx<tx?-30:30),my=Math.min(sy,ty)-90;
  el.animate([
   {transform:"translate("+sx+"px,"+sy+"px) "+o+"scale(.3) rotate(0deg)",opacity:0},
   {transform:"translate("+(sx+(mx-sx)*.35)+"px,"+(sy+(my-sy)*.5)+"px) "+o+"scale(1.2) rotate(120deg)",opacity:1,offset:.25},
   {transform:"translate("+mx+"px,"+my+"px) "+o+"scale(1.7) rotate(220deg)",opacity:1,offset:.55},
   {transform:"translate("+tx+"px,"+ty+"px) "+o+"scale(1.1) rotate(360deg)",opacity:1}
  ],{duration:1100,delay:delay,easing:"cubic-bezier(.45,.05,.4,1)",fill:"both"}).onfinish=function(){land(el,tx,ty,o,idx,val)};
}
function land(el,tx,ty,o,idx,val){
  var fx=$("fx");
  var b=el.animate([{transform:"translate("+tx+"px,"+ty+"px) "+o+"scale(1.1)"},{transform:"translate("+tx+"px,"+(ty-16)+"px) "+o+"scale(1.45)"},{transform:"translate("+tx+"px,"+ty+"px) "+o+"scale(1.1)"}],{duration:520,iterations:3,easing:"ease-in-out",fill:"both"});
  var se=seatEl(idx);if(se){se.classList.add("got");setTimeout(function(){se.classList.remove("got")},1100)}
  for(var k=0;k<8;k++){var sp=document.createElement("div");sp.className="s";sp.textContent=k%2?"✨":"⭐";fx.appendChild(sp);
   var ang=k/8*6.283,dx=Math.cos(ang)*46,dy=Math.sin(ang)*46;
   sp.animate([{transform:"translate("+tx+"px,"+ty+"px) translate(-50%,-50%) scale(.4)",opacity:1},{transform:"translate("+(tx+dx)+"px,"+(ty+dy)+"px) translate(-50%,-50%) scale(1.2)",opacity:0}],{duration:800,easing:"ease-out",fill:"both"}).onfinish=function(){this.effect.target.remove()}}
  var t=document.createElement("div");t.className="t";t.textContent="+"+bn(val)+" 🪙";fx.appendChild(t);
  t.animate([{transform:"translate("+tx+"px,"+(ty-10)+"px) translate(-50%,-50%)",opacity:0},{transform:"translate("+tx+"px,"+(ty-38)+"px) translate(-50%,-50%)",opacity:1,offset:.3},{transform:"translate("+tx+"px,"+(ty-62)+"px) translate(-50%,-50%)",opacity:0}],{duration:1500,fill:"both"}).onfinish=function(){t.remove()};
  b.onfinish=function(){el.animate([{opacity:1},{opacity:0}],{duration:350,fill:"both"}).onfinish=function(){el.remove()}};
}
function gameSheet(){
  var L=[["🎲","Ludo"],["🎯","Carrom"],["🎡","Food Wheel"],["🎰","Slot"],["🃏","Card"],["⭕","Tic-Tac"],["🧠","Memory"],["🎁","Lucky Spin"]];
  open('<h3>🎮 Games</h3><div class="gifts">'+L.map(function(g){return'<div class="gf" style="color:#fff"><span>'+g[0]+'</span>'+g[1]+'</div>'}).join("")+'</div>');
  $("sheet").querySelectorAll(".gf").forEach(function(b){b.onclick=function(){var t=b.textContent;close();if(/Food Wheel/.test(t)){window.location.href="https://api.soverixnet.online/food-wheel/index.html?demo=offline&lang=en&sound=0";return}if(window.__minor&&/Slot|Spin|Card/.test(t)){toast("This game is closed for users under 18");return}toast(t+" Coming soon")}})
}
function msgSheet(){open('<h3>💬 Messages</h3><div class="row"><div>🧑‍🎤 Rafi<small>Coming tonight?</small></div><small>2m</small></div><div class="row"><div>👩‍🦰 Nusrat<small>Thanks for the gift 💜</small></div><small>10m</small></div><div class="row"><div>🎧 Customer service<small>Your request has been received</small></div><small>1h</small></div>')}
$("roomBtn").onclick=settings;$("rrpill").onclick=rewardSheet;rrPill();$("bGift").onclick=giftSheet;$("bGame").onclick=gameSheet;$("bMsg").onclick=msgSheet;$("bOwn").onclick=ownSheet;
$("exit").onclick=function(){open('<h3>Leave the room?</h3><div class="acts" style="grid-template-columns:1fr 1fr"><button class="act" id="y1"><span>🚪</span>Leave</button><button class="act" id="n1"><span>↩️</span>Stay</button></div>');$("y1").onclick=function(){AkiraBridge.toApp({t:"exit"})};$("n1").onclick=close};
$("min").onclick=function(){AkiraBridge.toApp({t:"min"})};
$("mic").onclick=function(){myMute=!myMute;this.classList.toggle("off",myMute);this.textContent=myMute?"🔇":"🎤";seats[0].muted=myMute;render();if(akiraVoiceRoom){akiraVoiceRoom.localParticipant.setMicrophoneEnabled(!myMute).catch(function(e){toast("Microphone permission needed")})}else if(!myMute){akiraStartVoice()}toast(myMute?"Mic muted":"Mic on")};
var TALK=["Greetings to everyone 👋","Will sing tonight 🎶","How is everyone?","Awesome room! 🔥","Come to the mic, friend 😄","Good night everyone 🌙"];
var ER=[["😂","Smile","pop"],["😍","Love","jump"],["😎","Cool","spin"],["🔥","Fire","jump"],["👏","Applause","shake"],["🎉","Party","spin"],["😭","Cry","shake"],["😡","Anger","shake"],["🥳","Festival","jump"],["😘","Kiss","pop"],["🤩","Wow!","spin"],["👍","Awesome","pop"],["🙏","Thanks","pop"],["💯","100","jump"],["😴","Sleep","shake"],["💖","Heart","pop"]];
var etab=0,emj={};
function emojiSheet(){
  open('<h3>😊 Emoji box</h3><div class="etabs"><button class="'+(etab===0?"sel":"")+'" data-t="0">🎭 Show on seat</button><button class="'+(etab===1?"sel":"")+'" data-t="1">💬 In messages</button></div><div class="lbl">'+(etab===0?"Tap to show it on your seat with animation":"Tap to put it in the message box")+'</div><div class="gifts em">'+ER.map(function(e,k){return'<div class="gf" style="color:#fff" data-k="'+k+'"><span>'+e[0]+'</span>'+e[1]+'</div>'}).join("")+'</div>');
  var sh=$("sheet");
  sh.querySelectorAll(".etabs button").forEach(function(b){b.onclick=function(){etab=+b.dataset.t;emojiSheet()}});
  sh.querySelectorAll(".gf").forEach(function(b){b.onclick=function(){var e=ER[+b.dataset.k];
    if(etab===0){close();seatEmoji(0,e)}
    else{if(chatOff){toast("Chat is off");return}$("txt").value+=e[0];updBtn();close();$("txt").focus()}}});
}
function seatEmoji(idx,e){
  var se=seatEl(idx);if(!se)return;
  var A=$("app").getBoundingClientRect(),r=se.querySelector(".av").getBoundingClientRect(),cx=r.left+r.width/2-A.left,cy=r.top+r.height/2-A.top,sz=Math.max(46,r.width*.9);
  if(emj[idx])emj[idx].remove();
  var el=document.createElement("div");el.className="g";el.style.fontSize=sz+"px";el.textContent=e[0];$("fx").appendChild(el);emj[idx]=el;
  var T="translate("+cx+"px,"+cy+"px) translate(-50%,-50%) ";
  var K={
   pop:[[0,"scale(0)",0],[.18,"scale(1.35)",1],[.3,"scale(1)",1],[.5,"scale(1.12)",1],[.7,"scale(1)",1],[.88,"scale(1)",1],[1,"scale(.4)",0]],
   spin:[[0,"scale(0) rotate(-360deg)",0],[.25,"scale(1.3) rotate(0deg)",1],[.4,"scale(1) rotate(0deg)",1],[.55,"scale(1) rotate(18deg)",1],[.7,"scale(1) rotate(-18deg)",1],[.88,"scale(1) rotate(0deg)",1],[1,"scale(.4)",0]],
   shake:[[0,"scale(0)",0],[.12,"scale(1.2)",1],[.28,"scale(1.1) rotate(-14deg)",1],[.4,"scale(1.1) rotate(14deg)",1],[.52,"scale(1.1) rotate(-14deg)",1],[.64,"scale(1.1) rotate(14deg)",1],[.76,"scale(1) rotate(0deg)",1],[.9,"scale(1)",1],[1,"scale(.4)",0]],
   jump:[[0,"scale(0)",0],[.18,"scale(1.2)",1],[.34,"translateY(-22px) scale(1.15)",1],[.5,"translateY(0) scale(1)",1],[.64,"translateY(-14px) scale(1.1)",1],[.78,"translateY(0) scale(1)",1],[.9,"scale(1)",1],[1,"scale(.4)",0]]
  };
  el.animate(K[e[2]].map(function(f){return{offset:f[0],transform:T+f[1],opacity:f[2]}}),{duration:2600,fill:"both"}).onfinish=function(){el.remove();if(emj[idx]===el)delete emj[idx]};
  for(var k=0;k<5;k++){var s=document.createElement("div");s.className="s";s.style.fontSize="18px";s.textContent=e[0];$("fx").appendChild(s);
    var dx=(k-2)*20+(Math.random()*10-5);
    s.animate([{transform:"translate("+(cx+(k-2)*8)+"px,"+(cy-sz/2)+"px) translate(-50%,-50%) scale(.5)",opacity:0},{opacity:1,offset:.2},{transform:"translate("+(cx+dx)+"px,"+(cy-sz/2-56-k*7)+"px) translate(-50%,-50%) scale(1.1)",opacity:0}],{duration:1300,delay:350+k*140,easing:"ease-out",fill:"both"}).onfinish=function(){this.effect.target.remove()};}
}
var UN=["Arif","Sumi","Hasan","Lima","Ronnie","Jui","Shakil","Tamanna","Emon","Nazma","Rifat","Pinky","Sohel","Mou","Zahid","Rumi","Nayan","Shiuli","Kamal","Rain"],UE=["🧑","👩","🧔","👧","🧑‍💻","👩‍🎓","🧑‍🚀","👩‍🍳","🧑‍🔧","👩‍⚕️","😎","🧑‍🎤"],U=[],FOL={};
function sid(s){return s.i===0?$("rid").textContent:String(20000000+(s.n.charCodeAt(0)*7919+s.i*104729)%9000000)}
function total(){return seats.filter(function(s){return !s.empty&&!s.lock}).length+U.length}
function usersSheet(q){
  open('<h3>👥 You are in a room <span id="utt">'+bn(total())+'</span> people</h3><input class="field" id="uq" placeholder="Search by name or ID" autocomplete="off"><div class="ul" id="ul"></div>');
  $("uq").value=q||"";$("uq").oninput=function(){fillUsers($("uq").value)};fillUsers(q||"");
}
function fillUsers(q){
  q=q.trim().toLowerCase();
  var mic=seats.filter(function(s){return !s.empty&&!s.lock}).map(function(s){return{n:s.n,e:s.e,id:sid(s),lv:s.i===0?level():10+s.i*3,seat:s.i}});
  var aud=U.map(function(u,k){return{n:u.n,e:u.e,id:u.id,lv:u.lv,k:k}});
  var f=function(L){return q?L.filter(function(u){return u.n.toLowerCase().indexOf(q)>-1||u.id.indexOf(q)>-1}):L};
  var m=f(mic),a=f(aud),shown=a.slice(0,50);
  var row=function(u,t,i){return'<div class="urow" data-t="'+t+'" data-i="'+i+'"><div class="ua" style="background:linear-gradient(145deg,'+COL[(u.seat!=null?u.seat:u.k)%COL.length]+')">'+u.e+'</div><div class="un"><b>'+esc(u.n)+' <span class="lv">Lv'+bn(u.lv)+'</span></b><small>🆔 '+u.id+(u.seat===0?" · Room owner":"")+'</small></div><span style="color:var(--mu)">›</span></div>'};
  $("ul").innerHTML=(m.length?'<div class="lbl">🎤 On mic ('+bn(m.length)+')</div>'+m.map(function(u){return row(u,"m",u.seat)}).join(""):"")+(a.length?'<div class="lbl">👂 Audience ('+bn(a.length)+')</div>'+shown.map(function(u){return row(u,"a",u.k)}).join("")+(a.length>50?'<div class="lbl" style="text-align:center">'+bn(a.length-50)+' more — type a name or ID to search</div>':""):"")+(!m.length&&!a.length?'<div class="lbl" style="text-align:center;padding:20px">No one found</div>':"");
  $("ul").querySelectorAll(".urow").forEach(function(r){r.onclick=function(){
    if(r.dataset.t==="m"){var s=seats[+r.dataset.i];userSheet({n:s.n,e:s.e,id:sid(s),lv:s.i===0?level():10+s.i*3,seat:s.i},q)}
    else{var u=U[+r.dataset.i];userSheet({n:u.n,e:u.e,id:u.id,lv:u.lv,k:+r.dataset.i},q)}}});
}
function userSheet(u,q){
  var onmic=u.seat!=null,me=u.seat===0,fo=!!FOL[u.id];
  open('<div class="who"><div class="ua" style="width:60px;height:60px;font-size:30px;background:linear-gradient(145deg,'+COL[(onmic?u.seat:u.k)%COL.length]+')">'+u.e+'</div><div><b style="font-size:16px">'+esc(u.n)+' <span class="lv">Lv'+bn(u.lv)+'</span></b><small style="display:block;color:var(--mu);margin-top:3px">🆔 '+u.id+'</small></div></div><div class="acts"><button class="act" data-a="cp"><span>📋</span>ID Copy</button><button class="act" data-a="pf"><span>👤</span>Profile</button>'+(me?"":'<button class="act" data-a="fo"><span>'+(fo?"✅":"➕")+'</span>'+(fo?"Following":"Follow")+'</button><button class="act" data-a="gf"><span>🎁</span>Gift</button>'+(onmic?'<button class="act" data-a="dn"><span>⬇️</span>Remove from mic</button>':'<button class="act" data-a="iv"><span>🎤</span>Invite to mic</button>')+'<button class="act dg" data-a="kk"><span>🚫</span>Kick out</button>')+'</div><button class="back" id="ubk" style="margin-top:12px;width:auto;padding:0 14px;height:34px">‹ Back to list</button>');
  $("ubk").onclick=function(){usersSheet(q)};
  $("sheet").querySelectorAll(".act").forEach(function(b){b.onclick=function(){var a=b.dataset.a;
    if(a==="cp"){try{navigator.clipboard.writeText(u.id);toast("ID Copied ✓")}catch(e){toast("ID: "+u.id)}}
    if(a==="pf"){AkiraBridge.toApp({t:"profile",u:u});close()}
    if(a==="fo"){FOL[u.id]=!FOL[u.id];userSheet(u,q)}
    if(a==="gf"){if(onmic){rec=[u.seat];giftSheet()}else toast("Gifts can be sent once you are on the mic")}
    if(a==="iv"){var e=-1;seats.forEach(function(s,k){if(e<0&&s.empty)e=k});if(e<0){toast("No empty seats");return}U.splice(u.k,1);seats[e]={n:u.n,e:u.e,i:e,muted:false,talk:false};sys(u.n+" joined the mic");close();render();toast(u.n+" took a seat")}
    if(a==="dn"){U.unshift({n:u.n,e:u.e,id:u.id,lv:u.lv});seats[u.seat]={empty:1,i:u.seat};sys(u.n+" left the mic");close();render()}
    if(a==="kk"){if(onmic)seats[u.seat]={empty:1,i:u.seat};else U.splice(u.k,1);sys(u.n+" Who was kicked out");close();render()}
  }});
}
$("ustat").onclick=function(){usersSheet("")};
function lockSheet(){var need=(S.minLv-1)*1000,p=Math.max(0,Math.min(100,Math.round(S.xp/need*100)));
  open('<h3>🔒 Photo sending is locked</h3><div style="font-size:13.5px;line-height:1.7">To send gallery photos in the room you need at least <b style="color:var(--gold)">Level '+bn(S.minLv)+'</b> required. You are now <b>Level '+bn(level())+'</b>.</div><div class="pbar"><i style="width:'+p+'%"></i></div><div class="lbl">Send gifts to level up</div><div class="gbar"><button class="send" id="lg">🎁 Send gift</button></div>');
  $("lg").onclick=giftSheet}
function sendImg(){if(chatOff){toast("Chat is off");return}if(level()<S.minLv){lockSheet();return}pickImage(800,function(d){msg("You","😎","",{me:1,ci:0,lv:level(),img:d})})}
function view(src){$("vimg").src=src;$("viewer").classList.add("on")}
$("viewer").onclick=function(){this.classList.remove("on")};
$("imgBtn").onclick=sendImg;
$("chat").onscroll=function(){if(this.scrollHeight-this.scrollTop-this.clientHeight<60)$("newb").style.display="none"};
$("newb").onclick=function(){var c=$("chat");c.scrollTop=c.scrollHeight;this.style.display="none"};
try{var W=AkiraBridge.getContext()||{};if(W.name){S.name=W.name;S.theme=W.theme||S.theme;S.pic=null;S.bg=null;window.__em=W.emoji;window.__minor=!!W.minor;if(W.id)$("rid").textContent=W.id}}catch(e){}
window.__akiraIsOwner=!!(W.ownerId&&W.userId&&String(W.ownerId)===String(W.userId));var ownerButton=document.getElementById("bOwn");if(ownerButton)ownerButton.style.display=window.__akiraIsOwner?"":"none";applyTheme();render();setChat(true);updBtn();akiraStartVoice();AkiraBridge.onRoom(function(d){if(d.t==="gift"){if(d.seat>0)rec=[d.seat];giftSheet()}});
sys("Welcome to the room");
setInterval(function(){tick(false)},1600);

// The native Back button closes room overlays before minimizing the room.
window.AkiraRoom={closeTopLayer:function(){
  if($("viewer").classList.contains("on")){$("viewer").classList.remove("on");return true}
  if($("bg").classList.contains("on")){close();return true}
  if($("tray").classList.contains("on")){$("tray").classList.remove("on");return true}
  return false;
}};
