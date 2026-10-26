/* V6 microphone permission warm-up before joining a live microphone seat. */
(function(){
 'use strict';
 var checking=null,granted=false;
 async function requestMic(){
   if(granted)return true;
   if(checking)return checking;
   checking=(async function(){
     try{
       if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Error('Microphone API unavailable');
       var stream=await navigator.mediaDevices.getUserMedia({audio:{
         echoCancellation:true,noiseSuppression:true,autoGainControl:true
       }});
       stream.getTracks().forEach(function(track){track.stop()});
       granted=true;return true;
     }catch(e){
       if(typeof window.toast==='function'){
         var denied=e&&(['NotAllowedError','PermissionDeniedError'].includes(e.name));
         window.toast(denied?'Microphone permission denied. Enable it in Android App Settings.':'Microphone: '+(e.message||'permission failed'));
       }
       return false;
     }finally{checking=null}
   })();
   return checking;
 }
 window.akiraEnsureMicPermission=requestMic;
})();
